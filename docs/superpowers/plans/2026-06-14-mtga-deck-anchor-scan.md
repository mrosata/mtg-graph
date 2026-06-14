# MTGA Deck-Anchor Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user locate their MTG Arena collection by pasting a deck (instead of typing anchor cards): each deck card becomes an `owned ≥ count` constraint, and the scanner picks the memory block that best satisfies them.

**Architecture:** The app parses the pasted Arena deck (existing `parseArenaDeck`) and POSTs `{deck:[{name,count}]}` to the local bridge. The bridge maps names→grpIds (all printings), builds constraints, and a new `find_collection_by_deck` locates candidate blocks via the highest-count cards, then scores every candidate against the whole deck and applies a confidence gate. Success flows through the existing resolve/summary/import tail; `inconclusive` falls back to the manual "Search a card" picker.

**Tech Stack:** Python 3.9 (stdlib + existing `mtga_export` package), pytest. React/Vite/TS + Vitest.

---

## Notes for the implementer

- This builds on the merged `mtga_export` package and the app's Live scan. Spec: `docs/superpowers/specs/2026-06-14-mtga-deck-anchor-scan-design.md`.
- Python is **3.9**: every new `.py` you create needs `from __future__ import annotations` as line 1. (Existing files already have it.)
- Run Python tests: `cd /Users/Dada/mtg-graph/scripts && python3 -m pytest mtga_export/tests -q` (a `pytest.ini` disables a broken global plugin).
- Run app tests: `cd /Users/Dada/mtg-graph/app && npx vitest run <file>`; typecheck `npx tsc --noEmit` (repo uses `noUncheckedIndexedAccess`).
- App tests use `fireEvent` from `@testing-library/react` and `vi.spyOn` (NOT `@testing-library/user-event` — not installed).
- Commit trailer on every commit: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Git hygiene: only `git add` the files each task names; never `git add -A`. Do not run `git stash`/`checkout`/`reset`/`merge`.

File map:

```
scripts/mtga_export/
  carddb.py        MODIFY  + name_to_ids(), is_basic()
  scan.py          MODIFY  + _score_block(), find_collection_by_deck(), deck constants
  server.py        MODIFY  Engine._name_to_ids, Engine.scan_deck(), handle_scan deck branch
  tests/test_carddb.py  MODIFY  + name_to_ids / is_basic tests
  tests/test_scan.py    MODIFY  + scoring + deck-scan tests
  tests/test_server.py  MODIFY  + deck branch test
app/src/lib/
  mtgaScanBridge.ts        MODIFY  + scanDeck(), 'inconclusive', matched/total
  mtgaScanBridge.test.ts   MODIFY  + scanDeck test
app/src/components/
  MtgaImportPanel.tsx       MODIFY  deck/search toggle, textarea, handleDeckScan, matched line
  MtgaImportPanel.test.tsx  MODIFY  + deck-mode tests
```

---

## Phase 1 — Engine

### Task 1: Card-DB helpers — `name_to_ids` + `is_basic`

**Files:**
- Modify: `scripts/mtga_export/carddb.py`
- Modify: `scripts/mtga_export/tests/test_carddb.py`

- [ ] **Step 1: Write failing tests**

Append to `scripts/mtga_export/tests/test_carddb.py`:
```python
from mtga_export.carddb import name_to_ids, is_basic

def test_name_to_ids_collects_all_printings():
    lookup = {
        100: {"name": "Bleachbone Verge", "set": "DFT", "collector_number": "250"},
        200: {"name": "Bleachbone Verge", "set": "DFT", "collector_number": "300"},
        300: {"name": "Bloodfell Caves", "set": "MOM", "collector_number": "270"},
    }
    idx = name_to_ids(lookup)
    assert sorted(idx["bleachbone verge"]) == [100, 200]
    assert idx["bloodfell caves"] == [300]

def test_is_basic():
    for n in ["Plains", "island", "Snow-Covered Mountain", "Wastes"]:
        assert is_basic(n)
    for n in ["Bloodfell Caves", "Llanowar Elves"]:
        assert not is_basic(n)
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd /Users/Dada/mtg-graph/scripts && python3 -m pytest mtga_export/tests/test_carddb.py -q`
Expected: FAIL — `ImportError` for `name_to_ids` / `is_basic`.

