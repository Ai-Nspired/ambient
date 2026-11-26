// A frequency you can talk on.
//
// Releasing the dial already sends the clip to the assistant through `/api/ptt`; this
// puts the same clip on the number this device is tuned to, and plays whatever is
// waiting on that number. `ptt.js` is not edited: the clip is taken from the request it
// already makes, so the recording path stays exactly one path.
//
// The number is not a way in on its own. A station is claimed by the first device on it
// and the claim is a hash of a key both devices know, so a stranger who reads the
// frequency off this strip still cannot post to it or listen. What arrives is kept for
// a week, so a device that was away comes back and hears what it missed.
//
// What arrives is also laid out, one row a clip, because a clip that starts while
// another is playing is two voices on top of each other. One clip landing alone still
// plays as it lands; several landing together wait in the tray where each can be
// started, saved to the device, or taken off the station, on its own. Saving is the
// default way to keep one: the station forgets after a week, the device does not.

const CHANNEL_KEY = 'trnv.channel';
const ON_KEY = 'trnv.channel.on';
const DEVICE_KEY = 'trnv.device.id';
const PHRASE_KEY = 'trnv.channel.key';
const HEARD_KEY = 'trnv.heard.';
const STEP = 0.5;
const STEP_DEG = 20;          // one turn of a sixth of the dial is one step
const MIN_HZ = 100;
const MAX_HZ = 999;
const POLL_MS = 1800;
const MAX_AUDIO_CHARS = 128 * 1024;
const MAX_TRAY = 40;          // what this device keeps in front of it
const KEY_MIN = 8;

const read = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* a locked-down browser still gets a working station, just not a remembered one */
  }
};

const device = (() => {
  const held = read(DEVICE_KEY, '');
  if (held) return held;
  const made = 'd-' + Math.random().toString(36).slice(2, 10);
  write(DEVICE_KEY, made);
  return made;
})();

let station = read(CHANNEL_KEY, '441.0');
let onAir = read(ON_KEY, 'on') !== 'off';
let phrase = read(PHRASE_KEY, '');
let key = '';             // derived from the phrase; never written down
let claimed = '';         // the station the Worker has accepted this key on
let blocked = false;      // a browser that will not play until it is touched
let busy = false;
let queue = Promise.resolve();

const cursorOf = (at) => {
  const held = Number(read(HEARD_KEY + at, '0'));
  return Number.isFinite(held) && held > 0 ? held : 0;
};

let heard = cursorOf(station);   // where this device got to on this station

const dial = document.getElementById('dial');
const lens = document.getElementById('music');

const stamp = (hz) => String(Number(hz).toFixed(1));

const lensOpen = () => Boolean(lens && !lens.hidden);

/* --------------------------------------------------------------------- the key */

const b64url = (bytes) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// The phrase is stretched, not used: a station key that is a word is a station anyone
// with a dictionary can sit on. The salt is fixed because both devices must land on the
// same key from the same words without talking to the Worker first.
async function derive() {
  const words = String(phrase || '').trim();
  if (words.length < KEY_MIN) {
    key = '';
    return '';
  }
  try {
    const encoder = new TextEncoder();
    const base = await crypto.subtle.importKey('raw', encoder.encode(words), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode('trnv-channel-v1'), iterations: 210000 },
      base,
      256
    );
    key = b64url(new Uint8Array(bits));
  } catch {
    key = '';
  }
  return key;
}

/* ------------------------------------------------------------------- the strip */

let strip = null;
let mark = null;
let power = null;
let keyBtn = null;
let noteEl = null;
let noteTimer = 0;
let tray = null;
let trayList = null;

function note(text, bad) {
  if (!noteEl) return;
  clearTimeout(noteTimer);
  noteEl.textContent = text || '';
  noteEl.classList.toggle('bad', Boolean(bad));
  if (!text) return;
  noteTimer = setTimeout(() => {
    noteEl.textContent = '';
    noteEl.classList.remove('bad');
  }, bad ? 5000 : 2200);
}

