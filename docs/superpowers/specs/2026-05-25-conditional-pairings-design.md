# Conditional pairings via `pairsWith` object form

**Date:** 2026-05-25
**Status:** Approved, awaiting implementation plan
**Target RULE_VERSION:** `v0.13.3`

## Problem

Pairings declared via `tagDef.pairsWith` are symmetric. Once a pairing is declared, the graph builder forms an edge between every card matching the effect tag and every card matching the consumer tag. This produces over-broad edges when the *intent* of the pairing assumes additional context on one side of the pair that isn't checked.

**Example:** `condition.cares_creatures_died_this_turn` declares `pairsWith: ['effect.sacrifice_creature', 'effect.create_creature_token']`. The intent is the Aristocrats synergy: a card that makes tokens *and* sacrifices them feeds a morbid/aftermath payoff. But the pairing fires on any card with `effect.create_creature_token` regardless of whether the card has a sac outlet. So *Welcome to Sweettooth* — a Saga that produces a Human token but has no sac line — gets edged to every morbid/aftermath payoff card. The token-maker is not actually an enabler for the payoff.

The graph builder already has two hard-coded gates (tribe-edge gate, gated-trigger gate) in `pipeline/graph.ts:79-100` that exist for similar reasons. Both reach into specific tag ids and check metadata on tag matches. Adding a third hard-coded gate would entrench the pattern; we will keep finding cases like this as coverage grows.

## Goals

1. Let a rule express "I pair with X, but only if the source/target also carries one of {Y, Z}."
2. Keep existing rules untouched. The new mechanism is opt-in.
3. Stay simple: tag presence on the same card, no metadata-aware gating (that's the existing hard-coded gates' job, not in scope here).

## Non-goals

- Migrating the existing tribe-edge / gated-trigger gates to the new mechanism. They depend on `metadata.creatureTypes` from tag matches and on cross-card tribe intersection — `requiresOnSource: [...]` can't express that without a richer schema. Out of scope; possible follow-up.
- Negative requirements ("source must NOT have tag X"). No current use case; YAGNI.
- Cross-tag conjunction in matches ("source has tag A AND tag B" expressed via the rule schema). The proposed mechanism is solely a gate on already-tagged cards at edge-emit time.

## Design

### Schema change — `shared/types.ts`

```ts
export type PairingRequirement = {
  tagId: string;
  requiresOnSource?: string[];
  requiresOnTarget?: string[];
  requiresMode?: 'any' | 'all'; // defaults to 'any'
};

export type PairingEntry = string | PairingRequirement;

export type TagDef = {
  // ...existing fields...
  pairsWith: PairingEntry[];
};
```

A bare string entry keeps current semantics (unconditional pairing). An object entry adds gates. `requiresMode` defaults to `'any'` (OR). Setting `requiresMode: 'all'` switches to AND.

### Graph builder change — `pipeline/graph.ts`

**Step 1: build a per-card tag set.** In the existing first pass over cards (the loop that builds `cardsByTag`, `tribesByOracleId`, `narrowingsByOracleId`), also populate `tagSetByOracleId: Map<string, Set<string>>` — the set of tag ids each card carries.

**Step 2: extend pairing normalization** to capture requirements:

```ts
const pairings: Array<{
  effectId: string;
  consumerId: string;
  requiresOnSource?: string[];
  requiresOnTarget?: string[];
  requiresMode: 'any' | 'all';
}> = [];
for (const tag of catalog) {
  for (const entry of tag.pairsWith) {
    const partnerId = typeof entry === 'string' ? entry : entry.tagId;
    const partner = tagDefById.get(partnerId);
    if (!partner) continue;
    const effectId = tag.axis === 'effect' ? tag.tagId : partnerId;
    const consumerId = tag.axis === 'effect' ? partnerId : tag.tagId;
    if (tagDefById.get(effectId)?.axis !== 'effect') continue;
    const requiresOnSource = typeof entry === 'object' ? entry.requiresOnSource : undefined;
    const requiresOnTarget = typeof entry === 'object' ? entry.requiresOnTarget : undefined;
    const requiresMode = (typeof entry === 'object' && entry.requiresMode) || 'any';
    pairings.push({ effectId, consumerId, requiresOnSource, requiresOnTarget, requiresMode });
  }
}
```

