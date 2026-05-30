# Senior-eng cleanup progress

## US-001 — Replace catalog/allRules Proxy exports with explicit getters (done 2026-05-23)

**What changed**
- `pipeline/catalog.ts`: removed the `tagCatalog` Proxy, added `getTagCatalog(): TagDef[]` that delegates to `aggregateTagDefsSync()`. `RULE_VERSION` is unchanged.
- `pipeline/rules/index.ts`: removed the `allRules` Proxy, added `getAllRules(): Rule[]` that delegates to `aggregateRulesSync()`. The async re-exports (`allRulesAsync`, `ensureWarmed`) are unchanged.
- `pipeline/index.ts`: `tagCards` and the artifact builder now call the new getters once and reuse the local references.
- `pipeline/e2e.test.ts` and `pipeline/catalog.test.ts`: updated to call the new getters.

**Files NOT touched (no references existed)**
- `pipeline/graph.ts` — takes the catalog as a function parameter, no module import of `tagCatalog`.
- `pipeline/coverage.ts` — never imported catalog or rules.
- `pipeline/scripts/*` — already used `aggregateRulesSync` / `aggregateTagDefsSync` from `../rules/aggregator` directly.

**Verification**
- `npm run test:pipeline` — 134 files, 1315 tests pass.
- `npm run build:cards -- --set tdm` — emits the artifact, 277 cards / 271 tagged / 4275 edges.
- `npm --prefix app run build` — tsc -b + vite build succeed.

**Note for the next person**
- The sync getters still throw "aggregator not warmed" if you call them before `ensureWarmed()` resolves. The whole point of swapping out the Proxy was to make that requirement visible at the call site — please don't reintroduce a top-level array that hides it.
- If you find an external (non-pipeline) caller still importing `tagCatalog` / `allRules` as values, that's a regression; the only `tagCatalog` reference that should remain is the **field name** on the JSON artifact (`Artifact.tagCatalog`), which is unrelated.

## US-002 — Pre-compute tribe-type map in buildEdges (done 2026-05-23)

**What changed**
- `pipeline/graph.ts`: tribe-edge gate was scanning `source.tags` per (source, target) pair to look up the source's `effect.create_creature_token` metadata. Replaced with `tribesByOracleId: Map<oracleId, Set<creatureType>>` populated in the same single pass that already indexes `cardsByTag`. Inner-loop check is now an O(1) `Set.has`.
- Dropped `cardsByOracleId` (the only consumer was the tribe gate).
- Extracted the `'condition.cares_tribe.'` literal to a `TRIBE_PREFIX` const so the prefix and the `slice(prefix.length)` can't drift.

**Behavior preservation**
- Pre-pass aggregates creature types via `Set` union, not `.find()`. Today's `effect.create_creature_token` rule only ever emits one such tag per card, so the union is equivalent — but if a future rule change ever emits two, the new code keeps both tribes instead of silently dropping the second. Edge-dedupe key is unchanged.
- Standard build edge count is byte-identical: **748,281 before, 748,281 after.**

**Verification**
- `npm run test:pipeline` — 134 files, 1315 tests pass (includes the existing `tribe edge only forms when token creature type matches` test in pipeline/graph.test.ts).
- `npm run build:cards -- --standard` — 4274/4446 cards tagged, 748,281 edges (matches baseline exactly).
- `npm --prefix app run build` — tsc -b + vite build succeed.

**Note for the next person**
- The tribe-types pre-pass piggybacks on the existing `cardsByTag` loop — please don't split it into a second pass over `cards` "for clarity"; that's the whole point of the change.
- If you add a new effect tag that should also gate edges by some per-card metadata, the same pattern works: build a `Map<oracleId, ...>` in the existing tag loop and consult it in the pairing loop. Don't reach back into `card.tags` from inside the (source × target) join.

## US-003 — Simplify stripReminderText to a single-pass replace (done 2026-05-23)

**What changed**
- `pipeline/normalize.ts`: `stripReminderText` previously ran `text.replace(/\([^)]*\)/g, '')` twice — once inside the empty-check ternary, once inside the non-empty branch. Refactored to strip once into a local `stripped`, then branch on that single value. The two branches still use their original post-processing (`\s{2,}` collapse for the empty check, `[ \t]+\.` collapse for the final return), so behavior is unchanged.

**Behavior preservation**
- Existing `pipeline/normalize.test.ts` (8 tests across `stripReminderText`, `replaceSelfReferences`, `normalizeOracleText`) passes unmodified. Notable cases that stay green: parenthetical-only text → `''`; `'Trample (...) Flying (...)'` → `'Trample  Flying'` (double space preserved — the change does not collapse internal whitespace in the non-empty branch).

**Verification**
- `npm run test:pipeline` — 134 files, 1315 tests pass.
- `npm --prefix app run build` — tsc -b + vite build succeed.

**Note for the next person**
- The two regex passes in the original were intentional but easy to drift; the refactor makes the single strip explicit. If you ever need different normalization for the empty-check vs the final return (e.g. handling other whitespace classes), keep deriving both from `stripped` instead of re-running the paren regex.
- The non-empty branch deliberately does **not** collapse internal whitespace — see the `'Trample  Flying'` test expectation. Some downstream rules anchor on word boundaries that tolerate double spaces; don't "fix" the double space without auditing rule fixtures.

## US-004 — Validate expandChildren child references against the catalog (done 2026-05-23)

**What changed**
- `pipeline/tag-expansion.ts`: when a parent tag's `children[]` references an id that is not in the catalog, `expandChildren` now throws `Error: expandChildren: parent <parentId> declares child <childId> which is not in the catalog` instead of silently pushing a ghost `CardTag` whose `axis` fell back to the parent's axis.
- The `childDef.axis ?? tag.axis` fallback is gone — once the missing-catalog branch throws, `childDef` is always present and we read its real axis directly.
- `pipeline/tag-expansion.test.ts`: replaced the legacy "ignores parent tags that reference unknown child ids gracefully" case (which asserted the old silent-emit behavior) with "throws when a parent declares a child id missing from the catalog" (asserts the new throw and matches the parent+child ids in the message via regex). Test count stays at 5.

**Why throw instead of log-and-skip**
- `pipeline/catalog.test.ts` already enforces "every child id referenced in a parent.children list exists in the catalog" at test time, so the throw is a defensive runtime guard. If it ever fires in production, the catalog is genuinely inconsistent and we want the build to die loudly rather than emit a card-tag stream where some entries have the wrong axis.

**Verification**
- `npm run test:pipeline` — 134 files, 1315 tests pass.
- `npm run build:cards -- --set tdm` — 277 cards / 271 tagged / 4275 edges (byte-identical to the US-001 baseline; no live parent-child pair in the current catalog references a missing id, so the throw branch is only hit by the new unit test).
- `npm --prefix app run build` — tsc -b + vite build succeed.

