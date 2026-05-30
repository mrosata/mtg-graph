# Conditional Pairings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `tagDef.pairsWith` express conditional pairings — "I pair with X, but only if the source/target card also carries one of {Y, Z}" — and apply this to fix `condition.cares_creatures_died_this_turn` over-pairing token-makers without sac outlets.

**Architecture:** Extend `pairsWith` to a union of `string | PairingRequirement`. The graph builder builds a per-card tag-set in its existing first pass, dedupes `(effectId, consumerId)` pairs preferring the most restrictive entry, then applies `requiresOnSource` / `requiresOnTarget` gates at edge-emit time using an `any`/`all` mode.

**Tech Stack:** TypeScript, Vitest, Node (pipeline-only — no app changes).

**Spec:** `docs/superpowers/specs/2026-05-25-conditional-pairings-design.md`

---

## File map

- **Modify:** `shared/types.ts` — add `PairingRequirement`, `PairingEntry`, change `TagDef.pairsWith` type.
- **Modify:** `shared/version.ts` — bump `RULE_VERSION` to `v0.13.3`.
- **Modify:** `pipeline/graph.ts` — extend pairing normalization to handle object form, dedupe (effectId, consumerId), build `tagSetByOracleId`, add `satisfies` helper, apply gates.
- **Modify:** `pipeline/graph.test.ts` — add tests for the new gate semantics.
- **Modify:** `pipeline/catalog.test.ts` — update pairings-resolution test to walk into `requiresOnSource` / `requiresOnTarget` ids; preserve "effects only pair with triggers/conditions and vice versa" check on object form.
- **Modify:** `pipeline/scripts/rule-coverage.ts` — update `--pairings` validator to walk into the object form.
- **Modify:** `pipeline/rules/condition.cares_creatures_died_this_turn.ts` — apply the gate.

No new files. No app-side changes (artifact shape only changes via the version bump, which the existing IndexedDB-invalidation path already handles).

---

## Task 1: Schema — add union type to `TagDef.pairsWith`

**Files:**
- Modify: `shared/types.ts:67-81`

- [ ] **Step 1: Add `PairingRequirement` and `PairingEntry` types, change `TagDef.pairsWith`**

In `shared/types.ts`, immediately above the existing `TagDef` type, add:

```ts
export type PairingRequirement = {
  tagId: string;
  // If set, the source card (the effect-bearer) must also carry one of these
  // tags (or all, if requiresMode='all') for the edge to form.
  requiresOnSource?: string[];
  // Same, on the target (the trigger/condition-bearer).
  requiresOnTarget?: string[];
  // Defaults to 'any' — source/target need ONE of the listed tags.
  requiresMode?: 'any' | 'all';
};

export type PairingEntry = string | PairingRequirement;
```

Then change the `pairsWith` field of `TagDef`:

```ts
export type TagDef = {
  tagId: string;
  axis: TagAxis;
  label: string;
  description: string;
  pairsWith: PairingEntry[];
  category?: TagCategory;
  children?: string[];
};
```

- [ ] **Step 2: Run the pipeline test suite to confirm no existing usage broke**

Run: `npm run test:pipeline`
Expected: all green. Every existing `pairsWith: ['a', 'b']` literal is still valid under `PairingEntry[]` because `string` is in the union.

- [ ] **Step 3: Commit**

```bash
git add shared/types.ts
git commit -m "$(cat <<'EOF'
feat(shared): add PairingRequirement union to TagDef.pairsWith

Extends pairsWith from string[] to (string | PairingRequirement)[].
The object form lets a pairing express requiresOnSource /
requiresOnTarget gates with an 'any' (default) or 'all' mode. No
behavior change yet — the graph builder still treats every entry as a
bare string until Task 4.
EOF
)"
```

---

## Task 2: Graph builder test — gate fires when requirement unmet

**Files:**
- Modify: `pipeline/graph.test.ts`

- [ ] **Step 1: Add a failing test for the conditional pairing gate**

Append to `pipeline/graph.test.ts` (inside the `describe('buildEdges', ...)` block, before the closing brace):

