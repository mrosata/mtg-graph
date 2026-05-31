# Client-Side Edge Computation — Design

**Date:** 2026-05-30
**Status:** Spec, awaiting review
**Author:** Michael Rosata (with Claude Opus 4.7)
**Predecessor:** v0.14.37 compact-tuple `WireEdge` format (commit `19995bb`)
**Successor (planned):** Re-enable Commander sets in the `--standard` build

## Problem

The artifact for the `--standard` build (Standard ∪ Upcoming) is 168 MB raw
JSON / 4.2 MB brotli, dominated almost entirely by edges:

| Component | Count | Wire size | Share |
|---|---|---|---|
| Edges (`WireEdge` tuples) | ~1.87M | ~159 MB | ~95% |
| Cards (with tags) | ~4,446 | ~9 MB | ~5% |
| Tag catalog | 235 entries | ~50 KB | negligible |

Edge count scales roughly `effects × consumers` — quadratic-ish in cards. v0.14.37
bought a 6× reduction in per-edge byte cost (rich objects → 4-tuples), opening
~3× headroom under V8's ~512 MB string-length cap. That headroom is consumed
by the next significant set expansion. We will keep adding sets.

The compact-wire-format fix was a one-time win. We need a structural one.

## Approach

**Move edge computation from the build pipeline to the client.** Ship cards +
tag catalog only. Compute edges in a Web Worker on hydration. Cache the
cards-only artifact in IndexedDB exactly as we do today.

`pipeline/graph.ts` is already pure TypeScript — no `node:fs`, no Node-only
imports, just `Map`/`Set`/`Array`. The same module runs unchanged in a Web
Worker.

### Goals

1. Decouple wire footprint from edge count. Wire size scales linearly with
   cards, not quadratically with interactions.
2. Eliminate the V8 string-length problem permanently for any reasonable set
   coverage (Standard + Upcoming + Commander + plausible Modern expansion).
3. Keep pipeline-as-source-of-truth for graph *structure* (rules, catalog,
   tag-expansion) — only edge *evaluation* moves to the client. The same
   `buildEdges` function runs in both contexts.
4. Preserve cold-load UX: total time-to-interactive should not regress
   meaningfully. Network savings should approximately offset worker compute.

### Non-goals

- sql.js / per-query storage. Right move for v0.4-style all-of-Magic scale;
  premature today.
- Per-set sharding of the cards artifact. We can do this later if cards-only
  ever crosses a meaningful threshold (~100 MB raw).
- Streaming-NDJSON edge format. Doesn't reduce bytes; doesn't reduce server
  build time. Strictly inferior to compute-on-client for our shape.
- Per-deck filtered subgraphs computed on the fly. Possible future use of the
  same worker; not in scope.

## Wire format changes

`shared/types.ts`:

- **Remove** `WireEdge` type entirely.
- **Remove** `edges: WireEdge[]` from `Artifact`. (Or make it explicitly absent
  — see "Cleanup vs. compatibility" below.)

Recommended: clean removal. RULE_VERSION bump invalidates any stale
`artifactCache` rows in IndexedDB, so there are no in-flight consumers of the
old shape that we need to keep working.

`Artifact` after this change:

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

## Pipeline changes

`pipeline/index.ts`:

- Drop the `buildEdges(...)` call and the `richEdges → WireEdge` conversion
  block. Drop `tagIdxByTagId`. Drop the `edges` field from the assembled
  `Artifact` literal.
- Keep `tagCards` and everything upstream of it unchanged.
- Re-enable Commander sets in the `--standard` branch (this is the follow-up;
  see "Follow-up" section).

`pipeline/emit.ts`:

- Remove the `await write(stream, ',"edges":'); await writeArray(stream, artifact.edges);`
  block.
- Remove the `InteractionEdge` import. `writeArray` now takes `Card[]` only.

`pipeline/graph.ts`:

- **Unchanged.** Still exports `buildEdges(cards, catalog) → InteractionEdge[]`.
- Still tested via `pipeline/graph.test.ts` against the fixture corpus. The
  pipeline tests for edge correctness do not depend on the artifact wire
  format.

## App changes

### New Web Worker

`app/src/workers/buildEdges.worker.ts`:

```ts
import type { Card, InteractionEdge, TagDef } from '@shared/types';
import { buildEdges } from '../../../pipeline/graph';

type Request = { cards: Card[]; catalog: TagDef[] };
type Response = { edges: InteractionEdge[] };

self.onmessage = (e: MessageEvent<Request>) => {
  const { cards, catalog } = e.data;
  const edges = buildEdges(cards, catalog);
  const response: Response = { edges };
  // Edges are plain objects; structured clone is the only available
  // copy mechanism. No Transferable hot path here — InteractionEdge
  // is not an ArrayBuffer view.
  postMessage(response);
};
```

Vite picks this up via `new Worker(new URL('./buildEdges.worker.ts', import.meta.url), { type: 'module' })`.
No additional config required — Vite's built-in worker handling already does
ESM workers with TS.

**Why this worker structure:**

- Worker imports `pipeline/graph.ts` directly. No code duplication; no
  serialization of rules. The catalog passes through as data because the
  worker needs `pairsWith` to compute edges.
- One-shot request/response, no streaming. The graph builds in one pass; no
  intermediate state to surface.
- No Transferable. `InteractionEdge` is a tree of plain objects/strings;
  ArrayBuffer transfer wouldn't apply. Structured-clone cost for ~1.87M
  edges is ~30-50 ms in practice — small next to the worker compute.

### graphStore changes

`app/src/stores/graphStore.ts`:

Replace the `applyArtifact` decode loop (currently iterates `artifact.edges`,
converts `WireEdge[2]` and `[3]` indices back to tag IDs) with a worker
invocation. Sketch:

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

`hydrate(url)` keeps the existing structure:
- Check IndexedDB for cached artifact at this `(ruleVersion, sourceSet)` key.
- On hit: `await applyArtifact(hit.artifact, set)` — which now runs the worker.
- On miss: fetch, parse JSON, `db.artifactCache.put(...)`, then
  `await applyArtifact(artifact, set)`.

The cache continues to store the **cards-only artifact** — not the post-compute
state. This decision is "always recompute, never persist edges to IndexedDB."

**Why cache the artifact, not the edges?**

- 1.87M edges as `InteractionEdge` objects ≈ ~380 MB structured-clone'd into
  IndexedDB. That's a big write on first load and a non-trivial read on every
  cold start. The browser would push us toward IndexedDB storage quotas
  (50 MB - 2 GB depending on platform).
- Worker compute is ~300-500 ms. Cheap enough to re-run on every load.
- Simpler invariant: IndexedDB holds exactly the wire artifact. Worker output
  is in-memory only.

### Loading state

No new loading sub-state. `status: 'loading'` already covers the entire
fetch + cache-read + worker-compute window. The user sees the same loading
spinner; the worker just runs inside that window.

## Cache strategy

`app/src/lib/db.ts` `artifactCache` table is **unchanged** in schema. It still
keys on `ruleVersion`, stores the full `Artifact`. The artifact just no longer
carries `edges`, so each row is ~9 MB instead of ~168 MB — a free win for IDB
quota.

No Dexie version bump required; the `Artifact` type changes, but Dexie stores
opaque blobs and doesn't validate field shape.

## Migration

- Bump `shared/version.ts` `RULE_VERSION` to `v0.15.0`. Reasoning: this is a
  format-breaking artifact schema change, larger than the per-fix patch
  versions (`v0.14.37`, `v0.14.38`, ...). The `graphStore.hydrate` stale-cache
  cleanup (`db.artifactCache.bulkDelete(staleVersions)`) handles existing
  users.
- No code path needs to handle "artifact has edges" as a fallback. The
  RULE_VERSION mismatch already routes users to a fresh fetch.

## Testing plan

### Pipeline tests

- `pipeline/graph.test.ts` — **unchanged**. Still tests `buildEdges` against
  the fixture corpus.
- `pipeline/emit.test.ts` (if it exists) — update to not assert on `edges`
  field. (To verify during implementation; if no such test exists, none
  added.)
- `pipeline/has-evasion-migration.test.ts` — unrelated. Should not need
  changes.

### App tests

- `app/src/stores/graphStore.test.ts` — substantial rewrite of the two
  WireEdge tests:
  - Replace "decodes WireEdge tuples" with "spawns worker and populates
    adjacency maps from worker output."
  - Replace "skips out-of-range indices" with a worker-error test, OR drop
    it — defensive parsing of edge tuples no longer applies since edges are
    computed locally with the live catalog. There's no analogue of "tag
    index outside catalog" when both sides see the same in-memory objects.
- New test: worker correctness via direct import of the worker module's
  exported handler, or via a vitest mock that runs `buildEdges` synchronously
  on the main thread. Recommend the latter — vitest workers in jsdom are
  fiddly, and the worker file is a thin shim.
