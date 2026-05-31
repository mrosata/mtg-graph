# Client-Side Edge Computation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move edge computation from the build pipeline to a Web Worker in the
app, shrinking the wire artifact from ~168 MB to ~9 MB and decoupling its size
from edge count, so Commander sets and future set additions can be ingested
without per-step compromises.

**Architecture:** The pipeline emits cards + tagCatalog only; no edges in the
artifact wire format. On hydration, the app spawns a Web Worker that imports
`pipeline/graph.ts` unchanged and runs `buildEdges(cards, catalog)`. The
graphStore awaits the worker's response and populates its outbound/inbound
adjacency maps from in-memory `InteractionEdge` objects. The IndexedDB cache
continues to store the (now cards-only) artifact; the worker re-runs on every
hydration (warm or cold).

**Tech Stack:** TypeScript, Vite (worker bundling via `new Worker(new URL(...), { type: 'module' })`),
Vitest + jsdom (with `Worker` global mocked for tests), Zustand (graphStore),
Dexie (IndexedDB cache, schema unchanged), `pipeline/graph.ts` (pure TS,
already browser-compatible).

**Spec:** `docs/superpowers/specs/2026-05-30-client-side-edge-computation-design.md`

---

## File Structure

**Create:**
- `app/src/workers/buildEdges.worker.ts` — Thin shim importing `pipeline/graph.ts`'s `buildEdges` and exposing it via `self.onmessage` / `postMessage`. One responsibility: worker boundary.

**Modify:**
- `shared/types.ts` — Remove `WireEdge` type, remove `edges` field from `Artifact`.
- `shared/version.ts` — Bump `RULE_VERSION` to `v0.15.0`.
- `pipeline/index.ts` — Drop `buildEdges` call, drop `tagIdxByTagId` mapping, drop `edges` from the assembled artifact. Same task re-enables Commander sets in the `--standard` branch (final task).
- `pipeline/emit.ts` — Drop the `,"edges":` write block and the `InteractionEdge` import; `writeArray` becomes `Card[]`-only.
- `app/src/stores/graphStore.ts` — `applyArtifact` becomes async; add `computeEdges` helper that spawns the worker, awaits its result, and feeds the outbound/inbound adjacency maps.
- `app/src/stores/graphStore.test.ts` — Drop the two WireEdge tests (lines 139–202). Add a `FakeWorker` mock for the `Worker` global. Add one test asserting `applyArtifact` populates adjacency maps from worker output. Drop `edges: []` from the fixture once `Artifact.edges` is removed.

**Unchanged:**
- `pipeline/graph.ts` — Still pure, still tested directly via `pipeline/graph.test.ts`. Worker imports it as-is.
- `app/src/lib/db.ts` — Dexie stores opaque blobs; no schema bump needed.
- `app/src/components/FilterPanel.tsx`, `app/src/lib/filter.ts`, `shared/sets.ts` — Commander UI/filter wiring already in place from commit `a2f27e6`.

---

## Task 1: Create the Web Worker shim

**Files:**
- Create: `app/src/workers/buildEdges.worker.ts`

**Rationale:** The worker is a 5-line shim over `buildEdges`. The interesting
logic (the edge math) is already tested in `pipeline/graph.test.ts`. We don't
add a dedicated test file for this shim — the graphStore test in Task 2 covers
the worker boundary by mocking the `Worker` global with a `FakeWorker` that
calls `buildEdges` synchronously. End-to-end real-worker behavior is verified
manually in Task 5.

- [ ] **Step 1: Create the worker file**

Create `app/src/workers/buildEdges.worker.ts` with this exact content:

```ts
import type { Card, InteractionEdge, TagDef } from '@shared/types';
import { buildEdges } from '../../../pipeline/graph';

type Request = { cards: Card[]; catalog: TagDef[] };
type Response = { edges: InteractionEdge[] };

self.onmessage = (e: MessageEvent<Request>) => {
  const { cards, catalog } = e.data;
  const edges = buildEdges(cards, catalog);
  const response: Response = { edges };
  postMessage(response);
};
```

- [ ] **Step 2: Verify nothing broke**

Run from repo root:

```bash
npm test
```

Expected: PASS — the worker is unused so far; existing pipeline tests, app
tests, and `app/npm run build` all stay green. If `app/npm run build` fails
with a TS error about the worker file, check that `app/tsconfig.json` includes
`src` (it does — verified in spec).

- [ ] **Step 3: Commit**