```ts
  describe('conditional pairings (requiresOnSource)', () => {
    const gatedCatalog: TagDef[] = [
      { tagId: 'effect.create_creature_token', axis: 'effect', label: '', description: '',
        pairsWith: [] },
      { tagId: 'effect.sacrifice_creature', axis: 'effect', label: '', description: '',
        pairsWith: [] },
      { tagId: 'effect.sacrifice_permanent', axis: 'effect', label: '', description: '',
        pairsWith: [] },
      { tagId: 'condition.cares_creatures_died_this_turn', axis: 'condition', label: '', description: '',
        pairsWith: [
          {
            tagId: 'effect.create_creature_token',
            requiresOnSource: ['effect.sacrifice_creature', 'effect.sacrifice_permanent'],
          },
        ] },
    ];

    it('skips the edge when the source lacks all required tags', () => {
      const tokenOnly = card('tokenOnly', [
        { id: 'effect.create_creature_token', axis: 'effect' },
      ]);
      const morbid = card('morbid', [
        { id: 'condition.cares_creatures_died_this_turn', axis: 'condition' },
      ]);
      const edges = buildEdges([tokenOnly, morbid], gatedCatalog);
      expect(edges).toEqual([]);
    });

    it('forms the edge when the source has one of the required tags (any mode)', () => {
      const tokenAndSac = card('tokenAndSac', [
        { id: 'effect.create_creature_token', axis: 'effect' },
        { id: 'effect.sacrifice_creature', axis: 'effect' },
      ]);
      const morbid = card('morbid', [
        { id: 'condition.cares_creatures_died_this_turn', axis: 'condition' },
      ]);
      const edges = buildEdges([tokenAndSac, morbid], gatedCatalog);
      const gatedEdge = edges.find(
        (e) =>
          e.reason.sourceTagId === 'effect.create_creature_token' &&
          e.reason.targetTagId === 'condition.cares_creatures_died_this_turn',
      );
      expect(gatedEdge).toBeDefined();
      expect(gatedEdge!.source).toBe('tokenAndSac');
      expect(gatedEdge!.target).toBe('morbid');
    });

    it('forms the edge when the source has the OTHER required tag (any mode)', () => {
      const tokenAndPermSac = card('tokenAndPermSac', [
        { id: 'effect.create_creature_token', axis: 'effect' },
        { id: 'effect.sacrifice_permanent', axis: 'effect' },
      ]);
      const morbid = card('morbid', [
        { id: 'condition.cares_creatures_died_this_turn', axis: 'condition' },
      ]);
      const edges = buildEdges([tokenAndPermSac, morbid], gatedCatalog);
      const gatedEdge = edges.find(
        (e) => e.reason.sourceTagId === 'effect.create_creature_token',
      );
      expect(gatedEdge).toBeDefined();
    });

    it('requiresMode=all needs every listed tag on the source', () => {
      const allModeCatalog: TagDef[] = [
        { tagId: 'effect.create_creature_token', axis: 'effect', label: '', description: '',
          pairsWith: [] },
        { tagId: 'effect.sacrifice_creature', axis: 'effect', label: '', description: '',
          pairsWith: [] },
        { tagId: 'effect.sacrifice_permanent', axis: 'effect', label: '', description: '',
          pairsWith: [] },
        { tagId: 'condition.cares_creatures_died_this_turn', axis: 'condition', label: '', description: '',
          pairsWith: [
            {
              tagId: 'effect.create_creature_token',
              requiresOnSource: ['effect.sacrifice_creature', 'effect.sacrifice_permanent'],
              requiresMode: 'all',
            },
          ] },
      ];
      const onlyCreatureSac = card('onlyCreatureSac', [
        { id: 'effect.create_creature_token', axis: 'effect' },
        { id: 'effect.sacrifice_creature', axis: 'effect' },
      ]);
      const both = card('both', [
        { id: 'effect.create_creature_token', axis: 'effect' },
        { id: 'effect.sacrifice_creature', axis: 'effect' },
        { id: 'effect.sacrifice_permanent', axis: 'effect' },
      ]);
      const morbid = card('morbid', [
        { id: 'condition.cares_creatures_died_this_turn', axis: 'condition' },
      ]);
      const edges = buildEdges([onlyCreatureSac, both, morbid], allModeCatalog);
      const sources = new Set(
        edges
          .filter((e) => e.reason.sourceTagId === 'effect.create_creature_token')
          .map((e) => e.source),
      );
      expect(sources.has('both')).toBe(true);
      expect(sources.has('onlyCreatureSac')).toBe(false);
    });

    it('requiresOnTarget gates by tags on the target card', () => {
      const targetGatedCatalog: TagDef[] = [
        { tagId: 'effect.create_creature_token', axis: 'effect', label: '', description: '',
          pairsWith: [
            {
              tagId: 'condition.x',
              requiresOnTarget: ['condition.y'],
            },
          ] },
        { tagId: 'condition.x', axis: 'condition', label: '', description: '', pairsWith: [] },
        { tagId: 'condition.y', axis: 'condition', label: '', description: '', pairsWith: [] },
      ];
      const src = card('src', [{ id: 'effect.create_creature_token', axis: 'effect' }]);
      const tgtBare = card('tgtBare', [{ id: 'condition.x', axis: 'condition' }]);
      const tgtBoth = card('tgtBoth', [
        { id: 'condition.x', axis: 'condition' },
        { id: 'condition.y', axis: 'condition' },
      ]);
      const edges = buildEdges([src, tgtBare, tgtBoth], targetGatedCatalog);
      const targets = new Set(edges.map((e) => e.target));
      expect(targets.has('tgtBoth')).toBe(true);
      expect(targets.has('tgtBare')).toBe(false);
    });
  });
```