- [ ] **Step 3: Implement in `carddb.py`**

Add at the end of `scripts/mtga_export/carddb.py` (after `name_to_id`):
```python
_BASICS = {
    "plains", "island", "swamp", "mountain", "forest", "wastes",
    "snow-covered plains", "snow-covered island", "snow-covered swamp",
    "snow-covered mountain", "snow-covered forest",
}

def name_to_ids(lookup: dict[int, dict]) -> dict[str, list[int]]:
    """name (lowercased) -> every grpId that prints under it (all printings)."""
    out: dict[str, list[int]] = {}
    for gid, info in lookup.items():
        out.setdefault(info["name"].lower(), []).append(gid)
    return out

def is_basic(name: str) -> bool:
    return name.strip().lower() in _BASICS
```

- [ ] **Step 4: Run to verify they pass**

Run: `cd /Users/Dada/mtg-graph/scripts && python3 -m pytest mtga_export/tests/test_carddb.py -q`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add scripts/mtga_export/carddb.py scripts/mtga_export/tests/test_carddb.py
git commit -m "feat(mtga): name_to_ids (multi-printing) + is_basic helpers"
```

### Task 2: Block scoring — `_score_block`

**Files:**
- Modify: `scripts/mtga_export/scan.py`
- Modify: `scripts/mtga_export/tests/test_scan.py`

- [ ] **Step 1: Write failing test**

Append to `scripts/mtga_export/tests/test_scan.py`:
```python
from mtga_export.scan import _score_block

def test_score_block_counts_satisfied_lower_bounds():
    block = {70000: 4, 70001: 2, 70004: 4}
    constraints = [
        {"gids": [70000], "count": 4},          # 4 >= 4  ✓
        {"gids": [70001], "count": 3},          # 2 >= 3  ✗
        {"gids": [70003, 70004], "count": 4},   # max(0,4)=4 >= 4  ✓ (multi-printing)
        {"gids": [99999], "count": 1},          # absent → 0 >= 1  ✗
    ]
    assert _score_block(block, constraints) == 2
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/Dada/mtg-graph/scripts && python3 -m pytest mtga_export/tests/test_scan.py::test_score_block_counts_satisfied_lower_bounds -q`
Expected: FAIL — `ImportError` for `_score_block`.

- [ ] **Step 3: Implement in `scan.py`**

Add to `scripts/mtga_export/scan.py` after `card_purity`:
```python
def _score_block(block: dict[int, int], constraints) -> int:
    """How many deck constraints `owned >= count` the block satisfies.
    A constraint carries every printing grpId of one card; the best printing wins.
    """
    n = 0
    for c in constraints:
        owned = max((block.get(g, 0) for g in c["gids"]), default=0)
        if owned >= c["count"]:
            n += 1
    return n
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/Dada/mtg-graph/scripts && python3 -m pytest mtga_export/tests/test_scan.py::test_score_block_counts_satisfied_lower_bounds -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/mtga_export/scan.py scripts/mtga_export/tests/test_scan.py
git commit -m "feat(mtga): _score_block — count satisfied deck constraints"
```

### Task 3: `find_collection_by_deck`

**Files:**
- Modify: `scripts/mtga_export/scan.py`
- Modify: `scripts/mtga_export/tests/test_scan.py`

- [ ] **Step 1: Write failing tests**

Append to `scripts/mtga_export/tests/test_scan.py`:
```python
from mtga_export.scan import find_collection_by_deck

def _owned_block(extra=None):
    # a realistic owned collection: 120 cards, counts cycling 1..4
    blk = {70000 + i: (i % 4) + 1 for i in range(120)}
    blk[70000] = 4; blk[70001] = 4; blk[70002] = 3; blk[70010] = 4
    blk[70004] = 4  # owned printing of a multi-printing card
    if extra:
        blk.update(extra)
    return blk

def _deck_constraints():
    cs = [
        {"gids": [70000], "count": 4},
        {"gids": [70001], "count": 4},
        {"gids": [70002], "count": 3},
        {"gids": [70010], "count": 4},
        {"gids": [70003, 70004], "count": 4},   # multi-printing; owns 70004
        {"gids": [99999], "count": 4},           # un-crafted; not owned
    ]
    cs += [{"gids": [70000 + i], "count": (i % 4) + 1} for i in range(20, 45)]
    return cs

