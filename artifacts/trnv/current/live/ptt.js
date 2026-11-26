// The dial on a phone: hold to talk, turn to walk the options, press to choose.
//
// The feel is not decided here. `gesture.js` owns the angle and the velocity,
// `detents.js` the slots and the spoken value, `ptt.js` what a press means, and
// `haptics.js` the motor — whose durations are tapeflow's, lifted, because that
// build's wheel already feels right in his hand. This file only supplies
// milliseconds and pixels, and says one thing at a time, on commit.
import { onMove } from './vendor/gesture.js';
import {
  engagement,
  SPACING_DEG,
  DETENTS_PER_REV,
  revolutionSlot,
  announce,
  pulseTier,
} from './vendor/detents.js';
import { createPress, HOLD_MS } from './vendor/ptt.js';
import { createHaptics, PATTERNS } from './vendor/haptics.js';
import { createBank } from './vendor/bank.js';
import { createDialReader, matches } from './vendor/keyswitch.js';
import { RULES, PATTERN } from './vendor/keyswitch.config.js';
import { detentTicks, createTicker } from './vendor/ticks.js';
import { createTone } from './vendor/tone.js';

import { attachKillSwitch } from './vendor/killswitch.js';

const dial = document.getElementById('dial');
const ticksEl = document.getElementById('ticks');
const optionEl = document.getElementById('option');
const countEl = document.getElementById('count');
const cardEl = document.getElementById('card');
const questionEl = document.getElementById('question');
const answerEl = document.getElementById('answer');
const metaEl = document.getElementById('meta');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const form = document.getElementById('typed');
const textInput = document.getElementById('text');
const voiceBtn = document.getElementById('voice');
const motorEl = document.getElementById('motor');
const dotEl = document.getElementById('dot');
const rowEl = document.getElementById('row');
const rowPageEl = document.getElementById('rowpage');
const feelBtn = document.getElementById('feel');
const slotsEl = document.getElementById('slots');

const store = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // A locked-down browser still gets a working wheel, just not a remembered one.
    }
  },
};

// Her voice is optional. He is not visually impaired; he wants the touch system,
// so the wheel has to stand on haptics and type alone, and this is the switch.
// Where the ambient assistant answers. Her endpoint allows this origin, so the
// page asks her directly; the thread lives in the tab, beside the log.
const AMBIENT_URL = 'https://ambient.ai-n.workers.dev/api/ambient';
let thread = [];

let voiceOn = store.get('trnv.voice', 'on') !== 'off';
let feelOn = store.get('trnv.feel', 'on') !== 'off';
// The card's own menu item: list what kind of ask it was, or keep it silent.
// Silent by default — the answer is the message; the label is for when he asks.
let metaMode = store.get('trnv.meta', 'silent') === 'listed' ? 'listed' : 'silent';
const haptics = createHaptics({ enabled: feelOn });

let options = [];
let index = 0;
let card = null;   // the card in front
// While killed, the wheel is a combination dial. A hold puts that dial away when her
// options are in front. The latch itself is untouched: a kill is not a toggle.
let stopBank = true;
let stack = [];    // every card this session made, oldest first
let turned = 0;    // degrees since this gesture began, for engagement()
let wheelDeg = 0;  // degrees since the page loaded: a combination must survive a lift
let gesture = null;
let turning = false;
let recorder = null;
let chunks = [];
let settleTimer = null;
let pollTimer = null;

const press = createPress();

/* ------------------------------------------------------------------- saying */