**Note for the next person**
- If you add a new parent tag with `children: [...]` and forget to ship the child rule, **two** things will scream at you: the catalog consistency test fails at `npm run test:pipeline`, and any card-pipeline run that hits the parent throws from `expandChildren`. Both are intentional — don't soften either one into a warning.
- The `axis` field on a child tag now strictly comes from the child's own `TagDef`. If you're tempted to special-case a child that should inherit the parent's axis, fix the catalog (give the child the correct axis) rather than reintroducing the `?? tag.axis` fallback.

## US-005 — Move hasCachedSet declaration below the import block in pipeline/index.ts (done 2026-05-23)

**What changed**
- `pipeline/index.ts`: `hasCachedSet` was previously declared at lines 10-12, sandwiched between two groups of imports (`node:fs` / `node:path` above it, then `./normalize` / `./rules` / `./catalog` / etc. below it). Moved the function so all 12 imports are contiguous at the top of the file; `hasCachedSet` now sits as a single declaration block immediately after the last import.

**Behavior preservation**
- Pure source-order cleanup — no behavior change. The function body, the call site in `main()`, and `DEFAULT_CACHE_DIR`/`existsSync`/`join` resolution are untouched.

**Verification**
- `npm run test:pipeline` — 134 files, 1315/1315 tests pass.
- `npm --prefix app run build` — tsc -b + vite build succeed.

**Note for the next person**
- The remaining items in the PRD (US-006 onward) move into typing, app caching, and UI deduplication — the easy "shape" cleanups (US-001 through US-005) are now done. US-006 (TagMetadataMap) is the natural next step since it removes the `as { creatureTypes?: string[] }` cast that US-002 left in place when it switched the tribe gate to a pre-computed map.

## US-006 — Type tag metadata via a per-tag TagMetadataMap (done 2026-05-23)

**What changed**
- `shared/types.ts`:
  - Added `TagMetadataMap` interface — the per-tag-id registry of structured metadata shapes. Initial entry: `'effect.create_creature_token': { creatureTypes: string[] }`.
  - Made `CardTag` generic over `TagId extends string = string`. The `metadata` field is typed as `TagMetadataMap[TagId]` when `TagId` is a key of the map, otherwise `Record<string, unknown>`.
  - Added `hasTagId<T extends keyof TagMetadataMap>(tag, tagId): tag is CardTag<T>` — a type predicate consumers use to narrow a `CardTag` to the specific typed variant.
- `pipeline/graph.ts`:
  - Inner-loop tribe-types aggregation now uses `if (hasTagId(t, 'effect.create_creature_token'))` and reads `t.metadata?.creatureTypes` (typed `string[] | undefined`) directly. The `(t.metadata as { creatureTypes?: string[] } | undefined)` cast is gone.

**Why generic + predicate, not discriminated union**
- Tried a discriminated union (`CardTagKnown | CardTagDefault`) first: TypeScript can't narrow away the open `tagId: string` branch when you check a literal, so `tag.metadata` still resolves to `{ creatureTypes: string[] } | Record<string, unknown>` and you're back to a cast.
- Generic with a `hasTagId` predicate sidesteps that: the predicate explicitly returns `tag is CardTag<T>` and the conditional metadata type then resolves to the concrete `TagMetadataMap[T]` for the narrowed scope.

**Backward compat — what didn't change**
- Every consumer that imports `CardTag` without a generic argument (`CardTag[]`, `tags: CardTag[]`, `function f(tag: CardTag)`) defaults to `CardTag<string>`, whose `metadata` is the open `Record<string, unknown>` — identical to the pre-change shape.
- `pipeline/rules/runner.ts` still pushes `{ tagId: rule.id, ..., metadata: result.metadata }` where `rule.id` is `string` and `result.metadata` is `Record<string, unknown>`. No code change needed.
- `pipeline/rules/effect.create_creature_token.ts` returns a `TagMatch` (rule-side type, separate from `CardTag`), which keeps its `metadata?: Record<string, unknown>`. No code change needed.
- `pipeline/tag-expansion.ts` builds `CardTag<string>` for child tags. No code change needed.
- `shared/types.test.ts`'s `expectTypeOf(c.tags).toEqualTypeOf<CardTag[]>()` still passes because `CardTag[]` resolves to `CardTag<string>[]` (the default).

**Verification**
- `npm run test:pipeline` — 134 files, 1315/1315 tests pass.
- `npm --prefix app run build` — tsc -b + vite build succeed (no app-side type breakage).
- `npm run build:cards -- --set tdm` — 277 cards / 271 tagged / 4275 edges (byte-identical to the US-001/US-004 baselines).

**Note for the next person**
- To add typed metadata for a new tag, add an entry to `TagMetadataMap` in `shared/types.ts` and use `hasTagId(tag, '<new.id>')` at the consumer call site. Don't reintroduce `tag.metadata as { ... }` casts — they defeat the whole point of the map.
- The rule-side type (`TagMatch.metadata: Record<string, unknown>`) is intentionally unchanged. Rules emit metadata loosely; only consumers narrow on tagId. If you want stricter rule-side typing too, that's a follow-up — it would require touching every rule that emits metadata.
- `effect.has_first_strike` still emits `{ doubleStrike: true }` metadata and is **not** in `TagMetadataMap`. The graph builder doesn't consume that metadata, so there's no consumer cast to remove. If a future consumer reads `doubleStrike`, add the entry then.

## US-008 — Log hydration errors in graphStore (done 2026-05-23)

**What changed**
- `app/src/stores/graphStore.ts`: `hydrate` previously swallowed both failure paths silently — the non-OK response branch just flipped status to `'error'`, and the outer `try { } catch { }` was bare. Both now log first.
  - Non-OK response: `console.error('[graphStore] hydrate failed: response not ok', resp.status, resp.statusText)`.
  - Outer catch: bound the error (`catch (err)`) and `console.error('[graphStore] hydrate failed:', err)`.
- `app/src/stores/graphStore.test.ts`: the existing `'sets status to error on fetch failure'` test now (a) sets `statusText: 'Internal Server Error'` on the mocked 500, (b) spies on `console.error` with a `mockImplementation` to keep the assertion output clean, and (c) asserts the spy was called with the exact 3-arg log shape. That locks in the non-OK log under regression and keeps the test runner output noise-free.

**Scope choices**
- US-007 (artifact cache wiring) sits right behind this in priority and **will** add code paths that can throw (Dexie read, schema mismatch). Landing the logging first means when US-007 lands you'll see the actual error, not a silent `status: 'error'`.
- The catch branch is not explicitly tested — provoking it would require breaking JSON parsing or the post-fetch mapping in a way that's far enough from the public API that the test mostly exercises mock plumbing. The non-OK assertion is enough to lock the log-then-set-error ordering; the catch branch is a one-liner that mirrors it. If you wanted to test it, mock `fetch` to return `{ ok: true, json: async () => { throw new Error('boom'); } }` and assert the spy got `'[graphStore] hydrate failed:'` + an Error — that's the smallest reasonable case if a future bug demands coverage.
- Did **not** touch the silent `db.artifactCache.put(...).catch(() => undefined)` — that's intentional fire-and-forget cache writes; surfacing those would be a different (and probably wrong) design choice.