def test_find_collection_by_deck_convergence_over_rarity():
    coll = _owned_block()
    # rarity decoy: same keys, all value 1 except a rare colliding at (70000,4)
    rar = {70000 + i: 1 for i in range(120)}
    rar[70000] = 4
    region = (b"\x00" * 64 + _block_bytes(list(rar.items()))
              + b"\xff" * 8192 + _block_bytes(list(coll.items())) + b"\x00" * 64)
    mem = FakeMemory(regions=[(0x10000, region)])
    card_ids = set(coll) | {99999}
    status, blk, meta = find_collection_by_deck(mem, _deck_constraints(), card_ids,
                                                min_match=5, margin=1)
    assert status == "ok"
    assert blk[70000] == 4 and blk.get(70004) == 4 and 99999 not in blk
    assert meta["total"] == len(_deck_constraints())
    assert meta["matched"] >= 5

def test_find_collection_by_deck_inconclusive_on_tie():
    # two distinct card-pure blocks both satisfy the deck within margin
    a = _owned_block({79000: 1})            # differs only by one extra key -> distinct sig
    b = _owned_block({79001: 1})
    region = (b"\x00" * 64 + _block_bytes(list(a.items()))
              + b"\xff" * 8192 + _block_bytes(list(b.items())) + b"\x00" * 64)
    mem = FakeMemory(regions=[(0x10000, region)])
    card_ids = set(a) | set(b)
    status, blk, meta = find_collection_by_deck(mem, _deck_constraints(), card_ids,
                                                min_match=5, margin=2)
    assert status == "inconclusive"
    assert blk is None

def test_find_collection_by_deck_tier_escalation_no_4ofs():
    coll = _owned_block()
    region = b"\x00" * 64 + _block_bytes(list(coll.items())) + b"\x00" * 64
    mem = FakeMemory(regions=[(0x10000, region)])
    # deck has NO 4-ofs; top card is a 3-of (owned 3) -> must escalate to locate via (gid,3)
    cs = [{"gids": [70002], "count": 3}] + [{"gids": [70000 + i], "count": min((i % 3) + 1, 3)}
                                            for i in range(20, 45)]
    status, blk, meta = find_collection_by_deck(mem, cs, set(coll), min_match=5, margin=1)
    assert status == "ok"
    assert blk[70002] == 3