/** Interrupt: the newest thing replaces whatever was being said. */
function speak(text) {
  const said = String(text == null ? '' : text).trim();
  if (!voiceOn || !said || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  enqueue(said);
}

/** Queue: the answer finishes before the options start. */
function queueSay(text) {
  const said = String(text == null ? '' : text).trim();
  if (!voiceOn || !said || !('speechSynthesis' in window)) return;
  enqueue(said);
}

function enqueue(said) {
  const utter = new SpeechSynthesisUtterance(said);
  utter.rate = 1.05;
  utter.lang = navigator.language || 'en-US';
  speechSynthesis.speak(utter);
}

function setStatus(text) {
  statusEl.textContent = text;
}

/* ------------------------------------------------------------------- drawing */

function buildTicks(count) {
  ticksEl.innerHTML = '';
  if (!count) return;
  const radius = Math.max(60, dial.clientWidth / 2 - 20);
  for (let i = 0; i < count; i += 1) {
    const tick = document.createElement('span');
    tick.className = 'tick';
    tick.style.transform = `rotate(${(i / count) * 360}deg) translateY(-${radius}px)`;
    ticksEl.appendChild(tick);
  }
}

/* --------------------------------------------------------------- the option row */

// The same four-tile panel as the apps, used as a groove box page: the dial walks the
// list a detent at a time, the lit tile follows, and the page turns when the walk
// crosses the fourth tile. A page turn is a medium pulse, the same tier the wheel uses
// for a musical landmark, so it is felt before it is read.
const ROW_TILES = 4;
let rowPage = 0;

function paintRow() {
  if (!rowEl) return;
  const pages = Math.max(1, Math.ceil(options.length / ROW_TILES));
  const page = options.length ? Math.min(pages - 1, Math.floor(index / ROW_TILES)) : 0;
  const turned = page !== rowPage;
  rowPage = page;

  rowEl.innerHTML = '';
  for (let i = 0; i < ROW_TILES; i += 1) {
    const at = page * ROW_TILES + i;
    const label = options[at];
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile' + (label ? '' : ' empty') + (label && at === index ? ' on' : '');
    tile.disabled = !label;

    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = '0' + (i + 1);
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = label || '—';
    tile.append(num, name);

    if (label) {
      // A tap on a tile takes that option, the same path the press on the dial takes.
      tile.addEventListener('click', () => {
        index = at;
        render();
        choose(label);
      });
    }
    rowEl.append(tile);
  }

  rowEl.setAttribute('aria-label', options.length ? `Options, page ${page + 1} of ${pages}` : 'Options');
  if (rowPageEl) rowPageEl.textContent = options.length > ROW_TILES ? `${page + 1} / ${pages}` : '';
  if (turned) haptics.pulse('medium');
}

function render() {
  paintRow();
  if (options.length) {
    optionEl.textContent = options[index];
    countEl.textContent = `${index + 1} of ${options.length}`;
  } else {
    optionEl.textContent = recorder ? 'listen' : 'hold';
    countEl.textContent = recorder ? 'release to send' : 'to talk';
  }
}

/**
 * The wheel's face, drawn whatever the state.
 *
 * The marks sweep under a fixed pointer as the hand turns, because a wheel that only
 * changes its words cannot be seen turning. There are always 24 of them — the detents
 * are the wheel's, not the list's — and the one under the pointer is lit, so the same
 * face serves a four-option list, a kill in progress and a combination being performed.
 */
function paintWheel() {
  paintRow();
  if (ticksEl.childElementCount !== DETENTS_PER_REV) buildTicks(DETENTS_PER_REV);
  ticksEl.style.transform = `rotate(${wheelDeg}deg)`;
  const slot = revolutionSlot(wheelDeg);
  const atPointer = (DETENTS_PER_REV - slot) % DETENTS_PER_REV;
  const ticks = ticksEl.children;
  for (let i = 0; i < ticks.length; i += 1) ticks[i].classList.toggle('on', i === atPointer);


  // A kill in progress says how far the wheel has gone, so the gesture shows itself
  // before it fires rather than only afterwards.
  if (kill.holding) {
    optionEl.textContent = 'turning';
    countEl.textContent = `${Math.round(kill.travelDeg)}° of ${kill.turnDeg}°`;
    return;
  }
  if (kill.state === 'killed' && stopBank) {
    optionEl.textContent = 'killed';
    countEl.textContent = `stop ${slot} of ${DETENTS_PER_REV}`;
    return;
  }
  // Armed: the marks belong to the wheel, the centre to the list.
  render();
}

function setOptions(list) {
  options = Array.isArray(list) ? list.filter(Boolean) : [];
  index = 0;
  turned = 0;
  gesture = null;
  buildTicks(DETENTS_PER_REV);
  paintWheel();
  if (options.length) {
    setStatus(`Turn to hear them, press to take one.`);
    queueSay(`Options: ${options.join(', ')}`);
  }
}

/**
 * A card arrives and goes on top of the stack.
 *
 * Nothing is replaced: the card it came from stays beneath it, which is what
 * makes this flip-through-able instead of one answer overwriting the last.
 */
function pushCard(next) {
  if (!next) return;
  card = next;
  stack.push(next);
  questionEl.textContent = next.question || next.chosen || '—';
  answerEl.textContent = next.answer || '(no answer)';
  cardEl.classList.add('live');
  log('bot', next.answer || '(no answer)', next);
  speak(next.answer || '');
  renderMeta(next);
  setOptions(next.options);
}

/** The move, domain and target: shown and spoken only when he asked to list them. */
function renderMeta(next) {
  const bits = [next && next.move, next && next.domain, next && next.target].filter(Boolean);
  const listed = metaMode === 'listed' && bits.length > 0;
  metaEl.textContent = listed ? bits.join('  ·  ') : '';
  if (listed) queueSay(bits.join(', '));
}

function log(role, text, entry) {
  const line = document.createElement('p');
  if (role === 'you') line.className = 'q';
  line.textContent = (role === 'you' ? 'you: ' : '') + text;
  // A bot line stands for the card it printed, so it is what he picks a difference by.
  if (entry) {
    line.classList.add('pick');
    line.addEventListener('click', () => pickCard(entry, line));
  }
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

/* -------------------------------------------------------------- the difference */

/**
 * Ripple, on two cards he picked.
 *
 * He selects the pair; the difference is computed for him. Nothing is walked, and no
 * stop is a category: ripple's categories arrive at once, as one line, the way an
 * answer does.
 *
 * A card carries no source hashes, so the ask is the source: two cards answering the
 * same question means nothing in the input changed, and every field that moved is
 * drift. A different ask accounts for the move. Field identity is the field name plus
 * its value, exactly the way a claim key is the source plus the span, so a changed
 * value is one key gone and one key arrived.
 */
const CARD_FIELDS = ['move', 'domain', 'target', 'answer', 'options'];
const DIFFERENCE_CATEGORIES = ['same', 'added', 'dropped', 'silent drift'];

// The two cards he has marked, oldest first. Tapping a marked line lets it go.
let picked = [];

function fieldOf(entry, field) {
  const raw = entry ? entry[field] : null;
  if (raw === undefined || raw === null || raw === '') return null;
  if (Array.isArray(raw)) return raw.length ? raw.join(' · ') : null;
  return String(raw);
}

function differenceOf(under, top) {
  const left = {};
  const right = {};
  for (const field of CARD_FIELDS) {
    left[field] = fieldOf(under, field);
    right[field] = fieldOf(top, field);
  }
  const sameAsk = Boolean(under && top) && String(under.question || '') === String(top.question || '');
  const rows = { same: [], added: [], dropped: [], 'silent drift': [] };

  for (const field of CARD_FIELDS) {
    const before = left[field];
    const after = right[field];
    if (before === after) {
      if (before !== null) rows.same.push(field);
      continue;
    }
    // A changed value is the old key gone and a new one arrived.
    if (before !== null) rows.dropped.push(field);
    if (after !== null) rows.added.push(field);
    if (sameAsk) rows['silent drift'].push(field);
  }

  return { under, top, sameAsk, rows, left, right };
}

/**
 * Two picked cards make the line. The pulse is the size of the difference, and `hard`
 * is silent drift's alone: a change the ask does not account for is the one that has
 * to be unmistakable in the hand.
 */
function showDifference(under, top) {
  const diff = differenceOf(under, top);
  const summary = DIFFERENCE_CATEGORIES.map((name) => `${name} ${diff.rows[name].length}`).join(' · ');
  const moved = diff.rows.added.length + diff.rows.dropped.length;
  const tier = diff.rows['silent drift'].length ? 'hard' : moved > 1 ? 'medium' : 'soft';

  metaEl.textContent = summary;
  setStatus(diff.sameAsk ? 'Same ask · drift.' : 'Ask changed · accounted for.');
  haptics.pulse(tier);
  speak(summary);
}

/**
 * Two states of a folder, differenced by path and digest.
 *
 * The folder is the reference: the same folder read twice that moved has nothing in the
 * input accounting for it, which is drift and gets the hard pulse. Two different
 * folders are a comparison, so their difference is the pair itself.
 */
function showStateDifference(under, top) {
  const left = new Map((under.state.files || []).map((file) => [file.path, file.digest]));
  const right = new Map((top.state.files || []).map((file) => [file.path, file.digest]));
  const added = [...right.keys()].filter((path) => !left.has(path)).length;
  const removed = [...left.keys()].filter((path) => !right.has(path)).length;
  const changed = [...right.keys()].filter((path) => left.has(path) && left.get(path) !== right.get(path)).length;
  const same = [...right.keys()].filter((path) => left.has(path) && left.get(path) === right.get(path)).length;
  const moved = added + removed + changed;
  const sameRoot = under.state.root === top.state.root;

  const summary = `same ${same} · added ${added} · removed ${removed} · changed ${changed}`;
  metaEl.textContent = summary;
  setStatus(sameRoot ? (moved ? 'Same folder · drift.' : 'Same folder · nothing moved.') : 'Two folders · the pair is the reference.');
  haptics.pulse(sameRoot && moved ? 'hard' : moved > 5 ? 'medium' : 'soft');
  speak(summary);
}

/**
 * `state <path>` reads a folder and puts it in the log as something to pick.
 *
 * The state comes back whole, so the difference is taken here and no round trip is
 * needed to compare two of them.
 */
async function readState(where) {
  setStatus(`Reading ${where}…`);
  try {
    const response = await fetch(`/api/state?root=${encodeURIComponent(where)}`);
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || !Array.isArray(data.files)) {
      haptics.error();
      setStatus('No state there: ' + ((data && data.error) || response.status));
      return;
    }
    const entry = {
      question: `state ${where}`,
      answer: `${data.files.length} files · ${String(data.digest).slice(7, 19)}`,
      state: data,
    };
    log('bot', entry.answer, entry);
    haptics.pulse('soft');
    setStatus('State read. Pick two to difference.');
  } catch (error) {
    haptics.error();
    setStatus('Offline: ' + (error && error.message ? error.message : 'failed'));
  }
}

function pickCard(entry, line) {
  const at = picked.indexOf(entry);
  if (at >= 0) {
    picked.splice(at, 1);
    line.classList.remove('picked');
    // The pair is broken, so the line about it goes with it.
    metaEl.textContent = '';
    return;
  }
  // A third pick starts a new pair rather than making him clear the old one.
  if (picked.length === 2) {
    picked = [];
    metaEl.textContent = '';
    for (const marked of logEl.querySelectorAll('p.picked')) marked.classList.remove('picked');
  }
  picked.push(entry);
  line.classList.add('picked');
  haptics.pulse('soft');
  if (picked.length === 2) {
    const [under, top] = picked;
    if (under.state && top.state) showStateDifference(under, top);
    else if (!under.state && !top.state) showDifference(under, top);
    else setStatus('Pick two of the same kind.');
  } else {
    setStatus('One picked. Pick the one to hold it against.');
  }
}

/* ------------------------------------------------------------------ recording */

async function startRecording() {
  if (recorder) return;
  // A killed switch holds: the mic cannot come back by pressing the dial.
  if (kill.state === 'killed') {
    haptics.error();
    setStatus('Killed. Perform the pattern to arm it again.');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
    const mimeType =
      preferred.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || '';
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const type = recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunks, { type });
      recorder = null;
      chunks = [];
      sendClip(blob);
    };
    recorder.start();
    dial.classList.add('listening');
    setStatus('Listening — release to send.');
    render();
    speak('Listening');
  } catch (error) {
    recorder = null;
    haptics.error();
    setStatus('No microphone: ' + (error && error.message ? error.message : 'refused'));
    speak('No microphone');
  }
}

