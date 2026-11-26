// Music on the dial — the wheel turns with the sound, and the sound follows the wheel.
//
// The wheel has a *speed*, not a position. Each frame the speed is integrated twice:
// once into the wheel's angle, once into the track's time (`angle += vel*dt`,
// `pos += vel/360*dt`). With no hand on it the wheel turns at the deck's calibration
// (normal × speed, DeckScreen 521); with a hand on it the hand's measured speed is the
// speed, and on release both the wheel *and the sound* settle back at the SETTLE rate.
// They are the same number at every instant: a setting you cannot hear is not a setting.
//
// Three settings, the deck's own, behind the REEL button. Tap a row to arm it, then turn
// the wheel to tune it — a fine step per 45°, with the armed value held in the middle of
// the dial while you turn.
//
// Load order: nothing that reads `hand` may run while this module is evaluating, because
// `hand` is declared below the surface. The startup call paints numbers only.

import { revolutionSlot, DETENTS_PER_REV } from './vendor/detents.js';

const SLOT_SLUG = 'music';

const ELEMENT_MIN = 0.0625;
const ELEMENT_MAX = 8;
const HAND_MIN = ELEMENT_MIN;
const LIVE_MIN = 0.12;
const DECK_RATE = 1;

const SLEW = 6000;               // °/s²: how fast the hand's velocity may change
const WINDOW_MS = 160;           // the hand is measured over this window
const STILL_MS = 90;             // a hand that stops moving holds, then runs down
const HAPTIC_DEG = 30;           // a tick every 30° of travel, as the deck does

/* -------------------------------------------------------------- the reel settings */

const REEL_STEPS = {
  speedPerTurn: { min: 0.5, max: 2, step: 0.05, fine: 0.01, per: 45, label: 'speed' },
  topSpeed: { min: 1.1, max: 3, step: 0.05, fine: 0.01, per: 45, label: 'top speed' },
  settle: { min: 0, max: 100, step: 5, fine: 1, per: 45, label: 'settle' },
};
const REEL_KEY = 'trnv.reel';
const reel = { speedPerTurn: 1, topSpeed: 1.7, settle: 40 };

try {
  const saved = JSON.parse(localStorage.getItem(REEL_KEY) || '{}');
  for (const key of Object.keys(REEL_STEPS)) {
    const value = Number(saved[key]);
    if (Number.isFinite(value)) {
      const { min, max } = REEL_STEPS[key];
      reel[key] = Math.min(max, Math.max(min, value));
    }
  }
} catch {
  /* a device that refuses storage still gets the defaults */
}

let DEG_PER_SEC_AT_1X = 360 * reel.speedPerTurn;
let TOP_SPEED = reel.topSpeed;
let SLOWING = 1.4;
let SPEEDING = 5;
let HOLDING = 3;

const ticksEl = document.getElementById('ticks');
const dial = document.getElementById('dial');
const slotsEl = document.getElementById('slots');
const optionEl = document.getElementById('option');
const countEl = document.getElementById('count');
const mainEl = dial ? dial.parentElement : null;

const TAP_SLOP_PX = 8;
const TAP_MS = 600;
const DB_NAME = 'trnv-audio';
const DB_VERSION = 2;
const STORE = 'imports';

const feelOn = () => {
  try {
    return localStorage.getItem('trnv.feel') !== 'off';
  } catch {
    return true;
  }
};

function buzz(ms) {
  if (!feelOn()) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(ms);
  } catch {
    /* a browser that refuses vibration still gets a working wheel */
  }
}

/* ------------------------------------------------------------------ the store */