```bash
git add app/src/workers/buildEdges.worker.ts
git commit -m "$(cat <<'EOF'
feat(app): add buildEdges Web Worker shim

Wraps pipeline/graph.ts's buildEdges in a Web Worker boundary so the app
can compute the interaction graph off the main thread on hydration.
Unused until Task 2 wires graphStore to it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Refactor graphStore to compute edges via worker

**Files:**
- Modify: `app/src/stores/graphStore.ts`
- Modify: `app/src/stores/graphStore.test.ts`

**Rationale:** This task swaps the existing `WireEdge` decode loop for a worker
invocation. After this lands, the graphStore still *reads* `artifact.edges` if
the field is present — but ignores it. Task 3 removes the field. Splitting it
this way keeps the type system happy at each step.

- [ ] **Step 1: Replace the two WireEdge tests with a worker-based test**

In `app/src/stores/graphStore.test.ts`, **delete** the existing tests at
lines 139–202 (the two `it(...)` blocks: "decodes WireEdge tuples..." and
"skips WireEdge tuples...").

Then **add at the top of the file** (right after the existing imports) a
synchronous worker mock and import `buildEdges`:

```ts
import { buildEdges } from '../../../pipeline/graph';
import type { Card, InteractionEdge, TagDef } from '@shared/types';

class FakeWorker {
  onmessage: ((e: MessageEvent<{ edges: InteractionEdge[] }>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postMessage(data: { cards: Card[]; catalog: TagDef[] }) {
    queueMicrotask(() => {
      const edges = buildEdges(data.cards, data.catalog);
      this.onmessage?.({ data: { edges } } as MessageEvent<{ edges: InteractionEdge[] }>);
    });
  }
  terminate() {}
}
```

In the existing `beforeEach`, **add** at the end (after the existing
`useGraphStore.setState(...)` call):

```ts
vi.stubGlobal('Worker', FakeWorker);
```

Then **add a new test** at the end of the `describe('graphStore.hydrate', ...)`
block (replacing the deleted WireEdge tests):

```ts
it('populates adjacency maps from worker-computed edges', async () => {
  const artifact = makeArtifact({
    sourceSet: 't',
    ruleVersion: RULE_VERSION,
    cards: [
      {
        oracleId: 'a', name: 'A', set: 't', printings: ['t'], collectorNumber: '1',
        manaCost: null, cmc: 0, colors: [], colorIdentity: [],
        typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
        oracleText: '', keywords: [], power: '1', toughness: '1',
        rarity: 'common', imageUrl: '',
        tags: [{ tagId: 'effect.create_token', evidence: 'token' }],
      },
      {
        oracleId: 'b', name: 'B', set: 't', printings: ['t'], collectorNumber: '2',
        manaCost: null, cmc: 0, colors: [], colorIdentity: [],
        typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
        oracleText: '', keywords: [], power: '1', toughness: '1',
        rarity: 'common', imageUrl: '',
        tags: [{ tagId: 'trigger.token_created', evidence: 'token created' }],
      },
    ],
    tagCatalog: [
      { tagId: 'effect.create_token', axis: 'effect', label: 'Create token', description: '', pairsWith: ['trigger.token_created'] },
      { tagId: 'trigger.token_created', axis: 'trigger', label: 'Token created', description: '', pairsWith: [] },
    ],
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => artifact }));

  await useGraphStore.getState().hydrate('/data/cards-t.json');

  expect(useGraphStore.getState().status).toBe('ready');
  const outbound = useGraphStore.getState().edges.get('a');
  expect(outbound).toHaveLength(1);
  expect(outbound?.[0]).toEqual({
    source: 'a',
    target: 'b',
    reason: {
      sourceTagId: 'effect.create_token',
      targetTagId: 'trigger.token_created',
      direction: 'source_produces_for_target',
    },
  });
  const inbound = useGraphStore.getState().edgesInbound.get('b');
  expect(inbound).toHaveLength(1);
  expect(inbound?.[0]?.source).toBe('a');
});
```

Note: the `CardTag` shape requires `tagId` and `evidence`. The fixture
above gives each a minimal `evidence` string to satisfy the type.

- [ ] **Step 2: Run tests, expect the new test to fail**

```bash
cd app && npm test -- graphStore
```

Expected: the new "populates adjacency maps from worker-computed edges" test
FAILS — current graphStore decodes `artifact.edges` (empty array in fixture →
no edges in store), so `outbound` is `undefined`. Other tests (basic hydrate,
cache hit/miss, stale version) continue to PASS because they don't assert on
edges.

- [ ] **Step 3: Refactor graphStore to spawn worker**

Open `app/src/stores/graphStore.ts`. **Replace** the entire `applyArtifact`
function (currently lines 17–66) with this async version, and **add** the
`computeEdges` helper just below it:

```ts
async function applyArtifact(
  artifact: Artifact,
  set: (partial: Partial<GraphState>) => void,
): Promise<void> {
  const cards = new Map(artifact.cards.map((c) => [c.oracleId, c]));
  const tagCatalog = new Map(artifact.tagCatalog.map((t) => [t.tagId, t]));

  const edges = await computeEdges(artifact.cards, artifact.tagCatalog);

  const outbound = new Map<string, InteractionEdge[]>();
  const inbound = new Map<string, InteractionEdge[]>();
  for (const edge of edges) {
    const o = outbound.get(edge.source) ?? [];
    o.push(edge);
    outbound.set(edge.source, o);
    const i = inbound.get(edge.target) ?? [];
    i.push(edge);
    inbound.set(edge.target, i);
  }

  set({
    cards,
    edges: outbound,
    edgesInbound: inbound,
    tagCatalog,
    ruleVersion: artifact.ruleVersion,
    status: 'ready',
  });
}

function computeEdges(cards: Card[], catalog: TagDef[]): Promise<InteractionEdge[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/buildEdges.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker.onmessage = (e: MessageEvent<{ edges: InteractionEdge[] }>) => {
      resolve(e.data.edges);
      worker.terminate();
    };
    worker.onerror = (e) => {
      reject(new Error(`buildEdges worker failed: ${e.message}`));
      worker.terminate();
    };
    worker.postMessage({ cards, catalog });
  });
}
```

Then **update both call sites** of `applyArtifact` inside `hydrate` (currently
lines 98 and 117 in the original file) to `await` them:

```ts
// Cache hit path:
if (hit) {
  await applyArtifact(hit.artifact, set);
  return;
}
```

```ts
// Cache miss path (after the db.artifactCache.put):
await applyArtifact(artifact, set);
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
cd app && npm test -- graphStore
```

Expected: all `graphStore.hydrate` tests PASS — including the new worker-based
test, which now receives real `buildEdges` output via the `FakeWorker` mock.

- [ ] **Step 5: Run the full app test suite to catch incidental regressions**

```bash
cd app && npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/stores/graphStore.ts app/src/stores/graphStore.test.ts
git commit -m "$(cat <<'EOF'
feat(app): compute interaction edges client-side via Web Worker