function stopRecording() {
  dial.classList.remove('listening');
  if (recorder && recorder.state !== 'inactive') recorder.stop();
  render();
}

/**
 * The kill path.
 *
 * `stopRecording()` is a normal release: its `onstop` sends the clip, which is what a
 * release is for. A kill must not upload what it just silenced, so the handlers are
 * detached before the recorder stops — otherwise "stop everything" would be the one
 * action that sends the recording out.
 */
function killAudio() {
  const live = recorder;
  recorder = null;
  chunks = [];
  if (live) {
    live.ondataavailable = null;
    live.onstop = null;
    if (live.state !== 'inactive') live.stop();
    const stream = live.stream;
    if (stream && typeof stream.getTracks === 'function') stream.getTracks().forEach((track) => track.stop());
  }
  dial.classList.remove('listening');
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  render();
}

async function sendClip(blob) {
  if (!blob || !blob.size) {
    setStatus('Nothing heard.');
    haptics.pulse('soft');
    speak('Nothing heard');
    return;
  }
  setStatus('Transcribing…');
  const body = new FormData();
  body.append('audio', blob, 'clip.webm');
  try {
    const response = await fetch('/api/ptt', { method: 'POST', body });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || !data.ok) {
      haptics.error();
      setStatus('That did not send: ' + ((data && data.error) || response.status));
      return;
    }
    if (!data.transcript) {
      haptics.pulse('soft');
      setStatus('Nothing heard.');
      speak('Nothing heard');
      return;
    }
    // His words back before anything acts on them.
    log('you', data.transcript);
    setStatus(`“${data.transcript}”`);
    speak(data.transcript);
    await converse(data.transcript);
  } catch (error) {
    haptics.error();
    setStatus('Offline: ' + (error && error.message ? error.message : 'failed'));
  }
}