- [ ] **Step 2: Run the new tests to confirm they fail**

Run: `npx vitest run pipeline/graph.test.ts -t "conditional pairings"`
Expected: All five tests in the `conditional pairings (requiresOnSource)` block FAIL. The first one likely fails with the gated edge being incorrectly emitted (`expect([{...}]).toEqual([])`), since the current builder treats object entries as having no `tagId` to match — actually it'll fail with a TypeScript or runtime error trying to read `entry` as a string. Either failure mode is acceptable: the point is the tests are red before Task 3.

- [ ] **Step 3: Do not commit yet — failing tests come along with the implementation.**

---

## Task 3: Graph builder — handle object form, dedupe pairings, apply gates

**Files:**
- Modify: `pipeline/graph.ts`

- [ ] **Step 1: Replace the pairing-extraction block with a version that handles the union and dedupes most-restrictive**

Find the existing block (lines 53-67 in current `graph.ts`):

```ts
  const pairings: Array<{ effectId: string; consumerId: string }> = [];
  for (const tag of catalog) {
    for (const partnerId of tag.pairsWith) {
      const partner = tagDefById.get(partnerId);
      if (!partner) continue;
      const effectId = tag.axis === 'effect' ? tag.tagId : partnerId;
      const consumerId = tag.axis === 'effect' ? partnerId : tag.tagId;
      if (tagDefById.get(effectId)?.axis !== 'effect') continue;
      pairings.push({ effectId, consumerId });
    }
  }
```

Replace it with:

```ts
  type NormalizedPairing = {
    effectId: string;
    consumerId: string;
    requiresOnSource?: string[];
    requiresOnTarget?: string[];
    requiresMode: 'any' | 'all';
  };
  // Collect every pairing, normalized so the effect is always the source. A
  // single (effectId, consumerId) pair may be declared on both sides of the
  // edge (once on the effect rule's pairsWith, once on the consumer's). When
  // that happens we keep the most restrictive entry (any requires-list wins
  // over a bare string), so a stricter declaration on either side is honored.
  const byPair = new Map<string, NormalizedPairing>();
  for (const tag of catalog) {
    for (const entry of tag.pairsWith) {
      const partnerId = typeof entry === 'string' ? entry : entry.tagId;
      const partner = tagDefById.get(partnerId);
      if (!partner) continue;
      const effectId = tag.axis === 'effect' ? tag.tagId : partnerId;
      const consumerId = tag.axis === 'effect' ? partnerId : tag.tagId;
      if (tagDefById.get(effectId)?.axis !== 'effect') continue;
      const reqSrc = typeof entry === 'object' ? entry.requiresOnSource : undefined;
      const reqTgt = typeof entry === 'object' ? entry.requiresOnTarget : undefined;
      const mode: 'any' | 'all' =
        (typeof entry === 'object' && entry.requiresMode) || 'any';
      const key = `${effectId}|${consumerId}`;
      const existing = byPair.get(key);
      const hasReqs = !!(reqSrc || reqTgt);
      const existingHasReqs = !!(existing?.requiresOnSource || existing?.requiresOnTarget);
      if (!existing || (hasReqs && !existingHasReqs)) {
        byPair.set(key, { effectId, consumerId, requiresOnSource: reqSrc, requiresOnTarget: reqTgt, requiresMode: mode });
      }
    }
  }
  const pairings: NormalizedPairing[] = Array.from(byPair.values());
```