def test_find_collection_by_deck_not_found():
    coll = _owned_block()
    region = b"\x00" * 64 + _block_bytes(list(coll.items())) + b"\x00" * 64
    mem = FakeMemory(regions=[(0x10000, region)])
    # constraints reference only cards absent from memory
    cs = [{"gids": [1234 + i], "count": 4} for i in range(8)]
    status, blk, meta = find_collection_by_deck(mem, cs, set(coll))
    assert status == "not_found"
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd /Users/Dada/mtg-graph/scripts && python3 -m pytest mtga_export/tests/test_scan.py -k deck -q`
Expected: FAIL — `ImportError` for `find_collection_by_deck`.

- [ ] **Step 3: Implement in `scan.py`**

Add constants near the other scan constants (after `MIN_PURITY`):
```python
DECK_MIN_MATCH = 6      # winner must satisfy at least this many deck constraints
DECK_MARGIN = 2         # ...and beat the runner-up candidate block by this many
DECK_LOCATE_BUDGET = 12 # cap on pattern-scans spent locating candidate blocks
```

Add the function after `find_collection`:
```python
def find_collection_by_deck(mem, constraints, card_ids, min_purity: float = MIN_PURITY,
                            window: int = WINDOW, min_match: int = DECK_MIN_MATCH,
                            margin: int = DECK_MARGIN, locate_budget: int = DECK_LOCATE_BUDGET):
    """Locate the collection from a pasted deck's `owned >= count` constraints.

    LOCATE: pattern-scan the highest-count cards first (owned is in [count, 4], so
    scan (gid, count..4) for every printing gid), stopping at the first card that
    yields any card-pure candidate block (an owned high-count card pins the block).
    SCORE: rank candidate blocks by how many constraints they satisfy; gate on a
    minimum match and a margin over the runner-up, else 'inconclusive'.

    Returns (status, payload, meta) where meta = {"matched", "total"}:
      'ok'           -> payload is the collection dict {grpId: qty}
      'inconclusive' -> payload is None (too few matches or no clear winner)
      'not_found'    -> payload is None (no card-pure candidate located)
    """
    total = len(constraints)
    if not constraints:
        return ("not_found", None, {"matched": 0, "total": 0})

    ordered = sorted(constraints, key=lambda c: c["count"], reverse=True)
    candidates: dict[tuple, dict[int, int]] = {}
    budget = locate_budget
    for c in ordered:
        if budget <= 0:
            break
        for gid in c["gids"]:
            for v in range(c["count"], 5):  # owned value is somewhere in [count, 4]
                if budget <= 0:
                    break
                budget -= 1
                for addr in mem.pattern_scan(struct.pack("<II", gid, v)):
                    for blk in _blocks_around(mem, addr, window):
                        if card_purity(blk, card_ids) >= min_purity:
                            sig = (len(blk), min(blk), max(blk), sum(blk.values()))
                            candidates[sig] = blk
        if candidates:
            break  # an owned high-count card located the block; scoring does the rest

    if not candidates:
        return ("not_found", None, {"matched": 0, "total": total})

    scored = sorted(
        ((_score_block(b, constraints), card_purity(b, card_ids), len(b), b)
         for b in candidates.values()),
        reverse=True,
    )
    best_score, _, _, best = scored[0]
    runner = scored[1][0] if len(scored) > 1 else 0
    if best_score < min_match or (best_score - runner) < margin:
        return ("inconclusive", None, {"matched": best_score, "total": total})
    return ("ok", best, {"matched": best_score, "total": total})
```

- [ ] **Step 4: Run to verify they pass**

Run: `cd /Users/Dada/mtg-graph/scripts && python3 -m pytest mtga_export/tests/test_scan.py -q`
Expected: PASS (all scan tests, old + new).

- [ ] **Step 5: Commit**

```bash
git add scripts/mtga_export/scan.py scripts/mtga_export/tests/test_scan.py
git commit -m "feat(mtga): find_collection_by_deck — tiered locate + constraint scoring"
```

### Task 4: Bridge — `Engine.scan_deck` + handle_scan deck branch

**Files:**
- Modify: `scripts/mtga_export/server.py`
- Modify: `scripts/mtga_export/tests/test_server.py`

- [ ] **Step 1: Write failing test**

Append to `scripts/mtga_export/tests/test_server.py`:
```python
def test_handle_scan_deck_branch_ok():
    class DeckEngine:
        db = {70000: {"name": "Abrade", "set": "DMU", "collector_number": "131"}}
        def scan_deck(self, entries):
            assert entries == [{"name": "Abrade", "count": 4}]
            return ("ok", {70000: 4}, {"matched": 9, "total": 10})
    engine = DeckEngine()
    handler = build_handler_class(engine)
    status, body = handler.handle_scan(engine, {"deck": [{"name": "Abrade", "count": 4}]})
    assert status == 200
    out = json.loads(body)
    assert out["status"] == "ok"
    assert out["matched"] == 9 and out["total"] == 10
    assert {"count": 4, "name": "Abrade", "set": "DMU", "cn": "131"} in out["collection"]

def test_handle_scan_deck_inconclusive():
    class DeckEngine:
        db = {}
        def scan_deck(self, entries):
            return ("inconclusive", None, {"matched": 3, "total": 12})
    engine = DeckEngine()
    handler = build_handler_class(engine)
    status, body = handler.handle_scan(engine, {"deck": [{"name": "X", "count": 2}]})
    assert json.loads(body) == {"status": "inconclusive", "matched": 3, "total": 12}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/Dada/mtg-graph/scripts && python3 -m pytest mtga_export/tests/test_server.py -q`
Expected: FAIL — `handle_scan` ignores `deck` / `DeckEngine` has no path.

- [ ] **Step 3: Implement in `server.py`**

(a) Imports — extend the carddb/scan imports at the top of `server.py`:
```python
from .carddb import load_card_db, name_to_id, name_to_ids, is_basic
from .scan import find_collection, find_collection_by_deck
```

(b) `Engine.__init__` — add the multi-printing index after `self._n2i`:
```python
        self._name_to_ids = name_to_ids(self.db) if self.db else {}