function paint() {
  if (!mark) return;
  mark.textContent = station;
  mark.setAttribute('aria-label', `Channel ${station}. Turn the wheel to tune.`);
  if (power) {
    power.setAttribute('aria-pressed', onAir ? 'true' : 'false');
    power.textContent = onAir ? 'on air' : 'off air';
  }
  if (keyBtn) {
    keyBtn.dataset.set = key ? 'yes' : 'no';
    keyBtn.setAttribute('aria-label', key ? 'Channel key is set. Change it.' : 'No channel key. Set one.');
  }
  if (strip) {
    strip.classList.toggle('live', onAir && Boolean(key));
    strip.setAttribute('aria-label', `Channel ${station}, ${onAir ? 'on' : 'off'} air${key ? '' : ', no key'}`);
  }
}

function build() {
  strip = document.createElement('div');
  strip.id = 'chan';
  strip.setAttribute('role', 'group');
  strip.innerHTML = `
    <span id="chanMark"></span>
    <button type="button" id="chanKey">key</button>
    <button type="button" id="chanOn" aria-pressed="true">on air</button>
    <span id="chanNote" role="status"></span>
    <div id="chanTray" role="list" aria-label="Clips on this frequency"><div id="chanClips"></div></div>
  `;
  const style = document.createElement('style');
  style.textContent = `
    #chan { display: grid; grid-template-columns: 1fr auto auto; align-items: center;
      gap: 6px; margin-top: 10px; width: 100% }
    #chan #chanMark { text-align: center; font-size: 15px; letter-spacing: .14em;
      color: var(--ink); font-variant-numeric: tabular-nums; transition: color .12s ease }
    #chan.live #chanMark { color: var(--lit) }
    #chan button { font: inherit; color: var(--dim); background: var(--panel);
      border: 1px solid var(--line); border-radius: 10px; padding: 6px 10px; cursor: pointer }
    #chan #chanKey, #chan #chanOn { font-size: 10px; letter-spacing: .14em; text-transform: uppercase }
    #chan #chanKey[data-set="yes"] { color: var(--ink) }
    #chan #chanOn[aria-pressed="true"] { color: var(--lit); border-color: var(--lit) }
    #chan #chanNote { grid-column: 1 / -1; font-size: 10px; letter-spacing: .1em;
      text-transform: uppercase; color: var(--dim); min-height: 0 }
    #chan #chanNote.bad { color: #f4511e }
    #chan #chanTray { grid-column: 1 / -1; display: none; max-height: 138px;
      overflow-y: auto; overscroll-behavior: contain; margin-top: 2px }
    #chan #chanTray.on { display: block }
    #chan #chanClips { display: grid; gap: 4px }
    #chan .seat { display: flex; align-items: stretch; gap: 4px }
    #chan .seat .say { flex: 1; min-width: 0; display: flex; align-items: center;
      gap: 9px; justify-content: flex-start; padding: 5px 9px; font-size: 11px;
      letter-spacing: .08em; font-variant-numeric: tabular-nums }
    #chan .seat .say .mark { font-size: 10px; color: var(--dim); width: 9px }
    #chan .seat .cut, #chan .seat .keep { padding: 5px 9px; line-height: 1; font-size: 12px; color: var(--dim) }
    #chan .seat.playing .say, #chan .seat.playing .say .mark { color: var(--lit); border-color: var(--lit) }
    #chan .seat .keep:hover, #chan .seat .keep:focus-visible { color: var(--lit); border-color: var(--lit) }
    #chan .seat .cut:hover, #chan .seat .cut:focus-visible { color: #f4511e; border-color: #f4511e }
    #chan .seat.cutting { opacity: .4 }
    /* The MSG slot lifts the tray out of the strip: same clips, more of them at once. */
    #chan.board #chanTray { max-height: 56vh }
  `;
  dial.insertAdjacentElement('afterend', strip);
  dial.insertAdjacentElement('afterend', style);

  mark = strip.querySelector('#chanMark');
  power = strip.querySelector('#chanOn');
  keyBtn = strip.querySelector('#chanKey');
  noteEl = strip.querySelector('#chanNote');
  tray = strip.querySelector('#chanTray');
  trayList = strip.querySelector('#chanClips');

  keyBtn.addEventListener('click', () => {
    const answer = window.prompt('Channel key — the same words on both devices.', phrase);
    if (answer === null) return;
    phrase = String(answer).trim();
    write(PHRASE_KEY, phrase);
    claimed = '';
    key = '';
    stopClip();
    inbox.length = 0;          // another key is another station, even on the same number
    paintTray();
    derive().then(() => {
      paint();
      if (!key) {
        note(phrase ? `a key needs ${KEY_MIN} characters` : 'no key, nothing is sent', true);
        return;
      }
      claim(true).then((ok) => {
        if (ok) note('key set');
      });
    });
  });

  power.addEventListener('click', () => {
    if (!onAir && !key) {
      note('set a key first', true);
      return;
    }
    onAir = !onAir;
    write(ON_KEY, onAir ? 'on' : 'off');
    paint();
    if (onAir) poll();
  });

  paint();
  paintTray();
}

