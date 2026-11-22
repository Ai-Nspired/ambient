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
    '@media (max-width:520px){.amb-panel{width:92vw}}'
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var dock = document.createElement('div');
  dock.className = 'amb-dock';
  dock.style.setProperty('--amb-accent', accent);
  dock.innerHTML =
    '<div class="amb-panel" role="dialog" aria-label="' + title + '">' +
      '<div class="amb-head"><strong>' + title + '</strong><span class="amb-badge">AMBIENT</span>' +
        '<button class="amb-round" data-act="close" title="Close" style="width:26px;height:26px;border-radius:8px">×</button></div>' +
      '<div class="amb-bar"></div>' +
      '<div class="amb-thread"></div>' +
      '<div class="amb-files"></div>' +
      '<input type="file" multiple style="display:none">' +
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
      // Nothing came back: no answer and no clarify. That is not an answer with a
      // status code in it — it is the decision and the reason, and nothing spoken.
      var bare = !failed && body && body.no_answer && !body.text;
      var text = bare
        ? 'move: ' + ((body.decision && body.decision.move) || '—') + ' · ' + body.no_answer.reason
        : (body && body.text) || (body && body.error && body.error.message) || ('No answer (' + res.status + ').');
      if (!failed && body && body.decision && body.decision.id !== undefined && body.decision.id !== null) attachVerdict(pending, body.decision.id);
      pending.textContent = text;
      // A failure is shown as a failure, never spoken as an answer.
      if (failed) pending.className = 'amb-turn bot err';
      else if (bare) pending.className = 'amb-turn bot quiet';
      else speak(text);
      if (!failed && body && body.intervention) showIntervention(body.intervention);
      if (!failed && body && body.clarify) offerChoices(pending, body.clarify, body.decision && body.decision.id);
      thread[thread.length - 1] = { role: 'assistant', content: text };
      if (files.length) { files = []; renderFiles(); }
      if (!failed) {
        window.dispatchEvent(new CustomEvent('ambient:card', { detail: { question: said, answer: text, venue: 'ambient' } }));
        if (render) drawCard(said, text);
      }
    } catch (err) {
      pending.textContent = 'Ambient unavailable: ' + err.message;
    }
    busy = false;
    bar.classList.remove('on');
    threadBox.scrollTop = threadBox.scrollHeight;
  }

  // Her clarify card: the options are what the answer could be, so they are offered
  // as buttons. A tap sends that option as the next ask; nothing is chosen for him.
  function offerChoices(el, clarify, id) {
    var asked = (clarify.questions || [])[0];
    if (!asked || !asked.q || !asked.options || !asked.options.length) return;
    var row = document.createElement('div');
    asked.options.slice(0, 10).forEach(function (option) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = option;
      button.style.cssText = 'display:block;width:100%;text-align:left;margin:4px 0 0;padding:7px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#dbe3ef;font:inherit;font-size:13px;cursor:pointer';
      button.addEventListener('click', function () {
        row.remove();
        // The choice is the result: it goes back on her row before the next ask, so
        // the loop closes on what he actually picked and not on what was offered.
        if (id !== undefined && id !== null) {
          fetch(new URL('/api/verdict', endpoint).toString(), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: id, correct: false, correctedTo: option })
          }).catch(function () {});
        }
        send(option);
      });
      row.appendChild(button);
    });
    el.appendChild(row);
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
    a.textContent = answer;
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

  if (shows) open(false);
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
<script src="/embed.js" data-accent="#4a9eff" data-title="Ambient" data-render="true"><\/script>
</body>
</html>`;
var json = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
}), "json");
var PREF_PREFIX = "pref:";
var PREF_STATEMENT = /^(from now on|going forward|from here on|always\b|never\b|remember(?: that|:)?\b|my preference is\b|i prefer\b|don'?t ever\b|do not ever\b|stop (?:using|doing|writing|saying)\b)/i;
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
    if (record && typeof record.text === "string" && record.text.trim()) prefs.push(record);
  }
  return prefs.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
}
__name(loadPrefs, "loadPrefs");
async function savePref(env, text, source = "ambient", actor = "owner") {
  const clean = String(text || "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!clean || !env?.PREFS?.put) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clean.toLowerCase()));
  const id = [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
  const record = { id, text: clean, at: (/* @__PURE__ */ new Date()).toISOString(), source, actor };
  await env.PREFS.put(PREF_PREFIX + id, JSON.stringify(record));
  return record;
}
__name(savePref, "savePref");
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
function prefsBlock(prefs) {
  if (!prefs.length) return "";
  return "\n\nWhat he has already told you he wants, in his own words:\n" + prefs.slice(0, 30).map((pref) => "- " + pref.text).join("\n") + "\n\nThese are standing. Follow them without being reminded, and never argue them down.";
}
__name(prefsBlock, "prefsBlock");
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
  const files = cleanFiles(body?.files);
  const context = String(body?.context || "").slice(0, 2e3);
  const prefs = await loadPrefs(env);
  const first = await decideFirst(env, ask, { thread, prefs, files, looking: context });
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
      via: "ara"
    });
  }
  // Her own answer is the answer. The model speaks only when she chose not to.
  if (decision.text) {
    const hers = extractPrefs(decision.text);
    for (const preference of hers.learned) {
      if (learned.some((entry) => entry.text === preference)) continue;
      const saved = await savePref(env, preference);
      if (saved) learned.push(saved);
    }
    return json({
      text: hers.text,
      via: "ara",
      learned,
      decision: face,
      intervention,
      outcome: await reportOutcome(env, face.id, hers.text)
    });
  }
  // She decided and wrote nothing. Measured against the deployed ARA, that is every
  // ask: `/decide` returns the move and the notes, never a sentence. So the pen is
  // asked to write out the decision she made — CODS is a writer, not a second
  // opinion, handed her move and her recommendation and asked to say only that.
  const written = await writeOut(env, ask, { intervention, move: decision.move, context });
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
async function writeOut(env, ask, { intervention = null, move = null, context = "" } = {}) {
  const binding = env && env.CODS && typeof env.CODS.fetch === "function" ? env.CODS : null;
  if (!binding) return { ok: false, reason: "writer_unbound" };
  const direction = [
    move ? `move: ${move}` : "",
    intervention && intervention.recommend ? `recommend: ${intervention.recommend}` : "",
    context ? `the page he is on: ${context}` : ""
  ].filter(Boolean).join("\n");
  try {
    const response = await binding.fetch(
      new Request("https://cods/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: String(ask).slice(0, 8e3), context: direction.slice(0, 2e3) })
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
__name(writeOut, "writeOut");
__name(handleAmbient, "handleAmbient");
async function decideFirst(env, ask, { thread = [], prefs = [], files = [], looking = "", mode = "ask" } = {}) {
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
    }))
  };
  try {
    const response = await binding.fetch(
      new Request("https://ara/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: ask, domain: "general", surface: "ambient", context })
      })
    );
    if (!response.ok) return { ok: false, reason: "ara_" + response.status };
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
      const prefs = await loadPrefs(env);
      const response = json({ prefs, count: prefs.length });
      response.headers.set("access-control-allow-origin", "*");
      return response;
    }
    if (url.pathname === "/api/prefs" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, 400);
      }
      const saved = await savePref(env, body?.text, "owner", "owner");
      const response = saved ? json({ ok: true, pref: saved }) : json({ error: { code: "pref_required", message: "Send { text } and make sure the PREFS binding exists." } }, 400);
      response.headers.set("access-control-allow-origin", "*");
      return response;
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
        const quiet = json({ level: 0, silent: true, intervention: null, via: "ara", reason: seen.reason }, 503);
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
        outcome: intervention ? await reportOutcome(env, decision.id ?? null, intervention.observed || intervention.trigger) : null
      });
      response.headers.set("access-control-allow-origin", "*");
      return response;
    }
    if (url.pathname === "/api/ambient" && request.method === "POST") {
      const response = await handleAmbient(request, env);
      response.headers.set("access-control-allow-origin", "*");
      return response;
    }
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(DEMO, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    return json({ error: { code: "not_found", message: `${url.pathname} is not a route.` } }, 404);
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map

