# Typed Permanent Tags v0.8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the leaves-battlefield / destroy / exile / bounce / sacrifice tag cluster along a permanent-type axis (creature, artifact, enchantment, planeswalker, land), eliminate cross-type false-positive edges (e.g., Disenchant linking to creature-LTB triggers), and ship as `v0.8.0`.

**Architecture:** Three phases. Phase 1 lays foundation — `children?: string[]` on `TagDef`, a tag-application post-pass that expands parent → children, and a shared `PERMANENT_TYPES` constant. Phase 2 splits four effect verbs (destroy, exile, sacrifice, bounce) and the LTB trigger by walking each broad parent rule down to typed child rules per the same regex template. Phase 3 wires `pairsWith` declarations, updates the e2e fixture, polishes the `CardDetailDrawer` chip-collapse rendering, bumps `RULE_VERSION`, and updates CLAUDE.md.

**Tech Stack:** Node + TypeScript (`tsx`), Vitest, `graphology` (app side, unchanged), pnpm. No new dependencies. No external API calls.

**Spec:** `docs/superpowers/specs/2026-05-22-typed-permanent-tags-design.md`

---

## File Structure Overview

### Created in Phase 1
- `pipeline/rules/permanent-types.ts` — shared `PERMANENT_TYPES` and `PERMANENT_TYPE_EXCLUDERS` constants.
- `pipeline/tag-expansion.ts` — pure expansion function (`expandChildren`) + tests.
- `pipeline/tag-expansion.test.ts`.

### Created in Phase 2
- `pipeline/rules/effect.destroy_artifact.ts` + `.test.ts`
- `pipeline/rules/effect.destroy_enchantment.ts` + `.test.ts`
- `pipeline/rules/effect.destroy_planeswalker.ts` + `.test.ts`
- `pipeline/rules/effect.destroy_land.ts` + `.test.ts`
- `pipeline/rules/effect.exile_creature.ts` + `.test.ts`
- `pipeline/rules/effect.exile_artifact.ts` + `.test.ts`
- `pipeline/rules/effect.exile_enchantment.ts` + `.test.ts`
- `pipeline/rules/effect.exile_planeswalker.ts` + `.test.ts`
- `pipeline/rules/effect.exile_land.ts` + `.test.ts`
- `pipeline/rules/effect.sacrifice_creature.ts` + `.test.ts`
- `pipeline/rules/effect.sacrifice_artifact.ts` + `.test.ts`
- `pipeline/rules/effect.sacrifice_enchantment.ts` + `.test.ts`
- `pipeline/rules/effect.sacrifice_planeswalker.ts` + `.test.ts`
- `pipeline/rules/effect.sacrifice_land.ts` + `.test.ts`
- `pipeline/rules/effect.bounce_creature.ts` + `.test.ts`
- `pipeline/rules/effect.bounce_artifact.ts` + `.test.ts`
- `pipeline/rules/effect.bounce_enchantment.ts` + `.test.ts`
- `pipeline/rules/effect.bounce_planeswalker.ts` + `.test.ts`
- `pipeline/rules/effect.bounce_land.ts` + `.test.ts`
- `pipeline/rules/trigger.creature_leaves_battlefield.ts` + `.test.ts`
- `pipeline/rules/trigger.artifact_leaves_battlefield.ts` + `.test.ts`
- `pipeline/rules/trigger.enchantment_leaves_battlefield.ts` + `.test.ts`
- `pipeline/rules/trigger.planeswalker_leaves_battlefield.ts` + `.test.ts`
- `pipeline/rules/trigger.land_leaves_battlefield.ts` + `.test.ts`

### Modified in Phase 2
- `pipeline/rules/effect.destroy_creature.ts` + `.test.ts` — broaden regex to also match qualified-broad "permanent" text.
- `pipeline/rules/effect.destroy_permanent.ts` + `.test.ts` — narrow to universal-only + add `children`.
- `pipeline/rules/effect.exile_from_battlefield.ts` + `.test.ts` — narrow to universal-only + add `children`.
- `pipeline/rules/effect.sacrifice_permanent.ts` + `.test.ts` — narrow to universal-only + add `children`.
- `pipeline/rules/effect.bounce_or_blink.ts` + `.test.ts` — narrow to universal-only + add `children`.
- `pipeline/rules/trigger.permanent_leaves_battlefield.ts` + `.test.ts` — narrow to universal-only + add `children`.
- `pipeline/rules/effect.destroy_creature.ts`, `effect.board_wipe.ts` — update `pairsWith` to include typed LTB triggers.

### Modified in Phase 3
- `pipeline/index.ts` — invoke `expandChildren` post-pass after `applyRules`.
- `pipeline/catalog.test.ts` — add consistency check for `children` references.
- `pipeline/e2e.test.ts` — add typed-effect / typed-trigger fixtures + no-cross-type-edge assertion.
- `shared/types.ts` — add `children?: string[]` field to `TagDef`.
- `pipeline/catalog.ts` — bump `RULE_VERSION` to `'v0.8.0'`.
- `app/src/components/CardDetailDrawer.tsx` — collapse "all children present" → single parent chip.
- `app/src/components/CardDetailDrawer.test.tsx` — test for chip collapse (or create if absent).
- `CLAUDE.md` — update version reference and tag count.

---

# Phase 1 — Foundation

Three pieces, all additive. Nothing changes behavior in the existing artifact until Phase 2 starts.

## Task 1.1: Add `children?: string[]` to `TagDef`

**Files:**
- Modify: `shared/types.ts:50-60`

- [ ] **Step 1: Edit `shared/types.ts`**

Replace the `TagDef` type definition (currently lines 50–60) with:

```ts
export type TagDef = {
  tagId: string;
  axis: TagAxis;
  label: string;
  description: string;
  pairsWith: string[];
  // Display grouping. 'interaction' = rules-based trigger/effect chain; 'theme' = deck-
  // strategy enabler/payoff (e.g. tutoring a Shrine for a Shrines-matter deck). Defaults
  // to 'interaction' when unset.
  category?: TagCategory;
  // Typed children. When this parent tag is applied, the tag-expansion post-pass
  // also applies each child id with inherited evidence. Children of children are
  // not supported (single-level expansion). See `pipeline/tag-expansion.ts`.
  children?: string[];
};
```

- [ ] **Step 2: Verify types compile**

Run: `npm run -s build:cards -- --set tdm` (single small set, no rule changes yet — just confirms the type change compiles).
Expected: build succeeds. If TypeScript errors surface elsewhere, address them in this task before moving on (the field is optional so none are expected).

- [ ] **Step 3: Commit**

```bash
git add shared/types.ts
git commit -m "feat(types): add TagDef.children field for typed-tag expansion"
```

---

## Task 1.2: Add shared `PERMANENT_TYPES` constant

**Files:**
- Create: `pipeline/rules/permanent-types.ts`

- [ ] **Step 1: Create the constants file**

Write this content to `pipeline/rules/permanent-types.ts`:

```ts
// pipeline/rules/permanent-types.ts
//
// Shared list of permanent card types used by typed effect/trigger rules.
// Battle (introduced in MOM) is intentionally excluded — current Standard
// has no battles. Add it here and to the relevant parent.children lists
// when a future set re-introduces battles.

export const PERMANENT_TYPES = ['creature', 'artifact', 'enchantment', 'planeswalker', 'land'] as const;

export type PermanentType = (typeof PERMANENT_TYPES)[number];

// Alternation string used in regex negative lookaheads, e.g.
//   "destroy target (?!.*(?:noncreature|nonartifact|...) ) permanents?"
export const PERMANENT_TYPE_EXCLUDERS = PERMANENT_TYPES.map((t) => `non${t}`).join('|');
```

- [ ] **Step 2: Commit**

```bash
git add pipeline/rules/permanent-types.ts
git commit -m "feat(pipeline): add shared PERMANENT_TYPES constant"
```

---

## Task 1.3: Tag-expansion post-pass — tests

**Files:**
- Create: `pipeline/tag-expansion.test.ts`

- [ ] **Step 1: Write the failing tests**

Write this content to `pipeline/tag-expansion.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { CardTag, TagDef } from '../shared/types';
import { expandChildren } from './tag-expansion';

const catalog: Record<string, TagDef> = {
  'effect.destroy_permanent': {
    tagId: 'effect.destroy_permanent',
    axis: 'effect',
    label: 'Destroys any permanent',
    description: '',
    pairsWith: [],
    children: [
      'effect.destroy_creature',
      'effect.destroy_artifact',
      'effect.destroy_enchantment',
      'effect.destroy_planeswalker',
      'effect.destroy_land',
    ],
  },
  'effect.destroy_creature': {
    tagId: 'effect.destroy_creature', axis: 'effect', label: '', description: '', pairsWith: [],
  },
  'effect.destroy_artifact': {
    tagId: 'effect.destroy_artifact', axis: 'effect', label: '', description: '', pairsWith: [],
  },
  'effect.destroy_enchantment': {
    tagId: 'effect.destroy_enchantment', axis: 'effect', label: '', description: '', pairsWith: [],
  },
  'effect.destroy_planeswalker': {
    tagId: 'effect.destroy_planeswalker', axis: 'effect', label: '', description: '', pairsWith: [],
  },
  'effect.destroy_land': {
    tagId: 'effect.destroy_land', axis: 'effect', label: '', description: '', pairsWith: [],
  },
};

describe('expandChildren', () => {
  it('adds typed children for a parent tag with inherited evidence', () => {
    const tags: CardTag[] = [
      { tagId: 'effect.destroy_permanent', axis: 'effect', evidence: 'destroy target permanent' },
    ];
    const expanded = expandChildren(tags, catalog);
    const ids = expanded.map((t) => t.tagId).sort();
    expect(ids).toEqual([
      'effect.destroy_artifact',
      'effect.destroy_creature',
      'effect.destroy_enchantment',
      'effect.destroy_land',
      'effect.destroy_permanent',
      'effect.destroy_planeswalker',
    ]);
    const artifactTag = expanded.find((t) => t.tagId === 'effect.destroy_artifact');
    expect(artifactTag?.evidence).toBe('destroy target permanent');
  });

  it('dedupes when a child was already matched directly', () => {
    const tags: CardTag[] = [
      { tagId: 'effect.destroy_permanent', axis: 'effect', evidence: 'destroy target permanent' },
      { tagId: 'effect.destroy_creature', axis: 'effect', evidence: 'destroy target creature' },
    ];
    const expanded = expandChildren(tags, catalog);
    const creatureTags = expanded.filter((t) => t.tagId === 'effect.destroy_creature');
    expect(creatureTags).toHaveLength(1);
    expect(creatureTags[0]?.evidence).toBe('destroy target creature');
  });

  it('is a no-op when no parent has children', () => {
    const tags: CardTag[] = [
      { tagId: 'effect.destroy_creature', axis: 'effect', evidence: 'destroy target creature' },
    ];
    const expanded = expandChildren(tags, catalog);
    expect(expanded).toEqual(tags);
  });

  it('does not recurse into children-of-children', () => {
    const nestedCatalog: Record<string, TagDef> = {
      'a.parent': { tagId: 'a.parent', axis: 'effect', label: '', description: '', pairsWith: [], children: ['a.child'] },
      'a.child': { tagId: 'a.child', axis: 'effect', label: '', description: '', pairsWith: [], children: ['a.grandchild'] },
      'a.grandchild': { tagId: 'a.grandchild', axis: 'effect', label: '', description: '', pairsWith: [] },
    };
    const tags: CardTag[] = [{ tagId: 'a.parent', axis: 'effect', evidence: 'p' }];
    const expanded = expandChildren(tags, nestedCatalog);
    const ids = expanded.map((t) => t.tagId).sort();
    expect(ids).toEqual(['a.child', 'a.parent']);
  });

  it('ignores parent tags that reference unknown child ids gracefully', () => {
    const brokenCatalog: Record<string, TagDef> = {
      'a.parent': { tagId: 'a.parent', axis: 'effect', label: '', description: '', pairsWith: [], children: ['a.missing'] },
    };
    const tags: CardTag[] = [{ tagId: 'a.parent', axis: 'effect', evidence: 'p' }];
    const expanded = expandChildren(tags, brokenCatalog);
    // Child is applied even if the catalog lookup is undefined — axis falls back to
    // the parent's axis. The catalog consistency test (catalog.test.ts) catches
    // these at build time, so this case should never surface in production.
    expect(expanded.map((t) => t.tagId).sort()).toEqual(['a.missing', 'a.parent']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run pipeline/tag-expansion.test.ts`
