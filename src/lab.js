// The Decisions workbench.
//
// The reference test is two lines of curl: a model, a piece of state, and a typed
// question. This page is that curl with the parts exposed, so the state can grow and
// the image can be swapped without editing a shell command. The key never reaches the
// browser: the page posts to /api/decisions, and the Worker asks the proxy that
// already holds the OpenRouter key.
const LAB = String.raw`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>decisions — hands on</title>
<style>
  :root { color-scheme: dark; --bg:#0b0d10; --panel:#12161b; --line:#222a33; --ink:#e8edf3; --dim:#8b98a8; --accent:#4a9eff; --good:#5fd39a; --bad:#ff7b72; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
  main { max-width: 1080px; margin: 0 auto; padding: 28px 20px 64px; }
  h1 { font: 600 16px/1.3 inherit; letter-spacing:.14em; text-transform:uppercase; color:var(--dim); margin:0 0 4px; }
  p.lede { color:var(--dim); margin:0 0 22px; max-width:70ch; }
  p.lede a { color:var(--accent); }
  .grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
  @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
  section { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:14px; }
  label { display:block; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--dim); margin:0 0 6px; }
  input[type=text], textarea, select { width:100%; background:#0e1217; color:var(--ink); border:1px solid var(--line); border-radius:7px; padding:9px 10px; font:inherit; }
  textarea { min-height:96px; resize:vertical; }
  .row { display:flex; gap:10px; }
  .row > * { flex:1; }
  .field { margin-bottom:12px; }
  .actions { display:flex; gap:10px; align-items:center; margin-top:6px; }
  button { background:var(--accent); color:#06121f; border:0; border-radius:7px; padding:9px 16px; font:600 13px/1 inherit; letter-spacing:.06em; text-transform:uppercase; cursor:pointer; }
  button.ghost { background:transparent; color:var(--dim); border:1px solid var(--line); }
  button:disabled { opacity:.5; cursor:default; }
  .note { color:var(--dim); font-size:12px; }
  pre { margin:0; padding:12px; background:#0e1217; border:1px solid var(--line); border-radius:7px; overflow:auto; max-height:420px; white-space:pre-wrap; word-break:break-word; }
  .status { margin:14px 0 8px; color:var(--dim); font-size:12px; }
  .status b { color:var(--ink); font-weight:600; }
  .ok { color:var(--good); } .err { color:var(--bad); }
  .img-row { display:flex; gap:10px; align-items:center; }
  .img-row input[type=file] { color:var(--dim); font-size:12px; }
  .thumb { width:52px; height:52px; object-fit:cover; border-radius:6px; border:1px solid var(--line); display:none; }
</style></head>
<body><main>
  <h1>decisions — hands on</h1>
  <p class="lede">The reference test, with the parts editable: a model, a state, one typed question. Vary the text alone, then the image alone, and keep the question still — the answer is the measurement. Served through this Worker's proxy, so no key is in the page.</p>

  <div class="grid">
    <section>
      <div class="field">
        <label for="model">model</label>
        <input id="model" type="text" value="perplexity/pplx-decider-v1.2" spellcheck="false">
      </div>
      <div class="field">
        <label for="state">state</label>
        <textarea id="state" spellcheck="false">Your growing test text. Marker: ORANGE-731.</textarea>
        <div class="note" id="stateInfo" style="margin-top:6px"></div>
      </div>
      <div class="field">
        <label for="image">image part (goes into the state array)</label>
        <div class="img-row">
          <input id="image" type="file" accept="image/png,image/jpeg">
          <img id="thumb" class="thumb" alt="">
          <button class="ghost" id="clearImage" type="button">clear</button>
        </div>
        <div class="note" style="margin-top:6px">PNG or JPEG. As a part: {"type":"image_url","image_url":{"url":"data:image/jpeg;base64,…"}}</div>
      </div>
    </section>

    <section>
      <div class="row field">
        <div><label for="qkey">question key</label><input id="qkey" type="text" value="marker" spellcheck="false"></div>
        <div><label for="qtype">type</label>
          <select id="qtype">
            <option value="noul">noul</option>
            <option value="choice">choice</option>
            <option value="score">score</option>
            <option value="box">box</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label for="instructions">instructions</label>
        <textarea id="instructions" spellcheck="false">Is the exact marker ORANGE-731 present in the state?</textarea>
      </div>
      <div class="field" id="optionsField" style="display:none">
        <label for="options">options (one per line, for choice)</label>
        <textarea id="options" spellcheck="false"></textarea>
      </div>
      <div class="actions">
        <button id="send" type="button">send test</button>
        <button class="ghost" id="copy" type="button">copy request</button>
        <span class="note" id="hint"></span>
      </div>
    </section>
  </div>

  <div class="status" id="status">nothing sent yet</div>
  <section>
    <label>response</label>
    <pre id="out">—</pre>
  </section>

  <div class="status" id="sentLabel" style="display:none">request</div>
  <section id="sentWrap" style="display:none">
    <label>request body</label>
    <pre id="sent"></pre>
  </section>
</main>
<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var imageData = '';
  var imageName = '';

  function stateText() { return $('state').value; }

  function stateValue() {
    var text = stateText();
    if (!imageData) return text;
    return [text, { type: 'image_url', image_url: { url: imageData } }];
  }

  function questions() {
    var key = ($('qkey').value || 'marker').trim() || 'marker';
    var type = $('qtype').value;
    var q = { type: type, instructions: $('instructions').value };
    if (type === 'choice') {
      var opts = $('options').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      if (opts.length) q.options = opts;
    }
    var out = {};
    out[key] = q;
    return out;
  }

  function body() {
    return { model: $('model').value.trim(), state: stateValue(), questions: questions() };
  }

  function preview() {
    var b = body();
    var shown = JSON.parse(JSON.stringify(b));
    if (imageData) shown.state[1].image_url.url = imageData.slice(0, 64) + '… (' + Math.round(imageData.length / 1024) + ' kb)';
    return JSON.stringify(shown, null, 2);
  }

  function info() {
    var chars = stateText().length;
    var words = stateText().trim() ? stateText().trim().split(/\s+/).length : 0;
    $('stateInfo').textContent = chars + ' chars · ' + words + ' words' + (imageData ? ' · image ' + Math.round(imageData.length / 1024) + ' kb (' + imageName + ')' : ' · text only');
  }

  $('qtype').addEventListener('change', function () {
    $('optionsField').style.display = $('qtype').value === 'choice' ? '' : 'none';
  });
  $('state').addEventListener('input', info);

  $('image').addEventListener('change', function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      imageData = String(reader.result || '');
      imageName = file.name + ' · ' + file.type;
      $('thumb').src = imageData;
      $('thumb').style.display = 'block';
      info();
    };
    reader.readAsDataURL(file);
  });

  $('clearImage').addEventListener('click', function () {
    imageData = ''; imageName = ''; $('image').value = ''; $('thumb').style.display = 'none';
    info();
  });

  $('copy').addEventListener('click', function () {
    var text = preview();
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    $('hint').textContent = 'request copied';
    setTimeout(function () { $('hint').textContent = ''; }, 1600);
  });

  $('send').addEventListener('click', async function () {
    var payload = body();
    $('send').disabled = true;
    $('status').textContent = 'sending…';
    $('out').textContent = '—';
    var started = Date.now();
    try {
      var res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await res.json().catch(function () { return null; });
      var ms = Date.now() - started;
      $('out').textContent = JSON.stringify(data, null, 2);
      var cost = data && data.usage && data.usage.cost;
      var answer = data && data.answers && data.answers[Object.keys(data.answers)[0]];
      var said = answer ? (answer.noul !== undefined ? 'noul ' + answer.noul.toFixed(3) : JSON.stringify(answer)) : '';
      $('status').innerHTML = '<b class="' + (res.ok ? 'ok' : 'err') + '">' + res.status + '</b> · ' + ms + ' ms'
        + (data && data.model ? ' · <b>' + data.model + '</b>' : '')
        + (said ? ' · ' + said : '')
        + (cost !== undefined && cost !== null ? ' · $' + cost : '');
      $('sentLabel').style.display = '';
      $('sentWrap').style.display = '';
      $('sent').textContent = preview();
    } catch (err) {
      $('status').innerHTML = '<b class="err">failed</b> · ' + (err && err.message ? err.message : String(err));
    } finally {
      $('send').disabled = false;
    }
  });

  // The button stays off until something is worth sending, so a stray click cannot
  // spend a call on an empty state.
  function gate() { $('send').disabled = !stateText().trim() && !imageData; }
  $('state').addEventListener('input', gate);
  $('image').addEventListener('change', gate);
  $('clearImage').addEventListener('click', gate);
  gate();
  info();
})();
</script>
</body></html>`;
export default LAB;