- [ ] **Step 2: Add `tagSetByOracleId` to the first card-iteration pass**

Find the existing first pass (currently at lines 29-51 of `graph.ts`). Add a new `Map` alongside the existing three:

```ts
  const cardsByTag = new Map<string, Set<string>>();
  const tribesByOracleId = new Map<string, Set<string>>();
  const narrowingsByOracleId = new Map<string, Set<string>>();
  const tagSetByOracleId = new Map<string, Set<string>>();
  for (const c of cards) {
    let cardTags = tagSetByOracleId.get(c.oracleId);
    if (!cardTags) tagSetByOracleId.set(c.oracleId, (cardTags = new Set()));
    for (const t of c.tags) {
      cardTags.add(t.tagId);
      let s = cardsByTag.get(t.tagId);
      if (!s) cardsByTag.set(t.tagId, (s = new Set()));
      s.add(c.oracleId);
      if (hasTagId(t, 'effect.create_creature_token')) {
        const types = t.metadata?.creatureTypes;
        if (types && types.length) {
          let tribes = tribesByOracleId.get(c.oracleId);
          if (!tribes) tribesByOracleId.set(c.oracleId, (tribes = new Set()));
          for (const ty of types) tribes.add(ty);
        }
      }
      if (t.tagId.startsWith(TRIBE_PREFIX)) {
        let n = narrowingsByOracleId.get(c.oracleId);
        if (!n) narrowingsByOracleId.set(c.oracleId, (n = new Set()));
        n.add(t.tagId.slice(TRIBE_PREFIX.length));
      }
    }
  }
```

- [ ] **Step 3: Add the `satisfies` helper at the top of the file (above `buildEdges`)**

After the `GATED_BY_TRIBE_TRIGGERS` const, before `export function buildEdges`:

```ts
function satisfies(
  tagSet: Set<string> | undefined,
  required: string[],
  mode: 'any' | 'all',
): boolean {
  if (!tagSet) return false;
  if (mode === 'all') return required.every((id) => tagSet.has(id));
  return required.some((id) => tagSet.has(id));
}
```

- [ ] **Step 4: Apply the gates in the edge-emit loop**

Find the existing inner loop that currently looks like:

```ts
  for (const { effectId, consumerId } of pairings) {
```

Change it to destructure the requirements too:

```ts
  for (const { effectId, consumerId, requiresOnSource, requiresOnTarget, requiresMode } of pairings) {
```

Then, in the `for (const target of targets)` body, AFTER the existing `GATED_BY_TRIBE_TRIGGERS` check and BEFORE the `seen.has(key)` line, add:

```ts
        if (requiresOnSource && !satisfies(tagSetByOracleId.get(source), requiresOnSource, requiresMode)) continue;
        if (requiresOnTarget && !satisfies(tagSetByOracleId.get(target), requiresOnTarget, requiresMode)) continue;
```

- [ ] **Step 5: Run the new tests — they must pass**

Run: `npx vitest run pipeline/graph.test.ts -t "conditional pairings"`
Expected: all five tests pass.

- [ ] **Step 6: Run the full graph test file — existing tests must still pass**

Run: `npx vitest run pipeline/graph.test.ts`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add pipeline/graph.ts pipeline/graph.test.ts
git commit -m "$(cat <<'EOF'
feat(pipeline): conditional pairings via PairingRequirement gates

