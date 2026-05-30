# mtg-graph

MTG card interaction graph. A build-time Node pipeline ingests Standard sets from Scryfall, runs regex extractors, and emits a JSON artifact. A React/Vite SPA loads that artifact into an in-memory `graphology` graph and serves browsing, interaction lookup, and deck building. No backend.

**Current release:** `v0.14.4` (tag `v0.14.4` at HEAD). 221 tag definitions, ~99.0% taggable coverage on 4,446 Standard cards, ~1.63M interaction edges. v0.14.4 ships Round 4 audit fixes — 16 regex broadenings across trigger / effect / condition rules (commits `49b598d`..`0a3789d`, plus revert `aabe780`), resolving 19 of 22 cards flagged in the 2026-05-27 Round 4 batch.

**Design history (in this repo):**
- `docs/superpowers/specs/2026-05-21-mechanics-expansion-discovery-design.md` — v0.7 design (mechanics expansion + discovery workflow).
- `docs/superpowers/plans/2026-05-21-mechanics-expansion-v0.7.md` — v0.7 implementation plan.
- `docs/superpowers/specs/2026-05-22-typed-permanent-tags-design.md` — v0.8 design (typed permanent tag axis: destroy / exile / bounce / sacrifice / LTB split by permanent type).
- `pipeline/reports/v0.7-coverage-gap.md` — what's left for v0.8 LLM verification.
- `pipeline/reports/family-{1..11}-implementer.md` — per-mechanic-family work logs from v0.7.

**Older v0.1 design (historical only):** `/Users/Dada/mtg-tooltip-extension/docs/superpowers/specs/2026-05-21-mtg-graph-db-design.md`. The code is authoritative.

## Layout

```
pipeline/        Node + TS. Fetch → normalize → tag → graph → emit. Run at build time.
  rules/         One file per rule. Each file exports BOTH `rule` (or `rules`) AND
                 `tagDef` (or `tagDefs`). Glob-discovered by `aggregator.ts` — no
                 manual registration needed.
  catalog.ts     Re-exports the aggregated `tagCatalog` via a Proxy. Holds RULE_VERSION.
  coverage.ts    isTaggable(card) — denominator for the coverage metric.
  scripts/       CLIs: rule-coverage.ts (per-rule audit), rule-mine.ts (untagged n-grams).
  reports/       Outputs: STOPWORDS.txt, baseline-mine snapshot, v0.7-coverage-gap.md,
                 family-N-implementer.md (gitignored: rule-coverage.json, rule-mine.json).
  fixtures/      Hand-crafted ~5-card fixture used by unit + e2e pipeline tests.
shared/          Types shared by pipeline and app (Card, CardTag, TagDef, InteractionEdge, Artifact).
app/             Vite + React + TS SPA. Reads the artifact from /data/cards-<SET>.json at startup.
  src/stores/    Zustand stores. graphStore = read-only after hydration. deckStore = persisted via Dexie.
  src/lib/       Pure logic (filter, traversal, legality, deckExport, Dexie schema).
  src/components/ UI components. CardDetailDrawer is the right-side flyout. DeckPanel is the rail.
  src/pages/     BrowserPage, DecksPage, DeckPage (three routes, no nesting).
  tests/e2e/     Playwright smoke test.
```

## Commands

