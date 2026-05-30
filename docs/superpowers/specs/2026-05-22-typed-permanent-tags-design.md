# Typed permanent tags (v0.8) — design

**Status:** Approved design, not yet implemented.
**Target version:** `v0.8.0` (bumps `RULE_VERSION`, invalidates client IndexedDB cache).
**Predecessors:** v0.7 (`docs/superpowers/specs/2026-05-21-mechanics-expansion-discovery-design.md`).

## Motivation

The leaves-battlefield / destroy / exile / bounce / sacrifice tag cluster currently produces false-positive edges in the interaction graph. Concrete example: Disenchant ("destroy target artifact or enchantment") is tagged `effect.destroy_permanent`, which pairs with `trigger.permanent_leaves_battlefield`. That trigger matches any "when X leaves the battlefield" text, including "when this creature leaves" — so Disenchant ends up linked to creature-LTB triggers it can never actually fire. The same impurity affects every effect tag in the cluster.

The root cause is that the broad parent tags don't carry the *type* of permanent they touch. We fix this by splitting along a permanent-type axis (creature, artifact, enchantment, planeswalker, land), keeping the broad parent tags as a separate semantic claim (only for genuinely universal language), and wiring the two together via a `children` field on `TagDef`.

## Design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Tag-axis shape | Flat atomic per-type tags (option A) | Consistent with existing pipeline philosophy (one rule, one tag, applied flat). Existing FilterPanel multi-select handles composition at query time. |
| Storage for broad-tag cards | Atomic children + broad parent stored on the card (storage 2) | Broad text ("destroy target permanent") is a real semantic claim, not a roll-up. Future-proof against new permanent types being added. Some triggers genuinely care about "any permanent." |
| Type axis | Five core types: creature, artifact, enchantment, planeswalker, land (option T1) | Faithful to current Standard corpus. Battle is not present in current Standard sets (rotated out with MOM/MAT). Adding a sixth child later is one file change. |
| Modifier handling | Decompose to relevant subset of children (option M1) | The broad parent is reserved for truly universal language. Qualified expressions ("destroy nonland permanent") accurately decompose to the four children they cover. No new schema for modifiers. |

## Scope

In scope — six broad tags split along the permanent-type axis:

- `trigger.permanent_leaves_battlefield`
- `effect.destroy_permanent`
- `effect.exile_from_battlefield`
- `effect.bounce_or_blink`
- `effect.sacrifice_permanent`
- `effect.board_wipe` (kept whole — board wipes are inherently universal)

Out of scope — explicitly deferred:

- ETB triggers (`trigger.self_etb`, `trigger.another_creature_etb`) — same structural opportunity, deferred to a follow-up spec.
- Filter panel parent/child collapse UI — children appear flat in the filter list for v0.8.
- Modifier-as-tag (`nontoken`, `legendary`, `attacking`, `tapped`) — orthogonal axes; their own spec when needed.
- Graveyard / exile-zone effects (`effect.exile_from_graveyard`, `effect.reanimate`) — different cluster.

## Data model

### `TagDef` extension

One field added in `shared/types.ts`:

```ts
export type TagDef = {
  // ...existing fields
  children?: string[];   // when this parent tag is applied, also apply these children
};
```

Semantics:

- `children` lists tag ids of typed children. Children are applied alongside the parent at tag-resolution time.
- Expansion is **one level only**, not recursive. Adding deeper hierarchies would require recursion; deferred.
- Children inherit the parent's `evidence` field (the regex match from the parent rule). Inherited tags are not separately matched against the card text.
- Children of children: not supported. The `catalog.test.ts` consistency check verifies no child also has its own `children` field.

### Tag application post-pass

`applyRules` in `pipeline/rules/runner.ts` returns a flat tag list and stays unchanged. A new post-pass in `pipeline/index.ts` (where tags are computed per card) expands parents into children:

```ts
// pseudocode
const expandedTags = [...appliedTags];
for (const tag of appliedTags) {
  const def = tagCatalog[tag.tagId];
  if (!def.children) continue;
  for (const childId of def.children) {
    if (expandedTags.some(t => t.tagId === childId)) continue; // dedupe
    expandedTags.push({
      tagId: childId,
      axis: tagCatalog[childId].axis,
      evidence: tag.evidence, // inherited
    });
  }
}
```