**Verification**
- `npm --prefix app test` — 22 files, 129/129 tests pass.
- `npm --prefix app run build` — tsc -b + vite build succeed.

**Note for the next person**
- US-007 is up next. The hydrate function now has clean failure logs; when you add the IndexedDB read path, route any Dexie errors through the same `catch (err) { console.error('[graphStore] hydrate failed:', err); ... }` shape so the diagnostics stay consistent. Don't introduce a separate `[graphStore] cache miss:` log for the *expected* cache-miss case — that's not an error, that's the happy path on first load or after a `ruleVersion` bump.
- If you ever need to silence the fetch-failure log in a test (e.g. parameterized tests that intentionally probe error paths), use the same `vi.spyOn(console, 'error').mockImplementation(() => {})` pattern shown in `graphStore.test.ts` — don't stub `console.error` globally in `setup.ts`; that would hide real errors elsewhere.

## US-007 — Wire artifactCache reads into graphStore.hydrate (done 2026-05-23)

**What changed**
- `shared/version.ts` (new): hoisted `RULE_VERSION = 'v0.9.7'` out of `pipeline/catalog.ts` so the app can compare a cached artifact's `ruleVersion` against the build-time constant without importing from `pipeline/*`.
- `pipeline/catalog.ts`: re-exports `RULE_VERSION` from `../shared/version` — every existing pipeline import path (`import { RULE_VERSION } from './catalog'`) keeps working with no source change.
- `app/src/stores/graphStore.ts`:
  - `hydrate(url)` now reads `db.artifactCache.toArray()` first. If a row exists with `ruleVersion === RULE_VERSION` AND `sourceSet === <set parsed from URL>`, the artifact is applied from cache and `fetch` is skipped entirely.
  - Stale rows (any `ruleVersion !== RULE_VERSION`) are deleted in a single `bulkDelete` before the hit lookup, so cache size stays bounded across rule-version bumps.
  - On cache miss, falls through to the existing `fetch` path and writes the response to the cache (still `.catch(() => undefined)` so a DB-write failure can't break hydration).
  - Extracted the cards/edges/edgesInbound/tagCatalog Map construction into a local `applyArtifact(artifact, set)` helper used by both the cache-hit and fetch paths.
  - URL→set is parsed via `cards-([^/]+)\.json(?:\?|$)` — the `/data/cards-<set>.json` URL shape is the only contract this app ships, so a regex extraction is fine and avoids changing `hydrate`'s public signature.
- `app/src/stores/graphStore.test.ts`: added 4 new tests via the existing fake-indexeddb setup —
  1. cache-hit path: pre-populates the DB with a matching `ruleVersion`+`sourceSet` row, asserts `fetch` is never called and `cards.size === 1`.
  2. cache-miss write-back: empty DB, asserts the fetch happens and a row is written with the artifact's `ruleVersion` and `sourceSet`.
  3. stale-row eviction: pre-populates a row with `ruleVersion: 'v0.0.0-old'`, asserts the fetch happens and the only remaining row is the fresh `RULE_VERSION`.
  4. sourceSet mismatch: pre-populates a row with matching `ruleVersion` but `sourceSet: 'other'`, asserts the fetch still happens (cache is per-set).
  - Existing tests refactored to share a `makeArtifact(overrides)` helper; the old `fixtureArtifact` is still exported under that name for the original fetch test.
  - `beforeEach` is now async and calls `await db.artifactCache.clear()` to keep test isolation tight — without that, fake-indexeddb persists rows across tests in the same file run.

**Why parse the set from the URL instead of changing `hydrate`'s signature**
- `hydrate(url)` is called from exactly one place today (`main.tsx`), but US-009 will move that call into a `useEffect` and adding a second positional arg would mean touching that move too. Parsing from the URL is a tiny, self-contained extraction.
- The URL shape is fixed by Vite + the build script (`/data/cards-<set>.json`). If a future change loads artifacts from a non-set-coded URL, `setCodeFromUrl` returns `null` and the cache lookup never matches — i.e., the system degrades to "fetch every time," not "wrong-set cache hit." Safe failure mode.

**Why `await` the cache `.put` even though it's still fire-and-forget**
- `await db.artifactCache.put({...}).catch(() => undefined)` resolves to `undefined` on failure (so no error surfaces) but ensures the write completes before `applyArtifact` flips status to `'ready'`. That makes the "cache-miss write-back" test deterministic — without the await it races against the test's `db.artifactCache.toArray()` call. Production cost is ~ms; user impact is undetectable.

**What was deliberately NOT changed**
- The cache `.put().catch(() => undefined)` still swallows DB-write errors silently. US-008's logging applies to the hydrate failure paths; cache-write failure is a soft degradation (we still have the in-memory state), not a hydrate failure. If you want to log it, add it as a separate `.catch(err => console.warn('[graphStore] cache write failed:', err))` — don't promote it to an `error` log that would page-flag the user.
- `db.ts` schema is unchanged (`artifactCache` was already provisioned with `&ruleVersion` as the primary key in v1). No Dexie version bump needed.
- Browser-side smoke test (`/verify in browser using dev-browser skill`) was NOT performed — that skill isn't loaded in this session. The unit tests cover both the cache-hit (fetch skipped) and cache-miss (fetch + write) paths under fake-indexeddb; a manual reload-in-Chrome verification is still worth doing before tagging the release.

**Verification**
- `npm --prefix app test` — 22 files, 133/133 tests pass (was 129; 4 new cache tests).
- `npm test` — pipeline 134 files / 1315 tests + app 22 files / 133 tests + vite build all pass.
- `npm run build:cards -- --set tdm` — 277 cards / 271 tagged / 4275 edges, artifact `ruleVersion: v0.9.7` / `sourceSet: tdm` (matches the v0.9.7 constant exactly — the re-export is live).

**Note for the next person**
- US-009 (move hydration into a `useEffect`) is the natural next item. The cache logic now lives entirely inside `hydrate()` — moving the call site doesn't change the cache contract. Don't push the cache lookup *out* into the React layer "for visibility"; the whole point is that callers see a single async function and the cache is an implementation detail.
- If you bump `RULE_VERSION` in `shared/version.ts`, the next app load on any user's browser will delete every stale row in `artifactCache` on hydration. That's intentional. If you ever need to coexist with a stale cache (e.g. a backwards-compatible rule-version bump where the old artifact is still usable), introduce a separate compatibility predicate instead of weakening the strict-equality check — the check is the cache invalidation contract.
- The URL parser deliberately accepts a trailing query string (`cards-tdm.json?v=2`) but not a fragment or any other suffix. If you ever start cache-busting via querystring, the regex still works. If you start cache-busting via a hash, you'll need to adjust it.
- `RULE_VERSION` lives in `shared/version.ts` now, not `pipeline/catalog.ts`. `pipeline/catalog.ts` re-exports it for back-compat — please don't add a *second* literal in either file; pick one source of truth (it's `shared/version.ts`) and re-export from the other.

## US-009 — Move data hydration from main.tsx into a React effect (done 2026-05-23)