Graph builder now honors requiresOnSource / requiresOnTarget on
object-form pairsWith entries with 'any' (default) or 'all' mode. When
the same (effectId, consumerId) pair is declared on both sides of the
edge, the most restrictive entry wins. No rule uses the object form
yet — applied in a follow-up commit.
EOF
)"
```

---

## Task 4: Catalog test — walk into requires lists when validating pairings

**Files:**
- Modify: `pipeline/catalog.test.ts:20-37`

- [ ] **Step 1: Update the `every pairsWith reference resolves` test to handle object form**

Find this test:

```ts
  it('every pairsWith reference resolves to a catalog entry', () => {
    const catalogIds = new Set(getTagCatalog().map((t) => t.tagId));
    for (const tag of getTagCatalog()) {
      for (const pair of tag.pairsWith) {
        expect(catalogIds.has(pair), `${tag.tagId} pairs with unknown ${pair}`).toBe(true);
      }
    }
  });
```

Replace with:

```ts
  it('every pairsWith reference resolves to a catalog entry', () => {
    const catalogIds = new Set(getTagCatalog().map((t) => t.tagId));
    for (const tag of getTagCatalog()) {
      for (const entry of tag.pairsWith) {
        const partnerId = typeof entry === 'string' ? entry : entry.tagId;
        expect(catalogIds.has(partnerId), `${tag.tagId} pairs with unknown ${partnerId}`).toBe(true);
        if (typeof entry === 'object') {
          for (const reqId of entry.requiresOnSource ?? []) {
            expect(catalogIds.has(reqId), `${tag.tagId} requiresOnSource references unknown ${reqId}`).toBe(true);
          }
          for (const reqId of entry.requiresOnTarget ?? []) {
            expect(catalogIds.has(reqId), `${tag.tagId} requiresOnTarget references unknown ${reqId}`).toBe(true);
          }
        }
      }
    }
  });
```

- [ ] **Step 2: Update the `effects only pair with triggers/conditions` test to handle object form**

Find this test:

```ts
  it('effects only pair with triggers and vice versa', () => {
    const tagsById = new Map(getTagCatalog().map((t) => [t.tagId, t]));
    for (const tag of getTagCatalog()) {
      for (const pair of tag.pairsWith) {
        const other = tagsById.get(pair);
        if (!other) continue;
        expect(other.axis).not.toBe(tag.axis);
      }
    }
  });
```

Replace with:

```ts
  it('effects only pair with triggers and vice versa', () => {
    const tagsById = new Map(getTagCatalog().map((t) => [t.tagId, t]));
    for (const tag of getTagCatalog()) {
      for (const entry of tag.pairsWith) {
        const partnerId = typeof entry === 'string' ? entry : entry.tagId;
        const other = tagsById.get(partnerId);
        if (!other) continue;
        expect(other.axis).not.toBe(tag.axis);
      }
    }
  });
```

- [ ] **Step 3: Run the catalog tests — still green (no rule uses object form yet, so the loop body never enters the new branches)**

Run: `npx vitest run pipeline/catalog.test.ts`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add pipeline/catalog.test.ts
git commit -m "$(cat <<'EOF'
test(pipeline): catalog validation walks into object-form pairsWith

Updates the two pairings-validation tests in catalog.test.ts to handle
the PairingRequirement union: resolves partnerId from either string or
object entries, and also verifies every id in requiresOnSource /
requiresOnTarget resolves to a real tag.
EOF
)"
```

---

## Task 5: CLI validator — walk into requires lists

**Files:**
- Modify: `pipeline/scripts/rule-coverage.ts:19-32`

- [ ] **Step 1: Update the `--pairings` branch to handle object form**

Find this block:

```ts
  if (args[0] === '--pairings') {
    let bad = 0;
    for (const t of tagDefs) {
      for (const p of t.pairsWith) {
        if (!tagDefIds.has(p)) {
          console.error(`MISSING: ${t.tagId} pairs with unknown ${p}`);
          bad++;
        }
      }
    }
    if (bad > 0) process.exit(1);
    console.log('All pairings resolve.');
    return;
  }
```

