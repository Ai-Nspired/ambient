// The Decisions workbench.
//
// The point is not one question. A decision model reads a long state once and
// answers many typed questions against it in the same call, so the expensive part —
// the context — is paid for once and the questions are nearly free. This page is
// built around that: a state you can make long, a list of questions, and snapshots
// you can diff to see what a changed question moved.
//
// The key never reaches the browser: the page posts to /api/decisions and the Worker
// asks the proxy that already holds the OpenRouter key.
const LAB = String.raw`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>decisions — hands on</title>
<style>
  :root { color-scheme: dark; --bg:#0b0d10; --panel:#12161b; --line:#222a33; --ink:#e8edf3; --dim:#8b98a8; --accent:#4a9eff; --good:#5fd39a; --bad:#ff7b72; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
  main { max-width: 1180px; margin: 0 auto; padding: 26px 20px 64px; }
  h1 { font: 600 16px/1.3 inherit; letter-spacing:.14em; text-transform:uppercase; color:var(--dim); margin:0 0 4px; }
  p.lede { color:var(--dim); margin:0 0 16px; max-width:82ch; }
  .grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; align-items:start; }
  @media (max-width: 940px) { .grid { grid-template-columns: 1fr; } }
  section { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:14px; }
  label { display:block; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--dim); margin:0 0 6px; }
  input[type=text], input[type=number], textarea, select { width:100%; background:#0e1217; color:var(--ink); border:1px solid var(--line); border-radius:7px; padding:9px 10px; font:inherit; }
  textarea { min-height:88px; resize:vertical; }
  .row { display:flex; gap:10px; }
  .row > * { flex:1; }
  .field { margin-bottom:12px; }
  .actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:4px; }
  button { background:var(--accent); color:#06121f; border:0; border-radius:7px; padding:9px 14px; font:600 12px/1 inherit; letter-spacing:.06em; text-transform:uppercase; cursor:pointer; }
  button.ghost { background:transparent; color:var(--dim); border:1px solid var(--line); }
  button.tiny { padding:5px 9px; font-size:10px; }
  button:disabled { opacity:.5; cursor:default; }
  .note { color:var(--dim); font-size:12px; }
  pre { margin:0; padding:12px; background:#0e1217; border:1px solid var(--line); border-radius:7px; overflow:auto; max-height:340px; white-space:pre-wrap; word-break:break-word; }
  .status { margin:14px 0 8px; color:var(--dim); font-size:12px; }
  .status b { color:var(--ink); font-weight:600; }
  .ok { color:var(--good); } .err { color:var(--bad); }
  table { width:100%; border-collapse:collapse; font-size:11.5px; }
  th { text-align:left; color:var(--dim); font-weight:500; letter-spacing:.08em; text-transform:uppercase; font-size:10px; padding:0 8px 6px 0; }
  td { padding:5px 8px 5px 0; border-top:1px solid var(--line); color:#c6cfdb; vertical-align:top; }
  td.n { color:var(--ink); }
  #runs td:nth-child(2) { white-space:nowrap; font-size:11px; }
  #runs td:nth-child(3), #runs td:nth-child(5), #runs td:nth-child(6), #runs td:nth-child(7) { white-space:nowrap; }
  #runs td:nth-child(4) { min-width:190px; }
  .attach { display:none; margin-top:8px; }
  .attach.on { display:block; }
  .q { border:1px solid var(--line); border-radius:8px; padding:10px; margin-bottom:10px; background:#0f141a; }
  .q .head { display:flex; gap:8px; align-items:center; margin-bottom:8px; }
  .q .head input { flex:1; }
  .q .head select { flex:0 0 170px; }
  .q textarea { min-height:52px; }
  .q .crit { display:none; margin-top:8px; }
  .q .crit.on { display:block; }
  .q .crit textarea { min-height:66px; }
  .q .foot { display:flex; justify-content:flex-end; margin-top:6px; }
  .lever { display:flex; gap:16px; flex-wrap:wrap; margin:10px 0 0; }
  .lever div { font-size:12px; color:var(--dim); }
  .lever b { color:var(--ink); font-weight:600; }
  .snaps { display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; margin-bottom:10px; }
  .snaps > div { flex:1; min-width:180px; }
  .delta.up { color:var(--bad); } .delta.down { color:var(--good); } .delta.same { color:var(--dim); }
  .cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(238px,1fr)); gap:9px; }
  .card { text-align:left; background:#0f141a; border:1px solid var(--line); border-left:3px solid var(--good); border-radius:8px; padding:9px 10px 10px; color:var(--ink); font:inherit; cursor:pointer; }
  .card.fail { border-left-color:var(--bad); }
  .card .ct { display:flex; justify-content:space-between; gap:8px; font-size:11px; color:var(--dim); }
  .card .cm { margin-top:5px; font-size:11px; color:var(--dim); }
  .card .ca { margin-top:5px; font-size:11.5px; color:#c6cfdb; word-break:break-word; }
  .card:hover { border-color:#2f3d4f; }
  .q .exp { margin-top:8px; }
  .q .exp input { width:180px; padding:6px 8px; font-size:12px; }
  .q .exp span { display:block; margin-top:4px; font-size:11px; color:var(--dim); }
  .walks { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:9px; }
  .walk { text-align:left; background:#0f141a; border:1px solid var(--line); border-radius:8px; padding:10px; color:var(--ink); font:inherit; cursor:pointer; }
  .walk:hover { border-color:#2f3d4f; }
  .walk b { display:block; font-size:12px; letter-spacing:.04em; margin-bottom:4px; }
  .walk span { display:block; font-size:11.5px; color:var(--dim); line-height:1.45; }
  .walk.on { border-color:var(--accent); }
</style></head>
<body><main>
  <h1>decisions — hands on</h1>
  <p class="lede">One state, many questions, one call. The context is what you pay for, so make it long and ask everything at once; then snapshot the answers and diff them to see which question actually moved.</p>

  <div class="status">walkthroughs — load one and walk it</div>
  <section style="margin-bottom:16px">
    <div class="walks" id="walks"></div>
    <div class="actions" style="margin-top:10px;display:none" id="walkNav">
      <span class="note" id="walkStep"></span>
      <button class="ghost tiny" id="walkNext" type="button">next step →</button>
    </div>
    <div class="note" id="walkNote" style="margin-top:10px">Each walk loads its own state, model and questions, with an expected answer on every question — so the card that comes back says right or wrong, not just answered.</div>
  </section>

  <div class="grid">
    <section>
      <div class="field">
        <label for="model">model</label>
        <select id="model"><option value="perplexity/pplx-decider-v1.2">perplexity/pplx-decider-v1.2</option></select>
        <div class="note" id="modelNote" style="margin-top:6px">reading the catalogue…</div>
      </div>
      <div class="field">
        <label for="custom">or a model id of your own</label>
        <input id="custom" type="text" placeholder="vendor/model" spellcheck="false">
      </div>
      <div class="field">
        <label for="state">state (the long part)</label>
        <textarea id="state" spellcheck="false">Your growing test text. Marker: ORANGE-731.</textarea>
        <div class="row" style="margin-top:8px">
          <div style="flex:0 0 110px"><label for="repeat">repeat ×</label><input id="repeat" type="number" min="1" max="200" value="1"></div>
          <div style="flex:2"><div class="note" id="stateInfo" style="margin-top:22px"></div></div>
        </div>
        <div class="row" style="margin-top:8px;align-items:center">
          <input id="files" type="file" multiple style="flex:1">
          <button class="ghost tiny" id="clearState" type="button" style="flex:0 0 auto">empty</button>
        </div>
        <div class="note" id="filesNote" style="margin-top:6px">load files into the state — read as text, each under a header, up to 1.5M chars</div>
      </div>
      <div class="field">
        <label for="attachKind">attachment</label>
        <select id="attachKind">
          <option value="none">none</option>
          <option value="image">image part (image_url)</option>
          <option value="file">document part (file)</option>
        </select>
        <div class="attach" id="attachBox">
          <div class="row" style="margin-top:8px;align-items:center">
            <input id="attachFile" type="file" style="flex:1">
            <button class="ghost" id="clearAttach" type="button" style="flex:0 0 auto">clear</button>
          </div>
          <div class="note" id="attachNote" style="margin-top:6px"></div>
        </div>
        <div class="note" id="rules" style="margin-top:6px"></div>
      </div>
    </section>

    <section>
      <div class="field" style="display:flex;justify-content:space-between;align-items:center">
        <label style="margin:0">questions — all answered against the same state</label>
        <button class="ghost tiny" id="addQ" type="button">+ question</button>
      </div>
      <div class="actions" style="margin-bottom:10px">
        <select id="setsSel" style="flex:1;min-width:150px"><option value="">saved sets…</option></select>
        <input id="setName" type="text" placeholder="name this set" style="flex:1;min-width:130px">
        <button class="ghost tiny" id="saveSet" type="button">save</button>
        <button class="ghost tiny" id="delSet" type="button">delete</button>
      </div>
      <div id="questions"></div>
      <div class="actions">
        <button id="send" type="button">send test</button>
        <button class="ghost" id="copy" type="button">copy request</button>
        <span class="note" id="hint"></span>
      </div>
      <div class="actions" style="margin-top:10px">
        <button class="ghost" id="presetPplx" type="button">perplexity text</button>
        <button class="ghost" id="presetFlash" type="button">perplexity flash</button>
        <button class="ghost" id="presetDoc" type="button">scaledown document</button>
        <button class="ghost" id="presetGemini" type="button">gemini document</button>
        <button class="ghost" id="presetForm" type="button">form image</button>
        <button class="ghost" id="presetCode" type="button">codebase</button>
      </div>
    </section>
  </div>

  <div class="status" id="status">nothing sent yet</div>
  <div class="lever" id="lever"></div>
  <section style="margin-top:12px">
    <label>response</label>
    <pre id="out">—</pre>
  </section>

  <div class="status">runs</div>
  <section>
    <table>
      <thead><tr><th>#</th><th>model</th><th>state</th><th>questions</th><th>tokens</th><th>cost</th><th>ms</th></tr></thead>
      <tbody id="runs"><tr><td colspan="7" class="note">nothing sent yet</td></tr></tbody>
    </table>
  </section>

  <div class="status">context ladder — one question set, rising state</div>
  <section>
    <div class="actions" style="margin-bottom:10px">
      <button class="ghost" id="runLadder" type="button">run ladder on scaledown</button>
      <span class="note" id="ladderNote">10k → 1.5M chars, eleven rungs, text only, stops after two failures</span>
    </div>
    <table id="ladderTable" style="display:none">
      <thead><tr><th>chars</th><th>tokens</th><th>cost</th><th>ms</th><th>answers</th></tr></thead>
      <tbody id="ladder"></tbody>
    </table>
  </section>

  <div class="status">result cards — every run, answered or refused</div>
  <section>
    <div class="actions" style="margin-bottom:10px">
      <select id="cardFilter" style="flex:0 0 160px"><option value="all">all</option><option value="ok">answered</option><option value="fail">refused</option></select>
      <button class="ghost tiny" id="dlCards" type="button">download json</button>
      <input id="cardsFile" type="file" accept="application/json" style="flex:0 0 190px">
      <button class="ghost tiny" id="clearCards" type="button">clear</button>
      <span class="note" id="cardsNote">no cards yet — every run and every ladder rung drops one here</span>
    </div>
    <div class="cards" id="cards"></div>
  </section>

  <div class="status">snapshots &amp; diff</div>
  <section>
    <div class="snaps">
      <div><label for="snapA">baseline (a)</label><select id="snapA"></select></div>
      <div><label for="snapB">compare (b)</label><select id="snapB"></select></div>
      <div style="flex:0 0 auto"><button class="ghost tiny" id="dlSnaps" type="button">download json</button></div>
      <div style="flex:0 0 auto"><button class="ghost tiny" id="clearSnaps" type="button">clear</button></div>
    </div>
    <div class="note" id="snapNote" style="margin-bottom:10px">no snapshots yet — every run stores one</div>
    <table id="diffTable" style="display:none">
      <thead><tr><th>question</th><th>a</th><th>b</th><th>Δ</th></tr></thead>
      <tbody id="diff"></tbody>
    </table>
  </section>

  <section id="sentWrap" style="display:none;margin-top:12px">
    <label>request body (data URLs shortened)</label>
    <pre id="sent"></pre>
  </section>
</main>
<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var attachment = null; // { kind:'image'|'file', data:dataUrl, label:string }
  var runs = 0;
  var catalogue = {};
  var STORE = 'decisions.snapshots.v1';
  var snapshots = loadSnapshots();
  var walk = { recipe: null, step: 0 };

  function useModel(id) {
    var select = $('model');
    var has = Array.prototype.some.call(select.options, function (o) { return o.value === id; });
    select.value = has ? id : select.value;
    $('custom').value = has ? '' : id;
    rules();
  }

  function modelId() { return ($('custom').value || '').trim() || $('model').value; }

  function stateText() {
    var text = $('state').value;
    var times = Math.max(1, Math.min(200, Number($('repeat').value) || 1));
    if (times === 1) return text;
    var parts = [];
    for (var i = 0; i < times; i += 1) parts.push(text);
    return parts.join('\n');
  }

  function stateValue() {
    var text = stateText();
    if (!attachment) return text;
    var part = attachment.kind === 'image'
      ? { type: 'image_url', image_url: { url: attachment.data } }
      : { type: 'file', file: { file_data: attachment.data, filename: attachment.label } };
    return [text, part];
  }

  // ---- questions -----------------------------------------------------------
  function questionCards() {
    return Array.prototype.slice.call(document.querySelectorAll('#questions .q'));
  }

  function addQuestion(q) {
    var card = document.createElement('div');
    card.className = 'q';
    card.innerHTML = ''
      + '<div class="head">'
      + '  <input class="qkey" type="text" spellcheck="false" value="">'
      + '  <select class="qtype"><option value="noul">noul (yes/no)</option><option value="choice">choice (criteria)</option><option value="score">score (levels)</option></select>'
      + '</div>'
      + '<textarea class="qinst" spellcheck="false" placeholder="instructions"></textarea>'
      + '<div class="crit"><textarea class="qcrit" spellcheck="false" placeholder="key: description"></textarea>'
      + '<div class="note critnote" style="margin-top:6px">choice: one per line, key: description. score: one level per line, easiest to hardest, 2–10 of them.</div></div>'
      + '<div class="exp"><input class="qexp" type="text" spellcheck="false" placeholder="expect: yes / no">'
      + '<span>the answer you believe is right — a card grades against it</span></div>'
      + '<div class="foot"><button class="ghost tiny qdel" type="button">remove</button></div>';
    $('questions').appendChild(card);
    card.querySelector('.qkey').value = (q && q.key) || 'question_' + (questionCards().length + 1);
    card.querySelector('.qinst').value = (q && q.instructions) || '';
    card.querySelector('.qtype').value = (q && q.type) || 'noul';
    card.querySelector('.qcrit').value = (q && q.criteria) || '';
    card.querySelector('.qexp').value = (q && q.expect) || '';
    card.querySelector('.qtype').addEventListener('change', function () { syncCrit(card); });
    card.querySelector('.qdel').addEventListener('click', function () {
      if (questionCards().length === 1) { $('hint').textContent = 'keep at least one question'; return; }
      card.remove();
    });
    syncCrit(card);
    return card;
  }

  function syncCrit(card) {
    var type = card.querySelector('.qtype').value;
    card.querySelector('.crit').classList.toggle('on', type !== 'noul');
    card.querySelector('.critnote').textContent = type === 'score'
      ? 'score: one level per line, easiest to hardest, 2–10 of them.'
      : 'choice: one per line, "key: description".';
  }

  function questionsPayload() {
    var out = {};
    questionCards().forEach(function (card) {
      var key = (card.querySelector('.qkey').value || '').trim() || 'question';
      var type = card.querySelector('.qtype').value;
      var q = { type: type, instructions: card.querySelector('.qinst').value };
      var lines = (card.querySelector('.qcrit').value || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      if (type === 'choice' && lines.length) {
        q.criteria = {};
        lines.forEach(function (line) {
          var at = line.indexOf(':');
          if (at > 0) q.criteria[line.slice(0, at).trim()] = line.slice(at + 1).trim();
          else q.criteria[line] = line;
        });
      }
      if (type === 'score' && lines.length) q.criteria = lines;
      out[key] = q;
    });
    return out;
  }

  function questionList() { return questionCards().map(function (c) { return { key: c.querySelector('.qkey').value, type: c.querySelector('.qtype').value }; }); }

  function body() { return { model: modelId(), state: stateValue(), questions: questionsPayload() }; }

  function preview() {
    var shown = JSON.parse(JSON.stringify(body()));
    if (Array.isArray(shown.state) && shown.state[1]) {
      var part = shown.state[1];
      var data = part.type === 'image_url' ? part.image_url.url : part.file.file_data;
      var mark = data.slice(0, 40) + '… (' + Math.round(data.length / 1024) + ' kb)';
      if (part.type === 'image_url') part.image_url.url = mark;
      else part.file.file_data = mark;
    }
    return JSON.stringify(shown, null, 2);
  }

  function info() {
    var text = stateText();
    var words = text.trim() ? text.trim().split(/\s+/).length : 0;
    $('stateInfo').textContent = text.length + ' chars · ' + words + ' words · ≈' + Math.round(text.length / 4) + ' tokens';
    $('attachNote').textContent = attachment
      ? attachment.kind + ' · ' + attachment.label + ' · ' + Math.round(attachment.data.length / 1024) + ' kb — state becomes an array'
      : 'no attachment: the state is text';
  }

  function rules() {
    var id = modelId();
    var entry = catalogue[id] || null;
    var says = [];
    if (entry) {
      if (entry.ctx) says.push('ctx ' + Math.round(entry.ctx / 1000) + 'k');
      if (entry.inp !== null && entry.inp !== undefined) says.push('$' + entry.inp + '/M in');
      says.push(entry.file ? 'reads documents' : 'no document part');
      says.push(entry.image ? 'reads images' : 'no image part');
    } else {
      says.push('not in the catalogue — capabilities unknown');
    }
    if (/scaledown/.test(id)) says.push('one document per request, data URL only (pdf/png/jpeg/tiff)');
    if (/gemini-decision/.test(id)) says.push('pdf, csv, office, opendocument; a URL must name its type');
    $('rules').textContent = says.join(' · ');
  }

  $('attachKind').addEventListener('change', function () {
    var kind = $('attachKind').value;
    $('attachBox').classList.toggle('on', kind !== 'none');
    $('attachFile').accept = kind === 'file' ? '.pdf,.csv,application/pdf,text/csv' : 'image/png,image/jpeg,image/tiff';
    if (kind === 'none') { attachment = null; $('attachFile').value = ''; }
    info();
  });

  $('attachFile').addEventListener('change', function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      attachment = { kind: $('attachKind').value === 'image' ? 'image' : 'file', data: String(reader.result || ''), label: file.name };
      info();
    };
    reader.readAsDataURL(file);
  });

  $('clearAttach').addEventListener('click', function () { attachment = null; $('attachFile').value = ''; info(); });
  $('addQ').addEventListener('click', function () { addQuestion(); });
  $('state').addEventListener('input', info);
  $('repeat').addEventListener('input', info);
  $('custom').addEventListener('input', rules);
  $('model').addEventListener('change', rules);

  // A one-page PDF with real text, so a document test needs no file on hand.
  function simplePdf(lines) {
    var BS = String.fromCharCode(92);
    var esc = function (t) {
      return String(t).split(BS).join(BS + BS).replace(/[()]/g, function (c) { return BS + c; });
    };
    var content = 'BT /F1 11 Tf 24 730 Td 15 TL\n'
      + lines.map(function (l) { return '(' + esc(l) + ') Tj T*'; }).join('\n')
      + '\nET';
    var objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
      '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    ];
    var out = '%PDF-1.4\n';
    var offsets = [];
    objects.forEach(function (obj, i) {
      offsets.push(out.length);
      out += (i + 1) + ' 0 obj\n' + obj + '\nendobj\n';
    });
    var xref = out.length;
    out += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
    offsets.forEach(function (o) { out += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    out += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    return 'data:application/pdf;base64,' + btoa(out);
  }

  var INVOICE = [
    'NORTH VALLEY WATER DISTRICT',
    'Invoice 2026-4471',
    'Issued: 2026-11-02   Due: 2026-12-02',
    '',
    'Customer: Pettigrew Well Drilling',
    'Service: emergency pump repair, well 12-B',
    'Amount due: 4,820.00 USD',
    'Terms: net 30. Late fee 1.5% per month.',
    '',
    'Contact: billing@northvalley.example  (555) 010-4471'
  ];

  function setAttachment(kind, data, label) {
    attachment = { kind: kind, data: data, label: label };
    $('attachKind').value = kind;
    $('attachBox').classList.add('on');
    $('attachFile').accept = kind === 'file' ? '.pdf,.csv,application/pdf,text/csv' : 'image/png,image/jpeg,image/tiff';
    info();
  }

  function clearAttachment() {
    attachment = null;
    $('attachKind').value = 'none';
    $('attachBox').classList.remove('on');
    info();
  }

  function setQuestions(list) {
    $('questions').textContent = '';
    list.forEach(function (q) { addQuestion(q); });
  }

  $('presetPplx').addEventListener('click', function () {
    useModel('perplexity/pplx-decider-v1.2');
    $('state').value = 'Your growing test text. Marker: ORANGE-731.';
    $('repeat').value = '1';
    clearAttachment();
    setQuestions([
      { key: 'marker', type: 'noul', instructions: 'Is the exact marker ORANGE-731 present in the state?' },
      { key: 'sentiment', type: 'score', instructions: 'How urgent does this text read?', criteria: 'None\nMild\nUrgent\nCritical' }
    ]);
    info();
    $('status').textContent = 'perplexity text loaded — two questions, one call';
  });

  $('presetFlash').addEventListener('click', function () {
    useModel('perplexity/pplx-decider-flash-v1.2');
    $('state').value = 'Ticket: the upgrade failed with ERR_CARD_DECLINED and the invoice is overdue.';
    $('repeat').value = '1';
    clearAttachment();
    setQuestions([
      { key: 'desk', type: 'choice', instructions: 'Which desk should handle this ticket?', criteria: 'billing: Invoices, card charges, upgrades, payment failures.\ntechnical: API bugs, latency, crashes, integrations.\nsales: Contracts, volume pricing, RFPs.' },
      { key: 'refund', type: 'noul', instructions: 'Is the customer asking for money back?' }
    ]);
    info();
    $('status').textContent = 'perplexity flash loaded — the cheap model, two questions';
  });

  $('presetDoc').addEventListener('click', function () {
    useModel('scaledown/classify-1');
    $('state').value = 'Read the attached invoice.';
    $('repeat').value = '1';
    setQuestions([
      { key: 'amount_known', type: 'noul', instructions: 'Does the document state an amount due?' },
      { key: 'category', type: 'choice', instructions: 'What kind of document is this?', criteria: 'invoice: A bill requesting payment.\nstatement: A periodic account summary.\nreceipt: Proof a payment was made.' },
      { key: 'overdue_risk', type: 'score', instructions: 'How much collection risk does this invoice carry?', criteria: 'Paid on time, no risk\nLate but cooperative\nDisputed or unresponsive\nLegal action likely' }
    ]);
    setAttachment('file', simplePdf(INVOICE), 'invoice-2026-4471.pdf');
    rules();
    $('status').textContent = 'scaledown document loaded — one document, three questions';
  });

  $('presetGemini').addEventListener('click', function () {
    useModel('google/gemini-decision-1');
    $('state').value = 'Read the attached invoice.';
    $('repeat').value = '1';
    setQuestions([
      { key: 'amount_known', type: 'noul', instructions: 'Does the document state an amount due?' },
      { key: 'document_kind', type: 'choice', instructions: 'What kind of document is this?', criteria: 'invoice: A bill requesting payment.\ncontract: Terms of an agreement.\nreceipt: Proof a payment was made.' }
    ]);
    setAttachment('file', simplePdf(INVOICE), 'invoice-2026-4471.pdf');
    rules();
    $('status').textContent = 'gemini document loaded — pdf, csv and office, data URL or typed URL';
  });

  $('copy').addEventListener('click', function () {
    if (navigator.clipboard) navigator.clipboard.writeText(preview());
    $('hint').textContent = 'request copied';
    setTimeout(function () { $('hint').textContent = ''; }, 1600);
  });

  fetch('/api/decisions/models').then(function (r) { return r.json(); }).then(function (data) {
    var models = (data && data.models) || [];
    models.forEach(function (m) { catalogue[m.id] = m; });
    var select = $('model');
    select.textContent = '';
    if (!models.length) {
      $('modelNote').textContent = 'catalogue unavailable — type an id below';
      return;
    }
    function fill(label, list) {
      var g = document.createElement('optgroup');
      g.label = label + ' (' + list.length + ')';
      list.forEach(function (m) {
        var o = document.createElement('option');
        o.value = m.id;
        o.textContent = m.id + (m.ctx ? '  ' + Math.round(m.ctx / 1000) + 'k' : '') + (m.inp ? '  $' + m.inp + '/M' : '');
        g.appendChild(o);
      });
      select.appendChild(g);
    }
    var docs = models.filter(function (m) { return m.file; });
    var pics = models.filter(function (m) { return m.image && !m.file; });
    var text = models.filter(function (m) { return !m.image && !m.file; });
    if (text.length) fill('text', text);
    if (pics.length) fill('sees an image', pics);
    if (docs.length) fill('reads a document', docs);
    if (models.some(function (m) { return m.id === 'perplexity/pplx-decider-v1.2'; })) select.value = 'perplexity/pplx-decider-v1.2';
    $('modelNote').textContent = models.length + ' decisions models · ' + pics.length + ' read an image · ' + docs.length + ' read a document';
    rules();
  }).catch(function () { $('modelNote').textContent = 'catalogue unavailable — type an id below'; });

  // ---- snapshots -----------------------------------------------------------
  function loadSnapshots() {
    try {
      var raw = localStorage.getItem(STORE);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (error) { return []; }
  }

  function saveSnapshots() {
    try { localStorage.setItem(STORE, JSON.stringify(snapshots.slice(0, 24))); } catch (error) {}
    renderSnapshots();
  }

  function label(s, i) { return '#' + (snapshots.length - i) + ' · ' + s.model.replace(/^.*\//, '') + ' · ' + s.keys.length + 'q · ' + (s.tokens || '?') + ' tok'; }

  var pickedA = false;
  var pickedB = false;

  function renderSnapshots() {
    var a = $('snapA');
    var b = $('snapB');
    var keepA = a.value, keepB = b.value;
    a.textContent = ''; b.textContent = '';
    snapshots.forEach(function (s, i) {
      [a, b].forEach(function (sel) {
        var o = document.createElement('option');
        o.value = String(i);
        o.textContent = label(s, i);
        sel.appendChild(o);
      });
    });
    if (snapshots.length) {
      // a fresh run makes the newest the comparison and the one before it the
      // baseline; a choice he made by hand is kept until he changes it again.
      a.value = pickedA && keepA ? keepA : String(Math.min(1, snapshots.length - 1));
      b.value = pickedB && keepB ? keepB : '0';
      $('snapNote').textContent = snapshots.length + ' stored in this browser · newest first in the runs table';
      renderDiff();
    } else {
      $('snapNote').textContent = 'no snapshots yet — every run stores one';
      $('diffTable').style.display = 'none';
    }
  }

  function valueOf(answer) {
    if (!answer) return null;
    if (answer.noul !== undefined) return Number(answer.noul);
    if (answer.score !== undefined) return Number(answer.score);
    if (answer.choice !== undefined) return answer.choice;
    return null;
  }

  function show(value) {
    if (value === null || value === undefined) return '—';
    return typeof value === 'number' ? (Number.isInteger(value) ? String(value) : value.toFixed(3)) : String(value);
  }

  function renderDiff() {
    var A = snapshots[Number($('snapA').value)];
    var B = snapshots[Number($('snapB').value)];
    if (!A || !B) return;
    var body = $('diff');
    body.textContent = '';
    var keys = {};
    A.keys.concat(B.keys).forEach(function (k) { keys[k] = true; });
    Object.keys(keys).forEach(function (k) {
      var av = valueOf(A.answers[k]);
      var bv = valueOf(B.answers[k]);
      var tr = document.createElement('tr');
      var delta = '—';
      var cls = 'same';
      if (av === null || bv === null) {
        delta = av === null ? 'only in b' : 'only in a';
        cls = 'same';
      } else if (typeof av === 'number' && typeof bv === 'number') {
        var d = bv - av;
        delta = (d > 0 ? '+' : '') + d.toFixed(3);
        cls = Math.abs(d) < 0.001 ? 'same' : (d > 0 ? 'up' : 'down');
      } else if (av !== null && bv !== null) {
        delta = av === bv ? 'same' : 'changed';
        cls = av === bv ? 'same' : 'up';
      }
      [k, show(av), show(bv), delta].forEach(function (text, i) {
        var td = document.createElement('td');
        td.textContent = text;
        if (i === 0) td.className = 'n';
        if (i === 3) td.className = 'delta ' + cls;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    var sameState = A.stateText === B.stateText;
    var meta = document.createElement('tr');
    meta.innerHTML = '<td class="n">state · tokens · cost</td>'
      + '<td>' + (sameState ? 'same' : 'changed') + ' · ' + (A.tokens || '?') + ' · $' + A.cost + '</td>'
      + '<td>' + (sameState ? 'same' : 'changed') + ' · ' + (B.tokens || '?') + ' · $' + B.cost + '</td>'
      + '<td class="delta same">' + (A.tokens && B.tokens ? (B.tokens - A.tokens > 0 ? '+' : '') + (B.tokens - A.tokens) + ' tok' : '—') + '</td>';
    body.appendChild(meta);
    $('diffTable').style.display = '';
  }

  $('snapA').addEventListener('change', function () { pickedA = true; renderDiff(); });
  $('snapB').addEventListener('change', function () { pickedB = true; renderDiff(); });
  $('clearSnaps').addEventListener('click', function () {
    snapshots = [];
    saveSnapshots();
    $('diffTable').style.display = 'none';
  });
  $('dlSnaps').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(snapshots, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'decisions-snapshots.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  });

  function answerLine(data) {
    var answers = (data && data.answers) || {};
    return Object.keys(answers).map(function (k) {
      var a = answers[k] || {};
      if (a.noul !== undefined) return k + ' ' + Number(a.noul).toFixed(3);
      if (a.choice !== undefined) return k + ' ' + a.choice;
      if (a.score !== undefined) return k + ' ' + Number(a.score).toFixed(2);
      return k + ' ?';
    }).join(' · ');
  }

  function addRun(row) {
    runs += 1;
    var body = $('runs');
    if (runs === 1) body.textContent = '';
    var tr = document.createElement('tr');
    [runs, row.model, row.state, row.answers, row.tokens, row.cost, row.ms].forEach(function (value, index) {
      var td = document.createElement('td');
      if (index === 0 || index === 3) td.className = 'n';
      td.textContent = value == null || value === '' ? '—' : String(value);
      tr.appendChild(td);
    });
    body.insertBefore(tr, body.firstChild);
  }

  $('send').addEventListener('click', async function () {
    var payload = body();
    var started = Date.now();
    $('send').disabled = true;
    $('status').textContent = 'sending…';
    $('out').textContent = '—';
    try {
      var res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await res.json().catch(function () { return null; });
      var ms = Date.now() - started;
      var usage = (data && data.usage) || {};
      var cost = usage.cost;
      var tokens = usage.input_tokens;
      var said = answerLine(data);
      var err = data && data.error ? String(data.error.code || data.error.message || 'error') : '';
      $('out').textContent = JSON.stringify(data, null, 2);
      $('status').innerHTML = '<b class="' + (res.ok ? 'ok' : 'err') + '">' + res.status + '</b> · ' + ms + ' ms'
        + (data && data.model ? ' · <b>' + data.model + '</b>' : '')
        + (said ? ' · ' + said : '')
        + (err ? ' · <span class="err">' + err + '</span>' : '')
        + (cost !== undefined && cost !== null ? ' · $' + cost : '');

      var text = stateText();
      var qCount = Object.keys(payload.questions).length;
      var perK = cost && text.length ? '$' + (cost / (text.length / 1000)).toFixed(6) : '—';
      $('lever').innerHTML = '<div>state <b>' + text.length + '</b> chars</div>'
        + '<div>questions <b>' + qCount + '</b></div>'
        + (tokens ? '<div>input tokens <b>' + tokens + '</b></div>' : '')
        + (cost !== undefined && cost !== null ? '<div>this call <b>$' + cost + '</b></div>' : '')
        + '<div>per 1k chars <b>' + perK + '</b></div>'
        + (tokens && cost ? '<div>per 1k tokens <b>$' + (cost / (tokens / 1000)).toFixed(6) + '</b></div>' : '');

      var stateDesc = typeof payload.state === 'string'
        ? payload.state.length + ' chars'
        : (attachment ? attachment.kind + ' ' + Math.round(attachment.data.length / 1024) + 'kb' : '');
      addRun({
        model: payload.model,
        state: stateDesc,
        answers: said || err,
        tokens: tokens || '—',
        cost: cost === undefined || cost === null ? '—' : '$' + cost,
        ms: ms
      });

      var expected = expectations();
      var graded = gradeAll(data && data.answers, expected);
      if (graded) said = said + ' · ' + graded.right + '/' + graded.total + ' right';

      addCard({
        ok: Boolean(res.ok && data && data.answers),
        status: res.status,
        model: payload.model,
        served: (data && data.model) || null,
        kind: typeof payload.state === 'string' ? 'text' : (attachment ? attachment.kind : 'text'),
        chars: text.length,
        tokens: tokens || null,
        cost: cost === undefined || cost === null ? null : cost,
        ms: ms,
        summary: said || '',
        answers: (data && data.answers) || null,
        error: data && data.error ? data.error : (res.ok ? null : { code: 'http_' + res.status, message: '' }),
        questions: payload.questions,
        expected: expected,
        graded: graded,
        recipe: walk.recipe ? walk.recipe.title : null,
        stateHead: text.slice(0, 200)
      });

      if (res.ok && data && data.answers) {
        snapshots.unshift({
          at: new Date().toISOString(),
          model: payload.model,
          served: data.model || payload.model,
          stateText: text,
          attachment: attachment ? attachment.label : null,
          questions: payload.questions,
          keys: Object.keys(payload.questions),
          answers: data.answers,
          tokens: tokens || null,
          cost: cost === undefined || cost === null ? null : cost,
          ms: ms
        });
        pickedA = false;
        pickedB = false;
        saveSnapshots();
      }
      $('sentWrap').style.display = '';
      $('sent').textContent = preview();
    } catch (error) {
      addCard({
        ok: false,
        status: 'net',
        model: payload.model,
        chars: stateText().length,
        questions: payload.questions,
        error: { code: 'client', message: error && error.message ? error.message : String(error) },
        summary: ''
      });
      $('status').innerHTML = '<b class="err">failed</b> · ' + (error && error.message ? error.message : String(error));
    } finally {
      $('send').disabled = false;
    }
  });

  // ---- state from files ----------------------------------------------------
  // A codebase snapshot is just text under headers; what matters is that the
  // headers survive so an answer can name the file it came from.
  $('files').addEventListener('change', function (ev) {
    var files = Array.prototype.slice.call(ev.target.files || []);
    if (!files.length) return;
    var CAP = 1500000;
    var out = [];
    var left = CAP;
    var cut = 0;
    var i = 0;
    function finish() {
      $('state').value = out.join('\n');
      info();
      $('filesNote').textContent = files.length + ' file(s) read · ' + $('state').value.length + ' chars'
        + (cut ? ' · ' + cut + ' cut at the 1.5M cap' : '');
    }
    function next() {
      if (i >= files.length || left <= 0) { finish(); return; }
      var file = files[i];
      i += 1;
      var reader = new FileReader();
      reader.onload = function () {
        var piece = '--- ' + file.name + ' ---\n' + String(reader.result || '') + '\n';
        if (piece.length > left) { piece = piece.slice(0, left); cut += 1; }
        left -= piece.length;
        out.push(piece);
        next();
      };
      reader.onerror = function () { next(); };
      reader.readAsText(file);
    }
    next();
  });

  $('clearState').addEventListener('click', function () {
    $('state').value = '';
    $('files').value = '';
    $('filesNote').textContent = 'state emptied';
    info();
  });

  // ---- saved question sets -------------------------------------------------
  // The questions are the work; a set is the thing worth keeping.
  var SETS = 'decisions.questionsets.v1';
  function readSets() {
    try {
      var raw = localStorage.getItem(SETS);
      var list = raw ? JSON.parse(raw) : null;
      return Array.isArray(list) ? list : null;
    } catch (error) { return null; }
  }
  var FORM_QS = [
    { key: 'case_number', type: 'noul', instructions: 'Does the form have a field labelled CASE NUMBER?' },
    { key: 'form_kind', type: 'choice', instructions: 'What kind of form is this?', criteria: 'name_change: A petition to change a person\'s name.\nsmall_claims: A claim for a small money amount.\ndivorce: A marital dissolution.\nrestraining: A protective order request.\nother: None of these.' },
    { key: 'checkboxes', type: 'noul', instructions: 'Are there yes/no checkbox pairs?' },
    { key: 'signature', type: 'noul', instructions: 'Is there a signature line near the bottom?' }
  ];
  var CODE_QS = [
    { key: 'route_owner', type: 'choice', instructions: 'Which file defines the /lab route?', criteria: 'src/worker.js: the Worker entry.\nsrc/lab.js: the bench page.\nsrc/dial.js: the dial page.' },
    { key: 'key_exposed', type: 'noul', instructions: 'Does any browser-side code hold the OpenRouter key?' },
    { key: 'risk', type: 'score', instructions: 'How risky is this state for the live dock?', criteria: 'No dock code touched\nDock code present but unchanged\nDock behaviour changed\nDock broken' }
  ];
  var sets = readSets();
  if (!sets) {
    sets = [
      { name: 'form -> schema', questions: FORM_QS },
      { name: 'codebase transition', questions: CODE_QS }
    ];
    try { localStorage.setItem(SETS, JSON.stringify(sets)); } catch (error) {}
  }

  function renderSets() {
    var sel = $('setsSel');
    var keep = sel.value;
    sel.textContent = '';
    var blank = document.createElement('option');
    blank.value = '';
    blank.textContent = 'saved sets…';
    sel.appendChild(blank);
    sets.forEach(function (set, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = set.name + ' · ' + set.questions.length + 'q';
      sel.appendChild(o);
    });
    if (keep) sel.value = keep;
  }

  function writeSets() {
    try { localStorage.setItem(SETS, JSON.stringify(sets)); } catch (error) {}
    renderSets();
  }

  $('saveSet').addEventListener('click', function () {
    var name = ($('setName').value || '').trim();
    if (!name) { $('hint').textContent = 'name the set first'; return; }
    var current = questionCards().map(function (card) {
      return {
        key: card.querySelector('.qkey').value,
        type: card.querySelector('.qtype').value,
        instructions: card.querySelector('.qinst').value,
        criteria: card.querySelector('.qcrit').value,
        expect: card.querySelector('.qexp').value
      };
    });
    var at = -1;
    sets.forEach(function (set, i) { if (set.name === name) at = i; });
    if (at >= 0) sets[at] = { name: name, questions: current };
    else sets.unshift({ name: name, questions: current });
    writeSets();
    $('setName').value = '';
    $('hint').textContent = 'set saved: ' + name;
    setTimeout(function () { $('hint').textContent = ''; }, 1600);
  });

  $('setsSel').addEventListener('change', function () {
    var set = sets[Number($('setsSel').value)];
    if (!set) return;
    setQuestions(set.questions);
    $('setName').value = set.name;
    $('status').textContent = 'loaded set: ' + set.name;
  });

  $('delSet').addEventListener('click', function () {
    var at = Number($('setsSel').value);
    if (!sets[at] && $('setsSel').value === '') { $('hint').textContent = 'pick a set to delete'; return; }
    var name = sets[at].name;
    sets.splice(at, 1);
    writeSets();
    $('hint').textContent = 'deleted: ' + name;
    setTimeout(function () { $('hint').textContent = ''; }, 1600);
  });

  // ---- a form drawn here, so the image case needs no file -------------------
  function formImage() {
    var c = document.createElement('canvas');
    c.width = 1000;
    c.height = 1300;
    var g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#000';
    g.fillStyle = '#000';
    g.lineWidth = 2;
    g.strokeRect(40, 40, 920, 1220);
    g.font = '13px serif';
    g.fillText('ATTORNEY OR PARTY WITHOUT ATTORNEY (Name, State Bar number, and address):', 60, 80);
    for (var i = 0; i < 3; i += 1) {
      g.beginPath(); g.moveTo(60, 105 + i * 22); g.lineTo(620, 105 + i * 22); g.stroke();
    }
    g.strokeRect(660, 62, 280, 92);
    g.font = '12px serif';
    g.fillText('FOR COURT USE ONLY', 680, 88);
    g.font = 'bold 15px serif';
    g.fillText('SUPERIOR COURT OF CALIFORNIA, COUNTY OF LOS ANGELES', 60, 200);
    g.font = '13px serif';
    g.fillText('PETITIONER:', 60, 250);
    g.beginPath(); g.moveTo(155, 252); g.lineTo(520, 252); g.stroke();
    g.fillText('CASE NUMBER:', 600, 250);
    g.beginPath(); g.moveTo(720, 252); g.lineTo(940, 252); g.stroke();
    g.font = 'bold 18px serif';
    g.fillText('PETITION FOR CHANGE OF NAME', 250, 320);
    g.font = '13px serif';
    ['1. Petitioner requests a change of name.',
     '2. Petitioner resides in this county.',
     '3. Petitioner is not seeking to evade a debt or defraud a creditor.'].forEach(function (line, n) {
      g.fillText(line, 60, 380 + n * 34);
    });
    g.fillText('4. Do you have a pending case in this court?', 60, 490);
    g.strokeRect(90, 503, 13, 13);
    g.fillText('Yes', 112, 515);
    g.strokeRect(180, 503, 13, 13);
    g.fillText('No', 202, 515);
    for (var j = 0; j < 14; j += 1) {
      g.beginPath(); g.moveTo(60, 560 + j * 33); g.lineTo(940, 560 + j * 33); g.stroke();
    }
    g.fillText('Date:', 60, 1130);
    g.beginPath(); g.moveTo(100, 1132); g.lineTo(330, 1132); g.stroke();
    g.fillText('SIGNATURE OF PETITIONER', 570, 1110);
    g.beginPath(); g.moveTo(570, 1132); g.lineTo(940, 1132); g.stroke();
    return c.toDataURL('image/png');
  }

  $('presetForm').addEventListener('click', function () {
    useModel('perplexity/pplx-decider-flash-v1.2');
    $('state').value = 'Read the attached form image and answer about its structure.';
    $('repeat').value = '1';
    setQuestions(FORM_QS);
    setAttachment('image', formImage(), 'judicial-form.png');
    rules();
    $('status').textContent = 'form image loaded — the cheap model, four structural questions';
  });

  $('presetCode').addEventListener('click', function () {
    useModel('perplexity/pplx-decider-flash-v1.2');
    $('repeat').value = '1';
    clearAttachment();
    setQuestions(CODE_QS);
    rules();
    $('status').textContent = 'codebase loaded — put the files in the state, then snapshot and diff';
  });

  renderSets();

  // ---- context ladder ------------------------------------------------------
  // The million-token window is a claim until something is measured against it.
  // The same questions run at rising sizes, so the rung where answers wobble or
  // the call fails is the answer, not a guess.
  var LADDER = [10000, 25000, 50000, 100000, 200000, 400000, 600000, 900000, 1200000, 1350000, 1500000];

  function ladderText(target) {
    var base = ($('state').value || '').trim();
    if (!base) base = 'No content.';
    var out = '';
    while (out.length < target) out += base + '\n';
    return out.slice(0, target);
  }

  function renderLadder(rows) {
    var body = $('ladder');
    body.textContent = '';
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      [row.chars, row.tokens || '—', row.cost === undefined || row.cost === null ? '—' : '$' + row.cost, row.ms || '—', row.status + ' · ' + row.answers]
        .forEach(function (value, i) {
          var td = document.createElement('td');
          td.textContent = String(value);
          if (i === 0) td.className = 'n';
          tr.appendChild(td);
        });
      body.appendChild(tr);
    });
    $('ladderTable').style.display = rows.length ? '' : 'none';
  }

  $('runLadder').addEventListener('click', async function () {
    var model = 'scaledown/classify-1';
    var questions = questionsPayload();
    var results = [];
    var fails = 0;
    $('runLadder').disabled = true;
    $('ladderNote').textContent = 'starting…';
    for (var i = 0; i < LADDER.length; i += 1) {
      if (fails >= 2) break;
      var text = ladderText(LADDER[i]);
      $('ladderNote').textContent = 'rung ' + (i + 1) + '/' + LADDER.length + ' · ' + text.length + ' chars…';
      var started = Date.now();
      var row = { chars: text.length };
      try {
        var res = await fetch('/api/decisions', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model: model, state: text, questions: questions })
        });
        var data = await res.json().catch(function () { return null; });
        row.ms = Date.now() - started;
        row.status = res.status;
        var usage = (data && data.usage) || {};
        row.tokens = usage.input_tokens;
        row.cost = usage.cost;
        var said = answerLine(data);
        row.answers = said || (data && data.error ? String(data.error.code || data.error.message) : '');
        fails = res.ok ? 0 : fails + 1;
      } catch (error) {
        row.ms = Date.now() - started;
        row.status = 'net';
        row.answers = error && error.message ? error.message : String(error);
        fails += 1;
      }
      results.push(row);
      renderLadder(results);
      addCard({
        ok: row.status === 200,
        status: row.status,
        model: model,
        kind: 'text',
        chars: row.chars,
        tokens: row.tokens || null,
        cost: row.cost === undefined ? null : row.cost,
        ms: row.ms || null,
        rung: (i + 1) + ' · ' + row.chars + ' chars',
        summary: row.answers || '',
        answers: null,
        error: row.status === 200 ? null : { code: 'rung_' + row.status, message: row.answers || '' },
        questions: questions,
        stateHead: 'ladder rung at ' + row.chars + ' chars'
      });
    }
    var last = results[results.length - 1] || {};
    $('ladderNote').textContent = 'stopped at ' + (last.chars || 0) + ' chars'
      + (fails >= 2 ? ' · two failures in a row' : ' · every rung answered');
    $('runLadder').disabled = false;
  });

  // ---- result cards --------------------------------------------------------
  // A refusal is a result. The card set keeps both, with the questions that
  // produced them, so a shape that fell over at 1.5M chars is still there to
  // read a week later instead of being re-discovered.
  var CARDS = 'decisions.cards.v1';

  function readCards() {
    try {
      var raw = localStorage.getItem(CARDS);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (error) { return []; }
  }

  var cards = readCards();

  function saveCards() {
    try { localStorage.setItem(CARDS, JSON.stringify(cards.slice(0, 200))); } catch (error) {}
    renderCards();
  }

  function polarity(answers) {
    var yes = 0;
    var no = 0;
    Object.keys(answers || {}).forEach(function (k) {
      var a = answers[k] || {};
      if (a.noul !== undefined) { if (Number(a.noul) >= 0.5) yes += 1; else no += 1; }
    });
    return { yes: yes, no: no };
  }

  function expectations() {
    var out = {};
    questionCards().forEach(function (card) {
      var key = (card.querySelector('.qkey').value || '').trim() || 'question';
      var raw = (card.querySelector('.qexp').value || '').trim();
      if (raw) out[key] = raw;
    });
    return out;
  }

  function gradeOne(answer, expect) {
    if (!answer) return null;
    var e = String(expect).trim().toLowerCase();
    if (answer.noul !== undefined) {
      var yes = Number(answer.noul) >= 0.5;
      if (['yes', 'true', '1', 'y'].indexOf(e) >= 0) return yes;
      if (['no', 'false', '0', 'n'].indexOf(e) >= 0) return !yes;
      return null;
    }
    if (answer.choice !== undefined) return String(answer.choice).toLowerCase() === e;
    if (answer.score !== undefined) {
      var n = Number(e);
      return isNaN(n) ? null : Math.abs(Number(answer.score) - n) <= 0.5;
    }
    return null;
  }

  function gradeAll(answers, expected) {
    var keys = Object.keys(expected || {});
    var right = 0;
    var graded = 0;
    var wrong = [];
    keys.forEach(function (key) {
      var verdict = gradeOne((answers || {})[key], expected[key]);
      if (verdict === null) return;
      graded += 1;
      if (verdict) right += 1;
      else wrong.push(key + ' expected ' + expected[key]);
    });
    return graded ? { total: graded, right: right, wrong: wrong } : null;
  }

  function addCard(record) {
    record.id = 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    record.at = record.at || new Date().toISOString();
    cards.unshift(record);
    saveCards();
  }

  function shortModel(id) {
    var tail = String(id || '').split('/').pop();
    return tail.replace(/-\d{8}$/, '');
  }

  function renderCards() {
    var filter = $('cardFilter').value;
    var body = $('cards');
    body.textContent = '';
    var list = cards.filter(function (card) {
      if (filter === 'ok') return card.ok;
      if (filter === 'fail') return !card.ok;
      return true;
    });
    var answered = cards.filter(function (c) { return c.ok; }).length;
    var gradedCards = cards.filter(function (c) { return c.graded; });
    var right = gradedCards.reduce(function (sum, c) { return sum + c.graded.right; }, 0);
    var total = gradedCards.reduce(function (sum, c) { return sum + c.graded.total; }, 0);
    $('cardsNote').textContent = cards.length
      ? cards.length + ' cards · ' + answered + ' answered · ' + (cards.length - answered) + ' refused'
        + (total ? ' · ' + right + '/' + total + ' right where an expectation was set' : '')
      : 'no cards yet — every run and every ladder rung drops one here';
    list.slice(0, 60).forEach(function (card) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'card' + (card.ok ? '' : ' fail');
      var pol = polarity(card.answers);
      var head = document.createElement('div');
      head.className = 'ct';
      head.innerHTML = '<span>' + (card.ok ? 'answered' : 'refused') + '</span><span>' + shortModel(card.model) + '</span>';
      var meta = document.createElement('div');
      meta.className = 'cm';
      meta.textContent = (card.chars ? card.chars + ' chars' : '—')
        + (card.tokens ? ' · ' + card.tokens + ' tok' : '')
        + (card.cost === null || card.cost === undefined ? '' : ' · $' + card.cost)
        + (card.ms ? ' · ' + (card.ms / 1000).toFixed(1) + 's' : '');
      var ans = document.createElement('div');
      ans.className = 'ca';
      ans.textContent = card.ok
        ? (card.summary || '') + (pol.yes || pol.no ? '  (' + pol.yes + ' yes · ' + pol.no + ' no)' : '')
        : (card.error ? (card.error.code || '') + ' · ' + String(card.error.message || '').slice(0, 90) : 'failed');
      var foot = document.createElement('div');
      foot.className = 'cm';
      foot.textContent = (card.rung ? 'ladder rung ' + card.rung : (card.questions ? Object.keys(card.questions).length + ' questions' : ''))
        + (card.graded ? ' · ' + card.graded.right + '/' + card.graded.total + ' right' : '')
        + (card.recipe ? ' · ' + card.recipe : '');
      el.appendChild(head);
      el.appendChild(meta);
      el.appendChild(ans);
      el.appendChild(foot);
      el.addEventListener('click', function () {
        $('out').textContent = JSON.stringify(card, null, 2);
        $('sentWrap').style.display = '';
        $('sent').textContent = JSON.stringify({ model: card.model, chars: card.chars, questions: card.questions }, null, 2);
        $('status').textContent = 'card · ' + card.at + ' · ' + card.model + (card.served ? ' served as ' + card.served : '');
      });
      body.appendChild(el);
    });
  }

  $('cardFilter').addEventListener('change', renderCards);

  $('clearCards').addEventListener('click', function () {
    cards = [];
    saveCards();
  });

  $('dlCards').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'decisions-cards.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  });

  $('cardsFile').addEventListener('change', function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var list = JSON.parse(String(reader.result || '[]'));
        if (!Array.isArray(list)) throw new Error('not a card list');
        list.forEach(function (card) {
          if (!card || !card.model) return;
          if (cards.some(function (c) { return c.id && c.id === card.id; })) return;
          cards.push(card);
        });
        cards.sort(function (x, y) { return String(y.at).localeCompare(String(x.at)); });
        saveCards();
        $('cardsNote').textContent = 'imported ' + list.length + ' cards';
      } catch (error) {
        $('cardsNote').textContent = 'import failed: ' + (error && error.message ? error.message : 'bad json');
      }
      ev.target.value = '';
    };
    reader.readAsText(file);
  });

  renderCards();

  // ---- walkthroughs --------------------------------------------------------
  // Each walk is a fixture, a model, and a predicate set with the answers believed
  // right, so the path can be walked again instead of remembered.
  function fillTo(text, chars) {
    var base = String(text).replace(/\s+/g, ' ').trim() + ' ';
    var out = '';
    while (out.length < chars) out += base;
    return out.slice(0, chars);
  }

  var STATEMENT_A = 'Statement of R. Pettigrew, recorded 2026-03-04. I was at the shop on Delano that evening until about nine. I did not speak to Mr. Aguilar that evening, not that I recall. I went straight home afterwards.';
  var STATEMENT_B = 'Statement of R. Pettigrew, recorded 2026-06-19. I left the shop around ten that night. I stopped at the market on Delano to buy cigarettes. Aguilar was at the counter and we spoke for a minute or two about the pump.';
  var STATEMENT_C = 'Statement of R. Pettigrew, recorded 2026-09-02. I was at the shop until nine. I never saw Aguilar that night. I was home by ten.';

  var CODE_BEFORE = '// app.js, 2026-11-20\n'
    + 'const STATE_CAP = 2e5;\n\n'
    + 'async function decide(request, proxy) {\n'
    + '  const body = await request.json();\n'
    + '  return fetch(proxy + \'/api/decide\', { method: \'POST\', body: JSON.stringify(body) });\n'
    + '}\n\n'
    + 'export default {\n'
    + '  async fetch(request, env) {\n'
    + '    const url = new URL(request.url);\n'
    + '    if (url.pathname === \'/api/decide\') return decide(request, env[\'AI-PROXY\']);\n'
    + '    if (url.pathname === \'/lab\') return new Response(LAB, { headers: { \'content-type\': \'text/html\' } });\n'
    + '    return new Response(\'not found\', { status: 404 });\n'
    + '  }\n'
    + '};\n';

  var CODE_AFTER = '// app.js, 2026-11-27\n'
    + 'const STATE_CAP = 15e5;\n\n'
    + 'async function decide(request, proxy) {\n'
    + '  const body = await request.json();\n'
    + '  return fetch(proxy + \'/api/decide\', { method: \'POST\', body: JSON.stringify(body) });\n'
    + '}\n\n'
    + 'export default {\n'
    + '  async fetch(request, env) {\n'
    + '    const url = new URL(request.url);\n'
    + '    if (url.pathname === \'/api/decide\') return decide(request, env[\'AI-PROXY\']);\n'
    + '    if (url.pathname === \'/api/models\') return new Response(catalogue(), { headers: { \'content-type\': \'application/json\' } });\n'
    + '    if (url.pathname === \'/api/lab\') return new Response(LAB, { headers: { \'content-type\': \'text/html\' } });\n'
    + '    return new Response(\'not found\', { status: 404 });\n'
    + '  }\n'
    + '};\n';

  var EXAM_QS = [
    { key: 'at_shop', type: 'noul', instructions: 'Does this statement place the witness at the shop that evening?', expect: 'yes' },
    { key: 'with_aguilar', type: 'noul', instructions: 'Does this statement say the witness spoke with Mr. Aguilar that evening?', expect: 'no' },
    { key: 'left_hour', type: 'choice', instructions: 'What time does this statement say the witness left the shop?', criteria: 'nine: About nine.\nten: About ten.\nnot_said: Not stated.', expect: 'nine' },
    { key: 'market', type: 'noul', instructions: 'Does this statement mention stopping at a market?', expect: 'no' }
  ];

  var CONFORMANCE_QS = [
    { key: 'route_path', type: 'choice', instructions: 'Which path serves the lab page?', criteria: "'/lab': The lab page at /lab.\n'/api/lab': The lab page at /api/lab.\nnone: No lab route.", expect: "'/lab'" },
    { key: 'models_route', type: 'noul', instructions: 'Does this version serve a models catalogue route?', expect: 'no' },
    { key: 'state_cap', type: 'choice', instructions: 'At what size is the state text truncated?', criteria: '200k: Two hundred thousand characters.\n1.5M: One and a half million characters.', expect: '200k' },
    { key: 'proxy', type: 'choice', instructions: 'Which binding carries the decisions call?', criteria: 'AI-PROXY: The AI-PROXY service binding.\nARA: The ARA binding.', expect: 'AI-PROXY' }
  ];

  var FORM_QS_EXPECT = FORM_QS.map(function (q) {
    var copy = JSON.parse(JSON.stringify(q));
    if (copy.key === 'case_number' || copy.key === 'checkboxes' || copy.key === 'signature') copy.expect = 'yes';
    if (copy.key === 'form_kind') copy.expect = 'name_change';
    return copy;
  });

  var RECIPES = [
    {
      id: 'free-text',
      title: 'Free text at 60k chars',
      model: 'perplexity/pplx-decider-v1.3:free',
      teaches: 'A 60,000-char state on the free model: cost 0, answered in seconds. Nothing in this walk spends credits.',
      watch: 'tokens climb past 15k while the cost stays $0, and the answers stay put.',
      steps: [{ label: 'statement repeated to 60k', state: fillTo(STATEMENT_A, 60000), attach: null, questions: EXAM_QS }]
    },
    {
      id: 'cross-exam',
      title: 'Cross-exam: one predicate set, three statements',
      model: 'perplexity/pplx-decider-v1.3:free',
      teaches: 'The same keys asked of three statements months apart. Run step 1, then 2 and 3, and read the diff — it isolates which predicate the witness changed.',
      watch: 'with_aguilar and left_hour move between steps while at_shop holds. The card is graded against the record as loaded, so step 2 scores wrong on purpose.',
      steps: [
        { label: 'statement A, March', state: STATEMENT_A, attach: null, questions: EXAM_QS },
        { label: 'statement B, June', state: STATEMENT_B, attach: null, questions: EXAM_QS },
        { label: 'statement C, September', state: STATEMENT_C, attach: null, questions: EXAM_QS }
      ]
    },
    {
      id: 'code-conformance',
      title: 'Codebase: same questions, two versions',
      model: 'perplexity/pplx-decider-v1.3:free',
      teaches: 'A refactor asked identical questions. What disagrees between the two cards is the change; what agrees is what held.',
      watch: 'route_path, models_route and state_cap flip between steps; proxy does not.',
      steps: [
        { label: 'app.js before', state: CODE_BEFORE, attach: null, questions: CONFORMANCE_QS },
        {
          label: 'app.js after', state: CODE_AFTER, attach: null,
          questions: CONFORMANCE_QS.map(function (q) {
            var copy = JSON.parse(JSON.stringify(q));
            if (copy.key === 'route_path') copy.expect = "'/api/lab'";
            if (copy.key === 'models_route') copy.expect = 'yes';
            if (copy.key === 'state_cap') copy.expect = '1.5M';
            return copy;
          })
        }
      ]
    },
    {
      id: 'form-schema',
      title: 'Form image to a field schema',
      model: 'perplexity/pplx-decider-flash-v1.2',
      teaches: 'One drawn court form, four structural questions, about $0.00002. This is the extraction leg your template maker would consume.',
      watch: 'case_number, form_kind, checkboxes and signature all come back high — the schema is the answer, not a redrawn form.',
      steps: [{ label: 'judicial-form.png', state: 'Read the attached form image and answer about its structure.', attach: 'form', questions: FORM_QS_EXPECT }]
    },
    {
      id: 'document-pdf',
      title: 'A PDF document on ScaleDown',
      model: 'scaledown/classify-1',
      teaches: 'One kb PDF, three questions, about $0.00025 — and the same document is four times the tokens of an image of the page.',
      watch: 'input tokens jump to about 6,300 for one page; the score lands near level 0.',
      steps: [{
        label: 'invoice-2026-4471.pdf',
        state: 'Read the attached invoice.',
        attach: 'pdf',
        questions: [
          { key: 'amount_known', type: 'noul', instructions: 'Does the document state an amount due?', expect: 'yes' },
          { key: 'category', type: 'choice', instructions: 'What kind of document is this?', criteria: 'invoice: A bill requesting payment.\nstatement: A periodic account summary.\nreceipt: Proof a payment was made.', expect: 'invoice' },
          { key: 'overdue_risk', type: 'score', instructions: 'How much collection risk does this invoice carry?', criteria: 'Paid on time, no risk\nLate but cooperative\nDisputed or unresponsive\nLegal action likely', expect: '0' }
        ]
      }]
    },
    {
      id: 'ladder',
      title: 'The context ladder on a million-token window',
      model: 'scaledown/classify-1',
      teaches: 'Load this, then press run ladder: eleven rungs from 10k to 1.5M chars, one card each. The 1.5M rung is where the upstream timed out.',
      watch: 'cost rises linearly with chars, the answers hold, and the last rung comes back refused with a 504 rather than a context error.',
      steps: [{
        label: 'invoice text as the base',
        state: 'Invoice 2026-4471 from North Valley Water District, amount due 4,820.00 USD, terms net 30, late fee 1.5% per month.',
        attach: null,
        questions: [
          { key: 'invoice_number', type: 'noul', instructions: 'Is invoice number 2026-4471 stated in the state?', expect: 'yes' },
          { key: 'eighteen', type: 'noul', instructions: 'Is the number 18 mentioned anywhere in the state?', expect: 'no' }
        ]
      }]
    }
  ];

  function loadWalkStep() {
    if (!walk.recipe) return;
    var recipe = walk.recipe;
    var step = recipe.steps[walk.step];
    useModel(recipe.model);
    $('state').value = step.state;
    $('repeat').value = '1';
    if (step.attach === 'form') setAttachment('image', formImage(), 'judicial-form.png');
    else if (step.attach === 'pdf') setAttachment('file', simplePdf(INVOICE), 'invoice-2026-4471.pdf');
    else clearAttachment();
    setQuestions(step.questions);
    info();
    rules();
    $('walkNav').style.display = recipe.steps.length > 1 ? 'flex' : 'none';
    $('walkStep').textContent = 'step ' + (walk.step + 1) + ' of ' + recipe.steps.length + ' · ' + step.label;
    $('walkNext').disabled = walk.step >= recipe.steps.length - 1;
    $('walkNote').innerHTML = '<b style="color:#e8edf3">' + recipe.title + '</b> — ' + recipe.teaches
      + ' <span style="color:#6f7987">Watch:</span> ' + recipe.watch;
    $('status').textContent = recipe.title + ' loaded · ' + step.label;
    Array.prototype.forEach.call(document.querySelectorAll('.walk'), function (el) {
      el.classList.toggle('on', el.dataset.id === recipe.id);
    });
  }

  function renderWalks() {
    var box = $('walks');
    box.textContent = '';
    RECIPES.forEach(function (recipe) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'walk';
      el.dataset.id = recipe.id;
      var title = document.createElement('b');
      title.textContent = recipe.title;
      var line = document.createElement('span');
      line.textContent = recipe.teaches;
      el.appendChild(title);
      el.appendChild(line);
      el.addEventListener('click', function () {
        walk = { recipe: recipe, step: 0 };
        loadWalkStep();
      });
      box.appendChild(el);
    });
  }

  $('walkNext').addEventListener('click', function () {
    if (!walk.recipe) return;
    if (walk.step < walk.recipe.steps.length - 1) {
      walk.step += 1;
      loadWalkStep();
    }
  });

  renderWalks();

  addQuestion({ key: 'marker', type: 'noul', instructions: 'Is the exact marker ORANGE-731 present in the state?' });
  info();
  rules();
  renderSnapshots();
})();
</script>
</body></html>`;
export default LAB;