graphStore.applyArtifact now spawns the buildEdges worker, awaits its
response, and populates outbound/inbound adjacency maps from in-memory
InteractionEdge objects. The artifact's edges field is still read by the
hydrate path but now ignored — Task 3 of the v0.15 plan removes the
field from the wire format and pipeline.

Test mocks the Worker global with a synchronous FakeWorker that calls
buildEdges directly, so worker-boundary tests run in jsdom without
spawning real workers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Drop edges from the artifact wire format

**Files:**
- Modify: `shared/types.ts`
- Modify: `shared/version.ts`
- Modify: `pipeline/index.ts`
- Modify: `pipeline/emit.ts`
- Modify: `app/src/stores/graphStore.test.ts` (fixture)

**Rationale:** Now that graphStore ignores `artifact.edges`, we can remove the
field cleanly. RULE_VERSION bump invalidates any stale IndexedDB caches on
returning users' machines.

- [ ] **Step 1: Drop WireEdge type and edges field from Artifact**

In `shared/types.ts`, find the `WireEdge` definition (around line 78) and
**delete** it entirely along with any comment block introducing it. Also
**delete** the line `edges: WireEdge[];` from the `Artifact` type (around
line 118). The resulting `Artifact` should look like:

```ts
export type Artifact = {
  cards: Card[];
  tagCatalog: TagDef[];
  generatedAt: string;
  sourceSet: string;
  sourceSets: string[];
  ruleVersion: string;
  upcomingSets?: string[];
  commanderSets?: string[];
};
```

Keep `InteractionEdge` — it's still the in-memory shape returned by the
worker and stored in graphStore.

- [ ] **Step 2: Drop edges: [] from the test fixture**

In `app/src/stores/graphStore.test.ts`, find the `makeArtifact` helper
(around line 8) and **delete** the line `edges: [],` from the default
object literal. The fixture should now have `cards`, `tagCatalog`,
`generatedAt`, `sourceSet`, `sourceSets`, `ruleVersion` only.