Replace with:

```ts
  if (args[0] === '--pairings') {
    let bad = 0;
    for (const t of tagDefs) {
      for (const entry of t.pairsWith) {
        const partnerId = typeof entry === 'string' ? entry : entry.tagId;
        if (!tagDefIds.has(partnerId)) {
          console.error(`MISSING: ${t.tagId} pairs with unknown ${partnerId}`);
          bad++;
        }
        if (typeof entry === 'object') {
          for (const reqId of entry.requiresOnSource ?? []) {
            if (!tagDefIds.has(reqId)) {
              console.error(`MISSING: ${t.tagId} requiresOnSource references unknown ${reqId}`);
              bad++;
            }
          }
          for (const reqId of entry.requiresOnTarget ?? []) {
            if (!tagDefIds.has(reqId)) {
              console.error(`MISSING: ${t.tagId} requiresOnTarget references unknown ${reqId}`);
              bad++;
            }
          }
        }
      }
    }
    if (bad > 0) process.exit(1);
    console.log('All pairings resolve.');
    return;
  }
```

- [ ] **Step 2: Run the CLI to verify it still resolves all current pairings**

Run: `npm run rule:coverage -- --pairings`
Expected: `All pairings resolve.` and exit code 0.

- [ ] **Step 3: Commit**

```bash
git add pipeline/scripts/rule-coverage.ts
git commit -m "$(cat <<'EOF'
chore(pipeline): rule:coverage --pairings checks requires-lists too

The CLI validator now descends into object-form pairsWith entries and
verifies every id in requiresOnSource / requiresOnTarget resolves to a
real tag, mirroring the catalog.test.ts update.
EOF
)"
```

---

## Task 6: Apply the gate to `condition.cares_creatures_died_this_turn`

**Files:**
- Modify: `pipeline/rules/condition.cares_creatures_died_this_turn.ts:10`

- [ ] **Step 1: Replace the `pairsWith` array with the gated form**

Find:

```ts
  pairsWith: ['effect.sacrifice_creature', 'effect.create_creature_token'],
```

Replace with:

```ts
  pairsWith: [
    'effect.sacrifice_creature',
    {
      tagId: 'effect.create_creature_token',
      requiresOnSource: ['effect.sacrifice_creature', 'effect.sacrifice_permanent'],
    },
  ],
```

- [ ] **Step 2: Run the rule's own tests — unchanged (regex didn't change)**

Run: `npx vitest run pipeline/rules/condition.cares_creatures_died_this_turn.test.ts`
Expected: all green.

- [ ] **Step 3: Run the catalog tests — they will now exercise the new validation branches with this real rule**

Run: `npx vitest run pipeline/catalog.test.ts`
Expected: all green. The new branches in Task 4's updated tests confirm `effect.sacrifice_creature` and `effect.sacrifice_permanent` resolve.

- [ ] **Step 4: Run the CLI validator — same idea, confirms no typos**

Run: `npm run rule:coverage -- --pairings`
Expected: `All pairings resolve.` and exit code 0.

- [ ] **Step 5: Run the whole pipeline test suite**

Run: `npm run test:pipeline`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add pipeline/rules/condition.cares_creatures_died_this_turn.ts
git commit -m "$(cat <<'EOF'
fix(graph): gate cares_creatures_died_this_turn x create_creature_token

