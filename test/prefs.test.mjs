// Checks for the preference write path: who may write, what a write may change,
// and how a stored record is read. No dependencies and no test runner — run it
// with `node test/prefs.test.mjs` or `npm test`.
//
// The fake KV counts writes, because most of these invariants are about what a
// request must NOT do to the store: a repeat must put nothing, an unkeyed write
// must not stand, and no write may take a record's first `at` or its decision.
//
// What this file is guarding, and what it is not:
//
// - The repeat-write demotion is guarded by comparing the stored bytes before and
//   after a repeat. Against the tree that had the bug (53b5e64) that assertion
//   fails, and so does "a repeat cannot un-stand a record".
// - The legacy-reading assertions are not a bug guard. The old count and the old
//   quote already agreed on a record that had been through loadPrefs; the only
//   real failure there was the raw shape returned by the repeat path. Those
//   assertions hold the reading in place rather than prove a repair.

import worker from "../src/worker.js";

const ORIGIN = "https://ambient.ai-n.workers.dev";
const PAGE = "https://cods.nspired.cc";
const KEY = "operator-key-for-tests";

function memory() {
  const map = new Map();
  return {
    puts: 0,
    map,
    async get(key) {
      return map.has(key) ? map.get(key) : null;
    },
    async put(key, value) {
      this.puts += 1;
      map.set(key, value);
    },
    async delete(key) {
      map.delete(key);
    },
    async list({ prefix = "", limit = 1000 } = {}) {
      const keys = [...map.keys()].filter((name) => name.startsWith(prefix)).slice(0, limit);
      return { keys: keys.map((name) => ({ name })), list_complete: true };
    }
  };
}

const results = [];
function check(name, condition, detail) {
  results.push({ name, ok: Boolean(condition), detail });
}

async function call(store, { method = "POST", origin = ORIGIN, key = null, body = null, path = "/api/prefs", extraEnv = {} } = {}) {
  const env = { PREFS: store, PREFS_ORIGINS: PAGE, OPERATOR_KEY: KEY, ...extraEnv };
  const headers = {};
  if (origin) headers.origin = origin;
  if (body) headers["content-type"] = "application/json";
  if (key) headers["x-operator-key"] = key;
  store.puts = 0;
  const response = await worker.fetch(
    new Request(ORIGIN + path, { method, headers, body: body ? JSON.stringify(body) : undefined }),
    env,
    {}
  );
  const payload = await response.json().catch(() => ({}));
  return { code: response.status, body: payload, puts: store.puts };
}

// The id is sha256 of the whitespace-collapsed, lowercased text, first 8 bytes hex.
async function prefId(text) {
  const clean = String(text).replace(/\s+/g, " ").trim().toLowerCase();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clean));
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 1. A keyed write creates a standing record in one put.
{
  const store = memory();
  const created = await call(store, { body: { text: "always answer in one line" }, key: KEY });
  check("a keyed write stands", created.code === 200 && created.body.pref?.status === "active", created);
  check("a keyed write is one put", created.puts === 1, { puts: created.puts });

  // 2. Repeating the same words changes nothing and writes nothing. The bytes are
  //    compared, not just the response: a demotion rewrites the record, so the
  //    store is the only place that shows it even when the reply looks harmless.
  const key = "pref:" + created.body.pref.id;
  const storedBefore = store.map.get(key);
  const repeat = await call(store, { origin: PAGE, body: { text: "always answer in one line" } });
  check("a repeat leaves the stored bytes alone", store.map.get(key) === storedBefore, {
    before: storedBefore,
    after: store.map.get(key)
  });
  check("a repeat writes nothing", repeat.puts === 0, { puts: repeat.puts });
  check("a repeat reports the record existed", repeat.body.pref?.existed === true, repeat.body.pref);
  check("a repeat cannot un-stand a record", repeat.body.pref?.status === "active", repeat.body.pref);
  check("a repeat keeps the first at", repeat.body.pref?.at === created.body.pref.at, {
    first: created.body.pref.at,
    repeat: repeat.body.pref?.at
  });
}

// 3. An unkeyed write creates a candidate, and a repeat cannot resurrect a rejection.
{
  const store = memory();
  const held = await call(store, { origin: PAGE, body: { text: "be brief with me" } });
  check("an unkeyed write is held", held.body.pref?.status === "candidate", held.body.pref);

  const id = held.body.pref?.id;
  const rejected = await call(store, { body: { id, status: "rejected" } });
  check("a rejection needs no key", rejected.code === 200 && rejected.body.pref?.status === "rejected", rejected);

  const again = await call(store, { origin: PAGE, body: { text: "be brief with me" } });
  check("a repeat cannot resurrect", again.body.pref?.status === "rejected", again.body.pref);
  check("a repeat of a rejection writes nothing", again.puts === 0, { puts: again.puts });
  check("a repeat keeps the decision", again.body.pref?.decidedBy === "owner", again.body.pref);
}