- [ ] **Step 3: Drop buildEdges call and WireEdge mapping from pipeline/index.ts**

In `pipeline/index.ts`:

**Delete** the `WireEdge` and `InteractionEdge` imports from the
`shared/types` import line (around line 3). The line should become:

```ts
import type { Artifact, Card, TagDef } from '../shared/types';
```

**Delete** the block that builds rich edges and converts to wire format
(currently lines 107–124):

```ts
// DELETE THESE LINES:
console.log('Building interaction graph...');
const catalog = getTagCatalog();
const richEdges = buildEdges(taggedCards, catalog);
console.log(`  → ${richEdges.length} edges`);

// Wire-format compaction: ...
const tagIdxByTagId = new Map(catalog.map((t, i) => [t.tagId, i]));
const edges: WireEdge[] = richEdges.map((e: InteractionEdge): WireEdge => [
  e.source,
  e.target,
  tagIdxByTagId.get(e.reason.sourceTagId)!,
  tagIdxByTagId.get(e.reason.targetTagId)!,
]);
```

**Delete** the `buildEdges` import (around line 16) — it's no longer used in
this file. (Pipeline tests still import it directly from
`pipeline/graph.ts`.)

**Replace** the artifact assembly block (currently lines 126–138) with:

```ts
const catalog = getTagCatalog();
const upcomingSets = args.sets.filter((s) => UPCOMING_SET_SET.has(s));
const commanderSets = args.sets.filter((s) => COMMANDER_SET_SET.has(s));
const artifact: Artifact = {
  cards: taggedCards,
  tagCatalog: catalog,
  generatedAt: new Date().toISOString(),
  sourceSet: args.outName,
  sourceSets: args.sets,
  ruleVersion: RULE_VERSION,
  ...(upcomingSets.length > 0 ? { upcomingSets } : {}),
  ...(commanderSets.length > 0 ? { commanderSets } : {}),
};
```

(Note: `catalog` is still needed for the artifact field, just not for edge
indexing.)

- [ ] **Step 4: Drop edges writing from pipeline/emit.ts**

In `pipeline/emit.ts`:

**Delete** the `InteractionEdge` import from the `shared/types` import line
(around line 9). The line should become:

```ts
import type { Artifact, Card } from '../shared/types';
```

**Delete** these two lines from inside `writeArtifact` (around lines 24–25):

```ts
// DELETE:
await write(stream, ',"edges":');
await writeArray(stream, artifact.edges);
```

**Update the `writeArray` signature** (around line 49) to remove the
`InteractionEdge` union:

```ts
async function writeArray(
  stream: WriteStream,
  items: readonly Card[],
): Promise<void> {
```

- [ ] **Step 5: Bump RULE_VERSION**

In `shared/version.ts`, change:

```ts
export const RULE_VERSION = 'v0.14.41';
```

to:

```ts
export const RULE_VERSION = 'v0.15.0';
```

- [ ] **Step 6: Run the full gate**

```bash
npm test
```

Expected: PASS. This runs pipeline + shared tests, app tests, and
`app/npm run build` (tsc + vite). The build step is what catches any TS
errors from the type removal.

If the build fails complaining about `WireEdge`, search for any remaining
references and remove them:

```bash
grep -rn "WireEdge" /Users/Dada/mtg-graph/{shared,pipeline,app/src}
```

Expected: no matches after this task.

- [ ] **Step 7: Rebuild the artifact to verify size shrinks**

```bash
npm run build:cards -- --standard
ls -la app/public/data/cards-standard.json app/public/data/cards-standard.json.br
```

Expected:
- `cards-standard.json` raw: ~9 MB (down from 168 MB).
- `cards-standard.json.br`: ~300–500 KB (down from 4.2 MB).

If the raw size is dramatically different (e.g. still in the tens of MB),
the edges field probably wasn't fully removed — recheck `emit.ts` and the
artifact literal.

- [ ] **Step 8: Commit**