```

(c) Add `Engine.scan_deck` after `Engine.scan`:
```python
    def scan_deck(self, entries):
        if not self._ensure_mem():
            return ("no_process", None, {"matched": 0, "total": 0})
        merged: dict[str, int] = {}
        for e in entries:
            nm = str(e.get("name", "")).strip()
            if not nm or is_basic(nm):
                continue
            merged[nm.lower()] = merged.get(nm.lower(), 0) + int(e.get("count", 0))
        constraints = []
        for nm, cnt in merged.items():
            gids = self._name_to_ids.get(nm)
            if gids and cnt >= 1:
                constraints.append({"gids": gids, "count": min(cnt, 4)})
        return find_collection_by_deck(self._mem, constraints, self._card_ids)
```

(d) `handle_scan` — branch on `deck` before the anchors path:
```python
        @staticmethod
        def handle_scan(eng, body):
            if "deck" in body:
                status, payload, meta = eng.scan_deck(body["deck"])
                if status == "ok":
                    rows = resolve_rows(payload, eng.db)
                    return 200, json.dumps({"status": "ok", "collection": rows, **meta})
                return 200, json.dumps({"status": status, **meta})
            anchors = [(a["grpId"], a["quantity"]) for a in body.get("anchors", [])]
            status, payload = eng.scan(anchors=anchors or None)
            if status == "ok":
                rows = resolve_rows(payload, eng.db)
                return 200, json.dumps({"status": "ok", "collection": rows})
            return 200, json.dumps({"status": status})
```

> The malformed-body `try/except (KeyError, TypeError)` already wrapping `handle_scan` in `do_POST` covers a `deck` entry missing `name`/`count` (returns 400).

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/Dada/mtg-graph/scripts && python3 -m pytest mtga_export/tests -q`
Expected: PASS (all, old + new). Also smoke-import: `python3 -c "import mtga_export.server"`.

- [ ] **Step 5: Commit**

```bash
git add scripts/mtga_export/server.py scripts/mtga_export/tests/test_server.py
git commit -m "feat(mtga): bridge /api/scan deck branch + Engine.scan_deck"
```

---

## Phase 2 — App

### Task 5: Bridge client — `scanDeck`

**Files:**
- Modify: `app/src/lib/mtgaScanBridge.ts`
- Modify: `app/src/lib/mtgaScanBridge.test.ts`

- [ ] **Step 1: Write failing test**

Append to `app/src/lib/mtgaScanBridge.test.ts` (inside the existing `describe`):
```ts
it('scanDeck posts the deck and maps matched/total', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ status: 'ok', collection: [{ count: 4, name: 'Abrade', set: 'DMU', cn: '131' }], matched: 9, total: 10 }),
  }));
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
  const { scanDeck } = await import('./mtgaScanBridge');
  const res = await scanDeck([{ name: 'Abrade', count: 4 }]);
  expect(res.status).toBe('ok');
  expect(res.matched).toBe(9);
  expect(res.total).toBe(10);
  const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
  expect(body).toEqual({ deck: [{ name: 'Abrade', count: 4 }] });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/Dada/mtg-graph/app && npx vitest run src/lib/mtgaScanBridge.test.ts`
Expected: FAIL — `scanDeck` is not exported.

- [ ] **Step 3: Implement in `mtgaScanBridge.ts`**

Extend the `ScanStatus` union and `ScanResult`, and add `scanDeck`:
```ts
export type ScanStatus =
  | 'ok'
  | 'need_anchor'
  | 'ambiguous'
  | 'inconclusive'
  | 'not_found'
  | 'no_process';
export type ScanResult = { status: ScanStatus; collection?: ScanRow[]; matched?: number; total?: number };

export type DeckEntry = { name: string; count: number };

export async function scanDeck(deck: DeckEntry[]): Promise<ScanResult> {
  const r = await fetch(`${BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deck }),
  });
  if (!r.ok) return { status: 'not_found' };
  return (await r.json()) as ScanResult;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/Dada/mtg-graph/app && npx vitest run src/lib/mtgaScanBridge.test.ts`
Then: `npx tsc --noEmit`
Expected: tests PASS; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/mtgaScanBridge.ts app/src/lib/mtgaScanBridge.test.ts
git commit -m "feat(app): scanDeck bridge client + inconclusive/matched"
```