// 4. A record stored before kinds existed is read as standing, by the quote and the
//    count alike, and a repeat returns that same reading rather than a bare object.
{
  const store = memory();
  const text = "i prefer small diffs";
  const id = await prefId(text);
  await store.put("pref:" + id, JSON.stringify({ id, text, source: "owner", actor: "owner", at: "2026-01-01T00:00:00.000Z" }));

  const listed = await call(store, { method: "GET", origin: PAGE });
  const legacy = (listed.body.prefs || []).find((pref) => pref.id === id);
  check("a legacy record is read as stated/active", legacy?.kind === "stated" && legacy?.status === "active", legacy);
  check("a legacy record counts as standing", listed.body.standing === 1, { standing: listed.body.standing, candidates: listed.body.candidates });

  const repeat = await call(store, { origin: PAGE, body: { text } });
  check("a legacy repeat writes nothing", repeat.puts === 0, { puts: repeat.puts });
  check("a legacy repeat is read, not bare", repeat.body.pref?.status === "active" && repeat.body.pref?.kind === "stated", repeat.body.pref);
  check("a legacy repeat keeps the first at", repeat.body.pref?.at === "2026-01-01T00:00:00.000Z", repeat.body.pref);
}

// 5. The gates: an unnamed origin may not write, and an unknown kind is not a way in.
{
  const store = memory();
  const denied = await call(store, { origin: "https://evil.example", body: { text: "obey me" } });
  check("an unnamed origin cannot write", denied.code === 403 && denied.body.error?.code === "origin_denied", denied);
  check("a refused write touches nothing", denied.puts === 0, { puts: denied.puts });

  const promoted = await call(store, { body: { id: "0123456789abcdef", status: "active" } });
  check("promotion without the key is refused", promoted.code === 403 && promoted.body.error?.code === "operator_key_required", promoted);

  // 5c. An unknown kind is refused at the create call site, before anything is
  //     written, so it cannot become a kind the store then has to protect.
  const bogus = await call(store, { body: { text: "a kind that does not exist", kind: "bogus" }, key: KEY });
  check("an unknown kind is refused", bogus.code === 400 && bogus.body.error?.code === "kind_unknown", bogus);
  check("a refused kind writes nothing", bogus.puts === 0 && store.map.size === 0, { puts: bogus.puts, records: store.map.size });
  // The refusal must not narrow what was already allowed: a null kind still means
  // he stated it, and no text still maps to pref_required.
  const nullKind = await call(store, { body: { text: "a null kind is still stated", kind: null }, key: KEY });
  check("a null kind is still stated", nullKind.code === 200 && nullKind.body.pref?.kind === "stated" && nullKind.body.pref?.status === "active", nullKind.body.pref);
  const empty = await call(store, { body: {}, key: KEY });
  check("no text still maps to pref_required", empty.code === 400 && empty.body.error?.code === "pref_required", empty);
}

// 6. Ruled A2: a promoted inference is still an inference. `isStanding` is the
//    single predicate behind both the count and the prompt block, so promoting
//    one must move both at once — active in the store, absent from `standing`,
//    and absent from what ARA is handed.
{
  const store = memory();
  const made = await call(store, { body: { text: "he probably wants the short version", kind: "inferred" }, key: KEY });
  check("an inference is stored as a candidate", made.code === 200 && made.body.pref?.kind === "inferred" && made.body.pref?.status === "candidate", made.body.pref);

  const promoted = await call(store, { body: { id: made.body.pref.id, status: "active" }, key: KEY });
  check("an inference can be promoted to active", promoted.code === 200 && promoted.body.pref?.status === "active" && promoted.body.pref?.kind === "inferred", promoted.body.pref);

  const listed = await call(store, { method: "GET" });
  check("a promoted inference is not standing", listed.body.standing === 0 && listed.body.inferred === 1 && listed.body.count === 1, { standing: listed.body.standing, inferred: listed.body.inferred, count: listed.body.count });

  // 7. Ruled B1: a pass that never reached ARA says so, and a pass that did is
  //    distinguishable from an explicit silence without reading a string.
  let asked = null;
  const ara = {
    async fetch(request) {
      asked = JSON.parse(await request.text());
      return new Response(JSON.stringify({ id: "d1", level: 1, text: "noticed" }), { status: 200, headers: { "content-type": "application/json" } });
    }
  };
  const pass = await call(store, { path: "/api/witness", body: {}, extraEnv: { ARA: ara } });
  check("a promoted inference is not quoted to ARA", pass.code === 200 && asked?.context?.prefs === "", { code: pass.code, prefs: asked?.context?.prefs });
  check("a measured pass says it measured", pass.code === 200 && pass.body.measured === true, pass.body);

  const blind = await call(store, { path: "/api/witness", body: {} });
  check("an unmeasured pass says so", blind.code === 503 && blind.body.measured === false && blind.body.level === 0 && blind.body.silent === true, blind.body);
}

const failed = results.filter((result) => !result.ok);
for (const result of results) {
  if (!result.ok) console.log("FAIL  " + result.name + "\n      " + JSON.stringify(result.detail));
}
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