**What changed**
- `app/src/main.tsx`: removed the top-level `useGraphStore.getState().hydrate(ARTIFACT_URL)` + `useDeckStore.getState().load()` calls, the `ARTIFACT_URL` IIFE, and the two store imports. The file is now a pure `ReactDOM.createRoot(...).render(...)` mount plus the global CSS imports — nothing else runs at module load.
- `app/src/App.tsx`: added `import { useEffect } from 'react'` + the two store imports, hoisted `ARTIFACT_URL` to a module-level `const` (same IIFE shape as before), and added a single `useEffect(() => { useGraphStore.getState().hydrate(ARTIFACT_URL); useDeckStore.getState().load(); }, [])` at the top of the `App` component body.

**Design choices**
- **Module-level `ARTIFACT_URL`, not inside the effect**: `VITE_SET_CODE` is resolved at build time via `import.meta.env`. There's no reactive dependency to track, so evaluating once at module load (matching the old `main.tsx` shape) is correct and keeps the effect body small. Moving it into the effect would also work but adds a closure for no benefit.
- **`useGraphStore.getState()` inside the effect, not the hook**: using `useGraphStore(s => s.hydrate)` would re-fire the effect if the store ever re-created the `hydrate` reference. Zustand doesn't today, but using `getState()` makes the empty deps array correct by construction.
- **Empty deps `[]` + idempotent calls under StrictMode**: React 18 StrictMode double-invokes effects in dev. Both calls are idempotent — `hydrate` flips status to `'loading'` and the IndexedDB cache lookup (landed in US-007) makes the second invocation hit the cache instead of re-fetching; `deckStore.load()` is a plain Dexie read + state write. No guard needed.

**Why not a `<DataLoader>` wrapper component**
- The PRD listed it as an option, but it would add a layer with no behavioral benefit today. An inline `useEffect` in `App` is the minimum change that meets every acceptance criterion. If a later story needs Suspense / retry / error-boundary scaffolding around the loaders, lifting the effect into a wrapper component then is a 5-line refactor.

**Verification**
- `npm --prefix app test` — 22 files / 133/133 tests pass (cache + graphStore tests unaffected since `hydrate` is unchanged).
- `npm --prefix app run build` — tsc -b + vite build succeed.
- `npm run test:pipeline` — 134 files / 1315/1315 tests pass.
- Browser smoke test (dev-browser skill) NOT performed — that skill isn't loaded in this session. Same caveat as US-007: worth a manual reload-in-Chrome before tagging a release, but the unit tests cover the underlying store behavior and the only behavioral change is *when* `hydrate` runs (after first render instead of before), which doesn't affect any test.

**Note for the next person**
- US-010 (extract `useActiveDeck` hook) is up next. The deck store now has exactly one bootstrap call site (the new effect in `App.tsx`); please don't reintroduce a second `load()` call in `useActiveDeck` or any other hook — `load()` is a one-shot on mount, not a per-component re-read. If you ever need to re-load decks after an external mutation, add an explicit `reload()` method to the store rather than calling `load()` from a hook.
- If you ever need to gate the effect behind a feature flag or run loaders sequentially, the place to do it is inside the same `useEffect` in `App.tsx`. Don't reach for top-level module side effects again — that's the bootstrap-coupling the move was designed to eliminate.
- `main.tsx` is now intentionally tiny (just CSS imports + ReactDOM mount). New top-level imports added there will execute before React renders — be deliberate about what belongs there vs. in the React tree.

## US-010 — Extract useActiveDeck hook (done 2026-05-23)

**What changed**
- `app/src/stores/deckStore.ts`: added `useActiveDeck(): Deck | null` after the `useDeckStore` create call. The hook wraps the `s.activeDeckId ? s.decks.find((d) => d.id === s.activeDeckId) ?? null : null` selector that was duplicated across 5 components.
- Replaced inline selectors in:
  - `app/src/components/DeckPanel.tsx`
  - `app/src/components/DeckPanelCollapsed.tsx`
  - `app/src/components/InteractionsPanel.tsx`
  - `app/src/components/FilterPanel.tsx`
  - `app/src/components/AddToDeckButton.tsx` — also collapsed the derived `count` selector. The component now reads `activeDeck = useActiveDeck()` once and derives `activeDeckId = activeDeck?.id ?? null` and `count = activeDeck?.cards.find(...)?.count ?? 0` synchronously off that single subscription.
- `app/src/stores/deckStore.test.ts`: added a new `describe('useActiveDeck')` block (4 cases) covering null-when-no-active, null-when-unresolved-id, returns-matching-deck, and a memoization assertion that mutates an unrelated deck and verifies both same `Deck` reference and zero extra component re-renders.

**Why reference stability comes for free**
- Every deck-mutating action in `useDeckStore` uses `decks.map((d) => d.id === id ? { ...d, ... } : d)`. Unrelated decks return the exact same object reference. `find((d) => d.id === activeDeckId)` therefore returns the same `Deck` object on unrelated mutations, and Zustand's default `Object.is` selector comparison short-circuits the re-render. No `useMemo`, `useShallow`, or custom equality function needed.
- The memoization test pins this contract: if a future change to `addCard`/`removeCard`/`renameCard` ever spread-copied the entire `decks` array regardless of which deck changed (e.g. `decks.map((d) => ({ ...d }))` instead of the conditional spread), the test would catch it because the active deck's reference would change on every mutation.

**AddToDeckButton subscription change — what it costs**
- Old: `activeDeckId` subscribed to `s.activeDeckId` only; `count` subscribed via a derived selector that re-ran on any state change but only re-rendered if the computed number flipped.
- New: a single `useActiveDeck()` subscription. Component re-renders when the active deck's reference changes — i.e., when its `cards` or `name` or `updatedAt` changes.
- Practical impact: one extra re-render per rename of the active deck (the button's output doesn't depend on name, so the render is a no-op DOM-diff). Card mutations were already causing re-renders in both old and new. Net delta: negligible; cleanup wins.

**Verification**
- `npm --prefix app test` — 22 files / 137 tests pass (was 133; +4 new `useActiveDeck` cases).
- `npm --prefix app run build` — tsc -b + vite build succeed.
- `npm run test:pipeline` — 134 files / 1315 tests pass.
- Browser smoke test (dev-browser skill) NOT performed — same caveat as US-007 and US-009. No JSX changed in any of the 5 consumers; the underlying selector logic is byte-equivalent to what each component had inline, just centralized.

**Note for the next person**
- US-011 (clean up InteractionsPanel inner closures + remove the `eslint-disable react-hooks/exhaustive-deps`) is up next. The InteractionsPanel now imports `useActiveDeck` instead of `useDeckStore`; that change is independent of the closures cleanup (which is about `reasonCategory` / `tagCounts` / `applyColorCmc`). The exhaustive-deps suppression on `interactionNeighbors`/`themeNeighbors` is still there at line ~62.
- If you find a new component that needs the active deck, please import `useActiveDeck` — don't paste the inline `s.activeDeckId ? s.decks.find(...) ?? null : null` selector back in. That selector now has exactly one definition; keep it that way.
- `useActiveDeck` returns `Deck | null` — the `null` branch covers both "no `activeDeckId` set" and "stored `activeDeckId` doesn't resolve to any deck in the current `decks` array." Consumers don't need to distinguish those two cases. If a future flow does (e.g., to render a "deck was deleted" hint), add a sibling hook rather than overloading this one's return shape.