### Task 6: Live scan deck/search toggle + deck-paste UI

**Files:**
- Modify: `app/src/components/MtgaImportPanel.tsx`
- Modify: `app/src/components/MtgaImportPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `app/src/components/MtgaImportPanel.test.tsx` (the file already imports `* as bridge`, `render`, `screen`, `fireEvent`, `vi`):
```tsx
function connectScanTab() {
  vi.spyOn(bridge, 'bridgeHealth').mockResolvedValue({
    online: true, running_as_root: true, arena_process_found: true, card_db_ready: true,
  });
  render(<MtgaImportPanel mode="full" onClose={() => {}} />);
  fireEvent.click(screen.getByRole('tab', { name: /MTG Arena/i }));
  fireEvent.click(screen.getByRole('tab', { name: /Live scan/i }));
}

it('scan deck mode: paste deck → ok → summary with matched count', async () => {
  connectScanTab();
  fireEvent.click(screen.getByRole('button', { name: /^Connect$/i }));
  await screen.findByRole('button', { name: /Find my collection/i }); // deck is the default mode
  fireEvent.change(screen.getByPlaceholderText(/Export.*paste/i), {
    target: { value: 'Deck\n4 Abrade (DMU) 131\n' },
  });
  const spy = vi.spyOn(bridge, 'scanDeck').mockResolvedValue({
    status: 'ok', collection: [{ count: 4, name: 'Abrade', set: 'DMU', cn: '131' }], matched: 21, total: 24,
  });
  fireEvent.click(screen.getByRole('button', { name: /Find my collection/i }));
  expect(await screen.findByText(/matched 21 of 24/i)).toBeInTheDocument();
  expect(spy).toHaveBeenCalledWith([{ name: 'Abrade', count: 4 }]);
});