- E2E (`app/tests/e2e/`) — the Playwright smoke test should pass unchanged.
  If it asserts on hydration timing, may need to relax a timeout.

### Manual verification

After implementation lands:

1. `npm run build:cards -- --standard` — confirm artifact size drops to ~9 MB
   raw, ~300-500 KB brotli.
2. `cd app && npm run dev` — open in a cold browser (private window).
   - DevTools Network: confirm `cards-standard.json` is ~9 MB raw or
     ~300-500 KB if served via brotli.
   - Performance recording: confirm Web Worker spawns, runs ~300-500 ms,
     posts edges back. Main thread stays responsive.
   - DevTools Application > IndexedDB: confirm `artifactCache` row stores
     cards-only artifact (no `edges` field).
3. Reload (warm cache) — confirm worker re-runs (cache stores artifact, not
   computed edges) and re-render happens in <1 s.
4. Toggle "Include Commander cards" off — confirm no behavior change.
5. Run `npm test` — full gate green.

## Risks

- **Worker cold-start latency.** First Worker spawn can be 50-100 ms on cold
  browsers. Acceptable; dominated by network savings on the same load.
- **Structured-clone cost on worker → main.** ~1.87M edges, ~30-50 ms. Adds
  to perceived load time. Could be mitigated by chunked posting if it
  becomes a problem. YAGNI for now.
- **Memory peak during compute.** The worker holds cards + catalog (input)
  plus the edge accumulator (output) simultaneously. For current scale,
  ~50 MB peak. Comfortable.
- **Reload latency.** Cache hit runs the worker every time. ~500 ms cost.
  If users notice, we add a compute cache later.
- **Determinism in tests.** Worker spawning in jsdom may not work
  out-of-the-box. The plan above sidesteps this by mocking the worker boundary
  in unit tests.

## Cleanup vs. compatibility

Deleting `WireEdge` and removing `Artifact.edges` is a clean break. There
are no on-disk artifacts in production we need to keep readable — every
prior artifact is regenerated on each `npm run build:cards` invocation. The
brotli/gzip sidecars get rebuilt with the new format.

The RULE_VERSION bump invalidates all client-side IndexedDB caches. Returning
users see one fresh fetch on next visit, exactly the path the cache
invalidation flow was designed for.

## Follow-up: re-enable Commander sets

Once this lands and is verified, the original commander-set work becomes a
single-file change:

`pipeline/index.ts`:

```ts
if (standardIdx !== -1) {
  // Standard ∪ Upcoming ∪ Commander, deduped (msc/hoc/trc appear in both
  // UPCOMING and COMMANDER). Re-enabled in v0.15.0+ once edges moved
  // client-side and the artifact wire format stopped scaling with edge
  // count (see this spec).
  const sets = Array.from(
    new Set([...STANDARD_SET_CODES, ...UPCOMING_SET_CODES, ...COMMANDER_SET_CODES]),
  );
  return { sets, out, outName: 'standard', refresh };
}
```

No other changes. The UI toggle, filter logic, and `commanderSets` field on
`Artifact` are already in place (commit `a2f27e6`, preserved through the
revert in `39345df`).

**Estimated impact of follow-up:**
- Card count: ~4,446 → ~5,500 (rough estimate based on ~50-70 unique cards
  per commander companion product × 16 products).
- Wire size (cards-only): ~9 MB → ~11 MB raw, ~370-600 KB brotli. Still
  trivial.
- Edge count: ~1.87M → ~3-4M (driven by interaction multipliers, not card
  count). All computed client-side; doesn't touch the wire.
- Worker compute: ~500 ms → ~1 s. Still acceptable.

## Order of work

1. Spec (this document) → user reviews and approves.
2. Implementation plan via writing-plans skill.
3. Implementation in a separate session (see writing-plans output for the
   step-by-step).
4. Verify by the manual checklist above.
5. Single follow-up commit re-enabling Commander sets.

## Open questions

None for the design itself. Two for the implementation plan to decide:

- **Where does the worker file live?** Recommend `app/src/workers/`.
  Convention not yet established in this repo; this would be the first
  worker.
- **Vite worker bundling.** Vite handles ESM workers out of the box. Need to
  verify nothing in `pipeline/graph.ts`'s transitive import graph pulls in
  `node:`-prefixed modules. Spot-check: `graph.ts` imports
  `../shared/types`, which is type-only — safe.