function openDb() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    let request = null;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      return resolve(null);
    }
    request.onupgradeneeded = () => {
      try {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      } catch {
        /* an older schema that already has it */
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

async function allImports() {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      const keys = tx.objectStore(STORE).getAllKeys();
      req.onsuccess = () => {
        keys.onsuccess = () => {
          const blobs = req.result || [];
          const names = keys.result || [];
          resolve(blobs.map((blob, i) => ({ id: names[i], blob })).filter((e) => e.id && e.blob && e.blob.size));
        };
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function putImport(id, blob) {
  const db = await openDb();
  if (!db) return false;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    return true;
  } catch {
    return false;
  }
}

const clock = (seconds) => {
  const value = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const minutes = Math.floor(value / 60);
  const rest = value - minutes * 60;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest.toFixed(1)}`;
};

/* ----------------------------------------------------------------- the surface */

const lens = document.createElement('section');
lens.id = 'music';
lens.hidden = true;
lens.setAttribute('aria-label', 'Music');
lens.innerHTML = `
  <style>
    #music { width: 100%; display: grid; gap: 10px; }
    #music[hidden] { display: none; }
    #music .top { display: flex; align-items: center; gap: 8px; }
    #music button { font: inherit; color: var(--dim); background: var(--panel);
      border: 1px solid var(--line); border-radius: 12px; padding: 10px 14px; cursor: pointer; }
    #music button:focus-visible { outline: 2px solid var(--lit); outline-offset: 2px; }
    #music .load { color: var(--ink); font-weight: 600; letter-spacing: .02em; }
    #music .reelbtn { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; padding: 8px 12px; }
    #music .reelbtn[aria-expanded="true"] { color: var(--lit); border-color: var(--lit); }
    #music .name { flex: 1; min-width: 0; font-size: 12px; letter-spacing: .1em;
      text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #music .line { display: flex; align-items: center; gap: 10px; }
    #music .play { width: 64px; height: 44px; font-size: 14px; color: #14100a;
      background: var(--lit); border-color: var(--lit); font-weight: 700; }
    #music .time { font-size: 13px; letter-spacing: .04em; color: #d6dbe4;
      font-variant-numeric: tabular-nums; }
    #music .rate { margin-left: auto; font-size: 12px; letter-spacing: .06em;
      color: var(--lit); font-variant-numeric: tabular-nums; }
    #music .hint { margin: 0; font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
      color: var(--dim); }
    #music .tracks { display: flex; gap: 8px; width: 100%; }
    #music .trk { flex: 1; min-width: 0; width: 0; padding: 7px 6px; display: flex;
      flex-direction: column; align-items: center; gap: 2px; }
    #music .trk .t { font-size: 10px; line-height: 1.25; color: var(--ink); overflow: hidden;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; text-align: center; }
    #music .trk.on { border-color: var(--lit); box-shadow: 0 0 0 1px var(--lit) inset; }
    #music .trk .i { font-size: 9px; letter-spacing: .16em; color: var(--dim); }
    #music .reel { display: grid; gap: 6px; padding: 8px 10px; border: 1px solid var(--line);
      border-radius: 12px; background: var(--panel); }
    #music .reel[hidden] { display: none; }
    #music .set { display: flex; align-items: center; gap: 8px; border-radius: 10px;
      padding: 4px 6px; border: 1px solid transparent; }
    #music .set .k { flex: 1; min-width: 0; font-size: 10px; letter-spacing: .12em; color: var(--dim); }
    #music .set .v { width: 62px; text-align: center; font-size: 12px; color: var(--ink);
      font-variant-numeric: tabular-nums; }
    #music .set button { width: 40px; height: 34px; padding: 0; font-size: 16px; line-height: 1;
      color: var(--ink); }
    #music .set button:active { border-color: var(--lit); color: var(--lit); }
    #music .set.armed { border-color: var(--lit); }
    #music .set.armed .k, #music .set.armed .v { color: var(--lit); }
  </style>
  <div class="top">
    <button class="load" id="mLoad" type="button">Load a track</button>
    <span class="name" id="mName">nothing loaded</span>
    <button class="reelbtn" id="mReelBtn" type="button" aria-expanded="false"
      aria-controls="mReel">reel</button>
  </div>
  <div class="line">
    <button class="play" id="mPlay" type="button" aria-label="Play">play</button>
    <span class="time" id="mTime">0:00.0 / 0:00.0</span>
    <span class="rate" id="mRate">1.00×</span>
  </div>
  <p class="hint" id="mHint">Turn the wheel: the wheel turns with the sound.</p>
  <div class="tracks" id="mTracks"></div>
  <div class="reel" id="mReel" hidden>
    <div class="set" data-arm="speedPerTurn" role="button" tabindex="0">
      <span class="k">SPEED PER TURN</span>
      <button type="button" data-reel="speedPerTurn" data-dir="-1" aria-label="Slower per turn">−</button>
      <span class="v" id="mSpeedPerTurn">1.00×</span>
      <button type="button" data-reel="speedPerTurn" data-dir="1" aria-label="Faster per turn">+</button>
    </div>
    <div class="set" data-arm="topSpeed" role="button" tabindex="0">
      <span class="k">TOP SPEED</span>
      <button type="button" data-reel="topSpeed" data-dir="-1" aria-label="Lower top speed">−</button>
      <span class="v" id="mTopSpeed">1.70×</span>
      <button type="button" data-reel="topSpeed" data-dir="1" aria-label="Raise top speed">+</button>
    </div>
    <div class="set" data-arm="settle" role="button" tabindex="0">
      <span class="k">SETTLE</span>
      <button type="button" data-reel="settle" data-dir="-1" aria-label="Settle quicker">−</button>
      <span class="v" id="mSettle">40%</span>
      <button type="button" data-reel="settle" data-dir="1" aria-label="Settle later">+</button>
    </div>
  </div>
  <input id="mFile" type="file" accept="audio/*" multiple hidden>
