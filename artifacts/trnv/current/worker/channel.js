// A frequency is a station: a number two devices agree on, and a key they both know.
// The number alone is not a way in. A station is claimed once, and what is kept is a
// hash of the key, so the Worker can check a caller without ever holding the secret.
//
// Clips are kept, not cast. A device that was away comes back and reads what was said
// on its station, up to a week later. D1 is the store because this Worker already has
// it bound and a clip is one row; a Durable Object would add a second place to be
// wrong before anything works, and this Worker cannot create an R2 bucket for itself.

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;  // a week, then the station forgets
const KEEP_PER_STATION = 200;                   // and never more than this
const MAX_AUDIO_CHARS = 128 * 1024;             // ~96 KB of audio, not 900 KB
const MAX_SECONDS = 120;
const SEND_LIMIT = 8;                           // per sender per minute
const SEND_WINDOW_MS = 60 * 1000;
const KEY_MIN = 20;                             // a key short enough to guess is not one
const PAGE = 10;

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

const json = (body, status) =>
  new Response(JSON.stringify(body), { status: status || 200, headers: JSON_HEADERS });

// A frequency is written the way a person says it: 441, 441.0, 446.00625.
const stationOf = (raw) => String(raw == null ? '' : raw).trim().slice(0, 24);

async function digest(text) {
  const bytes = new TextEncoder().encode(String(text));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  let out = '';
  for (const byte of new Uint8Array(hash)) out += byte.toString(16).padStart(2, '0');
  return out;
}

async function ensure(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS stations (
       channel TEXT PRIMARY KEY,
       verifier TEXT NOT NULL,
       at INTEGER NOT NULL
     )`
  ).run();
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS channel_clips (
       id TEXT PRIMARY KEY,
       station TEXT NOT NULL,
       sender TEXT NOT NULL,
       mime TEXT NOT NULL,
       seconds REAL NOT NULL DEFAULT 0,
       audio TEXT NOT NULL,
       at INTEGER NOT NULL
     )`
  ).run();
  await env.DB.prepare(
    'CREATE INDEX IF NOT EXISTS channel_clips_at ON channel_clips (station, at)'
  ).run();
}

// Reading the key from the header, not the body: a body is logged by more things than
// a header is, and the key is the one thing on a station that must not be logged.
const keyOf = (request) => String(request.headers.get('x-trnv-key') || '').trim();

// 'ok' | 'unclaimed' | 'mismatch' | 'nokey'
async function check(env, channel, key) {
  if (!key || key.length < KEY_MIN) return 'nokey';
  const row = await env.DB.prepare('SELECT verifier FROM stations WHERE channel = ?')
    .bind(channel)
    .first();
  if (!row) return 'unclaimed';
  return (await digest(key)) === row.verifier ? 'ok' : 'mismatch';
}

// A station is claimed by the first device that speaks the same key onto it. The claim
// rides the same POST as a clip — `{ claim: true }` — so a station is one route, not a
// second thing to keep in step with this one.
async function claimStation(env, channel, key) {
  try {
    await ensure(env);
    const verifier = await digest(key);
    // First device on a number claims it. Two claims at once is not a conflict worth
    // failing over: whoever lands first sets the verifier and the other is told so.
    await env.DB.prepare(
      'INSERT OR IGNORE INTO stations (channel, verifier, at) VALUES (?, ?, ?)'
    )
      .bind(channel, verifier, Date.now())
      .run();
    const row = await env.DB.prepare('SELECT verifier FROM stations WHERE channel = ?')
      .bind(channel)
      .first();
    if (row && row.verifier !== verifier) {
      // A number nobody has spoken on is not yet anyone's: the claim follows the voice,
      // so a squatter cannot take 441.0 and hold it silent. Once a clip is there the
      // claim is the holder's and a different key is refused.
      const used = await env.DB.prepare(
        'SELECT COUNT(*) AS n FROM channel_clips WHERE station = ?'
      )
        .bind(channel)
        .first();
      if (used && Number(used.n) > 0) {
        return json({ ok: false, error: 'key_mismatch' }, 403);
      }
      await env.DB.prepare('UPDATE stations SET verifier = ?, at = ? WHERE channel = ?')
        .bind(verifier, Date.now(), channel)
        .run();
    }
    return json({ ok: true, channel, claimed: true });
  } catch (error) {
    return json({ ok: false, error: 'database_unavailable' }, 503);
  }
}

