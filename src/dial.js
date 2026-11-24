// The communicator: a text box and a send button at the bottom, the screen full of
// mini cards you drag, resize, stack and throw, and haptic jog wheels you pick up.
//
// send hands off: while a jog is up the send button is gone, not duplicated.
// a jog has a mode, and mode is a color. hold its chip to walk the colors.
// the AMBIENT mark holds a second jog; two jogs of the same color are paired.
// drop a jog on a card and the card becomes a window the jog drives: close, edit, diff.
export default String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#05070a">
<title>ambient</title>
<style>
:root{--bg:#05070a;--line:#1b2230;--hair:#161d28;--dim:#59616f;--text:#aeb7c6;--bright:#dbe3ef;--lit:#4a9eff;--accent:#4a9eff;--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
*{box-sizing:border-box}
html,body{height:100%;margin:0;overflow:hidden}
body{height:100dvh;background:var(--bg);color:var(--text);font:14px/1.45 var(--mono);display:flex;flex-direction:column;overscroll-behavior:none;-webkit-tap-highlight-color:transparent}
header{display:flex;align-items:center;gap:6px;padding:7px 11px 5px}
.brand{background:none;border:0;padding:4px 2px;font:10px/1 var(--mono);letter-spacing:.26em;color:var(--text);cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;transition:color .15s}
.brand.held{color:#4a9eff}
.switches{margin-left:auto;display:flex;gap:5px}
.switch{background:#0b0f15;border:1px solid var(--line);color:#8a93a3;border-radius:8px;padding:6px 8px;font:9px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;cursor:pointer;touch-action:none}
.switch[aria-pressed="true"]{color:var(--bright);border-color:#2b3a52}
.switch.held{border-color:#4a9eff;color:#4a9eff}
#sheetBody .models{display:flex;flex-direction:column;gap:6px}
#sheetBody .models h5{margin:10px 0 2px;font:9px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
#sheetBody .models button{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#0b0f15;border:1px solid var(--line);color:var(--text);border-radius:8px;padding:10px;font:11px/1.35 var(--mono);text-align:left}
#sheetBody .models button.on{border-color:var(--accent);color:var(--accent)}
#sheetBody .models button i{flex:none;font-style:normal;font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}
#sheetBody .models button div{min-width:0;overflow:hidden}
#sheetBody .models button em{display:block;font-style:normal;font-size:8.5px;color:var(--dim);letter-spacing:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#sheetBody .models button span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#sheetBody .orq{width:100%;margin:4px 0 6px;background:#03060a;border:1px solid var(--line);border-radius:9px;color:var(--text);padding:11px;font:12px/1.3 var(--mono);-webkit-appearance:none}
#sheetBody .orq:focus{outline:none;border-color:#2b3a52}

/* the screen: a canvas of cards */
#canvas{position:relative;flex:1;min-height:0;overflow:hidden;background-image:radial-gradient(#0d131c 1px,transparent 1px);background-size:18px 18px;border-top:1px solid var(--hair)}
#canvas.idle::after{content:'hold send for the dial';position:absolute;left:0;right:0;bottom:14px;text-align:center;font:9px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:#26303d}
.card{position:absolute;display:flex;flex-direction:column;background:linear-gradient(#0c1119,#070b11);border:1px solid var(--line);border-radius:12px;overflow:hidden;box-shadow:0 12px 26px -20px #000;touch-action:none}
.card.on{border-color:var(--lit);box-shadow:0 0 0 1px rgba(74,158,255,.35) inset,0 12px 26px -20px #000}
.card.win{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset,0 12px 26px -20px #000}
.card .bar{display:flex;align-items:baseline;gap:6px;padding:6px 9px;border-bottom:1px solid var(--hair);font:8px/1.2 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--dim);cursor:grab;flex:none}
.card .name{color:var(--text);letter-spacing:0;text-transform:none;font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.card .body{flex:1;min-height:0;overflow:auto;padding:8px 9px;font:11px/1.4 var(--mono);color:var(--text);white-space:pre-wrap;word-break:break-word}
.card .body iframe{display:block;width:100%;height:100%;border:0;border-radius:6px;background:#fff}
.card .body.dim{color:var(--dim)}
.card .body::-webkit-scrollbar{width:4px;height:4px}
.card .body::-webkit-scrollbar-thumb{background:#243043;border-radius:2px}
.card .body::-webkit-scrollbar-track{background:transparent}
.card .body pre.src{margin:0;font:10px/1.45 var(--mono);white-space:pre-wrap;word-break:break-word;outline:none;color:var(--bright);min-height:100%}
.card .grip{position:absolute;right:0;bottom:0;width:18px;height:18px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 48%,#243043 48%)}
.card.win .grip{bottom:46px}
.card .chin.two{padding-right:96px}
.card .chin{display:flex;align-items:center;gap:4px;flex:none;height:48px;padding:4px 52px 4px 6px;border-top:1px solid var(--hair);background:#070c13}
.card .chin .row{display:flex;align-items:center;gap:4px;flex:1;min-width:0}
.card .chin .ops{display:none;align-items:center;gap:4px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}
.card .chin .ops::-webkit-scrollbar{display:none}
.card .chin.open .row{display:none}
.card .chin.open .ops{display:flex}
.card .chin button[data-w="grow"],.card .chin button[data-w="back"]{color:#4a9eff;border-color:#22384f}
.card .chin button{background:#0b0f15;border:1px solid var(--line);color:#8a93a3;border-radius:7px;padding:5px 7px;font:8px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase}
.card .chin button[aria-pressed="true"]{color:var(--accent);border-color:var(--accent)}
.card .dline{padding:1px 0;font:10px/1.35 var(--mono);white-space:pre-wrap;word-break:break-word}
.card .dline.add{color:#43d39e}
.card .dline.del{color:#f2696b;text-decoration:line-through}
.card .dline.skip{color:var(--dim);font-style:italic;text-decoration:none}

/* jog wheels */
.jog{position:absolute;left:0;top:0;width:112px;height:112px;border-radius:50%;background:radial-gradient(circle at 50% 38%,#0d131c 0 55%,#06090e 56% 100%);border:1px solid var(--line);box-shadow:0 18px 36px -20px #000,inset 0 1px 0 rgba(255,255,255,.05);display:none;touch-action:none;user-select:none;-webkit-user-select:none;z-index:900}
.jog.open{display:block}
.jog.joined{border-color:transparent;box-shadow:none;background:#080d14}
.jog.joined .mk{border-radius:0}
.jog.joined .core{border-color:transparent;background:transparent}
.jog.joined.half .core{visibility:hidden}
#pairbody{position:absolute;border:1px solid var(--accent);border-radius:999px;background:#080d14;box-shadow:0 0 0 1px var(--accent) inset,0 0 26px -6px var(--accent);pointer-events:none;display:none;z-index:898}
#pairbody.on{display:block;animation:latch .55s ease-out}
#pairbody.bottom{border-radius:16px}
.card.ends{box-shadow:0 0 0 1px var(--accent) inset,0 0 30px -12px var(--accent)}
@keyframes latch{0%{box-shadow:0 0 0 1px var(--accent) inset,0 0 0 0 var(--accent)}55%{box-shadow:0 0 0 1px var(--accent) inset,0 0 34px 8px var(--accent)}100%{box-shadow:0 0 0 1px var(--accent) inset,0 0 26px -6px var(--accent)}}
.jog.joined .lock{border-color:var(--accent)}
.jog.joined .lock i{background:var(--accent);box-shadow:0 0 10px var(--accent)}
#pairmenu{position:absolute;z-index:901;display:none;flex-direction:column;gap:6px;padding:8px;background:#070c13;border:1px solid var(--accent);border-radius:12px;box-shadow:0 18px 36px -22px #000}
#pairmenu.on{display:flex}
#pairpeek{position:absolute;right:10px;bottom:10px;z-index:902;display:none;width:34px;height:34px;border-radius:50%;border:1px solid var(--accent);background:#080d14;color:var(--accent);font:10px/1 var(--mono);align-items:center;justify-content:center;cursor:pointer;box-shadow:0 0 18px -8px var(--accent)}
#pairpeek.on{display:flex}
#canvas.hidepair .jog,#canvas.hidepair #pairbody,#canvas.hidepair #pairmenu{display:none!important}
#pairmenu .ph{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font:8px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
#pairmenu .ph b{font-weight:400;color:var(--accent)}
#pairmenu .ph.grab{cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
#pairmenu .ph.grab.held{cursor:grabbing;color:var(--accent)}
#pairmenu .row{display:flex;align-items:center;gap:7px;min-width:0;background:#0b0f15;border:1px solid var(--line);color:var(--text);border-radius:8px;padding:8px;font:10px/1.2 var(--mono);text-align:left}
#pairmenu .row.on{border-color:var(--accent);color:var(--accent)}
#pairmenu .row i{flex:none;font-style:normal;font-size:8px;color:var(--dim)}
#pairmenu .row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#pairmenu .pm-modes{display:flex;gap:5px}
#pairmenu .pm-modes .row{flex:1;justify-content:center;padding:7px 3px;font-size:8px;letter-spacing:.1em;text-transform:uppercase}
#pairmenu .say{display:flex;gap:6px}
#pairmenu .say input{flex:1;min-width:0;background:#03060a;border:1px solid var(--line);border-radius:8px;color:var(--text);padding:9px;font:11px/1.2 var(--mono);-webkit-appearance:none}
#pairmenu .say input:focus{outline:none;border-color:#2b3a52}
#pairmenu .say button{flex:none;background:var(--accent);border:0;color:#04121f;border-radius:8px;padding:0 11px;font:9px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase}
.jog.glow{animation:invite 1.7s ease-in-out infinite}
@keyframes invite{0%,100%{box-shadow:0 0 0 1px var(--accent) inset,0 0 8px -4px var(--accent)}50%{box-shadow:0 0 0 1px var(--accent) inset,0 0 30px -2px var(--accent)}}
#coach{position:absolute;left:12px;right:12px;top:10px;max-width:340px;margin:0 auto;padding:10px 12px;border:1px solid #4a9eff;border-radius:10px;background:rgba(7,12,19,.94);color:var(--bright);font:11px/1.5 var(--mono);text-align:center;z-index:950;display:none;pointer-events:none}
#coach.on{display:block}
.jog .mk{position:absolute;inset:0;border-radius:50%;overflow:hidden;touch-action:none;cursor:grab}
.jog .m{position:absolute;inset:0;pointer-events:none}
.jog .m i{position:absolute;left:50%;top:3px;width:1.5px;height:5px;margin-left:-.75px;background:#1e2734;display:block;border-radius:1px}
.jog .m.on i{background:var(--accent);height:9px;top:1px}
.jog .core{position:absolute;inset:16px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;background:linear-gradient(#0a0f16,#06090e);border:1px solid var(--hair);text-align:center;padding:4px;touch-action:none;cursor:pointer}
.jog .lbl{font:9px/1.15 var(--mono);color:var(--bright);max-width:100%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.jog .sub{font:6.5px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
.jog .lock{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:22px;height:22px;border:1px solid var(--line);border-radius:50%;background:#0b0f15;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:5;touch-action:none}
.jog .lock i{position:relative;display:block;width:8px;height:8px;border-radius:50%;background:#5a6a80}
.jog .lock i::after{content:'';position:absolute;left:50%;top:-6px;width:1px;height:4px;margin-left:-.5px;background:inherit;border-radius:1px}
.jog.locked .lock{border-color:var(--accent)}
.jog.locked .lock i{background:var(--accent);box-shadow:0 0 8px var(--accent)}
.jog.locked .mk{cursor:default}
.jog .modes{position:absolute;inset:0;display:none;z-index:6}
.jog.menu .modes{display:block}
.jog.dragmode .mk .m{opacity:0}
.jog .pad{position:absolute;width:50px;height:50px;border-radius:50%;border:1px solid var(--line);background:#0b0f15;color:#8a93a3;font:7px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;display:flex;align-items:center;justify-content:center;cursor:pointer;touch-action:none}
.jog.menu .pad{border-color:var(--accent);color:var(--bright)}
.jog .pad.on{background:var(--accent);border-color:var(--accent);color:#04121f}
.jog .pad-up{left:50%;top:-58px;margin-left:-25px}
.jog .pad-down{left:50%;bottom:-58px;margin-left:-25px}
.jog .pad-left{top:50%;left:-58px;margin-top:-25px}
.jog .pad-right{top:50%;right:-58px;margin-top:-25px}
.jog.mounted{width:40px;height:40px;box-shadow:0 6px 14px -8px #000}
.jog.mounted .mk{opacity:.9}
.jog.mounted .m i{top:1px;height:3px}
.jog.mounted .m.on i{height:5px;top:-1px}
.jog.mounted .core{inset:5px;padding:0}
.jog.mounted .lbl{display:none}
.jog.mounted .sub{font:5.5px/1 var(--mono);color:var(--accent)}

#composer{display:flex;gap:7px;padding:9px 11px calc(9px + env(safe-area-inset-bottom));border-top:1px solid var(--hair);background:#05070a;z-index:70}
#text{flex:1;min-width:0;background:#03060a;border:1px solid var(--line);border-radius:9px;color:var(--text);padding:12px;font:12px/1.35 var(--mono)}
#text:focus{outline:none;border-color:#2b3a52}
#send{width:58px;background:var(--lit);border:1px solid var(--lit);color:#04121f;border-radius:9px;font:10px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;font-weight:700;touch-action:none;overflow:hidden;transition:width .18s,opacity .18s,padding .18s,margin .18s,border-width .18s}
#send.held{background:#2b6ea8}
#composer.handoff{display:none}
#status{display:flex;gap:8px;font:9px/1.3 var(--mono);color:var(--dim);padding:0 11px 7px;white-space:nowrap;overflow:hidden}
#state{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;color:#7d8a9c}
#meter{flex:none;color:#43505f}

#sheet{position:fixed;inset:0;background:#04060a;display:none;flex-direction:column;z-index:90}
#sheet.open{display:flex}
#sheetBar{display:flex;align-items:center;gap:8px;padding:9px 11px;border-bottom:1px solid var(--line)}
#sheetTitle{font:9px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
#sheetClose{margin-left:auto;background:#0b0f15;border:1px solid var(--line);color:var(--text);border-radius:8px;padding:6px 10px;font:10px/1 var(--mono)}
#sheetBody{flex:1;min-height:0;overflow:auto;padding:10px}
#sheetBody iframe{display:block;width:100%;height:100%;min-height:320px;border:1px solid var(--line);border-radius:10px;background:#fff}
#sheetBody pre{margin:0;white-space:pre-wrap;word-break:break-word;font:11px/1.5 var(--mono);color:var(--bright)}
</style>
</head>
<body>
<header>
  <button class="brand" id="mark" type="button" aria-label="ambient. hold a second for a second jog.">AMBIENT</button>
  <div class="switches">
    <button class="switch" id="voice" type="button" aria-pressed="true">voice</button>
    <button class="switch" id="feel" type="button" aria-pressed="true">haptics</button>
    <button class="switch" id="cards" type="button">cards</button>
    <button class="switch" id="modelPick" type="button" aria-pressed="false">model</button>
  </div>
</header>
<div id="canvas" class="idle">
  <div id="coach"></div>
</div>
<div id="composer">
  <input id="text" type="text" placeholder="Type, say, or attach something" autocomplete="off" autocapitalize="off">
  <button id="send" type="button">send</button>
</div>
<div id="status"><span id="state">idle</span><span id="meter"></span></div>
<div id="sheet">
  <div id="sheetBar"><span id="sheetTitle">display</span><button id="sheetClose" type="button">close</button></div>
  <div id="sheetBody"></div>
</div>
<script>
(function () {
  var canvas = document.getElementById('canvas');
  var markBtn = document.getElementById('mark');
  var textEl = document.getElementById('text');
  var sendBtn = document.getElementById('send');
  var composer = document.getElementById('composer');
  var stateEl = document.getElementById('state');
  var meterEl = document.getElementById('meter');
  var voiceBtn = document.getElementById('voice');
  var feelBtn = document.getElementById('feel');
  var sheet = document.getElementById('sheet');
  var sheetTitle = document.getElementById('sheetTitle');
  var sheetBody = document.getElementById('sheetBody');
  var sheetClose = document.getElementById('sheetClose');
  var cardsBtn = document.getElementById('cards');
  var modelBtn = document.getElementById('modelPick');

  // The dial's key for the routes that spend the browser and the sandbox. It
  // arrives once in the address and is kept here, never in the page's source.
  try {
    var arriving = new URLSearchParams(location.search).get('k');
    if (arriving) {
      localStorage.setItem('amb.dial', arriving);
      history.replaceState(null, '', location.pathname);
    }
  } catch (err) {}

  function dialKey() {
    try { return localStorage.getItem('amb.dial') || ''; } catch (err) { return ''; }
  }

  var DETENTS = 16;
  var STEP = 360 / DETENTS;
  var PATTERNS = {
    tick: [12],
    detent: [18],
    grab: [20],
    take: [28, 40, 28],
    park: [28, 20],
    pair: [16, 16, 40],
    listen: [14, 60, 14],
    ready: [45, 30, 45],
    sent: [22, 30, 22],
    caught: [14, 60, 22],
    near: [40, 70, 40],
    ask: [16, 34, 16, 34, 16],
    yes: [70],
    no: [44, 62, 44],
    error: [60, 40, 60, 40, 60]
  };
  // a mode is a color and a thing the dial is for
var DRAG_ACCENT = "#9fb0c8";
  var MODES = [
    { id: 'ask', accent: '#4a9eff' },
    { id: 'see', accent: '#f2b23e' },
    { id: 'shape', accent: '#43d39e' },
    { id: 'diff', accent: '#b48cf2' }
  ];

  var voice = true;
  var feel = true;
  var pulses = 0;
  var cards = [];
  var cursor = -1;
  var zTop = 10;
  var thread = [];
  var busy = false;
  var lastText = '';
  var jogs = [];
  var jogA = null;
  var jogB = null;
  var lastTouched = null;
  var coachEl = document.getElementById("coach");
  var coachStep = -1;
  var taught = false;
  var pairOn = false;
  // The deck he called up last, so the next call does not ask again. Until he
  // names one, the deck is the one already his — today's, from his phone.
  var DEFAULT_DECK = 'dmwrt5lkcnayry';
  function deckId() { try { return localStorage.getItem('amb.deck') || ''; } catch (err) { return ''; } }
  function setDeck(id) { try { localStorage.setItem('amb.deck', id); } catch (err) {} }

  function beep(ms) {
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      if (!beep.ctx) beep.ctx = new C();
      var t = beep.ctx.currentTime;
      var o = beep.ctx.createOscillator();
      var g = beep.ctx.createGain();
      o.frequency.value = ms > 100 ? 320 : 620;
      g.gain.value = 0.035;
      o.connect(g); g.connect(beep.ctx.destination);
      o.start(t); o.stop(t + 0.03);
    } catch (err) {}
  }

  // every pulse has a name, so a pattern can come to mean something
  function pattern(name, quiet) {
    var seq = PATTERNS[name] || PATTERNS.tick;
    pulses += 1;
    try {
      if (feel && typeof navigator.vibrate === 'function') navigator.vibrate(seq);
    } catch (err) {}
    if (!quiet) beep(seq.length > 1 ? 120 : 60);
  }

  function setState(text) { stateEl.textContent = text; }

  function say(text) {
    if (!voice || !text || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      var said = new SpeechSynthesisUtterance(String(text).slice(0, 180));
      said.rate = 1.05;
      speechSynthesis.speak(said);
    } catch (err) {}
  }

  // ---- pulses as a channel ------------------------------------------------

  // A question is felt before it is read: the wheel pulses once per way to
  // answer, and that many taps is the answer. One for the first, two for the
  // second — with two options, one for yes and two for no.
  var pendingAsk = null;

  function pulseAsk(q, options) {
    var list = options && options.length ? options : ['yes', 'no'];
    var q0 = { q: q || 'is this okay?', options: list };
    pendingAsk = q0;
    coachStep = -1;
    coachEl.textContent = q0.q + '  ·  ' + list.map(function (o, k) { return (k + 1) + ' ' + o; }).join('  ·  ');
    coachEl.classList.add('on');
    pattern('ask');
    for (var k = 0; k < list.length; k += 1) {
      setTimeout(function () { if (pendingAsk === q0) pattern('tick', true); }, 640 + k * 200);
    }
    setState('pulse · ' + list.length + ' answers');
    say(q0.q);
    setTimeout(function () {
      if (pendingAsk !== q0) return;
      pendingAsk = null;
      coachEl.classList.remove('on');
      setState('pulse · no answer');
    }, 12000);
  }

  // Taps on either dial answer it; with nothing pending they do what they did.
  function tapAnswer(j) {
    if (!pendingAsk) { activate(cursor); return; }
    var now = Date.now();
    if (!j.taps || now - j.taps.at > 520) j.taps = { n: 0, at: now, t: 0 };
    j.taps.n += 1;
    j.taps.at = now;
    pattern('tick');
    setState('pulse · ' + j.taps.n);
    clearTimeout(j.taps.t);
    var mine = j.taps;
    mine.t = setTimeout(function () { pulseAnswer(mine.n); }, 540);
  }

  function pulseAnswer(n) {
    if (!pendingAsk) return;
    var q0 = pendingAsk;
    pendingAsk = null;
    var k = Math.max(1, Math.min(n, q0.options.length));
    var word = String(q0.options[k - 1]);
    coachEl.textContent = q0.q + '  ·  ' + word;
    coachEl.classList.add('on');
    pattern(k === 1 ? 'yes' : 'no');
    say(word);
    setState('pulse answer · ' + word);
    remember('answer', q0.q + ' = ' + word);
    ask(word);
  }

  function looksLikeDocument(t) {
    var fence = String.fromCharCode(96, 96, 96);
    var prose = String(t == null ? '' : t).split(fence).filter(function (x, k) { return k % 2 === 0; }).join('');
    return /<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]|<style[\s>]/i.test(prose);
  }

  function documentSrcdoc(html) {
    var text = String(html == null ? '' : html);
    var css = (text.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join(' ');
    var base = '<style>' + (/background(-color)?\s*:/i.test(css) ? '' : 'html{background:#fff}') +
      (/(^|[;{\s])color\s*:/i.test(css) ? '' : 'html,body{color:#111}') + 'body{margin:0}</style>';
    var head = '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' + base;
    if (/<head[^>]*>/i.test(text)) return text.replace(/<head[^>]*>/i, function (tag) { return tag + head; });
    if (/<html[^>]*>/i.test(text)) return text.replace(/<html[^>]*>/i, function (tag) { return tag + '<head>' + head + '</head>'; });
    return '<!DOCTYPE html><html><head>' + head + '</head><body>' + text + '</body></html>';
  }

  function openSheet(text, title) {
    sheetBody.textContent = '';
    sheetTitle.textContent = title || 'display';
    if (looksLikeDocument(text)) {
      var frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-scripts allow-modals allow-popups allow-forms');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.srcdoc = documentSrcdoc(text);
      sheetBody.appendChild(frame);
    } else {
      var pre = document.createElement('pre');
      pre.textContent = String(text || '');
      sheetBody.appendChild(pre);
    }
    sheet.classList.add('open');
  }

  function closeSheet() {
    sheet.classList.remove('open');
    sheetBody.textContent = '';
  }

  // ---- the model ----------------------------------------------------------

  // Which model writes. The list is the store's own: its Workers AI models, its
  // proxy presets and its OpenRouter ids. The pick lives on the Worker, so the
  // answer and the card ops both read the same one instead of this page and that
  // one disagreeing about who is speaking.
  var modelGroups = null;
  var chosenModel = null;

  function paintModel() {
    var label = chosenModel ? String(chosenModel.label || chosenModel.id) : 'store default';
    modelBtn.setAttribute('aria-pressed', String(!!chosenModel));
    modelBtn.title = 'model: ' + label;
  }

  function isChosen(route, id) {
    return !!(chosenModel && chosenModel.id === id && chosenModel.route === route);
  }

  function note(text) {
    var line = document.createElement('div');
    line.className = 'dline skip';
    line.textContent = text;
    return line;
  }

  // One row per model, returned rather than drawn: only the caller knows where
  // it goes, and a row nobody appends cannot break the sheet.
  function modelRow(route, id, label, on) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-mpick', route + '|' + id);
    if (on) b.classList.add('on');
    var name = document.createElement('span');
    name.textContent = label || id;
    // An OpenRouter name is not its id, and the id is what gets called. Both are
    // on the row so a pick is made on what will actually run.
    if (route === 'openrouter' && id && (label || '') !== id) {
      var wrap = document.createElement('div');
      var sub = document.createElement('em');
      sub.textContent = id;
      wrap.appendChild(name);
      wrap.appendChild(sub);
      b.appendChild(wrap);
    } else {
      b.appendChild(name);
    }
    var tag = document.createElement('i');
    tag.textContent = route || 'default';
    b.appendChild(tag);
    return b;
  }

  // The long list is searched, not scrolled: one field over everything the
  // account can reach through that route, forty at a time.
  function modelSearch(box, kind) {
    var input = document.createElement('input');
    input.type = 'search';
    input.className = 'orq';
    input.setAttribute('placeholder', 'search ' + kind + ' models');
    input.setAttribute('autocomplete', 'off');
    var list = document.createElement('div');
    list.className = 'models';
    list.appendChild(note('reading the list…'));
    box.appendChild(input);
    box.appendChild(list);
    var timer = null;
    function run() {
      var q = input.value.trim();
      fetch('/api/models/' + kind + '?q=' + encodeURIComponent(q) + '&limit=40')
        .then(function (r) { return r.json().catch(function () { return null; }); })
        .then(function (body) {
          list.textContent = '';
          if (!body || !body.ok) return list.appendChild(note('that list did not answer'));
          if (!body.items.length) return list.appendChild(note(q ? 'nothing matches ' + q : 'the list is empty'));
          body.items.forEach(function (item) {
            list.appendChild(modelRow(item.route, item.id, item.label, isChosen(item.route, item.id)));
          });
        })
        .catch(function () { list.textContent = ''; list.appendChild(note('offline')); });
    }
    input.addEventListener('input', function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, 220);
    });
    run();
  }

  function renderModels() {
    sheetTitle.textContent = 'model';
    sheetBody.textContent = '';
    // Open before anything is drawn: a row that cannot be drawn must not leave
    // him with a closed sheet and no idea why.
    sheet.classList.add('open');
    var box = document.createElement('div');
    box.className = 'models';
    sheetBody.appendChild(box);
    box.appendChild(modelRow('', '', 'store default — its own chain', !chosenModel));
    if (!modelGroups) {
      box.appendChild(note('reading the list…'));
      loadModels();
      return;
    }
    modelGroups.forEach(function (group) {
      if (!group || !group.name) return;
      var head = document.createElement('h5');
      head.textContent = group.name;
      box.appendChild(head);
      if (group.search) return modelSearch(box, group.search);
      (group.items || []).forEach(function (item) {
        box.appendChild(modelRow(item.route, item.id, item.label, isChosen(item.route, item.id)));
      });
    });
  }

  function loadModels() {
    fetch('/api/models', { cache: 'no-store' }).then(function (r) { return r.json().catch(function () { return null; }); }).then(function (body) {
      if (!body || !body.ok) { if (body && body.error) setState('model · ' + (body.error.code || 'unavailable')); return; }
      modelGroups = body.groups || [];
      chosenModel = body.current || null;
      paintModel();
      if (sheet.classList.contains('open') && sheetTitle.textContent === 'model') renderModels();
    }).catch(function () { setState('model · list unavailable'); });
  }

  function pickModel(route, id, label) {
    var pick = route && id ? { id: id, route: route, label: label || id } : null;
    var said = pick ? null : 'store default';
    fetch('/api/model', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pick ? pick : { clear: true })
    }).then(function (r) { return r.json().catch(function () { return null; }); }).then(function (body) {
      if (!body || !body.ok) { setState('model · not saved'); pattern('error'); return; }
      chosenModel = body.pick || null;
      paintModel();
      closeSheet();
      pattern('ready');
      setState('model · ' + (chosenModel ? String(chosenModel.label || chosenModel.id) : said));
    }).catch(function () { setState('model · offline'); pattern('error'); });
  }

  // ---- cards -------------------------------------------------------------

  function bounds() { return { w: canvas.clientWidth, h: canvas.clientHeight }; }

  function place(card) {
    card.el.style.left = Math.round(card.x) + 'px';
    card.el.style.top = Math.round(card.y) + 'px';
    card.el.style.width = Math.round(card.w) + 'px';
    card.el.style.height = Math.round(card.h) + 'px';
    var j = card.knob;
    if (card.ends) {
      // One dial per end, straddling the card: left and right opposing.
      if (j) {
        j.x = card.x - j.w / 2;
        j.y = card.y + (card.h - j.h) / 2;
        placeJog(j);
      }
      var e = card.knob2;
      if (e) {
        e.x = card.x + card.w - e.w / 2;
        e.y = card.y + (card.h - e.h) / 2;
        placeJog(e);
      }
      return;
    }
    if (j) {
      j.x = card.x + card.w - j.w - 8;
      j.y = card.y + card.h - j.h - 4;
      placeJog(j);
    }
    var k = card.knob2;
    if (k) {
      k.x = card.x + card.w - k.w - (j ? 8 + j.w + 8 : 8);
      k.y = card.y + card.h - k.h - 4;
      placeJog(k);
    }
  }

  function raise(card) {
    card.el.style.zIndex = String(++zTop);
    if (card.knob) card.knob.el.style.zIndex = String(++zTop);
    if (card.knob2) card.knob2.el.style.zIndex = String(++zTop);
  }

  function clampCard(card) {
    var b = bounds();
    card.x = Math.max(-card.w + 60, Math.min(b.w - 48, card.x));
    card.y = Math.max(-30, Math.min(b.h - 44, card.y));
  }

  function focusCard(k) {
    cursor = k;
    cards.forEach(function (card, n) { card.el.classList.toggle('on', n === k); });
    paintAll();
  }

  function clearCards() {
    cards.forEach(function (card) { unmountBoth(card); card.el.remove(); });
    cards = [];
    cursor = -1;
    canvas.classList.add('idle');
  }

  function fillBody(card) {
    var body = card.bodyEl;
    card.editEl = null;
    card.diffOn = false;
    body.textContent = '';
    body.classList.toggle('dim', !!card.dim && !card.doc);
    if (card.doc) {
      var frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-scripts allow-modals allow-popups allow-forms');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.srcdoc = documentSrcdoc(card.text);
      frame.style.pointerEvents = 'none';
      body.appendChild(frame);
    } else {
      body.textContent = card.text || '';
    }
  }

  // A failure is not a sentence someone wrote: it is a code, a detail and a body.
  function literalError(envelope, body) {
    var lines = [];
    if (envelope.code) lines.push('code     ' + envelope.code);
    if (envelope.detail) lines.push('detail   ' + envelope.detail);
    if (envelope.message) lines.push('message  ' + envelope.message);
    if (body && body.via) lines.push('via      ' + body.via);
    if (body && body.status) lines.push('status   ' + body.status);
    var d = body && body.decision;
    if (d && d.id != null) lines.push('decision ' + d.id + (d.move ? ' · ' + d.move : ''));
    return lines.join('\n');
  }

  function rawBody(body) {
    try {
      var s = JSON.stringify(body, null, 2);
      if (s.length > 900) s = s.slice(0, 900) + '\n... (' + s.length + ' chars)';
      return s;
    } catch (err) {
      return 'unreadable body';
    }
  }

  function addCard(opts) {
    canvas.classList.remove('idle');
    var el = document.createElement('div');
    el.className = 'card';
    var bar = document.createElement('div');
    bar.className = 'bar';
    var tag = document.createElement('span');
    tag.textContent = opts.tag || 'card';
    var name = document.createElement('span');
    name.className = 'name';
    name.textContent = opts.name || '';
    bar.appendChild(tag);
    bar.appendChild(name);
    var body = document.createElement('div');
    body.className = 'body';
    var grip = document.createElement('div');
    grip.className = 'grip';
    el.appendChild(bar);
    el.appendChild(body);
    el.appendChild(grip);
    canvas.appendChild(el);
    var card = {
      el: el,
      bar: bar,
      bodyEl: body,
      x: opts.x,
      y: opts.y,
      w: opts.w,
      h: opts.h,
      tag: opts.tag,
      short: opts.short || opts.tag,
      kind: opts.kind || 'note',
      value: opts.value,
      text: opts.text,
      doc: !!opts.doc,
      dim: !!opts.dim,
      grip: grip,
      knob: null,
      knob2: null,
      chin: null
    };
    fillBody(card);
    el.style.zIndex = String(++zTop);
    place(card);
    bindCard(card);
    cards.push(card);
    focusCard(cards.length - 1);
    return card;
  }

  function removeCard(card) {
    var k = cards.indexOf(card);
    if (k < 0) return;
    unmountBoth(card);
    card.el.remove();
    cards.splice(k, 1);
    if (!cards.length) canvas.classList.add('idle');
    cursor = cards.length ? Math.min(cursor < 0 ? 0 : cursor, cards.length - 1) : -1;
    focusCard(cursor);
  }

  function overlap(card, other) {
    var ox = Math.min(card.x + card.w, other.x + other.w) - Math.max(card.x, other.x);
    var oy = Math.min(card.y + card.h, other.y + other.h) - Math.max(card.y, other.y);
    if (ox <= 0 || oy <= 0) return 0;
    return (ox * oy) / (card.w * card.h);
  }

  function snap(card) {
    var best = null;
    var bestArea = 0;
    cards.forEach(function (other) {
      if (other === card) return;
      var area = overlap(card, other);
      if (area > bestArea) { bestArea = area; best = other; }
    });
    if (best && bestArea > 0.3) {
      // pushed together: it lands on the pile
      card.x = best.x + 10;
      card.y = best.y + 10;
      raise(card);
      pattern('take');
      setState('stacked');
    }
    clampCard(card);
    place(card);
  }

  function fling(card, vx, vy) {
    var speed = Math.sqrt(vx * vx + vy * vy);
    if (speed < 0.25) { snap(card); return; }
    var frames = 0;
    function step() {
      vx *= 0.93;
      vy *= 0.93;
      card.x += vx * 16;
      card.y += vy * 16;
      clampCard(card);
      place(card);
      frames += 1;
      if (frames < 50 && Math.sqrt(vx * vx + vy * vy) > 0.03) requestAnimationFrame(step);
      else snap(card);
    }
    requestAnimationFrame(step);
  }

  function bindCard(card) {
    var drag = null;
    card.bar.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      focusCard(cards.indexOf(card));
      raise(card);
      drag = { x: e.clientX, y: e.clientY, ox: card.x, oy: card.y, lx: e.clientX, ly: e.clientY, lt: Date.now(), vx: 0, vy: 0 };
      try { card.bar.setPointerCapture(e.pointerId); } catch (err) {}
    });
    card.bar.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var now = Date.now();
      var dt = Math.max(8, now - drag.lt);
      drag.vx = (e.clientX - drag.lx) / dt;
      drag.vy = (e.clientY - drag.ly) / dt;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      drag.lt = now;
      card.x = drag.ox + (e.clientX - drag.x);
      card.y = drag.oy + (e.clientY - drag.y);
      place(card);
    });
    card.bar.addEventListener('pointerup', function () {
      if (!drag) return;
      var vx = drag.vx;
      var vy = drag.vy;
      drag = null;
      fling(card, vx, vy);
    });
    card.bar.addEventListener('pointercancel', function () { drag = null; snap(card); });

    var size = null;
    card.grip.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      focusCard(cards.indexOf(card));
      raise(card);
      size = { x: e.clientX, y: e.clientY, w: card.w, h: card.h };
      try { card.grip.setPointerCapture(e.pointerId); } catch (err) {}
    });
    card.grip.addEventListener('pointermove', function (e) {
      if (!size) return;
      card.w = Math.max(112, size.w + (e.clientX - size.x));
      card.h = Math.max(64, size.h + (e.clientY - size.y));
      place(card);
    });
    card.grip.addEventListener('pointerup', function () { if (size) { size = null; snap(card); } });
  }

  function activate(k) {
    var card = cards[k];
    if (!card) return;
    if (card.kind === 'option' || card.kind === 'file' || card.kind === 'store') {
      pattern('take');
      ask(card.value);
      return;
    }
    pattern('take');
    openSheet(card.text || lastText, card.tag);
  }

  // ---- what a jog does to a card -----------------------------------------

  // what card is the whole dial sitting on, topmost first
  function cardUnder(j) {
    var b = canvas.getBoundingClientRect();
    var cx = b.left + j.x + j.w / 2;
    var cy = b.top + j.y + j.h / 2;
    var hit = null;
    var top = -1;
    cards.forEach(function (card) {
      var r = card.el.getBoundingClientRect();
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return;
      var z = parseInt(card.el.style.zIndex, 10) || 0;
      if (z >= top) { top = z; hit = card; }
    });
    return hit;
  }

  // A bonded pair takes a window together: both wheels dock in its chin.
  function mount(j) {
    var card = cardUnder(j);
    if (!card || (card.knob && card.knob2)) return;
    var mate = other(j);
    if (paired() && mate && mate.open && !mate.mounted) dock(mate, card);
    dock(j, card);
  }

  // Dropped on a card, a joined pair does not fold into its chin: it takes an end
  // each, left and right, so the card reads as one object with two sides.
  function dockEnds(card) {
    if (!paired() || card.knob || card.knob2) return false;
    card.ends = true;
    card.el.classList.add('ends');
    card.el.style.setProperty('--accent', jogA.accent);
    card.baseline = card.text || '';
    [jogA, jogB].forEach(function (j) {
      sizeJog(j, 56);
      j.mounted = card;
      j.el.classList.add('mounted');
    });
    card.knob = jogA;
    card.knob2 = jogB;
    raise(card);
    place(card);
    paintAll();
    pattern('pair');
    setState('card · two ends');
    return true;
  }

  function dock(j, card) {
    if (j.mounted || (card.knob && card.knob2)) return false;
    if (card.ends) { card.ends = false; card.el.classList.remove('ends'); }
    j.mounted = card;
    if (card.knob) card.knob2 = j; else card.knob = j;
    card.baseline = card.text || '';
    card.el.classList.add('win');
    card.el.style.setProperty('--accent', j.accent);
    if (!card.chin) {
      var chin = document.createElement('div');
      chin.className = 'chin';
      var row = document.createElement('div');
      row.className = 'row';
      ['close', 'edit', 'diff', 'grow'].forEach(function (w) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-w', w);
        b.textContent = w;
        row.appendChild(b);
      });
      // the store's own ops, on the card he is holding: these write a new card
      // from this one, and the new cards land on the board beside it.
      var ops = document.createElement('div');
      ops.className = 'ops';
      [['continue', 'cont'], ['magic', 'magic'], ['style', 'style'], ['split', 'split'], ['merge', 'merge'], ['template', 'tmpl'], ['back', 'back']].forEach(function (pair) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-w', pair[0]);
        b.textContent = pair[1];
        ops.appendChild(b);
      });
      chin.appendChild(row);
      chin.appendChild(ops);
      chin.addEventListener('click', function (e) {
        var b = e.target && e.target.closest ? e.target.closest('button') : null;
        if (!b) return;
        e.stopPropagation();
        var w = b.getAttribute('data-w');
        if (w === 'grow') { chin.classList.add('open'); setState('grow · what from this card'); return; }
        if (w === 'back') { chin.classList.remove('open'); setState('window · ' + (card.knob ? card.knob.mode : 'card')); return; }
        if (w === 'close') { pattern('park'); removeCard(card); return; }
        if (w === 'edit') { editOn(card, b); return; }
        if (w === 'diff') { diffOn(card, b); return; }
        growCard(card, w);
      });
      chin.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      card.el.appendChild(chin);
      card.chin = chin;
    }
    card.chin.classList.toggle('two', !!(card.knob && card.knob2));
    j.el.classList.add('mounted');
    sizeJog(j, 40);
    raise(card);
    place(card);
    paintAll();
    pattern('take');
    setState('window · ' + j.mode);
    return true;
  }

  function unmount(j) {
    var card = j.mounted;
    if (!card) return;
    if (card.knob === j) card.knob = null;
    if (card.knob2 === j) card.knob2 = null;
    if (!card.knob && !card.knob2) {
      if (card.chin) card.chin.remove();
      card.el.classList.remove('win');
      card.el.style.removeProperty('--accent');
      card.chin = null;
      card.editEl = null;
      card.diffOn = false;
      if (card.ends) { card.ends = false; card.el.classList.remove('ends'); }
    } else if (card.chin) {
      card.chin.classList.remove('two');
    }
    j.mounted = null;
    j.el.classList.remove('mounted');
    sizeJog(j, 112);
    clampJog(j);
    placeJog(j);
    raise(card);
    place(card);
    paintAll();
  }

  function unmountBoth(card) {
    if (card.knob) unmount(card.knob);
    if (card.knob2) unmount(card.knob2);
  }

  function editOn(card, btn) {
    if (card.editEl) { fillBody(card); btn.setAttribute('aria-pressed', 'false'); return; }
    card.bodyEl.textContent = '';
    var pre = document.createElement('pre');
    pre.className = 'src';
    pre.contentEditable = 'true';
    pre.spellcheck = false;
    pre.textContent = card.text || '';
    pre.addEventListener('input', function () { card.text = pre.textContent; });
    card.bodyEl.appendChild(pre);
    card.editEl = pre;
    btn.setAttribute('aria-pressed', 'true');
    pattern('take');
    setState('edit · ' + (card.short || card.tag));
    try { pre.focus(); } catch (err) {}
  }

  function diffLines(a, b) {
    if (a === b) return null;
    var A = a.split('\n');
    var B = b.split('\n');
    var cap = 300;
    var cut = false;
    if (A.length > cap || B.length > cap) { A = A.slice(0, cap); B = B.slice(0, cap); cut = true; }
    var n = A.length;
    var m = B.length;
    var dp = [];
    var i;
    var q;
    for (i = 0; i <= n; i += 1) { dp.push([]); for (q = 0; q <= m; q += 1) dp[i].push(0); }
    for (i = n - 1; i >= 0; i -= 1) {
      for (q = m - 1; q >= 0; q -= 1) {
        dp[i][q] = A[i] === B[q] ? dp[i + 1][q + 1] + 1 : Math.max(dp[i + 1][q], dp[i][q + 1]);
      }
    }
    var out = [];
    var x = 0;
    var y = 0;
    while (x < n && y < m) {
      if (A[x] === B[y]) { out.push({ op: 'same', text: A[x] }); x += 1; y += 1; }
      else if (dp[x + 1][y] >= dp[x][y + 1]) { out.push({ op: 'del', text: A[x] }); x += 1; }
      else { out.push({ op: 'add', text: B[y] }); y += 1; }
    }
    while (x < n) { out.push({ op: 'del', text: A[x] }); x += 1; }
    while (y < m) { out.push({ op: 'add', text: B[y] }); y += 1; }

    var slim = [];
    var k = 0;
    while (k < out.length) {
      if (out[k].op !== 'same') { slim.push(out[k]); k += 1; continue; }
      var s = k;
      while (k < out.length && out[k].op === 'same') k += 1;
      var len = k - s;
      if (len <= 6) { for (q = s; q < k; q += 1) slim.push(out[q]); }
      else {
        slim.push(out[s]);
        slim.push(out[s + 1]);
        slim.push({ op: 'skip', text: '... ' + (len - 4) + ' lines same' });
        slim.push(out[k - 2]);
        slim.push(out[k - 1]);
      }
    }
    if (cut) slim.push({ op: 'skip', text: '... first ' + cap + ' lines' });
    return slim;
  }

  function diffOn(card, btn) {
    if (card.diffOn) { fillBody(card); btn.setAttribute('aria-pressed', 'false'); return; }
    var rows = diffLines(String(card.baseline || ''), String(card.text || ''));
    card.bodyEl.textContent = '';
    card.diffOn = true;
    card.editEl = null;
    if (!rows) {
      var none = document.createElement('div');
      none.className = 'dline skip';
      none.textContent = 'no change';
      card.bodyEl.appendChild(none);
    } else {
      rows.forEach(function (r) {
        var d = document.createElement('div');
        d.className = 'dline ' + r.op;
        d.textContent = (r.op === 'add' ? '+ ' : r.op === 'del' ? '- ' : r.op === 'skip' ? '' : '  ') + r.text;
        card.bodyEl.appendChild(d);
      });
    }
    btn.setAttribute('aria-pressed', 'true');
    pattern('take');
    setState('diff · ' + (card.short || card.tag));
  }

  // ---- the jogs ----------------------------------------------------------

  function makeJog(id, modeId) {
    var el = document.createElement('div');
    el.className = 'jog';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', 'Jog wheel.');
    var mk = document.createElement('div');
    mk.className = 'mk';
    for (var i = 0; i < DETENTS; i += 1) {
      var slot = document.createElement('div');
      slot.className = i ? 'm' : 'm on';
      slot.style.transform = 'rotate(' + (i * STEP) + 'deg)';
      slot.appendChild(document.createElement('i'));
      mk.appendChild(slot);
    }
    var core = document.createElement('div');
    core.className = 'core';
    var lbl = document.createElement('div');
    lbl.className = 'lbl';
    lbl.textContent = 'hold';
    var sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = 'to ask';
    core.appendChild(lbl);
    core.appendChild(sub);
    el.appendChild(mk);
    el.appendChild(core);
    var lockBtn = document.createElement("div");
    lockBtn.className = "lock";
    lockBtn.appendChild(document.createElement("i"));
    el.appendChild(lockBtn);
    var modes = document.createElement("div");
    modes.className = "modes";
    [["dial", "up"], ["drag", "down"], ["stick", "left"], ["double", "right"]].forEach(function (pair) {
      var pad = document.createElement("div");
      pad.className = "pad pad-" + pair[1];
      pad.setAttribute("data-m", pair[0]);
      pad.textContent = pair[0];
      modes.appendChild(pad);
    });
    el.appendChild(modes);
    canvas.appendChild(el);
    var j = {
      id: id,
      el: el,
      mk: mk,
      core: core,
      lock: lockBtn,
      locked: false,
      labelEl: lbl,
      subEl: sub,
      mode: modeId,
      accent: '#4a9eff',
      x: 0,
      y: 0,
      w: 112,
      h: 112,
      deg: 0,
      open: false,
      mounted: null,
      drag: null,
      turn: null,
      mic: null,
      listening: false,
      heard: '',
      lockDeg: 90,
      held: 0,
      heldAt: 0
    };
    setMode(j, modeId, true);
    bindJog(j);
    jogs.push(j);
    return j;
  }

  function modeOf(id) {
    for (var k = 0; k < MODES.length; k += 1) if (MODES[k].id === id) return MODES[k];
    return MODES[0];
  }

  function setMode(j, id, quiet) {
    var m = modeOf(id);
    j.mode = m.id;
    j.accent = m.accent;
    j.el.style.setProperty('--accent', m.accent);
    paintJog(j);
    if (j.mounted) {
      j.mounted.el.style.setProperty('--accent', m.accent);
      paintJog(j);
    }
    if (!quiet) pattern('take');
  }

  // Dragging mode: its own color, microphone off, rim dead. All that wheel does
  // is move, from any part of it.
  function dragMode(j, on) {
    if (j.dragMode === on) return;
    if (on) { try { if (j.mic) j.mic.abort(); } catch (err) {} j.mic = null; j.listening = false; }
    j.dragMode = on;
    j.el.classList.toggle("dragmode", on);
    paintJog(j);
    if (on) {
      j.savedMode = j.mode;
      j.el.style.setProperty("--accent", DRAG_ACCENT);
      setState("dragging mode · mic off");
    } else {
      j.el.style.removeProperty("--accent");
      setMode(j, j.savedMode || j.mode, true);
      setState("ready");
    }
  }

  function openMenu(j) {
    if (j.menu) return;
    j.menu = true;
    // the four pads need room: pull the wheel in from an edge first
    var b = bounds();
    var m = 70;
    j.x = Math.max(m, Math.min(b.w - j.w - m, j.x));
    j.y = Math.max(m, Math.min(b.h - j.h - m, j.y));
    placeJog(j);
    j.el.classList.add("menu");
    try { if (j.mic) j.mic.abort(); } catch (err) {}
    j.mic = null;
    j.listening = false;
    pattern("take");
    setState("modes · mic off");
  }

  function closeMenu(j) {
    j.menu = false;
    j.el.classList.remove("menu");
  }

  function mapDir(dir) {
    return dir === "up" ? "dial" : dir === "down" ? "drag" : dir === "left" ? "stick" : dir === "right" ? "double" : null;
  }

  function setMenuPad(j, dir) {
    if (j.menuPad === dir) return;
    j.menuPad = dir;
    var want = mapDir(dir);
    Array.prototype.forEach.call(j.el.querySelectorAll(".pad"), function (pad) {
      pad.classList.toggle("on", pad.getAttribute("data-m") === want);
    });
    pattern(dir ? "tick" : "detent");
    if (want) setState("modes · " + want);
  }

  function aimPad(j, e) {
    // measured from where the thumb landed, not the wheel: the wheel may have
    // shifted to make room when the menu opened
    var c = j.holdFrom || centre(j);
    var dx = e.clientX - c.x;
    var dy = e.clientY - c.y;
    if (Math.sqrt(dx * dx + dy * dy) < 12) { setMenuPad(j, null); return; }
    setMenuPad(j, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  }

  function pickPad(j, which) {
    closeMenu(j);
    j.menuPad = null;
    pattern("take");
    if (which === "drag") { dragMode(j, true); j.pinned = true; setState("mode · drag"); return; }
    if (which === "double") {
      // from either wheel: the other one comes back, in the place it left
      var mate = j === jogA ? jogB : jogA;
      if (!mate) return;
      if (!mate.open) show(mate, true);
      mate.pinned = true;
      dragMode(mate, true);
      setState("mode · double jog");
      return;
    }
    dragMode(j, false);
    setState("mode · " + which);
  }

  function cycleMode(j) {
    var k = 0;
    for (var i = 0; i < MODES.length; i += 1) if (MODES[i].id === j.mode) k = i;
    setMode(j, MODES[(k + 1) % MODES.length].id, true);
    if (paired()) {
      var bondMate = other(j);
      if (bondMate && bondMate.open) setMode(bondMate, j.mode, true);
    }
    pattern('tick');
    setState('mode · ' + j.mode + (paired() ? ' · paired' : ''));
  }

  // Sizing is one place so a dock, an undock and a pinch agree on what a dial is.
  function sizeJog(j, px) {
    j.w = px;
    j.h = px;
    j.el.style.width = px + 'px';
    j.el.style.height = px + 'px';
  }

  function placeJog(j) {
    j.el.style.left = Math.round(j.x) + 'px';
    j.el.style.top = Math.round(j.y) + 'px';
  }

  function clampJog(j) {
    var b = bounds();
    j.x = Math.max(-6, Math.min(b.w - j.w + 6, j.x));
    j.y = Math.max(-6, Math.min(b.h - j.h + 6, j.y));
  }

  function paintJog(j) {
    // The ring steps around with the thumb; the lit mark is on the ring, so it
    // turns with it and shows which detent you are on.
    var step = ((Math.round(j.deg / STEP) % DETENTS) + DETENTS) % DETENTS;
    j.mk.style.transform = 'rotate(' + (step * STEP) + 'deg)';
    // The lock rides the rim, so it can be set to any side and two dials can
    // meet lock to lock wherever the latch is. Its pip still turns with the
    // dial: two locks meeting pip to pip are lined up.
    var la = j.lockDeg * Math.PI / 180;
    j.lock.style.left = (50 + 50 * Math.cos(la)) + '%';
    j.lock.style.top = (50 + 50 * Math.sin(la)) + '%';
    j.lock.style.transform = 'translate(-50%,-50%) rotate(' + (j.lockDeg + 90 + step * STEP) + 'deg)';
    if (j.dragMode) { j.labelEl.textContent = 'drag'; j.subEl.textContent = 'move me'; return; }
    var card = j.mounted || cards[cursor];
    j.labelEl.textContent = card ? (card.short || card.tag) : 'hold';
    j.subEl.textContent = j.mounted ? 'window' : (cards.length ? (cursor + 1) + ' of ' + cards.length : 'to ask');
  }

  function paintAll() { jogs.forEach(paintJog); paintBond(); }

  function paired() { return !!(pairOn && jogA && jogB && jogA.open && jogB.open); }

  // Joined locks are one controller: either wheel turns both.
  function couple(j, slot) {
    if (!paired()) return;
    var m = other(j);
    m.deg = j.deg;
    m.slot = slot;
    paintJog(m);
  }

  // A bond is visible: both dials carry one code and light it.
  function paintBond() {
    var on = paired() && ((!jogA.mounted && !jogB.mounted) || (jogA.mounted && jogA.mounted === jogB.mounted));
    // Unpaired means the display comes back: a hidden body is not a parked one.
    if (!on && pairHidden) hidePair(false);
    jogA.el.classList.toggle("joined", !!on);
    jogB.el.classList.toggle("joined", !!on);
    jogB.el.classList.toggle("half", !!on);
    renderPairMenu();
    if (!pairBody) return;
    pairBody.classList.toggle("on", !!on);
    if (!on) return;
    placePairBody();
  }

  function placePairBody() {
    if (!pairBody) return;
    if (bottomDocked) {
      // Docked, the body is a full-width bar along the floor, not a capsule.
      var bb = bounds();
      var h = Math.max(jogA.h, jogB.h) + 20;
      pairBody.classList.add('bottom');
      pairBody.style.left = '8px';
      pairBody.style.top = (bb.h - h - 4) + 'px';
      pairBody.style.width = Math.max(0, bb.w - 16) + 'px';
      pairBody.style.height = h + 'px';
      pairBody.style.borderColor = jogA.accent;
      return;
    }
    pairBody.classList.remove('bottom');
    var box = unionBox();
    pairBody.style.left = (box.x - 4) + 'px';
    pairBody.style.top = (box.y - 4) + 'px';
    pairBody.style.width = (box.w + 8) + 'px';
    pairBody.style.height = (box.h + 8) + 'px';
    pairBody.style.borderColor = jogA.accent;
  }

  function placePairMenu() {
    if (!pairMenu || !pairMenu.classList.contains('on')) return;
    var box = unionBox();
    var bb = bounds();
    var w = Math.min(320, Math.max(200, bb.w - 16));
    pairMenu.style.width = w + 'px';
    pairMenu.style.left = Math.min(Math.max(8, box.x + box.w / 2 - w / 2), Math.max(8, bb.w - w - 8)) + 'px';
    var h = pairMenu.offsetHeight || 170;
    var top = box.y + box.h + 12;
    if (top + h > bb.h - 8) top = Math.max(8, box.y - 12 - h);
    pairMenu.style.top = top + 'px';
  }

  // One grip for the joined body: the bar under a finger, or two fingers on the
  // dials. Starting and letting go live here so both paths agree.
  var pairDrag = null;

  function pairGrip(x, y) {
    pairDrag = { x: x, y: y, ax: jogA.x, ay: jogA.y, bx: jogB.x, by: jogB.y };
  }

  function pairRelease() {
    if (!pairDrag) return;
    pairDrag = null;
    jogA.spot = { x: jogA.x, y: jogA.y };
    jogB.spot = { x: jogB.x, y: jogB.y };
    var bb = bounds();
    var floor = Math.max(jogA.y + jogA.h, jogB.y + jogB.h);
    // Dropped at the floor: the dock happens now, on the release, once.
    if (!bottomDocked && floor > bb.h - 40) {
      dockBottom();
      return;
    }
    pattern('take');
    setState('one controller · moved');
  }

  function bindPairMove(handle) {
    handle.addEventListener('pointerdown', function (e) {
      if (!paired()) return;
      e.preventDefault();
      e.stopPropagation();
      pairGrip(e.clientX, e.clientY);
      handle.classList.add('held');
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    });
    handle.addEventListener('pointermove', function (e) {
      if (!pairDrag) return;
      pairShift(e.clientX - pairDrag.x, e.clientY - pairDrag.y, pairDrag);
    });
    handle.addEventListener('pointerup', function (e) {
      // A tap on the bar is the menu; a drag is the move. Three fingers used to
      // open it, and they move the body now.
      var tapped = pairDrag && Math.abs(e.clientX - pairDrag.x) + Math.abs(e.clientY - pairDrag.y) < 8;
      handle.classList.remove('held');
      pairRelease();
      if (!tapped) return;
      menuOff = !menuOff;
      renderPairMenu();
      pattern(menuOff ? 'park' : 'ready');
      setState(menuOff ? 'menu down' : 'menu up');
    });
    handle.addEventListener('pointercancel', function () {
      pairDrag = null;
      handle.classList.remove('held');
    });
  }

  // The rectangle two dials cover. The capsule, the menu and a move's clamp all
  // need the same one, from either where they are or where a move began.
  function boxesFor(ax, ay, bx, by) {
    var x = Math.min(ax, bx);
    var y = Math.min(ay, by);
    var r = Math.max(ax + jogA.w, bx + jogB.w);
    var b = Math.max(ay + jogA.h, by + jogB.h);
    return { x: x, y: y, w: r - x, h: b - y };
  }

  function unionBox() { return boxesFor(jogA.x, jogA.y, jogB.x, jogB.y); }

  // Joined, the controller gets its own menu: every card as a row, every mode
  // as a button, and a text box. One tap instead of turning the rim.
  function renderPairMenu() {
    if (!pairMenu) return;
    if (!paired()) { pairMenu.classList.remove('on'); pairMenu.textContent = ''; return; }
    pairMenu.textContent = '';
    var head = document.createElement('div');
    head.className = 'ph grab';
    var hb = document.createElement('b');
    hb.textContent = '\u283F one controller';
    var hc = document.createElement('span');
    hc.textContent = cards.length ? cards.length + ' cards' : 'no cards';
    head.appendChild(hb);
    head.appendChild(hc);
    pairMenu.appendChild(head);
    cards.forEach(function (card, i) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'row' + (i === cursor ? ' on' : '');
      var n = document.createElement('i');
      n.textContent = String(i + 1);
      var s = document.createElement('span');
      s.textContent = card.short || card.tag || 'card';
      row.appendChild(n);
      row.appendChild(s);
      row.addEventListener('click', function () { pairPick(i); });
      pairMenu.appendChild(row);
    });
    var modes = document.createElement('div');
    modes.className = 'pm-modes';
    MODES.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'row' + (m.id === jogA.mode ? ' on' : '');
      var s = document.createElement('span');
      s.textContent = m.id;
      b.appendChild(s);
      b.addEventListener('click', function () { pairMode(m.id); });
      modes.appendChild(b);
    });
    pairMenu.appendChild(modes);
    // Sizing and the look live here: two fingers are the carry now, three are the
    // menu, so this is where it gets bigger, smaller, or reads a page.
    var tools = document.createElement('div');
    tools.className = 'pm-modes';
    [['size -', -8], ['size +', 8]].forEach(function (pair) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'row';
      var s = document.createElement('span');
      s.textContent = pair[0] + ' ' + (jogA.w + pair[1]);
      b.appendChild(s);
      b.addEventListener('click', function () { pairStep(pair[1]); });
      tools.appendChild(b);
    });
    // Ambient is the pulse, not the app: these hand over to the other side's own
    // interface instead of a thinner copy of it in here.
    [
      ['talk in trnv', 'https://trnv.nspired.cc/ptt', 'trnv'],
      ['cards in cods', 'https://cods.nspired.cc/', 'cods'],
      ['tew', 'https://tew.ai-n.workers.dev/', 'tew']
    ].forEach(function (pair) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'row';
      var s = document.createElement('span');
      s.textContent = pair[0];
      b.appendChild(s);
      b.addEventListener('click', function () { handOff(pair[0], pair[1], pair[2]); });
      tools.appendChild(b);
    });
    var hideBtn = document.createElement('button');
    hideBtn.type = 'button';
    hideBtn.className = 'row';
    var hideSpan = document.createElement('span');
    hideSpan.textContent = 'hide it';
    hideBtn.appendChild(hideSpan);
    hideBtn.addEventListener('click', function () { hidePair(true); });
    tools.appendChild(hideBtn);
    var diagBtn = document.createElement('button');
    diagBtn.type = 'button';
    diagBtn.className = 'row';
    var diagSpan = document.createElement('span');
    diagSpan.textContent = "what's wrong";
    diagBtn.appendChild(diagSpan);
    diagBtn.addEventListener('click', function () { diagnose(); });
    tools.appendChild(diagBtn);
    [['prev', -1], ['next', 1]].forEach(function (pair) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'row';
      var s = document.createElement('span');
      s.textContent = pair[0];
      b.appendChild(s);
      b.addEventListener('click', function () { stepFocus(pair[1]); });
      tools.appendChild(b);
    });
    pairMenu.appendChild(tools);
    var keyRow = document.createElement('div');
    keyRow.className = 'ph';
    var kb = document.createElement('b');
    kb.textContent = dialKey() ? 'key set' : 'key missing - open with ?k=';
    keyRow.appendChild(kb);
    pairMenu.appendChild(keyRow);
    var lookRow = document.createElement('div');
    lookRow.className = 'say';
    var urlIn = document.createElement('input');
    urlIn.type = 'text';
    urlIn.placeholder = 'page to look at';
    urlIn.autocomplete = 'off';
    var lookGo = document.createElement('button');
    lookGo.type = 'button';
    lookGo.textContent = 'look';
    lookGo.addEventListener('click', function () {
      var u = urlIn.value.trim();
      if (!u) return;
      urlIn.value = '';
      lookAt(u);
    });
    urlIn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); lookGo.click(); }
    });
    lookRow.appendChild(urlIn);
    lookRow.appendChild(lookGo);
    pairMenu.appendChild(lookRow);
    var say = document.createElement('div');
    say.className = 'say';
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'say it';
    input.autocomplete = 'off';
    var go = document.createElement('button');
    go.type = 'button';
    go.textContent = 'go';
    go.addEventListener('click', function () {
      var said = input.value.trim();
      if (!said) return;
      input.value = '';
      ask(said);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); go.click(); }
    });
    say.appendChild(input);
    say.appendChild(go);
    pairMenu.appendChild(say);
    pairMenu.classList.toggle('on', !menuOff);
    pairMenu.style.borderColor = jogA.accent;
    bindPairMove(head);
    placePairMenu();
  }

  function pairPick(i) {
    if (!cards[i]) return;
    focusCard(i);
    raise(cards[i]);
    say(cards[i].short || cards[i].tag);
    pattern('tick');
    setState('card ' + (i + 1) + ' of ' + cards.length + ' · joined');
  }

  function pairMode(id) {
    setMode(jogA, id, true);
    setMode(jogB, id, true);
    pattern('take');
    setState('mode · ' + id + ' · joined');
    paintAll();
  }
  function other(j) { return j === jogA ? jogB : jogA; }

  function sideOf(deg) {
    var a = ((Math.round(deg / 45) * 45) % 360 + 360) % 360;
    return a === 0 ? 'right' : a === 90 ? 'below' : a === 180 ? 'left' : a === 270 ? 'above' : 'corner ' + a;
  }

  // Centre to centre, with the pieces both pairing and the near coach need.
  function seam(j, o) {
    var dx = (j.x + j.w / 2) - (o.x + o.w / 2);
    var dy = (j.y + j.h / 2) - (o.y + o.h / 2);
    return { dx: dx, dy: dy, d: Math.sqrt(dx * dx + dy * dy) };
  }

  // Nothing touches yet: the wheels only have to come near. One warning per approach.
  var NEAR = 150;
  function proximity(j) {
    var o = other(j);
    if (!o || !o.open || j.mounted || o.mounted) return;
    var d = seam(j, o).d;
    if (d > NEAR) {
      if (d > NEAR + 40) j.nearSaid = false;
      return;
    }
    if (j.nearSaid) return;
    j.nearSaid = true;
    pattern("near", true);
    coachEl.textContent = "Two dials. Push one into the other and they latch into one.";
    coachEl.classList.add("on");
    clearTimeout(proximity.t);
    proximity.t = setTimeout(function () { if (coachStep < 0) coachEl.classList.remove("on"); }, 5600);
    setState("controllers close");
  }

  // Pairing is physical: bring one dial's lock against the other's and the two
  // latches take hold. They lock to each other and turn as one controller.
  function knock(j) {
    var o = other(j);
    if (!o || !o.open || j.mounted || o.mounted) return false;
    if (pairOn) return false;
    var s = seam(j, o);
    if (s.d > (j.w + o.w) / 2 + 6) return false;
    pairOn = true;
    menuOff = false;
    // Push one dial into the other and they latch where they met: the arriving
    // dial sits rim to rim, both locks turn to face that seam, and one body is
    // left standing. No pip to aim at.
    var ang = Math.atan2(s.dy, s.dx) * 180 / Math.PI;
    o.lockDeg = ang;
    j.lockDeg = ang + 180;
    var rad = ang * Math.PI / 180;
    var sep = (j.w + o.w) / 2 - 2;
    j.x = o.x + (o.w - j.w) / 2 + Math.cos(rad) * sep;
    j.y = o.y + (o.h - j.h) / 2 + Math.sin(rad) * sep;
    clampJog(j);
    placeJog(j);
    setMode(j, o.mode, true);
    setLocked(j, true);
    setLocked(o, true);
    pattern("pair");
    paintAll();
    setState("locks joined · one controller");
    return true;
  }

  // First appearance is onboarding: the wheel is lit and the middle is the A
  // button. No microphone on this path at all.
  var COACH = [
    "Put your thumb on the wheel.",
    "Hold the wheel: four modes come up, the mic goes off.",
    "Drag mode: press the wheel anywhere and move it.",
    "Turn the rim to walk the cards."
  ];

  function coachShow(i) {
    coachStep = i;
    coachEl.textContent = COACH[i];
    coachEl.classList.add("on");
    jogA.el.classList.add("glow");
  }

  function advanceCoach() {
    pattern("take");
    if (coachStep >= 0 && coachStep < COACH.length - 1) {
      coachShow(coachStep + 1);
      setState("intro " + (coachStep + 1) + " of " + COACH.length);
      return;
    }
    coachStep = -1;
    coachEl.classList.remove("on");
    jogA.el.classList.remove("glow");
    setState("ready");
  }

  function show(j, on) {
    if (!on) { pairOn = false; bottomDocked = false; }
    if (!on && j.mounted) unmount(j);
    j.open = on;
    j.el.classList.toggle('open', on);
    if (on) {
      var b = bounds();
      if (j.spot) { j.x = j.spot.x; j.y = j.spot.y; clampJog(j); }
      else {
        j.x = j.id === 'a' ? Math.max(8, b.w - j.w - 12) : 12;
        j.y = j.id === 'a' ? Math.max(8, b.h - j.h - 12) : 12;
      }
      j.deg = 0;
      j.slot = 0;
      placeJog(j);
      paintJog(j);
      setState('dial up · drag down to park');
    }
    composer.classList.toggle('handoff', jogA.open || jogB.open);
  }

  function park(j) {
    if (!j.open) return;
    j.spot = { x: j.x, y: j.y };
    show(j, false);
    pattern('park');
    setState(jogA.open || jogB.open ? 'parked one' : 'parked');
  }

  function centre(j) { var r = j.el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function degAt(j, e) { var c = centre(j); return Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI; }

  function walk(j, slot) {
    if (!cards.length) { setState('no cards yet'); return; }
    cursor = ((slot % cards.length) + cards.length) % cards.length;
    if (paired()) {
      var o = other(j);
      o.deg = j.deg;
      o.slot = slot;
      paintJog(o);
    }
    focusCard(cursor);
    if (cards[cursor]) say(cards[cursor].short || cards[cursor].tag);
  }

  function talk(j) {
    var R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) { setState('no speech here'); return false; }
    if (j.listening) return true;
    try {
      j.mic = new R();
      j.mic.lang = navigator.language || 'en-US';
      j.mic.interimResults = true;
      j.mic.continuous = false;
      j.mic.onresult = function (ev) {
        var said = '';
        for (var k = ev.resultIndex; k < ev.results.length; k += 1) said += ev.results[k][0].transcript;
        j.heard = said.trim();
        if (j.heard) setState('heard: ' + j.heard.slice(0, 42));
      };
      j.mic.onerror = function () { setState('no mic'); pattern('error'); };
      j.mic.onend = function () {
        j.mic = null;
        j.listening = false;
        var said = j.heard;
        j.heard = '';
        if (j.held >= 420 && said) { setState('sent'); pattern('sent'); ask(said); return; }
        if (j.held < 420) activate(cursor);
      };
      j.mic.start();
      j.listening = true;
      j.heard = '';
      setState('listening');
      pattern('listen');
      return true;
    } catch (err) {
      j.mic = null;
      j.listening = false;
      setState('no mic');
      return false;
    }
  }

  // A handle press: in dragging mode any part of the wheel does this.
  function beginDrag(j, e, cap, rim) {
    if (j.locked) { pattern("error"); setState("locked"); return; }
    j.drag = { x: e.clientX, y: e.clientY, ox: j.x, oy: j.y, tick: 0, moved: 0, rim: !!rim };
    dragMode(j, true);
    if (rim) {
      j.drag.catch = setTimeout(function () { if (j.drag) pattern('caught', true); }, 140);
    }
    try { cap.setPointerCapture(e.pointerId); } catch (err) {}
  }

  function setLocked(j, on) {
    j.locked = !!on;
    j.el.classList.toggle("locked", j.locked);
    if (j.locked) { j.drag = null; j.turn = null; dragMode(j, false); clampJog(j); placeJog(j); }
    else if (pairOn) { pairOn = false; paintBond(); }
    pattern(j.locked ? "take" : "park");
    setState(j.locked ? "locked in place" : "unlocked");
  }

  function bindJog(j) {
    // rim turns, grip moves, core talks, chip changes color
    j.mk.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (touchCount() > 1) return;
      if (j.menu) return;
      lastTouched = j;
      // A locked or docked wheel is a dial: the rim turns it, it never drags.
      // This has to come before any locked refusal, or a planted wheel is a
      // press that only ever errors.
      if (j.locked || j.mounted) {
        j.turn = { angle: degAt(j, e), moved: 0 };
        pattern('tick');
        try { j.mk.setPointerCapture(e.pointerId); } catch (err) {}
        return;
      }
      // dragging mode: the rim is dead, the whole wheel is a handle
      if (j.dragMode) { beginDrag(j, e, j.mk); return; }
      // unlocked, the rim is a grip: it catches under the thumb, then drags
      beginDrag(j, e, j.mk, true);
    });
    j.mk.addEventListener('pointermove', function (e) {
      if (!j.turn) return;
      if (j.dragMode) { j.turn = null; return; }
      var a = degAt(j, e);
      var d = a - j.turn.angle;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      j.turn.angle = a;
      j.turn.moved += Math.abs(d);
      j.deg += d;
      var slot = Math.round(j.deg / STEP);
      if (slot !== j.slot) {
        j.slot = slot;
        pattern('detent');
        walk(j, slot);
      }
      paintJog(j);
      couple(j, slot);
    });
    j.mk.addEventListener('pointerup', function () {
      if (!j.turn) return;
      var tap = j.turn.moved < 8;
      j.turn = null;
      if (tap) tapAnswer(j);
    });
    j.mk.addEventListener('pointercancel', function () { j.turn = null; });

    j.core.addEventListener('pointerdown', function (e) {
      if (touchCount() > 1) return;
      e.preventDefault();
      if (j.menu) return;
      lastTouched = j;
      j.heldAt = Date.now();
      j.held = 0;
      if (coachStep >= 0) { j.coachTap = true; advanceCoach(); return; }
      // A locked or docked wheel is a dial: the pad is a grip on it, so the pad
      // turns it too. Talking is for an unlocked wheel only.
      if (j.locked || j.mounted) {
        j.coachTap = false;
        j.turn = { angle: degAt(j, e), moved: 0 };
        pattern('tick');
        try { j.core.setPointerCapture(e.pointerId); } catch (err) {}
        return;
      }
      if (j.dragMode) { j.coachTap = false; beginDrag(j, e, j.core); return; }
      j.coachTap = false;
      talk(j);
      try { j.core.setPointerCapture(e.pointerId); } catch (err) {}
    });
    j.core.addEventListener('pointermove', function (e) {
      if (!j.turn) return;
      if (j.dragMode) { j.turn = null; return; }
      var a = degAt(j, e);
      var d = a - j.turn.angle;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      j.turn.angle = a;
      j.turn.moved += Math.abs(d);
      j.deg += d;
      var slot = Math.round(j.deg / STEP);
      if (slot !== j.slot) {
        j.slot = slot;
        pattern('detent');
        walk(j, slot);
      }
      paintJog(j);
      couple(j, slot);
    });
    j.core.addEventListener('pointerup', function () {
      j.held = Date.now() - j.heldAt;
      if (j.turn) { j.turn = null; return; }
      if (j.coachTap) { j.coachTap = false; return; }
      if (!j.listening) { if (j.held < 420) tapAnswer(j); return; }
      try { if (j.mic) j.mic.stop(); } catch (err) {}
    });
    j.core.addEventListener('pointercancel', function () {
      try { if (j.mic) j.mic.abort(); } catch (err) {}
    });

    j.el.addEventListener('pointermove', function (e) {
      if (!j.drag) return;
      var dx = e.clientX - j.drag.x;
      var dy = e.clientY - j.drag.y;
      j.x = j.drag.ox + dx;
      if (!j.pinned && e.clientX - j.drag.x < -40) {
        j.pinned = true;
        setState("dragging mode · pinned");
      }
      j.y = j.drag.oy + dy;
      j.drag.moved = Math.max(j.drag.moved, Math.sqrt(dx * dx + dy * dy));
      clampJog(j);
      placeJog(j);
      if (knock(j)) return;
      proximity(j);
    });
    j.el.addEventListener("pointerup", function (e) {
      var d = j.drag;
      if (!d) return;
      var tap = d.moved <= 6;
      j.drag = null;
      clearTimeout(d.catch);
      if (tap) {
        if (j.pinned) { j.pinned = false; dragMode(j, false); }
        if (d.rim) activate(cursor);
        return;
      }
      drop(j, e);
      if (!j.pinned) dragMode(j, false);
    });
    j.el.addEventListener('pointercancel', function () { j.drag = null; });

    var holdAt = null;
    var holdFrom = null;
    j.el.addEventListener("pointerdown", function (e) {
      if (touchCount() > 1) return;
      if (e.target && e.target.closest && e.target.closest(".pad, .lock, .mk")) return;
      holdFrom = { x: e.clientX, y: e.clientY };
      j.holdFrom = holdFrom;
      if (holdAt) clearTimeout(holdAt);
      holdAt = setTimeout(function () { holdAt = null; openMenu(j); }, 480);
    });
    j.el.addEventListener("pointermove", function (e) {
      if (j.menu) { aimPad(j, e); return; }
      if (!holdAt || !holdFrom) return;
      if (Math.abs(e.clientX - holdFrom.x) + Math.abs(e.clientY - holdFrom.y) > 10) { clearTimeout(holdAt); holdAt = null; }
    });
    function releaseHold() {
      if (holdAt) { clearTimeout(holdAt); holdAt = null; }
      if (!j.menu) return;
      if (j.menuPad) pickPad(j, mapDir(j.menuPad));
      else { closeMenu(j); setState("ready"); }
    }
    j.el.addEventListener("pointerup", releaseHold);
    j.el.addEventListener("pointercancel", releaseHold);

    // The lock is a latch on the rim: drag it round and it takes a side; tap it
    // and it locks. Two locks that meet latch the dials together.
    var lockFrom = null;
    j.lock.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var c = centre(j);
      lockFrom = { a: Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI, moved: 0 };
      try { j.lock.setPointerCapture(e.pointerId); } catch (err) {}
    });
    j.lock.addEventListener("pointermove", function (e) {
      if (!lockFrom || pairOn) return;
      var c = centre(j);
      var a = Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI;
      var d = a - lockFrom.a;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      lockFrom.a = a;
      lockFrom.moved += Math.abs(d);
      j.lockDeg += d;
      paintJog(j);
    });
    j.lock.addEventListener("pointerup", function () {
      if (!lockFrom) return;
      var moved = lockFrom.moved;
      lockFrom = null;
      if (moved > 12) {
        j.lockDeg = Math.round(j.lockDeg / 45) * 45;
        paintJog(j);
        pattern('tick');
        setState('lock · ' + sideOf(j.lockDeg));
        return;
      }
      setLocked(j, !j.locked);
    });
    j.lock.addEventListener("pointercancel", function () { lockFrom = null; });

  }

  function drop(j, e) {
    j.drag = null;
    j.spot = { x: j.x, y: j.y };
    var edge = canvas.getBoundingClientRect();
    if (e.clientY >= edge.bottom - 46) { park(j); return; }
    var card = cardUnder(j);
    if (card && card !== j.mounted) {
      if (j.mounted) unmount(j);
      if (paired() && !jogA.mounted && !jogB.mounted && dockEnds(card)) return;
      mount(j);
      return;
    }
    if (!card && j.mounted) { unmount(j); setState('off the window'); return; }
    if (knock(j)) return;
    pattern('ready');
  }

  // ---- asking ------------------------------------------------------------

  // Cards arrive as tiles: down the board, then over to the next column when the
  // column runs out. Nothing lands on top of anything, and each keeps its size.
  function layout() {
    var b = bounds();
    var x = 10;
    var y = 10;
    var right = 0;
    cards.forEach(function (card) {
      if (y > 10 && y + card.h > b.h - 8) {
        x = right + 10;
        y = 10;
      }
      card.x = x;
      card.y = y;
      place(card);
      y += card.h + 10;
      right = Math.max(right, x + card.w);
    });
    focusCard(cards.length ? 0 : -1);
  }

  // ---- memory and snapshots -----------------------------------------------

  // Memory is what he has said in here, kept so the next answer knows his taste
  // without him repeating it. A snapshot is the turn as it stood: the ask, the
  // answer, the board. Every new one is diffed against the last, so "what
  // changed" is something the dial can answer itself.
  var MEM_KEY = 'amb.mem';
  var SNAP_KEY = 'amb.snap';

  function memLoad() {
    try {
      var raw = JSON.parse(localStorage.getItem(MEM_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (err) { return []; }
  }

  function remember(kind, text) {
    var clean = String(text == null ? '' : text).replace(/\s+/g, ' ').trim().slice(0, 240);
    if (!clean) return;
    var mem = memLoad();
    if (mem.some(function (m) { return m.text === clean; })) return;
    mem.push({ at: new Date().toISOString(), kind: kind, text: clean });
    try { localStorage.setItem(MEM_KEY, JSON.stringify(mem.slice(-40))); } catch (err) {}
  }

  function modeId() {
    var j = (typeof jogA !== 'undefined' && jogA) || (typeof jogB !== 'undefined' && jogB) || null;
    return j ? String(j.mode || 'ask') : 'ask';
  }

  function snapNow(said, answer, options) {
    return {
      at: new Date().toISOString(),
      ask: String(said || '').slice(0, 160),
      answer: String(answer || '').slice(0, 200),
      options: Number(options || 0),
      mode: modeId(),
      state: stateEl.textContent,
      pulses: pulses
    };
  }

  function snapRead() {
    try { return JSON.parse(localStorage.getItem(SNAP_KEY) || 'null'); } catch (err) { return null; }
  }

  function snapTake(said, answer, options) {
    var now = snapNow(said, answer, options);
    var prev = snapRead();
    try { localStorage.setItem(SNAP_KEY, JSON.stringify(now)); } catch (err) {}
    if (!prev) return null;
    var lines = [];
    if (prev.ask !== now.ask) lines.push('ask → ' + now.ask.slice(0, 60));
    if (prev.answer !== now.answer) lines.push('answer → ' + (now.answer ? now.answer.slice(0, 60) + '…' : 'none'));
    if (prev.options !== now.options) lines.push('options ' + prev.options + ' → ' + now.options);
    if (prev.mode !== now.mode) lines.push('mode ' + prev.mode + ' → ' + now.mode);
    if (prev.state !== now.state) lines.push(prev.state + ' → ' + now.state);
    if (now.pulses - prev.pulses > 0) lines.push((now.pulses - prev.pulses) + ' pulses');
    return lines.length ? { lines: lines, since: prev.at } : null;
  }

  // The dial looks at a page the way it asks: it sends the address with its own
  // key, the Worker keeps the page's text, and a page it has read before comes
  // back as a difference. The card is the look.
  function lookAt(url) {
    var key = dialKey();
    if (!key) { setState('look · no dial key · open with ?k='); return; }
    setState('looking · ' + String(url).slice(0, 40));
    fetch('/api/look', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-dial-token': key },
      body: JSON.stringify({ url: url })
    }).then(function (r) { return r.json().catch(function () { return null; }); }).then(function (body) {
      if (!body || !body.ok) {
        var code = body && body.error && body.error.code ? body.error.code : 'no answer';
        addCard({ tag: 'look', name: code, short: 'look ' + code, kind: 'note', text: 'Look failed: ' + code, w: 240, h: 86, x: 30, y: 300, dim: true });
        layout();
        pattern('error');
        lastCode = String(code || '');
        setState('look · ' + code);
        return;
      }
      var d = body.diff || {};
      var lines = d.same
        ? ['same as the last look', body.chars + ' chars']
        : ['+' + d.added + '   -' + d.removed]
          .concat((d.plus || []).slice(0, 6).map(function (l) { return '+ ' + l; }))
          .concat((d.minus || []).slice(0, 4).map(function (l) { return '- ' + l; }));
      var label = body.first ? 'first look' : (d.same ? 'no change' : 'page delta');
      addCard({ tag: 'look', name: label, short: body.first ? 'first look' : (d.same ? 'no change' : 'delta'), kind: 'note', text: body.url + '\n\n' + lines.join('\n'), w: 264, h: 152, x: 30, y: 300 });
      layout();
      remember('look', body.url + ' ' + (d.same ? 'same' : '+' + d.added + ' -' + d.removed));
      pattern(d.same ? 'tick' : 'ready');
      setState('look · ' + (body.first ? 'first' : d.same ? 'same' : 'changed'));
    }).catch(function () {
      addCard({ tag: 'look', name: 'offline', short: 'look offline', kind: 'note', text: 'Look: the dial could not reach the Worker.', w: 240, h: 86, x: 30, y: 300, dim: true });
      layout();
      setState('look · offline');
    });
  }

  // What a hand-off carries: the focused card, else what is typed, else nothing.
  function carryText() {
    var card = cards[cursor];
    if (card) return String(card.text || card.short || card.tag || '').slice(0, 600);
    var inMenu = document.querySelector('#pairmenu input[placeholder="say it"]');
    var typed = (inMenu && inMenu.value) || (textEl && textEl.value) || '';
    return String(typed).trim().slice(0, 600);
  }

  // Ambient is the pulse: it opens the other side's own interface, and puts what
  // he was holding into the link so the hand-off is not blank.
  // The slug is so a diagnosis knows which side it was handed to.
  var lastTo = '';

  function handOff(name, base, slug) {
    lastTo = slug || '';
    var carry = carryText();
    var url = base;
    if (carry) {
      var q = encodeURIComponent(carry);
      url = base + (base.indexOf('?') < 0 ? '?' : '&') + 'q=' + q + '#q=' + q;
    }
    window.open(url, '_blank', 'noopener');
    pattern('take');
    setState('go · ' + name + (carry ? ' · ' + carry.slice(0, 24) : ' · blank'));
  }

  // What went wrong, said plainly, then put to the truth store: she is the
  // liaison, so the diagnosis leaves the dial through her and not around her.
  var lastCode = '';

  function diagOffline(why) {
    addCard({ tag: 'diag', name: 'offline', short: 'diagnose offline', kind: 'note', text: why, w: 240, h: 86, x: 10, y: 10, dim: true });
    layout();
    setState('diagnose · offline');
  }

  function diagnose() {
    setState('diagnose · checking');
    pattern('press');
    fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ symptom: carryText(), code: lastCode, state: stateEl.textContent, to: lastTo })
    }).then(function (r) { return r.json().catch(function () { return null; }); }).then(function (body) {
      if (!body || !body.verdict) return diagOffline('The dial could not ask the Worker what is wrong.');
      var failing = (body.checks || []).filter(function (c) { return !c.ok; });
      var lines = [body.verdict];
      failing.forEach(function (c) { lines.push('- ' + c.name + ': ' + c.note); });
      var diff = body.diff;
      if (diff && diff.missing.length) {
        lines.push('', 'origin has [' + diff.origin.provides.join(', ') + '] · ' + diff.destination.name + ' reads [' + (diff.destination.reads.join(', ') || 'nothing') + ']');
        diff.edits.forEach(function (edit) { lines.push('+ ' + edit.code); });
        lines.push('blast: ' + diff.blast.radius);
        diff.checks.forEach(function (c) { lines.push('? ' + c); });
      }
      if (body.ruling && body.ruling.answer) lines.push('', 'tew · ' + body.ruling.answer);
      if (body.id) lines.push('', 'card ' + body.id + ' · key ' + (body.cap || 'diff') + ' · /api/diag?id=' + body.id + '&k=…');
      var card = addCard({ tag: 'diag', name: failing.length ? failing[0].name : 'all bound', short: 'what is wrong', kind: 'note', text: lines.join('\n'), w: 300, h: 236, x: 10, y: 10 });
      if (card) {
        card.diagId = body.id || '';
        card.diagKey = body.key || '';
      }
      layout();
      remember('diag', body.verdict.slice(0, 120));
      pattern(failing.length ? 'error' : 'tick');
      say(body.verdict);
      setState('diagnose · ' + (failing.length ? failing.length + ' failing' : 'all bound') + (diff && diff.missing.length ? ' · +' + diff.blast.lines + ' line' : '') + (body.ruling ? ' · tew' : ''));
    }).catch(function () {
      diagOffline('The dial could not reach the Worker.');
    });
  }

  // The one controller can be put away without being taken apart: the display
  // hides, the pair stands, and a puck at the corner brings it back.
  var pairHidden = false;

  function hidePair(on) {
    pairHidden = !!on;
    canvas.classList.toggle('hidepair', pairHidden);
    if (pairPeek) pairPeek.classList.toggle('on', pairHidden);
    pattern(pairHidden ? 'park' : 'ready');
    setState(pairHidden ? 'one controller · hidden' : 'one controller · back');
  }

  function ask(said) {
    if (!said || busy) return;
    thread.push({ role: 'user', content: said });
    busy = true;
    lastText = '';
    setState('asking');
    clearCards();
    textEl.value = '';
    fetch('/api/ambient', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ thread: thread.slice(), context: document.title, memory: memLoad().slice(-24), previous: snapRead(), mode: modeId() })
    }).then(function (r) { return r.json().catch(function () { return null; });     }).then(function (body) {
      busy = false;
      var text = body && typeof body.text === 'string' ? body.text : '';
      var envelope = body && body.error ? body.error : null;
      lastText = text;
      thread.push({ role: 'assistant', content: text });
      var clarify = body && body.clarify;
      var asked = clarify && clarify.questions && clarify.questions[0] ? clarify.questions[0] : null;
      clearCards();
      var via = body && body.via ? body.via : '';
      if (asked && asked.options && asked.options.length) {
        var labels = asked.options.map(function (o) {
          return o && typeof o === 'object' ? String(o.label || o.value || '') : String(o);
        });
        addCard({ tag: 'ask', name: said.slice(0, 20), short: 'ask', kind: 'note', text: asked.q || text, w: 246, h: 112, dim: true, x: 10, y: 10 });
        labels.forEach(function (label, k) {
          addCard({ tag: 'option', name: String(k + 1), short: label, kind: 'option', value: label, text: label, w: 200, h: 74, x: 14 + k * 8, y: 132 + k * 8 });
        });
        setState('options');
        pulseAsk(asked.q || 'is this okay?', labels);
      } else if (envelope) {
        // The error goes on the board, literally, with the body beside it.
        addCard({ tag: 'error', name: envelope.code || 'error', short: 'error', kind: 'note', text: literalError(envelope, body), w: 286, h: 214, x: 10, y: 10 });
        addCard({ tag: 'raw', name: 'body', short: 'raw', kind: 'note', text: rawBody(body), w: 258, h: 200, x: 24, y: 238, dim: true });
        setState('error · ' + (envelope.code || 'unknown'));
      } else if (!text) {
        addCard({ tag: 'empty', name: 'nothing came back', short: 'empty', kind: 'note', text: 'The pen returned no text and no error.', w: 250, h: 86, x: 10, y: 10, dim: true });
        setState('empty');
      } else {
        var doc = looksLikeDocument(text);
        addCard({
          tag: 'answer',
          name: via,
          short: 'answer',
          kind: 'answer',
          text: text,
          doc: doc,
          dim: doc,
          w: 260,
          h: 190,
          x: 10,
          y: 10
        });
        if (body && body.store) {
          addCard({ tag: 'store', name: body.store.layer || 'truth', short: 'store ' + (body.store.id || ''), kind: 'store', value: String(body.store.id || ''), text: String(body.store.id || ''), w: 168, h: 64, x: 22, y: 210 });
        }
        var reading = body && body.reading;
        if (reading && reading.ok && reading.files) {
          reading.files.slice(0, 3).forEach(function (f, k) {
            var path = typeof f === 'string' ? f : (f.path || f.name || '');
            if (!path) return;
            addCard({ tag: 'file', name: String(path).split('/').pop(), short: String(path).split('/').pop(), kind: 'file', value: path, text: path, w: 176, h: 60, x: 34 + k * 10, y: 286 + k * 10 });
          });
        }
        setState('answered');
      }
      layout();
      var delta = snapTake(said, text, asked && asked.options ? asked.options.length : 0);
      if (delta) {
        addCard({ tag: 'changed', name: 'since last', short: 'Δ ' + delta.lines.length, kind: 'note', text: delta.lines.join('\n'), w: 236, h: 104, x: 46, y: 320, dim: true });
        layout();
        remember('delta', delta.lines.join(' · '));
      }
      remember('ask', said);
      // An answer that names a page is a page the dial has now seen.
      var page = /https?:\/\/[^\s)"'<>]+/i.exec(text);
      if (page) lookAt(page[0].replace(/[.,;:]+$/, ''));
      pattern('ready');
      say(text.slice(0, 160));
    }).catch(function (err) {
      busy = false;
      clearCards();
      addCard({ tag: 'error', name: String(err && err.message ? err.message : 'failed'), short: 'error', kind: 'note', text: 'Offline: ' + (err && err.message ? err.message : 'failed'), w: 240, h: 90, x: 10, y: 10, dim: true });
      pattern('error');
      setState('offline');
      layout();
    });
  }

  function sendText() {
    var said = textEl.value.trim();
    if (!said) { setState('nothing to send'); return; }
    ask(said);
  }

  // ---- calling up cards ---------------------------------------------------

  // A deck is cards he already owns, read from the store and laid out like any
  // other card. Nothing is asked of her and nothing is written: the question and
  // its answer are the card, as they stand.
  function callCards(id) {
    var said = textEl.value.trim();
    var want = id || (/^[A-Za-z0-9_-]{6,64}$/.test(said) ? said : (deckId() || DEFAULT_DECK));
    if (!want) { setState('cards · no deck'); return; }
    setState('cards · ' + want);
    cardsBtn.classList.add('held');
    fetch('/api/cards?deck=' + encodeURIComponent(want)).then(function (r) { return r.json().catch(function () { return null; }); }).then(function (body) {
      cardsBtn.classList.remove('held');
      clearCards();
      var got = body && body.ok ? body.cards || [] : [];
      if (body && body.ok) {
        textEl.value = '';
        setDeck(want);
        got.forEach(function (c) {
          var text = String(c.a || '');
          addCard({
            tag: 'deck',
            name: String(c.q || '').slice(0, 40),
            short: String(c.q || ('card ' + (got.indexOf(c) + 1))).slice(0, 14),
            kind: 'answer',
            text: text,
            doc: looksLikeDocument(text),
            dim: looksLikeDocument(text),
            w: 260,
            h: 190,
            x: 10,
            y: 10
          });
        });
        layout();
        pattern('ready');
        setState('cards · ' + want + ' · ' + got.length);
        return;
      }
      // A miss is a card, with its code on it. The board is not left holding the
      // cards of a call that failed.
      var err = (body && body.error) || {};
      addCard({
        tag: 'deck',
        name: want,
        short: 'cards',
        kind: 'note',
        text: String(err.code || 'failed') + (err.message ? '\n' + String(err.message) : ''),
        w: 250,
        h: 100,
        x: 10,
        y: 10,
        dim: true
      });
      layout();
      pattern('error');
      setState('cards · ' + (err.code || 'failed'));
    }).catch(function () {
      cardsBtn.classList.remove('held');
      clearCards();
      addCard({ tag: 'deck', name: 'offline', short: 'cards', kind: 'note', text: 'deck ' + want + ' did not answer', w: 240, h: 86, x: 10, y: 10, dim: true });
      layout();
      pattern('error');
      setState('cards · offline');
    });
  }

  // ---- cards from cards ---------------------------------------------------

  // One card, worked on by the store: the ops take what is on the card and write
  // what comes next. Nothing leaves the board — the card he held stays, and what
  // came out of it lands beside it.
  function growCard(card, op) {
    if (!card || !card.chin) return;
    var body = String(card.text || '');
    if (!body.trim()) { setState('grow · that card is empty'); pattern('error'); return; }
    var opener = card.short || card.tag || '';
    var payload = {
      op: op,
      card: { q: String(card.name || opener).slice(0, 600), a: body }
    };
    if (op === 'merge') {
      var mate = null;
      for (var i = 0; i < cards.length; i += 1) {
        if (cards[i] !== card && String(cards[i].text || '').trim()) mate = cards[i];
      }
      if (!mate) { setState('merge · needs a second card'); pattern('error'); return; }
      payload.cards = [
        { q: String(card.name || opener).slice(0, 600), a: body },
        { q: String(mate.name || mate.short || 'card').slice(0, 600), a: String(mate.text || '') }
      ];
    }
    card.chin.classList.remove('open');
    setState('grow · ' + op);
    card.el.classList.add('win');
    fetch('/api/cards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().catch(function () { return null; }); }).then(function (res) {
      var got = res && res.ok ? res.cards || [] : [];
      if (res && res.ok && got.length) {
        got.forEach(function (c) {
          var text = String(c.a || '');
          addCard({
            tag: 'grow',
            name: op + (c.q ? ' · ' + String(c.q).slice(0, 30) : ''),
            short: String(c.q || op).slice(0, 14),
            kind: 'answer',
            text: text,
            doc: looksLikeDocument(text),
            dim: looksLikeDocument(text),
            w: 260,
            h: 190,
            x: 10,
            y: 10
          });
        });
        layout();
        pattern('ready');
        // The provider line names what actually answered, so nothing here is
        // claimed on the strength of what was asked for.
        setState('grow · ' + op + ' · ' + got.length + (res.provider ? ' · ' + res.provider : ''));
        return;
      }
      var err = (res && res.error) || {};
      addCard({
        tag: 'grow',
        name: op,
        short: op,
        kind: 'note',
        text: String(err.code || 'failed') + (err.message ? '\n' + String(err.message) : ''),
        w: 250,
        h: 100,
        x: 10,
        y: 10,
        dim: true
      });
      layout();
      pattern('error');
      setState('grow · ' + (err.code || 'failed'));
    }).catch(function () {
      addCard({ tag: 'grow', name: op, short: op, kind: 'note', text: op + ' did not answer', w: 240, h: 86, x: 10, y: 10, dim: true });
      layout();
      pattern('error');
      setState('grow · offline');
    });
  }

  // ---- composer and the mark ---------------------------------------------

  var sendHold = null;
  var sendFired = false;
  var markHold = null;
  var markFired = false;

  sendBtn.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    sendFired = false;
    sendBtn.classList.add('held');
    sendHold = setTimeout(function () {
      sendFired = true;
      show(jogA, !jogA.open);
      if (jogA.open) setState('jog · hold the rim for another color');
      if (!taught) { taught = true; coachShow(0); setState('intro 1 of ' + COACH.length); }
    }, 430);
  });
  sendBtn.addEventListener('pointerup', function () {
    sendBtn.classList.remove('held');
    if (sendHold) { clearTimeout(sendHold); sendHold = null; }
    if (!sendFired) sendText();
  });
  sendBtn.addEventListener('pointercancel', function () {
    sendBtn.classList.remove('held');
    if (sendHold) { clearTimeout(sendHold); sendHold = null; }
  });

  markBtn.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    markFired = false;
    markBtn.classList.add('held');
    markHold = setTimeout(function () {
      markFired = true;
      if (jogB.open) { park(jogB); return; }
      // The second wheel only comes from the wheel menu: aim right for double.
      setState('double wheel: hold the wheel, aim right');
    }, 520);
  });
  markBtn.addEventListener('pointerup', function () {
    markBtn.classList.remove('held');
    if (markHold) { clearTimeout(markHold); markHold = null; }
    if (!markFired) setState('hold the mark for a second jog');
  });
  markBtn.addEventListener('pointercancel', function () {
    markBtn.classList.remove('held');
    if (markHold) { clearTimeout(markHold); markHold = null; }
  });

  textEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); sendText(); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (sheet.classList.contains('open')) { closeSheet(); return; }
      if (jogA.open) park(jogA);
      if (jogB.open) park(jogB);
    }
  });

  sheetClose.addEventListener('click', closeSheet);

  voiceBtn.addEventListener('click', function () {
    voice = !voice;
    voiceBtn.setAttribute('aria-pressed', String(voice));
    if (!voice && 'speechSynthesis' in window) speechSynthesis.cancel();
  });

  // the haptics switch doubles as the color key: tap toggles feel, hold walks modes
  var feelHold = null;
  var feelFired = false;
  feelBtn.addEventListener('pointerdown', function (e) {
    feelFired = false;
    feelBtn.classList.add('held');
    feelHold = setTimeout(function () {
      feelFired = true;
      var j = lastTouched && lastTouched.open ? lastTouched : (jogA.open ? jogA : null);
      if (!j) { setState('no jog up'); feelBtn.classList.remove('held'); return; }
      cycleMode(j);
      setState('mode · ' + j.mode);
    }, 430);
  });
  feelBtn.addEventListener('pointerup', function () {
    feelBtn.classList.remove('held');
    if (feelHold) { clearTimeout(feelHold); feelHold = null; }
    if (feelFired) return;
    feel = !feel;
    feelBtn.setAttribute('aria-pressed', String(feel));
    if (!feel && typeof navigator.vibrate === 'function') navigator.vibrate([]);
  });
  feelBtn.addEventListener('pointercancel', function () {
    feelBtn.classList.remove('held');
    if (feelHold) { clearTimeout(feelHold); feelHold = null; }
  });

  cardsBtn.addEventListener('click', function () { callCards(); });

  modelBtn.addEventListener('click', function () { renderModels(); });
  sheetBody.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('button[data-mpick]') : null;
    if (!b) return;
    e.stopPropagation();
    var bits = String(b.getAttribute('data-mpick') || '').split('|');
    var named = b.querySelector('span');
    pickModel(bits[0], bits.slice(1).join('|'), named ? named.textContent : '');
  });
  loadModels();

  setInterval(function () {
    var ua = navigator.userAgent;
    var platform = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : 'desktop';
    var up = jogs.filter(function (j) { return j.open; }).length;
    meterEl.textContent = [platform, typeof navigator.vibrate === 'function' ? 'motor' : 'no motor', pulses + ' pulses', up + ' up'].join(' · ');
  }, 1500);

  // ---- how the joined body is held ----------------------------------------

  // Two fingers carry it; three fingers are a press for its menu and a twist for
  // turning it. One finger is still a turn, so nothing here fires on a single
  // pointer.
  var pointers = {};
  var carrying = false;
  var press3 = null;
  var bottomDocked = false;
  var menuOff = false;

  function touchCount() { return Object.keys(pointers).length; }

  function pairShift(dx, dy, from) {
    var bb = bounds();
    var box = boxesFor(from.ax, from.ay, from.bx, from.by);
    dx = Math.max(-box.x - 6, Math.min(bb.w - box.x - box.w + 6, dx));
    dy = Math.max(-box.y - 6, Math.min(bb.h - box.y - box.h + 6, dy));
    jogA.x = from.ax + dx;
    jogA.y = from.ay + dy;
    jogB.x = from.bx + dx;
    jogB.y = from.by + dy;
    placeJog(jogA);
    placeJog(jogB);
    placePairBody();
    placePairMenu();
    // Carried back up out of the dock it lets go; docking itself waits for the
    // release, so a carry is never taken over mid-drag.
    var floor = Math.max(jogA.y + jogA.h, jogB.y + jogB.h);
    if (bottomDocked && floor < bb.h - 160) undockBottom();
  }

  // Docked, the joined body is a full-width controller at the bottom of the
  // board: two halves side by side, its menu above them.
  function dockBottom() {
    if (!paired() || bottomDocked) return;
    var bb = bounds();
    bottomDocked = true;
    carrying = false;
    pairDrag = null;
    if (bb.w < 640) {
      // Portrait: one button on each side of the phone, level at the bottom.
      jogA.x = 8;
      jogB.x = bb.w - jogB.w - 8;
      jogA.y = bb.h - jogA.h - 10;
      jogB.y = bb.h - jogB.h - 10;
    } else {
      jogA.x = Math.max(8, (bb.w - (jogA.w + jogB.w + 14)) / 2);
      jogA.y = bb.h - Math.max(jogA.h, jogB.h) - 12;
      jogB.x = jogA.x + jogA.w + 14;
      jogB.y = jogA.y + (jogA.h - jogB.h) / 2;
    }
    placeJog(jogA);
    placeJog(jogB);
    placePairBody();
    placePairMenu();
    pattern('park');
    setState(bb.w < 640 ? 'docked · one each side' : 'docked · full width');
  }

  function undockBottom() {
    if (!bottomDocked) return;
    bottomDocked = false;
    placePairBody();
    placePairMenu();
  }

  function centroid() {
    var pts = Object.keys(pointers).map(function (k) { return pointers[k]; });
    if (!pts.length) return null;
    var cx = 0;
    var cy = 0;
    var on = true;
    pts.forEach(function (p) { cx += p.x; cy += p.y; on = on && p.on; });
    return { x: cx / pts.length, y: cy / pts.length, n: pts.length, on: on };
  }

  // Two fingers carry it; both have to be on the joined body, or be parked on the
  // menu or a card, where a finger is a press.
  function startCarry() {
    var c = centroid();
    if (carrying || pairDrag || press3 || !paired() || !c) return;
    if (c.n < 2 || !c.on) return;
    pairGrip(c.x, c.y);
    carrying = true;
    jogA.turn = null;
    jogB.turn = null;
    jogA.drag = null;
    jogB.drag = null;
    pattern('grab');
    setState('two fingers · moving');
  }

  // A detent of the joined controller is a card, not a number: the turn moves the
  // focus, and both halves show the same detent.
  function stepFocus(dir) {
    if (!cards.length) { setState('no cards to turn through'); return; }
    var k = ((cursor + dir) % cards.length + cards.length) % cards.length;
    focusCard(k);
    say(cards[k].short || cards[k].tag || 'card');
    setState('card ' + (k + 1) + ' of ' + cards.length);
  }

  // A twist with three fingers turns the joined controller detent by detent, both
  // halves together, and each detent it crosses steps the cards.
  function pairTurn(p3, deg) {
    var step = Math.round(deg / STEP);
    if (step === p3.step) return;
    var away = step - p3.step;
    p3.step = step;
    if (!away) return;
    jogA.deg = p3.base + step * STEP;
    jogB.deg = jogA.deg;
    jogA.slot = (((p3.base / STEP + step) % DETENTS) + DETENTS) % DETENTS;
    jogB.slot = jogA.slot;
    paintJog(jogA);
    paintJog(jogB);
    pattern('detent');
    stepFocus(away > 0 ? 1 : -1);
  }

  // Three fingers held still are a press for the menu; the angle they sit at is
  // the zero the twist is measured from, so choosing between the two is distance.
  function startPress3() {
    if (press3 || carrying || pairDrag || !paired()) return;
    var c = centroid();
    if (!c || c.n < 3 || !c.on) return;
    var a = jogA.el.getBoundingClientRect();
    var b = jogB.el.getBoundingClientRect();
    var px = (a.left + a.width / 2 + b.left + b.width / 2) / 2;
    var py = (a.top + a.height / 2 + b.top + b.height / 2) / 2;
    press3 = {
      x: c.x,
      y: c.y,
      px: px,
      py: py,
      a0: Math.atan2(c.y - py, c.x - px) * 180 / Math.PI,
      at: Date.now(),
      turned: 0,
      moved: 0,
      // The twist is measured from where the rings already are, and every detent
      // it crosses is one card.
      base: jogA.deg,
      step: 0
    };
    setState('three fingers · press or twist');
  }

  function twistMove() {
    var c = centroid();
    if (!press3 || !c) return;
    press3.moved = Math.max(press3.moved, Math.abs(c.x - press3.x) + Math.abs(c.y - press3.y));
    var a = Math.atan2(c.y - press3.py, c.x - press3.px) * 180 / Math.PI;
    var d = a - press3.a0;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    if (Math.abs(d - press3.turned) < STEP) return;
    press3.turned = d;
    pairTurn(press3, d);
  }

  // Sizing is the menu's job now, in steps, since two fingers are the carry.
  function pairStep(d) {
    if (!paired()) return;
    var px = Math.max(80, Math.min(160, jogA.w + d));
    sizeJog(jogA, px);
    sizeJog(jogB, px);
    clampJog(jogA);
    clampJog(jogB);
    placeJog(jogA);
    placeJog(jogB);
    placePairBody();
    renderPairMenu();
    pattern('tick');
    setState('size · ' + px);
  }

  function bindPairGestures() {
    canvas.addEventListener('pointerdown', function (e) {
      pointers[e.pointerId] = {
        x: e.clientX,
        y: e.clientY,
        on: !!(e.target && e.target.closest && e.target.closest('.jog'))
      };
      var n = Object.keys(pointers).length;
      if (!paired()) return;
      if (n >= 3) {
        // A third finger is not a third of a drag: it takes the body off the
        // carry and starts a press, which is either the menu or a twist.
        if (carrying) {
          carrying = false;
          pairDrag = null;
          jogA.spot = { x: jogA.x, y: jogA.y };
          jogB.spot = { x: jogB.x, y: jogB.y };
        }
        startPress3();
        return;
      }
      if (n === 2) startCarry();
    }, true);
    canvas.addEventListener('pointermove', function (e) {
      var p = pointers[e.pointerId];
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;
      if (!paired()) return;
      if (press3) { twistMove(); return; }
      startCarry();
      var c = centroid();
      if (!carrying || !pairDrag || !c) return;
      pairShift(c.x - pairDrag.x, c.y - pairDrag.y, pairDrag);
    }, true);
    function endPointer(e) {
      if (!pointers[e.pointerId]) return;
      delete pointers[e.pointerId];
      var n = Object.keys(pointers).length;
      if (carrying && n < 2) {
        carrying = false;
        pairRelease();
      }
      if (!press3 || n >= 3) return;
      // Three fingers that neither turned it nor travelled are a press: the menu.
      var held = press3;
      press3 = null;
      if (Math.abs(held.turned) >= STEP || held.moved >= 30 || Date.now() - held.at >= 700) return;
      menuOff = !menuOff;
      renderPairMenu();
      pattern(menuOff ? 'park' : 'ready');
      setState(menuOff ? 'menu down' : 'menu up');
    }
    canvas.addEventListener('pointerup', endPointer, true);
    canvas.addEventListener('pointercancel', endPointer, true);
  }

  jogA = makeJog('a', 'ask');
  jogB = makeJog('b', 'see');
  var pairBody = document.createElement('div');
  pairBody.id = 'pairbody';
  canvas.appendChild(pairBody);
  var pairMenu = document.createElement('div');
  pairMenu.id = 'pairmenu';
  canvas.appendChild(pairMenu);
  var pairPeek = document.createElement('div');
  pairPeek.id = 'pairpeek';
  pairPeek.textContent = '\u25CB';
  pairPeek.addEventListener('click', function () { hidePair(false); });
  canvas.appendChild(pairPeek);
  bindPairGestures();
  paintAll();
})();
</script>
</body>
</html>`;