/* ----------------------------------------------------------------- the asking */

/**
 * What he said, to her.
 *
 * The ambient assistant takes a thread and answers the last thing in it — the
 * same shape the dock sends. The thread is kept here so a follow-up lands on
 * what was already said, and her words go on the card unaltered.
 */
async function converse(said) {
  thread.push({ role: 'user', content: said });
  setStatus('Thinking…');
  try {
    const response = await fetch(AMBIENT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ thread: thread.slice(-12), context: onScreen() }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      thread.pop();
      haptics.error();
      setStatus('That did not ask: ' + ((data && data.error && data.error.message) || response.status));
      return;
    }
    const answer = String(data.text || '').trim();
    if (!answer) {
      // She did not answer. Nothing goes on the card in her place.
      thread.pop();
      haptics.pulse('soft');
      setStatus('Nothing came back.');
      return;
    }
    thread.push({ role: 'assistant', content: answer });
    const asked = data.clarify && data.clarify.questions ? data.clarify.questions[0] : null;
    pushCard({
      question: said,
      answer,
      options: asked && Array.isArray(asked.options) ? asked.options.slice(0, 10) : [],
      via: 'ambient',
      move: data.decision && data.decision.move,
      domain: data.decision && data.decision.domain,
      target: data.decision && data.decision.target,
    });
  } catch (error) {
    thread.pop();
    haptics.error();
    setStatus('Offline: ' + (error && error.message ? error.message : 'failed'));
  }
}