From repo root:
- `npm test` — full gate: pipeline + shared types, app vitest, then `app/npm run build` (tsc + vite). The build step is what catches TS errors the vitest run misses, since vitest doesn't type-check.
- `npm run test:pipeline` — pipeline + shared types only (fast inner loop; same as the old `npm test`).
- `npm run build:cards -- --set <CODE>` — single set → `app/public/data/cards-<CODE>.json`
- `npm run build:cards -- --sets a,b,c` — multiple sets, merged + deduped by `oracleId`
- `npm run build:cards -- --standard` — all 17 Standard sets (see `shared/sets.ts`) → `cards-standard.json`. This is what the app loads by default. Reads from `.cache/scryfall/<set>.json` if present; otherwise hits Scryfall and writes the cache.
- `npm run refresh:cards -- --standard` — same as `build:cards` but bypasses the cache to force a re-download.
- `npm run rule:coverage -- <tagId>` — per-rule audit: match count, 10 random positives, 20 near-miss unmatched cards (uses each rule's `nearMiss` lexicon).
- `npm run rule:coverage -- --all` — one-line summary per rule + aggregate "taggable %" at the bottom.
- `npm run rule:coverage -- --pairings` — validate that every `pairsWith` reference resolves to a real tag id.
- `npm run rule:mine` — top n-grams in untagged taggable cards. Reads `pipeline/reports/STOPWORDS.txt`, writes `pipeline/reports/rule-mine.json` (gitignored). Use `--min N` to override the default freq=30 floor.

From `app/`:
- `npm test` — app unit + component tests
- `npm run dev` — Vite dev server on :5173
- `npm run e2e` — Playwright smoke
- `npm run build` — production bundle

## Conventions

- **`oracleId` is the primary key everywhere.** Stable across reprints. Edges, deck card entries, traversal — all keyed on it. When a card is in multiple Standard sets (e.g. FDN reprints from BLB), the merge step keeps the first-seen printing's `set`/`imageUrl`/`collectorNumber` and records all set codes in `printings: string[]`. Set filtering matches against `printings`.
- **Rules target normalized text.** Oracle text is lowercased, reminder text stripped, `~` and the card's own name replaced with `__SELF__` before any rule runs. Don't write regex against raw card text.
- **Adding a new tag** (since v0.7): create *one* file `pipeline/rules/<axis>.<id>.ts` that exports BOTH `tagDef: TagDef` AND `rule: Rule`. Also create `.test.ts` next to it (TDD: at least 3 positives + 3 negatives via `it.each`). Auto-discovery in `pipeline/rules/aggregator.ts` picks up the file — no manual edits to `pipeline/rules/index.ts` or `pipeline/catalog.ts`. The catalog consistency test (`pipeline/catalog.test.ts`) enforces that every rule has a matching tagDef and vice versa.
- **Adding a new interaction relationship**: edit the `tagDef.pairsWith` array IN THE RULE FILE (not in `catalog.ts`). The graph builder is bidirectional — declaring a pairing on either side (effect's `pairsWith` listing the trigger/condition, OR the trigger/condition's `pairsWith` listing the effect) produces the same single edge. Reference cycles are deduplicated. `npm run rule:coverage -- --pairings` validates references.
- **Required for v0.7+ rules:** every new rule must declare a `nearMiss: { anchors, proximity, window }` so `rule:coverage` can surface "this rule almost matched these cards" for reviewer audit. Existing legacy v0.6 rules without `nearMiss` are allowed; the coverage CLI just skips the section for them. Omit only if degenerate (e.g. single-keyword rules where anchor=proximity).
- **Parametric rules** (one file generating many tags from a list): see `pipeline/rules/condition.cares_subtype.ts`, `effect.tutors_subtype.ts`, `condition.cares_tribe.ts`. Export `rules: Rule[]` and `tagDefs: TagDef[]` (plural) instead of singular. The list driving them lives in `pipeline/themes.ts` (`THEME_SUBTYPES`, `THEME_TRIBES`).
- **Mana cost rendering:** use the `<ManaCost>` component. Don't render `manaCost` strings as plain text — they contain `{X}` symbols.
- **TypeScript `noUncheckedIndexedAccess: true`** is on across the repo. Array/Map index access returns `T | undefined`. Common cause of test-only TS errors that vitest happily runs through; address with explicit checks or non-null assertions where the invariant is obvious.

## Gotchas

- **The artifact is gitignored.** A fresh checkout won't have `cards-standard.json`. Run `npm run build:cards -- --standard` before `npm run dev`. The app shows a "Failed to load card data" error otherwise. The single-set form (`--set tdm`) still works if you want a smaller artifact for local debugging; override `VITE_SET_CODE=tdm` to load it.
- **The aggregator must warm before use.** Top-level test runs warm it via `pipeline/test-setup.ts` (`setupFiles` in `vitest.config.ts`). CLIs warm it at startup. Don't import `allRules` / `tagCatalog` from a sync context that runs before the warm-up — call `await ensureWarmed()` first.
- **Multi-face cards (DFCs, MDFCs, adventures):** Scryfall puts oracle text on `card_faces[]` rather than the top level. `stripScryfallCard` concatenates the faces with `\n\n`. True per-face splitting (separate records sharing `oracleId`) is still deferred (v0.8+).
- **`fake-indexeddb`** is loaded in `app/tests/setup.ts` for jsdom Dexie testing. Don't remove the import or deckStore tests will silently no-op.
- **`globals: true`** in `app/vite.config.ts`'s `test` block is required so React Testing Library's auto-cleanup runs between tests. Removing it makes component tests interfere with each other.
- **Don't run `prettier --write .` casually.** Editors sometimes auto-format unrelated files; verify `git status` before committing and `git checkout` any file you didn't intend to change.
- **`pipeline/index.ts` has top-level await via `main()`.** It is a CLI, not a module. Don't import from it.
- **Pipeline tests cover rule regexes against fixture text, not real card text.** When a real card surfaces a rule miss, fix the rule in `<id>.ts` + add a regression case to `<id>.test.ts` referencing the actual card's normalized oracle text.
- **Modern oracle templating uses "When this creature enters"** (post-2023), not just "~"/cardname. The v0.7 `trigger.self_etb` matches both forms. Watch this when adding triggers/conditions that scope to "self".

## Architecture invariants

- **Pipeline is the source of truth for graph structure.** The app is a read-only viewer over the artifact, plus user-scoped deck state. Rebuilds are cheap and reproducible.
- **Graph builder is bidirectional** (since v0.7 / Batch B). A pairing declared on either side of an (effect, trigger/condition) pair produces the same single edge; dedupe is by (source, target, effectTag, consumerTag) key.
- **`ruleVersion`** in the artifact lets the client invalidate IndexedDB caches when the rule set changes. Bump it in `pipeline/catalog.ts` when rules change in ways that should force a re-hydration. Currently `v0.8.0`.
- **No backend in v0.1–v0.7.** When user accounts / shared decks come in (v0.5+), a thin Postgres-backed API drops in behind a single data-access module. Don't anticipate that today.

## Stage 2+ deferred

- **LLM verification pass (Nova Lite or Claude Haiku)** — v0.8. Reads each card and either (a) suggests a regex broadening for an existing rule, or (b) suggests a new mechanic family. Targets the 463 untagged taggable cards from v0.7 (10.5% gap). Specific prioritized categories listed in `pipeline/reports/v0.7-coverage-gap.md`.
- **Multi-card synergy ranking** ("given this deck, what cards interact best?") — v0.3 in original plan, still open.
- **Expansion beyond Standard** (Modern, Pioneer, all-of-MTG) — v0.4. If `graphology` stops being snappy past ~5k cards, swap the storage layer to `sql.js` (the data-access interface should stay the same).

## Style and TDD

- TDD for pipeline rules and pure logic (filter, traversal, legality, deckExport, stores). Test → red → impl → green → commit.
- Component tests with React Testing Library for the few headline components (FilterPanel, InteractionsPanel, DeckPanel). Don't snapshot whole DOMs — assert on visible text and roles.
- Don't add error handling for impossible scenarios. The pipeline trusts Scryfall's shape; the app trusts the pipeline's artifact.
- Don't add comments that just describe the next line. Add comments only when there's a non-obvious *why*.