/* --------------------------------------------------------------------- tuning */

function tune(delta) {
  const next = Math.min(MAX_HZ, Math.max(MIN_HZ, Number(station) + delta));
  const stamped = stamp(next);
  if (stamped === station) return;
  station = stamped;
  write(CHANNEL_KEY, station);
  heard = cursorOf(station);   // what was said here while this device was elsewhere
  claimed = '';
  stopClip();                  // a clip from the old number is not this number's
  inbox.length = 0;
  paintTray();
  paint();
  claim().then((ok) => {
    if (ok) poll();
  });
}

// The wheel tunes. A turn already means something to the page — it walks her options —
// so this is added beside that, not in place of it: nothing is swallowed, no gesture is
// taken from `ptt.js` or `music.js`. While the music lens is open the wheel is the
// track's, so the frequency is left alone until it closes.
let wheeling = false;
let wheelFrom = 0;
let wheelAcc = 0;

function angleAt(event) {
  if (!dial) return 0;
  const box = dial.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  return (Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI;
}

function tunable() {
  if (!dial || !onAir) return false;
  if (dial.classList.contains('listening')) return false;   // the wheel is the microphone
  if (lensOpen()) return false;                             // the wheel is the track
  return Boolean(key);
}

function wireWheel() {
  if (!dial) return;
  dial.addEventListener('pointerdown', (event) => {
    wheeling = true;
    wheelFrom = angleAt(event);
    wheelAcc = 0;
  });
  dial.addEventListener('pointermove', (event) => {
    if (!wheeling || !tunable()) return;
    const now = angleAt(event);
    let delta = now - wheelFrom;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    wheelFrom = now;
    wheelAcc += delta;
    while (Math.abs(wheelAcc) >= STEP_DEG) {
      const dir = wheelAcc > 0 ? 1 : -1;
      wheelAcc -= dir * STEP_DEG;
      tune(dir * STEP);
    }
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
    dial.addEventListener(type, () => {
      wheeling = false;
      wheelAcc = 0;
    });
  }
}

/* -------------------------------------------------------------------- sending */

const b64Of = (blob) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const at = text.indexOf(',');
      resolve(at >= 0 ? text.slice(at + 1) : '');
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });

const nativeFetch = window.fetch.bind(window);

async function claim(force) {
  if (!key) return false;
  if (!force && claimed === station) return true;
  try {
    const response = await nativeFetch('/api/channel', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-trnv-key': key },
      body: JSON.stringify({ channel: station, claim: true }),
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data && data.ok) {
      claimed = station;
      return true;
    }
    claimed = '';
    if (response.status === 403) note('another key holds this frequency', true);
    else note('the frequency did not answer', true);
    return false;
  } catch {
    claimed = '';
    return false;
  }
}