**Step 3: dedupe `(effectId, consumerId)` pairs.** Pairings can be declared on both sides of an edge. Today, the graph builder relies on the `seen` set keyed by `(source, target, effectId, consumerId)` to dedupe at emit time. With requirements, we have a stricter problem: if `A.pairsWith` lists `B` as a bare string and `B.pairsWith` lists `A` with `requiresOnSource`, the un-gated bare-string version would emit edges first and the gated version would dedupe to nothing. Fix: when building the `pairings` array, group by `(effectId, consumerId)` and keep the most restrictive entry (any entry with `requiresOnSource` or `requiresOnTarget` wins over a bare string for the same pair). If two entries both have requirements, the implementation may pick either; we don't expect dual-sided gated pairings in practice and the validator will warn if it sees one.

**Step 4: apply gates at edge-emit time.** After the existing tribe-edge and gated-trigger checks in the `(source, target)` loop:

```ts
if (requiresOnSource && !satisfies(tagSetByOracleId.get(source)!, requiresOnSource, requiresMode)) continue;
if (requiresOnTarget && !satisfies(tagSetByOracleId.get(target)!, requiresOnTarget, requiresMode)) continue;
```

with

```ts
function satisfies(tagSet: Set<string>, required: string[], mode: 'any' | 'all'): boolean {
  if (mode === 'all') return required.every((id) => tagSet.has(id));
  return required.some((id) => tagSet.has(id));
}
```

### Validator change — `pipeline/scripts/rule-coverage.ts --pairings`

Currently iterates every `tagDef.pairsWith` entry and verifies the tag id resolves to a real tag in the catalog. Update to:

1. Resolve `entry.tagId` when the entry is an object.
2. Also iterate `requiresOnSource[]` and `requiresOnTarget[]` if present, verifying each id resolves.
3. Report any unresolved id with the rule and side it appeared on.

### Apply to the `cares_creatures_died_this_turn` case

In `pipeline/rules/condition.cares_creatures_died_this_turn.ts`:

```ts
pairsWith: [
  'effect.sacrifice_creature',
  {
    tagId: 'effect.create_creature_token',
    requiresOnSource: ['effect.sacrifice_creature', 'effect.sacrifice_permanent'],
  },
],
```

Default `'any'` mode is correct here: the token-maker source qualifies if it has either sac outlet.

### Tests

**`pipeline/graph.test.ts`** — new test:

- Fixture A: card with `effect.create_creature_token` only.
- Fixture B: card with `effect.create_creature_token` + `effect.sacrifice_creature`.
- Fixture C: card with `condition.cares_creatures_died_this_turn`.
- Assert edge `B → C` exists.
- Assert edge `A → C` does NOT exist.
- Assert the unrelated pairing `effect.sacrifice_creature → condition.cares_creatures_died_this_turn` (declared as a bare string) still forms an edge from B to C (already covered by the dedupe key; the test pins it down).

**Pairings validator** — `pipeline/scripts/rule-coverage.test.ts` (or wherever the validator is tested):

- Add a fixture catalog with a tagDef whose `pairsWith` has `{ tagId: 'real.tag', requiresOnSource: ['nonexistent.tag'] }`.
- Assert the validator flags the bogus id.

**Rule unit tests** (`condition.cares_creatures_died_this_turn.test.ts`) — unchanged. The regex didn't change.

### Version bump

`RULE_VERSION` in `pipeline/catalog.ts`: `v0.13.2` → `v0.13.3`. Existing token-makers without sac outlets lose their died-this-turn edges; the artifact's edge set changes; client IndexedDB caches need invalidation.

## Out of scope (revisited)

The two existing hard-coded gates in `pipeline/graph.ts` (tribe-edge gate at line 79, gated-trigger gate at line 90) stay as-is. They depend on `metadata.creatureTypes` from individual tag matches and on cross-card intersection of tribe sets — `requiresOnSource` / `requiresOnTarget` can't express that without a richer mechanism (e.g., requirements that read tag metadata, or cross-card conditions). Possible follow-up if more metadata-aware gates are needed; not today.

## Open questions

None at design time. Implementation plan should pin down the exact dedupe-group ordering when building the `pairings` array (deterministic across runs) so test output is stable.