async function ask(text) {
  const said = String(text || '').trim();
  if (!said) return;
  log('you', said);
  const stateCommand = said.match(/^state\s+(.+)$/i);
  if (stateCommand) {
    await readState(stateCommand[1].trim());
    return;
  }
  await converse(said);
}

/**
 * A choice is an instruction, not a menu pick: it makes the next card.
 * That is the interaction — the stack grows by what he decides.
 */
async function choose(chosen) {
  if (!chosen) return;

  // `meta` is the card's own switch, not an instruction for the next card: it
  // flips listed/silent and makes no round trip.
  if (chosen === 'meta') {
    metaMode = metaMode === 'listed' ? 'silent' : 'listed';
    store.set('trnv.meta', metaMode);
    const say = metaMode === 'listed' ? 'Listed' : 'Silent';
    haptics.chosen();
    setStatus(`Kind of ask: ${say.toLowerCase()}`);
    metaEl.textContent = '';
    renderMeta(card || {});
    speak(say);
    return;
  }

  const from = card || {};

  // Her options are hers: taking one is the next thing he says to her, not an
  // instruction to the wheel's own worker.
  if (from.via === 'ambient') {
    haptics.chosen();
    await ask(chosen);
    return;
  }

  haptics.chosen();
  setStatus(`${chosen} — carrying on…`);
  speak(chosen);
  try {
    const response = await fetch('/api/choice', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        choice: chosen,
        question: from.question || '',
        answer: from.answer || '',
        // Which decision he was looking at when he said it, so a verdict is
        // filed against her row and not against the card the choice makes.
        decisionId: from.decisionId == null ? null : from.decisionId,
        context: onScreen(),
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || !data.ok) {
      haptics.error();
      setStatus('That did not carry on: ' + ((data && data.error) || response.status));
      return;
    }
    pushCard(data.card);
  } catch (error) {
    haptics.error();
    setStatus('Offline: ' + (error && error.message ? error.message : 'failed'));
  }
}

/**
 * What is on the dial, for her eyes.
 *
 * She stands in the workspace and already has context on the project, so this is
 * not a summary for a stranger: it is the three cards in front of him, in her own
 * card shape, so her answer is about the thing he is looking at.
 */
function onScreen() {
  return stack
    .slice(-3)
    .map((entry) => `Card: ${entry.question || entry.chosen || ''}\nAnswer: ${entry.answer || ''}`)
    .join('\n\n')
    .slice(0, 4000);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const said = textInput.value;
  textInput.value = '';
  ask(said);
});

/* -------------------------------------------------------------------- gesture */

function pointOf(event) {
  const box = dial.getBoundingClientRect();
  return {
    x: event.clientX,
    y: event.clientY,
    centreX: box.left + box.width / 2,
    centreY: box.top + box.height / 2,
  };
}

let dotHeld = false;
let dotTimer = null;

/** A fingertip is wider than the dot: the target is generous, the mark stays small. */
function onDot(point) {
  if (!dotEl) return false;
  const box = dotEl.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  return Math.hypot(point.x - cx, point.y - cy) <= 30;
}

dial.addEventListener('pointerdown', (event) => {
  dial.setPointerCapture(event.pointerId);
  turning = false;
  gesture = null;
  turned = 0;
  const point = pointOf(event);
  // Seed the gesture where the finger landed. Measuring from the first move loses the
  // travel made before the press became a turn, which is the whole slop distance: a
  // full circle came back as 350°, so the landmark at zero — and the 360° the kill
  // waits for — never arrived.
  gesture = onMove(null, {
    x: point.x,
    y: point.y,
    centreX: point.centreX,
    centreY: point.centreY,
    ms: Date.now(),
  });
  // The red dot is the kill's handle, as on tapeflow's deck: a finger landing on it is
  // gripping the wheel to spin it open, not pressing to talk. Anywhere else behaves.
  if (onDot(point)) {
    turning = true;
    dotHeld = true;
    if (dotEl) dotEl.classList.add('held');
    kill.press(wheelDeg);
    // Two beats, short: gripped rather than buzzing, and distinct from every detent so
    // the hand never mistakes the grip for a mark on the rim.
    haptics.grip();
    setStatus('Spinning to kill — turn a full circle.');
    clearInterval(dotTimer);
    dotTimer = setInterval(() => kill.tick(wheelDeg), 50);
    return;
  }

  press.down({ x: point.x, y: point.y, ms: Date.now() });
  dial.classList.add('armed');
  // A press has begun; one soft tick says the surface heard him.
  haptics.pulse('soft');
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    const event = press.tick(Date.now());
    if (event && event.type === 'hold') beginHold();
  }, 40);
});