async function transmit(blob) {
  if (!onAir || !blob || !blob.size) return;
  if (!key) {
    note('set a key to be heard', true);
    return;
  }
  const audio = await b64Of(blob);
  if (!audio) return;
  if (audio.length > MAX_AUDIO_CHARS) {
    note('clip too long for the frequency', true);
    return;
  }
  if (!(await claim())) return;
  try {
    const response = await nativeFetch('/api/channel', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-trnv-key': key },
      body: JSON.stringify({ channel: station, sender: device, mime: blob.type || 'audio/webm', audio }),
    });
    if (!response.ok) {
      if (response.status === 429) note('slow down', true);
      else if (response.status === 413) note('clip too long for the frequency', true);
      else note('not sent', true);
      return;
    }
    note('sent');
    if (mark) mark.dataset.sent = String(Date.now());
  } catch {
    note('not sent', true);
  }
}

// ptt.js makes exactly one request with the clip in it. Taking the clip there keeps the
// recorder, the release and the offset in one place instead of two.
window.fetch = function (input, init) {
  try {
    const url = typeof input === 'string' ? input : input && input.url;
    const method = String((init && init.method) || '').toUpperCase();
    if (onAir && url && String(url).endsWith('/api/ptt') && method === 'POST' && init && init.body instanceof FormData) {
      const blob = init.body.get('audio');
      if (blob && blob.size) transmit(blob);
    }
  } catch {
    /* a request this wrapper cannot read is still a request */
  }
  return nativeFetch(input, init);
};

/* ----------------------------------------------------------------- receiving */

const bytesOf = (audio) => {
  const binary = atob(audio);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const inbox = [];          // what is waiting in front of this device, oldest first
let speaker = null;        // one element, so two clips are never heard at once
let playingId = '';
let lastUrl = '';

const clipKey = (clip) => String((clip && (clip.id || clip.at)) || '');

const clockOf = (at) => {
  const when = new Date(Number(at) || Date.now());
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(when.getHours())}:${pad(when.getMinutes())}:${pad(when.getSeconds())}`;
};

// A clip on the station is a clip on a lease. Saved to the device it is his, whatever
// the station does next week, so the tray offers the file as well as the delete.
const CLIP_KINDS = [['wav', 'wav'], ['mpeg', 'mp3'], ['mp3', 'mp3'], ['ogg', 'ogg'], ['mp4', 'm4a'], ['aac', 'aac']];

function saveClip(clip, button) {
  if (!clip || !clip.audio) return;
  const mime = String(clip.mime || 'audio/webm');
  const known = CLIP_KINDS.find(([needle]) => mime.includes(needle));
  const url = URL.createObjectURL(new Blob([bytesOf(clip.audio)], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `trnv-${station}-${clockOf(clip.at).replace(/:/g, '')}.${known ? known[1] : 'webm'}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 20000);
  if (button) button.classList.add('kept');
  note('saved to this device');
}

let armedForSound = false;

function askForSound() {
  if (armedForSound) return;
  armedForSound = true;
  document.addEventListener(
    'pointerdown',
    () => {
      armedForSound = false;
      blocked = false;
      poll();
    },
    { once: true, capture: true }
  );
}

// One row a clip: start it, or take it off the station. Rebuilt whole, because a tray
// is a handful of rows and the order is what matters, not the identity of a node.
function paintTray() {
  if (!tray || !trayList) return;
  trayList.textContent = '';
  for (const clip of inbox) {
    const row = document.createElement('div');
    row.className = 'seat' + (clipKey(clip) === playingId ? ' playing' : '');

    const say = document.createElement('button');
    say.type = 'button';
    say.className = 'say';
    say.setAttribute('aria-label', `Play the clip from ${clockOf(clip.at)}`);
    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.textContent = clipKey(clip) === playingId ? '❚❚' : clip.played ? '·' : '▸';
    const when = document.createElement('span');
    when.className = 'when';
    when.textContent = clockOf(clip.at);
    say.append(mark, when);
    say.addEventListener('click', () => {
      playClip(clip);
    });

    const keep = document.createElement('button');
    keep.type = 'button';
    keep.className = 'keep';
    keep.textContent = '↓';
    keep.setAttribute('aria-label', `Save the clip from ${clockOf(clip.at)} to this device`);
    keep.addEventListener('click', () => saveClip(clip, keep));

    const cut = document.createElement('button');
    cut.type = 'button';
    cut.className = 'cut';
    cut.textContent = '×';
    cut.setAttribute('aria-label', `Delete the clip from ${clockOf(clip.at)}`);
    cut.addEventListener('click', () => cutClip(clip, row));

    row.append(say, keep, cut);
    trayList.append(row);
  }
  tray.classList.toggle('on', inbox.length > 0);
}