export async function handleChannelSend(request, env) {
  if (!env || !env.DB) return json({ ok: false, error: 'no_database' }, 503);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ ok: false, error: 'body_required' }, 400);

  const channel = stationOf(body.channel);
  const sender = String(body.sender == null ? '' : body.sender).slice(0, 64);
  const audio = typeof body.audio === 'string' ? body.audio : '';
  const mime = String(body.mime || 'audio/webm').slice(0, 60);
  if (!channel) return json({ ok: false, error: 'channel_required' }, 400);
  if (body.claim) {
    const key = keyOf(request);
    if (!key || key.length < KEY_MIN) return json({ ok: false, error: 'key_required' }, 400);
    return claimStation(env, channel, key);
  }
  if (!sender) return json({ ok: false, error: 'sender_required' }, 400);
  if (!audio) return json({ ok: false, error: 'audio_required' }, 400);
  if (audio.length > MAX_AUDIO_CHARS) return json({ ok: false, error: 'audio_too_large', limit: MAX_AUDIO_CHARS }, 413);
  if (!mime.startsWith('audio/')) return json({ ok: false, error: 'audio_only' }, 415);

  const seconds = Math.min(MAX_SECONDS, Math.max(0, Number(body.seconds) || 0));

  try {
    await ensure(env);
  } catch (error) {
    return json({ ok: false, error: 'database_unavailable' }, 503);
  }

  let state = 'nokey';
  try {
    state = await check(env, channel, keyOf(request));
  } catch (error) {
    return json({ ok: false, error: 'database_unavailable' }, 503);
  }
  if (state !== 'ok') {
    return json({ ok: false, error: state === 'mismatch' ? 'key_mismatch' : 'station_unclaimed' }, 403);
  }

  const at = Date.now();
  try {
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM channel_clips WHERE station = ? AND sender = ? AND at > ?'
    )
      .bind(channel, sender, at - SEND_WINDOW_MS)
      .first();
    if (count && Number(count.n) >= SEND_LIMIT) {
      return json({ ok: false, error: 'too_fast', limit: SEND_LIMIT }, 429);
    }

    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO channel_clips (id, station, sender, mime, seconds, audio, at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(id, channel, sender, mime, seconds, audio, at)
      .run();
    // A station keeps a week, and never more than a box of tape.
    await env.DB.prepare('DELETE FROM channel_clips WHERE station = ? AND at < ?')
      .bind(channel, at - RETENTION_MS)
      .run();
    await env.DB.prepare(
      `DELETE FROM channel_clips WHERE station = ? AND id NOT IN (
         SELECT id FROM channel_clips WHERE station = ? ORDER BY at DESC LIMIT ?
       )`
    )
      .bind(channel, channel, KEEP_PER_STATION)
      .run();
    return json({ ok: true, id, channel, at });
  } catch (error) {
    return json({ ok: false, error: 'write_failed' }, 502);
  }
}

// Deleting is the holder's own hand: the key is checked first, so a clip can only be
// taken off a station by a device that can already hear it. Deleting the last clip
// leaves the number empty, and an empty number is nobody's — that is the same rule the
// claim follows, not a second one.
export async function handleChannelDelete(request, env, url) {
  if (!env || !env.DB) return json({ ok: false, error: 'no_database' }, 503);
  const channel = stationOf(url.searchParams.get('channel'));
  const id = String(url.searchParams.get('id') || '').slice(0, 64);
  const at = Number(url.searchParams.get('at') || 0) || 0;
  if (!channel) return json({ ok: false, error: 'channel_required' }, 400);
  if (!id && !at) return json({ ok: false, error: 'clip_required' }, 400);

  let state = 'nokey';
  try {
    await ensure(env);
    state = await check(env, channel, keyOf(request));
  } catch (error) {
    return json({ ok: false, error: 'database_unavailable' }, 503);
  }
  if (state !== 'ok') {
    return json({ ok: false, error: state === 'mismatch' ? 'key_mismatch' : 'station_unclaimed' }, 403);
  }

  try {
    // The id is what a poll hands the page; the moment is the fallback for a clip the
    // page learned about before it had ids.
    const statement = id
      ? env.DB.prepare('DELETE FROM channel_clips WHERE station = ? AND id = ?').bind(channel, id)
      : env.DB.prepare('DELETE FROM channel_clips WHERE station = ? AND at = ?').bind(channel, at);
    const result = await statement.run();
    const changes = Number((result && result.meta && result.meta.changes) || 0);
    if (!changes) return json({ ok: false, error: 'clip_not_found' }, 404);
    return json({ ok: true, deleted: changes });
  } catch (error) {
    return json({ ok: false, error: 'delete_failed' }, 502);
  }
}

export async function handleChannelPoll(request, env, url) {
  if (!env || !env.DB) return json({ ok: false, error: 'no_database' }, 503);
  const channel = stationOf(url.searchParams.get('channel'));
  if (!channel) return json({ ok: false, error: 'channel_required' }, 400);
  const since = Number(url.searchParams.get('since') || 0) || 0;

  let state = 'nokey';
  try {
    await ensure(env);
    state = await check(env, channel, keyOf(request));
  } catch (error) {
    return json({ ok: false, error: 'database_unavailable' }, 503);
  }
  if (state !== 'ok') {
    return json({ ok: false, error: state === 'mismatch' ? 'key_mismatch' : 'station_unclaimed' }, 403);
  }

  try {
    const rows = await env.DB.prepare(
      'SELECT id, sender, mime, seconds, audio, at FROM channel_clips WHERE station = ? AND at > ? ORDER BY at ASC LIMIT ?'
    )
      .bind(channel, since, PAGE)
      .all();
    return json({ ok: true, channel, clips: (rows && rows.results) || [], now: Date.now() });
  } catch (error) {
    return json({ ok: false, error: 'read_failed' }, 502);
  }
}