it('scan deck mode: inconclusive shows fallback message', async () => {
  connectScanTab();
  fireEvent.click(screen.getByRole('button', { name: /^Connect$/i }));
  await screen.findByRole('button', { name: /Find my collection/i });
  fireEvent.change(screen.getByPlaceholderText(/Export.*paste/i), { target: { value: 'Deck\n2 Llanowar Elves (DMU) 168\n' } });
  vi.spyOn(bridge, 'scanDeck').mockResolvedValue({ status: 'inconclusive', matched: 3, total: 12 });
  fireEvent.click(screen.getByRole('button', { name: /Find my collection/i }));
  expect(await screen.findByText(/couldn't pin it down|search a card/i)).toBeInTheDocument();
});

it('scan deck mode: empty paste is rejected without a bridge call', async () => {
  connectScanTab();
  fireEvent.click(screen.getByRole('button', { name: /^Connect$/i }));
  await screen.findByRole('button', { name: /Find my collection/i });
  const spy = vi.spyOn(bridge, 'scanDeck');
  fireEvent.click(screen.getByRole('button', { name: /Find my collection/i }));
  expect(await screen.findByText(/doesn't look like an Arena deck/i)).toBeInTheDocument();
  expect(spy).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd /Users/Dada/mtg-graph/app && npx vitest run src/components/MtgaImportPanel.test.tsx -t "deck mode"`
Expected: FAIL — no deck textarea / "Find my collection" button.

- [ ] **Step 3: Implement in `MtgaImportPanel.tsx`**

(a) Add imports near the other lib imports:
```tsx
import { bridgeHealth, scanDeck, scanCollection, searchCards } from '../lib/mtgaScanBridge';
import { parseArenaDeck } from '../lib/deckImport';
```
(If `bridgeHealth`/`scanCollection`/`searchCards` are already imported, just add `scanDeck` and `parseArenaDeck` — don't duplicate.)

(b) Add state next to the other scan state (`connected`, `anchors`, …):
```tsx
const [scanMode, setScanMode] = useState<'deck' | 'search'>('deck');
const [deckText, setDeckText] = useState('');
const [deckMatch, setDeckMatch] = useState<{ matched: number; total: number } | null>(null);
```

(c) Add the deck handler next to `handleScan`:
```tsx
const handleDeckScan = async () => {
  setScanMsg(null);
  setDeckMatch(null);
  const parsed = parseArenaDeck(deckText);
  const byName = new Map<string, number>();
  for (const e of [...parsed.entries, ...parsed.sideboardEntries]) {
    byName.set(e.name, (byName.get(e.name) ?? 0) + e.count);
  }
  const deck = [...byName].map(([name, count]) => ({ name, count }));
  if (deck.length === 0) {
    setScanMsg("That doesn't look like an Arena deck. Paste a deck exported from MTGA.");
    return;
  }
  setState({ kind: 'parsing', bytes: 0, total: 0 });
  const res = await scanDeck(deck);
  setState({ kind: 'idle' });
  if (res.status === 'ok' && res.collection) {
    setDeckMatch({ matched: res.matched ?? 0, total: res.total ?? deck.length });
    setState({
      kind: 'ready',
      libraryResult: resolveLibrary(parseMtgaCollectionJson(JSON.stringify(res.collection)), cards, KNOWN_SET_CODES),
      mtgaSummary: null,
      decks: null,
      filename: 'Live scan (deck)',
    });
    return;
  }
  if (res.status === 'no_process') {
    setScanMsg('Open MTG Arena and visit the Collection tab, then try again.');
    return;
  }
  setScanMsg("Couldn't pin it down from that deck — paste a different deck or use Search a card.");
};
```

(d) Inside the `connected` branch (the `<div className="mt-3 space-y-2">` after Connect), put a mode toggle FIRST, then render deck mode or the existing search UI. Replace the connected block body with:
```tsx
<div className="mt-3 space-y-2">
  <div role="tablist" aria-label="anchor mode" className="flex gap-1 text-xs">
    <button type="button" role="tab" aria-selected={scanMode === 'deck'}
      onClick={() => { setScanMode('deck'); setScanMsg(null); }}
      className={['focus-brass rounded px-2 py-0.5', scanMode === 'deck' ? 'bg-ink-raised text-brass-hi border border-brass/40' : 'text-vellum-mute border border-transparent hover:text-brass-hi'].join(' ')}>
      Paste a deck
    </button>
    <button type="button" role="tab" aria-selected={scanMode === 'search'}
      onClick={() => { setScanMode('search'); setScanMsg(null); }}
      className={['focus-brass rounded px-2 py-0.5', scanMode === 'search' ? 'bg-ink-raised text-brass-hi border border-brass/40' : 'text-vellum-mute border border-transparent hover:text-brass-hi'].join(' ')}>
      Search a card
    </button>
  </div>

  {scanMode === 'deck' ? (
    <>
      <textarea
        value={deckText}
        onChange={(e) => setDeckText(e.target.value)}
        placeholder="In Arena: open a deck → Export → paste here"
        rows={6}
        className="focus-brass w-full rounded border border-ink-line-2 bg-ink-raised px-2 py-1 text-sm text-vellum-mute"
      />
      <button type="button" onClick={() => void handleDeckScan()}
        className="focus-brass rounded bg-brass px-3 py-1 text-sm font-semibold text-ink-bg transition-colors hover:bg-brass-hi">
        Find my collection
      </button>
    </>
  ) : (
    <>
      {anchors.length > 0 && (
        <p className="text-xs text-vellum-dim">
          {anchors.length === 1 ? '1 anchor card' : `${anchors.length} anchor cards`} added.
        </p>
      )}
      <input
        type="text"
        placeholder="Search a card you own…"
        className="focus-brass w-full rounded border border-ink-line-2 bg-ink-raised px-2 py-1 text-sm text-vellum-mute"
        onChange={(e) => { void searchCards(e.target.value).then(setAnchorHits); }}
      />
      {!anchor && (
        <ul className="max-h-32 overflow-auto text-sm">
          {anchorHits.map((h) => (
            <li key={h.grpId}>
              <button type="button" className="text-vellum-mute hover:text-brass-hi"
                onClick={() => setAnchor({ grpId: h.grpId, name: h.name })}>
                {h.name} ({h.set})
              </button>
            </li>
          ))}
        </ul>
      )}
      {anchor && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-brass-hi">{anchor.name}</span>
          <input aria-label="quantity" type="number" min={1} value={anchorQty}
            onChange={(e) => setAnchorQty(e.target.value)}
            className="w-16 rounded border border-ink-line-2 bg-ink-raised px-2 py-1 text-sm" />
        </div>
      )}
      <button type="button" onClick={() => void handleScan()}
        disabled={!anchor || Number(anchorQty) < 1}
        className="focus-brass rounded bg-brass px-3 py-1 text-sm font-semibold text-ink-bg transition-colors hover:bg-brass-hi disabled:cursor-not-allowed disabled:bg-ink-raised disabled:text-vellum-dim">
        Scan my collection
      </button>
    </>
  )}
</div>
```

(e) Show the matched line in the ready state. Find the `state.kind === 'ready'` block (it renders `LibraryImportSummary` for `mode === 'full'`) and add, immediately before the `<LibraryImportSummary .../>`:
```tsx
{deckMatch && (
  <p className="text-xs text-brass-hi">
    Matched {deckMatch.matched} of {deckMatch.total} deck cards.
  </p>
)}
```

- [ ] **Step 4: Run to verify they pass**

Run: `cd /Users/Dada/mtg-graph/app && npx vitest run src/components/MtgaImportPanel.test.tsx`
Then: `npx tsc --noEmit`
Expected: all panel tests PASS (old + new); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/MtgaImportPanel.tsx app/src/components/MtgaImportPanel.test.tsx
git commit -m "feat(app): deck-paste anchor mode in Live scan"
```

---

## Phase 3 — Gate & docs

### Task 7: Full gate + README note

**Files:**
- Modify: `scripts/README.md`

- [ ] **Step 1: Add a deck-paste note to `scripts/README.md`**

Under the macOS / cross-platform section, add a short paragraph:
```
You don't have to type a card to anchor the scan: in the app's Live scan, choose
"Paste a deck" and paste any deck you own (Arena → deck → Export). The scanner uses
the deck's card counts to find your collection — usually no manual card entry needed.
```

- [ ] **Step 2: Run the Python suite**

Run: `cd /Users/Dada/mtg-graph/scripts && python3 -m pytest mtga_export/tests -q`
Expected: PASS (all).

- [ ] **Step 3: Run the full app gate**

Run: `cd /Users/Dada/mtg-graph && npm test`
Expected: pipeline + shared, app vitest, and the app production build (tsc + vite) all green. If a failure is in our touched files (`mtga_export/*`, `mtgaScanBridge*`, `MtgaImportPanel*`), fix it; pre-existing unrelated failures (if any) — report, don't fix.

- [ ] **Step 4: Commit**

```bash
git add scripts/README.md
git commit -m "docs(mtga): deck-paste anchor note"
```

---

## Self-review notes

- **Spec coverage:** constraint model + cap-at-4 + basics excluded (Task 1 `is_basic`, Task 4 `scan_deck`) ✓; tiered locate + scoring + confidence gate (Task 3) ✓; multi-printing name→ids (Task 1, used in Tasks 3/4) ✓; bridge `deck` field + matched/total + inconclusive (Task 4) ✓; client `scanDeck` (Task 5) ✓; toggle UI + textarea + matched line + fallback + garbage handling (Task 6) ✓; tests at every layer ✓; engine verified manually via the full gate (Task 7).
- **No live-process test needed:** all engine logic is exercised against `FakeMemory`; the real mach reader is unchanged from the merged, already-verified feature.
- **Type consistency:** `find_collection_by_deck` returns a 3-tuple `(status, payload, meta)`; `find_collection` stays a 2-tuple; `handle_scan` branches keep them separate. `ScanResult.matched/total` (TS) match the server's `meta` keys. Constraint shape `{gids: int[], count: int}` is identical in `_score_block`, `find_collection_by_deck`, and `Engine.scan_deck`. `DeckEntry {name,count}` matches `parseArenaDeck` output and the server's `body["deck"]` reader.
- **Reuse:** deck parsing (`parseArenaDeck`), block extraction (`_blocks_around`/`find_blocks`/`card_purity`), and the resolve→summary→import tail are all reused; only the selection strategy and a thin UI mode are new.
```