Expected: FAIL — `Cannot find module './tag-expansion'`.

---

## Task 1.4: Tag-expansion post-pass — implementation

**Files:**
- Create: `pipeline/tag-expansion.ts`

- [ ] **Step 1: Implement the function**

Write this content to `pipeline/tag-expansion.ts`:

```ts
// pipeline/tag-expansion.ts
//
// Expand parent tags into typed child tags. Runs after `applyRules` in the
// per-card tagging step (see `pipeline/index.ts`). Single-level expansion
// only — children of children are not recursed.
//
// When a parent tag and a direct-match child both appear in the input, the
// direct match wins (its evidence is preserved). When only the parent appears,
// children inherit the parent's evidence.

import type { CardTag, TagDef } from '../shared/types';

export function expandChildren(
  tags: CardTag[],
  catalog: Record<string, TagDef>,
): CardTag[] {
  const seen = new Set(tags.map((t) => t.tagId));
  const result = [...tags];

  for (const tag of tags) {
    const def = catalog[tag.tagId];
    if (!def?.children?.length) continue;
    for (const childId of def.children) {
      if (seen.has(childId)) continue;
      seen.add(childId);
      const childDef = catalog[childId];
      result.push({
        tagId: childId,
        axis: childDef?.axis ?? tag.axis,
        evidence: tag.evidence,
      });
    }
  }

  return result;
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run pipeline/tag-expansion.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 3: Commit**

```bash
git add pipeline/tag-expansion.ts pipeline/tag-expansion.test.ts
git commit -m "feat(pipeline): add expandChildren post-pass for typed-tag expansion"
```

---

## Task 1.5: Wire the post-pass into the pipeline

**Files:**
- Modify: `pipeline/index.ts` (find the call site of `applyRules`)

- [ ] **Step 1: Locate the call site**

Run: `grep -n "applyRules" pipeline/index.ts`
Expected: one or two matches. Note the line number(s).

- [ ] **Step 2: Read 20 lines around the call site**

Use the Read tool on `pipeline/index.ts` at the lines you just found, with `limit: 30`. Identify:
- The variable name holding the result of `applyRules(...)`.
- Whether `tagCatalog` (or an equivalent index) is already imported in this file.

- [ ] **Step 3: Build a `Record<string, TagDef>` index of the catalog**

Near the top of the per-card loop (or once at the start of the pipeline run), add:

```ts
import { tagCatalog } from './catalog';
import { expandChildren } from './tag-expansion';

// once, before the per-card loop:
const tagDefById: Record<string, TagDef> = Object.fromEntries(
  tagCatalog.map((d) => [d.tagId, d]),
);
```

(If `tagCatalog` is already imported, only add the `expandChildren` import. Also add `TagDef` to the existing `shared/types` import if missing.)

- [ ] **Step 4: Wrap the `applyRules` result with `expandChildren`**

Replace the line that assigns from `applyRules` with the same assignment piped through `expandChildren`. Example diff (your line numbers will differ):

```ts
// Before
const tags = applyRules(normalized, card, allRules);

// After
const tags = expandChildren(applyRules(normalized, card, allRules), tagDefById);
```

- [ ] **Step 5: Run the pipeline against a small set to verify it still works**

Run: `npm run -s build:cards -- --set tdm`
Expected: build succeeds. Artifact `app/public/data/cards-tdm.json` exists.

- [ ] **Step 6: Run the full unit suite to verify nothing regressed**

Run: `npm test`
Expected: PASS. No new failures. (Tag counts on real cards are unchanged because no parent yet declares `children`.)

- [ ] **Step 7: Commit**

```bash
git add pipeline/index.ts
git commit -m "feat(pipeline): wire expandChildren into per-card tagging"
```

---

## Task 1.6: Catalog consistency test for `children` references

**Files:**
- Modify: `pipeline/catalog.test.ts`

- [ ] **Step 1: Read the existing catalog test**

Use Read on `pipeline/catalog.test.ts`. Note the existing `describe` block and import pattern.

- [ ] **Step 2: Add a new `describe` block**

Append this block to `pipeline/catalog.test.ts` (preserving existing tests):

```ts
describe('TagDef.children consistency', () => {
  const byId = new Map(tagCatalog.map((d) => [d.tagId, d] as const));

  it('every child id referenced in a parent.children list exists in the catalog', () => {
    for (const def of tagCatalog) {
      if (!def.children) continue;
      for (const childId of def.children) {
        expect(byId.has(childId), `${def.tagId} declares child ${childId} which is not in the catalog`).toBe(true);
      }
    }
  });

  it('children do not themselves declare children (single-level expansion only)', () => {
    for (const def of tagCatalog) {
      if (!def.children) continue;
      for (const childId of def.children) {
        const child = byId.get(childId);
        expect(child?.children, `${childId} (a child of ${def.tagId}) must not have its own children`).toBeFalsy();
      }
    }
  });
});
```

(If `tagCatalog` is not yet imported in this file, add `import { tagCatalog } from './catalog';` at the top. Adjust the existing `import` line that may already reference it.)

- [ ] **Step 3: Run the test — should pass on current catalog**

Run: `npx vitest run pipeline/catalog.test.ts`
Expected: PASS. (No parent yet declares `children`, so both loops are vacuously true.)

- [ ] **Step 4: Commit**

```bash
git add pipeline/catalog.test.ts
git commit -m "test(catalog): assert TagDef.children references resolve and are leaves"
```

---

# Phase 2 — Rule splits

Phase 2 is repetitive by design. Each verb cluster follows the same shape:

1. Update the existing parent rule's regex to match only **type-universal** language (no `non<type>` modifier in front of `permanent`).
2. Update the parent's tests so type-specific text NO LONGER matches.
3. Update the parent's `tagDef` to declare `children: [...]`.
4. For each typed child (4 for destroy since `destroy_creature` exists; 5 for the other verbs and for the LTB trigger): write tests → write rule.
5. Update existing typed `effect.destroy_creature` to also match qualified-broad text.

Pairings (`pairsWith`) are touched once per task as the typed children are added. The final pairings audit is in Phase 3.

**Regex template for typed children.** Every typed child rule has two patterns. For an effect verb `<VERB>` and a target type `<TYPE>`:

- **Pattern A — own type:** `\b<VERB>(?:s|es)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?<TYPE>s?\b`
- **Pattern B — type-inclusive broad:** `\b<VERB>(?:s|es)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}non<TYPE>\s+)(?:[\w\-]+\s+){0,5}?permanents?\b`

Pattern B's negative lookahead disallows `non<TYPE>` appearing in the next ~5 tokens before `permanent`. This is the rule that lets the typed child match qualified-broad text ("destroy target nonland permanent" matches `destroy_creature`, `destroy_artifact`, `destroy_enchantment`, `destroy_planeswalker` — but NOT `destroy_land`).

**Regex template for the parent.** For verb `<VERB>`:

- `\b<VERB>(?:s|es)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}(?:noncreature|nonartifact|nonenchantment|nonplaneswalker|nonland)\s+)(?:[\w\-]+\s+){0,5}?permanents?\b`

The parent matches universal `permanent` language EXCEPT when preceded by any `non<type>` modifier. (`nontoken` is allowed — token isn't a permanent type.)

**Exile and bounce have extra patterns.** Exile keeps the "replacement" form (`would die ... exile it instead`); bounce keeps the "blink" form (`exile ... then return`). Both are documented in the task that handles them.

The tasks below give the **complete regex** and **complete test code** for each rule.

---

## Task 2.1: Update `effect.destroy_creature` regex + tests

`destroy_creature` already exists. We broaden its regex to also match qualified-broad "permanent" text (so it picks up "destroy target nonland permanent" / Vindicate-style cards). The existing own-type pattern stays.

**Files:**
- Modify: `pipeline/rules/effect.destroy_creature.ts`
- Modify: `pipeline/rules/effect.destroy_creature.test.ts`

- [ ] **Step 1: Update the test file**

Replace the contents of `pipeline/rules/effect.destroy_creature.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_creature';