The dedupe step handles the case where a card's typed child rule matched directly AND the broad parent rule also matched (then expanded). Example: a card whose text triggers both `effect.destroy_creature` (own rule) and `effect.destroy_permanent` (broad rule, with `destroy_creature` in its `children`). The dedupe keeps the first occurrence, preserving the direct rule's evidence over the inherited one.

## Tag taxonomy

### Effects

| Parent (universal-only) | Children (typed) |
|---|---|
| `effect.destroy_permanent` | `effect.destroy_creature`*, `effect.destroy_artifact`†, `effect.destroy_enchantment`†, `effect.destroy_planeswalker`†, `effect.destroy_land`† |
| `effect.exile_from_battlefield` | `effect.exile_creature`†, `effect.exile_artifact`†, `effect.exile_enchantment`†, `effect.exile_planeswalker`†, `effect.exile_land`† |
| `effect.sacrifice_permanent` | `effect.sacrifice_creature`†, `effect.sacrifice_artifact`†, `effect.sacrifice_enchantment`†, `effect.sacrifice_planeswalker`†, `effect.sacrifice_land`† |
| `effect.bounce_or_blink` | `effect.bounce_creature`†, `effect.bounce_artifact`†, `effect.bounce_enchantment`†, `effect.bounce_planeswalker`†, `effect.bounce_land`† |
| `effect.board_wipe` | unchanged — no typed split |

\* Existing rule, kept. Added to parent's `children` list.
† New rule, new file.

### Triggers

| Parent (universal-only) | Children (typed) |
|---|---|
| `trigger.permanent_leaves_battlefield` | `trigger.creature_leaves_battlefield`†, `trigger.artifact_leaves_battlefield`†, `trigger.enchantment_leaves_battlefield`†, `trigger.planeswalker_leaves_battlefield`†, `trigger.land_leaves_battlefield`† |

`trigger.creature_dies` stays **separate** from `trigger.creature_leaves_battlefield`. "Dies" (LTB→graveyard) is strictly narrower than creature-LTB (which also covers exile, bounce, sacrifice). A card with "when this creature dies" gets `creature_dies` only; a card with "when this creature leaves the battlefield" gets `creature_leaves_battlefield`.

### New tag count

- Effect verbs covered: destroy, exile, sacrifice, bounce. 5 types × 4 verbs = 20 typed effect slots. `effect.destroy_creature` already exists; the other 19 are new files.
- 5 new trigger rules (one per type for LTB).
- **Net:** 24 new tags. Catalog goes from 67 → 91.

## Rule split strategy

### Parent rules

Each broad parent rule's regex is narrowed to match **only universal language**. It no longer matches type-specific or qualified expressions. Example for `effect.destroy_permanent`:

- Matches: `destroy target permanent`, `destroy each permanent`, `destroy all permanents`.
- Does **not** match: `destroy target artifact`, `destroy target nonland permanent`, `destroy target enchantment`.

### Child rules

One file per (verb, type) combination. Each child rule has its own regex matching type-specific text. Example for `effect.destroy_enchantment.ts`:

- Matches: `destroy target enchantment`, `destroy all enchantments`.
- Also matches qualified-broad expressions that cover this type: `destroy target nonland permanent`, `destroy target noncreature permanent`. So Disenchant ("destroy target artifact or enchantment") matches both `effect.destroy_artifact` and `effect.destroy_enchantment` rules directly (each rule recognizes itself in the alternation list).

Implication: a card like "destroy target nonland permanent" matches four typed rules directly (`destroy_creature`, `destroy_artifact`, `destroy_enchantment`, `destroy_planeswalker`) and does NOT match the broad `destroy_permanent` parent. This is the M1 design: the broad parent is reserved for truly universal language.

### SELF-trigger handling

For typed LTB child rules, "when this creature leaves the battlefield" needs to know what type the card is. The `Rule.matchCard` hook (already supported in `pipeline/rules/runner.ts`) gives access to `card.types`. The typed trigger rules use `matchCard` for SELF cases:

- `trigger.creature_leaves_battlefield`: matches text `when (this|__SELF__) leaves the battlefield` AND `card.types.includes('creature')`.
- For an artifact creature with self-LTB text: both `trigger.creature_leaves_battlefield` and `trigger.artifact_leaves_battlefield` fire. Accurate to how the trigger actually resolves.
- For non-SELF text ("when an enchantment leaves the battlefield"), the rule uses `match` against the normalized text directly; no card-context dependency.

