// Local probe of worker/channel.js against a real SQLite (node:sqlite), with a shim
// that gives it D1's async shape. Nothing is deployed by this; it only proves the
// handlers' answers before they go up.
import { DatabaseSync } from 'node:sqlite';
import { handleChannelSend, handleChannelPoll, handleChannelDelete } from './worker/channel.js';

const db = new DatabaseSync(':memory:');

const wrap = (sql, params = []) => ({
  bind: (...args) => wrap(sql, args),
  first: async () => db.prepare(sql).get(...params) ?? null,
  all: async () => ({ results: db.prepare(sql).all(...params) }),
  run: async () => ({ success: true, meta: db.prepare(sql).run(...params) }),
});

const env = { DB: { prepare: (sql) => wrap(sql) } };

const KEY = 'a'.repeat(44);
const OTHER = 'b'.repeat(44);
const clip = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

const send = (body, key) =>
  handleChannelSend(
    new Request('https://x/api/channel', {
      method: 'POST',
      headers: key ? { 'x-trnv-key': key } : {},
      body: JSON.stringify(body),
    }),
    env
  );

const claim = (channel, key) => send({ channel, claim: true }, key);
const talk = (channel, key, extra = {}) =>
  send({ channel, sender: 'd-1', audio: clip, mime: 'audio/webm', ...extra }, key);

const poll = (channel, since, key) =>
  handleChannelPoll(
    new Request('https://x/api/channel', { headers: key ? { 'x-trnv-key': key } : {} }),
    env,
    new URL(`https://x/api/channel?channel=${encodeURIComponent(channel)}&since=${since}`)
  );

const cut = (channel, id, key) =>
  handleChannelDelete(
    new Request('https://x/api/channel', { method: 'DELETE', headers: key ? { 'x-trnv-key': key } : {} }),
    env,
    new URL(`https://x/api/channel?channel=${encodeURIComponent(channel)}&id=${encodeURIComponent(id || '')}`)
  );

const say = async (label, response) => {
  const body = await response.json();
  console.log(String(response.status).padEnd(4), label.padEnd(44), JSON.stringify(body).slice(0, 78));
  return { status: response.status, body };
};

const damages = [];
const want = (ok, why) => {
  if (!ok) damages.push(why);
};

let r;

r = await say('claim 441.0 with key A', await claim('441.0', KEY));
want(r.status === 200 && r.body.claimed === true, 'the first claim was refused');

r = await say('claim empty 441.0 with key B', await claim('441.0', OTHER));
want(r.status === 200, 'an unused number could not be reclaimed (squatting)');

r = await say('send with key A (B holds it now)', await talk('441.0', KEY));
want(r.status === 403 && r.body.error === 'key_mismatch', 'a stale key posted to the station');

r = await say('claim empty 441.0 back with key A', await claim('441.0', KEY));
want(r.status === 200, 'the holder could not take back an unused number');

r = await say('send with key A', await talk('441.0', KEY));
want(r.status === 200, 'the holder could not send');

r = await say('claim 441.0 with key B (clip exists)', await claim('441.0', OTHER));
want(r.status === 403, 'a stranger took a station that has a clip');

r = await say('send with key B', await talk('441.0', OTHER));
want(r.status === 403, 'a stranger posted to a used station');

r = await say('send with no key', await talk('441.0', ''));
want(r.status === 403, 'a call with no key was allowed');

r = await say('send 200 KB clip', await talk('441.0', KEY, { audio: 'x'.repeat(200 * 1024) }));
want(r.status === 413, '200 KB was accepted');

r = await say('send non-audio mime', await talk('441.0', KEY, { mime: 'text/html' }));
want(r.status === 415, 'a non-audio body was accepted');

const burst = [];
for (let i = 0; i < 9; i += 1) burst.push((await talk('441.0', KEY)).status);
console.log('burst'.padEnd(40), burst.join(','));
want(burst.includes(429), 'the rate limit never engaged');
want(burst[0] === 429 || burst[0] === 200, 'the burst did not start cleanly');

r = await say('poll with key A from 0', await poll('441.0', 0, KEY));
want(r.status === 200 && r.body.clips.length >= 1, 'nothing came back to the holder');
want(r.body.clips.length <= 10, 'poll returned more than a page');
const lastAt = r.body.clips.at(-1)?.at || 0;

r = await say('poll with key B', await poll('441.0', 0, OTHER));
want(r.status === 403, 'a stranger read the station');

r = await say('poll with no key', await poll('441.0', 0, ''));
want(r.status === 403, 'an unkeyed read was allowed');

r = await say('poll with key A from the last clip', await poll('441.0', lastAt, KEY));
want(r.status === 200 && r.body.clips.length === 0, 'the cursor did not advance');

r = await say('delete with key B', await cut('441.0', 'nope', OTHER));
want(r.status === 403, 'a stranger deleted a clip');

r = await say('delete with no key', await cut('441.0', 'nope', ''));
want(r.status === 403, 'an unkeyed delete was allowed');

r = await say('delete with no target', await cut('441.0', '', KEY));
want(r.status === 400, 'a delete with nothing to delete was accepted');

r = await say('delete a clip that is not there', await cut('441.0', 'no-such-clip', KEY));
want(r.status === 404, 'a missing clip was reported as deleted');

const held = await poll('441.0', 0, KEY).then((res) => res.json());
const victim = held.clips[0];
const before = held.clips.length;
r = await say('delete the first clip with key A', await cut('441.0', victim.id, KEY));
want(r.status === 200 && r.body.deleted === 1, 'the holder could not delete its own clip');

r = await say('poll after the delete', await poll('441.0', 0, KEY));
want(r.status === 200 && r.body.clips.length === before - 1, 'the deleted clip was still on the station');
want(!r.body.clips.some((clip) => clip.id === victim.id), 'the deleted clip came back');

r = await say('claim 446.0 with key A', await claim('446.0', KEY));
want(r.status === 200, 'the same key could not open a second station');

console.log(damages.length ? 'FAIL: ' + damages.join('; ') : 'PASS: every lock held');
process.exit(damages.length ? 1 : 0);