`;
if (mainEl) dial.insertAdjacentElement('afterend', lens);

const loadBtn = lens.querySelector('#mLoad');
const playBtn = lens.querySelector('#mPlay');
const nameEl = lens.querySelector('#mName');
const timeEl = lens.querySelector('#mTime');
const rateEl = lens.querySelector('#mRate');
const hintEl = lens.querySelector('#mHint');
const tracksEl = lens.querySelector('#mTracks');
const fileEl = lens.querySelector('#mFile');
const reelEl = lens.querySelector('#mReel');
const reelBtn = lens.querySelector('#mReelBtn');
const reelOut = {
  speedPerTurn: lens.querySelector('#mSpeedPerTurn'),
  topSpeed: lens.querySelector('#mTopSpeed'),
  settle: lens.querySelector('#mSettle'),
};
const reelRows = Array.from(lens.querySelectorAll('#mReel .set'));

const audio = new Audio();
audio.preload = 'metadata';

let tracks = [];
let current = null;
let open = false;
let armed = '';

const HINT = 'Turn the wheel: the wheel turns with the sound.';

function paintReelNumbers() {
  if (reelOut.speedPerTurn) reelOut.speedPerTurn.textContent = `${reel.speedPerTurn.toFixed(2)}×`;
  if (reelOut.topSpeed) reelOut.topSpeed.textContent = `${reel.topSpeed.toFixed(2)}×`;
  if (reelOut.settle) reelOut.settle.textContent = `${Math.round(reel.settle)}%`;
}

const reelText = (key) =>
  key === 'settle' ? `${Math.round(reel.settle)}%` : `${reel[key].toFixed(2)}×`;

// The middle of the dial is the page's: while a setting is armed it holds that setting's
// value — the number being tuned — otherwise the rate and the time.
function paintCentre() {
  if (!open || !countEl) return;
  if (armed) countEl.textContent = `${REEL_STEPS[armed].label} ${reelText(armed)}`;
}

function paintReel() {
  paintReelNumbers();
  for (const row of reelRows) row.classList.toggle('armed', row.dataset.arm === armed);
  paintCentre();
}

function paintTime() {
  const position = playPos();
  const total = Number.isFinite(audio.duration) ? audio.duration : 0;
  timeEl.textContent = `${clock(position)} / ${clock(total)}`;
  if (!open || !countEl) return;
  if (armed) countEl.textContent = `${REEL_STEPS[armed].label} ${reelText(armed)}`;
  else if (current) countEl.textContent = `${rateText(hand.rate)} · ${clock(position)}`;
}

function paintPlay() {
  const playing = !audio.paused && !audio.ended;
  playBtn.textContent = playing ? 'stop' : 'play';
  playBtn.setAttribute('aria-label', playing ? 'Stop' : 'Play');
}

function paintTracks() {
  tracksEl.innerHTML = '';
  tracks.slice(0, 4).forEach((track) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'trk' + (current && current.id === track.id ? ' on' : '');
    const label = document.createElement('span');
    label.className = 't';
    label.textContent = track.name;
    const under = document.createElement('span');
    under.className = 'i';
    under.textContent = track.duration ? clock(track.duration).replace(/\.\d$/, '') : 'audio';
    button.append(label, under);
    button.setAttribute('aria-label', `Play ${track.name}`);
    button.addEventListener('click', () => select(track, { play: true }));
    tracksEl.appendChild(button);
  });
}

function paintName() {
  nameEl.textContent = current ? current.name : 'nothing loaded';
  loadBtn.textContent = tracks.length ? 'Add a track' : 'Load a track';
}

// Recompute what the wheel means. `paint: false` is the startup call, which must not
// touch the wheel state.
function applyReel({ save = true, paint = true } = {}) {
  const mul = Math.pow(4, (reel.settle - 50) / 50);
  DEG_PER_SEC_AT_1X = 360 * reel.speedPerTurn;
  TOP_SPEED = reel.topSpeed;
  SLOWING = 1.4 / mul;
  SPEEDING = 5 / mul;
  HOLDING = 3 / mul;
  if (paint) paintReel();
  if (save) {
    try {
      localStorage.setItem(REEL_KEY, JSON.stringify(reel));
    } catch {
      /* the setting still applies for this session */
    }
  }
}

function clampSetting(key, value) {
  const { min, max } = REEL_STEPS[key];
  return Math.min(max, Math.max(min, value));
}

function stepReel(key, dir) {
  const { step } = REEL_STEPS[key];
  reel[key] = clampSetting(key, Math.round((reel[key] + dir * step) * 100) / 100);
  applyReel();
  buzz(8);
}

function holdable(button) {
  let delay = 0;
  let repeat = 0;
  const stop = () => {
    clearTimeout(delay);
    clearInterval(repeat);
    delay = 0;
    repeat = 0;
  };
  const start = () => {
    const key = button.dataset.reel;
    const dir = Number(button.dataset.dir);
    if (!key || !dir || !REEL_STEPS[key]) return;
    stepReel(key, dir);
    delay = setTimeout(() => {
      repeat = setInterval(() => stepReel(key, dir), 90);
    }, 380);
  };
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    start();
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) button.addEventListener(type, stop);
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    const key = button.dataset.reel;
    const dir = Number(button.dataset.dir);
    if (key && dir && REEL_STEPS[key]) stepReel(key, dir);
  });
}

if (reelEl) {
  reelEl.querySelectorAll('button[data-reel]').forEach(holdable);
}
applyReel({ save: false, paint: false });
paintReelNumbers();

function arm(key) {
  armed = armed === key ? '' : key;
  paintReel();
  buzz(10);
}

for (const row of reelRows) {
  const key = row.dataset.arm;
  row.addEventListener('click', (event) => {
    if (event.target && event.target.closest && event.target.closest('button')) return;
    arm(key);
  });
  row.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    arm(key);
  });
}

function setReelOpen(next) {
  if (!reelEl || !reelBtn) return;
  reelEl.hidden = !next;
  reelBtn.setAttribute('aria-expanded', next ? 'true' : 'false');
  if (!next && armed) armed = '';
  paintReel();
}

if (reelBtn) {
  reelBtn.addEventListener('click', () => setReelOpen(!!reelEl && reelEl.hidden));
}

function select(track, { play = false } = {}) {
  if (!track) return;
  current = track;
  hand.pos = 0;
  audio.src = track.url;
  audio.load();
  paintName();
  paintTracks();
  paintTime();
  paintPlay();
  if (play) {
    hand.want = true;
    hand.vel = DECK_RATE * DEG_PER_SEC_AT_1X;
    audio
      .play()
      .then(paintPlay)
      .catch(() => {
        paintPlay();
        hintEl.textContent = 'Tap play to start this track.';
      });
  }
}

async function addFiles(fileList) {
  const files = Array.from(fileList || []).filter((file) => file && file.size);
  if (!files.length) return;
  hintEl.textContent = 'Reading…';
  for (const file of files) {
    const id = `import:${file.name}:${file.size}:${file.lastModified || 0}`;
    const url = URL.createObjectURL(file);
    const track = { id, name: file.name.replace(/\.[a-z0-9]+$/i, ''), blob: file, url, duration: 0 };
    tracks = tracks.filter((held) => held.id !== id).concat(track);
    await putImport(id, file);
  }
  fileEl.value = '';
  paintName();
  paintTracks();
  hintEl.textContent = HINT;
  select(tracks[tracks.length - 1]);
}

audio.addEventListener('loadedmetadata', () => {
  if (current) current.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  paintTime();
  paintTracks();
});
audio.addEventListener('timeupdate', paintTime);
audio.addEventListener('play', paintPlay);
audio.addEventListener('pause', paintPlay);
audio.addEventListener('ended', paintPlay);

loadBtn.addEventListener('click', () => fileEl.click());
fileEl.addEventListener('change', () => addFiles(fileEl.files));
playBtn.addEventListener('click', togglePlay);

function togglePlay() {
  if (!current) {
    fileEl.click();
    return;
  }
  const starting = audio.paused || audio.ended;
  hand.want = starting;
  if (starting) {
    hand.vel = DECK_RATE * DEG_PER_SEC_AT_1X;
    audio.play().then(paintPlay).catch(() => {});
  } else {
    audio.pause();
  }
  if (!hand.raf && open) {
    hand.lastAt = performance.now();
    hand.raf = requestAnimationFrame(tick);
  }
  buzz(18);
}

/* ------------------------------------------------------------------- the wheel */

const hand = {
  vel: 0,          // °/s, signed
  rate: 1,         // what the track is running at right now
  pos: 0,          // track seconds
  spin: 0,         // degrees of travel, unwrapped
  dragging: false,
  lastAngle: 0,
  lastAt: 0,
  lastMoveT: 0,
  samples: [],
  hapticAcc: 0,
  raf: 0,
  want: false,     // whether the sound is meant to be running
};

function paintWheel() {
  if (!ticksEl) return;
  const angle = ((hand.spin % 360) + 360) % 360;
  ticksEl.style.transform = `rotate(${angle}deg)`;
  const atPointer = (DETENTS_PER_REV - revolutionSlot(angle)) % DETENTS_PER_REV;
  const ticks = ticksEl.children;
  for (let i = 0; i < ticks.length; i += 1) ticks[i].classList.toggle('on', i === atPointer);
}

function playPos() {
  const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
  if (!total) return 0;
  return Math.max(0, Math.min(total, hand.pos));
}

function rateText(rate) {
  if (!Number.isFinite(rate) || Math.abs(rate) < 0.002) return '0.00×';
  const sign = rate < 0 ? '−' : '';
  return `${sign}${Math.abs(rate).toFixed(2)}×`;
}

// The deck's wheelTransport(), ported: the reel's speed in °/s to the rate the takes are
// played at. Below HAND_MIN the wheel is holding the track still; above 1× the result is
// compressed towards TOP SPEED so a flick cannot run away.
function rateFor(vel) {
  const speed = vel / DEG_PER_SEC_AT_1X;
  const magnitude = Math.abs(speed);
  if (magnitude < HAND_MIN) return { playing: false, rate: 0, magnitude: 0 };
  const shaped =
    magnitude > 1
      ? 1 + (TOP_SPEED - 1) * Math.tanh((magnitude - 1) / (TOP_SPEED - 1))
      : magnitude;
  const shown = Math.min(TOP_SPEED, Math.max(HAND_MIN, shaped));
  return { playing: true, rate: speed < 0 ? -shown : shown, magnitude: shown };
}

// The transport runs every frame, hand or no hand: the speed is integrated into the
// angle and into the track, and the sound is that same speed — so the settle is heard.
function tick(now) {
  if (!open) {
    hand.raf = 0;
    return;
  }
  const dt = Math.min(0.05, Math.max(0.001, (now - hand.lastAt) / 1000));
  hand.lastAt = now;

  if (hand.dragging) {
    if (now - hand.lastMoveT > STILL_MS) hand.vel *= Math.exp(-HOLDING * dt);
  } else {
    const target = hand.want ? DECK_RATE * DEG_PER_SEC_AT_1X : 0;
    const k = Math.abs(target) > Math.abs(hand.vel) ? SPEEDING : SLOWING;
    hand.vel += (target - hand.vel) * (1 - Math.exp(-k * dt));
    if (Math.abs(target - hand.vel) < 1) hand.vel = target;
  }

  hand.spin += hand.vel * dt;
  paintWheel();

  const asked = hand.want || hand.dragging ? rateFor(hand.vel) : { playing: false, rate: 0 };
  hand.rate = asked.playing ? asked.rate : 0;
  const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;

  if (total) {
    if (!asked.playing) {
      if (!audio.paused) audio.pause();
      audio.currentTime = playPos();
    } else if (asked.rate > 0) {
      audio.preservesPitch = false;
      audio.playbackRate = Math.min(ELEMENT_MAX, Math.max(ELEMENT_MIN, asked.rate));
      if (audio.paused && hand.want) audio.play().catch(() => {});
      hand.pos = audio.currentTime;
    } else {
      if (!audio.paused) audio.pause();
      hand.pos = Math.max(0, Math.min(total, hand.pos + asked.rate * dt));
      audio.currentTime = hand.pos;
    }
    paintTime();
    rateEl.textContent = rateText(hand.rate);
  }
  hand.raf = requestAnimationFrame(tick);
}

const centreOf = () => {
  const box = dial.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

const angleOf = (point) => {
  const centre = centreOf();
  return (Math.atan2(point.y - centre.y, point.x - centre.x) * 180) / Math.PI;
};

const shortest = (delta) => {
  let value = delta;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
};

let press = null;
let tuning = null;

function tuneStart(event) {
  tuning = { pointerId: event.pointerId, lastAngle: angleOf({ x: event.clientX, y: event.clientY }), acc: 0 };
  try {
    dial.setPointerCapture(event.pointerId);
  } catch {
    /* capture is a convenience */
  }
}

function tuneTurn(event) {
  if (!tuning || event.pointerId !== tuning.pointerId) return false;
  const key = armed;
  if (!key) return false;
  const spec = REEL_STEPS[key];
  const angle = angleOf({ x: event.clientX, y: event.clientY });
  const delta = shortest(angle - tuning.lastAngle);
  tuning.lastAngle = angle;
  tuning.acc += delta;
  const steps = Math.trunc(tuning.acc / spec.per);
  if (!steps) return true;
  tuning.acc -= steps * spec.per;
  const decimals = key === 'settle' ? 0 : 2;
  const next = clampSetting(key, Number((reel[key] + steps * spec.fine).toFixed(decimals)));
  if (next !== reel[key]) {
    reel[key] = next;
    applyReel();
    hand.spin += delta;
    paintWheel();
    buzz(6);
  }
  return true;
}

function tuneEnd(event) {
  if (!tuning || (event && event.pointerId !== tuning.pointerId)) return false;
  try {
    dial.releasePointerCapture(tuning.pointerId);
  } catch {
    /* already released */
  }
  tuning = null;
  return true;
}

function grab(event) {
  if (!open) return false;
  const point = { x: event.clientX, y: event.clientY };
  const angle = angleOf(point);
  hand.dragging = true;
  hand.lastAngle = angle;
  hand.lastAt = performance.now();
  hand.lastMoveT = hand.lastAt;
  hand.samples = [{ t: hand.lastAt, spin: hand.spin }];
  hand.hapticAcc = 0;
  hand.pos = current ? audio.currentTime : 0;
  press = { pointerId: event.pointerId, x: point.x, y: point.y, at: Date.now(), moved: 0 };
  try {
    dial.setPointerCapture(event.pointerId);
  } catch {
    /* capture is a convenience, not a requirement */
  }
  if (!hand.raf) hand.raf = requestAnimationFrame(tick);
  return true;
}

function turn(event) {
  if (!hand.dragging || !press || event.pointerId !== press.pointerId) return false;
  const now = performance.now();
  const dt = Math.max(0.001, (now - hand.lastAt) / 1000);
  const angle = angleOf({ x: event.clientX, y: event.clientY });
  const delta = shortest(angle - hand.lastAngle);
  hand.lastAngle = angle;
  hand.lastMoveT = now;
  press.moved = Math.max(press.moved, Math.hypot(event.clientX - press.x, event.clientY - press.y));
  hand.spin += delta;

  hand.samples.push({ t: now, spin: hand.spin });
  while (hand.samples.length > 2 && now - hand.samples[0].t > WINDOW_MS) hand.samples.shift();
  const first = hand.samples[0];
  const seconds = Math.max(0.04, (now - first.t) / 1000);
  const measured = Math.max(-1440 * TOP_SPEED, Math.min(1440 * TOP_SPEED, (hand.spin - first.spin) / seconds));
  const step = SLEW * dt;
  hand.vel += Math.max(-step, Math.min(step, measured - hand.vel));

  hand.hapticAcc += Math.abs(delta);
  if (hand.hapticAcc >= HAPTIC_DEG) {
    hand.hapticAcc -= HAPTIC_DEG;
    buzz(10);
  }
  paintWheel();
  return true;
}

function release(event) {
  if (!hand.dragging || !press || (event && event.pointerId !== press.pointerId)) return false;
  const state = press;
  press = null;
  hand.dragging = false;
  hand.samples = [];
  hand.hapticAcc = 0;
  try {
    dial.releasePointerCapture(state.pointerId);
  } catch {
    /* already released */
  }
  const tap = state.moved <= TAP_SLOP_PX && Date.now() - state.at <= TAP_MS;
  if (tap) {
    if (!current) fileEl.click();
    else togglePlay();
  }
  paintPlay();
  paintTime();
  hintEl.textContent = HINT;
  return true;
}

/* ------------------------------------------------------------ opening the lens */

function setOpen(next) {
  open = next;
  lens.hidden = !next;
  if (next && !hand.raf) {
    hand.lastAt = performance.now();
    hand.lastMoveT = hand.lastAt;
    hand.raf = requestAnimationFrame(tick);
  }
  if (!next && hand.raf) {
    cancelAnimationFrame(hand.raf);
    hand.raf = 0;
  }
  if (next) {
    paintName();
    paintTracks();
    paintTime();
    paintPlay();
    paintReel();
    if (!tracks.length) hintEl.textContent = 'Load a track from this device to start.';
    if (optionEl) optionEl.textContent = current ? current.name.slice(0, 18) : 'music';
  } else {
    audio.pause();
    hand.want = false;
    hand.pos = audio.currentTime || 0;
    armed = '';
    setReelOpen(false);
    if (optionEl) optionEl.textContent = 'hold';
    if (countEl) countEl.textContent = 'to talk';
  }
}

// The slot press is the page's: a tap enters the app. This takes that tap for Music
// only, before ptt.js's own handler sees it, and lets the other three through.
slotsEl.addEventListener(
  'pointerdown',
  (event) => {
    const button = event.target && event.target.closest ? event.target.closest('.slot') : null;
    const slug = button && button.dataset ? button.dataset.slug : '';
    if (!slug) return;
    if (slug !== SLOT_SLUG) {
      if (open) setOpen(false);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    buzz(20);
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    fetch('/api/focus', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: SLOT_SLUG }),
    }).catch(() => {});
  },
  true
);

slotsEl.addEventListener(
  'pointerup',
  (event) => {
    const button = event.target && event.target.closest ? event.target.closest('.slot') : null;
    if (button && button.dataset && button.dataset.slug === SLOT_SLUG) {
      event.preventDefault();
      event.stopPropagation();
    }
  },
  true
);

const swallow = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

if (mainEl) {
  mainEl.addEventListener(
    'pointerdown',
    (event) => {
      if (!open || !dial.contains(event.target)) return;
      swallow(event);
      if (armed) tuneStart(event);
      else grab(event);
    },
    true
  );
  mainEl.addEventListener(
    'pointermove',
    (event) => {
      if (!open) return;
      if (armed) {
        if (!tuning) return;
        swallow(event);
        tuneTurn(event);
        return;
      }
      if (!hand.dragging) return;
      swallow(event);
      turn(event);
    },
    true
  );
  mainEl.addEventListener(
    'pointerup',
    (event) => {
      if (!open) return;
      if (armed) {
        swallow(event);
        tuneEnd(event);
        return;
      }
      if (!hand.dragging) return;
      swallow(event);
      release(event);
    },
    true
  );
  mainEl.addEventListener(
    'pointercancel',
    (event) => {
      if (!open) return;
      if (armed) {
        swallow(event);
        tuneEnd(event);
        return;
      }
      if (!hand.dragging) return;
      swallow(event);
      release(event);
    },
    true
  );
}

document.addEventListener('keydown', (event) => {
  if (!open) return;
  if (event.target && /^(INPUT|TEXTAREA|BUTTON)$/.test(event.target.tagName)) return;
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    togglePlay();
  }
});

/* -------------------------------------------------------------------- start up */

(async function boot() {
  const held = await allImports();
  tracks = held.map((entry) => ({
    id: String(entry.id),
    name: String(entry.id).replace(/^import:/, '').replace(/:\d+:\d+$/, '').replace(/\.[a-z0-9]+$/i, ''),
    blob: entry.blob,
    url: URL.createObjectURL(entry.blob),
    duration: 0,
  }));
  paintName();
  paintTracks();
})();