## US-011 — Clean up InteractionsPanel inner closures (done 2026-05-23)

**What changed**
- `app/src/components/InteractionsPanel.tsx`: lifted three helpers out of the component body — `reasonCategory(tagCatalog, sourceTagId, targetTagId)`, `tagCounts(neighbors)`, and `applyColorCmc(neighbors, cards, filter)` — to top-level pure functions that take their dependencies as parameters.
- Also extracted a fourth helper, `splitByCategory(neighbors, tagCatalog)`, that wraps the per-neighbor reason-filter loop. That loop was the body of the `useMemo` that previously had the `// eslint-disable-next-line react-hooks/exhaustive-deps` suppression. Pulling it out removed the implicit `reasonCategory` closure dependency that had been making the deps array dishonest.
- Removed the eslint-disable comment.
- Imports: added `type Neighbor` from `../lib/traversal` (so the helpers can type their `Neighbor[]` inputs explicitly instead of `typeof neighbors`), and added `Card` + `TagDef` from `@shared/types`.

**Why the eslint-disable was there in the first place**
- The original `useMemo(() => { ... }, [neighbors, tagCatalog])` body called `reasonCategory(r.sourceTagId, r.targetTagId)` — an inner-scope closure that captured `tagCatalog` from the component body. The exhaustive-deps rule wants every closure referenced inside the memo body to be in the deps array; including `reasonCategory` itself would have made the memo useless (it was a fresh reference every render). The disable was the path of least resistance.
- The clean fix is the one the PRD asked for: hoist the closure so it takes its captures as parameters, then the memo body only references `tagCatalog` (already in deps) and the helper has zero per-render allocation.

**Behavior preservation**
- The three helpers are pure with the same inputs they used to read from the enclosing scope, so the output is identical. The `useMemo` deps arrays now list every value the body reads (`[neighbors, tagCatalog]` for `splitByCategory`, `[interactionNeighbors]`/`[themeNeighbors]` for `tagCounts`, `[interactionNeighbors|themeNeighbors, cards, filter]` for `applyColorCmc`).
- No JSX changed. No store subscriptions changed.

**Verification**
- `npm --prefix app test -- InteractionsPanel` — 5/5 pass.
- `npm --prefix app test` — 22 files / 137 tests pass.
- `npm --prefix app run build` — tsc -b + vite build succeed.
- `npm run test:pipeline` — 134 files / 1315 tests pass.
- `npm run lint` — no exhaustive-deps warnings against `InteractionsPanel.tsx`. **Caveat:** the project's `.eslintrc.cjs` doesn't actually load `eslint-plugin-react-hooks` — the plugin isn't in `devDependencies`. So the original eslint-disable was a no-op linewise; the real value of the refactor is making the deps honest so that *if* a future change adds the plugin, this file passes cleanly. If you want to enforce this regression-style, install `eslint-plugin-react-hooks` and add `'plugin:react-hooks/recommended'` to the eslint extends — that's the only follow-up worth doing here.
- Browser smoke test (dev-browser skill) NOT performed — same caveat as US-007/US-009/US-010. No JSX or store subscriptions changed; the runtime behavior of the panel is identical.

**Note for the next person**
- US-012 (extract a shared `HoverCardPreview` component) is up next. InteractionsPanel still has its own inline `hoverUrl` state and the anchored `<img>` near the bottom of the file (lines ~237-247 in the new layout). That's exactly the kind of inline implementation US-012 is consolidating; if you start US-012, this panel is one of the three call sites you'll touch.
- If you add another helper inside this component, prefer to lift it to the top of the file from the start — the deps story stays honest and the helper becomes unit-testable without rendering the component.
- The `react-hooks/exhaustive-deps` rule isn't currently enforced (see caveat above). Don't paste another eslint-disable for it back into the codebase as a workaround — fix the closures instead. If you genuinely need the suppression for a different reason (e.g. intentional stale closure on mount), explain the *why* in a real comment, not a disable.

## US-012 — Extract shared HoverCardPreview component (done 2026-05-23)

