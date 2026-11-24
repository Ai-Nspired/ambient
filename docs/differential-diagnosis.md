# Differential diagnosis

A fault is not a message. It is a difference between two sides, and the fix is the
smallest edit that closes it without moving anything else. This document describes
the pattern as built into ambient, in terms general enough to carry to another
system.

It has four parts: live reads, a fault identity, a press key, and a capability that
releases the delta and not the whole record.

---

## 1. Why a diagnosis is a diff

"The hand-off opened blank" is not actionable. "The origin carries `q`, the
destination reads `nothing`, so one read is missing at the destination" is. The
second statement can be checked, applied and reverted; the first cannot.

So every diagnosis is expressed as:

| Part | Meaning |
|---|---|
| origin | what the source actually hands over (`q`, a focused card's text, a typed line) |
| destination | what the receiver actually reads, taken from its own bytes |
| missing | what the origin carries and the destination never asks for |
| extra | what the destination reads and the origin never sends |
| edit | the minimal change that closes `missing` |
| blast | what the edit is allowed to touch, and what must keep working |
| checks | the three things to try afterwards |

`missing` and `extra` are set differences. Nothing in the pattern is specific to
ambient: any producer and any consumer can be compared this way.

## 2. Live reads, never a remembered table

A table of "what each app reads" is wrong the moment the app is edited, and worse,
it is wrong silently. Instead, ask the destination on every call:

1. Fetch the destination's entry bytes through whatever the system already has — a
   service binding, an internal HTTP call, a checked-out tree.
2. Count a parameter as *read* only when a name is asked of the query string:
   match `URLSearchParams` and `.get('name')`.
3. Carry the evidence with the result: byte counts per path and the number of
   `URLSearchParams` found.

Measured on ambient while writing this:

```
cods → live: / 133244b — 0 URLSearchParams, reads [nothing]
tew  → live: / 195560b — 1 URLSearchParams, reads [ws]
trnv → live: /ptt.js 30455b + /ptt 8688b — 0 URLSearchParams, reads [nothing]
```

cods measured 134,452 bytes one day and 133,244 the next. That drift is the reason
the table had to go.

If the destination does not answer, the result says so (`no live read: the
destination did not answer`) rather than falling back to a remembered value.

## 3. A fault has one name

The card id is a hash of the fault and only the fault:

```
id = sha256([code, destination, failing checks, symptom])[:12]
```

Deliberately excluded: the verdict's wording, the dial's state, the clock. Those
change on every press, and including any of them gives the same fault a new name
each time, which destroys the only thing an id is for — recognising that you have
seen this before.

Verified: the same fault pressed from state `go · cards in cods` and from
`diagnose · checking` produced `80993118dabc` both times.

## 4. The press key

Borrowed from push-to-talk. The card does not answer to anyone holding the URL; it
answers while a key minted by a press is held.

```
key = v1.<expiry>.<card>.<capability>.<HMAC-SHA256(expiry.card.capability)>
```

- signed with a server-held secret (ambient uses `DIAL_TOKEN`)
- 60 seconds of life
- bound to one card id: a key pressed for card A opens no other card
- bound to one capability
- compared byte by byte, constant time, never with string equality

A key that is absent, expired, forged or for another card is refused:

```
GET /api/diag?id=…            → 401 key_required
flipped last char of key      → 401 key_required
key minted for another card   → 403 key_other_card
held key, cap=diff            → 200
```

## 5. Capability: the diff is the release

A rest-state key releases the delta only:

```
{ id, faults, diff, to, at, cap: "diff" }
```

The verdict, the binding checks and the ruling stay behind a key held by the
operator. This is the same idea as the diff itself applied to disclosure: give the
part that fixes the fault, withhold the rest.

## 6. Frequency

One channel per card. Each press increments a per-card counter in a one-minute
bucket; at twenty the channel squelches:

```
21 presses on one card → 200 ×20, then 429 squelched
```

That bounds the cost of a card being hammered without needing a per-user account.

## 7. Who may press

A stranger posting their own symptom must not be able to mint a key. Two ways in:

- the page itself: the request's `Origin` (or `Referer`) host equals the Worker's
  host — a browser sets `Origin` and a page cannot choose it
- the operator: `x-dial-token`, compared constant time

```
no Origin, no token        → 403 press_denied
Origin: https://evil.example → 403 press_denied
Origin: the page's own      → 200, cap diff, key 78 chars
```

`Origin` is enforced by the browser, not cryptographically. A script can forge the
header. It stops a hostile page; it does not stop a determined client. The operator
token is the cryptographic path.

## 8. What the card carries

```json
{
  "id": "774f35943207",
  "verdict": "Every binding the dial uses is in place, but the truth store did not answer this diagnosis in 1.2s.",
  "faults": ["truth reply"],
  "to": "cods",
  "diff": {
    "origin": { "provides": ["q"] },
    "destination": { "reads": [], "evidence": "live: / 133244b — 0 URLSearchParams, reads [nothing]" },
    "missing": ["q"],
    "edits": [{ "file": "the index page", "lines": 1,
                "code": "const q = new URLSearchParams(location.search).get('q') || '';" }],
    "blast": { "lines": 1, "radius": "one read added before init in the index page",
               "keeps": ["a page opened with no parameter still opens",
                         "the page's init and every other route in that file are untouched"] },
    "checks": ["open cods with no parameter and confirm it still opens",
               "open it with ?q=a focused card and confirm the text is there, not blank",
               "confirm no parameter path was broken"]
  }
}
```

`GET /api/diag?id=…&k=…` returns it with `access-control-allow-origin: *` and
`cache-control: no-store`, so the app that was handed the card can read it in its
own page. The card carries no secret: a verdict, binding names, and a public URL's
parameter behaviour.

## 9. Adapting this elsewhere

An adopter needs three things, none of them ambient-specific:

1. **A readable entry.** The consumer's entry bytes must be fetchable at diagnosis
   time. If they are not, the pattern degrades honestly to "not measured".
2. **A fault descriptor.** Code, dependencies, failing checks, symptom. Not prose.
3. **A secret and a capability model.** One key-signing secret; one named
   capability per disclosure level; a life short enough that a leaked key is a
   nuisance and not a breach.

Then diagnosis is:
`read both sides live → set-difference → minimal edit → blast radius → checks → press → release the diff`.

## 10. Limits, stated plainly

- Edits are **proposed**, not applied. Applying them is a deploy of the other
  application, and that authorization is not ambient's to give.
- `Origin` gating is browser-enforced. See §7.
- A key lives 60 seconds. A card older than its key answers 401 until pressed
  again, by design.
- `extra` (reads the origin never sends) is reported but not closed; a consumer
  that reads a parameter nobody sends has its own bug and its own fix.