function beginHold() {
  dial.classList.remove('armed');
  // The kill switch is being held, so the wheel is a combination dial and not a
  // microphone. Without this, spinning it for a kill would open the mic first.
  if (kill.holding) return;
  haptics.hold();

  // Her options make the wheel a menu, and a menu's hold is not the microphone. It puts
  // the stop dial away if a kill parked the wheel there, and otherwise says where the
  // wheel is standing. Nothing is sent and nothing is asked.
  if (options.length) {
    if (kill.state === 'killed' && stopBank) {
      stopBank = false;
      haptics.pulse('medium');
      paintWheel();
      setStatus('Turn to hear them, press to take one.');
    }
    settle();
    return;
  }

  startRecording();
}

dial.addEventListener('pointermove', (event) => {
  const point = pointOf(event);
  const cancelled = press.move({ x: point.x, y: point.y });
  if (cancelled && cancelled.type === 'cancel') {
    dial.classList.remove('armed');
    turning = true;
  }
  if (!turning) return;

  gesture = onMove(gesture, {
    x: point.x,
    y: point.y,
    centreX: point.centreX,
    centreY: point.centreY,
    ms: Date.now(),
  });
  turned += gesture.delta;
  wheelDeg += gesture.delta;

  // A wheel that turns in silence cannot be performed blind, so every detent ticks in
  // every state: walking a list, killed, or spinning up a kill with no list at all.
  const tick = ticker.at(wheelDeg);
  if (tick) {
    // Both channels, always: this phone swallows short pulses even when it answers the
    // call, and a detent that is neither felt nor heard is a detent that never happened.
    haptics.pulse(tick.tier);
    tone.tick(tick.tier);
  }
  paintWheel();

  // While killed the wheel is a combination dial, not a menu: nothing walks or speaks,
  // so the stops can be counted without looking. A hold puts this dial away once there
  // is a menu in front of it; until then the stops are the wheel.
  if (kill.state === 'killed' && stopBank) return;

  if (!options.length) return;

  const slot = engagement(turned, SPACING_DEG, { from: index });
  if (slot === index) return;
  index = ((slot % options.length) + options.length) % options.length;
  // The strength is the position: hard at the ends, medium beside them, soft
  // between, so the list's shape is felt instead of counted.
  const tier = pulseTier(index, options.length);
  haptics.pulse(tier);
  tone.tick(tier);
  render();
  settle();
});

/** What is said comes on settle, never on move: a phrase per detent stutters. */
function settle() {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    const spoken = announce(options[index] || '', { idleMs: 400, verbosity: 'landmarks' });
    if (spoken) speak(spoken);
  }, 300);
}

// iOS only opens audio inside a gesture, so unlock the blips on the same press that
// starts everything else rather than on the first detent that needs one.
dial.addEventListener('pointerdown', () => {
  tone.resume();
});

dial.addEventListener('pointerup', () => {
  clearInterval(pollTimer);
  dial.classList.remove('armed');

  // The dot's spin ends where the hand leaves it. Nothing is taken: the latch either
  // fired on the way round or it did not, and a release is never a stop of a combination.
  if (dotHeld) {
    dotHeld = false;
    if (dotEl) dotEl.classList.remove('held');
    clearInterval(dotTimer);
    dotTimer = null;
    kill.release();
    paintWheel();
    turning = false;
    gesture = null;
    turned = 0;
    return;
  }
  const decided = press.up({ ms: Date.now() });

  // While the kill switch is held the wheel sends nothing and asks nothing: a gesture
  // in progress must not cost a clip or a question.
  if (!kill.holding) {
    if (decided && decided.type === 'send') {
      haptics.send();
      stopRecording();
    } else if (decided && decided.type === 'tap' && kill.state !== 'killed') {
      // A killed page asks nothing: the wheel can be walked, never used to send.
      if (options.length) choose(options[index]);
      else if (card) speak(card.answer || '');
    }
  }
  // A combination records where the hand came to rest. `wheelDeg` keeps turning across
  // lifts while `turned` restarts, which is exactly the difference between a position
  // and a gesture.
  if (kill.state === 'killed' && stopBank) takeStop();
  turning = false;
  gesture = null;
  turned = 0;
});