**What changed**
- New `app/src/components/HoverCardPreview.tsx`. Single component, discriminated `mode: 'cursor' | 'anchored'` prop. Both modes render a `pointer-events-none fixed rounded shadow-2xl` `<img>` at `z-50` with positioning + width applied via inline style (so the breakpoint and width can vary at runtime without depending on Tailwind's compile-time class list).
  - `mode='cursor'`: positions via `left = max(8, x - (width + 20))`, `top = max(8, min(innerHeight - 340, y - 100))`. Default width 240. Used by DeckPanel's per-row hover.
  - `mode='anchored'`: positions via `right: anchorRight, width` and is vertically centred. Optional `hideBelowPx` prop hides the preview below the given viewport width via a small in-component `useMinWidth(minPx)` hook that subscribes to `window.matchMedia('(min-width: Npx)')`.
- `app/src/pages/BrowserPage.tsx`: 11-line inline `<img>` replaced with one `<HoverCardPreview mode='anchored' width=440 anchorRight={focused ? 440 : 16} hideBelowPx={focused ? 1140 : undefined} />`. Drawer-open-only hide behaviour is preserved by conditionally passing `hideBelowPx`.
- `app/src/components/InteractionsPanel.tsx`: 9-line inline `<img>` replaced with `<HoverCardPreview mode='anchored' width=320 anchorRight=440 hideBelowPx=1020 />`. Always-on hide-below-1020 preserved.
- `app/src/components/DeckPanel.tsx`: 8-line inline `<img>` replaced with `<HoverCardPreview mode='cursor' url={hover.url} x={hover.x} y={hover.y} width=240 />`. The component still owns the `hover: { url, x, y } | null` state — the AC says to remove the inline JSX, not the per-component hover bookkeeping (and centralizing it would force one preview at a time across panels, which isn't what we want).
- Z-index unified to `z-50`. BrowserPage's original was `z-40` but nothing in the layout competes at `z-50` (drawer and rails are flex siblings, not absolutely positioned). If a future stacking-context bug surfaces here, expose a `zIndex` prop rather than hardcoding `z-40` back into the shared component.

**Tests**
- `app/src/components/HoverCardPreview.test.tsx` — 4 cases: anchored renders right/width inline styles; anchored returns null when matchMedia reports `< hideBelowPx`; cursor renders with clamped left; cursor left clamped to 8 when `x - (width+20) < 8`. The matchMedia stub is a tiny helper installed per test and restored in `afterEach`.

**Files NOT touched (intentional)**
- The 3 callers' local `hover` / `hoverUrl` / `hoveredCard` state and the `onMouseEnter` / `onMouseLeave` handlers stay where they are. Each panel owns when to show the preview; the component owns how to position it. Bundling the state into the shared component would also serialize hover across panels.
- Tailwind config — no new arbitrary breakpoint classes (the previous `min-[1140px]:block` / `min-[1020px]:block` classes are gone, replaced with the runtime `useMinWidth` hook). No purge/safelist edits needed.
- DeckPanelCollapsed and CardDetailDrawer — neither has a hover preview today.

**Verification**
- `npm --prefix app test` — 23 files / 141 tests pass (was 137; +4 new in `HoverCardPreview.test.tsx`).
- `npm --prefix app run build` — tsc -b + vite build succeed (96 modules transformed).
- `npm run test:pipeline` — 134 files / 1315 tests pass.
- Browser smoke test (dev-browser skill) NOT performed — same caveat as US-007/US-009/US-010/US-011. The unit tests cover positioning + breakpoint hiding; no JSX semantics changed beyond the extraction.

**Note for the next person**
- US-013 (readable label for unknown deck cards) is next on priority order. Look at `DeckPanel.tsx`'s `grouped` builder around line ~50 — the `Unknown` bucket currently shoves `entry.oracleId` into the `name` field, which is what bubbles up to the row label. A small fix is to render `Unknown card (oracleId: <first-8>)` in the Unknown branch of the deck list JSX (around the existing `grouped['Unknown']?.length ? ...` block). The optional follow-on of persisting `name` onto deck entries on add is bigger — it touches `deckStore.addCard`, the Dexie schema, and the AddToDeckButton call site. Worth deciding scope before starting.
- The `useMinWidth` hook is private to `HoverCardPreview.tsx`. If another component (e.g. a future right-rail) needs the same media-query pattern, lift it to `app/src/lib/useMinWidth.ts` rather than copy-pasting.
- The component intentionally takes a non-null `url: string`. The convention is "parent gates rendering" — every caller still does `{hover && <HoverCardPreview ... />}`. Don't add a null-handling branch inside the component; it'd be dead code given how all three callers work.

## US-013 — Readable label for unknown deck cards + persist name on entries (done 2026-05-23)

**What changed**
- `app/src/components/DeckPanel.tsx`: the `grouped` builder's Unknown branch no longer pushes `entry.oracleId` into the row's `name`. It now does `const name = entry.name ?? \`Unknown card (oracleId: ${entry.oracleId.slice(0, 8)})\`` — so a saved deck entry that knew its name shows the name, and an unknown entry shows a readable fallback instead of a 36-char UUID. The Unknown row span also picks up `title={oracleId}` so the full UUID is available on hover for the rare debugging case.
- `app/src/lib/db.ts`: `Deck.cards[i]` gained an optional `name?: string` (additive). No Dexie migration needed — the schema string is `'id, name, updatedAt'` for decks (indexed fields only), and the per-card array isn't indexed, so any new field on the inner objects is transparent to Dexie. Existing decks without `name` continue to load and render via the fallback.
- `app/src/stores/deckStore.ts`: `addCard(oracleId, qty, name?)` accepts an optional third arg. New entries persist `{ oracleId, count: qty, name }` when a name is provided, else `{ oracleId, count: qty }` (the conditional spread is intentional — never want to write `name: undefined` into IndexedDB). For existing entries, the merge uses `c.name ?? name`, so a re-add without a name doesn't blank an already-stored name. The `DeckState.addCard` signature on the store type was updated to match.
- `app/src/components/DeckPanel.tsx` (caller): the per-row `CountControls.onAdd` now passes `cards.get(e.oracleId)?.name` as the third arg. Reuses the existing lookup that the row already does for `ManaCost cost={cards.get(e.oracleId)?.manaCost}` — no extra Map.get per row.
- `app/src/components/AddToDeckButton.tsx` (caller): subscribes to `useGraphStore((s) => s.cards.get(oracleId)?.name)` once at the top of the component and passes it to both `addCard` call sites (the active-deck `handleAdd` path and the no-deck `confirmCreate` path). Single subscription, not per-handler, so Zustand's selector dedupe stays clean.

**Tests**
- `app/src/components/DeckPanel.test.tsx` — 2 new cases:
  - "renders a readable fallback for unknown cards not in the loaded artifact" — sets up a deck with an oracleId not in `useGraphStore.cards`, asserts the row text contains `Unknown card (oracleId: aaaaaaaa)` AND the bare UUID is NOT rendered.
  - "renders the persisted name when an unknown card was saved with one" — same setup but the deck entry carries `name: 'Rotated Card'`; asserts the persisted name renders instead of the fallback.
- `app/src/stores/deckStore.test.ts` — 3 new cases:
  - "persists an optional name on the deck entry when provided" — `addCard('oracle-1', 1, 'Lightning Bolt')` writes `{ oracleId, count: 1, name: 'Lightning Bolt' }`.
  - "omits the name field when adding without a name" — `addCard('oracle-1', 1)` writes `{ oracleId, count: 1 }` (no `name: undefined`).
  - "keeps a previously-persisted name when re-adding the same card without one" — first add with name, second add without; asserts `name` survives on the merged entry.

**Files NOT touched (intentional)**
- `MtgDb.version(...)` in db.ts. Schema version stays at 1 — only indexed fields appear in the `.stores(...)` declaration, and `Deck.cards[].name` isn't indexed. If a future story needs to query by card name, that's the point to bump the version and add the index.
- `pipeline/`. The change is entirely app-side persistence; the artifact format is unchanged.
- `app/src/components/DeckPanel.tsx` Unknown branch's CountControls `onAdd`. It still calls `addCard(e.oracleId, qty)` without a name — the Unknown row has no card in the artifact to look up a name from, so passing `undefined` is honest. The `c.name ?? name` merge in `addCard` means a previously-persisted name on the entry survives a re-add from the Unknown row.
- `removeCard`. The name persists across decrement-but-not-removal (the existing `.map((c) => ({ ...c, count: c.count - qty }))` already preserves `name`); when the count hits zero the entry is filtered out entirely, so there's nothing to preserve.

**Verification**
- `npm --prefix app test` — 23 files / 146 tests pass (was 141; +5 new — 2 in DeckPanel, 3 in deckStore).
- `npm test` — full gate: pipeline 134 files / 1315 tests + app 23 files / 146 tests + tsc -b + vite build all pass.
- `npm run build:cards -- --set tdm` — 277 cards / 271 tagged / 4275 edges (byte-identical to baseline; the pipeline didn't change).
- Browser smoke test (dev-browser skill) NOT performed — same caveat as US-007/US-009/US-010/US-011/US-012. The fallback JSX and the persistence write/read paths are both covered by unit tests; the failure mode being demonstrated (decks with a rotated-out card) is what the new tests exercise.

**Note for the next person**
- US-014 (replace `setTimeout(220)` with `transitionend` listener in DeckPage) and US-015 (extract shared `BrowserShell` layout) are the only two remaining items in the PRD. US-014 is the smaller of the two — `DeckPage.handleDeckCollapsedChange` currently does `window.setTimeout(measureGrid, 220)`, and the `220` magic number tracks the `duration-200` CSS transition in `DeckPanel` plus a 20ms buffer. Swap for a `transitionend` listener on the rail element. US-015 then builds on US-014 because the rail/grid re-measure dance ends up living in the new shell.
- The optional `name?: string` on `Deck.cards[]` is now part of the deck schema. If you ever add another optional per-entry field (set printing? acquired-at timestamp?), the same pattern works — add to the type, accept an optional arg in `addCard`, store conditionally (never `undefined`), and let `c.field ?? newField` carry old data through merges.
- The Unknown-row fallback hard-codes `slice(0, 8)`. That's enough to distinguish entries in a 100-card deck (UUID v4 collision in 8 hex chars at that scale is ~10^-6). If a debugger ever needs the full id, the `title={oracleId}` tooltip surfaces it without enlarging the row layout.

## US-014 — Replace setTimeout(220) with transitionend listener in DeckPage (done 2026-05-23)

**What changed**
- `app/src/pages/DeckPage.tsx`: dropped `handleDeckCollapsedChange = useCallback(() => window.setTimeout(measureGrid, 220), [measureGrid])`. Replaced with a new `deckRailRef` on the deck-rail wrapper `<div>` and a `useEffect` that attaches a `transitionend` listener to it. The listener filters on `e.propertyName === 'width'` and calls `measureGrid` once. Cleanup removes the listener on unmount / deps change.
- `app/src/pages/DeckPage.tsx`: the deck rail wrapper now carries `ref={deckRailRef}`; the `<DeckPanel>` call no longer passes `onCollapsedChange`.
- `app/src/components/DeckPanel.tsx`: removed the `onCollapsedChange?: (collapsed: boolean) => void` prop from `Props`, dropped it from the destructure, and removed the `setCollapsed` wrapper that forwarded the callback. The component now uses the `useDeckPanelCollapsed` setter directly as `setCollapsed`. The three call sites (chevron button, `jumpToType`, `DeckPanelCollapsed onExpand`) work unchanged because they just call `setCollapsed(boolean)`.

**Why listen on the rail wrapper, not pass an `onTransitionEnd` callback through DeckPanel**
- `transitionend` bubbles. The transition is on the inner `<div>` of DeckPanel (`transition-[width] duration-200 ease-out`), but the event reaches the rail wrapper one level up. Listening at the rail level keeps DeckPanel ignorant of layout-measurement concerns and lets the page own the re-measure responsibility — which is exactly where the `gridWrapperRef` and `measureGrid` already live.
- The PRD AC explicitly allowed either approach. Listening at the rail is the smaller diff and the cleaner separation: DeckPanel goes from "knows its parent wants a re-measure" to "renders its own width transition and that's it."

**Why the `propertyName === 'width'` filter matters**
- Without the filter, every `transitionend` bubbling up from inside DeckPanel would trigger a `measureGrid`. Today, only the root `transition-[width]` fires width events, but other inner elements (e.g. `CountControls` has `transition group-hover:border-neutral-700` — a shorthand `transition` that covers border-color) fire `transitionend` events on hover. With the filter, hovering a row in the deck list doesn't re-measure the grid; only the collapse/expand width transition does.
- If a future change adds a width transition on something else inside the rail, the filter still does the right thing — re-measure on every width settle. That's a defensible default. If it ever causes excess work, narrow the filter further (e.g., `e.target === e.currentTarget.firstElementChild`).

**Behavior preservation**
- Collapse/expand the deck rail → the width transition runs over ~200ms → `transitionend` fires → `measureGrid` runs → `CardGrid` reflows with the new width. Identical user-visible outcome to the old setTimeout, with no magic-number coupling to the CSS `duration-200` class.
- Edge case: if the user toggles collapse rapidly before the transition completes, the browser cancels the in-flight transition and fires a new one — the listener handles each settle independently, same as `setTimeout` did. No queuing of duplicate measures.
- Edge case: when DeckPanel renders the "no active deck" branch, the inner `<div>` still has `transition-[width]`, so a collapse toggle in that state would still bubble a width transitionend. Doesn't matter — `measureGrid` is cheap and reading a `getBoundingClientRect` on an empty grid wrapper is a no-op visually.

**Tests**
- No new tests added. `transitionend` is hard to simulate in jsdom (jsdom doesn't run CSS animations, so the event never fires natively; the only way to test would be `fireEvent.transitionEnd(el, { propertyName: 'width' })` against a rendered DeckPage, but DeckPage has no test file today and `measureGrid` writes into local state that nothing in the test would assert on without rendering CardGrid too).
- DeckPanel's 11 existing tests still pass — they never depended on `onCollapsedChange` (it was an opt-in prop with no default callback). The only thing that changed in DeckPanel is the prop surface; the collapse/expand JSX and `setCollapsed` semantics are unchanged.

**Verification**
- `npm --prefix app test` — 23 files / 146 tests pass (unchanged count).
- `npm --prefix app run build` — tsc -b + vite build succeed (96 modules transformed, 328.71 kB bundle / 106.25 kB gzip — within noise of pre-change baseline).
- `npm run test:pipeline` — 134 files / 1315 tests pass.
- Browser smoke test (dev-browser skill) NOT performed — same caveat as US-007/US-009/US-010/US-011/US-012/US-013. The new code path is mechanical (event listener → measure) and the failure mode would be visible immediately on the first collapse toggle in dev.

**Note for the next person**
- US-015 is the only remaining item. It builds directly on US-014: the new `deckRailRef` + `transitionend` listener will move into the proposed `BrowserShell` component, so when you extract the shell, take both the `ResizeObserver` block (lines ~31-38 of DeckPage) and the new `transitionend` block (lines ~43-51) with it. The shell will then have an optional `rightRail` slot — when it's present, the shell attaches the transitionend listener to whatever wrapper it renders the slot into; when it's absent (BrowserPage's no-right-rail case), the effect early-returns on `deckRailRef.current === null` and no listener is wired.
- If you ever need to gate the re-measure on something other than `width` (e.g. measuring on a height collapse), keep the property-name filter explicit — don't drop it and rely on "no other widths transition in the rail right now." That's a coincidence, not an invariant.
- The `useDeckPanelCollapsed` hook still returns `[boolean, (v: boolean) => void]` — the setter persists to localStorage on every call. The chevron button, `jumpToType`, and `DeckPanelCollapsed.onExpand` all rely on that persistence; if you ever want a transient collapse (e.g. mobile breakpoint auto-collapse without persisting), use `useState` at the call site and don't reach into this hook.

## US-015 — Extract shared BrowserShell layout (done 2026-05-23)

**What changed**
- New `app/src/components/BrowserShell.tsx` (145 lines). Owns the full FilterPanel + count-bar + CardGrid + CardDetailDrawer + (optional) right-rail + (optional) HoverCardPreview layout that BrowserPage and DeckPage previously duplicated. Reads `cards` / `tagCatalog` / `status` directly from `useGraphStore`; takes `filter` + `onFilterChange` as opaque props so the URL-tag strategy stays at the page level.
- Props:
  - `filter: Filter`, `onFilterChange: (next: Filter) => void` — required, passed through to FilterPanel.
  - `headerExtra?: ReactNode` — slot for content in the count bar (used by BrowserPage to render ActiveTagFilter).
  - `showHoverPreview?: boolean` — gates the HoverCardPreview rendering (BrowserPage only). When true, the shell wires `onHoverCard={setHoveredCard}` into CardGrid and renders an `anchored` HoverCardPreview that computes its breakpoint hide from whether the drawer is open (`hideBelowPx={focused ? 1140 : undefined}` — preserves the BrowserPage drawer-open hide).
  - `rightRail?: (ctx: { onCardClick: (id: string) => void }) => ReactNode` — render prop. Receives `cardNav.push` as `onCardClick` so the rail can navigate. Used by DeckPage as `rightRail={({ onCardClick }) => <DeckPanel onCardClick={onCardClick} />}`. When provided, the shell wraps the rail in the existing scroll-rail `<div>` and attaches a `transitionend` listener (filtered on `e.propertyName === 'width'`) — the US-014 logic moved here verbatim.
- `app/src/pages/BrowserPage.tsx` — was 143 lines, now 52. Keeps only: local `filter` state, the URL-tag round-trip (urlTags via searchParams, setUrlTags/removeUrlTag, filterForPanel that injects tags into the filter, handleFilterChange that splits tags→URL and rest→local state), and the `<BrowserShell ... headerExtra={<ActiveTagFilter ... />} showHoverPreview />` render.
- `app/src/pages/DeckPage.tsx` — was 103 lines, now 16. Keeps only: `useState<Filter>({})` and the `<BrowserShell ... rightRail={({ onCardClick }) => <DeckPanel onCardClick={onCardClick} />} />` render.
- `app/src/components/BrowserShell.test.tsx` (new, 6 tests): loading state, error state, count-rendering with seeded store, headerExtra slot, rightRail render-prop content, rightRail `onCardClick` wiring. Stubbed `ResizeObserver` at file scope (jsdom doesn't ship it) — no-op observe/disconnect is enough because measureGrid runs once synchronously inside the callback ref.

**Why callback refs, not `useRef` + `useEffect`**
- The shell early-returns on `status === 'loading'` / `'error'`, so the grid wrapper and deck rail mount *late* (only on the render after status flips to `'ready'`). A `useEffect` with `[measureGrid]` deps wouldn't re-fire on that late mount because `measureGrid` is stable. Callback refs fire on every attach/detach, which is the contract we need.
- The grid wrapper's callback ref disconnects the previous ResizeObserver, attaches a new one, and runs measureGrid once on attach. The deck rail's callback ref adds/removes a single `transitionend` listener and stores a cleanup closure in a ref so the next attach (or detach) can call it. Both are idempotent on rapid re-renders.

**Why a render-prop rightRail, not a `ReactNode`**
- The rail needs `cardNav.push` (DeckPanel's `onCardClick` triggers card-focus navigation). cardNav lives in the shell. A plain ReactNode slot would force the page to pass `cardNav.push` as a separate prop, exposing the shell's internal nav state. The render-prop pattern keeps cardNav private and lets the rail get the callback through dependency injection. Cost: 2 lines per consumer.
- Tested: `rightRail receives a working onCardClick` confirms the render prop is invoked with a callable function. Clicking the button the test renders runs without error.

**Why the URL-tag wrapping stays in BrowserPage**
- The PRD's `tagSource: 'url' | 'local'` strategy could have been a shell prop, but BrowserPage's exact URL-tag wrapping (filterForPanel injects URL tags into the panel's view of `filter`; handleFilterChange splits emitted changes between URL and local) is page-specific glue that belongs at the page layer. The shell stays oblivious to where `filter` comes from. If a future page needs URL syncing for, say, `cmcMax`, the same pattern works without touching the shell.
- BrowserPage still owns ActiveTagFilter (passed as `headerExtra`) for the same reason: it needs `urlTags` and `removeUrlTag` which only the page has.

**Loading/error gating is now shared**
- DeckPage previously rendered nothing during hydration (the grid showed empty). Moving the early-return into the shell means `/deck` now shows the same `'Loading card data…'` message during hydration as `/` does. Strict improvement — no regression possible because the prior state was "blank grid + empty filter sidebar."

**Files NOT touched (intentional)**
- DecksPage.tsx — separate route (`/decks`, the deck index), doesn't use the FilterPanel/CardGrid layout. Out of scope.
- FilterPanel, CardGrid, CardDetailDrawer, DeckPanel, HoverCardPreview — all consumed by the shell unchanged. The shell composes them; no internal-surface changes were needed.
- App.tsx — routes still mount `<BrowserPage />` and `<DeckPage />` directly. The shell is an implementation detail of those two pages; if a future page needs the same shape, it imports BrowserShell directly.

**Verification**
- `npm test` — full gate: pipeline 134 files / 1315 tests + app 24 files / 152 tests (was 23 / 146; +1 file + 6 new BrowserShell tests) + tsc -b + vite build all pass. Bundle: 327.47 kB / 106.13 kB gzip (within noise of pre-change 328.71 / 106.25 — net deletion across the two pages slightly outweighed the new shell module).
- Modules transformed by Vite: 97 (was 96 — BrowserShell.tsx is the new module).
- Browser smoke test (dev-browser skill) NOT performed — same caveat as every UI-touching story since US-007. No JSX semantics changed beyond the extraction; layout structure is byte-equivalent across the BrowserShell/page boundary.

**Note for the next person**
- **The PRD is complete after this story.** All 15 items have `passes: true`. If you're picking up a fresh PRD, treat US-007/US-009/US-010/US-011/US-012/US-013/US-014/US-015's "browser smoke test NOT performed" notes as collective tech debt — one manual reload-in-Chrome pass through `/`, `/decks`, and `/deck` (with `?card=<id>` and `?tag=<id>` permutations) before tagging a release would close them all out.
- If you find yourself adding a *third* page that needs the FilterPanel + grid layout, import BrowserShell and pass the appropriate slots. Don't fork the layout JSX back into the page. The shell already supports both "no right rail, with hover preview" (BrowserPage) and "right rail, no hover preview" (DeckPage); a third combination is a 2-line prop addition.
- The `rightRail` render-prop receives `{ onCardClick }` today. If a future rail needs more shell internals (e.g. the current focused card id, or a callback to clear focus), extend the `RightRailCtx` type rather than reaching into the shell's state through a ref. The contract should grow at the props boundary.
- The deck-rail `transitionend` listener filter (`e.propertyName === 'width'`) is the same invariant US-014 introduced — preserved verbatim. If you add a rail with a height transition that should also re-measure, broaden the filter to `['width', 'height'].includes(e.propertyName)` rather than dropping it; "any transitionend re-measures" is the wrong default (rail-internal hover transitions fire transitionend too and shouldn't trigger a grid reflow).
- ResizeObserver is stubbed *locally* in `BrowserShell.test.tsx`, not in `app/tests/setup.ts`. If another test file needs ResizeObserver in the future, lift the stub into setup.ts; until then, keeping it local makes the test file self-contained and makes the dependency explicit. Don't pollute the global setup for a single file's need.