function stopClip() {
  if (speaker) speaker.pause();
  if (playingId) {
    playingId = '';
    paintTray();
  }
}

function playClip(clip) {
  if (!clip || !clip.audio) return Promise.resolve(false);
  if (!speaker) {
    speaker = new Audio();
    speaker.addEventListener('ended', () => {
      const done = inbox.find((held) => clipKey(held) === playingId);
      if (done) done.played = true;
      stopClip();
    });
  }
  stopClip();
  playingId = clipKey(clip);
  clip.played = true;
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(new Blob([bytesOf(clip.audio)], { type: clip.mime || 'audio/webm' }));
  speaker.src = lastUrl;
  paintTray();
  return speaker
    .play()
    .then(() => {
      blocked = false;
      return true;
    })
    .catch(() => {
      // A browser that has not been touched will not speak. The row stays where it is,
      // so the clip is one tap away rather than counted as heard.
      stopClip();
      return false;
    });
}

async function cutClip(clip, row) {
  const held = clipKey(clip);
  if (!held) return;
  if (row) row.classList.add('cutting');
  if (playingId === held) stopClip();
  try {
    const response = await nativeFetch(
      `/api/channel?channel=${encodeURIComponent(station)}` +
        `&id=${encodeURIComponent(clip.id || '')}&at=${encodeURIComponent(clip.at || '')}`,
      { method: 'DELETE', headers: { 'x-trnv-key': key }, cache: 'no-store' }
    );
    if (!response.ok) {
      if (row) row.classList.remove('cutting');
      note(response.status === 403 ? 'another key holds this frequency' : 'not deleted', true);
      return;
    }
    const at = inbox.indexOf(clip);
    if (at >= 0) inbox.splice(at, 1);
    paintTray();
    note('deleted');
  } catch {
    if (row) row.classList.remove('cutting');
    note('not deleted', true);
  }
}

function advance(at) {
  const atMs = Number(at);
  if (!Number.isFinite(atMs) || atMs <= heard) return;
  heard = atMs;
  write(HEARD_KEY + station, String(heard));
}

async function poll() {
  if (!onAir || blocked || busy || !key) return;
  busy = true;
  try {
    if (!(await claim())) return;
    const response = await nativeFetch(
      `/api/channel?channel=${encodeURIComponent(station)}&since=${heard}`,
      { headers: { 'x-trnv-key': key }, cache: 'no-store' }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || !data.ok) {
      if (response.status === 403) note('another key holds this frequency', true);
      return;
    }
    const clips = Array.isArray(data.clips) ? data.clips : [];
    const fresh = [];
    for (const clip of clips) {
      if (!clip || !clip.at) continue;
      advance(clip.at);
      if (clip.sender === device) continue;      // this device already knows what it said
      if (inbox.some((held) => clipKey(held) === clipKey(clip))) continue;
      fresh.push({ id: clip.id || '', at: clip.at, mime: clip.mime, audio: clip.audio, played: false });
    }
    if (fresh.length) {
      inbox.push(...fresh);
      while (inbox.length > MAX_TRAY) inbox.shift();
      paintTray();
      note(fresh.length > 1 ? `${fresh.length} waiting` : 'received');
      // One clip landing alone plays as it lands. Several at once are laid out instead:
      // four clips started together are four voices on top of each other, and the tray
      // is how they get heard one at a time.
      if (fresh.length === 1 && !playingId) {
        const started = await playClip(fresh[0]);
        if (!started) {
          blocked = true;
          askForSound();
        }
      }
    }
  } catch {
    /* off the air is not an error */
  } finally {
    busy = false;
  }
}

/* --------------------------------------------------------------------- start up */

if (dial) {
  build();
  wireWheel();
  derive().then(() => {
    paint();
    if (!key) note('set a key to hear this frequency', true);
    else claim();
  });
  setInterval(poll, POLL_MS);
}