dial.addEventListener('pointercancel', () => {
  clearInterval(pollTimer);
  dial.classList.remove('armed', 'listening');

  if (dotHeld) {
    dotHeld = false;
    if (dotEl) dotEl.classList.remove('held');
    clearInterval(dotTimer);
    dotTimer = null;
    kill.release();
  }
  const lost = press.abandon();
  if (lost && lost.type === 'abort') stopRecording();
  turning = false;
  gesture = null;
});

// A press that has become a hold must say so even if the finger stopped moving
// before a timer fired; the poll above only runs while a pointer is down.
setInterval(() => {
  if (press.state !== 'pressing') return;
  const event = press.tick(Date.now());
  if (event && event.type === 'hold') beginHold();
}, 400);

/* ------------------------------------------------------------------- switches */

function paintSwitches() {
  voiceBtn.setAttribute('aria-pressed', String(voiceOn));
  voiceBtn.textContent = voiceOn ? 'voice' : 'silent';
  feelBtn.setAttribute('aria-pressed', String(feelOn));
  feelBtn.textContent = feelOn ? 'haptics' : 'no haptics';
  if (!haptics.available) {
    feelBtn.disabled = true;
    feelBtn.title = 'This browser has no vibration motor it can reach.';
  }
}

/* ------------------------------------------------------------- the kill switch */

// One gesture, no dialog: hold the voice switch. It silences the page, releases the
// microphone without uploading what it heard, and keeps voice off across a reload.
// A kill writes nothing to the tape — the absence of entries is the record — and the
// pattern in core/keyswitch.config.js is what arms it again. The room key belongs in
// `onKill` too the moment there is one to drop; that is the reason this exists.
const kill = attachKillSwitch(voiceBtn, {
  // The held switch is only half the gesture: the wheel also has to go round while it
  // is held. This reads `wheelDeg`, not `turned`: `turned` restarts every time the hand
  // leaves the wheel, so a full turn split across two drags would never be counted.
  turnedOf: () => wheelDeg,
  effects: {
    onKill() {
      killAudio();
      voiceOn = false;
      store.set('trnv.voice', 'off');
      // A fresh kill is the stop dial again, whatever the wheel was showing before.
      stopBank = true;
      paintSwitches();
      buildTicks(DETENTS_PER_REV);
      paintWheel();
      haptics.error();
      setStatus('Killed. Voice is off; perform the pattern to arm it again.');
    },
  },
});

/* ------------------------------------------------------- the combination dial */

const reader = createDialReader();
const ticker = createTicker();
const tone = createTone();

// The motor's own account of itself, on screen. A hand that feels nothing cannot tell a
// refused pulse from a call that never happened, and those need different fixes, so the
// page reports which it is: reachable, fired, accepted, refused.
setInterval(() => {
  if (!motorEl) return;
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const platform = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : 'desktop';
  const reachable = typeof navigator.vibrate === 'function';
  motorEl.textContent = [
    platform,
    reachable ? 'motor reachable' : 'motor absent',
    `${haptics.count} pulses`,
    `${haptics.accepted} accepted`,
    `${haptics.refused} refused`,
    haptics.enabled ? 'on' : 'off',
    `last ${haptics.last || '—'}`,
  ].join(' · ');
}, 500);

// Tap the line to feel one strength at a time, softest first, ending with the long
// press. The hold is the one pulse measured to arrive, so a hand that feels only the
// last rung has found its floor, and the detent shapes can be set above it.
if (motorEl) {
  const ladder = ['soft', 'medium', 'hard', 'hold'];
  let rung = 0;
  motorEl.style.cursor = 'pointer';
  motorEl.title = 'Tap to feel each pulse, softest first';
  motorEl.addEventListener('click', () => {
    const name = ladder[rung % ladder.length];
    rung += 1;
    if (name === 'hold') haptics.hold();
    else haptics.pulse(name);
    tone.resume();
    tone.tick(name === 'hard' ? 'hard' : 'medium');
    motorEl.textContent = `test: ${name} · ${(PATTERNS[name] || []).join('+')} ms`;
  });
}

/** A stop is where the hand came to rest, recorded modulo one revolution. */
function takeStop() {
  const slot = reader.settle(wheelDeg);
  reader.lift();
  if (slot == null) return;
  haptics.pulse('medium');
  tone.tick('medium');
  setStatus(`Stop ${slot} — ${reader.steps().length} of ${RULES.combination}`);
  paintWheel();
  armIfPerformed();
}

/**
 * The stops are the lock. Five of them, in order, is the room; anything else resets the
 * dial so the next attempt starts from nothing rather than from a near miss.
 */
function armIfPerformed() {
  const stops = reader.steps();
  if (stops.length < RULES.combination) return;

  if (matches(stops, PATTERN)) {
    reader.reset();
    kill.rearm();
    voiceOn = true;
    store.set('trnv.voice', 'on');
    paintSwitches();
    buildTicks(DETENTS_PER_REV);
    paintWheel();
    haptics.chosen();
    setStatus('Armed.');
    speak('Armed');
    return;
  }

  reader.reset();
  haptics.error();
  setStatus('Not that combination. Start again.');
}