describe('effect.destroy_creature', () => {
  it.each([
    // Own-type cases
    ['destroy target creature'],
    ['destroy target tapped creature'],
    ['destroy all creatures'],
    ['destroy each creature with flying'],
    ['destroy up to two target creatures'],
    // Type-inclusive broad cases (creature is included)
    ['destroy target permanent'],
    ['destroy all permanents'],
    ['destroy target nonland permanent'],
    ['destroy each nontoken permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // noncreature explicitly excludes creature
    ['destroy target noncreature permanent'],
    ['destroy each noncreature, nontoken permanent'],
    // Wrong verb
    ['exile target creature'],
    ['return target creature to its owner\'s hand'],
    // No verb / unrelated
    ['target creature gets -3/-3 until end of turn'],
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect failure on the new positives**

Run: `npx vitest run pipeline/rules/effect.destroy_creature.test.ts`
Expected: FAIL on the type-inclusive broad cases (current regex matches only `creatures?` as the noun).

- [ ] **Step 3: Update the rule**

Replace the contents of `pipeline/rules/effect.destroy_creature.ts` with:

```ts
// pipeline/rules/effect.destroy_creature.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.destroy_creature',
  axis: 'effect',
  label: 'Destroys a creature',
  description: 'Destroys a target creature — directly, in a board wipe scoped to creatures, or via a broad effect like "destroy target permanent" that necessarily covers creatures.',
  pairsWith: ['trigger.creature_dies', 'trigger.creature_leaves_battlefield'],
};

// Pattern A: own type.
const PATTERN_OWN =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?creatures?\b/;

// Pattern B: type-inclusive broad ("destroy ... permanent" without a "noncreature" modifier).
const PATTERN_BROAD =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}noncreature\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.destroy_creature',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['destroy'], proximity: ['creature', 'permanent'], window: 8 },
};
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run pipeline/rules/effect.destroy_creature.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite to catch regressions**

Run: `npm test`
Expected: PASS. (Some other tests may temporarily change if they depend on `effect.destroy_creature` not firing on broad text — fix them in this task if any surface.)

- [ ] **Step 6: Commit**

```bash
git add pipeline/rules/effect.destroy_creature.ts pipeline/rules/effect.destroy_creature.test.ts
git commit -m "feat(rules): destroy_creature also matches qualified-broad 'permanent' text"
```

---

## Task 2.2: Create `effect.destroy_artifact`

**Files:**
- Create: `pipeline/rules/effect.destroy_artifact.ts`
- Create: `pipeline/rules/effect.destroy_artifact.test.ts`

- [ ] **Step 1: Write the test file**

Write this content to `pipeline/rules/effect.destroy_artifact.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_artifact';

describe('effect.destroy_artifact', () => {
  it.each([
    // Own-type
    ['destroy target artifact'],
    ['destroy all artifacts'],
    ['destroy target artifact or enchantment'],
    ['destroy each artifact with mana value 3 or less'],
    // Type-inclusive broad
    ['destroy target permanent'],
    ['destroy target nonland permanent'],
    ['destroy target noncreature permanent'],
    ['destroy each nontoken permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // nonartifact explicitly excludes artifact
    ['destroy target nonartifact permanent'],
    // Wrong type / verb
    ['destroy target creature'],
    ['destroy target enchantment'],
    ['exile target artifact'],
    ['sacrifice an artifact'],
    // No verb
    ['artifact creatures you control have flying'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect module-not-found**

Run: `npx vitest run pipeline/rules/effect.destroy_artifact.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write the rule file**

Write this content to `pipeline/rules/effect.destroy_artifact.ts`:

```ts
// pipeline/rules/effect.destroy_artifact.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.destroy_artifact',
  axis: 'effect',
  label: 'Destroys an artifact',
  description: 'Destroys a target artifact — directly, in a multi-type "artifact or enchantment" effect, or via a broad effect like "destroy target permanent" that covers artifacts.',
  pairsWith: ['trigger.artifact_leaves_battlefield'],
};

// Pattern A: own type (and common multi-type "artifact or enchantment" phrasing).
const PATTERN_OWN =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?artifacts?\b/;

// Pattern B: type-inclusive broad.
const PATTERN_BROAD =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonartifact\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.destroy_artifact',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['destroy'], proximity: ['artifact', 'permanent'], window: 8 },
};
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run pipeline/rules/effect.destroy_artifact.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pipeline/rules/effect.destroy_artifact.ts pipeline/rules/effect.destroy_artifact.test.ts
git commit -m "feat(rules): add effect.destroy_artifact typed child"
```

---

## Task 2.3: Create `effect.destroy_enchantment`

**Files:**
- Create: `pipeline/rules/effect.destroy_enchantment.ts`
- Create: `pipeline/rules/effect.destroy_enchantment.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_enchantment';

describe('effect.destroy_enchantment', () => {
  it.each([
    ['destroy target enchantment'],
    ['destroy all enchantments'],
    ['destroy target enchantment or artifact'],
    ['destroy target artifact or enchantment'],
    ['destroy each enchantment you don\'t control'],
    ['destroy target permanent'],
    ['destroy target nonland permanent'],
    ['destroy target noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['destroy target nonenchantment permanent'],
    ['destroy target creature'],
    ['destroy target artifact'],
    ['exile target enchantment'],
    ['return target enchantment to its owner\'s hand'],
    ['enchanted creature gets +1/+1'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect module-not-found**

Run: `npx vitest run pipeline/rules/effect.destroy_enchantment.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write the rule file**

```ts
// pipeline/rules/effect.destroy_enchantment.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.destroy_enchantment',
  axis: 'effect',
  label: 'Destroys an enchantment',
  description: 'Destroys a target enchantment — directly, in an "artifact or enchantment" effect, or via a broad effect like "destroy target permanent".',
  pairsWith: ['trigger.enchantment_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?enchantments?\b/;

const PATTERN_BROAD =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonenchantment\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.destroy_enchantment',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['destroy'], proximity: ['enchantment', 'permanent'], window: 8 },
};
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run pipeline/rules/effect.destroy_enchantment.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/effect.destroy_enchantment.ts pipeline/rules/effect.destroy_enchantment.test.ts
git commit -m "feat(rules): add effect.destroy_enchantment typed child"
```

---

## Task 2.4: Create `effect.destroy_planeswalker`

**Files:**
- Create: `pipeline/rules/effect.destroy_planeswalker.ts`
- Create: `pipeline/rules/effect.destroy_planeswalker.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_planeswalker';

describe('effect.destroy_planeswalker', () => {
  it.each([
    ['destroy target planeswalker'],
    ['destroy all planeswalkers'],
    ['destroy target creature or planeswalker'],
    ['destroy target permanent'],
    ['destroy target nonland permanent'],
    ['destroy target noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['destroy target nonplaneswalker permanent'],
    ['destroy target creature'],
    ['exile target planeswalker'],
    ['planeswalker abilities you activate cost 1 less'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/effect.destroy_planeswalker.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write the rule**

```ts
// pipeline/rules/effect.destroy_planeswalker.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.destroy_planeswalker',
  axis: 'effect',
  label: 'Destroys a planeswalker',
  description: 'Destroys a target planeswalker — directly, in a "creature or planeswalker" effect, or via a broad effect like "destroy target permanent".',
  pairsWith: ['trigger.planeswalker_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?planeswalkers?\b/;

const PATTERN_BROAD =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonplaneswalker\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.destroy_planeswalker',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['destroy'], proximity: ['planeswalker', 'permanent'], window: 8 },
};
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run pipeline/rules/effect.destroy_planeswalker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/effect.destroy_planeswalker.ts pipeline/rules/effect.destroy_planeswalker.test.ts
git commit -m "feat(rules): add effect.destroy_planeswalker typed child"
```

---

## Task 2.5: Create `effect.destroy_land`

**Files:**
- Create: `pipeline/rules/effect.destroy_land.ts`
- Create: `pipeline/rules/effect.destroy_land.test.ts`

Land is the special case: most qualified-broad phrasings (`nonland permanent`) EXCLUDE land, so the broad pattern matches only the truly universal phrasing.

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_land';

describe('effect.destroy_land', () => {
  it.each([
    ['destroy target land'],
    ['destroy all lands'],
    ['destroy target nonbasic land'],
    ['destroy target permanent'],
    ['destroy each nontoken permanent'],
    ['destroy target noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['destroy target nonland permanent'],
    ['destroy target creature'],
    ['destroy target artifact'],
    ['sacrifice a land'],
    ['target land becomes a 4/4 elemental creature'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/effect.destroy_land.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write the rule**

```ts
// pipeline/rules/effect.destroy_land.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.destroy_land',
  axis: 'effect',
  label: 'Destroys a land',
  description: 'Destroys a target land — directly, via a basic/nonbasic land destruction effect, or via a broad effect like "destroy target permanent".',
  pairsWith: ['trigger.land_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?lands?\b/;

const PATTERN_BROAD =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonland\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.destroy_land',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['destroy'], proximity: ['land', 'permanent'], window: 8 },
};
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run pipeline/rules/effect.destroy_land.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/effect.destroy_land.ts pipeline/rules/effect.destroy_land.test.ts
git commit -m "feat(rules): add effect.destroy_land typed child"
```

---

## Task 2.6: Narrow `effect.destroy_permanent` parent + declare children

**Files:**
- Modify: `pipeline/rules/effect.destroy_permanent.ts`
- Modify: `pipeline/rules/effect.destroy_permanent.test.ts`

- [ ] **Step 1: Replace the test file**

Replace the contents of `pipeline/rules/effect.destroy_permanent.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_permanent';

describe('effect.destroy_permanent (parent, universal-only)', () => {
  it.each([
    // Truly universal — no type-restricting modifier
    ['destroy target permanent'],
    ['destroy all permanents'],
    ['destroy each permanent'],
    ['destroy up to two target permanents'],
    // nontoken doesn't restrict type, so universal applies
    ['destroy target nontoken permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Type-restricting modifiers — parent must NOT match these
    ['destroy target nonland permanent'],
    ['destroy target nonartifact permanent'],
    ['destroy target nonenchantment permanent'],
    ['destroy target noncreature permanent'],
    ['destroy target nonplaneswalker permanent'],
    // Type-specific — parent must NOT match these
    ['destroy target creature'],
    ['destroy target artifact'],
    ['destroy target enchantment'],
    ['destroy target planeswalker'],
    ['destroy target land'],
    // Wrong verb
    ['exile target permanent'],
    ['return target permanent to its owner\'s hand'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/effect.destroy_permanent.test.ts`
Expected: FAIL on the new negative cases (current regex still matches `destroy target artifact` and `destroy target nonland permanent`).

- [ ] **Step 3: Replace the rule file**

Replace the contents of `pipeline/rules/effect.destroy_permanent.ts` with:

```ts
// pipeline/rules/effect.destroy_permanent.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.destroy_permanent',
  axis: 'effect',
  label: 'Destroys any permanent',
  description: 'Destroys a permanent without type restriction (e.g., "destroy target permanent", Vindicate-style). Type-specific destruction is tagged on the typed children (effect.destroy_creature / _artifact / _enchantment / _planeswalker / _land), which the tag-expansion post-pass applies alongside this parent.',
  pairsWith: ['trigger.permanent_leaves_battlefield'],
  children: [
    'effect.destroy_creature',
    'effect.destroy_artifact',
    'effect.destroy_enchantment',
    'effect.destroy_planeswalker',
    'effect.destroy_land',
  ],
};

// Match "destroy ... permanent" only when no type-restricting `non<type>` modifier
// appears in the preceding ~5 tokens.
const PATTERN =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}(?:noncreature|nonartifact|nonenchantment|nonplaneswalker|nonland)\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.destroy_permanent',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['destroy'],
    proximity: ['permanent'],
    window: 8,
  },
};
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run pipeline/rules/effect.destroy_permanent.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite — full destroy cluster should be consistent now**

Run: `npm test`
Expected: PASS. The catalog-consistency test from Task 1.6 now sees real children references and validates them.

- [ ] **Step 6: Spot-check coverage on a real card**

Run: `npm run rule:coverage -- effect.destroy_permanent`
Inspect: the printed positives should be Vindicate-style "destroy target permanent" cards, NOT type-specific destruction.

Run: `npm run rule:coverage -- effect.destroy_artifact`
Inspect: positives should include "destroy target artifact" cards AND Vindicate-style cards (because they have the typed child via expansion / direct broad-pattern match).

- [ ] **Step 7: Commit**

```bash
git add pipeline/rules/effect.destroy_permanent.ts pipeline/rules/effect.destroy_permanent.test.ts
git commit -m "feat(rules): narrow destroy_permanent to universal-only + declare typed children"
```

---

## Task 2.7: Create `effect.exile_creature`

**Files:**
- Create: `pipeline/rules/effect.exile_creature.ts`
- Create: `pipeline/rules/effect.exile_creature.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_creature';

describe('effect.exile_creature', () => {
  it.each([
    ['exile target creature'],
    ['exile target attacking creature'],
    ['exile all creatures'],
    ['exile each creature with mana value 3 or less'],
    // Replacement form
    ['if a creature would die, exile it instead'],
    ['if that creature would die this turn, exile it instead'],
    // Broad / qualified-broad including creature
    ['exile target permanent'],
    ['exile target nonland permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target noncreature permanent'],
    ['exile target artifact'],
    ['exile target enchantment'],
    ['destroy target creature'],
    ['return target creature to its owner\'s hand'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/effect.exile_creature.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write the rule**

```ts
// pipeline/rules/effect.exile_creature.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_creature',
  axis: 'effect',
  label: 'Exiles a creature',
  description: 'Exiles a target creature from the battlefield, including replacement effects that exile instead of die.',
  pairsWith: ['trigger.creature_dies', 'trigger.creature_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?creatures?(?! cards?)\b/;

const PATTERN_BROAD =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}noncreature\s+)(?:[\w\-]+\s+){0,5}?(?:nonland\s+|nontoken\s+)?permanents?(?! cards?)\b/;

// Replacement: "if [a creature|it|that creature] would die ... exile [it|that creature] instead"
const PATTERN_REPLACEMENT =
  /(?:would die|would be destroyed)[^.]*?,\s+exile (?:it|that creature|them) instead/;

export const rule: Rule = {
  id: 'effect.exile_creature',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD) ?? t.match(PATTERN_REPLACEMENT);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['exile'], proximity: ['creature', 'permanent', 'die'], window: 10 },
};
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run pipeline/rules/effect.exile_creature.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/effect.exile_creature.ts pipeline/rules/effect.exile_creature.test.ts
git commit -m "feat(rules): add effect.exile_creature typed child"
```

---

## Task 2.8: Create `effect.exile_artifact`

**Files:**
- Create: `pipeline/rules/effect.exile_artifact.ts`
- Create: `pipeline/rules/effect.exile_artifact.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_artifact';

describe('effect.exile_artifact', () => {
  it.each([
    ['exile target artifact'],
    ['exile all artifacts'],
    ['exile target artifact or enchantment'],
    ['exile target permanent'],
    ['exile target nonland permanent'],
    ['exile target noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target nonartifact permanent'],
    ['exile target creature'],
    ['exile target artifact card from a graveyard'],
    ['destroy target artifact'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/effect.exile_artifact.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write the rule**

```ts
// pipeline/rules/effect.exile_artifact.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_artifact',
  axis: 'effect',
  label: 'Exiles an artifact',
  description: 'Exiles a target artifact from the battlefield, including multi-type "artifact or enchantment" effects.',
  pairsWith: ['trigger.artifact_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?artifacts?(?! cards?)\b/;

const PATTERN_BROAD =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonartifact\s+)(?:[\w\-]+\s+){0,5}?permanents?(?! cards?)\b/;

export const rule: Rule = {
  id: 'effect.exile_artifact',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['exile'], proximity: ['artifact', 'permanent'], window: 8 },
};
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run pipeline/rules/effect.exile_artifact.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/effect.exile_artifact.ts pipeline/rules/effect.exile_artifact.test.ts
git commit -m "feat(rules): add effect.exile_artifact typed child"
```

---

## Task 2.9: Create `effect.exile_enchantment`

**Files:**
- Create: `pipeline/rules/effect.exile_enchantment.ts`
- Create: `pipeline/rules/effect.exile_enchantment.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_enchantment';

describe('effect.exile_enchantment', () => {
  it.each([
    ['exile target enchantment'],
    ['exile all enchantments'],
    ['exile target artifact or enchantment'],
    ['exile target permanent'],
    ['exile target nonland permanent'],
    ['exile target noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target nonenchantment permanent'],
    ['exile target creature'],
    ['exile target enchantment card from a graveyard'],
    ['destroy target enchantment'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/effect.exile_enchantment.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write the rule**

```ts
// pipeline/rules/effect.exile_enchantment.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_enchantment',
  axis: 'effect',
  label: 'Exiles an enchantment',
  description: 'Exiles a target enchantment from the battlefield, including multi-type "artifact or enchantment" effects.',
  pairsWith: ['trigger.enchantment_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?enchantments?(?! cards?)\b/;

const PATTERN_BROAD =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonenchantment\s+)(?:[\w\-]+\s+){0,5}?permanents?(?! cards?)\b/;

export const rule: Rule = {
  id: 'effect.exile_enchantment',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['exile'], proximity: ['enchantment', 'permanent'], window: 8 },
};
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run pipeline/rules/effect.exile_enchantment.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/effect.exile_enchantment.ts pipeline/rules/effect.exile_enchantment.test.ts
git commit -m "feat(rules): add effect.exile_enchantment typed child"
```

---

## Task 2.10: Create `effect.exile_planeswalker` and `effect.exile_land`

Bundled — same template, two files each, mechanical.

**Files:**
- Create: `pipeline/rules/effect.exile_planeswalker.ts` + `.test.ts`
- Create: `pipeline/rules/effect.exile_land.ts` + `.test.ts`

- [ ] **Step 1: Write `effect.exile_planeswalker.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_planeswalker';

describe('effect.exile_planeswalker', () => {
  it.each([
    ['exile target planeswalker'],
    ['exile target creature or planeswalker'],
    ['exile target permanent'],
    ['exile target nonland permanent'],
    ['exile target noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target nonplaneswalker permanent'],
    ['exile target creature'],
    ['exile target planeswalker card from a graveyard'],
    ['destroy target planeswalker'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Write `effect.exile_planeswalker.ts`**

```ts
// pipeline/rules/effect.exile_planeswalker.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_planeswalker',
  axis: 'effect',
  label: 'Exiles a planeswalker',
  description: 'Exiles a target planeswalker from the battlefield, including "creature or planeswalker" effects.',
  pairsWith: ['trigger.planeswalker_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?planeswalkers?(?! cards?)\b/;

const PATTERN_BROAD =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonplaneswalker\s+)(?:[\w\-]+\s+){0,5}?permanents?(?! cards?)\b/;

export const rule: Rule = {
  id: 'effect.exile_planeswalker',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['exile'], proximity: ['planeswalker', 'permanent'], window: 8 },
};
```

- [ ] **Step 3: Write `effect.exile_land.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_land';

describe('effect.exile_land', () => {
  it.each([
    ['exile target land'],
    ['exile target nonbasic land'],
    ['exile all lands'],
    ['exile target permanent'],
    ['exile target noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target nonland permanent'],
    ['exile target creature'],
    ['exile target land card from a graveyard'],
    ['destroy target land'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 4: Write `effect.exile_land.ts`**

```ts
// pipeline/rules/effect.exile_land.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_land',
  axis: 'effect',
  label: 'Exiles a land',
  description: 'Exiles a target land from the battlefield.',
  pairsWith: ['trigger.land_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?lands?(?! cards?)\b/;

const PATTERN_BROAD =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonland\s+)(?:[\w\-]+\s+){0,5}?permanents?(?! cards?)\b/;

export const rule: Rule = {
  id: 'effect.exile_land',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['exile'], proximity: ['land', 'permanent'], window: 8 },
};
```

- [ ] **Step 5: Verify both files green**

Run: `npx vitest run pipeline/rules/effect.exile_planeswalker.test.ts pipeline/rules/effect.exile_land.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pipeline/rules/effect.exile_planeswalker.ts pipeline/rules/effect.exile_planeswalker.test.ts pipeline/rules/effect.exile_land.ts pipeline/rules/effect.exile_land.test.ts
git commit -m "feat(rules): add effect.exile_planeswalker and effect.exile_land typed children"
```

---

## Task 2.11: Narrow `effect.exile_from_battlefield` parent + declare children

**Files:**
- Modify: `pipeline/rules/effect.exile_from_battlefield.ts`
- Modify: `pipeline/rules/effect.exile_from_battlefield.test.ts`

- [ ] **Step 1: Replace the test file**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_from_battlefield';

describe('effect.exile_from_battlefield (parent, universal-only)', () => {
  it.each([
    ['exile target permanent'],
    ['exile all permanents'],
    ['exile each permanent'],
    ['exile target nontoken permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target nonland permanent'],
    ['exile target noncreature permanent'],
    ['exile target creature'],
    ['exile target artifact'],
    ['exile target enchantment'],
    ['exile target permanent card from a graveyard'],
    ['destroy target permanent'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/effect.exile_from_battlefield.test.ts`
Expected: FAIL on the new negatives.

- [ ] **Step 3: Replace the rule file**

```ts
// pipeline/rules/effect.exile_from_battlefield.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_from_battlefield',
  axis: 'effect',
  label: 'Exiles any permanent',
  description: 'Exiles a permanent without type restriction. Type-specific exile is tagged on the typed children (effect.exile_creature / _artifact / _enchantment / _planeswalker / _land).',
  pairsWith: ['trigger.permanent_leaves_battlefield'],
  children: [
    'effect.exile_creature',
    'effect.exile_artifact',
    'effect.exile_enchantment',
    'effect.exile_planeswalker',
    'effect.exile_land',
  ],
};

const PATTERN =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}(?:noncreature|nonartifact|nonenchantment|nonplaneswalker|nonland)\s+)(?:[\w\-]+\s+){0,5}?permanents?(?! cards?)\b/;

export const rule: Rule = {
  id: 'effect.exile_from_battlefield',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['exile'], proximity: ['permanent'], window: 8 },
};
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run pipeline/rules/effect.exile_from_battlefield.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/effect.exile_from_battlefield.ts pipeline/rules/effect.exile_from_battlefield.test.ts
git commit -m "feat(rules): narrow exile_from_battlefield to universal-only + declare typed children"
```

---

## Task 2.12: Create `effect.sacrifice_creature`

Sacrifice uses different determiners — "sacrifice a creature" (no "target") is common.

**Files:**
- Create: `pipeline/rules/effect.sacrifice_creature.ts` + `.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_creature';

describe('effect.sacrifice_creature', () => {
  it.each([
    ['sacrifice a creature'],
    ['sacrifice another creature'],
    ['sacrifice target creature'],
    ['sacrifice three creatures'],
    ['as an additional cost to cast this spell, sacrifice a creature'],
    ['sacrifice a permanent'],
    ['sacrifice a nonland permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a noncreature permanent'],
    ['sacrifice an artifact'],
    ['sacrifice a land'],
    ['destroy target creature'],
    ['exile target creature'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/effect.sacrifice_creature.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write the rule**

```ts
// pipeline/rules/effect.sacrifice_creature.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.sacrifice_creature',
  axis: 'effect',
  label: 'Sacrifices a creature',
  description: 'Sacrifices a creature as part of its cost or effect. Includes broad "sacrifice a permanent" phrasing.',
  pairsWith: ['trigger.creature_dies', 'trigger.creature_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+|\w+\s+)(?:[\w\-]+\s+){0,4}?creatures?\b/;

const PATTERN_BROAD =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+)(?!(?:[\w\-]+\s+){0,5}noncreature\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.sacrifice_creature',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['creature', 'permanent'], window: 8 },
};
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run pipeline/rules/effect.sacrifice_creature.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/effect.sacrifice_creature.ts pipeline/rules/effect.sacrifice_creature.test.ts
git commit -m "feat(rules): add effect.sacrifice_creature typed child"
```

---

## Task 2.13: Create `effect.sacrifice_artifact`

**Files:**
- Create: `pipeline/rules/effect.sacrifice_artifact.ts` + `.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_artifact';

describe('effect.sacrifice_artifact', () => {
  it.each([
    ['sacrifice an artifact'],
    ['sacrifice another artifact'],
    ['sacrifice target artifact'],
    ['sacrifice two artifacts'],
    ['sacrifice a permanent'],
    ['sacrifice a nonland permanent'],
    ['sacrifice a noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a nonartifact permanent'],
    ['sacrifice a creature'],
    ['sacrifice a land'],
    ['destroy target artifact'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/effect.sacrifice_artifact.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write the rule**

```ts
// pipeline/rules/effect.sacrifice_artifact.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.sacrifice_artifact',
  axis: 'effect',
  label: 'Sacrifices an artifact',
  description: 'Sacrifices an artifact as part of its cost or effect. Includes broad "sacrifice a permanent" phrasing.',
  pairsWith: ['trigger.artifact_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+|\w+\s+)(?:[\w\-]+\s+){0,4}?artifacts?\b/;

const PATTERN_BROAD =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+)(?!(?:[\w\-]+\s+){0,5}nonartifact\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.sacrifice_artifact',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['artifact', 'permanent'], window: 8 },
};
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run pipeline/rules/effect.sacrifice_artifact.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/effect.sacrifice_artifact.ts pipeline/rules/effect.sacrifice_artifact.test.ts
git commit -m "feat(rules): add effect.sacrifice_artifact typed child"
```

---

## Task 2.14: Create `effect.sacrifice_enchantment`

**Files:**
- Create: `pipeline/rules/effect.sacrifice_enchantment.ts` + `.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_enchantment';

describe('effect.sacrifice_enchantment', () => {
  it.each([
    ['sacrifice an enchantment'],
    ['sacrifice another enchantment'],
    ['sacrifice target enchantment'],
    ['sacrifice a permanent'],
    ['sacrifice a nonland permanent'],
    ['sacrifice a noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a nonenchantment permanent'],
    ['sacrifice a creature'],
    ['sacrifice a land'],
    ['destroy target enchantment'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/effect.sacrifice_enchantment.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write the rule**

```ts
// pipeline/rules/effect.sacrifice_enchantment.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.sacrifice_enchantment',
  axis: 'effect',
  label: 'Sacrifices an enchantment',
  description: 'Sacrifices an enchantment as part of its cost or effect. Includes broad "sacrifice a permanent" phrasing.',
  pairsWith: ['trigger.enchantment_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+|\w+\s+)(?:[\w\-]+\s+){0,4}?enchantments?\b/;

const PATTERN_BROAD =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+)(?!(?:[\w\-]+\s+){0,5}nonenchantment\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.sacrifice_enchantment',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['enchantment', 'permanent'], window: 8 },
};
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run pipeline/rules/effect.sacrifice_enchantment.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/effect.sacrifice_enchantment.ts pipeline/rules/effect.sacrifice_enchantment.test.ts
git commit -m "feat(rules): add effect.sacrifice_enchantment typed child"
```

---

## Task 2.15: Create `effect.sacrifice_planeswalker` and `effect.sacrifice_land`

**Files:**
- Create: `pipeline/rules/effect.sacrifice_planeswalker.ts` + `.test.ts`
- Create: `pipeline/rules/effect.sacrifice_land.ts` + `.test.ts`

- [ ] **Step 1: Write `effect.sacrifice_planeswalker.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_planeswalker';

describe('effect.sacrifice_planeswalker', () => {
  it.each([
    ['sacrifice a planeswalker'],
    ['sacrifice another planeswalker'],
    ['sacrifice target planeswalker'],
    ['sacrifice a permanent'],
    ['sacrifice a nonland permanent'],
    ['sacrifice a noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a nonplaneswalker permanent'],
    ['sacrifice a creature'],
    ['destroy target planeswalker'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Write `effect.sacrifice_planeswalker.ts`**

```ts
// pipeline/rules/effect.sacrifice_planeswalker.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.sacrifice_planeswalker',
  axis: 'effect',
  label: 'Sacrifices a planeswalker',
  description: 'Sacrifices a planeswalker as part of its cost or effect.',
  pairsWith: ['trigger.planeswalker_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+|\w+\s+)(?:[\w\-]+\s+){0,4}?planeswalkers?\b/;

const PATTERN_BROAD =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+)(?!(?:[\w\-]+\s+){0,5}nonplaneswalker\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.sacrifice_planeswalker',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['planeswalker', 'permanent'], window: 8 },
};
```

- [ ] **Step 3: Write `effect.sacrifice_land.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_land';

describe('effect.sacrifice_land', () => {
  it.each([
    ['sacrifice a land'],
    ['sacrifice another land'],
    ['sacrifice target land'],
    ['sacrifice two lands'],
    ['as an additional cost to cast this spell, sacrifice a land'],
    ['sacrifice a permanent'],
    ['sacrifice a noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a nonland permanent'],
    ['sacrifice a creature'],
    ['destroy target land'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 4: Write `effect.sacrifice_land.ts`**

```ts
// pipeline/rules/effect.sacrifice_land.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.sacrifice_land',
  axis: 'effect',
  label: 'Sacrifices a land',
  description: 'Sacrifices a land as part of its cost or effect.',
  pairsWith: ['trigger.land_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+|\w+\s+)(?:[\w\-]+\s+){0,4}?lands?\b/;

const PATTERN_BROAD =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+)(?!(?:[\w\-]+\s+){0,5}nonland\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.sacrifice_land',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['land', 'permanent'], window: 8 },
};
```

- [ ] **Step 5: Verify both green**

Run: `npx vitest run pipeline/rules/effect.sacrifice_planeswalker.test.ts pipeline/rules/effect.sacrifice_land.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pipeline/rules/effect.sacrifice_planeswalker.ts pipeline/rules/effect.sacrifice_planeswalker.test.ts pipeline/rules/effect.sacrifice_land.ts pipeline/rules/effect.sacrifice_land.test.ts
git commit -m "feat(rules): add effect.sacrifice_planeswalker and effect.sacrifice_land typed children"
```

---

## Task 2.16: Narrow `effect.sacrifice_permanent` parent + declare children

**Files:**
- Modify: `pipeline/rules/effect.sacrifice_permanent.ts`
- Modify: `pipeline/rules/effect.sacrifice_permanent.test.ts`

- [ ] **Step 1: Read existing test file**

Use Read on `pipeline/rules/effect.sacrifice_permanent.test.ts` to see current positives/negatives.

- [ ] **Step 2: Replace the test file**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_permanent';

describe('effect.sacrifice_permanent (parent, universal-only)', () => {
  it.each([
    ['sacrifice a permanent'],
    ['sacrifice another permanent'],
    ['sacrifice target permanent'],
    ['sacrifice three permanents'],
    ['sacrifice a nontoken permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a nonland permanent'],
    ['sacrifice a noncreature permanent'],
    ['sacrifice a creature'],
    ['sacrifice an artifact'],
    ['sacrifice an enchantment'],
    ['sacrifice a land'],
    ['destroy target permanent'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 3: Verify red**

Run: `npx vitest run pipeline/rules/effect.sacrifice_permanent.test.ts`
Expected: FAIL on the new type-specific negatives (current regex matches `sacrifice a creature`).

- [ ] **Step 4: Replace the rule file**

```ts
// pipeline/rules/effect.sacrifice_permanent.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.sacrifice_permanent',
  axis: 'effect',
  label: 'Sacrifices any permanent',
  description: 'Sacrifices a permanent without type restriction. Type-specific sacrifice is tagged on the typed children (effect.sacrifice_creature / _artifact / _enchantment / _planeswalker / _land).',
  pairsWith: ['trigger.permanent_leaves_battlefield'],
  children: [
    'effect.sacrifice_creature',
    'effect.sacrifice_artifact',
    'effect.sacrifice_enchantment',
    'effect.sacrifice_planeswalker',
    'effect.sacrifice_land',
  ],
};

const PATTERN =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+)(?!(?:[\w\-]+\s+){0,5}(?:noncreature|nonartifact|nonenchantment|nonplaneswalker|nonland)\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.sacrifice_permanent',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['permanent'], window: 8 },
};
```

- [ ] **Step 5: Verify green**

Run: `npx vitest run pipeline/rules/effect.sacrifice_permanent.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pipeline/rules/effect.sacrifice_permanent.ts pipeline/rules/effect.sacrifice_permanent.test.ts
git commit -m "feat(rules): narrow sacrifice_permanent to universal-only + declare typed children"
```

---

## Task 2.17: Create `effect.bounce_creature`

Bounce has two text patterns plus the broad-permanent variant.

**Files:**
- Create: `pipeline/rules/effect.bounce_creature.ts` + `.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_creature';

describe('effect.bounce_creature', () => {
  it.each([
    ['return target creature to its owner\'s hand'],
    ['return target attacking creature to your hand'],
    ['return up to two target creatures to their owners\' hands'],
    ['exile target creature, then return that creature to the battlefield under its owner\'s control'],
    ['return target permanent to its owner\'s hand'],
    ['return target nonland permanent to its owner\'s hand'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target noncreature permanent to its owner\'s hand'],
    ['return target artifact to its owner\'s hand'],
    ['return target creature card from your graveyard'],
    ['destroy target creature'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/effect.bounce_creature.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write the rule**

```ts
// pipeline/rules/effect.bounce_creature.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_creature',
  axis: 'effect',
  label: 'Bounces or blinks a creature',
  description: 'Returns a creature to hand, or exiles and returns it (re-triggering ETB).',
  pairsWith: [
    'trigger.creature_dies',
    'trigger.creature_leaves_battlefield',
    'trigger.another_creature_etb',
  ],
};

const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,5}?creatures?[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

const PATTERN_BLINK_OWN =
  /\bexile(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?:[\w\-]+[,\s]+){0,5}?creatures?[^.]*?(?:,\s+then\s+return|\.\s+return)/;

const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+\s+){0,5}noncreature\s+)(?:[\w\-]+\s+){0,5}?permanents?[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

export const rule: Rule = {
  id: 'effect.bounce_creature',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_RETURN_OWN) ?? t.match(PATTERN_BLINK_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return', 'exile'], proximity: ['creature', 'permanent', 'hand'], window: 12 },
};
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run pipeline/rules/effect.bounce_creature.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/effect.bounce_creature.ts pipeline/rules/effect.bounce_creature.test.ts
git commit -m "feat(rules): add effect.bounce_creature typed child"
```

---

## Task 2.18: Create `effect.bounce_artifact`, `effect.bounce_enchantment`

**Files:**
- Create: `pipeline/rules/effect.bounce_artifact.ts` + `.test.ts`
- Create: `pipeline/rules/effect.bounce_enchantment.ts` + `.test.ts`

- [ ] **Step 1: Write `effect.bounce_artifact.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_artifact';

describe('effect.bounce_artifact', () => {
  it.each([
    ['return target artifact to its owner\'s hand'],
    ['return target artifact or enchantment to its owner\'s hand'],
    ['exile target artifact, then return that artifact to the battlefield'],
    ['return target permanent to its owner\'s hand'],
    ['return target nonland permanent to its owner\'s hand'],
    ['return target noncreature permanent to its owner\'s hand'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target nonartifact permanent to its owner\'s hand'],
    ['return target creature to its owner\'s hand'],
    ['return target artifact card from your graveyard'],
    ['destroy target artifact'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Write `effect.bounce_artifact.ts`**

```ts
// pipeline/rules/effect.bounce_artifact.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_artifact',
  axis: 'effect',
  label: 'Bounces or blinks an artifact',
  description: 'Returns an artifact to hand, or exiles and returns it.',
  pairsWith: ['trigger.artifact_leaves_battlefield'],
};

const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,5}?artifacts?[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

const PATTERN_BLINK_OWN =
  /\bexile(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?:[\w\-]+[,\s]+){0,5}?artifacts?[^.]*?(?:,\s+then\s+return|\.\s+return)/;

const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+\s+){0,5}nonartifact\s+)(?:[\w\-]+\s+){0,5}?permanents?[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

export const rule: Rule = {
  id: 'effect.bounce_artifact',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_RETURN_OWN) ?? t.match(PATTERN_BLINK_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return', 'exile'], proximity: ['artifact', 'permanent', 'hand'], window: 12 },
};
```

- [ ] **Step 3: Write `effect.bounce_enchantment.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_enchantment';

describe('effect.bounce_enchantment', () => {
  it.each([
    ['return target enchantment to its owner\'s hand'],
    ['return target artifact or enchantment to its owner\'s hand'],
    ['exile target enchantment, then return that enchantment to the battlefield'],
    ['return target permanent to its owner\'s hand'],
    ['return target nonland permanent to its owner\'s hand'],
    ['return target noncreature permanent to its owner\'s hand'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target nonenchantment permanent to its owner\'s hand'],
    ['return target creature to its owner\'s hand'],
    ['return target enchantment card from your graveyard'],
    ['destroy target enchantment'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 4: Write `effect.bounce_enchantment.ts`**

```ts
// pipeline/rules/effect.bounce_enchantment.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_enchantment',
  axis: 'effect',
  label: 'Bounces or blinks an enchantment',
  description: 'Returns an enchantment to hand, or exiles and returns it.',
  pairsWith: ['trigger.enchantment_leaves_battlefield'],
};

const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,5}?enchantments?[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

const PATTERN_BLINK_OWN =
  /\bexile(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?:[\w\-]+[,\s]+){0,5}?enchantments?[^.]*?(?:,\s+then\s+return|\.\s+return)/;

const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+\s+){0,5}nonenchantment\s+)(?:[\w\-]+\s+){0,5}?permanents?[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

export const rule: Rule = {
  id: 'effect.bounce_enchantment',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_RETURN_OWN) ?? t.match(PATTERN_BLINK_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return', 'exile'], proximity: ['enchantment', 'permanent', 'hand'], window: 12 },
};
```

- [ ] **Step 5: Verify both green**

Run: `npx vitest run pipeline/rules/effect.bounce_artifact.test.ts pipeline/rules/effect.bounce_enchantment.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pipeline/rules/effect.bounce_artifact.ts pipeline/rules/effect.bounce_artifact.test.ts pipeline/rules/effect.bounce_enchantment.ts pipeline/rules/effect.bounce_enchantment.test.ts
git commit -m "feat(rules): add effect.bounce_artifact and effect.bounce_enchantment typed children"
```

---

## Task 2.19: Create `effect.bounce_planeswalker` and `effect.bounce_land`

**Files:**
- Create: `pipeline/rules/effect.bounce_planeswalker.ts` + `.test.ts`
- Create: `pipeline/rules/effect.bounce_land.ts` + `.test.ts`

- [ ] **Step 1: Write `effect.bounce_planeswalker.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_planeswalker';

describe('effect.bounce_planeswalker', () => {
  it.each([
    ['return target planeswalker to its owner\'s hand'],
    ['return target creature or planeswalker to its owner\'s hand'],
    ['exile target planeswalker, then return that planeswalker to the battlefield'],
    ['return target permanent to its owner\'s hand'],
    ['return target nonland permanent to its owner\'s hand'],
    ['return target noncreature permanent to its owner\'s hand'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target nonplaneswalker permanent to its owner\'s hand'],
    ['return target creature to its owner\'s hand'],
    ['destroy target planeswalker'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Write `effect.bounce_planeswalker.ts`**

```ts
// pipeline/rules/effect.bounce_planeswalker.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_planeswalker',
  axis: 'effect',
  label: 'Bounces or blinks a planeswalker',
  description: 'Returns a planeswalker to hand, or exiles and returns it.',
  pairsWith: ['trigger.planeswalker_leaves_battlefield'],
};

const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,5}?planeswalkers?[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

const PATTERN_BLINK_OWN =
  /\bexile(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?:[\w\-]+[,\s]+){0,5}?planeswalkers?[^.]*?(?:,\s+then\s+return|\.\s+return)/;

const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+\s+){0,5}nonplaneswalker\s+)(?:[\w\-]+\s+){0,5}?permanents?[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

export const rule: Rule = {
  id: 'effect.bounce_planeswalker',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_RETURN_OWN) ?? t.match(PATTERN_BLINK_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return', 'exile'], proximity: ['planeswalker', 'permanent', 'hand'], window: 12 },
};
```

- [ ] **Step 3: Write `effect.bounce_land.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_land';

describe('effect.bounce_land', () => {
  it.each([
    ['return target land to its owner\'s hand'],
    ['return target nonbasic land to its owner\'s hand'],
    ['exile target land, then return that land to the battlefield'],
    ['return target permanent to its owner\'s hand'],
    ['return target noncreature permanent to its owner\'s hand'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target nonland permanent to its owner\'s hand'],
    ['return target creature to its owner\'s hand'],
    ['destroy target land'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 4: Write `effect.bounce_land.ts`**

```ts
// pipeline/rules/effect.bounce_land.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_land',
  axis: 'effect',
  label: 'Bounces or blinks a land',
  description: 'Returns a land to hand, or exiles and returns it.',
  pairsWith: ['trigger.land_leaves_battlefield'],
};

const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,5}?lands?[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

const PATTERN_BLINK_OWN =
  /\bexile(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?:[\w\-]+[,\s]+){0,5}?lands?[^.]*?(?:,\s+then\s+return|\.\s+return)/;

const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+\s+){0,5}nonland\s+)(?:[\w\-]+\s+){0,5}?permanents?[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

export const rule: Rule = {
  id: 'effect.bounce_land',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_RETURN_OWN) ?? t.match(PATTERN_BLINK_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return', 'exile'], proximity: ['land', 'permanent', 'hand'], window: 12 },
};
```

- [ ] **Step 5: Verify both green and commit**

Run: `npx vitest run pipeline/rules/effect.bounce_planeswalker.test.ts pipeline/rules/effect.bounce_land.test.ts`
Expected: PASS.

```bash
git add pipeline/rules/effect.bounce_planeswalker.ts pipeline/rules/effect.bounce_planeswalker.test.ts pipeline/rules/effect.bounce_land.ts pipeline/rules/effect.bounce_land.test.ts
git commit -m "feat(rules): add effect.bounce_planeswalker and effect.bounce_land typed children"
```

---

## Task 2.19b: Narrow `effect.bounce_or_blink` parent + declare children

**Files:**
- Modify: `pipeline/rules/effect.bounce_or_blink.ts`
- Modify: `pipeline/rules/effect.bounce_or_blink.test.ts`

- [ ] **Step 1: Replace the test file**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_or_blink';

describe('effect.bounce_or_blink (parent, universal-only)', () => {
  it.each([
    ['return target permanent to its owner\'s hand'],
    ['return all permanents to their owners\' hands'],
    ['return each permanent to its owner\'s hand'],
    ['exile target permanent, then return that permanent to the battlefield'],
    ['return target nontoken permanent to its owner\'s hand'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target nonland permanent to its owner\'s hand'],
    ['return target noncreature permanent to its owner\'s hand'],
    ['return target creature to its owner\'s hand'],
    ['return target artifact to its owner\'s hand'],
    ['return target enchantment to its owner\'s hand'],
    ['return target creature card from your graveyard to your hand'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/effect.bounce_or_blink.test.ts`
Expected: FAIL on new type-specific negatives.

- [ ] **Step 3: Replace the rule file**

```ts
// pipeline/rules/effect.bounce_or_blink.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_or_blink',
  axis: 'effect',
  label: 'Bounces or blinks any permanent',
  description: 'Returns a permanent to hand without type restriction, or exiles and returns it (re-triggering ETB). Type-specific bouncing is tagged on the typed children.',
  pairsWith: ['trigger.permanent_leaves_battlefield', 'trigger.another_creature_etb'],
  children: [
    'effect.bounce_creature',
    'effect.bounce_artifact',
    'effect.bounce_enchantment',
    'effect.bounce_planeswalker',
    'effect.bounce_land',
  ],
};

const PATTERN_RETURN =
  /\breturn(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+\s+){0,5}(?:noncreature|nonartifact|nonenchantment|nonplaneswalker|nonland)\s+)(?:[\w\-]+\s+){0,5}?permanents?[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

const PATTERN_BLINK =
  /\bexile(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+\s+){0,5}(?:noncreature|nonartifact|nonenchantment|nonplaneswalker|nonland)\s+)(?:[\w\-]+\s+){0,5}?permanents?[^.]*?(?:,\s+then\s+return|\.\s+return)/;

export const rule: Rule = {
  id: 'effect.bounce_or_blink',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_RETURN) ?? t.match(PATTERN_BLINK);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return', 'exile'], proximity: ['permanent', 'hand'], window: 12 },
};
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run pipeline/rules/effect.bounce_or_blink.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/effect.bounce_or_blink.ts pipeline/rules/effect.bounce_or_blink.test.ts
git commit -m "feat(rules): narrow bounce_or_blink to universal-only + declare typed children"
```

---

## Task 2.20: Create `trigger.creature_leaves_battlefield`

Triggers introduce a NEW pattern: `matchCard` for SELF triggers (cards whose text says "when this <self> leaves the battlefield" — we resolve which typed child to apply by reading `card.types`).

**Files:**
- Create: `pipeline/rules/trigger.creature_leaves_battlefield.ts` + `.test.ts`

**Test file:**

```ts
import { describe, it, expect } from 'vitest';
import type { Card } from '../../shared/types';
import { rule } from './trigger.creature_leaves_battlefield';

function makeCard(overrides: Partial<Card>): Card {
  return {
    oracleId: 'oid', name: '', set: '', printings: [], collectorNumber: '', manaCost: null, cmc: 0,
    colors: [], colorIdentity: [], typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [], ...overrides,
  };
}

describe('trigger.creature_leaves_battlefield', () => {
  it.each([
    ['whenever a creature leaves the battlefield'],
    ['whenever another creature you control leaves the battlefield'],
    ['when an enchanted creature leaves the battlefield'],
  ])('text-matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['whenever an artifact leaves the battlefield'],
    ['whenever an enchantment leaves the battlefield'],
    ['when a creature you control dies'],     // dies is a separate trigger
    ['whenever a permanent leaves the battlefield'], // broad parent's job
  ])('text does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  it('matchCard: SELF trigger on a creature card', () => {
    const card = makeCard({ types: ['creature'], oracleText: 'when __self__ leaves the battlefield, draw a card' });
    expect(rule.matchCard!(card)).toBeTruthy();
  });

  it('matchCard: SELF trigger on a non-creature card does NOT match', () => {
    const card = makeCard({ types: ['enchantment'], oracleText: 'when __self__ leaves the battlefield, draw a card' });
    expect(rule.matchCard!(card)).toBe(false);
  });

  it('matchCard: SELF trigger on an artifact-creature DOES match (multi-type)', () => {
    const card = makeCard({ types: ['artifact', 'creature'], oracleText: 'when __self__ leaves the battlefield, draw a card' });
    expect(rule.matchCard!(card)).toBeTruthy();
  });
});
```

**Rule file:**

```ts
// pipeline/rules/trigger.creature_leaves_battlefield.ts
import type { Rule } from './types';
import type { Card, TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.creature_leaves_battlefield',
  axis: 'trigger',
  label: 'Triggers when a creature leaves the battlefield',
  description: 'Triggers when a creature leaves the battlefield (broader than dies — covers exile, bounce, and sacrifice). Distinct from trigger.creature_dies which fires only on death.',
  pairsWith: [
    'effect.destroy_creature',
    'effect.exile_creature',
    'effect.sacrifice_creature',
    'effect.bounce_creature',
  ],
};

// Non-SELF: "whenever/when [a/an/another] creature [adjectives ...] leaves the battlefield".
const PATTERN_TEXT =
  /\bwhen(?:ever)?\s+(?:a\s+|an\s+|another\s+|the\s+|each\s+|each\s+other\s+|an?\s+enchanted\s+)?(?:[\w\-]+\s+){0,3}?creature(?:\s+[\w\-]+){0,4}?\s+leaves the battlefield\b/;

// SELF trigger: text says "when __self__ leaves the battlefield" AND the card is a creature.
const PATTERN_SELF =
  /\bwhen(?:ever)?\s+(?:this\s+\w+\s+|__self__\s+)leaves the battlefield\b/;

export const rule: Rule = {
  id: 'trigger.creature_leaves_battlefield',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN_TEXT);
    return m ? { evidence: m[0] } : false;
  },
  matchCard: (card: Card) => {
    if (!card.types.includes('creature')) return false;
    const m = card.oracleText.toLowerCase().match(PATTERN_SELF);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['leaves the battlefield', 'leaves the'], proximity: ['creature'], window: 6 },
};
```

Commit: `feat(rules): add trigger.creature_leaves_battlefield (with matchCard for SELF)`.

## Task 2.21: Create `trigger.artifact_leaves_battlefield`

**Files:**
- Create: `pipeline/rules/trigger.artifact_leaves_battlefield.ts` + `.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import type { Card } from '../../shared/types';
import { rule } from './trigger.artifact_leaves_battlefield';

function makeCard(overrides: Partial<Card>): Card {
  return {
    oracleId: 'oid', name: '', set: '', printings: [], collectorNumber: '', manaCost: null, cmc: 0,
    colors: [], colorIdentity: [], typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [], ...overrides,
  };
}

describe('trigger.artifact_leaves_battlefield', () => {
  it.each([
    ['whenever an artifact leaves the battlefield'],
    ['whenever another artifact you control leaves the battlefield'],
    ['when an equipped artifact leaves the battlefield'],
  ])('text-matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['whenever a creature leaves the battlefield'],
    ['whenever an enchantment leaves the battlefield'],
    ['whenever a permanent leaves the battlefield'],
  ])('text does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  it('matchCard: SELF trigger on an artifact card', () => {
    const card = makeCard({ types: ['artifact'], oracleText: 'when __self__ leaves the battlefield, draw a card' });
    expect(rule.matchCard!(card)).toBeTruthy();
  });

  it('matchCard: SELF trigger on a non-artifact card does NOT match', () => {
    const card = makeCard({ types: ['enchantment'], oracleText: 'when __self__ leaves the battlefield, draw a card' });
    expect(rule.matchCard!(card)).toBe(false);
  });

  it('matchCard: SELF trigger on an artifact-creature DOES match (multi-type)', () => {
    const card = makeCard({ types: ['artifact', 'creature'], oracleText: 'when __self__ leaves the battlefield, draw a card' });
    expect(rule.matchCard!(card)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/trigger.artifact_leaves_battlefield.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write the rule**

```ts
// pipeline/rules/trigger.artifact_leaves_battlefield.ts
import type { Rule } from './types';
import type { Card, TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.artifact_leaves_battlefield',
  axis: 'trigger',
  label: 'Triggers when an artifact leaves the battlefield',
  description: 'Triggers when an artifact leaves the battlefield (covers destroy, exile, bounce, sacrifice).',
  pairsWith: [
    'effect.destroy_artifact',
    'effect.exile_artifact',
    'effect.sacrifice_artifact',
    'effect.bounce_artifact',
  ],
};

const PATTERN_TEXT =
  /\bwhen(?:ever)?\s+(?:a\s+|an\s+|another\s+|the\s+|each\s+|each\s+other\s+|an?\s+equipped\s+)?(?:[\w\-]+\s+){0,3}?artifact(?:\s+[\w\-]+){0,4}?\s+leaves the battlefield\b/;

const PATTERN_SELF =
  /\bwhen(?:ever)?\s+(?:this\s+\w+\s+|__self__\s+)leaves the battlefield\b/;

export const rule: Rule = {
  id: 'trigger.artifact_leaves_battlefield',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN_TEXT);
    return m ? { evidence: m[0] } : false;
  },
  matchCard: (card: Card) => {
    if (!card.types.includes('artifact')) return false;
    const m = card.oracleText.toLowerCase().match(PATTERN_SELF);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['leaves the battlefield'], proximity: ['artifact'], window: 6 },
};
```

- [ ] **Step 4: Verify green and commit**

Run: `npx vitest run pipeline/rules/trigger.artifact_leaves_battlefield.test.ts`
Expected: PASS.

```bash
git add pipeline/rules/trigger.artifact_leaves_battlefield.ts pipeline/rules/trigger.artifact_leaves_battlefield.test.ts
git commit -m "feat(rules): add trigger.artifact_leaves_battlefield (with matchCard for SELF)"
```

---

## Task 2.22: Create `trigger.enchantment_leaves_battlefield`

**Files:**
- Create: `pipeline/rules/trigger.enchantment_leaves_battlefield.ts` + `.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import type { Card } from '../../shared/types';
import { rule } from './trigger.enchantment_leaves_battlefield';

function makeCard(overrides: Partial<Card>): Card {
  return {
    oracleId: 'oid', name: '', set: '', printings: [], collectorNumber: '', manaCost: null, cmc: 0,
    colors: [], colorIdentity: [], typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [], ...overrides,
  };
}

describe('trigger.enchantment_leaves_battlefield', () => {
  it.each([
    ['whenever an enchantment leaves the battlefield'],
    ['whenever another enchantment you control leaves the battlefield'],
    ['when an aura enchantment leaves the battlefield'],
  ])('text-matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['whenever a creature leaves the battlefield'],
    ['whenever an artifact leaves the battlefield'],
    ['whenever a permanent leaves the battlefield'],
  ])('text does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  it('matchCard: SELF trigger on an enchantment card', () => {
    const card = makeCard({ types: ['enchantment'], oracleText: 'when __self__ leaves the battlefield, draw a card' });
    expect(rule.matchCard!(card)).toBeTruthy();
  });

  it('matchCard: SELF trigger on a non-enchantment card does NOT match', () => {
    const card = makeCard({ types: ['artifact'], oracleText: 'when __self__ leaves the battlefield, draw a card' });
    expect(rule.matchCard!(card)).toBe(false);
  });

  it('matchCard: SELF trigger on an enchantment-creature DOES match', () => {
    const card = makeCard({ types: ['enchantment', 'creature'], oracleText: 'when __self__ leaves the battlefield, draw a card' });
    expect(rule.matchCard!(card)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/trigger.enchantment_leaves_battlefield.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write the rule**

```ts
// pipeline/rules/trigger.enchantment_leaves_battlefield.ts
import type { Rule } from './types';
import type { Card, TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.enchantment_leaves_battlefield',
  axis: 'trigger',
  label: 'Triggers when an enchantment leaves the battlefield',
  description: 'Triggers when an enchantment leaves the battlefield (covers destroy, exile, bounce, sacrifice).',
  pairsWith: [
    'effect.destroy_enchantment',
    'effect.exile_enchantment',
    'effect.sacrifice_enchantment',
    'effect.bounce_enchantment',
  ],
};

const PATTERN_TEXT =
  /\bwhen(?:ever)?\s+(?:a\s+|an\s+|another\s+|the\s+|each\s+|each\s+other\s+|an?\s+aura\s+)?(?:[\w\-]+\s+){0,3}?enchantment(?:\s+[\w\-]+){0,4}?\s+leaves the battlefield\b/;

const PATTERN_SELF =
  /\bwhen(?:ever)?\s+(?:this\s+\w+\s+|__self__\s+)leaves the battlefield\b/;

export const rule: Rule = {
  id: 'trigger.enchantment_leaves_battlefield',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN_TEXT);
    return m ? { evidence: m[0] } : false;
  },
  matchCard: (card: Card) => {
    if (!card.types.includes('enchantment')) return false;
    const m = card.oracleText.toLowerCase().match(PATTERN_SELF);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['leaves the battlefield'], proximity: ['enchantment'], window: 6 },
};
```

- [ ] **Step 4: Verify green and commit**

Run: `npx vitest run pipeline/rules/trigger.enchantment_leaves_battlefield.test.ts`
Expected: PASS.

```bash
git add pipeline/rules/trigger.enchantment_leaves_battlefield.ts pipeline/rules/trigger.enchantment_leaves_battlefield.test.ts
git commit -m "feat(rules): add trigger.enchantment_leaves_battlefield (with matchCard for SELF)"
```

---

## Task 2.23: Create `trigger.planeswalker_leaves_battlefield` and `trigger.land_leaves_battlefield`

**Files:**
- Create: `pipeline/rules/trigger.planeswalker_leaves_battlefield.ts` + `.test.ts`
- Create: `pipeline/rules/trigger.land_leaves_battlefield.ts` + `.test.ts`

- [ ] **Step 1: Write `trigger.planeswalker_leaves_battlefield.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { Card } from '../../shared/types';
import { rule } from './trigger.planeswalker_leaves_battlefield';

function makeCard(overrides: Partial<Card>): Card {
  return {
    oracleId: 'oid', name: '', set: '', printings: [], collectorNumber: '', manaCost: null, cmc: 0,
    colors: [], colorIdentity: [], typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [], ...overrides,
  };
}

describe('trigger.planeswalker_leaves_battlefield', () => {
  it.each([
    ['whenever a planeswalker leaves the battlefield'],
    ['whenever another planeswalker you control leaves the battlefield'],
  ])('text-matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['whenever a creature leaves the battlefield'],
    ['whenever a permanent leaves the battlefield'],
  ])('text does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  it('matchCard: SELF trigger on a planeswalker card', () => {
    const card = makeCard({ types: ['planeswalker'], oracleText: 'when __self__ leaves the battlefield, draw a card' });
    expect(rule.matchCard!(card)).toBeTruthy();
  });

  it('matchCard: SELF trigger on a creature card does NOT match', () => {
    const card = makeCard({ types: ['creature'], oracleText: 'when __self__ leaves the battlefield, draw a card' });
    expect(rule.matchCard!(card)).toBe(false);
  });
});
```

- [ ] **Step 2: Write `trigger.planeswalker_leaves_battlefield.ts`**

```ts
// pipeline/rules/trigger.planeswalker_leaves_battlefield.ts
import type { Rule } from './types';
import type { Card, TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.planeswalker_leaves_battlefield',
  axis: 'trigger',
  label: 'Triggers when a planeswalker leaves the battlefield',
  description: 'Triggers when a planeswalker leaves the battlefield (covers destroy, exile, bounce, sacrifice).',
  pairsWith: [
    'effect.destroy_planeswalker',
    'effect.exile_planeswalker',
    'effect.sacrifice_planeswalker',
    'effect.bounce_planeswalker',
  ],
};

const PATTERN_TEXT =
  /\bwhen(?:ever)?\s+(?:a\s+|an\s+|another\s+|the\s+|each\s+|each\s+other\s+)?(?:[\w\-]+\s+){0,3}?planeswalker(?:\s+[\w\-]+){0,4}?\s+leaves the battlefield\b/;

const PATTERN_SELF =
  /\bwhen(?:ever)?\s+(?:this\s+\w+\s+|__self__\s+)leaves the battlefield\b/;

export const rule: Rule = {
  id: 'trigger.planeswalker_leaves_battlefield',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN_TEXT);
    return m ? { evidence: m[0] } : false;
  },
  matchCard: (card: Card) => {
    if (!card.types.includes('planeswalker')) return false;
    const m = card.oracleText.toLowerCase().match(PATTERN_SELF);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['leaves the battlefield'], proximity: ['planeswalker'], window: 6 },
};
```

- [ ] **Step 3: Write `trigger.land_leaves_battlefield.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { Card } from '../../shared/types';
import { rule } from './trigger.land_leaves_battlefield';

function makeCard(overrides: Partial<Card>): Card {
  return {
    oracleId: 'oid', name: '', set: '', printings: [], collectorNumber: '', manaCost: null, cmc: 0,
    colors: [], colorIdentity: [], typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [], ...overrides,
  };
}

describe('trigger.land_leaves_battlefield', () => {
  it.each([
    ['whenever a land leaves the battlefield'],
    ['whenever another land you control leaves the battlefield'],
  ])('text-matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['whenever a creature leaves the battlefield'],
    ['whenever a permanent leaves the battlefield'],
    ['whenever a land enters the battlefield under your control'],
  ])('text does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  it('matchCard: SELF trigger on a land card', () => {
    const card = makeCard({ types: ['land'], oracleText: 'when __self__ leaves the battlefield, draw a card' });
    expect(rule.matchCard!(card)).toBeTruthy();
  });

  it('matchCard: SELF trigger on a non-land card does NOT match', () => {
    const card = makeCard({ types: ['creature'], oracleText: 'when __self__ leaves the battlefield, draw a card' });
    expect(rule.matchCard!(card)).toBe(false);
  });
});
```

- [ ] **Step 4: Write `trigger.land_leaves_battlefield.ts`**

```ts
// pipeline/rules/trigger.land_leaves_battlefield.ts
import type { Rule } from './types';
import type { Card, TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.land_leaves_battlefield',
  axis: 'trigger',
  label: 'Triggers when a land leaves the battlefield',
  description: 'Triggers when a land leaves the battlefield (covers destroy, exile, bounce, sacrifice).',
  pairsWith: [
    'effect.destroy_land',
    'effect.exile_land',
    'effect.sacrifice_land',
    'effect.bounce_land',
  ],
};

const PATTERN_TEXT =
  /\bwhen(?:ever)?\s+(?:a\s+|an\s+|another\s+|the\s+|each\s+|each\s+other\s+)?(?:[\w\-]+\s+){0,3}?land(?:\s+[\w\-]+){0,4}?\s+leaves the battlefield\b/;

const PATTERN_SELF =
  /\bwhen(?:ever)?\s+(?:this\s+\w+\s+|__self__\s+)leaves the battlefield\b/;

export const rule: Rule = {
  id: 'trigger.land_leaves_battlefield',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN_TEXT);
    return m ? { evidence: m[0] } : false;
  },
  matchCard: (card: Card) => {
    if (!card.types.includes('land')) return false;
    const m = card.oracleText.toLowerCase().match(PATTERN_SELF);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['leaves the battlefield'], proximity: ['land'], window: 6 },
};
```

- [ ] **Step 5: Verify both green and commit**

Run: `npx vitest run pipeline/rules/trigger.planeswalker_leaves_battlefield.test.ts pipeline/rules/trigger.land_leaves_battlefield.test.ts`
Expected: PASS.

```bash
git add pipeline/rules/trigger.planeswalker_leaves_battlefield.ts pipeline/rules/trigger.planeswalker_leaves_battlefield.test.ts pipeline/rules/trigger.land_leaves_battlefield.ts pipeline/rules/trigger.land_leaves_battlefield.test.ts
git commit -m "feat(rules): add trigger.planeswalker_leaves_battlefield and trigger.land_leaves_battlefield"
```

## Task 2.24: Narrow `trigger.permanent_leaves_battlefield` parent + declare children

**Files:**
- Modify: `pipeline/rules/trigger.permanent_leaves_battlefield.ts`
- Modify: `pipeline/rules/trigger.permanent_leaves_battlefield.test.ts`

- [ ] **Step 1: Replace the test file**

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.permanent_leaves_battlefield';

describe('trigger.permanent_leaves_battlefield (parent, universal-only)', () => {
  it.each([
    ['whenever a permanent leaves the battlefield'],
    ['whenever a permanent you control leaves the battlefield'],
    ['when another permanent leaves the battlefield'],
    ['whenever a nontoken permanent leaves the battlefield'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Type-specific must NOT match the parent
    ['whenever a creature leaves the battlefield'],
    ['whenever an artifact leaves the battlefield'],
    ['whenever an enchantment leaves the battlefield'],
    ['when this creature leaves the battlefield'],
    // Type-excluding modifiers must NOT match (parent reserved for universal)
    ['whenever a nonland permanent leaves the battlefield'],
    ['whenever a noncreature permanent leaves the battlefield'],
    // Dies is its own tag
    ['whenever a creature dies'],
    // Descriptive prose
    ['the creature leaves the battlefield'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run pipeline/rules/trigger.permanent_leaves_battlefield.test.ts`
Expected: FAIL on the type-specific negatives (current regex matches "creature leaves the battlefield").

- [ ] **Step 3: Replace the rule file**

```ts
// pipeline/rules/trigger.permanent_leaves_battlefield.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.permanent_leaves_battlefield',
  axis: 'trigger',
  label: 'Triggers when any permanent leaves the battlefield',
  description: 'Triggers when a permanent of any type leaves the battlefield. Reserved for universally-typed phrasings ("a permanent", "another permanent"). Type-specific triggers are tagged on the typed children.',
  pairsWith: [
    'effect.destroy_permanent',
    'effect.exile_from_battlefield',
    'effect.sacrifice_permanent',
    'effect.bounce_or_blink',
    'effect.board_wipe',
  ],
  children: [
    'trigger.creature_leaves_battlefield',
    'trigger.artifact_leaves_battlefield',
    'trigger.enchantment_leaves_battlefield',
    'trigger.planeswalker_leaves_battlefield',
    'trigger.land_leaves_battlefield',
  ],
};

const PATTERN =
  /\bwhen(?:ever)?\s+(?:a\s+|an\s+|another\s+|the\s+|each\s+)(?!(?:[\w\-]+\s+){0,5}(?:noncreature|nonartifact|nonenchantment|nonplaneswalker|nonland|creature|artifact|enchantment|planeswalker|land)\s+)(?:[\w\-]+\s+){0,4}?permanents?\s+(?:[\w\-\s]+? )?leaves the battlefield\b/;

export const rule: Rule = {
  id: 'trigger.permanent_leaves_battlefield',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['leaves the battlefield'], proximity: ['permanent'], window: 6 },
};
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run pipeline/rules/trigger.permanent_leaves_battlefield.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pipeline/rules/trigger.permanent_leaves_battlefield.ts pipeline/rules/trigger.permanent_leaves_battlefield.test.ts
git commit -m "feat(rules): narrow permanent_leaves_battlefield parent + declare typed children"
```

---

## Task 2.25: Update `effect.board_wipe` `pairsWith`

Board wipe stays whole (inherently universal) but its `pairsWith` should add the typed creature LTB trigger (board wipes hit creatures).

- [ ] **Step 1: Read the file**

Use Read on `pipeline/rules/effect.board_wipe.ts`.

- [ ] **Step 2: Update `pairsWith`**

Replace the `pairsWith` line of the `tagDef` export with:

```ts
  pairsWith: [
    'trigger.creature_dies',
    'trigger.creature_leaves_battlefield',
    'trigger.permanent_leaves_battlefield',
  ],
```

- [ ] **Step 3: Run pairings validation**

Run: `npm run rule:coverage -- --pairings`
Expected: PASS, all references resolve.

- [ ] **Step 4: Commit**

```bash
git add pipeline/rules/effect.board_wipe.ts
git commit -m "feat(rules): board_wipe pairs with typed creature LTB trigger"
```

---

# Phase 3 — Integration & polish

## Task 3.1: Update e2e fixture + assert no cross-type edges

**Files:**
- Modify: `pipeline/e2e.test.ts`
- Modify: `pipeline/fixtures/*.json` (if fixtures need new cards — Read first)

- [ ] **Step 1: Read the existing e2e and fixture files**

Run: `ls pipeline/fixtures/` and `cat pipeline/e2e.test.ts | head -50`. Note the fixture format and how cards are added.

- [ ] **Step 2: Add four fixture cards**

Add to the appropriate fixture JSON (or inline within `e2e.test.ts` if that's the existing pattern). The four cards model the canonical cases:

```json
[
  {
    "oracleId": "fixture-vindicate",
    "name": "FixtureVindicate",
    "oracleText": "Destroy target permanent.",
    "types": ["sorcery"],
    "typeLine": "Sorcery"
  },
  {
    "oracleId": "fixture-disenchant",
    "name": "FixtureDisenchant",
    "oracleText": "Destroy target artifact or enchantment.",
    "types": ["sorcery"],
    "typeLine": "Sorcery"
  },
  {
    "oracleId": "fixture-broad-ltb",
    "name": "FixtureBroadLTB",
    "oracleText": "Whenever a permanent you control leaves the battlefield, draw a card.",
    "types": ["creature"],
    "typeLine": "Creature — Druid"
  },
  {
    "oracleId": "fixture-creature-ltb",
    "name": "FixtureCreatureLTB",
    "oracleText": "Whenever a creature you control leaves the battlefield, draw a card.",
    "types": ["creature"],
    "typeLine": "Creature — Cleric"
  }
]
```

Fill in the remaining required `Card` fields (set, printings, manaCost: null, cmc: 0, colors: [], colorIdentity: [], subtypes: [], supertypes: [], keywords: [], power: null, toughness: null, rarity: "common", imageUrl: "", collectorNumber: "1") per the existing fixture template.

- [ ] **Step 3: Add the cross-type assertion to `pipeline/e2e.test.ts`**

Inside the existing e2e test block (or as a new `describe('typed permanent tags')`), add:

```ts
it('Disenchant does not produce an edge to a creature-LTB trigger', () => {
  // Build the graph from the fixture (assumes the existing e2e setup exposes `edges`).
  const fromDisenchant = edges.filter((e) => e.source === 'fixture-disenchant');
  const creatureLtbTargets = fromDisenchant.filter(
    (e) => e.target === 'fixture-creature-ltb',
  );
  expect(creatureLtbTargets, 'Disenchant must not pair with a creature-LTB trigger').toEqual([]);
});

it('Vindicate pairs with both the broad and the creature-LTB triggers', () => {
  const fromVindicate = edges.filter((e) => e.source === 'fixture-vindicate');
  const targets = new Set(fromVindicate.map((e) => e.target));
  expect(targets.has('fixture-broad-ltb')).toBe(true);
  expect(targets.has('fixture-creature-ltb')).toBe(true);
});
```

(Adapt to whatever variable name the existing e2e test exposes — likely `edges`, `artifact.edges`, or similar.)

- [ ] **Step 4: Run the e2e test**

Run: `npx vitest run pipeline/e2e.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/e2e.test.ts pipeline/fixtures/
git commit -m "test(e2e): assert typed permanent tags produce no cross-type edges"
```

---

## Task 3.2: CardDetailDrawer chip collapse

**Files:**
- Modify: `app/src/components/CardDetailDrawer.tsx`
- Modify or create: `app/src/components/CardDetailDrawer.test.tsx`

- [ ] **Step 1: Read the existing CardDetailDrawer**

Use Read on `app/src/components/CardDetailDrawer.tsx`. Locate the section that renders tag chips. Note how it iterates `card.tags`.

- [ ] **Step 2: Add a chip-collapse helper**

Near the top of the file (or in a new helper module if convention prefers), add:

```ts
import type { CardTag, TagDef } from '../../../shared/types';

function collapseParentChildChips(
  tags: CardTag[],
  catalog: TagDef[],
): CardTag[] {
  const byId = new Map(catalog.map((d) => [d.tagId, d]));
  const present = new Set(tags.map((t) => t.tagId));
  const hiddenChildren = new Set<string>();

  for (const tag of tags) {
    const def = byId.get(tag.tagId);
    if (!def?.children?.length) continue;
    // If all children are present, hide them — the parent chip represents them all.
    const allChildrenPresent = def.children.every((c) => present.has(c));
    if (!allChildrenPresent) continue;
    for (const childId of def.children) hiddenChildren.add(childId);
  }

  return tags.filter((t) => !hiddenChildren.has(t.tagId));
}
```

- [ ] **Step 3: Apply the helper to the chip-rendering call site**

Find the line that maps over `card.tags` to render chips. Replace `card.tags` with `collapseParentChildChips(card.tags, tagCatalog)`. Import `tagCatalog` from the graph store / catalog source already used in the file (likely `useGraphStore` exposes it; check first).

- [ ] **Step 4: Write a test**

If `CardDetailDrawer.test.tsx` exists, add a test inside it; otherwise create it. The test renders a card with all five `effect.destroy_*` children plus the parent, and asserts that only the parent chip is visible (children chips are absent):

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardDetailDrawer } from './CardDetailDrawer';

describe('CardDetailDrawer chip collapse', () => {
  it('collapses all children present into the parent chip', () => {
    const card = {
      // ...minimal card stub
      tags: [
        { tagId: 'effect.destroy_permanent', axis: 'effect', evidence: 'destroy target permanent' },
        { tagId: 'effect.destroy_creature',   axis: 'effect', evidence: 'destroy target permanent' },
        { tagId: 'effect.destroy_artifact',   axis: 'effect', evidence: 'destroy target permanent' },
        { tagId: 'effect.destroy_enchantment',axis: 'effect', evidence: 'destroy target permanent' },
        { tagId: 'effect.destroy_planeswalker', axis: 'effect', evidence: 'destroy target permanent' },
        { tagId: 'effect.destroy_land',       axis: 'effect', evidence: 'destroy target permanent' },
      ],
    };
    render(<CardDetailDrawer card={card as any} />);
    expect(screen.getByText(/Destroys any permanent/i)).toBeTruthy();
    expect(screen.queryByText(/Destroys a creature/i)).toBeNull();
    expect(screen.queryByText(/Destroys an artifact/i)).toBeNull();
  });
});
```

(Adapt props / store mocking to match the existing drawer's component contract.)

- [ ] **Step 5: Run app tests**

Run: `cd app && npm test -- CardDetailDrawer`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/components/CardDetailDrawer.tsx app/src/components/CardDetailDrawer.test.tsx
git commit -m "feat(ui): collapse all-children-present chips into the parent chip in CardDetailDrawer"
```

---

## Task 3.3: Bump `RULE_VERSION` to `v0.8.0`

**Files:**
- Modify: `pipeline/catalog.ts:16`

- [ ] **Step 1: Edit**

Change the `RULE_VERSION` constant in `pipeline/catalog.ts` to:

```ts
export const RULE_VERSION = 'v0.8.0';
```

- [ ] **Step 2: Rebuild the standard artifact**

Run: `npm run refresh:cards -- --standard` (or `build:cards -- --standard` if the cache is fresh).
Expected: build succeeds; `app/public/data/cards-standard.json` regenerated with new `ruleVersion: 'v0.8.0'`.

- [ ] **Step 3: Spot-check coverage**

Run: `npm run rule:coverage -- --all | tail -20`
Note the aggregate "taggable %" — should be stable or marginally up vs. the v0.7.1 baseline. The catalog row count should now show ~91 tags.

- [ ] **Step 4: Commit**

```bash
git add pipeline/catalog.ts app/public/data/cards-standard.json
git commit -m "chore(pipeline): bump RULE_VERSION to v0.8.0"
```

---

## Task 3.4: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (lines referencing v0.7.0 and the "67 tag definitions" count)

- [ ] **Step 1: Find the lines**

Run: `grep -n "v0.7\|67 tag" CLAUDE.md`
Note the line numbers.

- [ ] **Step 2: Edit**

Update those lines:
- `Current release: v0.7.0` → `Current release: v0.8.0`
- `67 tag definitions, 89.5% taggable coverage` → `91 tag definitions, <new>% taggable coverage`. Read the actual percentage from the coverage spot-check in Task 3.3.
- If there's a paragraph describing the v0.7 design, append one sentence: `v0.8 splits the leaves-battlefield / destroy / exile / bounce / sacrifice cluster along a permanent-type axis (see docs/superpowers/specs/2026-05-22-typed-permanent-tags-design.md).`

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): update version and tag count for v0.8.0"
```

---

## Task 3.5: Final validation

- [ ] **Step 1: Full unit suite**

Run: `npm test`
Expected: ALL PASS.

- [ ] **Step 2: App test suite**

Run: `cd app && npm test`
Expected: ALL PASS.

- [ ] **Step 3: Pairings validation**

Run: `npm run rule:coverage -- --pairings`
Expected: PASS — every `pairsWith` reference resolves.

- [ ] **Step 4: Coverage summary**

Run: `npm run rule:coverage -- --all > /tmp/coverage-v0.8.txt && tail -30 /tmp/coverage-v0.8.txt`
Inspect: the new typed tags should each have plausible match counts. The aggregate taggable % should be stable.

- [ ] **Step 5: e2e smoke**

Run: `cd app && npm run e2e`
Expected: PASS.

- [ ] **Step 6: Manual UI check**

Run: `cd app && npm run dev`. Open `http://localhost:5173`. Verify:
- Filter panel lists the new typed tags (creature/artifact/enchantment/planeswalker/land variants of destroy/exile/sacrifice/bounce/LTB).
- Vindicate (search by name) has the parent + typed children collapsed to a single "Destroys any permanent" chip.
- Disenchant shows two separate chips: "Destroys an artifact" and "Destroys an enchantment", no parent chip.
- Filtering by `effect.destroy_enchantment` includes Vindicate AND Disenchant.

- [ ] **Step 7: Final commit (if any cleanup / minor fixes from the manual check)**

If the manual check surfaced issues, fix them and commit. Otherwise, the implementation is complete.

```bash
git status   # should be clean
```

---

## Spec coverage check

Confirm each spec section maps to at least one task:

| Spec section | Task(s) |
|---|---|
| Data model — `children?: string[]` on `TagDef` | 1.1 |
| Tag application post-pass | 1.3, 1.4, 1.5 |
| Tag taxonomy — effect children | 2.1–2.5, 2.7–2.10, 2.12–2.18 |
| Tag taxonomy — trigger children | 2.20–2.23 |
| Parent narrowing (universal-only) | 2.6, 2.11, 2.16, 2.19, 2.24 |
| `pairsWith` rewiring | embedded in each typed-rule task; 2.25 for board_wipe |
| Graph builder — no code change | (unchanged — bidirectional dedupe already exists) |
| UI — FilterPanel auto-picks-up new tags | (no code needed — catalog-driven) |
| UI — CardDetailDrawer chip collapse | 3.2 |
| Versioning — `RULE_VERSION` bump | 3.3 |
| Catalog consistency check | 1.6 |
| e2e — no cross-type edge | 3.1 |
| CLAUDE.md update | 3.4 |
| Final validation | 3.5 |