The bare pairing edged every token-maker (e.g. Welcome to Sweettooth) to
every morbid/aftermath payoff, even when the token-maker had no way to
turn its tokens into corpses. Gate the pairing on the source also
carrying effect.sacrifice_creature or effect.sacrifice_permanent — the
Aristocrats-shape that the pairing was actually meant to capture.
EOF
)"
```

---

## Task 7: Bump RULE_VERSION and rebuild artifact

**Files:**
- Modify: `shared/version.ts`

- [ ] **Step 1: Bump RULE_VERSION**

Find:

```ts
export const RULE_VERSION = 'v0.13.2';
```

Replace with:

```ts
export const RULE_VERSION = 'v0.13.3';
```

- [ ] **Step 2: Rebuild the artifact**

Run: `npm run build:cards -- --standard`
Expected: success, writes `app/public/data/cards-standard.json`. Note: this hits the Scryfall cache in `.cache/scryfall/` — no network calls unless the cache is missing.

- [ ] **Step 3: Sanity-check the artifact — Welcome to Sweettooth should no longer be in died-this-turn edges**

Run:

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const a = JSON.parse(readFileSync('app/public/data/cards-standard.json', 'utf8'));
const sweet = a.cards.find(c => c.name === 'Welcome to Sweettooth');
if (!sweet) { console.log('Sweettooth not in artifact (set not in build?)'); process.exit(0); }
const morbidEdges = a.edges.filter(e =>
  e.source === sweet.oracleId &&
  e.reason.targetTagId === 'condition.cares_creatures_died_this_turn'
);
console.log('Sweettooth → died_this_turn edges:', morbidEdges.length);
console.log('Sweettooth tags:', sweet.tags.map(t => t.tagId).join(', '));
"
```

Expected: `Sweettooth → died_this_turn edges: 0` (the gate fires because Sweettooth has `effect.create_creature_token` but no sacrifice tags). If Sweettooth isn't in the Standard cards artifact (depends on which set codes are configured), that's fine — the script prints "not in artifact" and exits 0. The gate test in Task 2 is the authoritative regression coverage.

- [ ] **Step 4: Run the full test gate (pipeline + app + build)**

Run: `npm test`
Expected: pipeline tests green, app tests green, `app/npm run build` succeeds (tsc + vite).

- [ ] **Step 5: Commit**

```bash
git add shared/version.ts app/public/data/cards-standard.json
git commit -m "$(cat <<'EOF'
chore(pipeline): bump RULE_VERSION to v0.13.3 + rebuild artifact

Conditional pairings change the edge set (token-makers without sac
outlets lose their died-this-turn edges). Bump invalidates client
IndexedDB caches so users see the new graph on next load.
EOF
)"
```

---

## Self-review

**Spec coverage:**

| Spec section | Task |
|---|---|
| §Design / Schema change | Task 1 |
| §Design / Graph builder change — tagSetByOracleId | Task 3 Step 2 |
| §Design / Graph builder change — pairing normalization with requirements | Task 3 Step 1 |
| §Design / Graph builder change — dedupe most-restrictive | Task 3 Step 1 |
| §Design / Graph builder change — apply gates at edge-emit | Task 3 Steps 3+4 |
| §Design / Validator change | Tasks 4 + 5 |
| §Design / Apply to cares_creatures_died_this_turn | Task 6 |
| §Design / Tests / graph.test.ts | Task 2 |
| §Design / Tests / pairings validator | Task 4 |
| §Design / Version bump | Task 7 |
| §Out of scope (tribe-edge / gated-trigger gates stay) | Honored — Task 3 Step 4 only adds new checks, doesn't touch the existing gates |

All spec items have a task. The validator-fixture test the spec mentioned ("add a fixture catalog with a bogus `requiresOnSource: ['nonexistent.tag']`") is covered functionally by Task 4's loop walking into the requires-lists — every real rule's requires-list is now validated, and the catalog.test.ts assertion would fire if any rule introduced a bogus id. A pure red-herring negative-fixture test would need a synthetic catalog injection that the current `getTagCatalog()` API doesn't support without refactor; not worth the surface for one assertion.

**Placeholder scan:** None. Every step shows the actual code to write, the exact command to run, and the expected output.

**Type consistency:**
- `PairingRequirement` / `PairingEntry` / `requiresMode: 'any' | 'all'` — used identically across Tasks 1, 2, 3, 4, 5.
- `NormalizedPairing` is local to `graph.ts` (Task 3 Step 1) and destructured the same way in the emit loop (Task 3 Step 4).
- `satisfies(set, list, mode)` signature matches across declaration (Task 3 Step 3) and use sites (Task 3 Step 4).
- `tagSetByOracleId` populated in Task 3 Step 2 with type `Map<string, Set<string>>`, read in Task 3 Step 4 — consistent.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-05-25-conditional-pairings.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