### Shared constants

A new `pipeline/rules/permanent-types.ts` exports a shared list:

```ts
export const PERMANENT_TYPES = ['creature', 'artifact', 'enchantment', 'planeswalker', 'land'] as const;
export type PermanentType = (typeof PERMANENT_TYPES)[number];
```

Typed rules import this for the modifier-aware alternation (e.g., the "destroy nonland permanent" expansion). A future parametric refactor (along the lines of `pipeline/rules/condition.cares_subtype.ts`) is possible but not necessary for v0.8 — each child rule's regex is small enough to live in its own file.

### `nearMiss` blocks

Each new child rule declares its own `nearMiss: { anchors, proximity, window }` per v0.7+ convention. Anchors and proximity are narrowed to the type-specific words (e.g., `destroy_enchantment.nearMiss = { anchors: ['destroy'], proximity: ['enchantment'], window: 8 }`).

## Graph builder & pairings

No code change in the graph builder. It already handles bidirectional pairings with `(source, target, effectTag, consumerTag)` dedupe.

`pairsWith` rewiring:

**Typed effects → typed triggers (one-to-one):**

| Effect | `pairsWith` |
|---|---|
| `effect.destroy_creature` | `trigger.creature_dies`, `trigger.creature_leaves_battlefield` |
| `effect.destroy_artifact` | `trigger.artifact_leaves_battlefield` |
| `effect.destroy_enchantment` | `trigger.enchantment_leaves_battlefield` |
| `effect.destroy_planeswalker` | `trigger.planeswalker_leaves_battlefield` |
| `effect.destroy_land` | `trigger.land_leaves_battlefield` |
| `effect.exile_creature` | `trigger.creature_dies`, `trigger.creature_leaves_battlefield` |
| `effect.exile_artifact` | `trigger.artifact_leaves_battlefield` |
| `effect.sacrifice_creature` | `trigger.creature_dies`, `trigger.creature_leaves_battlefield` |
| `effect.sacrifice_artifact` | `trigger.artifact_leaves_battlefield` |
| `effect.bounce_creature` | `trigger.creature_dies`, `trigger.creature_leaves_battlefield`, `trigger.another_creature_etb` |
| `effect.bounce_artifact` | `trigger.artifact_leaves_battlefield` |
| ... (same pattern for the remaining typed children — enchantment, planeswalker, land — pair only with their own typed LTB trigger) | |

Two notes on the pattern:

- Only the **creature** typed children pair with `trigger.creature_dies`. Dies is a creature-only trigger; an enchantment leaving the battlefield does not die.
- Only the **creature bounce** variant pairs with `trigger.another_creature_etb` (blink interaction — exile-and-return re-triggers creature ETB). Non-creature bounce variants do not trigger creature ETB.

**Broad effects → broad triggers:**

| Effect | `pairsWith` |
|---|---|
| `effect.destroy_permanent` | `trigger.permanent_leaves_battlefield` |
| `effect.exile_from_battlefield` | `trigger.permanent_leaves_battlefield` |
| `effect.bounce_or_blink` | `trigger.another_creature_etb`, `trigger.permanent_leaves_battlefield` |
| `effect.sacrifice_permanent` | `trigger.permanent_leaves_battlefield` |
| `effect.board_wipe` | `trigger.creature_dies`, `trigger.permanent_leaves_battlefield` |

Because Vindicate has `effect.destroy_permanent` + all five children (via expansion), it pairs with the broad trigger AND every typed trigger AND `trigger.creature_dies`. Disenchant has only `effect.destroy_artifact` + `effect.destroy_enchantment` (no broad parent), so it pairs only with `trigger.artifact_leaves_battlefield` and `trigger.enchantment_leaves_battlefield`. No false-positive creature-LTB edge.

`npm run rule:coverage -- --pairings` validates all references resolve.

## UI behavior

### FilterPanel

No layout change. Tags appear flat in the filter list, sorted by axis then label. New typed tags appear automatically — `FilterPanel.tsx` reads from the artifact's `tagCatalog`. A future spec may add parent/child collapse-expand visual grouping.

Filter semantics (no code change needed):

- Selecting the broad parent in the filter → matches cards with the parent tag (Vindicate, etc.).
- Selecting a typed child → matches cards with that child tag (Disenchant for `destroy_enchantment`, and ALSO Vindicate because expansion gives Vindicate the child tag).

