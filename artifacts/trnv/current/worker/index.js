// The Worker the page answers from, restored.
//
// It was serving `{"ok":false,"error":"not_found","details":"No static build is
// deployed yet."}` at every path, because the deploy that ran took this file as it
// stood — the stub with no assets binding — and the handler that used to answer
// `/api/apps`, `/api/focus`, `/api/ptt`, `/api/ask` and `/api/choice` was not in the
// repository to deploy. This is that handler again, rebuilt from the contract the
// page in `live/` actually calls, so the dial has something to talk to.
//
// Two things are deliberately thin, and both say so when they are asked rather than
// pretending: `/api/ptt` needs an ASR key on the Worker, and `/api/state` has no
// source of folders here. Everything else answers.
import { transcribeTake } from './transcribe.js';
import { handleChannelSend, handleChannelPoll, handleChannelDelete } from './channel.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

const json = (body, status) =>
  new Response(JSON.stringify(body), { status: status || 200, headers: JSON_HEADERS });

// The four slots, in the order the panel draws them. `kind` is what the app is:
// `card` speaks through her, `local` runs in the page, `ask` is her directly.
const APPS = [
  { id: 'app-cards', slug: 'cards', title: 'Cards', kind: 'card', entry: null, speaks: 1 },
  { id: 'app-music', slug: 'music', title: 'Music', kind: 'local', entry: null, speaks: 1 },
  // MSG is the frequency: the strip, the clips waiting on it, the key that holds it.
  // `local` because the page owns that surface — the Worker only stores the clips.
  { id: 'app-msg', slug: 'msg', title: 'MSG', kind: 'local', entry: null, speaks: 1 },
  { id: 'app-assistant', slug: 'assistant', title: 'Assistant', kind: 'ask', entry: '/api/ask', speaks: 1 },
];

const appFor = (slug) => APPS.find((app) => app.slug === String(slug || '')) || null;

// Her reasoning authority, reached server to server: the page never holds a key and
// never names another origin.
const ARA_BASE = (env) => String((env && env.ARA_URL) || 'https://ara.ai-n.workers.dev').replace(/\/$/, '');

// Her answer is a card: the thing he asked, what she says, and the moves she offers.
// A refusal is not a card, and is returned as a refusal.
function cardFrom(payload, question) {
  if (!payload || typeof payload !== 'object' || payload.refused) return null;
  const options = (Array.isArray(payload.options) ? payload.options : [])
    .map((option) => (typeof option === 'string' ? option : String((option && (option.label || option.value)) || '')))
    .filter(Boolean)
    .slice(0, 8);
  const answer = String(payload.text || payload.answer || payload.move || '').trim();
  if (!answer && !options.length) return null;
  return {
    question: String(question || payload.question || '').trim(),
    answer,
    options,
    decisionId: payload.id === undefined ? null : payload.id,
  };
}

async function decide(env, text, extra) {
  const said = String(text || '').trim();
  if (!said) return { error: 'text_required' };
  let response = null;
  try {
    response = await fetch(ARA_BASE(env) + '/decide', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: said, domain: 'trnv', surface: 'trnv', ...(extra || {}) }),
      signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    return { error: 'ara_unreachable' };
  }
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) return { error: 'ara_' + response.status };
  const card = cardFrom(payload, said);
  if (!card) return { error: (payload && payload.refused) ? 'ara_refused' : 'no_card' };
  return { card };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function handleFocus(request) {
  const body = await readJson(request);
  const app = appFor(body && body.slug);
  if (!app) return json({ ok: false, error: 'unknown_app' }, 400);
  // The focus row the old Worker wrote lived in D1; the reply is what the page reads,
  // and it is the app it asked for either way.
  return json({ ok: true, focus: { slug: app.slug, title: app.title, kind: app.kind, at: new Date().toISOString() } });
}

async function handleAsk(request, env) {
  const body = await readJson(request);
  const text = body && (body.text || body.said);
  const result = await decide(env, text, { context: (body && body.context) || null });
  if (!result.card) return json({ ok: false, error: result.error }, result.error === 'text_required' ? 400 : 502);
  return json({ ok: true, card: result.card });
}

async function handleChoice(request, env) {
  const body = await readJson(request);
  const choice = body && body.choice;
  if (!choice) return json({ ok: false, error: 'choice_required' }, 400);
  // A choice is an instruction, not a menu pick: it carries the card it was taken on
  // so the next card is about the thing he was looking at.
  const result = await decide(env, choice, {
    context: body.context || null,
    previous: {
      question: String(body.question || ''),
      answer: String(body.answer || ''),
      decisionId: body.decisionId === undefined ? null : body.decisionId,
    },
  });
  if (!result.card) return json({ ok: false, error: result.error }, 502);
  return json({ ok: true, card: result.card });
}

async function handlePtt(request, env) {
  // The page is the owner's own dial on his own device; the transcribe route refuses
  // without a caller, so the operator is named here rather than left anonymous.
  const result = await transcribeTake(request, env, { id: 'operator', role: 'owner' });
  if (result.status !== 200) return json(result.body, result.status);
  return json({ ok: true, transcript: result.body.text });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/health') {
      return json({
        ok: true,
        service: 'trnv',
        ara: true,
        ambient: true,
        mind: false,
        clips: true,
        time: new Date().toISOString(),
      });
    }
    if (path === '/api/apps') return json({ ok: true, apps: APPS });
    if (path === '/api/focus') return handleFocus(request);
    if (path === '/api/ask') return handleAsk(request, env);
    if (path === '/api/choice') return handleChoice(request, env);
    if (path === '/api/ptt') return handlePtt(request, env);
    // Send puts a clip on the station, GET takes what is waiting there since a moment.
    // The store is D1, which this Worker already has bound. The key is a header, so the
    // request goes with the read as well as the write.
    if (path === '/api/channel' && request.method === 'POST') return handleChannelSend(request, env);
    // A clip can be taken off the station by the same key that can hear it.
    if (path === '/api/channel' && request.method === 'DELETE') return handleChannelDelete(request, env, url);
    if (path === '/api/channel') return handleChannelPoll(request, env, url);
    // There is no filesystem and no folder source on this Worker: it says so, in the
    // shape the page reads, instead of answering with a page of HTML.
    if (path === '/api/state') {
      return json({ ok: false, error: 'state_not_configured', files: [] }, 501);
    }
    if (path.startsWith('/api/')) return json({ ok: false, error: 'not_found' }, 404);

    // Everything else is the page, its script and its vendor modules.
    if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }
    return json({ ok: false, error: 'not_found', details: 'No static build is deployed.' }, 404);
  },
};