voiceBtn.addEventListener('click', () => {
  // A completed hold is a kill, not a tap: without this the gesture would switch the
  // thing back on as it let go.
  if (kill.consumed()) return;
  voiceOn = !voiceOn;
  store.set('trnv.voice', voiceOn ? 'on' : 'off');
  if (!voiceOn && 'speechSynthesis' in window) speechSynthesis.cancel();
  paintSwitches();
  if (voiceOn) speak('Voice on');
});

feelBtn.addEventListener('click', () => {
  feelOn = !feelOn;
  haptics.setEnabled(feelOn);
  store.set('trnv.feel', feelOn ? 'on' : 'off');
  paintSwitches();
  if (feelOn) haptics.pulse('medium');
});

/* -------------------------------------------------------------------- the slots */

// A card is an app; four are on the panel. A press enters it (a focus row in the
// database), a hold changes its second face — whether it may hold the speech
// channel — which is this app's `speaks` column, walked as a value.
const SLOT_LIMIT = 4;
// React Native's own long-press default, and one of the values tapeflow's bundle
// carries: a press shorter than this is a tap.
const SLOT_HOLD_MS = 500;

let bank = null;
let focused = null;

async function loadSlots() {
  let apps = [];
  try {
    const response = await fetch('/api/apps');
    const data = await response.json().catch(() => null);
    apps = (data && Array.isArray(data.apps) ? data.apps : []).slice(0, SLOT_LIMIT);
  } catch {
    apps = [];
  }
  bank = createBank(
    apps.map((app) => ({
      id: app.slug,
      label: app.title,
      second: app.speaks ? 'speaks' : 'silent',
      values: ['speaks', 'silent'],
      on: Boolean(app.speaks),
    })),
  );
  drawSlots(apps);
}

function drawSlots(apps) {
  slotsEl.innerHTML = '';
  for (let i = 0; i < SLOT_LIMIT; i += 1) {
    const app = apps[i] || null;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'slot' + (app ? '' : ' empty') + (app && focused === app.slug ? ' on' : '');
    button.dataset.slug = app ? app.slug : '';
    button.disabled = !app;

    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = '0' + (i + 1);
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = app ? app.title : 'assign';
    const under = document.createElement('span');
    under.className = 'under';
    const face = app && bank ? bank.face(app.slug) : null;
    under.textContent = face ? face.second : '';
    button.append(num, name, under);
    button.setAttribute('aria-label', app ? `${app.title}. Press to open, hold for ${under.textContent}.` : `Slot ${i + 1} is empty.`);

    if (app) {
      let timer = null;
      let held = false;
      button.addEventListener('pointerdown', () => {
        held = false;
        haptics.pulse('soft');
        clearTimeout(timer);
        timer = setTimeout(() => {
          held = true;
          holdSlot(app.slug, under);
        }, SLOT_HOLD_MS);
      });
      const release = () => {
        clearTimeout(timer);
        if (!held) pressSlot(app.slug);
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', () => clearTimeout(timer));
    }
    slotsEl.appendChild(button);
  }
}

async function pressSlot(slug) {
  haptics.pulse('hard');
  try {
    const response = await fetch('/api/focus', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || !data.ok) {
      haptics.error();
      setStatus('That app did not open: ' + ((data && data.error) || response.status));
      return;
    }
    focused = slug;
    const title = data.focus && data.focus.title ? data.focus.title : slug;
    setStatus(`${title} in front`);
    speak(title);
    drawSlotsFromBank();
  } catch (error) {
    haptics.error();
    setStatus('Offline: ' + (error && error.message ? error.message : 'failed'));
  }
}

function holdSlot(slug, underEl) {
  if (!bank) return;
  const result = bank.hold(slug);
  const face = bank.face(slug);
  haptics.pulse(result && result.wrapped ? 'hard' : 'medium');
  if (underEl) underEl.textContent = face ? face.second : '';
  setStatus(`${face ? face.label : slug}: ${face ? face.second : ''}`);
  speak(`${face ? face.second : ''}`);
  drawSlotsFromBank();
}

/** Redraw from what the client already has, without asking the server again. */
function drawSlotsFromBank() {
  const apps = [...slotsEl.querySelectorAll('.slot')].map((el) => {
    const slug = el.dataset.slug;
    if (!slug) return null;
    return { slug, title: el.querySelector('.name').textContent, speaks: 0 };
  }).filter(Boolean);
  drawSlots(apps);
}

paintSwitches();
buildTicks(0);
loadSlots();
render();
setStatus(`Hold the dial and speak — ${HOLD_MS} ms. Turn for options, press to take one.`);
