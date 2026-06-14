# MTGA deck-anchor scan — design

Status: draft (awaiting user review)
Date: 2026-06-14
Builds on: `2026-06-13-mtga-native-mac-exporter-design.md` (the Live scan + bridge it extends)

## Goal

Let a user locate their MTG Arena collection in memory by **pasting a deck** instead
of typing anchor cards. A pasted Arena deck export yields many cards at known
quantities; the scanner turns those into ownership constraints and finds the
collection block that best satisfies them. In the common case this is **zero manual
card entry** — the user exports a deck to clipboard in Arena and pastes it.

This extends the existing anchor-based Live scan (`find_collection`, which requires
the user to name one or two owned cards). Manual anchors stay as the fallback.

## Why a new matching strategy

The existing `find_collection` requires *every* supplied anchor `(grpId, qty)` to
appear in one memory block. That's correct for hand-picked owned cards, but a pasted
deck can contain cards the user has **not crafted** (Arena lets you build a deck from
un-owned cards, to be filled with wildcards). So we cannot require all deck cards to
match. Instead we **score** candidate blocks by how many deck constraints they
satisfy and pick the best — convergence, not unanimity.

## The constraint model

Each distinct non-basic deck card becomes one constraint `owned ≥ count`, where
`count` is its total copies across mainboard + sideboard (capped at 4 — Arena's
deckbuilding limit for non-basics). Interpretation:

- a **4-of** → `owned == 4` (exact for non-basics; the strongest signal)
- a **3-of** → `owned ≥ 3` (owned is 3 or 4)
- a **2-of** → `owned ≥ 2`
- a **1-of** → `owned ≥ 1`

Basic lands (Plains, Island, Swamp, Mountain, Forest, Wastes, and snow-covered
variants) are excluded — their counts are large and ownership is unbounded.

## Engine algorithm — `find_collection_by_deck`

New function in `pipeline`-adjacent `scripts/mtga_export/scan.py`:

```
find_collection_by_deck(mem, constraints, card_ids) -> (status, payload, meta)
  # constraints: list of { gids: [grpId, ...], count: int }  (gids = all printings of a name)
```

1. **Locate** candidate blocks, tiered by count (descending), to bound the work:
   - Tier 4: for each 4-of, pattern-scan the exact pair `(gid, 4)` for every printing
     `gid`. Collect the card-pure blocks around each hit (reusing `_blocks_around` +
     `card_purity ≥ MIN_PURITY` from the manual path).
   - If fewer than `MIN_CANDIDATES` (e.g. 2) distinct blocks are found, escalate:
     tier 3 scans `(gid, 3)` and `(gid, 4)`; tier 2 scans `(gid, 2..4)`; etc. Stop as
     soon as enough candidates exist or constraints are exhausted.
   - Dedup blocks by signature `(len, min, max, sum)` as in `find_collection`.
2. **Score** each candidate block against the **whole** constraint set:
   `score(block) = count of constraints where max(block.get(g, 0) for g in gids) ≥ count`.
3. **Pick** the highest score; tiebreak by `card_purity` then `len`.
4. **Confidence gate:** require `best.score ≥ MIN_MATCH` (e.g. 6) AND
   `best.score − runnerUp.score ≥ MARGIN` (e.g. 2). Otherwise return `inconclusive`.
5. Return `('ok', block, {matched: best.score, total: len(constraints)})` or
   `('inconclusive', None, {matched, total})` or `('not_found', None, …)` when no
   pure candidate block is located at all.

Constants (`MIN_CANDIDATES`, `MIN_MATCH`, `MARGIN`) are module-level with comments;
tuned against the developer's real collection during implementation and pinned.

`find_collection` (manual anchors) is unchanged and remains the fallback.

## Bridge — `server.py`

- Build a **name → [grpId, …] index** once in `Engine.__init__` (multi-printing aware;
  the existing `name_to_id` keeps only one id per name and is kept for manual search).
- `Engine.scan_deck(entries)`: map each `{name, count}` → a constraint
  `{gids, count}` via the name index (drop names that don't resolve and basic lands),
  then call `find_collection_by_deck`. Returns the same `(status, payload, meta)`.
- `POST /api/scan` gains an optional `deck` field: `[{ "name": str, "count": int }]`.
  When `deck` is present, dispatch to `scan_deck`; otherwise the existing
  `anchors` path. Response on success: `{ status:"ok", collection:[…], matched, total }`;
  on inconclusive: `{ status:"inconclusive", matched, total }`. Malformed body → 400
  (existing guard extended to validate `deck` entries).

## App — `MtgaImportPanel` (Live scan source) + bridge client

- `mtgaScanBridge.ts`: add `scanDeck(entries: {name,count}[])` calling `/api/scan` with
  `{deck}`; extend `ScanStatus` with `'inconclusive'`; `ScanResult` gains optional
  `matched?, total?`.
- `MtgaImportPanel.tsx`, `effectiveSource === 'scan'`, after **Connect**: a mode toggle
  **Paste a deck** (default) | **Search a card**.
  - *Deck mode:* a `<textarea>` ("In Arena: your deck → Export → paste here") and a
    **Find my collection** button. On submit: `parseArenaDeck(text)` (reuse
    `deckImport.ts`) → merge main+side counts per card, drop basics → `scanDeck(...)`.
    `ok` → existing `resolveLibrary` → ready, with a "matched N of M deck cards" line in
    the summary header. `inconclusive` → message: "Couldn't pin it down from that deck —
    paste a different deck or use Search a card." `no_process` → existing copy.
  - *Search mode:* the current manual anchor picker, unchanged.
- The ready → summary → confirm → `importLibrary` tail is unchanged for both modes.

## Error handling

- Paste yields zero parseable cards → "That doesn't look like an Arena deck."
- Un-crafted deck cards are expected; they simply fail their constraint and are ignored.
- `inconclusive` → fallback copy + the user can switch the toggle to Search a card.
- Basics filtered before sending; an all-basics/empty constraint set → treated as
  "not a usable deck," same as zero cards.

## Testing

### Engine — `scripts/mtga_export/tests/test_scan.py`

- Synthetic memory: a collection block + a rarity decoy (small values) + a stale partial
  copy. A deck with several 4-ofs where one card is un-crafted (absent from collection),
  one is a Rare whose `(gid,4)` also lands in the rarity block → convergence scoring
  picks the collection block.
- Multi-printing: a constraint with two `gids`; only the owned printing satisfies — still
  counts as matched.
- `inconclusive` when satisfied-count is below `MIN_MATCH` or the margin is too thin.
- Tier escalation: a deck with no 4-ofs but several 3-ofs locates via tier 3.
- `not_found` when no card-pure candidate block exists.
- Constraint scoring is a pure helper with direct unit tests.

### App — `MtgaImportPanel.test.tsx`, `mtgaScanBridge.test.ts`

- Deck toggle renders after Connect; pasting a deck and submitting calls `scanDeck` with
  the merged, basics-filtered entries.
- Mocked bridge `ok` (with `matched/total`) → summary shows "matched N of M" → import
  calls `importLibrary`.
- Mocked `inconclusive` → fallback message; toggle to Search a card still works.
- Garbage paste → parse error message, no bridge call.
- `scanDeck` client unit: posts `{deck}` to `/api/scan`, maps the response.

## Out of scope / future

- Reading the deck directly from Arena memory (the `Deck.GetDeckLists` event is dead on
  Mac, same as the collection log) — paste stays the input.
- Using deck *colors/format* as additional priors.
- Auto-suggesting which of the user's decks to paste.
