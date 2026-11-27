import DIAL from "./dial.js";
import LAB from "./lab.js";
// Every text model the account can run, read from its own API. The store keeps a
// shortlist; this is the rest of what it can be told to call.
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
// src/worker.js
var CLIENT = String.raw`(function () {
  if (window.__ambientMounted) return;
  window.__ambientMounted = true;

  var me = document.currentScript || document.querySelector('script[data-ambient]');
  var accent = (me && me.dataset && me.dataset.accent) || '#4a9eff';
  var title = (me && me.dataset && me.dataset.title) || 'Ambient';
  var render = Boolean(me && me.dataset && me.dataset.render === 'true');
  var endpoint = (me && me.dataset && me.dataset.endpoint) || new URL('/api/ambient', me.src).toString();
  var shows = Boolean(me && me.dataset && me.dataset.shows !== 'false');
  // TRNV's skin, asked for by the page that carries it. Absent, the dock is what
  // every other host gets.
  var skin = (me && me.dataset && me.dataset.skin) || '';
  // The wheels from the dial, carried into the dock. Asked for explicitly, because a
  // host that never asked should not get a second way to do what the panel does.
  var wheels = Boolean(me && me.dataset && me.dataset.wheels === 'true');
  // A surface, not a corner of one. The deck takes the whole viewport and gives
  // the page back when it is closed.
  var layout = (me && me.dataset && me.dataset.layout) || '';

  var thread = [];
  var files = [];
  var busy = false;
  // Her own voice: switched here, remembered here.
  var spoken = null;
  function voiceOn() { try { return localStorage.getItem('amb.voice') === 'on'; } catch (err) { return false; } }
  function setVoice(on) { try { localStorage.setItem('amb.voice', on ? 'on' : 'off'); } catch (err) {} }
  function speak(text) {
    if (!voiceOn() || !text) return;
    // The voice is the device's, not ours: Aura and the dock both speak with it.
    if (!('speechSynthesis' in window)) return;
    try { window.speechSynthesis.cancel(); } catch (err) {}
    var said = new SpeechSynthesisUtterance(String(text).slice(0, 2000));
    said.rate = 1;
    spoken = said;
    window.speechSynthesis.speak(said);
  }

  var css = [
    '.amb-dock{position:fixed;right:16px;bottom:16px;z-index:2147483000;display:flex;flex-direction:column;gap:8px;align-items:flex-end;font:13px/1.5 system-ui,-apple-system,sans-serif}',
    '.amb-panel{width:min(360px,92vw);background:#171a20;border:1px solid #2a2f38;border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,.45);overflow:hidden;display:none;flex-direction:column;max-height:min(70vh,520px)}',
    '.amb-panel.open{display:flex}',
    '.amb-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #2a2f38;color:#e6e9ef}',
    '.amb-head strong{flex:1;font-size:12px;letter-spacing:.08em;text-transform:uppercase}',
    '.amb-head .amb-badge{background:var(--amb-accent);color:#04121f;font-weight:700;font-size:9px;letter-spacing:.08em;padding:2px 6px;border-radius:999px}',
    '.amb-thread{flex:1;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px}',
    '.amb-turn{border-radius:10px;padding:8px 10px;white-space:pre-wrap;word-break:break-word}',
    '.amb-turn.user{background:#1e2a3a;border:1px solid #2a3f5a;color:#dfe9f7;align-self:flex-end;max-width:88%}',
    '.amb-turn.bot{background:#141821;border:1px solid #232833;color:#e6e9ef;align-self:flex-start;max-width:92%}',
    '.amb-turn.bot{border-left:3px solid var(--amb-accent)}',
    '.amb-files{display:none;flex-wrap:wrap;gap:6px;padding:8px 12px 0}',
    '.amb-chip{display:inline-flex;align-items:center;gap:6px;background:#1e222a;border:1px solid #2a2f38;border-radius:999px;padding:2px 8px;font-size:11px;color:#cfd6e1}',
    '.amb-chip button{background:none;border:none;color:#9aa4b2;cursor:pointer;padding:0 2px;font-size:13px}',
    '.amb-row{display:flex;gap:6px;padding:10px 12px;border-top:1px solid #2a2f38;align-items:stretch}',
    '.amb-input{flex:1;resize:none;min-height:38px;max-height:110px;background:#0d0d1a;color:#e6e9ef;border:1px solid #2a2f38;border-radius:10px;padding:9px 10px;font:inherit}',
    '.amb-input:focus{outline:none;border-color:var(--amb-accent)}',
    '.amb-btns{display:flex;gap:8px;align-items:center;background:#171a20;border:1px solid #2a2f38;border-radius:999px;padding:6px;box-shadow:0 10px 24px rgba(0,0,0,.4)}',
    '.amb-round{width:38px;height:38px;border-radius:50%;border:1px solid #2a2f38;background:#1e222a;color:#e6e9ef;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}',
    '.amb-round:hover{border-color:var(--amb-accent)}',
    '.amb-round.rec{background:#d32f2f;border-color:#d32f2f;color:#fff}',
    '.amb-round.send{background:var(--amb-accent);border-color:var(--amb-accent);color:#04121f;font-weight:700}',
    '.amb-bar{height:2px;background:transparent}',
    '.amb-bar.on{background:linear-gradient(90deg,transparent,var(--amb-accent),transparent);animation:amb-slide 1.1s linear infinite;background-size:200% 100%}',
    '@keyframes amb-slide{0%{background-position:0% 0}100%{background-position:200% 0}}',
    '.amb-verdict{display:flex;gap:6px;margin-top:8px;align-items:center}',
    '.amb-vbtn{background:#1e222a;border:1px solid #2a2f38;border-radius:8px;color:#cfd6e1;font:inherit;font-size:11px;padding:3px 9px;cursor:pointer}',
    '.amb-vbtn:hover{border-color:var(--amb-accent);color:#fff}',
    '.amb-vinput{flex:1;min-width:0;background:#0d0d1a;border:1px solid #2a2f38;border-radius:8px;color:#e6e9ef;font:inherit;font-size:11px;padding:4px 8px}',
    '.amb-vinput:focus{outline:none;border-color:var(--amb-accent)}',
    '.amb-vnote{font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.55}',
    '.amb-cards{display:flex;flex-direction:column;gap:12px;padding:12px 0}',
    '.amb-card{border:1px solid var(--amb-accent);border-radius:10px;background:#141821;color:#e6e9ef;padding:12px;box-shadow:0 0 0 1px rgba(74,158,255,.18)}',
    '.amb-card .amb-q{font-size:11px;opacity:.55;margin-bottom:6px}',
    '.amb-card .amb-a{white-space:pre-wrap}',
    '.amb-alert{display:flex;flex-direction:column;gap:4px;border-left:3px solid var(--amb-accent);border-radius:8px;background:#141821;padding:8px 10px;color:#e6e9ef}',
    '.amb-alert.l2{border-left-color:#e0a800}',
    '.amb-alert.l3{border-left-color:#e8622c;box-shadow:0 0 0 1px rgba(232,98,44,.35)}',
    '.amb-alert.l4{border-left-color:#d32f2f;box-shadow:0 0 0 1px rgba(211,47,47,.45)}',
    '.amb-alert .amb-lvl{font-size:9px;letter-spacing:.12em;text-transform:uppercase;opacity:.6}',
    '.amb-alert .amb-part{font-size:11px;line-height:1.45}',
    '.amb-alert .amb-part b{font-weight:600;opacity:.65;letter-spacing:.04em;text-transform:uppercase;font-size:9px;margin-right:5px}',
    '.amb-alert .amb-x{align-self:flex-end;background:none;border:none;color:#9aa4b2;font-size:11px;cursor:pointer;padding:0}',
    '.amb-turn.err{border-left-color:#d32f2f;color:#ffd7d7}',
    '.amb-round.alert{background:#d32f2f;border-color:#d32f2f;color:#fff}',
    // The jog, in the dock: the same detents, the same pulse, sized to sit above
    // the input row. Opt-in, so a host that wants only the panel keeps only the panel.
    '.amb-jogbar{display:flex;align-items:center;gap:10px;padding:8px 12px 0;border-top:1px solid #2a2f38}',
    '.amb-skin-trnv .amb-jogbar{border-top:1px solid #161d28;padding:8px 10px 0}',
    '.amb-wheel{position:relative;width:88px;height:88px;flex:0 0 auto;border-radius:50%;background:radial-gradient(circle at 50% 38%,#0d131c 0 55%,#06090e 56% 100%);border:1px solid #2a2f38;touch-action:none;user-select:none;-webkit-user-select:none}',
    '.amb-skin-trnv .amb-wheel{border-color:#1b2230}',
    '.amb-wheel .rotor{position:absolute;inset:0;border-radius:50%;cursor:grab}',
    '.amb-wheel .tick{position:absolute;left:50%;top:3px;width:1.5px;height:5px;margin-left:-.75px;background:#1e2734;border-radius:1px;transform-origin:50% 41px}',
    '.amb-wheel .tick.on{background:var(--amb-accent);height:9px;top:1px}',
    '.amb-wheel .core{position:absolute;inset:15px;border-radius:50%;background:linear-gradient(#0a0f16,#06090e);border:1px solid #1e2734;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;text-align:center;padding:4px;cursor:pointer;font:9px/1.15 ui-monospace,SFMono-Regular,Menlo,monospace;color:#dbe3ef}',
    '.amb-wheel .core .sub{font:6.5px/1 var(--mono,ui-monospace);letter-spacing:.14em;text-transform:uppercase;color:#59616f}',
    '.amb-jog-read{flex:1;font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:#8a93a3}',
    '.amb-jog-read b{color:#dbe3ef;font-weight:600}',
    '.amb-turn.amb-jogged{outline:1px solid var(--amb-accent);outline-offset:2px}',
    '@media (max-width:520px){.amb-panel{width:92vw}}',
    '.amb-choice{display:block;width:100%;text-align:left;margin:4px 0 0;padding:7px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#dbe3ef;font:inherit;font-size:13px;cursor:pointer}',
    '.amb-read{display:flex;gap:7px;align-items:baseline;margin-top:8px;border-top:1px solid rgba(255,255,255,.08);padding-top:6px;font:10px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace}',
    '.amb-rk{flex:none;width:34px;white-space:nowrap;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#59616f}',
    '.amb-rv{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#aeb7c6}',
    '.amb-doc{display:block;width:100%;height:340px;border:1px solid rgba(255,255,255,.14);border-radius:8px;background:#fff}',
    '.amb-deck-screen{display:none}',
    '.amb-layout-deck{position:fixed;inset:0;padding:0;gap:0;align-items:stretch;background:#05070a}',
    '.amb-layout-deck.amb-dock .amb-panel{width:100%;height:100%;max-height:none;border:0;border-radius:0;box-shadow:none}',
    '.amb-layout-deck .amb-head{height:52px;flex:none;padding:0 14px;gap:10px}',
    '.amb-layout-deck .amb-head strong{font-size:11px;letter-spacing:.24em}',
    '.amb-layout-deck .amb-thread{flex:1;padding:14px 16px;gap:12px}',
    '.amb-layout-deck .amb-turn{font-size:13px;line-height:1.45}',
    '.amb-layout-deck .amb-doc{height:min(54vh,520px)}',
    '.amb-layout-deck .amb-row{padding:12px 14px}',
    '.amb-layout-deck .amb-input{min-height:52px;font-size:13px}',
    '.amb-layout-deck .amb-choice{padding:10px 12px;font-size:12px;margin-top:6px}',
    '.amb-layout-deck [data-act="open"]{display:none}',
    '.amb-layout-deck .amb-deck-screen{display:grid;flex:none;gap:1px;padding:8px 14px 10px;border-bottom:1px solid #161d28;font:9.5px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;color:#8a93a3}',
    '.amb-deck-screen .srow{display:flex;align-items:baseline;gap:7px;min-width:0}',
    '.amb-deck-screen .sk{flex:none;width:40px;font-size:7.5px;letter-spacing:.14em;text-transform:uppercase;color:#59616f}',
    '.amb-deck-screen .sv{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#aeb7c6}',
    '.amb-skin-trnv .amb-deck-screen{border-bottom:1px solid #161d28}'
  ];
  // The wheel's surface, on the ambient page only: the same near-black bezel,
  // hairline rows and mono readings the screen uses, so the dock sits on that
  // build instead of reading as a second, rounder thing laid over it.
  if (skin === 'trnv') css = css.concat([
    '.amb-skin-trnv .amb-panel{width:min(340px,92vw);background:linear-gradient(#080b10,#05070a);border:1px solid #1b2230;border-radius:18px;box-shadow:0 18px 40px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.03);color:#aeb7c6}',
    '.amb-skin-trnv .amb-head{padding:9px 12px;border-bottom:1px solid #161d28}',
    '.amb-skin-trnv .amb-head strong{font-size:10px;letter-spacing:.18em;color:#aeb7c6}',
    '.amb-skin-trnv .amb-head .amb-badge{background:#0b0f15;border:1px solid #1b2230;color:var(--amb-accent);font-weight:600;font-size:7.5px;letter-spacing:.14em;padding:2px 6px}',
    '.amb-skin-trnv .amb-thread{padding:9px 11px;gap:7px}',
    '.amb-skin-trnv .amb-turn{font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;border-radius:8px;padding:6px 8px}',
    '.amb-skin-trnv .amb-turn.user{background:#0b0f15;border:1px solid #1b2230;color:#8a93a3;max-width:92%}',
    '.amb-skin-trnv .amb-turn.bot{background:transparent;border:0;border-left:2px solid var(--amb-accent);border-radius:0;padding:2px 0 2px 8px;color:#dbe3ef;max-width:96%}',
    '.amb-skin-trnv .amb-files{padding:8px 11px 0}',
    '.amb-skin-trnv .amb-chip{background:#0b0f15;border:1px solid #1b2230;color:#8a93a3;font-size:10px}',
    '.amb-skin-trnv .amb-row{padding:8px 10px;border-top:1px solid #161d28}',
    '.amb-skin-trnv .amb-input{background:#05070a;border:1px solid #1b2230;border-radius:10px;color:#aeb7c6;font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}',
    '.amb-skin-trnv .amb-input:focus{border-color:#2b3a52}',
    '.amb-skin-trnv .amb-btns{background:transparent;border:0;padding:0;box-shadow:none}',
    '.amb-skin-trnv .amb-round{width:32px;height:32px;border-radius:9px;background:#0b0f15;border:1px solid #1b2230;color:#8a93a3}',
    '.amb-skin-trnv .amb-round:hover{border-color:#2b3a52}',
    '.amb-skin-trnv .amb-round.send{background:var(--amb-accent);border-color:var(--amb-accent);color:#04121f;font-weight:700}',
    '.amb-skin-trnv .amb-choice{background:#0b0f15;border:1px solid #1b2230;color:#aeb7c6;font:10.5px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;padding:6px 8px}',
    '.amb-skin-trnv .amb-choice:hover{border-color:#2b3a52;color:#dbe3ef}',
    '.amb-skin-trnv .amb-bar{height:1px}',
    '.amb-skin-trnv .amb-vbtn{background:#0b0f15;border:1px solid #1b2230;color:#8a93a3;border-radius:8px;font-size:10px}',
    '.amb-skin-trnv .amb-vinput{background:#05070a;border:1px solid #1b2230;border-radius:8px;color:#aeb7c6;font-size:10px}',
    '.amb-skin-trnv .amb-vnote{color:#59616f;font-size:8px;letter-spacing:.14em}',
    '.amb-skin-trnv .amb-alert{background:#0b0f15;border:0;border-left:2px solid var(--amb-accent);border-radius:0;padding:6px 8px}',
    '.amb-skin-trnv .amb-read{margin-top:7px;border-top:1px solid #161d28;padding-top:6px}',
    '.amb-skin-trnv .amb-rk{color:#59616f}',
    '.amb-skin-trnv .amb-rv{color:#dbe3ef}',
    '.amb-skin-trnv .amb-doc{border:1px solid #1b2230;border-radius:8px;background:#fff}'
  ]);

  var style = document.createElement('style');
  style.textContent = css.join('\n');
  document.head.appendChild(style);

  var dock = document.createElement('div');
  dock.className = 'amb-dock' + (skin === 'trnv' ? ' amb-skin-trnv' : '') + (layout === 'deck' ? ' amb-layout-deck' : '');
  dock.style.setProperty('--amb-accent', accent);
  dock.innerHTML =
    '<div class="amb-panel" role="dialog" aria-label="' + title + '">' +
      '<div class="amb-head"><strong>' + title + '</strong><span class="amb-badge">AMBIENT</span>' +
        '<button class="amb-round" data-act="close" title="Close" style="width:26px;height:26px;border-radius:8px">×</button></div>' +
      '<div class="amb-deck-screen" aria-hidden="true">' +
        '<div class="srow"><span class="sk">ask</span><span class="sv" data-k="ask">—</span></div>' +
        '<div class="srow"><span class="sk">via</span><span class="sv" data-k="via">—</span></div>' +
        '<div class="srow"><span class="sk">store</span><span class="sv" data-k="store">—</span></div>' +
        '<div class="srow"><span class="sk">trnv</span><span class="sv" data-k="trnv">—</span></div>' +
      '</div>' +
      '<div class="amb-bar"></div>' +
      '<div class="amb-thread"></div>' +
      '<div class="amb-files"></div>' +
      '<input type="file" multiple style="display:none">' +
      (wheels ? '<div class="amb-jogbar"><div class="amb-wheel" data-jog><div class="rotor"></div><div class="core" data-jog-core><span data-jog-detent>0</span><span class="sub">jog</span></div></div>' +
        '<div class="amb-jog-read"><div data-jog-line>turn the wheel</div><div data-jog-note></div></div></div>' : '') +
      '<div class="amb-row">' +
        '<textarea class="amb-input" rows="1" placeholder="Type, say, or attach something"></textarea>' +
      '</div>' +
      '<div class="amb-row" style="border-top:none;padding-top:0">' +
        '<div class="amb-btns" style="margin-left:auto">' +
          '<button class="amb-round" data-act="dictate" title="Speak">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/></svg></button>' +
          '<button class="amb-round" data-act="attach" title="Attach a file">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 6"/></svg></button>' +
          '<button class="amb-round send" data-act="send" title="Send">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg></button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<button class="amb-round" data-act="open" title="Open ' + title + '" style="width:46px;height:46px">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 1 1-3-6.2"/><path d="M21 4v5h-5"/></svg></button>';
  document.body.appendChild(dock);

  var panel = dock.querySelector('.amb-panel');
  var openBtn = dock.querySelector('[data-act="open"]');
  var threadBox = dock.querySelector('.amb-thread');
  var input = dock.querySelector('.amb-input');
  var fileInput = dock.querySelector('input[type=file]');
  var chips = dock.querySelector('.amb-files');
  var bar = dock.querySelector('.amb-bar');
  if (wheels) mountJog();
  // The voice switch sits in the head, one tap from any answer.
  var voiceBtn = document.createElement('button');
  voiceBtn.className = 'amb-round';
  voiceBtn.setAttribute('data-act', 'voice');
  voiceBtn.title = 'Voice';
  voiceBtn.textContent = voiceOn() ? 'voice on' : 'voice off';
  voiceBtn.style.cssText = 'width:auto;height:26px;border-radius:8px;padding:0 8px;font-size:10px';
  var head = dock.querySelector('.amb-head');
  if (head && head.lastElementChild) head.insertBefore(voiceBtn, head.lastElementChild);
  // Whether she may speak up on her own. Ambient, not chatty.
  var watchBtn = document.createElement('button');
  watchBtn.className = 'amb-round';
  watchBtn.setAttribute('data-act', 'watch');
  watchBtn.title = 'Watch the page';
  watchBtn.textContent = watchOn() ? 'watch on' : 'watch off';
  watchBtn.style.cssText = 'width:auto;height:26px;border-radius:8px;padding:0 8px;font-size:10px';
  if (head && head.lastElementChild) head.insertBefore(watchBtn, head.lastElementChild);

  function open(force) {
    var on = force === undefined ? !panel.classList.contains('open') : force;
    panel.classList.toggle('open', on);
    openBtn.style.display = on ? 'none' : 'flex';
    if (on) input.focus();
  }
  openBtn.onclick = function () { open(true); };
  // The deck is open on arrival: it is the interface, not something waiting to be
  // found in a corner. Closing it gives the page back. This runs after the panel
  // and the input exist, or the open call would throw on its way in.
  if (layout === 'deck') open(true);

  function push(turn) {
    thread.push(turn);
    var el = document.createElement('div');
    el.className = 'amb-turn ' + (turn.role === 'user' ? 'user' : 'bot');
    el.textContent = turn.content;
    threadBox.appendChild(el);
    threadBox.scrollTop = threadBox.scrollHeight;
    return el;
  }

  function renderFiles() {
    chips.innerHTML = '';
    chips.style.display = files.length ? 'flex' : 'none';
    files.forEach(function (file, i) {
      var chip = document.createElement('span');
      chip.className = 'amb-chip';
      chip.textContent = file.name + (file.text ? '' : file.image ? ' (image)' : '');
      var x = document.createElement('button');
      x.textContent = '×';
      x.onclick = function () { files.splice(i, 1); renderFiles(); };
      chip.appendChild(x);
      chips.appendChild(chip);
    });
  }

  function readFile(file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || '');
        if (/^image\//.test(file.type)) resolve({ name: file.name, image: true, dataUrl: result, text: '' });
        else resolve({ name: file.name, image: false, text: result.slice(0, 20000), dataUrl: '' });
      };
      reader.onerror = function () { resolve(null); };
      if (/^image\//.test(file.type)) reader.readAsDataURL(file);
      else reader.readAsText(file);
    });
  }

  fileInput.onchange = async function () {
    var picked = Array.prototype.slice.call(fileInput.files || []);
    for (var i = 0; i < picked.length && files.length < 6; i += 1) {
      if (picked[i].size > 12 * 1024 * 1024) continue;
      var rec = await readFile(picked[i]);
      if (rec) files.push(rec);
    }
    fileInput.value = '';
    renderFiles();
  };

  function dictate() {
    var Recognise = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognise) { push({ role: 'assistant', content: 'This browser has no speech recognition.' }); return; }
    var rec = new Recognise();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = false;
    rec.onresult = function (event) {
      var said = event.results[0][0].transcript;
      input.value = (input.value ? input.value + ' ' : '') + said;
      input.focus();
    };
    rec.onend = function () { dock.querySelector('[data-act=dictate]').classList.remove('rec'); };
    dock.querySelector('[data-act=dictate]').classList.add('rec');
    rec.start();
  }

  async function send(preset) {
    if (busy) return;
    // A tapped option arrives as the ask itself: the clarify card's own words, sent
    // back the way a typed line would be.
    var said = (typeof preset === 'string' ? preset : input.value || '').trim();
    if (!said) return;
    open(true);
    push({ role: 'user', content: said });
    if (typeof preset !== 'string') input.value = '';
    var pending = push({ role: 'assistant', content: '…' });
    busy = true;
    bar.classList.add('on');
    try {
      var res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ thread: thread.slice(0, -1), files: files, context: document.title || '' })
      });
      var body = await res.json().catch(function () { return null; });
      var failed = Boolean(body && body.error);
      // No answer and no clarify came back. Nothing of ours goes in its place: the
      // bubble comes off and the ask stands unanswered.
      var bare = !failed && body && body.no_answer && !body.text;
      if (bare) {
        thread.pop();
        pending.remove();
      } else {
        var text = (body && body.text) || (body && body.error && body.error.message) || ('No answer (' + res.status + ').');
        // The words are kept beside the bubble: a framed document shows an ellipsis on
        if (!failed && body && body.decision && body.decision.id !== undefined && body.decision.id !== null) attachVerdict(pending, body.decision.id);
        pending.setAttribute('data-said', String(text));
        // A document is framed, and a document is not read aloud: its source is
        // markup, not speech.
        var framed = !failed && fillTurn(pending, text);
        if (!framed) pending.textContent = text;
        // A failure is shown as a failure, never spoken as an answer.
        if (failed) pending.className = 'amb-turn bot err';
        else if (!framed) speak(text);
        if (!failed && body && body.intervention) showIntervention(body.intervention);
        if (!failed && body && body.reading) showReading(pending, body.reading);
        if (!failed && body && body.store) showStore(pending, body.store);
        if (layout === 'deck') paintDeck(said, failed ? null : body || null);
        if (!failed && body && body.clarify) offerChoices(pending, body.clarify, body.decision && body.decision.id);
        thread[thread.length - 1] = { role: 'assistant', content: text };
        if (files.length) { files = []; renderFiles(); }
        if (!failed) {
          window.dispatchEvent(new CustomEvent('ambient:card', { detail: { question: said, answer: text, venue: 'ambient' } }));
          if (render) drawCard(said, text);
        }
      }
    } catch (err) {
      pending.textContent = 'Ambient unavailable: ' + err.message;
    }
    busy = false;
    bar.classList.remove('on');
    threadBox.scrollTop = threadBox.scrollHeight;
  }


  // The jog, as the dial has it: twelve detents, a pulse at each one, a core that can
  // be held to change what a press does. Here it walks her answers — turn to pick one,
  // press to read it aloud, hold to make the press put it back in the box instead.
  function mountJog() {
    var wheel = dock.querySelector('[data-jog]');
    if (!wheel) return;
    var rotor = wheel.querySelector('.rotor');
    var core = wheel.querySelector('[data-jog-core]');
    var detentEl = wheel.querySelector('[data-jog-detent]');
    var line = dock.querySelector('[data-jog-line]');
    var note = dock.querySelector('[data-jog-note]');
    var ticks = [];
    for (var i = 0; i < 12; i += 1) {
      var tick = document.createElement('div');
      tick.className = 'tick';
      tick.style.transform = 'rotate(' + i * 30 + 'deg)';
      rotor.appendChild(tick);
      ticks.push(tick);
    }
    var detent = 0;
    var pulses = 0;
    var actions = ['read', 'say'];
    var action = 0;
    // Whether he has turned the wheel at all. Until he has, nothing is selected and
    // nothing moves: an answer arriving is not a reason to touch what he is reading.
    var chosen = false;
    function turns() { return Array.prototype.slice.call(threadBox.querySelectorAll('.amb-turn.bot')); }
    function pickOf(all) { return all.length ? all[detent % all.length] : null; }
    function readout() {
      detentEl.textContent = String(detent);
      ticks.forEach(function (tick, index) { tick.classList.toggle('on', index === detent); });
      var all = turns();
      var pick = pickOf(all);
      line.textContent = '';
      if (!pick) {
        line.textContent = 'no answers yet';
      } else {
        var said = (pick.getAttribute('data-said') || pick.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 46);
        var count = document.createElement('b');
        count.textContent = (all.indexOf(pick) + 1) + '/' + all.length;
        line.appendChild(count);
        line.appendChild(document.createTextNode(' ' + (said || '—')));
      }
      note.textContent = actions[action] + ' · ' + pulses + (pulses === 1 ? ' pulse' : ' pulses');
      if (chosen && pick) mark(pick);
    }
    function mark(pick) {
      turns().forEach(function (turn) { turn.classList.toggle('amb-jogged', turn === pick); });
    }
    // Only the thread scrolls, and only when the chosen turn is outside its band. A
    // scrollIntoView would move whichever ancestor it needs to, the page included.
    function reveal(pick) {
      var band = threadBox.getBoundingClientRect();
      var box = pick.getBoundingClientRect();
      if (box.top < band.top) threadBox.scrollTop -= band.top - box.top + 4;
      else if (box.bottom > band.bottom) threadBox.scrollTop += box.bottom - band.bottom + 4;
    }
    function step(delta) {
      detent = (detent + delta + 12) % 12;
      pulses += Math.abs(delta);
      chosen = true;
      try { if (navigator.vibrate) navigator.vibrate(8); } catch (err) {}
      readout();
      var pick = pickOf(turns());
      if (pick) reveal(pick);
    }
    var drag = null;
    function angleAt(ev) {
      var box = wheel.getBoundingClientRect();
      return Math.atan2(ev.clientY - (box.top + box.height / 2), ev.clientX - (box.left + box.width / 2)) * 180 / Math.PI;
    }
    rotor.addEventListener('pointerdown', function (ev) {
      drag = angleAt(ev);
      try { rotor.setPointerCapture(ev.pointerId); } catch (err) {}
    });
    rotor.addEventListener('pointermove', function (ev) {
      if (drag === null) return;
      var now = angleAt(ev);
      var moved = now - drag;
      if (moved > 180) moved -= 360;
      if (moved < -180) moved += 360;
      if (Math.abs(moved) >= 28) {
        step(moved > 0 ? 1 : -1);
        drag = now;
      }
    });
    rotor.addEventListener('pointerup', function () { drag = null; });
    rotor.addEventListener('pointercancel', function () { drag = null; });
    var hold = null;
    var held = false;
    core.addEventListener('pointerdown', function () {
      held = false;
      hold = setTimeout(function () {
        hold = null;
        held = true;
        action = (action + 1) % actions.length;
        readout();
        try { if (navigator.vibrate) navigator.vibrate([10, 30, 10]); } catch (err) {}
      }, 520);
    });
    core.addEventListener('pointerup', function () {
      var wasHeld = held;
      held = false;
      if (hold) { clearTimeout(hold); hold = null; }
      if (wasHeld) return;
      var pick = pickOf(turns());
      if (!pick) return;
      var said = String(pick.getAttribute('data-said') || pick.textContent || '').trim();
      if (actions[action] === 'say') {
        input.value = said;
        input.focus();
      } else {
        speak(said.slice(0, 1200));
      }
      try { if (navigator.vibrate) navigator.vibrate(12); } catch (err) {}
    });
    core.addEventListener('pointercancel', function () {
      held = false;
      if (hold) { clearTimeout(hold); hold = null; }
    });
    readout();
    // A new answer changes the count and the words, so the reading is refreshed — and
    // nothing else: no scroll, and no outline on a turn he did not choose.
    new MutationObserver(readout).observe(threadBox, { childList: true });
  }

  // Her clarify card: the options are what the answer could be, so they are offered
  // as buttons. A tap sends that option as the next ask; nothing is chosen for him.
  function offerChoices(el, clarify, id) {
    var asked = (clarify.questions || [])[0];
    if (!asked || !asked.q || !asked.options || !asked.options.length) return;
    var row = document.createElement('div');
    asked.options.slice(0, 10).forEach(function (option) {
      // An option is either the words themselves or a value-and-label pair, which
      // is what ARA sends. The label is what he reads and taps; the value is the
      // key behind it and never goes on a button.
      var label = option && typeof option === 'object'
        ? String(option.label || option.value || '')
        : String(option == null ? '' : option);
      if (!label) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.className = 'amb-choice';
      button.addEventListener('click', function () {
        row.remove();
        // The choice is the result: it goes back on her row before the next ask, so
        // the loop closes on what he actually picked and not on what was offered.
        if (id !== undefined && id !== null) {
          fetch(new URL('/api/verdict', endpoint).toString(), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: id, correct: false, correctedTo: label })
          }).catch(function () {});
        }
        send(label);
      });
      row.appendChild(button);
    });
    el.appendChild(row);
  }

  // The deck's own readings, one per line, filled from the reply and left at a
  // dash until there is something to put there.
  function paintDeck(ask, body) {
    var host = dock.querySelector('.amb-deck-screen');
    if (!host) return;
    var put = function (k, v) {
      var el = host.querySelector('[data-k="' + k + '"]');
      if (el) el.textContent = v == null || v === '' ? '—' : String(v);
    };
    var store = body && body.store;
    var reading = body && body.reading;
    put('ask', ask);
    put('via', body && body.via);
    put('store', store ? [store.layer || 'truth', store.id == null ? '' : store.id].filter(Boolean).join(' · ') : null);
    put('trnv', reading && reading.ok ? [reading.root, shortDigest(reading.digest)].filter(Boolean).join(' · ') : null);
  }

  // What the neighbour answered, beside her reply and not inside it: the digest is
  // the neighbour's value, so it is shown as a reading and never written into a
  // sentence of hers. Shortened to where it is recognisable; the whole of it is on
  // the row's title.
  function showReading(el, reading) {
    if (!reading || reading.via !== 'trnv') return;
    var row = document.createElement('div');
    row.className = 'amb-read';
    var key = document.createElement('span');
    key.className = 'amb-rk';
    key.textContent = 'trnv';
    var value = document.createElement('span');
    value.className = 'amb-rv';
    if (reading.ok) {
      var parts = [];
      if (reading.root) parts.push(reading.root);
      if (reading.files != null) parts.push(reading.files + (reading.files === 1 ? ' file' : ' files'));
      parts.push(shortDigest(reading.digest));
      value.textContent = parts.join(' · ');
      value.title = String(reading.digest || '');
    } else {
      value.textContent = 'no reading · ' + (reading.reason || 'unreachable');
    }
    row.appendChild(key);
    row.appendChild(value);
    el.appendChild(row);
  }

  // Where a stored answer came from: the layer and the record, named so a saved
  // answer is never read as one written this moment.
  function showStore(el, store) {
    if (!store) return;
    var row = document.createElement('div');
    row.className = 'amb-read';
    var key = document.createElement('span');
    key.className = 'amb-rk';
    key.textContent = 'store';
    var value = document.createElement('span');
    value.className = 'amb-rv';
    value.textContent = [store.layer || 'truth', store.id == null ? '' : String(store.id)].filter(Boolean).join(' · ');
    row.appendChild(key);
    row.appendChild(value);
    el.appendChild(row);
  }

  function shortDigest(value) {
    var said = String(value || '');
    return said ? said.slice(7, 19) : '—';
  }

  // His card on an answer: right, or wrong with one line in place. The verdict is
  // his tap, never a guess at what his words meant.
  function attachVerdict(el, id) {
    var row = document.createElement('div');
    row.className = 'amb-verdict';
    function file(correct, said) {
      row.textContent = '';
      var note = document.createElement('span');
      note.className = 'amb-vnote';
      note.textContent = correct ? 'noted: right' : 'noted: wrong';
      row.appendChild(note);
      fetch(new URL('/api/verdict', endpoint).toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: id, correct: correct, correctedTo: said || null })
      }).catch(function () {});
    }
    function wrong() {
      row.textContent = '';
      var line = document.createElement('input');
      line.className = 'amb-vinput';
      line.placeholder = 'what should it have been';
      var say = document.createElement('button');
      say.className = 'amb-vbtn';
      say.textContent = 'say';
      say.onclick = function () { file(false, line.value.trim()); };
      var plain = document.createElement('button');
      plain.className = 'amb-vbtn';
      plain.textContent = 'just wrong';
      plain.onclick = function () { file(false, null); };
      line.onkeydown = function (event) {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        say.onclick();
      };
      row.appendChild(line);
      row.appendChild(say);
      row.appendChild(plain);
      line.focus();
    }
    var yes = document.createElement('button');
    yes.className = 'amb-vbtn';
    yes.textContent = 'right';
    yes.onclick = function () { file(true, null); };
    var no = document.createElement('button');
    no.className = 'amb-vbtn';
    no.textContent = 'wrong';
    no.onclick = wrong;
    row.appendChild(yes);
    row.appendChild(no);
    el.appendChild(row);
  }

  // An answer can be a document, not prose: the store hands back whole pages — a
  // deed, a letter, a form — and a bubble that prints their source is not the
  // answer. Anything shaped like a document is framed instead, sandboxed, and
  // keeps the <style> it shipped with. Without allow-same-origin it cannot reach
  // this page, its cards or its storage.
  function looksLikeDocument(t) {
    var fence = String.fromCharCode(96, 96, 96);
    var prose = String(t == null ? '' : t).split(fence).filter(function (x, k) { return k % 2 === 0; }).join('');
    return /<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]|<style[\s>]/i.test(prose);
  }

  // The page's own CSS is authoritative. The base only fills in what the page
  // left unsaid, because a page that names no colour would be black text on a
  // white frame, or invisible once that frame sits on a dark bubble.
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

  // Frames the answer in place and says whether it did. False means the text was
  // prose and the caller should put it in as text.
  function fillTurn(el, text) {
    if (!looksLikeDocument(text)) return false;
    var frame = document.createElement('iframe');
    frame.className = 'amb-doc';
    frame.title = 'Document';
    frame.setAttribute('sandbox', 'allow-scripts allow-modals allow-popups allow-forms');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.srcdoc = documentSrcdoc(text);
    el.textContent = '';
    el.appendChild(frame);
    return true;
  }

  function drawCard(question, answer) {
    var host = document.getElementById('ambient-cards');
    if (!host) return;
    host.style.setProperty('--amb-accent', accent);
    var card = document.createElement('div');
    card.className = 'amb-card';
    card.style.borderColor = accent;
    var q = document.createElement('div');
    q.className = 'amb-q';
    q.textContent = 'REQ · AMBIENT · ' + question.slice(0, 80);
    var a = document.createElement('div');
    a.className = 'amb-a';
    if (!fillTurn(a, answer)) a.textContent = answer;
    card.appendChild(q);
    card.appendChild(a);
    host.appendChild(card);
  }

  // Watching: she may speak without being asked, but only when the page says
  // something changed, only as often as that earns, and only at the level her
  // own decision gives it. A pass that fails stays quiet.
  function watchOn() { try { return localStorage.getItem('amb.watch') !== 'off'; } catch (err) { return true; } }
  function setWatch(on) { try { localStorage.setItem('amb.watch', on ? 'on' : 'off'); } catch (err) {} }
  var passed = 0;
  var held = null;   // the change the floor would not let through yet
  var pending = 0;   // the timer that will let it through
  function release() {
    var observation = held;
    held = null;
    pending = 0;
    if (observation !== null && observation !== undefined) witness(observation, true);
  }
  async function witness(observation, force) {
    if (!watchOn()) return;
    var now = Date.now();
    if (!force && now - passed < 20000) {
      // Not dropped: held until the floor expires and then run, keeping only the
      // latest, because where the page ended up matters more than every step.
      held = String(observation || '');
      clearTimeout(pending);
      pending = setTimeout(release, 20000 - (now - passed));
      return;
    }
    // A pass is running now, so anything held is older news than it.
    clearTimeout(pending);
    pending = 0;
    held = null;
    passed = now;
    try {
      var res = await fetch(new URL('/api/witness', endpoint).toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ thread: thread.slice(-6), context: document.title || '', observation: String(observation || '').slice(0, 1200) })
      });
      if (!res.ok) return;
      var body = await res.json().catch(function () { return null; });
      if (!body || !body.intervention) return;
      showIntervention(body.intervention);
    } catch (err) {}
  }

  // The six things an intervention has to make clear, and nothing it does not.
  function showIntervention(iv) {
    if (!iv || !(iv.level >= 1)) return;
    var box = document.createElement('div');
    box.className = 'amb-alert l' + iv.level;
    var lvl = document.createElement('div');
    lvl.className = 'amb-lvl';
    lvl.textContent = 'level ' + iv.level + ' / ' + (iv.name || 'informational');
    box.appendChild(lvl);
    var parts = [
      ['trigger', iv.trigger],
      ['observed', iv.observed],
      ['evidence', iv.evidence],
      ['uncertain', iv.uncertain],
      ['if ignored', iv.consequence],
      ['recommended', iv.recommend]
    ];
    parts.forEach(function (pair) {
      if (!pair[1]) return;
      var row = document.createElement('div');
      row.className = 'amb-part';
      var label = document.createElement('b');
      label.textContent = pair[0];
      row.appendChild(label);
      row.appendChild(document.createTextNode(String(pair[1])));
      box.appendChild(row);
    });
    var dismiss = document.createElement('button');
    dismiss.className = 'amb-x';
    dismiss.textContent = 'dismiss';
    dismiss.onclick = function () { box.remove(); };
    box.appendChild(dismiss);
    threadBox.appendChild(box);
    threadBox.scrollTop = threadBox.scrollHeight;
    // 3 interrupts; 4 marks the dock until the application's own halt is involved.
    if (iv.level >= 3) open(true);
    if (iv.level >= 4) openBtn.classList.add('alert');
  }

  var titled = document.title;
  function observeTitle() {
    if (document.title === titled) return;
    titled = document.title;
    witness('The page changed to: ' + titled);
  }
  setInterval(observeTitle, 5000);
  // A host that knows what changed can say so directly.
  window.addEventListener('ambient:witness', function (event) {
    var detail = event && event.detail || {};
    witness(String(detail.observation || detail.note || ''), true);
  });

  dock.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-act]');
    if (!btn) return;
    var act = btn.dataset.act;
    if (act === 'close') open(false);
    else if (act === 'attach') fileInput.click();
    else if (act === 'dictate') dictate();
    else if (act === 'send') send();
    else if (act === 'voice') {
      setVoice(!voiceOn());
      btn.textContent = voiceOn() ? 'voice on' : 'voice off';
      if (!voiceOn()) { try { window.speechSynthesis.cancel(); spoken = null; } catch (err) {} }
    }
    else if (act === 'watch') {
      setWatch(!watchOn());
      btn.textContent = watchOn() ? 'watch on' : 'watch off';
      // Off means off: nothing waiting in the wings either.
      if (!watchOn()) { held = null; clearTimeout(pending); pending = 0; }
    }
  });

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); }
  });

  // A dock starts closed and waits in the corner. A deck is already the page.
  if (shows && layout !== 'deck') open(false);
})();`;
var DEMO = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ambient \u2014 drop it into any app</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; background:#0f1115; color:#e6e9ef; font:16px/1.6 system-ui,sans-serif; }
  main { max-width:720px; margin:0 auto; padding:32px 20px 120px; }
  h1 { font-size:20px; letter-spacing:.02em; }
  code { background:#1b1f27; padding:2px 6px; border-radius:4px; font-size:13px; }
  pre { background:#1b1f27; padding:14px; border-radius:8px; overflow:auto; font-size:13px; }
  #ambient-cards { display:flex; flex-direction:column; gap:12px; margin-top:24px; }
</style>
</head>
<body>
<main>
  <h1>ambient</h1>
  <p>This page is a plain HTML file. The dock in the corner is the whole integration:</p>
  <pre>&lt;script src="https://ambient.&lt;your-subdomain&gt;.workers.dev/embed.js"
        data-accent="#4a9eff"
        data-title="Ambient"
        data-render="true"&gt;&lt;/script&gt;</pre>
  <p>Cards it produces land in <code>#ambient-cards</code> when <code>data-render="true"</code>,
     and are also dispatched as <code>ambient:card</code> events on <code>window</code> for a host
     that wants to place them itself.</p>
  <div id="ambient-cards"></div>
</main>
<script src="/embed.js" data-accent="#4a9eff" data-title="Ambient" data-render="true" data-skin="trnv" data-wheels="true"><\/script>
</body>
</html>`;
var json = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
}), "json");
var PREF_PREFIX = "pref:";
var PREF_STATEMENT = /^(from now on|going forward|from here on|my preference is\b|i prefer\b|remember(?: that\b|:)|don'?t ever\b|do not ever\b|stop (?:using|doing|writing|saying)\b)/i;
// The prefs list is his whole standing memory, and a page that carries the dock is
// the only kind of caller entitled to read it. The Worker's own origin always is
// one; any other is named in PREFS_ORIGINS, comma separated. An allowlist that
// guesses is not an allowlist.
function allowedOrigin(request, env) {
  const here = new URL(request.url).origin;
  const named = String(env?.PREFS_ORIGINS || "").split(",").map((origin) => origin.trim().replace(/\/$/, "")).filter(Boolean);
  const origin = String(request.headers.get("origin") || "").replace(/\/$/, "");
  // No Origin is not a browser: CORS cannot gate a server-side caller, and
  // pretending otherwise would only hide that limit.
  if (!origin) return { ok: true, origin: null, delegated: false };
  if (origin === here) return { ok: true, origin, delegated: false };
  if (named.indexOf(origin) >= 0) return { ok: true, origin, delegated: true };
  return { ok: false, origin: null, delegated: false };
}
__name(allowedOrigin, "allowedOrigin");
// Records written before kinds existed carry neither field. They are read as what
// they were, a statement he made, and the store is never rewritten behind his back
// to say so.
//
// This is a consistency change, not a bug fix. The quote used
// `(pref.status || "active") === "active"` and the count used
// `pref.status === "active"`, and they could never disagree in practice: every
// record reaching either one has already been through loadPrefs, which sets the
// status. Two readings of one rule is the smell, not a wrong number, so they are
// one function now. The failure that was real is below, in the repeat return:
// that path handed back the raw stored shape with no status at all.
function readPref(record) {
  return Object.assign({}, record, { kind: record.kind || "stated", status: record.status || "active" });
}
__name(readPref, "readPref");
function isStanding(pref) {
  // A promoted inference is still an inference. Ruled A2: standing excludes
  // `inferred`, so promotion cannot make a conclusion drawn from what he did
  // into words he said. One predicate drives both the count and the quote, so
  // the two cannot disagree about a record that is active and inferred.
  return Boolean(pref) && (pref.status || "active") === "active" && (pref.kind || "stated") !== "inferred";
}
__name(isStanding, "isStanding");
async function loadPrefs(env) {
  if (!env?.PREFS?.list) return [];
  const listed = await env.PREFS.list({ prefix: PREF_PREFIX, limit: 60 }).catch(() => null);
  const keys = listed?.keys || [];
  if (!keys.length) return [];
  const reads = await Promise.all(keys.map((key) => env.PREFS.get(key.name).catch(() => null)));
  const prefs = [];
  for (const raw of reads) {
    if (!raw) continue;
    let record = null;
    try {
      record = JSON.parse(raw);
    } catch {
      record = { text: raw };
    }
    if (!record || typeof record.text !== "string" || !record.text.trim()) continue;
    prefs.push(readPref(record));
  }
  return prefs.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
}
__name(loadPrefs, "loadPrefs");
// A preference is not one kind of thing. What he states is standing; what a model
// writes down is a candidate, and only he can make it standing; what is inferred
// is recorded as such and never quoted back. The kind and the status are kept
// beside the words, because the difference is the whole of what makes a memory
// auditable afterwards.
var PREF_KINDS = ["stated", "model_suggested", "inferred"];
async function savePref(env, text, source = "ambient", actor = "owner", kind = "stated", status = kind === "stated" ? "active" : "candidate") {
  const clean = String(text || "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!clean || !env?.PREFS?.put) return null;
  // An inferred claim is a conclusion drawn from what he did or from the context,
  // not something he said and not prose a model wrote. It is kept apart from both
  // and it is never standing until he makes it so.
  if (PREF_KINDS.indexOf(String(kind)) < 0) kind = "stated";
  if (kind === "stated" && status === "candidate") status = "active";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clean.toLowerCase()));
  const id = [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
  // A repeat is not a revision. The id is derived from the words, so a write that
  // lands on an existing key is the same claim said again: the stored record comes
  // back as it stands — its first at, and any decision already on it — and nothing
  // is put. Without this, re-sending the text of a standing record demoted it.
  const held = typeof env.PREFS.get === "function" ? await env.PREFS.get(PREF_PREFIX + id).catch(() => null) : null;
  if (held) {
    let prior = null;
    try {
      prior = JSON.parse(held);
    } catch {
      prior = { text: clean };
    }
    return Object.assign(readPref(prior), { id, existed: true });
  }
  const record = { id, text: clean, kind, status, source, actor, at: (/* @__PURE__ */ new Date()).toISOString() };
  await env.PREFS.put(PREF_PREFIX + id, JSON.stringify(record));
  return Object.assign({}, record, { existed: false });
}
__name(savePref, "savePref");
// The only path that changes a status. The rung to active is reached with the
// operator key; a named page may only move a record to candidate or rejected.
async function setPrefStatus(env, id, status, by = "owner") {
  const clean = String(id || "").replace(/[^0-9a-f]/g, "").slice(0, 16);
  if (!clean || ["active", "candidate", "rejected"].indexOf(String(status)) < 0) return null;
  const store = env && env.PREFS && typeof env.PREFS.get === "function" && typeof env.PREFS.put === "function" ? env.PREFS : null;
  if (!store) return null;
  const raw = await store.get(PREF_PREFIX + clean).catch(() => null);
  if (!raw) return null;
  let record = null;
  try {
    record = JSON.parse(raw);
  } catch {
    record = { text: raw };
  }
  if (!record || typeof record.text !== "string") return null;
  const next = Object.assign({}, record, {
    id: clean,
    kind: record.kind || "stated",
    status: String(status),
    decidedBy: String(by || "owner"),
    decidedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  await store.put(PREF_PREFIX + clean, JSON.stringify(next));
  return next;
}
__name(setPrefStatus, "setPrefStatus");
// ---- authorization ---------------------------------------------------------

// One switch, off until he sets it. Off, AA still answers and still remembers, but
// nothing it concludes becomes ARA's evidence: a verdict is refused and an outcome
// report is skipped. The store holds the state, so a deploy cannot quietly reset it.
var AUTH_KEY = "state:authorization";
async function readAuthorization(env) {
  const store = env && env.PREFS && typeof env.PREFS.get === "function" ? env.PREFS : null;
  if (!store) return { on: false, at: null, known: false };
  try {
    const held = JSON.parse((await store.get(AUTH_KEY)) || "null");
    return { on: Boolean(held && held.on === true), at: held && held.at || null, known: Boolean(held) };
  } catch {
    return { on: false, at: null, known: false };
  }
}
__name(readAuthorization, "readAuthorization");
async function setAuthorization(env, on) {
  const store = env && env.PREFS && typeof env.PREFS.put === "function" ? env.PREFS : null;
  if (!store) return null;
  const state = { on: on === true, by: "owner", at: (/* @__PURE__ */ new Date()).toISOString() };
  await store.put(AUTH_KEY, JSON.stringify(state));
  return state;
}
__name(setAuthorization, "setAuthorization");
function extractPrefs(text) {
  const learned = [];
  const kept = [];
  for (const line of String(text || "").split("\n")) {
    const match = line.match(/^\s*(?:PREF|PREFERENCE):\s*(.+)$/i);
    if (match) learned.push(match[1].trim());
    else kept.push(line);
  }
  return { text: kept.join("\n").trim(), learned };
}
__name(extractPrefs, "extractPrefs");
// The price a model may carry, in and out, per million tokens. This gates the model
// that makes the call, not how many calls are made: a model priced above it is refused
// by name before it is ever reached.
const MAX_MODEL_USD_PER_M = 0.09;
// USD per million tokens, checked against the catalogue. A model that is not listed here
// is treated as unpriced and refused, so a new model cannot slip in without a price.
const TOKEN_PRICES = {
  "upstage/solar-mini-4-5": { in: 0.01, out: 0.04 },
  "google/gemma-3-4b-it": { in: 0.04, out: 0.05 },
  "~z-ai/glm-flash-latest": { in: 0.036, out: 0.081 },
  "z-ai/glm-5.3-flash": { in: 0.036, out: 0.081 },
  "nex-agi/nex-n2.5-mini": { in: 0.025, out: 0.1 }
};
function modelPrice(model) {
  const price = TOKEN_PRICES[model] || null;
  if (!price) return { ok: false, reason: `${model} has no price on record`, in: null, out: null };
  const over = price.in > MAX_MODEL_USD_PER_M || price.out > MAX_MODEL_USD_PER_M;
  return {
    ok: !over,
    reason: over ? `${model} is $${price.in}/$${price.out} per million tokens, over the $${MAX_MODEL_USD_PER_M} ceiling` : "",
    in: price.in,
    out: price.out
  };
}
// One neighbour, two possible names: `AI-PROXY` is what the account binds, and a
// deploy that named it `AI_PROXY` should not silently leave the pen unbindable.
function proxyOf(env) {
  if (!env) return null;
  const bound = env.AI_PROXY || env["AI-PROXY"] || null;
  return bound && typeof bound.fetch === "function" ? bound : null;
}
__name(proxyOf, "proxyOf");
function prefsBlock(prefs) {
  // Only standing memory is quoted to a model. A candidate is one a model wrote,
  // and handing it back to a model would let the model that wrote it promote it
  // by repeating itself.
  const standing = prefs.filter(isStanding);
  if (!standing.length) return "";
  return "\n\nWhat he has already told you he wants, in his own words:\n" + standing.slice(0, 30).map((pref) => "- " + pref.text).join("\n") + "\n\nThese are standing. Follow them without being reminded, and never argue them down.";
}
__name(prefsBlock, "prefsBlock");
function snapshotBlock(previous, mode, ask) {
  if (!previous || typeof previous !== "object") return "";
  const when = String(previous.at || "").slice(0, 32);
  const then = String(previous.ask || "").slice(0, 160);
  const said = String(previous.answer || "").slice(0, 200);
  const lines = [];
  if (when) lines.push("Last snapshot: " + when + (previous.mode ? " in " + String(previous.mode) : ""));
  if (then && then !== ask) lines.push("He asked then: " + then);
  if (said) lines.push("You answered then: " + said);
  if (previous.options) lines.push("That turn offered " + String(previous.options) + " options");
  if (mode && previous.mode && String(previous.mode) !== String(mode)) lines.push("The dial is now in " + String(mode) + ", it was " + String(previous.mode));
  if (!lines.length) return "";
  // The dial keeps its own snapshots; this is the difference since the last one,
  // so a follow-up can be read as a change rather than as a cold question.
  return "\n\nWhat changed since the dial's last snapshot:\n" + lines.map((l) => "- " + l).join("\n");
}
__name(snapshotBlock, "snapshotBlock");
function cleanFiles(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 6).map((file) => ({
    name: String(file?.name || "file").slice(0, 120),
    text: String(file?.text || "").slice(0, 12e3),
    image: Boolean(file?.image),
    dataUrl: typeof file?.dataUrl === "string" && /^data:image\//.test(file.dataUrl) ? file.dataUrl.slice(0, 8 * 1024 * 1024) : ""
  })).filter((file) => file.text || file.image);
}
__name(cleanFiles, "cleanFiles");
var INTERVENTION = { 1: "informational", 2: "advisory", 3: "critical", 4: "emergency" };
function line(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 800);
}
__name(line, "line");
function interventionOf(decision, override) {
  if (!decision) return null;
  const source = decision.intervention && typeof decision.intervention === "object" ? decision.intervention : decision;
  const level = Math.round(Number(override ?? source.level ?? decision.level ?? 0));
  // Level 0 is ambient: observe, say nothing. Anything below 1 stays silent.
  if (!Number.isFinite(level) || level < 1) return null;
  const capped = Math.min(4, level);
  return {
    level: capped,
    name: INTERVENTION[capped],
    id: decision.id ?? null,
    trigger: line(source.trigger),
    observed: line(source.observed) || line(decision.text),
    evidence: line(source.evidence),
    uncertain: line(source.uncertain),
    consequence: line(source.consequence),
    recommend: line(source.recommend)
  };
}
__name(interventionOf, "interventionOf");
function observedIntervention(decision) {
  if (!decision) return null;
  const stated = decision.level ?? (decision.intervention && typeof decision.intervention === "object" ? decision.intervention.level : null);
  // Only an explicit 0 means she looked and chose silence. No level at all, a
  // level nobody can read, and words of her own are all not that: if she wrote
  // something it is at least worth saying, so it lands quietly as informational
  // rather than disappearing.
  const at = stated === null || stated === undefined ? "" : String(stated).trim();
  const explicitSilence = at !== "" && Number(at) === 0;
  const named = interventionOf(decision);
  if (named) return named;
  if (explicitSilence || !line(decision.text)) return null;
  // The override wins over whatever unreadable level she left behind, and her
  // own six parts still come through as written.
  return interventionOf(decision, 1);
}
__name(observedIntervention, "observedIntervention");
async function reportOutcome(env, id, returned) {
  if (id === null || id === void 0) return "no_decision_id";
  // Off by default. An outcome report is AA's account of a turn becoming ARA's
  // evidence, and that is exactly what the switch withholds.
  if (!(await readAuthorization(env)).on) return "authorization_off";
  if (!env?.ARA || typeof env.ARA.fetch !== "function") return "ara_unbound";
  if (!env?.ARA_KEY) return "ara_key_unset";
  try {
    const response = await env.ARA.fetch(new Request("https://ara/outcome", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": env.ARA_KEY },
      body: JSON.stringify({ id, returned: String(returned || "").slice(0, 2000), stored: Boolean(env?.PREFS?.put), route: "ambient" })
    }));
    return response.ok ? null : "ara_outcome_" + response.status;
  } catch (err) {
    return "ara_outcome_" + String(err?.message || err);
  }
}
__name(reportOutcome, "reportOutcome");
// ---- the card other apps hold ----------------------------------------------

// A diagnosis is written down under a short id, so a page that was handed one can
// read it back instead of being told again. The id names the fault and only the
// fault — the code, the failing checks, the words, the side — so the dial's state,
// the clock and the wording of a verdict cannot make the same fault a new card.
async function diagId(record) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify([record.code || "", record.to || "", (record.faults || []).join(","), record.symptom || ""]))
  );
  return Array.from(new Uint8Array(digest)).slice(0, 6).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(diagId, "diagId");
async function diagStore(env, id, record) {
  const store = env && env.PREFS && typeof env.PREFS.put === "function" ? env.PREFS : null;
  if (!store) return;
  try {
    await store.put("diag:" + id, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 30 });
  } catch {}
}
__name(diagStore, "diagStore");

// ---- the press that opens the card -----------------------------------------

// TRNV's press-to-talk, borrowed for reading a diagnosis. The card answers only
// while a key minted by a press is held; the key names one card and one capability,
// signs both with the dial's own secret, and dies in a minute. A key pressed for one
// card opens no other.
function b64url(bytes) {
  const view = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(b64url, "b64url");
async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}
__name(hmacKey, "hmacKey");
// The payload both sides sign, so a change to its shape cannot be made on one side
// only.
function pressSigned(expires, card, cap) {
  return expires + "." + card + "." + cap;
}
__name(pressSigned, "pressSigned");
async function pressSign(secret, text) {
  return b64url(await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(text)));
}
__name(pressSign, "pressSign");
async function pressKey(env, card, cap) {
  const secret = env && env.DIAL_TOKEN;
  if (!secret || !card) return null;
  const expires = Date.now() + 60 * 1000;
  const payload = pressSigned(expires, card, cap);
  return "v1." + payload + "." + (await pressSign(secret, payload));
}
__name(pressKey, "pressKey");
async function readPress(env, key) {
  const secret = env && env.DIAL_TOKEN;
  const parts = String(key || "").split(".");
  if (!secret || parts.length !== 5 || parts[0] !== "v1") return null;
  const [, expires, card, cap, signature] = parts;
  if (!/^[0-9a-f]{6,16}$/.test(card)) return null;
  if (cap !== "diff" && cap !== "full") return null;
  if (!(Number(expires) > Date.now())) return null;
  const expected = await pressSign(secret, pressSigned(expires, card, cap));
  const held = new TextEncoder().encode(signature);
  const truth = new TextEncoder().encode(expected);
  if (held.length !== truth.length) return null;
  let apart = 0;
  for (let i = 0; i < held.length; i++) apart |= held[i] ^ truth[i];
  if (apart !== 0) return null;
  return { card, cap, expires: Number(expires) };
}
__name(readPress, "readPress");
// One frequency per card: a press costs a count, and the channel squelches at
// twenty presses in a minute.
async function squelch(env, card) {
  const store = env && env.PREFS && typeof env.PREFS.get === "function" ? env.PREFS : null;
  if (!store) return false;
  const bucket = "freq:" + card + ":" + Math.floor(Date.now() / 60000);
  const held = Number((await store.get(bucket)) || 0);
  if (held >= 20) return true;
  await store.put(bucket, String(held + 1), { expirationTtl: 120 });
  return false;
}
__name(squelch, "squelch");
// The card is meant to be held by whichever app was handed it, and those are other
// origins, so this one read is opened to them. It carries no secret: a verdict and
// binding names, nothing he did not already send.
function cardJson(body, status) {
  const response = json(body, status);
  response.headers.set("access-control-allow-origin", "*");
  response.headers.set("cache-control", "no-store");
  return response;
}
__name(cardJson, "cardJson");
async function handleDiagCard(url, env) {
  const id = String(url.searchParams.get("id") || "").replace(/[^0-9a-f]/g, "").slice(0, 12);
  if (!id) return cardJson({ ok: false, error: { code: "id_required", message: "Ask for a card by id." } }, 400);
  // A key is the press: without one held, the card says nothing about the system.
  const press = await readPress(env, url.searchParams.get("k") || "");
  if (!press) {
    return cardJson({ ok: false, error: { code: "key_required", message: "Press for a key first: the card answers while the press is held." } }, 401);
  }
  if (press.card !== id) {
    return cardJson({ ok: false, error: { code: "key_other_card", message: "That key was pressed for another card." } }, 403);
  }
  const store = env && env.PREFS && typeof env.PREFS.get === "function" ? env.PREFS : null;
  const raw = store ? await store.get("diag:" + id) : null;
  let card = null;
  try {
    card = raw ? JSON.parse(raw) : null;
  } catch {
    card = null;
  }
  if (!card) return cardJson({ ok: false, error: { code: "no_card", message: "No diagnosis is stored under " + id + "." } }, 404);
  // The diff is the whole of what a rest state releases; the checks and the verdict
  // are behind the operator's own press.
  const released = press.cap === "full"
    ? card
    : { id, faults: card.faults || [], diff: card.diff || null, to: card.to || null, at: card.at || null, cap: "diff" };
  return cardJson({ ok: true, id, cap: press.cap, expires: press.expires, card: released });
}
__name(handleDiagCard, "handleDiagCard");

// ---- the difference between origin and destination --------------------------

// Where each destination's entry lives, so its reads are taken from what it serves
// on this call instead of from a table that goes stale the moment it is edited.
const DIFF_TARGETS = {
  trnv: { binding: "TRNV", paths: ["https://trnv/ptt.js", "https://trnv/ptt"], entry: "ptt.js" },
  cods: { binding: "CODS", paths: ["https://cods/"], entry: "the index page" },
  tew: { binding: "TEW", paths: ["https://tew/"], entry: "the index page" }
};

// What the destination reads, scanned from its own bytes now. A parameter counts
// when a name is asked of the query string; nothing is remembered between calls, so
// an edit on the other side shows up on the next diff and nowhere else.
async function liveReads(env, name) {
  const target = DIFF_TARGETS[String(name || "").toLowerCase()];
  const binding = target && env ? env[target.binding] : null;
  if (!binding || typeof binding.fetch !== "function") return null;
  let text = "";
  const seen = [];
  for (const path of target.paths) {
    try {
      const response = await binding.fetch(new Request(path), { signal: AbortSignal.timeout(2500) });
      if (!response.ok) continue;
      const body = await response.text();
      if (!body) continue;
      text += body;
      seen.push(path.replace("https://" + target.binding.toLowerCase(), "") + " " + body.length + "b");
    } catch {
      continue;
    }
  }
  if (!text) return null;
  const params = new Set();
  for (const hit of text.matchAll(/\.get\(\s*['"]([A-Za-z_]{1,20})['"]\s*\)/g)) params.add(hit[1]);
  const reads = Array.from(params);
  const lists = (text.match(/URLSearchParams/g) || []).length;
  return {
    entry: target.entry,
    reads,
    evidence: "live: " + seen.join(" + ") + " — " + lists + " URLSearchParams, reads [" + (reads.join(", ") || "nothing") + "]"
  };
}
__name(liveReads, "liveReads");

// The minimal edit that closes the gap, and what it is allowed to touch. One read
// before the page's own init: everything else in that file stays as it is.
function minimalDiff(origin, destination, live) {
  const provides = Array.isArray(origin.provides) ? origin.provides.map(String).filter(Boolean) : [];
  const reads = live ? live.reads : Array.isArray(destination.reads) ? destination.reads.map(String) : [];
  const missing = provides.filter((key) => !reads.includes(key));
  const extra = reads.filter((key) => !provides.includes(key));
  const entry = (live && live.entry) || destination.entry || "the destination's entry script";
  const edits = missing.map((key) => ({
    file: entry,
    lines: 1,
    code: "const " + key + " = new URLSearchParams(location.search).get('" + key + "') || '';"
  }));
  return {
    origin: { name: origin.name || "ambient", provides },
    destination: {
      name: destination.name || "unknown",
      reads,
      entry,
      evidence: live ? live.evidence : destination.evidence || "no live read: the destination did not answer"
    },
    missing,
    extra,
    edits,
    blast: {
      touches: edits.map((edit) => edit.file),
      lines: edits.reduce((sum, edit) => sum + edit.lines, 0),
      keeps: [
        reads.length ? "the existing parameter " + reads.join(", ") + " still resolves the same way" : "a page opened with no parameter still opens",
        "the page's init and every other route in that file are untouched"
      ],
      radius: edits.length ? "one read added before init in " + edits.map((edit) => edit.file).join(", ") : "nothing: there is no gap"
    },
    checks: missing.length
      ? [
          "open " + (destination.name || "the destination") + " with no parameter and confirm it still opens",
          "open it with ?" + missing[0] + "=a focused card and confirm the text is there, not blank",
          reads.length ? "open it with ?" + reads[0] + "=x and confirm that still works" : "confirm no parameter path was broken"
        ]
      : ["nothing to check: origin and destination already agree"]
  };
}
__name(minimalDiff, "minimalDiff");
async function handleDiff(request, env) {
  let body = {};
  try {
    body = (await request.json()) || {};
  } catch {
    body = {};
  }
  const origin = body.origin || {};
  const destination = body.destination || {};
  const diff = minimalDiff(origin, destination, await liveReads(env, destination.name));
  const line = diff.missing.length
    ? diff.destination.name + " reads [" + (diff.destination.reads.join(", ") || "nothing") + "] and the hand-off carries [" + diff.missing.join(", ") + "] — " + diff.blast.lines + " line in " + diff.blast.touches.join(", ") + "."
    : diff.destination.name + " already reads what the hand-off carries.";
  return json({ ok: true, line, diff });
}
__name(handleDiff, "handleDiff");

// The press belongs to the page, not to the world. A browser sends an Origin the
// page cannot choose, so a stranger's script cannot mint a key by posting its own
// symptom; a caller holding the dial token can press from anywhere.
function pressedByPage(request) {
  try {
    const from = request.headers.get("origin") || request.headers.get("referer") || "";
    return !!from && new URL(from).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
__name(pressedByPage, "pressedByPage");

// ---- diagnosis -------------------------------------------------------------

// What is wrong, said plainly, and carried to the one party authorised to hold it:
// the truth store. Every check is a local binding plus one resolve, so this route
// spends nothing and needs no dial token.
async function handleDiagnose(request, env) {
  let body = {};
  try {
    body = (await request.json()) || {};
  } catch {
    body = {};
  }
  const operator = dialGate(request, env) === "yes";
  if (!operator && !pressedByPage(request)) {
    return json({ ok: false, error: { code: "press_denied", message: "A diagnosis is pressed from the dial itself, or by a caller holding the dial token." } }, 403);
  }
  const symptom = String(body?.symptom || "").slice(0, 300);
  const code = String(body?.code || "").slice(0, 80);
  const dialState = String(body?.state || "").slice(0, 120);
  const toName = String(body?.to || "").replace(/[^a-z]/gi, "").slice(0, 24).toLowerCase();
  const has = (name) => !!(env && env[name]);
  const checks = [
    { name: "ara", ok: has("ARA"), note: has("ARA") ? "the decider is bound" : "no ARA binding: nothing can decide" },
    { name: "cods", ok: has("CODS"), note: has("CODS") ? "the card store is bound" : "no CODS binding: no cards can be made" },
    { name: "trnv", ok: has("TRNV"), note: has("TRNV") ? "the room is bound" : "no TRNV binding: no hand-off target" },
    { name: "tew", ok: has("TEW"), note: has("TEW") ? "the truth engine is bound" : "no TEW binding" },
    { name: "truth", ok: has("TRUTH"), note: has("TRUTH") ? "the truth store is bound" : "no TRUTH binding: nothing can be looked up" },
    { name: "prefs", ok: has("PREFS"), note: has("PREFS") ? "memory is bound" : "no PREFS: preferences and looks are not kept" },
    { name: "browser", ok: !!(env?.CF_API_TOKEN && env?.CF_ACCOUNT), note: env?.CF_API_TOKEN ? "the browser key is set" : "no CF_API_TOKEN: /api/look cannot read a page" },
    { name: "sandbox", ok: has("LOADER"), note: has("LOADER") ? "the code sandbox is bound" : "no LOADER: no sandbox" },
    { name: "dial key", ok: !!env?.DIAL_TOKEN, note: env?.DIAL_TOKEN ? "the dial may call the spending routes" : "no DIAL_TOKEN: /api/look and /api/sandbox refuse the dial" }
  ];
  // The liaison: the truth store is the party allowed to hold what went wrong, so
  // the diagnosis is put to it as the question — asked before the verdict is
  // written, because the verdict is about what the question finds. It answers in a
  // breath or not at all: a store that has to be waited on is itself the fault.
  const down = checks.filter((check) => !check.ok);
  let ruling = null;
  let silence = "the truth store answered nothing this diagnosis";
  if (has("TRUTH")) {
    try {
      const question = "Diagnosis for the ambient dial. " + (symptom ? "What he saw: " + symptom + ". " : "") + (down.length
        ? "Not working: " + down.map((check) => check.name).join(", ") + ". " + down[0].note + "."
        : "Every binding the dial uses is in place.");
      const response = await env.TRUTH.fetch(new Request("https://truth/api/truth/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: question }),
        signal: AbortSignal.timeout(8000)
      }));
      const data = await response.json().catch(() => null);
      const answer = String(data?.answer || "").trim();
      if (answer) ruling = { answer: answer.slice(0, 800), id: data && data.id != null ? data.id : null, layer: (data && data.layer) || "truth" };
      else if (!response.ok) silence = "the truth store answered " + response.status + (data && data.error ? ": " + String(data.error).slice(0, 90) : "");
    } catch {
      silence = "the truth store could not be reached within 8s";
    }
    if (!ruling) checks.push({ name: "truth reply", ok: false, note: silence });
  }
  const bad = checks.filter((check) => !check.ok);
  const faults = bad.filter((check) => check.name !== "truth reply");
  let verdict = faults.length
    ? "Not working: " + faults.map((check) => check.name).join(", ") + ". " + faults[0].note + "."
    : bad.length
      ? "Every binding the dial uses is in place, but " + bad[0].note + "."
      : "Every binding the dial uses is in place.";
  if (code) verdict = "The last failure said " + code + ". " + verdict;
  if (dialState) verdict += " The dial was " + dialState + ".";
  // The difference between what the dial hands over and what the other side reads,
  // so the card carries the fix and not only the fault.
  const diff = toName
    ? minimalDiff({ name: "ambient", provides: ["q"], from: "the dial's hand-off" }, { name: toName }, await liveReads(env, toName))
    : null;
  const record = {
    verdict,
    checks,
    ruling,
    diff,
    symptom,
    code,
    faults: bad.map((check) => check.name),
    state: dialState,
    to: toName || null,
    by: "ambient",
    at: new Date().toISOString()
  };
  const id = await diagId(record);
  if (await squelch(env, id)) {
    return json({ ok: false, error: { code: "squelched", message: "That card has been pressed twenty times this minute. One frequency, one card." } }, 429);
  }
  await diagStore(env, id, record);
  // The press is the operator's: the dial gets the diff, and only a caller holding
  // the dial token itself — compared the way dialGate compares, not with a string
  // equality that stops at the first wrong byte — gets the full card.
  const key = await pressKey(env, id, operator ? "full" : "diff");
  return json({ ok: true, id, key, cap: operator ? "full" : "diff", verdict, checks, ruling, diff, symptom, code, faults: record.faults, state: dialState, to: toName || null });
}
__name(handleDiagnose, "handleDiagnose");

// ---- looking at a page -----------------------------------------------------

// A page is read as markdown by the account's browser, and the last read is kept
// in PREFS under its URL. So a second look is not a second question: it is that
// page, and what moved since.
var LOOK_PREFIX = "look:";

// The two routes that spend the browser or run code are for the dial only. The
// token is his, set with `wrangler secret put DIAL_TOKEN`; unset means closed,
// never open. Compared without an early return so a wrong token takes as long as
// a right one.
function dialGate(request, env) {
  const expected = String(env?.DIAL_TOKEN || "");
  if (!expected) return "unset";
  const url = new URL(request.url);
  const given = String(request.headers.get("x-dial-token") || url.searchParams.get("k") || "");
  if (given.length !== expected.length) return "no";
  let diff = 0;
  for (let i = 0; i < given.length; i += 1) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? "yes" : "no";
}
__name(dialGate, "dialGate");

function gateJson(gate) {
  if (gate === "unset") {
    return json({ ok: false, error: { code: "dial_token_unset", message: "Set DIAL_TOKEN on this Worker and the dial can call this." } }, 503);
  }
  return json({ ok: false, error: { code: "dial_unauthorized", message: "This route is the dial's. Send x-dial-token." } }, 401);
}
__name(gateJson, "gateJson");

// One page is one key. Case, a trailing slash, a fragment, a default port, the
// order of the query and the tracking junk are all spellings of the same address,
// and http and https share a key: the page is the page.
function lookNormalize(raw) {
  let u;
  try {
    u = new URL(String(raw || "").trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  const port = u.port && u.port !== "80" && u.port !== "443" ? ":" + u.port : "";
  let path = u.pathname.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (!path) path = "/";
  const params = [...u.searchParams.entries()]
    .filter(([k]) => !/^(utm_[a-z_]+|fbclid|gclid|mc_cid|mc_eid)$/i.test(k))
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  const query = params.length ? "?" + new URLSearchParams(params).toString() : "";
  // The scheme is in the key as well as the address: http and https of a page are
  // two pages, and one is never diffed against the other.
  const url = u.protocol + "//" + host + port + path + query;
  return { key: url, url: url };
}
__name(lookNormalize, "lookNormalize");

async function lookDigest(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(lookDigest, "lookDigest");

// Lines added and lines gone. A line that only moved counts as both, which is
// honest for a page: markdown order is part of what it said.
function lookDiff(before, after) {
  const old = String(before || "").split("\n");
  const next = String(after || "").split("\n");
  const was = new Set(old);
  const is = new Set(next);
  const added = next.filter((l) => l.trim() && !was.has(l));
  const removed = old.filter((l) => l.trim() && !is.has(l));
  return {
    same: added.length === 0 && removed.length === 0,
    added: added.length,
    removed: removed.length,
    plus: added.slice(0, 40).map((l) => l.slice(0, 200)),
    minus: removed.slice(0, 40).map((l) => l.slice(0, 200)),
  };
}
__name(lookDiff, "lookDiff");

async function handleLook(request, env) {
  const gate = dialGate(request, env);
  if (gate !== "yes") return gateJson(gate);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: { code: "invalid_json", message: "Send { url }." } }, 400);
  }
  const norm = lookNormalize(String(body?.url || "").slice(0, 2000));
  if (!norm) {
    return json({ ok: false, error: { code: "url_required", message: "Send { url } with an http(s) address." } }, 400);
  }
  const target = norm.url;
  if (!env?.CF_API_TOKEN) {
    return json({ ok: false, error: { code: "browser_unconfigured", message: "CF_API_TOKEN is not set on this Worker." } }, 503);
  }
  if (!env?.CF_ACCOUNT) {
    return json({ ok: false, error: { code: "account_unconfigured", message: "CF_ACCOUNT is not set on this Worker." } }, 503);
  }
  const key = LOOK_PREFIX + await lookDigest(norm.key);
  let previous = null;
  if (env?.PREFS?.get) {
    const raw = await env.PREFS.get(key).catch(() => null);
    if (raw) {
      try {
        previous = JSON.parse(raw);
      } catch {
        previous = null;
      }
    }
  }
  let snapshot;
  try {
    const response = await fetch(
      "https://api.cloudflare.com/client/v4/accounts/" + env.CF_ACCOUNT + "/browser-rendering/markdown",
      {
        method: "POST",
        headers: { authorization: "Bearer " + env.CF_API_TOKEN, "content-type": "application/json" },
        body: JSON.stringify({ url: target })
      }
    );
    snapshot = await response.json().catch(() => null);
    if (!response.ok || !snapshot || snapshot.success !== true) {
      return json({
        ok: false,
        error: {
          code: "browser_refused",
          message: String(snapshot?.errors?.[0]?.message || "browser-rendering said no").slice(0, 300),
          status: response.status
        }
      }, 502);
    }
  } catch (err) {
    return json({ ok: false, error: { code: "browser_unreachable", message: String(err?.message || err).slice(0, 300) } }, 502);
  }
  const markdown = typeof snapshot.result === "string" ? snapshot.result.slice(0, 200000) : "";
  if (!markdown.trim()) {
    return json({ ok: false, error: { code: "no_markdown", message: "The page came back empty." } }, 502);
  }
  const at = new Date().toISOString();
  if (env?.PREFS?.put) {
    await env.PREFS.put(key, JSON.stringify({ url: target, at, markdown })).catch(() => null);
  }
  return json({
    ok: true,
    url: target,
    key: norm.key,
    at,
    previous_at: previous ? previous.at || null : null,
    first: !previous,
    chars: markdown.length,
    diff: lookDiff(previous ? previous.markdown : "", markdown)
  });
}
__name(handleLook, "handleLook");

// A dynamic Worker: the code is loaded into its own sandbox, runs once, and is
// gone. Nothing it does becomes part of this Worker, and the answer is text.
async function handleSandbox(request, env) {
  const gate = dialGate(request, env);
  if (gate !== "yes") return gateJson(gate);
  if (!env?.LOADER || typeof env.LOADER.load !== "function") {
    return json({ ok: false, error: { code: "loader_unbound", message: "LOADER is not bound to this Worker." } }, 503);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: { code: "invalid_json", message: "Send { code: \"return 2 + 2\" }." } }, 400);
  }
  const code = String(body?.code || "").slice(0, 20000);
  if (!code.trim()) {
    return json({ ok: false, error: { code: "code_required", message: "Send { code }." } }, 400);
  }
  const input = String(body?.input ?? "").slice(0, 8000);
  const module = [
    "export default {",
    "  async fetch(request) {",
    "    const input = await request.text();",
    "    const out = await (async () => {",
    code,
    "    })();",
    "    return new Response(typeof out === 'string' ? out : JSON.stringify(out ?? null), {",
    "      headers: { 'content-type': 'text/plain; charset=utf-8' }",
    "    });",
    "  }",
    "};",
  ].join("\n");
  try {
    const worker = env.LOADER.load({
      compatibilityDate: String(env.SANDBOX_DATE || "2026-11-01"),
      mainModule: "sandbox.js",
      modules: { "sandbox.js": module },
    });
    const stub = typeof worker.getEntrypoint === "function" ? worker.getEntrypoint() : worker;
    const res = await stub.fetch("https://sandbox/", { method: "POST", body: input });
    return json({ ok: res.ok, status: res.status, out: (await res.text()).slice(0, 20000) });
  } catch (err) {
    return json({ ok: false, error: { code: "sandbox_failed", message: String(err?.message || err).slice(0, 400) } }, 502);
  }
}
__name(handleSandbox, "handleSandbox");
/**
 * One Decisions call, from the page to the proxy.
 *
 * The shape is the API's own — model, state, typed questions — and nothing is
 * rewritten on the way through: a test that answers differently here than it does
 * from curl is a test of this route, not of the model. State may be text or the
 * parts array the image tests need, and only image parts are carried.
 */
async function handleDecisions(request, env) {
  const origin = request.headers.get("origin");
  if (origin) {
    // A page on another site does not get to spend this account's credits by
    // pointing a browser at the route.
    let same = false;
    try {
      same = new URL(origin).host === new URL(request.url).host;
    } catch {
      same = false;
    }
    if (!same) return json({ error: { code: "cross_origin", message: "Send this from the workbench itself." } }, 403);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: { code: "invalid_json", message: "Send { model, state, questions }." } }, 400);
  }
  const model = String(body?.model || "perplexity/pplx-decider-v1.2").slice(0, 120);
  const questions = body?.questions;
  if (!questions || typeof questions !== "object" || Array.isArray(questions) || !Object.keys(questions).length) {
    return json({ error: { code: "questions_required", message: "Send at least one typed question, keyed by name." } }, 400);
  }
  let state = body?.state;
  if (typeof state === "string") {
    state = state.slice(0, 2e5);
  } else if (Array.isArray(state)) {
    state = state.slice(0, 8).map((part) => {
      if (typeof part === "string") return part.slice(0, 2e5);
      const url = part && part.type === "image_url" && part.image_url && typeof part.image_url.url === "string" ? part.image_url.url : "";
      return /^data:image\/(png|jpeg|webp);base64,/.test(url) ? { type: "image_url", image_url: { url: url.slice(0, 6 * 1024 * 1024) } } : null;
    }).filter(Boolean);
  } else {
    return json({ error: { code: "state_required", message: "Send state as text, or as an array of parts." } }, 400);
  }
  if (!state || (Array.isArray(state) && !state.length)) {
    return json({ error: { code: "state_empty", message: "The state is empty; there is nothing to decide about." } }, 400);
  }
  const proxy = proxyOf(env);
  if (!proxy) {
    return json({ error: { code: "proxy_unbound", message: "The proxy that holds the key is not bound." } }, 503);
  }
  let upstream;
  try {
    upstream = await proxy.fetch(new Request("https://ai-proxy/api/decide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, state, questions })
    }));
  } catch (err) {
    return json({ error: { code: "proxy_unreachable", message: String((err && err.message) || err).slice(0, 300) } }, 502);
  }
  const raw = await upstream.text().catch(() => "");
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }
  const response = json(data || { error: { code: "unreadable_upstream", message: raw.slice(0, 400) } }, upstream.ok ? 200 : upstream.status);
  response.headers.set("cache-control", "no-store");
  return response;
}
__name(handleDecisions, "handleDecisions");

async function handleAmbient(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, 400);
  }
  const thread = Array.isArray(body?.thread) ? body.thread.filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant")).map((m) => ({ role: m.role, content: m.content.slice(0, 8e3) })).slice(-12) : [];
  const ask = [...thread].reverse().find((m) => m.role === "user")?.content?.trim() || "";
  if (!ask) return json({ error: { code: "ask_required", message: "Send { thread: [...] } with a user message." } }, 400);
  const learned = [];
  if (PREF_STATEMENT.test(ask)) {
    const saved = await savePref(env, ask, "conversation", "owner");
    if (saved) learned.push(saved);
  }
  // The dial sends what it has heard him say and choose. A standing preference
  // stated earlier is still a preference, whether or not it was said this turn.
  const memory = Array.isArray(body?.memory) ? body.memory.filter((m) => m && typeof m.text === "string").slice(-24) : [];
  for (const entry of memory) {
    const text = String(entry.text).slice(0, 500);
    if (!PREF_STATEMENT.test(text)) continue;
    const saved = await savePref(env, text, "dial", "owner");
    if (saved && !learned.some((l) => l.text === saved.text)) learned.push(saved);
  }
  const files = cleanFiles(body?.files);
  const context = (String(body?.context || "").slice(0, 1600) + snapshotBlock(body?.previous, body?.mode, ask)).slice(0, 2e3);
  const prefs = await loadPrefs(env);
  // The pair, if the store already holds one, read before she decides and in the
  // same order the cards page reads it: the store first, then her. Asked cold, a
  // bare key looks like nothing at all — which is what "no stored pair" was.
  const stored = await readStored(env, ask);
  const first = await decideFirst(env, ask, { thread, prefs, files, looking: context, stored });
  // ARA is the reasoning authority. Without her there is no answer to give, and
  // the dock says so instead of quietly answering from somewhere else.
  if (!first.ok) {
    return json({
      error: {
        code: "ara_unavailable",
        message: "ARA did not answer (" + first.reason + "), so the ambient assistant has nothing of hers to say.",
        detail: first.reason
      },
      decision: null,
      via: "ara"
    }, 503);
  }
  const decision = first.decision;
  const face = { id: decision.id ?? null, move: decision.move, domain: decision.domain, target: decision.target, cost: decision.cost };
  const intervention = interventionOf(decision);
  // She may name the wheel's Worker as the target of a decision. When she does,
  // its own reading rides beside the reply: what roots it holds, and the digest
  // of the one that was asked about.
  const reading = String(decision.target || "").toLowerCase() === "trnv" ? await readTrnv(env, ask) : null;
  const alongside = reading ? { reading } : {};
  if (decision.clarify) {
    const asked = (decision.clarify.questions || [])[0] || null;
    const said = decision.text || asked && asked.q || "";
    return json({
      text: said,
      // The decision was made; this is what came of it, so she hears it.
      outcome: await reportOutcome(env, face.id, said),
      clarify: decision.clarify,
      decision: face,
      intervention,
      ...alongside,
      via: "ara"
    });
  }
  // Her own answer is the answer. The model speaks only when she chose not to.
  if (decision.text) {
    const hers = extractPrefs(decision.text);
    for (const preference of hers.learned) {
      if (learned.some((entry) => entry.text === preference)) continue;
      // Written by a model, so it is a candidate and not a standing rule: the
      // words are kept with their provenance and wait for him to promote them.
      const saved = await savePref(env, preference, "ara", "model", "model_suggested", "candidate");
      if (saved) learned.push(saved);
    }
    return json({
      text: hers.text,
      via: "ara",
      learned,
      decision: face,
      intervention,
      ...alongside,
      outcome: await reportOutcome(env, face.id, hers.text)
    });
  }
  // She decided and wrote nothing. Measured against the deployed ARA, that is every
  // ask: `/decide` returns the move and the notes, never a sentence. So the pen is
  // asked to write out the decision she made — CODS is a writer, not a second
  // opinion, handed her move and her recommendation and asked to say only that.
  const written = await writeOut(env, ask, { intervention, move: decision.move, context, files });
  // What came back is the stored pair when the pen returned it as it stands. The
  // first few hundred characters decide that honestly enough, and a rewritten
  // answer carries no store mark rather than a claim it did not earn.
  const fromStore = Boolean(
    stored &&
    written.ok &&
    typeof written.text === "string" &&
    written.text.trim() &&
    written.text.trim().slice(0, 400) === stored.answer.trim().slice(0, 400)
  );
  const storeMark = fromStore ? { store: { layer: stored.layer, id: stored.id } } : {};
  if (written.ok && written.clarify) {
    // The reply is her decision carried out as a clarify card: the question and its
    // options are the answer. Nothing is added to them.
    const asked = (written.clarify.questions || [])[0] || null;
    const said = written.text || (asked && asked.q) || "";
    return json({
      text: said,
      via: "cods",
      learned,
      decision: face,
      intervention,
      clarify: written.clarify,
      ...alongside,
      ...storeMark,
      outcome: await reportOutcome(env, face.id, said)
    });
  }
  // CODS came back with neither an answer nor a clarify card. The reply says that
  // and nothing else: the text is empty and the reason is named.
  if (!written.ok && written.reason === "writer_silent") {
    return json({
      text: "",
      via: "cods",
      learned,
      decision: face,
      intervention,
      no_answer: { reason: "writer_silent" },
      outcome: null
    });
  }
  if (!written.ok) {
    return json({
      error: {
        code: "no_writer",
        message: written.reason
      },
      text: "",
      via: "cods",
      learned,
      decision: face,
      intervention
    }, 503);
  }
  return json({
    text: written.text,
    via: "cods",
    learned,
    decision: face,
    intervention,
    ...alongside,
    ...storeMark,
    outcome: await reportOutcome(env, face.id, written.text)
  });
}

/**
 * The pen.
 *
 * Her decision is the instruction and the writer is told so: what to do, in her
 * recommendation's words, about what he actually asked. If no writer is bound the
 * answer is nothing at all, said honestly, rather than words from somewhere the
 * decision never reached.
 */
async function writeOut(env, ask, { intervention = null, move = null, context = "", files = [] } = {}) {
  const direction = [
    move ? `move: ${move}` : "",
    intervention && intervention.recommend ? `recommend: ${intervention.recommend}` : "",
    context ? `the page he is on: ${context}` : ""
  ].filter(Boolean).join("\n");
  // CODS writes from words and cannot see a picture, so a turn carrying an image
  // is written over the proxy instead. The ceiling is the same one, checked before
  // every model is called: a model over nine cents does not run, it is named.
  const pictures = files.filter((file) => file.image && file.dataUrl).map((file) => file.dataUrl);
  if (pictures.length) return writePictures(env, ask, { direction, pictures });
  const binding = env && env.CODS && typeof env.CODS.fetch === "function" ? env.CODS : null;
  if (!binding) return { ok: false, reason: "writer_unbound" };
  try {
    const response = await binding.fetch(
      new Request("https://cods/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // His model rides with the ask, the same pick the card ops use.
        body: JSON.stringify(Object.assign({ prompt: String(ask).slice(0, 8e3), context: direction.slice(0, 2e3) }, await routeOf(env)))
      })
    );
    if (!response.ok) return { ok: false, reason: "writer_" + response.status };
    const data = await response.json().catch(() => null);
    const text = data && (data.answer || data.text || data.response);
    // A clarify card is an answer too: the question and the options come back from
    // CODS and go to the dock untouched.
    const clarify = data && data.clarify && Array.isArray(data.clarify.questions) && data.clarify.questions.length ? data.clarify : null;
    if ((!text || typeof text !== "string") && !clarify) return { ok: false, reason: "writer_silent" };
    return { ok: true, text: typeof text === "string" ? text : "", clarify };
  } catch (error) {
    return { ok: false, reason: "writer_failed" };
  }
}
/**
 * The pen, when there is a picture to look at.
 *
 * The cheap text model is tried first and the vision model only when it refuses,
 * so the fallback is exercised by a real refusal rather than assumed to work. No
 * model is called before its price is read against the ceiling.
 */
async function writePictures(env, ask, { direction = "", pictures = [] } = {}) {
  const binding = proxyOf(env);
  if (!binding) return { ok: false, reason: "writer_no_proxy" };
  const cheapModel = env.MODEL || "upstage/solar-mini-4-5";
  const visionModel = env.VISION_MODEL || "google/gemma-3-4b-it";
  const messages = [
    {
      role: "system",
      content: "You write out a decision that has already been made. Say only what it says, in as few words as the page needs." + (direction ? "\n\n" + direction : "")
    },
    {
      role: "user",
      content: [{ type: "text", text: String(ask).slice(0, 4e3) }, ...pictures.map((url) => ({ type: "image_url", image_url: { url } }))]
    }
  ];
  const attempts = [cheapModel, visionModel].filter((model, index, all) => all.indexOf(model) === index);
  let failure = { ok: false, reason: "writer_silent" };
  for (const model of attempts) {
    const price = modelPrice(model);
    if (!price.ok) {
      failure = { ok: false, reason: "writer_over_price", detail: price.reason };
      continue;
    }
    let response;
    try {
      response = await binding.fetch(new Request("https://ai-proxy/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, messages, max_tokens: 1200 })
      }));
    } catch (err) {
      failure = { ok: false, reason: "writer_failed", detail: String((err && err.message) || err).slice(0, 200) };
      continue;
    }
    const raw = await response.text().catch(() => "");
    let body = null;
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
    if (!response.ok) {
      failure = { ok: false, reason: "writer_" + response.status, detail: raw.slice(0, 200) };
      continue;
    }
    const said = String((body && (body.text || body.answer || body.response)) || "").trim();
    if (!said) {
      failure = { ok: false, reason: "writer_silent" };
      continue;
    }
    return { ok: true, text: said, model };
  }
  return failure;
}
__name(writePictures, "writePictures");
__name(writeOut, "writeOut");
__name(handleAmbient, "handleAmbient");
/**
 * TRNV's reading, over the binding.
 *
 * The wheel's Worker answers which roots it holds and what one of them last
 * looked like. The digest is the value: it is the only thing that says two
 * folders are the same or that one moved, and no answer can be guessed from
 * prose. Nothing is decided here — a decision whose target is `trnv` gets what
 * the neighbour actually holds, or the reason it could not be read.
 */
async function readTrnv(env, ask) {
  const binding = env && env.TRNV && typeof env.TRNV.fetch === "function" ? env.TRNV : null;
  if (!binding) return { via: "trnv", ok: false, reason: "unbound" };
  let apps = [];
  try {
    const response = await binding.fetch(new Request("https://trnv/api/apps"));
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || !Array.isArray(data.apps) || !data.apps.length) {
      return { via: "trnv", ok: false, reason: (data && data.error) || "apps_" + response.status };
    }
    apps = data.apps;
  } catch {
    return { via: "trnv", ok: false, reason: "unreachable" };
  }
  // The root he named, if he named one; otherwise the newest, which is the one
  // /api/apps puts first.
  const said = String(ask || "");
  const named = apps.find((app) => {
    const slug = String((app && (app.slug || app.title)) || "");
    return slug && said.includes(slug);
  });
  const rooted = named || apps[0];
  const root = String((rooted && (rooted.slug || rooted.title)) || "");
  if (!root) return { via: "trnv", ok: false, reason: "no_roots" };
  try {
    const response = await binding.fetch(new Request("https://trnv/api/state?root=" + encodeURIComponent(root)));
    const state = await response.json().catch(() => null);
    if (!response.ok || !state || typeof state.digest !== "string") {
      return { via: "trnv", ok: false, root, reason: (state && state.error) || "state_" + response.status };
    }
    return {
      via: "trnv",
      ok: true,
      root: state.root || root,
      files: Array.isArray(state.files) ? state.files.length : null,
      digest: state.digest,
      at: state.at ?? null,
      roots: apps.length
    };
  } catch {
    return { via: "trnv", ok: false, root, reason: "unreachable" };
  }
}
__name(readTrnv, "readTrnv");
/**
 * Cards he already owns.
 *
 * The store keeps a deck as a list of question-and-answer cards in KV. Read over
 * the binding, it is the same shape the board draws, so calling one up is a read
 * and a layout — nothing is generated, and a deck that is not there is a miss
 * named as one rather than an empty board that looks like an answer.
 */
async function readCards(env, deck) {
  const binding = env && env.CODS && typeof env.CODS.fetch === "function" ? env.CODS : null;
  if (!binding) return { via: "cods", ok: false, reason: "cods_unbound" };
  const id = String(deck || "").trim();
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) return { via: "cods", ok: false, reason: "deck_required" };
  let data = null;
  let status = 0;
  try {
    const response = await binding.fetch(new Request("https://cods/deck?id=" + encodeURIComponent(id), {
      headers: { accept: "application/json" }
    }));
    status = response.status;
    data = await response.json().catch(() => null);
    if (!response.ok) return { via: "cods", ok: false, reason: "deck_" + status };
  } catch {
    return { via: "cods", ok: false, reason: "unreachable" };
  }
  const cards = (Array.isArray(data && data.cards) ? data.cards : [])
    .filter((card) => card && (card.q || card.a))
    .slice(0, 80)
    .map((card) => ({
      q: String(card.q || "").slice(0, 600),
      a: String(card.a || "").slice(0, 4000)
    }));
  return { via: "cods", ok: true, deck: id, cards, theme: (data && data.theme) || null, saved: Boolean(data && data.saved) };
}
__name(readCards, "readCards");
/**
 * Cards from cards.
 *
 * The store's card ops take a card he already has and write a new one from it:
 * continue, magic, style, split, merge, template. Split returns several. The
 * answer comes back in the same shape a deck does, so the board can draw it
 * without knowing which op made it.
 */
const CARD_OPS = ["continue", "magic", "style", "split", "merge", "template"];
/**
 * Which model writes.
 *
 * His pick, kept in his own store, not a constant in here. A pick is a model and
 * the route that reaches it: a Workers AI id, a proxy preset, or an OpenRouter
 * id. The page sets it; the answer and the card ops both read it, so one choice
 * covers the whole surface instead of each path guessing for him.
 */
const MODEL_KEY = "model:v1";
const MODEL_ROUTES = ["cf", "proxy", "openrouter"];
function cleanPick(pick) {
  if (!pick || typeof pick !== "object") return null;
  const id = String(pick.id || "").trim().slice(0, 120);
  const route = String(pick.route || "").trim();
  if (!id || MODEL_ROUTES.indexOf(route) < 0) return null;
  return { id, route, label: String(pick.label || id).slice(0, 80) };
}
__name(cleanPick, "cleanPick");
async function readModel(env) {
  if (!env || !env.PREFS || typeof env.PREFS.get !== "function") return null;
  try {
    const raw = await env.PREFS.get(MODEL_KEY);
    return raw ? cleanPick(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
__name(readModel, "readModel");
async function saveModel(env, pick) {
  if (!env || !env.PREFS || typeof env.PREFS.put !== "function") return false;
  try {
    if (!pick) { await env.PREFS.delete(MODEL_KEY); return true; }
    await env.PREFS.put(MODEL_KEY, JSON.stringify(pick));
    return true;
  } catch {
    return false;
  }
}
__name(saveModel, "saveModel");
// What a pick looks like on the wire to the store: each route has its own field,
// and picking one is also saying where it goes.
async function routeOf(env, pick) {
  // Until he picks, the model named in the config writes. A paid one, because a
  // free model's terms let the provider keep what is sent to it.
  const chosen = cleanPick(pick) || (await readModel(env)) || cleanPick({ id: env?.MODEL, route: "openrouter" });
  if (!chosen) return {}
  if (chosen.route === "cf") return { cf_models: [chosen.id], proxy: false };
  // A preset is named, not spelled out: the proxy only takes it as @preset/<slug>.
  // A bare name goes out as a model id, gets a 400 from OpenRouter, and the card
  // comes back from Workers AI instead of the preset he chose.
  if (chosen.route === "proxy" && chosen.id.indexOf("@preset/") !== 0 && chosen.id.indexOf("/") < 0) {
    return { preset: "@preset/" + chosen.id, proxy: true };
  }
  // An OpenRouter id rides the same proxy as a preset does: the proxy reads a
  // model it is given and hands a non-@cf one to OpenRouter itself. Sending it
  // down the store's Workers AI branch instead would answer with granite and
  // quietly ignore what he picked.
  return { preset: chosen.id, proxy: true };
}
__name(routeOf, "routeOf");
/**
 * The list of models the store will actually run, over its own binding.
 *
 * Nothing is hard-coded here: the store reports its Workers AI models, its proxy
 * presets and its OpenRouter ids, and this is them as groups so the page can
 * offer a choice rather than a single baked-in model.
 */
/**
 * Every OpenRouter model there is.
 *
 * Their public catalogue, read without a key because the list needs none, held
 * in his store for half a day so a search is not a round trip to them every
 * keystroke. The ids are what the proxy takes; nothing here decides anything.
 */
const OR_CACHE_KEY = "models:openrouter:v1";
const OR_CACHE_MS = 12 * 60 * 60 * 1000;
// A list that is fetched rather than shipped: held in his store for a while, and
// served stale rather than empty when the source stops answering. Both live
// lists go through here so there is one answer to "what happens when it fails".
async function cachedList(env, key, ms, load) {
  const store = env && env.PREFS && typeof env.PREFS.get === "function" ? env.PREFS : null;
  let stale = null;
  if (store) {
    try {
      const held = JSON.parse((await store.get(key)) || "null");
      if (held && Array.isArray(held.items) && held.items.length) {
        if (Date.now() - Number(held.at || 0) < ms) return { ok: true, at: held.at, items: held.items };
        stale = held;
      }
    } catch {}
  }
  const was = stale ? { ok: true, at: stale.at, items: stale.items, stale: true } : { ok: false, items: [] };
  let items = [];
  let why = "";
  try {
    const got = await load();
    items = (Array.isArray(got.items) ? got.items : []).filter((m) => m && m.id).slice(0, 2000);
    why = got.why || "empty";
  } catch (err) {
    why = String((err && err.message) || err);
  }
  if (!items.length) return Object.assign({ reason: why }, was);
  if (store && typeof store.put === "function") {
    try { await store.put(key, JSON.stringify({ at: Date.now(), items })); } catch {}
  }
  return { ok: true, at: Date.now(), items };
}
__name(cachedList, "cachedList");
async function openRouterModels(env) {
  return cachedList(env, OR_CACHE_KEY, OR_CACHE_MS, async () => {
    const response = await fetch("https://openrouter.ai/api/v1/models", { headers: { accept: "application/json" } });
    if (!response.ok) return { items: [], why: "openrouter_" + response.status };
    const data = await response.json().catch(() => null);
    return {
      why: "openrouter_empty",
      items: (Array.isArray(data && data.data) ? data.data : []).map((m) => ({
        id: String((m && m.id) || ""),
        label: String((m && (m.name || m.id)) || "")
      }))
    };
  });
}
__name(openRouterModels, "openRouterModels");
/**
 * The Workers AI list, read from Cloudflare's own catalogue rather than shipped
 * with this Worker.
 *
 * Baked in, the list was right on the day it was built and wrong from then on:
 * a model that appears afterwards is not pickable without a deploy. The public
 * catalogue page is the same source the docs read, it needs no key, and it
 * names each model's task, so the text models can be taken from it as they are
 * today. Held for six hours, and served stale rather than empty if they stop
 * answering.
 */
const CF_CATALOG_KEY = "models:cf:v2";
const CF_CATALOG_MS = 6 * 60 * 60 * 1000;
const CF_CATALOG_URL = "https://developers.cloudflare.com/ai/models/index.md";
const CF_TASKS = [
  "Text Generation",
  "Text Embeddings",
  "Text Classification",
  "Text-to-Image",
  "Image-to-Text",
  "Image-to-Video",
  "Text-to-Video",
  "Text-to-Speech",
  "Automatic Speech Recognition",
  "Image Classification"
];
async function cfModels(env) {
  return cachedList(env, CF_CATALOG_KEY, CF_CATALOG_MS, async () => {
    const response = await fetch(CF_CATALOG_URL, { headers: { accept: "text/markdown" } });
    if (!response.ok) return { items: [], why: "catalogue_" + response.status };
    const text = await response.text();
    // Each entry is a link under a heading: the heading is the short name, then
    // the provider, then the task, then the description, and the href carries
    // the id this account actually runs.
    const items = [];
    const seen = new Set();
    const row = /<h3>([^<]+)<\/h3>([\s\S]{0,400}?)\(https:\/\/developers\.cloudflare\.com\/ai\/models\/(@cf\/[^)\s]+)\/\)/g;
    let hit = row.exec(text);
    while (hit) {
      const after = hit[2];
      let task = "";
      let first = -1;
      CF_TASKS.forEach((name) => {
        const at = after.indexOf(name);
        if (at >= 0 && (first < 0 || at < first)) { first = at; task = name; }
      });
      const id = hit[3];
      if (task === "Text Generation" && !seen.has(id)) {
        seen.add(id);
        items.push({ id, label: id });
      }
      hit = row.exec(text);
    }
    return { items, why: "catalogue_empty" };
  });
}
__name(cfModels, "cfModels");
async function readModels(env) {
  const binding = env && env.CODS && typeof env.CODS.fetch === "function" ? env.CODS : null;
  if (!binding) return { via: "cods", ok: false, reason: "cods_unbound" };
  let data = null;
  try {
    const response = await binding.fetch(new Request("https://cods/models", { headers: { accept: "application/json" } }));
    if (!response.ok) return { via: "cods", ok: false, reason: "models_" + response.status };
    data = await response.json().catch(() => null);
  } catch {
    return { via: "cods", ok: false, reason: "unreachable" };
  }
  const groups = [];
  const workers = (Array.isArray(data && data.workers) ? data.workers : [])
    .map((m) => ({ id: String((m && m.id) || ""), label: String((m && (m.label || m.short || m.id)) || ""), route: "cf" }))
    .filter((m) => m.id);
  // The catalogue is read live, not shipped: the store's own picks only lend
  // their names to the ids they share with it.
  const known = new Map(workers.map((m) => [m.id, m.label]));
  const live = await cfModels(env);
  const ai = live.items.map((m) => ({ id: m.id, label: known.get(m.id) || m.label || m.id, route: "cf" }));
  if (ai.length) groups.push({ name: "workers ai — " + ai.length + " text models", items: ai });
  else if (workers.length) groups.push({ name: "workers ai — the store's picks", items: workers });
  const presetDefault = data && data.proxy && data.proxy.default_preset ? String(data.proxy.default_preset) : "";
  const presets = data && data.proxy && Array.isArray(data.proxy.presets) ? data.proxy.presets : [];
  if (presets.length) {
    groups.push({
      name: "proxy presets",
      items: presets.map((p) => ({ id: String(p), label: "preset " + String(p) + (String(p) === presetDefault ? " (default)" : ""), route: "proxy" }))
    });
  }
  // OpenRouter is one list, searched on its own route so the sheet stays quick:
  // a four-name shortlist beside it only ever duplicated the search.
  groups.push({ name: "openrouter — every model", items: [], search: "openrouter" });
  return { via: "cods", ok: true, default: (data && data.default) || null, groups };
}
__name(readModels, "readModels");
async function growCards(env, body) {
  const binding = env && env.CODS && typeof env.CODS.fetch === "function" ? env.CODS : null;
  if (!binding) return { via: "cods", ok: false, reason: "cods_unbound" };
  const op = String((body && body.op) || "").trim();
  if (CARD_OPS.indexOf(op) < 0) return { via: "cods", ok: false, reason: "unknown_op" };
  const shape = (card) => ({
    q: String((card && card.q) || "").slice(0, 600),
    a: String((card && card.a) || "").slice(0, 8000)
  });
  const one = body && body.card && typeof body.card === "object" ? shape(body.card) : null;
  const many = Array.isArray(body && body.cards) ? body.cards.filter((card) => card && (card.q || card.a)).slice(0, 6).map(shape) : [];
  if (op === "merge" ? many.length < 2 : !one) return { via: "cods", ok: false, reason: op === "merge" ? "cards_required" : "card_required" };
  // His pick rides with the op. No pick means no instruction from here: the
  // store runs its own chain, and this side does not choose a model for him.
  const pick = cleanPick(body && body.model ? { id: body.model, route: body.route || "cf", label: body.label } : null) || (await readModel(env));
  const asked = await routeOf(env, pick);
  let data = null;
  let status = 0;
  try {
    const response = await binding.fetch(new Request("https://cods/card", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.assign({
        op,
        card: one,
        cards: many,
        instruction: String((body && body.instruction) || "").slice(0, 400),
        template: (body && body.template) || null
      }, asked))
    }));
    status = response.status;
    data = await response.json().catch(() => null);
    if (!response.ok) return { via: "cods", ok: false, reason: (data && data.error) || "card_" + status };
  } catch {
    return { via: "cods", ok: false, reason: "unreachable" };
  }
  const cards = (Array.isArray(data && data.cards) ? data.cards : []).map(shape).filter((card) => card.q || card.a);
  return {
    via: "cods",
    ok: true,
    op,
    cards,
    provider: (data && data.provider) || null,
    model: pick ? pick.id : null,
    failures: Array.isArray(data && data.failures) ? data.failures : []
  };
}
__name(growCards, "growCards");
function cardsReason(reason) {
  if (reason === "deck_required") return "Give a deck id: 6 to 64 letters, numbers, dashes or underscores.";
  if (reason === "cods_unbound") return "The store is not bound, so there are no cards to call up.";
  if (reason === "unknown_op") return "The ops are continue, magic, style, split, merge and template.";
  if (reason === "card_required") return "Send the card to work from.";
  if (reason === "cards_required") return "Merge needs at least two cards.";
  if (reason === "unreachable") return "The store did not answer.";
  return "The store said " + String(reason || "nothing") + ".";
}
__name(cardsReason, "cardsReason");
/**
 * The pair the store already holds, read the way the cards page reads it.
 *
 * Truth answers a key with its own record, and names the layer it came from, so
 * a stored answer is never mistaken for one written now. A miss is null: there
 * is nothing to hand her, and she says so herself.
 */
async function readStored(env, ask) {
  const binding = env && env.TRUTH && typeof env.TRUTH.fetch === "function" ? env.TRUTH : null;
  const input = String(ask || "").trim();
  if (!binding || !input) return null;
  try {
    const response = await binding.fetch(new Request("https://truth/api/truth/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input }),
      // A store that cannot answer in three seconds is a miss, not a wait: the
      // ask still goes to her.
      signal: AbortSignal.timeout(3000)
    }));
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    const answer = String((data && data.answer) || "").trim();
    if (!answer) return null;
    const id = data && data.id != null ? data.id : null;
    return {
      id,
      layer: (data && data.layer) || "truth",
      key: "truth:" + (id == null ? "" : id),
      answer
    };
  } catch {
    return null;
  }
}
__name(readStored, "readStored");
async function decideFirst(env, ask, { thread = [], prefs = [], files = [], looking = "", mode = "ask", stored = null } = {}) {
  const binding = env && env.ARA && typeof env.ARA.fetch === "function" ? env.ARA : null;
  if (!binding) return { ok: false, reason: "ara_unbound" };
  const context = {
    thread: thread.slice(-6).map((message) => `${message.role}: ${String(message.content || "").slice(0, 300)}`).join("\n"),
    // What he is looking at, under the key Aura actually renders. `renderState`
    // reads domain, cards, prefs, artifact and thread from the source; anything
    // else is dropped, which is why a `looking` field changed nothing at all.
    artifact: String(looking || "").slice(0, 4000),
    prefs: prefsBlock(prefs),
    // A witness pass asks whether a change deserves her attention, not for an answer.
    mode,
    cards: files.filter((file) => file.name).map((file, index) => ({
      id: `file:${index}`,
      label: `Attached ${file.image ? "image" : "document"}: ${file.name}`
    })),
    // The picture itself: the data URL encoded once above for the prose call.
    // The decider reads the same string, so an image is never fetched or encoded twice.
    images: files.filter((file) => file.image && file.dataUrl).slice(0, 4).map((file) => file.dataUrl)
  };
  try {
    const response = await binding.fetch(
      new Request("https://ara/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: ask,
          domain: "general",
          surface: "ambient",
          context,
          // What the store already holds, handed over the way the cards Worker
          // hands it: a pair she can name as the result instead of asking again.
          ...(stored ? { stored: { layer: stored.layer, answer: stored.answer, key: stored.key, id: stored.id } } : {})
        })
      })
    );
    if (!response.ok) {
      // Her refusal is worth keeping: without it a 502 says only that something
      // went wrong somewhere between here and her.
      const why = await response.text().catch(() => "");
      return { ok: false, reason: "ara_" + response.status + (why ? ": " + why.slice(0, 300) : "") };
    }
    const data = await response.json().catch(() => null);
    if (!data) return { ok: false, reason: "ara_unreadable" };
    return {
      ok: true,
      decision: {
        id: data.id ?? null,
        move: data.move ?? null,
        domain: data.domain ?? null,
        target: data.target ?? null,
        cost: data.cost ?? null,
        text: data.text ?? null,
        clarify: data.clarify ?? null,
        // What she thinks this deserves, and the six things an intervention has
        // to make clear. Absent or 0 means observe and stay silent.
        // Either shape: nested, or the level and its six parts sitting flat on
        // the decision itself. Both land the same way in the dock.
        intervention: data.intervention ?? (data.level ? {
          level: data.level,
          trigger: data.trigger,
          observed: data.observed,
          evidence: data.evidence,
          uncertain: data.uncertain,
          consequence: data.consequence,
          recommend: data.recommend
        } : null),
        level: data.level ?? null
      }
    };
  } catch {
    return { ok: false, reason: "ara_unreachable" };
  }
}
__name(decideFirst, "decideFirst");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "content-type",
          "access-control-allow-methods": "GET,POST,OPTIONS"
        }
      });
    }
    if (url.pathname === "/health") {
      return json({
        status: "ok",
        worker: "ambient",
        ara: Boolean(env?.ARA),
        memory: Boolean(env?.PREFS)
      });
    }
    if (url.pathname === "/embed.js") {
      return new Response(CLIENT, {
        headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" }
      });
    }
    if (url.pathname === "/api/prefs" && request.method === "GET") {
      const gate = allowedOrigin(request, env);
      if (!gate.ok) return json({ error: { code: "origin_denied", message: "This origin is not on the list that may read his memory." } }, 403);
      const prefs = await loadPrefs(env);
      const standing = prefs.filter(isStanding).length;
      const candidates = prefs.filter((pref) => pref.status === "candidate").length;
      const inferred = prefs.filter((pref) => pref.kind === "inferred").length;
      const response = json({ prefs, count: prefs.length, standing, candidates, inferred });
      // Named back rather than wildcarded: only an origin on the list is told it may
      // read this body, and one that is not is not told at all.
      if (gate.origin) response.headers.set("access-control-allow-origin", gate.origin);
      response.headers.set("vary", "origin");
      return response;
    }
    if (url.pathname === "/api/prefs" && request.method === "POST") {
      // A write is the same entitlement as a read: the pages that carry the dock,
      // and nothing else.
      const gate = allowedOrigin(request, env);
      if (!gate.ok) return json({ error: { code: "origin_denied", message: "This origin is not on the list that may write his memory." } }, 403);
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, 400);
      }
      // Promoting or rejecting is the only way a status changes, and the only way
      // a model-written candidate ever becomes something she is told to follow.
      if (body && body.id) {
        if (!env?.OPERATOR_KEY) {
          const denied = json({ error: { code: "operator_key_unset", message: "Set OPERATOR_KEY before a status can be promoted." } }, 403);
          if (gate.origin) denied.headers.set("access-control-allow-origin", gate.origin);
          return denied;
        }
        if (String(body.status) === "active" && request.headers.get("x-operator-key") !== env.OPERATOR_KEY) {
          const denied = json({ error: { code: "operator_key_required", message: "Send the operator key in x-operator-key to make a preference standing." } }, 403);
          if (gate.origin) denied.headers.set("access-control-allow-origin", gate.origin);
          return denied;
        }
        const by = gate.delegated ? gate.origin : "owner";
        const next = await setPrefStatus(env, body.id, body.status, by);
        const response = next
          ? json({ ok: true, pref: next })
          : json({ error: { code: "pref_unmatched", message: "Send { id, status } for a stored preference, where status is active, rejected or candidate." } }, 400);
        if (gate.origin) response.headers.set("access-control-allow-origin", gate.origin);
        return response;
      }
      // The kind is the operator's to name: an inference recorded here is kept as a
      // candidate like any other, and never quoted until he promotes it. A kind that
      // is not one of those names is refused here, before anything is written,
      // rather than quietly becoming "stated": the kind is what makes the memory
      // auditable afterwards, and a typo is not the operator naming one. A kind that
      // is absent or null still means he stated it.
      const requestedKind = body?.kind;
      if (requestedKind !== undefined && requestedKind !== null && String(requestedKind) !== "" && PREF_KINDS.indexOf(String(requestedKind)) < 0) {
        const refused = json({ error: { code: "kind_unknown", message: "Send kind as one of stated, model_suggested or inferred." } }, 400);
        if (gate.origin) refused.headers.set("access-control-allow-origin", gate.origin);
        return refused;
      }
      const by = gate.delegated ? gate.origin : "owner";
      const hasKey = Boolean(env?.OPERATOR_KEY) && request.headers.get("x-operator-key") === env.OPERATOR_KEY;
      const written = await savePref(env, body?.text, by, by, requestedKind || "stated");
      // Nothing becomes standing without the key, whichever origin the write came
      // from: one that would have landed active is held as a candidate instead. A
      // repeat never reaches that step: an existing record is returned untouched.
      const saved = written && written.status === "active" && !written.existed && !hasKey ? await setPrefStatus(env, written.id, "candidate", by) : written;
      const response = saved ? json({ ok: true, pref: saved }) : json({ error: { code: "pref_required", message: "Send { text } and make sure the PREFS binding exists." } }, 400);
      if (gate.origin) response.headers.set("access-control-allow-origin", gate.origin);
      return response;
    }
    
    if (url.pathname === "/api/authorization") {
      // The switch is the operator's, and the key is what makes that true. An unset
      // key is not "no gate": it is a gate that cannot be passed, so setting one is
      // the only way the switch can be moved at all.
      if (request.method === "POST" && !env?.OPERATOR_KEY) {
        return json({ error: { code: "operator_key_unset", message: "Set OPERATOR_KEY before the switch can be set." } }, 403);
      }
      if (env?.OPERATOR_KEY && request.headers.get("x-operator-key") !== env.OPERATOR_KEY) {
        return json({ error: { code: "operator_key_required", message: "Send the operator key in x-operator-key." } }, 403);
      }
      if (request.method === "GET") {
        const state = await readAuthorization(env);
        const response = json({ ok: true, authorization: state });
        response.headers.set("access-control-allow-origin", "*");
        return response;
      }
      if (request.method === "POST") {
        let body;
        try {
          body = await request.json();
        } catch {
          return json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, 400);
        }
        if (typeof body?.on !== "boolean") {
          return json({ error: { code: "on_required", message: "Send { on: true } or { on: false }." } }, 400);
        }
        const state = await setAuthorization(env, body.on);
        if (!state) return json({ error: { code: "prefs_unbound", message: "The store that keeps the switch is not bound." } }, 503);
        const response = json({ ok: true, authorization: { on: state.on, at: state.at, known: true } });
        response.headers.set("access-control-allow-origin", "*");
        return response;
      }
      return json({ error: { code: "method_not_allowed" } }, 405);
    }
    if (url.pathname === "/api/verdict" && request.method === "POST") {
      let verdict;
      try {
        verdict = await request.json();
      } catch {
        return json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, 400);
      }
      if (verdict?.id === undefined || verdict?.id === null) {
        return json({ error: { code: "id_required", message: "Send { id, correct, correctedTo }." } }, 400);
      }
      if (!(await readAuthorization(env)).on) {
        return json({ error: { code: "authorization_off", message: "Authorization is off: nothing AA concludes becomes ARA's evidence until you turn it on." } }, 403);
      }
      if (!env?.ARA || typeof env.ARA.fetch !== "function") return json({ error: { code: "ara_unbound" } }, 503);
      if (!env?.ARA_KEY) return json({ error: { code: "ara_key_unset" } }, 503);
      try {
        const answer = await env.ARA.fetch(new Request("https://ara/feedback", {
          method: "POST",
          headers: { "content-type": "application/json", "x-admin-key": env.ARA_KEY },
          body: JSON.stringify({
            id: verdict.id,
            correct: verdict.correct === true,
            correctedTo: verdict.correctedTo ? String(verdict.correctedTo).slice(0, 500) : null
          })
        }));
        if (!answer.ok) return json({ error: { code: "feedback_failed", message: "ARA " + answer.status } }, 502);
        const response = json({ ok: true, id: verdict.id });
        response.headers.set("access-control-allow-origin", "*");
        return response;
      } catch (err) {
        return json({ error: { code: "feedback_failed", message: String(err?.message || err) } }, 502);
      }
    }
    if (url.pathname === "/api/witness" && request.method === "POST") {
      let pass;
      try {
        pass = await request.json();
      } catch {
        return json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, 400);
      }
      const context = String(pass?.context || "").slice(0, 2e3);
      const observation = String(pass?.observation || "").slice(0, 2e3);
      const thread = Array.isArray(pass?.thread) ? pass.thread.filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant")).map((m) => ({ role: m.role, content: m.content.slice(0, 2e3) })).slice(-6) : [];
      const prefs = await loadPrefs(env);
      const seen = await decideFirst(env, observation || context || "The operator moved to a different part of the application.", { thread, prefs, looking: context, mode: "witness" });
      if (!seen.ok) {
        // A background pass stays quiet in the dock; /api/ambient carries the alarm.
        const quiet = json({ level: 0, silent: true, intervention: null, via: "ara", measured: false, reason: seen.reason }, 503);
        quiet.headers.set("access-control-allow-origin", "*");
        return quiet;
      }
      const decision = seen.decision;
      // A pass with words and no level is still a pass worth showing.
      const intervention = observedIntervention(decision);
      const response = json({
        level: intervention ? intervention.level : 0,
        silent: !intervention,
        intervention,
        text: decision.text || null,
        decision: { id: decision.id ?? null, move: decision.move ?? null, domain: decision.domain ?? null, target: decision.target ?? null },
        via: "ara",
        // Ruled B1: a pass that never reached ARA is not the same shape as a pass
        // that looked and chose silence. `silent` no longer has to mean both.
        measured: true,
        outcome: intervention ? await reportOutcome(env, decision.id ?? null, intervention.observed || intervention.trigger) : null
      });
      response.headers.set("access-control-allow-origin", "*");
      return response;
    }
    if (url.pathname === "/api/diagnose" && request.method === "POST") return handleDiagnose(request, env);
    if (url.pathname === "/api/diag" && request.method === "GET") return handleDiagCard(url, env);
    if (url.pathname === "/api/diff" && request.method === "POST") return handleDiff(request, env);
    if (url.pathname === "/api/look" && request.method === "POST") return handleLook(request, env);
    if (url.pathname === "/api/sandbox" && request.method === "POST") return handleSandbox(request, env);
    // The Decisions workbench: the page, and the one route it posts to. The key stays
    // on the Worker side; the proxy that already holds it is the only thing called.
    if (url.pathname === "/api/decisions" && request.method === "POST") return handleDecisions(request, env);
    if (url.pathname === "/api/ambient" && request.method === "POST") {
      const response = await handleAmbient(request, env);
      response.headers.set("access-control-allow-origin", "*");
      return response;
    }
    // Calling up cards: a deck he already saved, read from the store over the
    // binding. Nothing is written and nothing is generated on this path.
    if (url.pathname === "/api/cards" && request.method === "GET") {
      const got = await readCards(env, url.searchParams.get("deck"));
      const response = got.ok
        ? json({ via: "cods", ok: true, deck: got.deck, count: got.cards.length, saved: got.saved, theme: got.theme, cards: got.cards })
        : json({ via: "cods", ok: false, error: { code: got.reason, message: cardsReason(got.reason) } }, got.reason === "deck_required" ? 400 : 503);
      response.headers.set("access-control-allow-origin", "*");
      return response;
    }
    // Cards from cards: a card he has, handed to the store's own card op, coming
    // back as cards the board can draw. The model is the store's, not a second
    // one here.
    if (url.pathname === "/api/cards" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, 400);
      }
      const got = await growCards(env, body);
      const response = got.ok
        ? json({ via: "cods", ok: true, op: got.op, count: got.cards.length, provider: got.provider, model: got.model, failures: got.failures, cards: got.cards })
        : json({ via: "cods", ok: false, error: { code: got.reason, message: cardsReason(got.reason) } }, got.reason === "unknown_op" || got.reason === "card_required" || got.reason === "cards_required" ? 400 : 502);
      response.headers.set("access-control-allow-origin", "*");
      return response;
    }
    // The choice itself: what can be called, and what is being called now.
    if (url.pathname === "/api/models" && request.method === "GET") {
      const got = await readModels(env);
      const current = await readModel(env);
      const response = got.ok
        ? json({ via: "cods", ok: true, current, default: got.default, groups: got.groups })
        : json({ via: "cods", ok: false, current, error: { code: got.reason, message: cardsReason(got.reason) } }, 503);
      response.headers.set("access-control-allow-origin", "*");
      response.headers.set("cache-control", "no-store");
      return response;
    }
    // The long list, filtered: reading every OpenRouter model to show forty is a
    // waste of his phone's time, so the query comes to the server.
    if (url.pathname === "/api/models/openrouter" && request.method === "GET") {
      const q = String(url.searchParams.get("q") || "").trim().toLowerCase();
      const limit = Math.min(80, Math.max(1, Number(url.searchParams.get("limit") || 40)));
      const got = await openRouterModels(env);
      const items = got.items
        .filter((m) => !q || m.id.toLowerCase().indexOf(q) >= 0 || m.label.toLowerCase().indexOf(q) >= 0)
        .slice(0, limit)
        .map((m) => ({ id: m.id, label: m.label, route: "openrouter" }));
      const response = json({ ok: got.ok, count: got.items.length, shown: items.length, q, items, error: got.ok ? null : { code: got.reason } });
      response.headers.set("access-control-allow-origin", "*");
      response.headers.set("cache-control", "no-store");
      return response;
    }
    if (url.pathname === "/api/model" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, 400);
      }
      const pick = body && body.clear === true ? null : cleanPick(body);
      if (body && body.clear !== true && !pick) {
        return json({ error: { code: "model_required", message: "Send { id, route } where route is cf, proxy or openrouter, or { clear: true }." } }, 400);
      }
      const saved = await saveModel(env, pick);
      if (!saved) return json({ error: { code: "prefs_unbound", message: "The store that keeps the pick is not bound." } }, 503);
      const response = json({ ok: true, pick });
      response.headers.set("access-control-allow-origin", "*");
      return response;
    }
    if (url.pathname === "/lab" && request.method === "GET") {
      return new Response(LAB, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(DIAL, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    // The page about the dock is still here, at its own address.
    if (url.pathname === "/embed" && request.method === "GET") {
      return new Response(DEMO, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    return json({ error: { code: "not_found", message: `${url.pathname} is not a route.` } }, 404);
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map