```bash
git add shared/types.ts shared/version.ts pipeline/index.ts pipeline/emit.ts app/src/stores/graphStore.test.ts app/public/data/cards-standard.json app/public/data/cards-standard.json.br app/public/data/cards-standard.json.gz
git commit -m "$(cat <<'EOF'
feat(pipeline,app): v0.15.0 drop edges from artifact wire format

Edges are now computed client-side by the buildEdges Web Worker on
hydration (see Task 2 commit). The artifact wire format becomes
cards + tagCatalog only; WireEdge type and Artifact.edges field
removed. Pipeline no longer calls buildEdges (tests still cover it
directly via pipeline/graph.test.ts).

Artifact size: 168 MB → ~9 MB raw, 4.2 MB → ~300-500 KB brotli.
RULE_VERSION bumped v0.14.41 → v0.15.0 to invalidate existing
IndexedDB.artifactCache rows; returning users see one fresh fetch.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Re-enable Commander sets in the `--standard` build

**Files:**
- Modify: `pipeline/index.ts`

**Rationale:** The wire-format problem that motivated the revert (commit
`39345df`) is now structurally fixed. The UI/filter wiring is already in
place from commit `a2f27e6` (preserved through the revert). Single-line
change to restore the Standard ∪ Upcoming ∪ Commander union.

- [ ] **Step 1: Restore the Commander union in --standard**

In `pipeline/index.ts`, find the `if (standardIdx !== -1)` block (around
line 35). **Replace** the current "temporarily excluded" comment and `sets`
construction:

```ts
// CURRENT:
if (standardIdx !== -1) {
  // Commander sets are temporarily excluded: adding ~13 Commander products
  // pushed the artifact past V8's max string length (~512 MB), crashing
  // hydration in the browser. Re-enable once edges have a compact
  // representation (or are computed client-side).
  const sets = Array.from(
    new Set([...STANDARD_SET_CODES, ...UPCOMING_SET_CODES]),
  );
  return { sets, out, outName: 'standard', refresh };
}
```

With:

```ts
if (standardIdx !== -1) {
  // Standard ∪ Upcoming ∪ Commander, deduped (msc/hoc/trc appear in both
  // UPCOMING and COMMANDER). Re-enabled in v0.15.0 once edges moved to a
  // client-side Web Worker and the artifact wire format stopped scaling
  // with edge count.
  const sets = Array.from(
    new Set([...STANDARD_SET_CODES, ...UPCOMING_SET_CODES, ...COMMANDER_SET_CODES]),
  );
  return { sets, out, outName: 'standard', refresh };
}
```

- [ ] **Step 2: Run pipeline tests**

```bash
npm run test:pipeline
```

Expected: PASS. The pipeline test suite uses fixtures, not Scryfall, so it
doesn't care which set codes the CLI's `--standard` flag expands to.

- [ ] **Step 3: Rebuild the artifact with Commander sets included**

```bash
npm run build:cards -- --standard
```

Expected log output: 16 Commander codes (woc, lcc, mkc, otc, blc, dsc, fdc,
drc, tdc, fic, eoc, ecc, soc, msc, hoc, trc) appear in the "Fetching set
… / Loading set …" sequence. First fetch from Scryfall for any code not
in `.cache/scryfall/`. Cache misses may take ~5–30 s each (rate-limited by
the 120 ms inter-fetch sleep + Scryfall response time).

If a fetch fails with HTTP 404 for an upcoming Commander code (`msc`,
`hoc`, `trc` — these are still pre-release as of 2026-05-30), the
pipeline tolerates it (per the comment in `shared/sets.ts`: "0-card sets
are tolerated by fetch (404 → [])"). No action needed.

- [ ] **Step 4: Verify artifact size and card count**

```bash
ls -la app/public/data/cards-standard.json app/public/data/cards-standard.json.br
node -e "const a = require('./app/public/data/cards-standard.json'); console.log('cards:', a.cards.length, 'commanderSets:', a.commanderSets?.length ?? 0, 'upcomingSets:', a.upcomingSets?.length ?? 0)"
```

Expected:
- `cards-standard.json` raw: ~10–12 MB (cards-only is dominated by ~5,000 cards × ~2 KB; Commander adds ~500–1,000 unique cards beyond what's already in expansion sets via reprints).
- `cards-standard.json.br`: ~400–700 KB.
- `cards:`: somewhere around 5,000–5,500 (depending on how many Commander prints are reprints vs. originals).
- `commanderSets:`: 16 (or fewer if pre-release codes returned 0 cards).
- `upcomingSets:`: 5–8 (the non-Commander upcoming codes plus any Commander codes that also appear in UPCOMING_SETS).

If `cards-standard.json` exceeds ~20 MB raw, something is off — the
Commander products shouldn't add that much. Investigate before continuing.

- [ ] **Step 5: Run the full gate one more time with the new artifact**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pipeline/index.ts app/public/data/cards-standard.json app/public/data/cards-standard.json.br app/public/data/cards-standard.json.gz
git commit -m "$(cat <<'EOF'
feat(pipeline): re-enable Commander sets in --standard build

Restores Standard ∪ Upcoming ∪ Commander union, deduped, in the
--standard CLI branch. The 168 MB → 1 GB artifact size problem that
caused the v0.14.36 revert (commit 39345df) is structurally resolved
in v0.15.0: edges moved off the wire and into the buildEdges Web
Worker. UI toggle ("Include Commander cards", default off) and filter
logic for commander-only printings were already in place from
commit a2f27e6.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Manual verification

**Files:** none (verification only)

**Rationale:** Confirm the user-visible behavior matches the spec's
expectations before considering the work complete. No commits in this
task.

- [ ] **Step 1: Cold-load timing**

```bash
cd app && npm run dev
```

Open `http://localhost:5173` in a private/incognito browser window (clean
IndexedDB). Observe:

- DevTools Network tab: `cards-standard.json` request. Confirm size matches
  Task 4's expected range (~10–12 MB raw, or ~400–700 KB if served via
  brotli — depends on dev server's compression, may be uncompressed in
  dev). Time-to-first-byte should be fast (~100 ms on localhost).
- DevTools Performance recording from cold load to interactive UI: confirm
  a Web Worker is spawned (visible in the "Frames" / "Main" lane), runs
  for ~500 ms – ~1 s, then posts back. Main thread stays responsive (the
  loading spinner animates smoothly).
- DevTools Application > IndexedDB > mtg-graph > artifactCache: confirm
  one row exists with `ruleVersion: 'v0.15.0'`, `sourceSet: 'standard'`,
  and the stored `artifact` object has **no `edges` field**.

- [ ] **Step 2: Warm-load timing**

Reload the page (full reload, not soft-reload). Observe:

- DevTools Network: no `cards-standard.json` request (cache hit). The
  hydrate path reads from IndexedDB.
- DevTools Performance: the worker still spawns and runs (~500 ms – ~1 s)
  because we always recompute edges. This is by design per the spec
  ("always recompute, never persist edges to IndexedDB").

- [ ] **Step 3: Filter wiring still works**

In the FilterPanel:
- Confirm the "Include Commander cards" checkbox is unchecked by default.
- Toggle it on. Confirm the card list expands to include commander-only
  printings (cards whose `printings` array is entirely in `COMMANDER_SET_CODES`).
- Toggle it off again. Confirm those cards disappear.

- [ ] **Step 4: Interactions panel renders edges**

Click any card known to have interactions (e.g., a token producer). Confirm
the right-side `CardDetailDrawer` or `InteractionsPanel` shows interaction
edges populated by the worker.

- [ ] **Step 5: Playwright e2e**

```bash
cd app && npm run e2e
```

Expected: PASS. If a test times out during hydration, raise the timeout —
the worker adds ~500 ms – ~1 s to first hydration.

- [ ] **Step 6: Browser console clean**

Throughout the above, watch the browser console. Acceptable: a single
informational log from `[graphStore]` if any (none expected). Not
acceptable: errors, warnings about edge tag indices, or any reference to
the dropped `WireEdge` format.

---

## Self-Review

**Spec coverage:**
- Wire format change (drop `WireEdge`, `Artifact.edges`) — Task 3 steps 1, 3, 4.
- Worker module — Task 1.
- graphStore + worker integration — Task 2.
- Cache strategy unchanged — preserved in Task 2's graphStore changes (artifact still cached as-is, sans edges).
- RULE_VERSION bump to v0.15.0 — Task 3 step 5.
- Testing plan (pipeline tests unchanged, app tests rewritten) — Task 2 covers app test changes, Task 3 step 6 runs the full gate.
- Manual verification — Task 5 (all checklist items from spec).
- Follow-up: re-enable Commander sets — Task 4.

No gaps.

**Placeholder scan:** No TBD / TODO / FIXME / "implement later" / "handle edge cases" in the plan. Every code step shows the actual code. Every command shows the exact invocation and expected outcome.

**Type consistency:** `computeEdges(cards, catalog): Promise<InteractionEdge[]>` referenced in Task 2 step 3 matches the worker shim's `Request`/`Response` types in Task 1 step 1. `FakeWorker.postMessage` signature in Task 2 step 1 matches the request shape `{ cards, catalog }`. `Artifact` shape in Task 3 step 1 matches what `applyArtifact` accesses in Task 2 step 3.

Plan is internally consistent.