This is the bidirectional behavior described in brainstorming, and it's free given the storage model: no special filter logic, just a flat tag membership check.

### CardDetailDrawer chip rendering

When a card has a parent tag AND all of its children, the drawer collapses to a single parent chip ("Destroys any permanent"). When a card has only some children (Disenchant: `destroy_artifact` + `destroy_enchantment`, no parent), it renders the chips individually.

Implementation: a small helper in `CardDetailDrawer.tsx` that, for each parent tag in `tagCatalog` with a `children` list, checks whether the card has all children present, and collapses if so. Localized — no changes to other UI components.

## Versioning & migration

- `RULE_VERSION` in `pipeline/catalog.ts` bumps to `v0.8.0`.
- Client `IndexedDB` cache invalidates automatically via existing `ruleVersion`-mismatch check on hydrate.
- Artifact regenerates on `npm run build:cards -- --standard`. No card-data changes.
- Coverage metric (`isTaggable %`) should be stable or marginally up — cards that previously matched only the broad rule now also get typed child tags, but `isTaggable` is unchanged.
- CLAUDE.md "Current release: `v0.7.0`" line updates to `v0.8.0`. Tag count updates from 67 to 91.

## Testing strategy

Per CLAUDE.md TDD convention (test → red → impl → green → commit), every new rule gets a `.test.ts` with ≥3 positives + ≥3 negatives via `it.each`.

**New tests:**

- 19 new `effect.*.test.ts` files (typed destroy: 4; typed exile/sacrifice/bounce: 5 each).
- 5 new `trigger.*_leaves_battlefield.test.ts` files (one per type).

**Updated tests:**

- Parent rule tests (`effect.destroy_permanent.test.ts`, `effect.exile_from_battlefield.test.ts`, etc.) gain negative cases for type-specific text ("destroy target artifact" must NOT match the parent).
- `catalog.test.ts` consistency check: every tag in `children: [...]` must exist in the catalog AND must not itself have a `children` field.
- `pipeline/e2e.test.ts` fixture additions: one card per pattern (broad destroy, typed destroy, broad LTB, typed LTB). Assertion that a Disenchant-shaped fixture does NOT produce an edge to a creature-LTB-shaped fixture.

**New end-to-end test:**

- "Vindicate fixture ends up with parent tag + all 5 child tags after the expansion post-pass." Covers children-expansion logic in `pipeline/index.ts`.

**CLI checks (manual + CI):**

- `npm run rule:coverage -- --pairings` runs clean.
- `npm run rule:coverage -- --all` produces the new typed-tag rows.
- Spot-check `rule:coverage -- effect.destroy_enchantment` and `rule:coverage -- trigger.creature_leaves_battlefield` show plausible match counts on the real corpus.

## Risks & mitigations

1. **Edge explosion.** Vindicate-style cards pair with more triggers than before. Mitigation: log edge count and a per-source-tag breakdown after rebuild; if it disproportionately balloons, revisit. Expected: modest increase (existing ~400K edges should grow by O(10K), not O(100K), because the typed pairings are one-to-one and Vindicate-class cards are a small fraction of the corpus).

2. **Regex creep.** One rule splits into five. Mitigation: shared `PERMANENT_TYPES` constant in `pipeline/rules/permanent-types.ts`. Each typed rule's regex stays small. A future parametric refactor is possible if maintenance burden grows.

3. **SELF-trigger ambiguity for multi-type cards.** An artifact-creature with "when this creature leaves the battlefield" applies BOTH `creature_leaves_battlefield` and `artifact_leaves_battlefield`. This is accurate (the trigger actually fires when the card leaves, regardless of which type the observer cares about). Decision documented in tag application; tests cover the multi-type case.

4. **Tag-coverage script regression.** New tags increase the `rule:coverage --all` output length. Not a correctness risk, just a UX one. Mitigation: none required.

5. **Out-of-date CLAUDE.md.** Tag count reference (`67`) and release version (`v0.7.0`) become stale post-merge. Implementation plan updates them.

## Open questions for implementation

None blocking. One minor:

- Whether the `evidence` field on inherited child tags should reference the parent's evidence verbatim, or include a `(inherited from <parent.id>)` prefix. Decision deferred to implementation; the rendering in `CardDetailDrawer` can format either form.
