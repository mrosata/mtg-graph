# Mechanics Expansion v0.7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v0.7 — 34 new rule-file tags + 10 generated tribe tags across 11 mechanic families, plus a discovery workflow (rule:coverage, rule:mine, isTaggable), plus a registry refactor enabling parallel agent execution, plus three brittle-rule fixes — reaching ≥ 91% taggable-denominator coverage of the Standard corpus.

**Architecture:** Three phases. Phase 0 (sequential, main session) lays the foundation: registry refactor for parallel safety, graph-builder bidirectionality so any family can declare pairings from its own side, discovery tooling, and the three brittle fixes whose new tag IDs other families depend on. Phase 1 (parallel) dispatches 11 implementer + 11 reviewer subagent pairs, each owning one family in an isolated worktree. Phase 2 (sequential, main session) merges worktrees, runs the coverage gate, and bumps `RULE_VERSION` to `v0.7.0`.

**Tech Stack:** Node + TypeScript (`tsx`), Vitest, `graphology` (app side, unchanged), pnpm. No new dependencies. No external API calls in this slice — LLM verification is the deferred v0.8 follow-up.

**Spec:** `docs/superpowers/specs/2026-05-21-mechanics-expansion-discovery-design.md`

---

## File Structure Overview

### Created in Phase 0
- `pipeline/coverage.ts` — `isTaggable(card)` helper + small utilities.
- `pipeline/coverage.test.ts` — tests for `isTaggable`.
- `pipeline/scripts/rule-coverage.ts` — CLI for `npm run rule:coverage`.
- `pipeline/scripts/rule-mine.ts` — CLI for `npm run rule:mine`.
- `pipeline/scripts/mine.ts` — pure n-gram extraction logic (separated for testability).
- `pipeline/scripts/mine.test.ts` — unit tests for n-gram extraction.
- `pipeline/scripts/coverage-report.ts` — pure logic for the coverage report (separated for testability).
- `pipeline/scripts/coverage-report.test.ts` — tests.
- `pipeline/reports/baseline-mine-2026-05-21.json` — baseline output committed for end-of-project diffing.
- `pipeline/reports/STOPWORDS.txt` — stopword list for mining.
- `pipeline/rules/trigger.self_etb.ts` + `.test.ts` — new rule from creature_etb split.
- `pipeline/rules/trigger.another_creature_etb.ts` + `.test.ts` — renamed half of the split.

### Modified in Phase 0
- `pipeline/rules/types.ts` — extend `Rule` with optional `nearMiss: NearMissSpec`.
- `shared/types.ts` — no changes (tag/edge types unchanged).
- `pipeline/rules/<every existing rule>.ts` — add `tagDef` (or `tagDefs`) export alongside `rule` / `rules`.
- `pipeline/rules/index.ts` — rewrite as glob aggregator.
- `pipeline/catalog.ts` — rewrite as glob aggregator (preserves `RULE_VERSION` export).
- `pipeline/graph.ts` — extend `buildEdges` for bidirectional pairing.
- `pipeline/graph.test.ts` — add bidirectional pairing test.
- `pipeline/rules/effect.mill.ts` + `.test.ts` — broaden to accept word-form numbers.
- `pipeline/rules/trigger.counter_changed.ts` + `.test.ts` — broaden phrasing.
- `pipeline/rules/trigger.creature_etb.ts` — **deleted**, replaced by self_etb + another_creature_etb.
- `pipeline/rules/trigger.creature_etb.test.ts` — **deleted**, replaced.
- `package.json` — add `rule:coverage` and `rule:mine` scripts.

### Created in Phase 1 (one family each)
- Family 1: `pipeline/rules/effect.destroy_creature.ts`, `effect.destroy_permanent.ts`, `effect.counterspell.ts`, `effect.board_wipe.ts`, `effect.debuff_minus_n.ts` (+ tests).
- Family 2: `pipeline/rules/effect.add_mana.ts`, `effect.create_treasure.ts`, `effect.create_food.ts`, `effect.create_clue.ts` (+ tests).
- Family 3: `pipeline/rules/condition.cares_tribe.ts` + tests; `pipeline/themes.ts` extended; `pipeline/rules/effect.create_creature_token.ts` extended for metadata; `pipeline/graph.ts` extended for tribe edges.
- Family 4: `pipeline/rules/condition.cares_noncreature_spell.ts`, `effect.has_prowess.ts` (+ tests).
- Family 5: `pipeline/rules/effect.scry.ts`, `effect.surveil.ts`, `effect.look_at_top_n.ts`, `effect.tutor_any.ts` (+ tests).
- Family 6: `pipeline/rules/effect.tap.ts`, `effect.untap.ts` (+ tests).
- Family 7: `pipeline/rules/effect.control_change.ts`, `effect.copy_spell.ts`, `effect.copy_permanent.ts` (+ tests).
- Family 8: `pipeline/rules/condition.cares_lifegain.ts` (+ tests).
- Family 9: `pipeline/rules/condition.cares_tokens.ts`, `condition.cares_artifacts.ts`, `condition.cares_enchantments.ts`, `condition.cares_graveyard.ts` (+ tests).
- Family 10: `pipeline/rules/condition.bargain.ts`, `condition.adventure_matters.ts` (+ tests).
- Family 11: `pipeline/rules/effect.has_evasion.ts`, `effect.has_deathtouch.ts`, `effect.has_lifelink.ts`, `effect.has_first_strike.ts`, `effect.has_trample.ts`, `condition.cares_evasion.ts`, `condition.cares_deathtouch.ts` (+ tests).

### Modified in Phase 2
- `pipeline/catalog.ts` — bump `RULE_VERSION` to `'v0.7.0'`.
- `app/public/data/cards-standard.json` — regenerated artifact.
- `pipeline/reports/mine-exclusions.md` — documented intentional skips.

---

# Phase 0 — Foundation (sequential, main session)

Each task here is performed by the main session in order. No subagents spawn until Phase 0 is fully committed. Tasks are sized for 2–10 minutes of work.

## Task 0.1: Extend `Rule` type with `nearMiss` field

**Files:**
- Modify: `pipeline/rules/types.ts`

- [ ] **Step 1: Extend the type**

Replace the contents of `pipeline/rules/types.ts` with:

```ts
// pipeline/rules/types.ts
import type { TagAxis } from '../../shared/types';

export type TagMatch = {
  evidence: string;
  metadata?: Record<string, unknown>;
};

export type NearMissSpec = {
  anchors: string[];     // words that must appear in the normalized text
  proximity: string[];   // words that must appear within `window` whitespace-tokens of any anchor
  window: number;        // token distance (typical: 6–10)
};

export type Rule = {
  id: string;            // matches a TagDef.tagId
  axis: TagAxis;
  match: (normalizedText: string) => boolean | TagMatch;
  nearMiss?: NearMissSpec; // optional on legacy v0.6 rules; required on all rules added in v0.7
};
```

- [ ] **Step 2: Run tests to confirm nothing breaks**

Run: `npm test`
Expected: all existing tests pass — adding an optional field is backward-compatible.

- [ ] **Step 3: Commit**

```bash
git add pipeline/rules/types.ts
git commit -m "feat(pipeline): add optional NearMissSpec to Rule type"
```

---

## Task 0.2: Co-locate `tagDef` exports with each existing rule

**Files:**
- Modify: every `pipeline/rules/(trigger|effect|condition).*.ts` (excluding `index.ts`, `types.ts`, `runner.ts`, `runner.test.ts`).

This task adds a `tagDef` (or `tagDefs`) export to each rule file by copying the existing entry from `pipeline/catalog.ts`. After this task `catalog.ts` is still authoritative — we switch to the aggregator in Task 0.4.

- [ ] **Step 1: Identify the list of rule files**

Run: `ls pipeline/rules/*.ts | grep -vE '(index|types|runner)\.ts'`
Expected: ~27 files.

- [ ] **Step 2: For each singular-export rule file, add a `tagDef` import + export**

For each file matching `pipeline/rules/(trigger|effect|condition).<id>.ts` that currently exports `export const rule: Rule = {...}`, add at the top:

```ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: '<id-from-catalog>',
  axis: '<axis-from-catalog>',
  label: '<label-from-catalog>',
  description: '<description-from-catalog>',
  pairsWith: [<pairsWith-from-catalog>],
};
```

Copy the exact `tagId`, `axis`, `label`, `description`, and `pairsWith` from the corresponding entry in `pipeline/catalog.ts`. Place the `tagDef` export above the `rule` export.

Example — `pipeline/rules/effect.bounce_or_blink.ts` becomes:

```ts
// pipeline/rules/effect.bounce_or_blink.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_or_blink',
  axis: 'effect',
  label: 'Bounces or blinks',
  description: 'Returns a permanent to hand, or exiles and returns it (re-triggering ETB).',
  pairsWith: ['trigger.creature_etb', 'trigger.permanent_leaves_battlefield'],
};

export const rule: Rule = {
  id: 'effect.bounce_or_blink',
  axis: 'effect',
  match: (t) => {
    const m = t.match(/(?:return target (?:[\w\s]+? )?(?:to its owner's hand|to your hand)|exile [^.]*?(?:, then |[.] )return)/);
    return m ? { evidence: m[0] } : false;
  },
};
```

- [ ] **Step 3: For the two parametric files, add a `tagDefs` (plural) export**

`pipeline/rules/effect.tutors_subtype.ts` — after the existing `rules` export, add:

```ts
import type { TagDef } from '../../shared/types';
import { capitalize, pluralize } from '../themes';

export const tagDefs: TagDef[] = THEME_SUBTYPES.map((subtype) => ({
  tagId: `effect.tutors_subtype.${subtype}`,
  axis: 'effect',
  label: `Tutors a ${capitalize(subtype)}`,
  description: `Searches library for a ${capitalize(subtype)} card.`,
  pairsWith: [`condition.cares_subtype.${subtype}`],
  category: 'theme',
}));
```

`pipeline/rules/condition.cares_subtype.ts` — same pattern:

```ts
export const tagDefs: TagDef[] = THEME_SUBTYPES.map((subtype) => ({
  tagId: `condition.cares_subtype.${subtype}`,
  axis: 'condition',
  label: `Cares about ${capitalize(pluralize(subtype))}`,
  description: `References the ${capitalize(subtype)} subtype.`,
  pairsWith: [`effect.tutors_subtype.${subtype}`],
  category: 'theme',
}));
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests still pass. The `tagDef` exports are unused for now — `catalog.ts` still drives `tagCatalog`.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/
git commit -m "refactor(pipeline): co-locate TagDef exports with rule files"
```

---

## Task 0.3: Write the glob aggregator helper

**Files:**
- Create: `pipeline/rules/aggregator.ts`
- Create: `pipeline/rules/aggregator.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// pipeline/rules/aggregator.test.ts
import { describe, it, expect } from 'vitest';
import { aggregateRules, aggregateTagDefs } from './aggregator';

describe('aggregateRules', () => {
  it('collects all rules from rule files', () => {
    const rules = aggregateRules();
    // sanity: we have at least the legacy v0.6 rules
    const ids = new Set(rules.map((r) => r.id));
    expect(ids.has('effect.bounce_or_blink')).toBe(true);
    expect(ids.has('trigger.creature_dies')).toBe(true);
  });

  it('includes parametric rules expanded from THEME_SUBTYPES', () => {
    const rules = aggregateRules();
    const ids = new Set(rules.map((r) => r.id));
    expect(ids.has('effect.tutors_subtype.shrine')).toBe(true);
    expect(ids.has('condition.cares_subtype.aura')).toBe(true);
  });

  it('returns rules in stable sorted order', () => {
    const a = aggregateRules().map((r) => r.id);
    const b = aggregateRules().map((r) => r.id);
    expect(a).toEqual(b);
    expect(a).toEqual([...a].sort());
  });
});

describe('aggregateTagDefs', () => {
  it('every rule has a matching tagDef', () => {
    const rules = aggregateRules();
    const defs = aggregateTagDefs();
    const defIds = new Set(defs.map((d) => d.tagId));
    for (const r of rules) {
      expect(defIds.has(r.id), `rule ${r.id} missing tagDef`).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run pipeline/rules/aggregator.test.ts`
Expected: FAIL — `aggregator.ts` does not exist.

- [ ] **Step 3: Implement the aggregator**

```ts
// pipeline/rules/aggregator.ts
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

const here = dirname(fileURLToPath(import.meta.url));

const SKIP = new Set(['index.ts', 'types.ts', 'runner.ts', 'aggregator.ts']);

function ruleFiles(): string[] {
  return readdirSync(here)
    .filter((f) => f.endsWith('.ts'))
    .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.d.ts'))
    .filter((f) => !SKIP.has(f))
    .filter((f) => /^(trigger|effect|condition)\./.test(f))
    .sort();
}

type RuleModule = {
  rule?: Rule;
  rules?: Rule[];
  tagDef?: TagDef;
  tagDefs?: TagDef[];
};

async function loadAll(): Promise<RuleModule[]> {
  const mods: RuleModule[] = [];
  for (const f of ruleFiles()) {
    const url = pathToFileURL(join(here, f)).href;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: RuleModule = (await import(url)) as any;
    mods.push(m);
  }
  return mods;
}

// Synchronous wrapper using top-level await at module-load time would require
// callers to be async. Instead we cache the result of an async warm-up.
let cached: { rules: Rule[]; tagDefs: TagDef[] } | null = null;
let warming: Promise<void> | null = null;

async function warm(): Promise<void> {
  if (cached) return;
  const mods = await loadAll();
  const rules: Rule[] = [];
  const tagDefs: TagDef[] = [];
  for (const m of mods) {
    if (m.rule) rules.push(m.rule);
    if (m.rules) rules.push(...m.rules);
    if (m.tagDef) tagDefs.push(m.tagDef);
    if (m.tagDefs) tagDefs.push(...m.tagDefs);
  }
  rules.sort((a, b) => a.id.localeCompare(b.id));
  tagDefs.sort((a, b) => a.tagId.localeCompare(b.tagId));
  cached = { rules, tagDefs };
}

export function aggregateRulesSync(): Rule[] {
  if (!cached) throw new Error('aggregator not warmed; call ensureWarmed() first');
  return cached.rules;
}

export function aggregateTagDefsSync(): TagDef[] {
  if (!cached) throw new Error('aggregator not warmed; call ensureWarmed() first');
  return cached.tagDefs;
}

// Convenience for tests / scripts: warms then returns.
export async function aggregateRules(): Promise<Rule[]> {
  if (!cached) await (warming ??= warm());
  return cached!.rules;
}

export async function aggregateTagDefs(): Promise<TagDef[]> {
  if (!cached) await (warming ??= warm());
  return cached!.tagDefs;
}

export async function ensureWarmed(): Promise<void> {
  if (!cached) await (warming ??= warm());
}
```

- [ ] **Step 4: Adjust the test for async aggregators**

Update the test file to `await` the aggregators:

```ts
// inside each it() block:
it('collects all rules from rule files', async () => {
  const rules = await aggregateRules();
  ...
});
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run pipeline/rules/aggregator.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pipeline/rules/aggregator.ts pipeline/rules/aggregator.test.ts
git commit -m "feat(pipeline): glob-discover rules and tag defs from rule files"
```

---

## Task 0.4: Rewire `pipeline/rules/index.ts` and `pipeline/catalog.ts` to use the aggregator

**Files:**
- Modify: `pipeline/rules/index.ts`
- Modify: `pipeline/catalog.ts`
- Modify: `pipeline/index.ts` — switch to awaited warming.

- [ ] **Step 1: Rewrite `pipeline/rules/index.ts`**

Replace its entire contents with:

```ts
// pipeline/rules/index.ts
export { aggregateRules as allRulesAsync, ensureWarmed } from './aggregator';
import { aggregateRulesSync } from './aggregator';
export const allRules = new Proxy([] as unknown as ReturnType<typeof aggregateRulesSync>, {
  get(_target, prop) {
    return Reflect.get(aggregateRulesSync(), prop as keyof Array<unknown>);
  },
});
```

Why the Proxy: existing imports (`pipeline/index.ts`, `pipeline/catalog.test.ts`) read `allRules` synchronously. The Proxy lets us keep that interface while the actual data warms once at startup.

- [ ] **Step 2: Rewrite `pipeline/catalog.ts`**

Replace its entire contents with:

```ts
// pipeline/catalog.ts
import type { TagDef } from '../shared/types';
import { aggregateTagDefsSync } from './rules/aggregator';

export const tagCatalog: TagDef[] = new Proxy([] as TagDef[], {
  get(_target, prop) {
    return Reflect.get(aggregateTagDefsSync(), prop as keyof Array<unknown>);
  },
});

export const RULE_VERSION = 'v0.6.0'; // bumped to v0.7.0 in Phase 2
```

- [ ] **Step 3: Warm the aggregator at CLI startup**

Modify `pipeline/index.ts` `main()` to call `await ensureWarmed()` as the first line:

```ts
async function main() {
  const { ensureWarmed } = await import('./rules');
  await ensureWarmed();
  const args = parseArgs(process.argv.slice(2));
  ...
}
```

- [ ] **Step 4: Warm in test setup**

Vitest tests synchronously import `allRules` and `tagCatalog`. Add a `pipeline/test-setup.ts`:

```ts
// pipeline/test-setup.ts
import { ensureWarmed } from './rules/aggregator';
await ensureWarmed();
```

Update `vitest.config.ts` (root) to include this in `setupFiles`. If `vitest.config.ts` doesn't exist at the root, check `pipeline/tsconfig.json` for the test runner config; otherwise create a minimal `vitest.config.ts`:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    setupFiles: ['./pipeline/test-setup.ts'],
  },
});
```

- [ ] **Step 5: Run all pipeline tests**

Run: `npm test`
Expected: all tests pass with the same outputs as before. The catalog consistency test (`pipeline/catalog.test.ts`) now runs against the aggregated catalog instead of the manual one — identical contents.

- [ ] **Step 6: Confirm artifact build still works**

Run: `npm run build:cards -- --set tdm`
Expected: produces `app/public/data/cards-tdm.json` with same tag distribution as before this task (verifiable via `jq`).

- [ ] **Step 7: Commit**

```bash
git add pipeline/rules/index.ts pipeline/catalog.ts pipeline/index.ts pipeline/test-setup.ts vitest.config.ts
git commit -m "refactor(pipeline): drive rules registry and catalog from glob aggregator"
```

---

## Task 0.5: Bidirectional pairing in the graph builder

**Files:**
- Modify: `pipeline/graph.ts`
- Modify: `pipeline/graph.test.ts`

- [ ] **Step 1: Write a failing test for the bidirectional case**

Append to `pipeline/graph.test.ts`:

```ts
it('emits an edge when only the condition side declares the pairing', () => {
  const cards: Card[] = [
    {
      ...baseCard('source-id', 'Lifegainer'),
      tags: [{ tagId: 'effect.life_changed', axis: 'effect', evidence: 'gain life' }],
    },
    {
      ...baseCard('target-id', 'Cares Card'),
      tags: [{ tagId: 'condition.cares_lifegain', axis: 'condition', evidence: 'whenever you gain life' }],
    },
  ];
  const catalog: TagDef[] = [
    { tagId: 'effect.life_changed', axis: 'effect', label: '', description: '', pairsWith: [] }, // intentionally NO pairing here
    { tagId: 'condition.cares_lifegain', axis: 'condition', label: '', description: '', pairsWith: ['effect.life_changed'] }, // pairing on this side only
  ];
  const edges = buildEdges(cards, catalog);
  expect(edges).toHaveLength(1);
  expect(edges[0]).toMatchObject({
    source: 'source-id',
    target: 'target-id',
    reason: { sourceTagId: 'effect.life_changed', targetTagId: 'condition.cares_lifegain' },
  });
});

it('does not duplicate edges when both sides declare the pairing', () => {
  const cards: Card[] = [
    {
      ...baseCard('source-id', 'Pump'),
      tags: [{ tagId: 'effect.plus_one_counter', axis: 'effect', evidence: '+1/+1' }],
    },
    {
      ...baseCard('target-id', 'Cares Card'),
      tags: [{ tagId: 'condition.cares_plus_one_counter', axis: 'condition', evidence: 'with +1/+1' }],
    },
  ];
  const catalog: TagDef[] = [
    { tagId: 'effect.plus_one_counter', axis: 'effect', label: '', description: '', pairsWith: ['condition.cares_plus_one_counter'] },
    { tagId: 'condition.cares_plus_one_counter', axis: 'condition', label: '', description: '', pairsWith: ['effect.plus_one_counter'] },
  ];
  const edges = buildEdges(cards, catalog);
  expect(edges).toHaveLength(1);
});
```

Make sure a `baseCard` helper exists at the top of the test file (or inline a minimal `Card` literal — match whatever convention the existing test uses).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run pipeline/graph.test.ts`
Expected: FAIL — the first test expects 1 edge but gets 0 because today only effect.pairsWith is walked.

- [ ] **Step 3: Implement bidirectional walking**

Replace `pipeline/graph.ts` with:

```ts
// pipeline/graph.ts
import type { Card, InteractionEdge, TagDef } from '../shared/types';

export function buildEdges(cards: Card[], catalog: TagDef[]): InteractionEdge[] {
  const tagDefById = new Map(catalog.map((t) => [t.tagId, t]));
  const edges: InteractionEdge[] = [];
  const seen = new Set<string>();

  // Index cards by every tag they have, regardless of axis.
  const cardsByTag = new Map<string, Set<string>>();
  for (const c of cards) {
    for (const t of c.tags) {
      let s = cardsByTag.get(t.tagId);
      if (!s) cardsByTag.set(t.tagId, (s = new Set()));
      s.add(c.oracleId);
    }
  }

  // Resolve every pairing (effect, trigger-or-condition), regardless of which side
  // declares it. Pairings are normalized so the effect-side is always the source.
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

  for (const { effectId, consumerId } of pairings) {
    const sources = cardsByTag.get(effectId);
    const targets = cardsByTag.get(consumerId);
    if (!sources || !targets) continue;
    for (const source of sources) {
      for (const target of targets) {
        if (source === target) continue;
        const key = `${source}|${target}|${effectId}|${consumerId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({
          source,
          target,
          reason: { sourceTagId: effectId, targetTagId: consumerId, direction: 'source_produces_for_target' },
        });
      }
    }
  }

  return edges;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run pipeline/graph.test.ts`
Expected: all tests in `graph.test.ts` pass.

- [ ] **Step 5: Verify total edge count is unchanged on the current artifact**

Run: `npm run build:cards -- --set tdm`
Then: `node -e "console.log(JSON.parse(require('fs').readFileSync('app/public/data/cards-tdm.json')).edges.length)"`
Expected: same as before the refactor (the catalog has effect-side pairings in v0.6, so the new builder produces the same edges). Compare against the artifact prior to refactor — small variance acceptable only if explained by deterministic ordering changes. If counts differ, debug before continuing.

- [ ] **Step 6: Commit**

```bash
git add pipeline/graph.ts pipeline/graph.test.ts
git commit -m "feat(pipeline): graph builder walks pairsWith bidirectionally"
```

---

## Task 0.6: Implement `isTaggable` helper

**Files:**
- Create: `pipeline/coverage.ts`
- Create: `pipeline/coverage.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// pipeline/coverage.test.ts
import { describe, it, expect } from 'vitest';
import { isTaggable } from './coverage';
import type { Card } from '../shared/types';

function card(overrides: Partial<Card>): Card {
  return {
    oracleId: 'x', name: 'X', set: 'tst', printings: ['tst'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: '',
    types: [], subtypes: [], supertypes: [], oracleText: '', keywords: [],
    power: null, toughness: null, rarity: 'common', imageUrl: '', tags: [],
    ...overrides,
  };
}

describe('isTaggable', () => {
  it('returns false for true vanilla', () => {
    expect(isTaggable(card({ oracleText: '' }))).toBe(false);
  });

  it('returns false for a basic land', () => {
    expect(isTaggable(card({
      typeLine: 'Basic Land — Plains',
      types: ['Land'], supertypes: ['Basic'], subtypes: ['Plains'],
      oracleText: '({T}: Add {W}.)',
    }))).toBe(false);
  });

  it('returns false for a plain mana-tap land', () => {
    expect(isTaggable(card({
      typeLine: 'Land', types: ['Land'],
      oracleText: '{T}: Add {G}.',
    }))).toBe(false);
  });

  it('returns false for a multi-mana plain tap land', () => {
    expect(isTaggable(card({
      typeLine: 'Land', types: ['Land'],
      oracleText: '{T}: Add {G} or {U}.',
    }))).toBe(false);
  });

  it('returns true for a vanilla flying creature (Family 11 will tag it)', () => {
    expect(isTaggable(card({
      typeLine: 'Creature — Bird', types: ['Creature'],
      oracleText: 'Flying', keywords: ['Flying'],
    }))).toBe(true);
  });

  it('returns true for a land with a non-mana ability', () => {
    expect(isTaggable(card({
      typeLine: 'Land', types: ['Land'],
      oracleText: '{T}: Add {G}.\nWhen this land enters, scry 1.',
    }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run pipeline/coverage.test.ts`
Expected: FAIL — `coverage.ts` does not exist.

- [ ] **Step 3: Implement `isTaggable`**

```ts
// pipeline/coverage.ts
import type { Card } from '../shared/types';
import { normalizeOracleText } from './normalize';

export function isBasicLand(card: Card): boolean {
  return card.types.includes('Land') && card.supertypes.includes('Basic');
}

const MANA_TAP_ONLY = /^(\s*\{t\}\s*:\s*add[^.]+\.?\s*)+$/;

export function isPlainManaTapLand(card: Card, normalized: string): boolean {
  if (!card.types.includes('Land')) return false;
  return MANA_TAP_ONLY.test(normalized);
}

export function isTaggable(card: Card): boolean {
  const normalized = normalizeOracleText(card.oracleText, card.name);
  if (normalized.length === 0) return false;
  if (isBasicLand(card)) return false;
  if (isPlainManaTapLand(card, normalized)) return false;
  return true;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run pipeline/coverage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/coverage.ts pipeline/coverage.test.ts
git commit -m "feat(pipeline): isTaggable helper for coverage denominator"
```

---

## Task 0.7: Implement `rule:coverage` script

**Files:**
- Create: `pipeline/scripts/coverage-report.ts`
- Create: `pipeline/scripts/coverage-report.test.ts`
- Create: `pipeline/scripts/rule-coverage.ts`
- Modify: `package.json`

- [ ] **Step 1: Write a failing test for the near-miss logic**

```ts
// pipeline/scripts/coverage-report.test.ts
import { describe, it, expect } from 'vitest';
import { hasNearMiss } from './coverage-report';

describe('hasNearMiss', () => {
  it('finds an anchor within window of a proximity term', () => {
    expect(hasNearMiss('destroy target creature', { anchors: ['destroy'], proximity: ['creature'], window: 8 })).toBe(true);
  });
  it('rejects when anchor and proximity are too far apart', () => {
    const text = 'destroy ' + 'foo '.repeat(20) + 'creature';
    expect(hasNearMiss(text, { anchors: ['destroy'], proximity: ['creature'], window: 8 })).toBe(false);
  });
  it('finds anchor either side of proximity', () => {
    expect(hasNearMiss('creatures you control destroy', { anchors: ['destroy'], proximity: ['creature'], window: 8 })).toBe(true);
  });
  it('returns false when neither anchor nor proximity appears', () => {
    expect(hasNearMiss('draw a card', { anchors: ['destroy'], proximity: ['creature'], window: 8 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run pipeline/scripts/coverage-report.test.ts`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement `hasNearMiss` + the report builder**

```ts
// pipeline/scripts/coverage-report.ts
import type { Card } from '../../shared/types';
import type { NearMissSpec, Rule } from '../rules/types';
import { isTaggable } from '../coverage';
import { normalizeOracleText } from '../normalize';

export function hasNearMiss(normalized: string, spec: NearMissSpec): boolean {
  const tokens = normalized.split(/\s+/);
  const anchorSet = new Set(spec.anchors.map((a) => a.toLowerCase()));
  const proxSet = new Set(spec.proximity.map((p) => p.toLowerCase()));
  // Substring match — proximity words like "creature" need to also catch "creatures".
  const isAnchor = (t: string) => [...anchorSet].some((a) => t.includes(a));
  const isProx = (t: string) => [...proxSet].some((p) => t.includes(p));
  const anchorIdx: number[] = [];
  const proxIdx: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i] ?? '';
    if (isAnchor(tok)) anchorIdx.push(i);
    if (isProx(tok)) proxIdx.push(i);
  }
  for (const a of anchorIdx) {
    for (const p of proxIdx) {
      if (Math.abs(a - p) <= spec.window) return true;
    }
  }
  return false;
}

export type RuleCoverage = {
  ruleId: string;
  matches: number;
  matchSample: Array<{ oracleId: string; name: string; evidence: string }>;
  nearMissSample: Array<{ oracleId: string; name: string }>;
  taggablePct: number;
  naivePct: number;
};

function pickRandom<T>(arr: T[], n: number, seed: number): T[] {
  // Deterministic: hash-shuffle by index then take first n.
  return [...arr]
    .map((v, i) => ({ v, k: ((i + 1) * 2654435761) ^ seed }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((x) => x.v);
}

export function buildRuleCoverage(cards: Card[], rule: Rule, seed = 1): RuleCoverage {
  const positives: Array<{ oracleId: string; name: string; evidence: string }> = [];
  for (const c of cards) {
    const normalized = normalizeOracleText(c.oracleText, c.name);
    const m = rule.match(normalized);
    if (m) {
      positives.push({ oracleId: c.oracleId, name: c.name, evidence: typeof m === 'object' ? m.evidence : '' });
    }
  }
  const total = cards.length;
  const taggable = cards.filter(isTaggable).length;
  const matchSample = pickRandom(positives, 10, seed);
  let nearMissSample: Array<{ oracleId: string; name: string }> = [];
  if (rule.nearMiss) {
    const matchedIds = new Set(positives.map((p) => p.oracleId));
    const candidates: Array<{ oracleId: string; name: string }> = [];
    for (const c of cards) {
      if (matchedIds.has(c.oracleId)) continue;
      const normalized = normalizeOracleText(c.oracleText, c.name);
      if (hasNearMiss(normalized, rule.nearMiss)) {
        candidates.push({ oracleId: c.oracleId, name: c.name });
      }
    }
    nearMissSample = pickRandom(candidates, 20, seed + 1);
  }
  return {
    ruleId: rule.id,
    matches: positives.length,
    matchSample,
    nearMissSample,
    taggablePct: (positives.length / taggable) * 100,
    naivePct: (positives.length / total) * 100,
  };
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run pipeline/scripts/coverage-report.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the CLI**

```ts
// pipeline/scripts/rule-coverage.ts
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureWarmed, aggregateRulesSync, aggregateTagDefsSync } from '../rules/aggregator';
import { buildRuleCoverage } from './coverage-report';
import { isTaggable } from '../coverage';
import type { Artifact } from '../../shared/types';

const ARTIFACT_PATH = resolve(process.cwd(), 'app/public/data/cards-standard.json');

async function main() {
  await ensureWarmed();
  const args = process.argv.slice(2);
  const artifact: Artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'));
  const cards = artifact.cards;
  const rules = aggregateRulesSync();
  const tagDefs = aggregateTagDefsSync();
  const tagDefIds = new Set(tagDefs.map((t) => t.tagId));

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

  const isAll = args[0] === '--all';
  const targetIds = isAll ? rules.map((r) => r.id) : [args[0] ?? ''];
  const reports = [];
  for (const id of targetIds) {
    if (!id) { console.error('Usage: rule:coverage [--all|--pairings|<ruleId>]'); process.exit(1); }
    const rule = rules.find((r) => r.id === id);
    if (!rule) { console.error(`No such rule: ${id}`); process.exit(1); }
    const r = buildRuleCoverage(cards, rule);
    reports.push(r);
    if (isAll) {
      console.log(`${r.ruleId.padEnd(40)} matches=${String(r.matches).padStart(5)}  taggable=${r.taggablePct.toFixed(1)}%`);
    } else {
      console.log(`rule: ${r.ruleId}`);
      console.log(`  matches: ${r.matches} cards (${r.naivePct.toFixed(1)}% of all, ${r.taggablePct.toFixed(1)}% of taggable)`);
      console.log('');
      console.log('  --- 10 random positives ---');
      for (const p of r.matchSample) console.log(`  ${p.name.padEnd(40)} ${p.evidence}`);
      if (rule.nearMiss) {
        console.log('');
        console.log(`  --- 20 near-miss unmatched cards (anchor=${rule.nearMiss.anchors.join(',')}, proximity=${rule.nearMiss.proximity.join(',')}, window=${rule.nearMiss.window}) ---`);
        for (const p of r.nearMissSample) console.log(`  ${p.name}`);
      }
    }
  }

  if (isAll) {
    const taggableTotal = cards.filter(isTaggable).length;
    const taggedTaggable = cards.filter((c) => isTaggable(c) && c.tags.length > 0).length;
    console.log('');
    console.log(`Aggregate taggable coverage: ${taggedTaggable}/${taggableTotal} = ${((taggedTaggable / taggableTotal) * 100).toFixed(1)}%`);
  }

  mkdirSync(resolve(process.cwd(), 'pipeline/reports'), { recursive: true });
  writeFileSync(resolve(process.cwd(), 'pipeline/reports/rule-coverage.json'), JSON.stringify(reports, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 6: Add npm script**

In `package.json` under `"scripts"`, add:

```json
"rule:coverage": "tsx pipeline/scripts/rule-coverage.ts"
```

- [ ] **Step 7: Smoke-test the script**

Run: `npm run rule:coverage -- effect.bounce_or_blink`
Expected: prints match count, 10 positives, no near-miss section (legacy rule has no `nearMiss`).

Run: `npm run rule:coverage -- --all`
Expected: prints one line per rule plus an aggregate coverage line.

Run: `npm run rule:coverage -- --pairings`
Expected: prints "All pairings resolve."

- [ ] **Step 8: Commit**

```bash
git add pipeline/scripts/rule-coverage.ts pipeline/scripts/coverage-report.ts pipeline/scripts/coverage-report.test.ts package.json
git commit -m "feat(pipeline): rule:coverage CLI with near-miss surfacing"
```

---

## Task 0.8: Implement `rule:mine` script

**Files:**
- Create: `pipeline/scripts/mine.ts`
- Create: `pipeline/scripts/mine.test.ts`
- Create: `pipeline/scripts/rule-mine.ts`
- Create: `pipeline/reports/STOPWORDS.txt`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

```ts
// pipeline/scripts/mine.test.ts
import { describe, it, expect } from 'vitest';
import { ngrams, topNgrams } from './mine';

describe('ngrams', () => {
  it('produces 2-grams', () => {
    expect(ngrams('add one mana to your pool', 2, new Set())).toEqual([
      'add one', 'one mana', 'mana to', 'to your', 'your pool',
    ]);
  });
  it('filters stopword-bordered ngrams', () => {
    const stop = new Set(['the', 'a']);
    expect(ngrams('the red card', 2, stop)).toEqual(['red card']);
  });
});

describe('topNgrams', () => {
  it('counts and sorts by frequency descending', () => {
    const out = topNgrams(['add one mana', 'add one mana', 'mill three cards'], 2, new Set(), 1);
    expect(out[0]).toEqual({ ngram: 'add one', count: 2 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run pipeline/scripts/mine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement n-gram extraction**

```ts
// pipeline/scripts/mine.ts
export function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}

export function ngrams(text: string, n: number, stopwords: Set<string>): string[] {
  const toks = tokenize(text);
  const out: string[] = [];
  for (let i = 0; i + n <= toks.length; i++) {
    const window = toks.slice(i, i + n);
    if (stopwords.has(window[0]!) || stopwords.has(window[n - 1]!)) continue;
    out.push(window.join(' '));
  }
  return out;
}

export function topNgrams(
  texts: string[],
  n: number,
  stopwords: Set<string>,
  minFreq: number,
): Array<{ ngram: string; count: number }> {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const g of ngrams(text, n, stopwords)) {
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= minFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([ngram, count]) => ({ ngram, count }));
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run pipeline/scripts/mine.test.ts`
Expected: PASS.

- [ ] **Step 5: Create stopword file**

```text
# pipeline/reports/STOPWORDS.txt
a
an
the
to
of
and
or
in
on
for
with
that
this
it
its
your
you
their
them
they
each
any
all
as
at
be
is
are
was
were
do
does
not
no
one
two
three
four
five
six
seven
eight
nine
ten
target
control
controls
controlled
end
turn
when
whenever
if
may
than
then
this
those
these
have
has
had
get
gets
got
into
from
by
up
down
under
over
out
off
also
gain
gains
gained
put
puts
```

Make sure the file is committed; if you add stopwords later, append them. Comments (lines beginning with `#`) are stripped at load time.

- [ ] **Step 6: Implement the CLI**

```ts
// pipeline/scripts/rule-mine.ts
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureWarmed } from '../rules/aggregator';
import { topNgrams } from './mine';
import { isTaggable } from '../coverage';
import { normalizeOracleText } from '../normalize';
import type { Artifact } from '../../shared/types';

const ARTIFACT_PATH = resolve(process.cwd(), 'app/public/data/cards-standard.json');
const STOP_PATH = resolve(process.cwd(), 'pipeline/reports/STOPWORDS.txt');
const MIN_FREQ_DEFAULT = 30;
const TOP_DISPLAY = 50;

async function main() {
  await ensureWarmed();
  const args = process.argv.slice(2);
  const minIdx = args.indexOf('--min');
  const minFreq = minIdx !== -1 ? Number(args[minIdx + 1]) : MIN_FREQ_DEFAULT;

  const artifact: Artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'));
  const stop = new Set(
    readFileSync(STOP_PATH, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#')),
  );

  const untaggedTaggableTexts = artifact.cards
    .filter((c) => isTaggable(c) && c.tags.length === 0)
    .map((c) => normalizeOracleText(c.oracleText, c.name));

  const twoGrams = topNgrams(untaggedTaggableTexts, 2, stop, minFreq);
  const threeGrams = topNgrams(untaggedTaggableTexts, 3, stop, minFreq);

  console.log(`Top 2-grams in untagged taggable cards (n=${untaggedTaggableTexts.length}, min=${minFreq}):`);
  for (const { ngram, count } of twoGrams.slice(0, TOP_DISPLAY)) {
    console.log(`  ${String(count).padStart(4)}  ${ngram}`);
  }
  console.log('');
  console.log(`Top 3-grams in untagged taggable cards:`);
  for (const { ngram, count } of threeGrams.slice(0, TOP_DISPLAY)) {
    console.log(`  ${String(count).padStart(4)}  ${ngram}`);
  }

  mkdirSync(resolve(process.cwd(), 'pipeline/reports'), { recursive: true });
  writeFileSync(
    resolve(process.cwd(), 'pipeline/reports/rule-mine.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), minFreq, twoGrams, threeGrams }, null, 2),
  );
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 7: Add npm script**

In `package.json` under `"scripts"`, add:

```json
"rule:mine": "tsx pipeline/scripts/rule-mine.ts"
```

- [ ] **Step 8: Smoke-test**

Run: `npm run rule:mine`
Expected: prints top n-grams; writes `pipeline/reports/rule-mine.json`. The top 2-grams should include obvious untagged mechanic signals like "add mana", "destroy target", "counter target", "stun counter".

- [ ] **Step 9: Commit**

```bash
git add pipeline/scripts/mine.ts pipeline/scripts/mine.test.ts pipeline/scripts/rule-mine.ts pipeline/reports/STOPWORDS.txt package.json
git commit -m "feat(pipeline): rule:mine CLI for surfacing untagged ngrams"
```

---

## Task 0.9: Commit the baseline mine snapshot

**Files:**
- Create: `pipeline/reports/baseline-mine-2026-05-21.json`

- [ ] **Step 1: Copy current `rule-mine.json` as the baseline**

```bash
cp pipeline/reports/rule-mine.json pipeline/reports/baseline-mine-2026-05-21.json
```

- [ ] **Step 2: Commit**

```bash
git add pipeline/reports/baseline-mine-2026-05-21.json
git commit -m "chore(pipeline): commit v0.7 baseline rule:mine snapshot"
```

This file is the diff target at the end of Phase 2.

---

## Task 0.10: Brittle fix — split `trigger.creature_etb` into self vs another

**Files:**
- Delete: `pipeline/rules/trigger.creature_etb.ts`
- Delete: `pipeline/rules/trigger.creature_etb.test.ts`
- Create: `pipeline/rules/trigger.self_etb.ts`
- Create: `pipeline/rules/trigger.self_etb.test.ts`
- Create: `pipeline/rules/trigger.another_creature_etb.ts`
- Create: `pipeline/rules/trigger.another_creature_etb.test.ts`
- Modify: `pipeline/rules/effect.create_creature_token.ts`, `effect.reanimate.ts`, `effect.bounce_or_blink.ts` — update their `tagDef.pairsWith` from `trigger.creature_etb` → `trigger.another_creature_etb`.

- [ ] **Step 1: Write the failing test for `trigger.self_etb`**

```ts
// pipeline/rules/trigger.self_etb.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.self_etb';

describe('trigger.self_etb', () => {
  it.each([
    ['when __self__ enters, draw a card'],
    ['when __self__ enters the battlefield, scry 2'],
    ['__self__ enters with a +1/+1 counter on it. when __self__ enters, gain 2 life'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['whenever a creature enters, draw a card'],          // another-creature ETB, not self
    ['whenever another creature enters the battlefield'], // ditto
    ['__self__ enters with a +1/+1 counter on it'],       // ETB modifier, not a trigger
    ['draw a card'],                                       // unrelated
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run pipeline/rules/trigger.self_etb.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `trigger.self_etb`**

```ts
// pipeline/rules/trigger.self_etb.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.self_etb',
  axis: 'trigger',
  label: 'Triggers when this enters',
  description: 'Has an ability that triggers when this card itself enters the battlefield.',
  pairsWith: ['effect.bounce_or_blink', 'effect.reanimate', 'effect.copy_permanent'],
};

export const rule: Rule = {
  id: 'trigger.self_etb',
  axis: 'trigger',
  match: (t) => {
    // "When __self__ enters[, ...]" — does NOT match "enters with"
    const m = t.match(/when __self__ enters(?!\s+with)\b[^.]*?,/);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['enters'], proximity: ['__self__'], window: 4 },
};
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run pipeline/rules/trigger.self_etb.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test for `trigger.another_creature_etb`**

```ts
// pipeline/rules/trigger.another_creature_etb.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.another_creature_etb';

describe('trigger.another_creature_etb', () => {
  it.each([
    ['whenever a creature enters, draw a card'],
    ['whenever another creature you control enters'],
    ['whenever a creature you control enters the battlefield, gain 1 life'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['when __self__ enters, scry 2'],
    ['draw a card'],
    ['__self__ enters with a +1/+1 counter'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
```

- [ ] **Step 6: Implement `trigger.another_creature_etb`**

```ts
// pipeline/rules/trigger.another_creature_etb.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.another_creature_etb',
  axis: 'trigger',
  label: 'Triggers when another creature enters',
  description: 'Has an ability that triggers when a creature (other than itself) enters the battlefield.',
  pairsWith: ['effect.create_creature_token', 'effect.reanimate', 'effect.bounce_or_blink'],
};

export const rule: Rule = {
  id: 'trigger.another_creature_etb',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(/whenever (?:a |another )?creature(?:\s+\w+){0,3}\s+enters/);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['enters'], proximity: ['creature'], window: 6 },
};
```

- [ ] **Step 7: Update three effects' pairsWith**

Edit `pipeline/rules/effect.create_creature_token.ts` `tagDef.pairsWith`:
- Replace `'trigger.creature_etb'` with `'trigger.another_creature_etb'`.

Edit `pipeline/rules/effect.reanimate.ts` `tagDef.pairsWith`:
- Replace `'trigger.creature_etb'` with `'trigger.another_creature_etb'`. Keep `'trigger.creature_leaves_graveyard'`.

Edit `pipeline/rules/effect.bounce_or_blink.ts` `tagDef.pairsWith`:
- Replace `'trigger.creature_etb'` with `'trigger.another_creature_etb'`. Keep `'trigger.permanent_leaves_battlefield'`.

- [ ] **Step 8: Delete the old rule files**

```bash
rm pipeline/rules/trigger.creature_etb.ts pipeline/rules/trigger.creature_etb.test.ts
```

- [ ] **Step 9: Run all tests**

Run: `npm test`
Expected: all pass. The catalog consistency test now sees `trigger.self_etb` and `trigger.another_creature_etb` but no `trigger.creature_etb`; pairings updated to match.

- [ ] **Step 10: Verify coverage**

Run: `npm run rule:coverage -- trigger.another_creature_etb`
Expected: matches ≥ 200 cards (was 38 under old rule; the broadened phrasing should hit hundreds).

Run: `npm run rule:coverage -- trigger.self_etb`
Expected: matches ≥ 300 cards (most ETB triggers are self-ETB).

- [ ] **Step 11: Commit**

```bash
git add pipeline/rules/
git commit -m "fix(pipeline): split trigger.creature_etb into self_etb + another_creature_etb"
```

---

## Task 0.11: Brittle fix — broaden `effect.mill`

**Files:**
- Modify: `pipeline/rules/effect.mill.ts`
- Modify: `pipeline/rules/effect.mill.test.ts`

- [ ] **Step 1: Extend the test with word-form cases**

```ts
// pipeline/rules/effect.mill.test.ts — add cases:
import { describe, it, expect } from 'vitest';
import { rule } from './effect.mill';

describe('effect.mill', () => {
  it.each([
    ['mill 3 cards'],
    ['mill four cards'],
    ['mill seven cards'],
    ['target player mills four cards'],
    ['each opponent mills three cards'],
    ['put the top four cards of your library into your graveyard'],
    ['put the top three cards of their library into their graveyard'],
    ['mill 10 cards'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });
  it.each([
    ['exile cards from your graveyard'],
    ['exile the top card of your library'],
    ['draw cards from your library'],
    ['scry 2'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify the word-form cases fail**

Run: `npx vitest run pipeline/rules/effect.mill.test.ts`
Expected: FAIL on "mill four cards", "mill seven cards", "target player mills four cards", "each opponent mills three cards".

- [ ] **Step 3: Rewrite the rule with word-form support and a `nearMiss`**

```ts
// pipeline/rules/effect.mill.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.mill',
  axis: 'effect',
  label: 'Mills cards',
  description: 'Puts cards from a library into a graveyard.',
  pairsWith: ['condition.cares_graveyard'],
};

const NUM = '(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|twenty)';

export const rule: Rule = {
  id: 'effect.mill',
  axis: 'effect',
  match: (t) => {
    const re = new RegExp(
      // direct "mill N cards" + "mills N cards"
      `\\bmills? ${NUM} cards?\\b` +
      // alternative phrasings:
      // "puts the top N cards of <subject> library into <subject> graveyard"
      `|\\bputs? the top ${NUM} cards? of [\\w\\s]+? library into [\\w\\s]+? graveyard`,
    );
    const m = t.match(re);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['mill', 'graveyard'], proximity: ['cards'], window: 8 },
};
```

(Family 9 adds the `condition.cares_graveyard` referenced in `pairsWith` — the consistency test will fail until Family 9 lands. Phase 0 ends with this expected; the failure is what motivates Family 9. **However** because Phase 0 must end with green tests, temporarily comment out the `pairsWith` for `condition.cares_graveyard` and add a TODO comment to restore it when Family 9 merges — `// TODO(family-9): restore once condition.cares_graveyard ships`. Phase 2 integration restores it.)

Actually: simpler — drop the `condition.cares_graveyard` pairing from `effect.mill.tagDef.pairsWith` for now, leaving `pairsWith: []`. Family 9 declares the pairing from the *condition* side (`condition.cares_graveyard.pairsWith: ['effect.mill', 'effect.reanimate', 'effect.exile_from_graveyard']`); with the bidirectional graph builder, the edge forms either way.

So `pairsWith: []` is correct here.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Verify coverage**

Run: `npm run rule:coverage -- effect.mill`
Expected: matches ≥ 60 cards (was 2; word-form is unlocked).

- [ ] **Step 6: Commit**

```bash
git add pipeline/rules/effect.mill.ts pipeline/rules/effect.mill.test.ts
git commit -m "fix(pipeline): broaden effect.mill to accept word-form numbers"
```

---

## Task 0.12: Brittle fix — broaden `trigger.counter_changed`

**Files:**
- Modify: `pipeline/rules/trigger.counter_changed.ts`
- Modify: `pipeline/rules/trigger.counter_changed.test.ts`

- [ ] **Step 1: Read the current rule and its test**

Run: `cat pipeline/rules/trigger.counter_changed.ts pipeline/rules/trigger.counter_changed.test.ts`
Note the existing regex and test cases.

- [ ] **Step 2: Add failing cases to the test**

Append to `pipeline/rules/trigger.counter_changed.test.ts`:

```ts
it.each([
  ['whenever a +1/+1 counter is put on a creature you control'],
  ['whenever one or more counters are placed on a permanent'],
  ['whenever a counter is removed from a creature'],
  ['whenever you put a counter on a permanent'],
])('matches (added): %s', (text) => {
  expect(rule.match(text)).toBeTruthy();
});
```

- [ ] **Step 3: Run to verify failures**

Run: `npx vitest run pipeline/rules/trigger.counter_changed.test.ts`
Expected: FAIL on the new cases.

- [ ] **Step 4: Broaden the regex**

```ts
// pipeline/rules/trigger.counter_changed.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.counter_changed',
  axis: 'trigger',
  label: 'Triggers on counter change',
  description: 'Triggers when counters are placed on or removed from a permanent.',
  pairsWith: ['effect.counter_modified', 'effect.plus_one_counter'],
};

export const rule: Rule = {
  id: 'trigger.counter_changed',
  axis: 'trigger',
  match: (t) => {
    const re =
      /whenever (?:[\w\s/+\-]+? )?counters? (?:is |are )?(?:put|placed|removed)/;
    // also covers "whenever you put a counter on" and similar
    const alt = /whenever (?:you|a player) puts? (?:a |an |one or more )?counters?/;
    const m = t.match(re) || t.match(alt);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['counter', 'counters'], proximity: ['whenever'], window: 8 },
};
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 6: Verify coverage**

Run: `npm run rule:coverage -- trigger.counter_changed`
Expected: matches ≥ 20 cards (was 5).

- [ ] **Step 7: Commit**

```bash
git add pipeline/rules/trigger.counter_changed.ts pipeline/rules/trigger.counter_changed.test.ts
git commit -m "fix(pipeline): broaden trigger.counter_changed phrasings"
```

---

## Task 0.13: Phase 0 sanity check

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all pipeline + shared tests pass.

- [ ] **Step 2: Run full coverage report**

Run: `npm run rule:coverage -- --all`
Expected: prints aggregate taggable coverage (a baseline number for Phase 1 to improve upon — likely 65–72% after the three brittle fixes).

- [ ] **Step 3: Re-run mine**

Run: `npm run rule:mine`
Expected: smaller untagged list than baseline (the brittle fixes pull cards out of the untagged pile). Don't overwrite `baseline-mine-2026-05-21.json` — that file is frozen.

- [ ] **Step 4: Commit anything left**

```bash
git status   # confirm clean working tree
```

- [ ] **Step 5: Tag the Phase 0 commit**

```bash
git tag v0.7.0-phase-0
```

Phase 0 is the parent commit for all 11 family worktrees in Phase 1.

---

# Phase 1 — Family work (parallel subagents)

**Orchestration:** The main session dispatches 11 implementer subagents in parallel. Each implementer agent gets a per-family brief (below) and works in its own git worktree branched from `v0.7.0-phase-0`. When an implementer signals completion via committed report file, the main session dispatches a paired reviewer subagent against that same worktree. The reviewer files findings; the implementer iterates if needed; once `approved`, the orchestrator merges the worktree.

Subagent dispatch:
- **Implementer:** `subagent_type: general-purpose` (with a strict TDD-discipline prompt) OR a custom `mtg-rule-implementer` if one exists. Choose at dispatch time.
- **Reviewer:** `subagent_type: code-reviewer` (or `general-purpose` with a strict reviewer prompt) — must be a *different* subagent type from the implementer.

Each family brief below contains: files, tag list with pairings, fixture-test starter cases, coverage commands, and the report templates.

## Family 1: Removal

**Worktree:** `~/worktrees/mtg-graph-family-1-removal` branched from `v0.7.0-phase-0`.

**New files (create all):**
- `pipeline/rules/effect.destroy_creature.ts` + `.test.ts`
- `pipeline/rules/effect.destroy_permanent.ts` + `.test.ts`
- `pipeline/rules/effect.counterspell.ts` + `.test.ts`
- `pipeline/rules/effect.board_wipe.ts` + `.test.ts`
- `pipeline/rules/effect.debuff_minus_n.ts` + `.test.ts`

**Tag definitions to implement (every rule file must export both `tagDef` and `rule`):**

| `tagId` | axis | label | description | pairsWith | nearMiss anchors / proximity / window |
|---|---|---|---|---|---|
| `effect.destroy_creature` | effect | Destroys a creature | Destroys a target creature. | `['trigger.creature_dies', 'trigger.permanent_leaves_battlefield']` | `['destroy']` / `['creature']` / `8` |
| `effect.destroy_permanent` | effect | Destroys a permanent | Destroys a target non-creature permanent (artifact, enchantment, planeswalker, land). | `['trigger.permanent_leaves_battlefield']` | `['destroy']` / `['artifact','enchantment','permanent','planeswalker','land']` / `8` |
| `effect.counterspell` | effect | Counters a spell | Counters a target spell on the stack. | `[]` (defensive — no edges) | `['counter']` / `['spell','ability']` / `6` |
| `effect.board_wipe` | effect | Sweeps the board | Destroys or exiles all creatures (or all of a category) at once. | `['trigger.creature_dies', 'trigger.permanent_leaves_battlefield']` | `['all','each']` / `['destroy','exile']` / `6` |
| `effect.debuff_minus_n` | effect | Applies a -N/-N debuff | Gives a creature -N/-N until end of turn (can kill via toughness ≤ 0). | `['trigger.creature_dies']` | `['gets']` / `['-']` / `4` |

**TDD discipline (per rule, in order):**

1. Write `<tagId>.test.ts` with at least 3 positives + 3 negatives. Examples for `effect.destroy_creature`:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_creature';

describe('effect.destroy_creature', () => {
  it.each([
    ['destroy target creature with mana value 2 or less'],
    ['destroy target nonartifact creature'],
    ['destroy target creature an opponent controls'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });
  it.each([
    ['exile target creature'],                 // exile, not destroy
    ['destroy target artifact'],               // artifact, not creature
    ['target creature gets -3/-3 until end of turn'], // debuff, not destroy
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
```

Starter regex (iterate until coverage looks right): `/\bdestroy[s]?\s+(?:up to (?:one |two |\w+ )?)?(?:another |target )?(?:[\w\-]+ )*creature(?:s)?\b/`.

2. Run `npx vitest run pipeline/rules/<tagId>.test.ts` — verify FAIL → IMPL → PASS.

3. Run `npm run rule:coverage -- <tagId>`. Eyeball: at least 30 matches expected for `effect.destroy_creature`; near-miss pile should contain *exile* cards (intentional exclusion), *destroy artifact* cards (also intentional — that's `destroy_permanent`), and ideally nothing else.

4. If near-misses reveal a missed phrasing, iterate the regex (and the test). Commit at green.

**Phase-1 family commits should follow:** `git commit -m "feat(pipeline): family 1 — effect.destroy_creature"` (one per rule, frequent commits).

**Hand-off report (implementer commits to worktree):**

Create `pipeline/reports/family-1-implementer.md`:

```markdown
# Family 1 — Removal: Implementer Report

## Rules implemented
- effect.destroy_creature: <N> matches, <X.X>% taggable
- effect.destroy_permanent: <N> matches, <X.X>% taggable
- effect.counterspell: <N> matches, <X.X>% taggable
- effect.board_wipe: <N> matches, <X.X>% taggable
- effect.debuff_minus_n: <N> matches, <X.X>% taggable

## Coverage commands
- `npm run rule:coverage -- effect.destroy_creature`
- ... (one per rule)
- `npm run rule:coverage -- --pairings`

## Intentional near-miss exclusions
For each rule, list 1–3 categories of cards that appear in the near-miss pile but are correctly excluded. Example:
- effect.destroy_creature: exile-based removal (separate mechanic), debuff via -X/-X (separate rule), destroy artifact / enchantment (separate rule)

## Open issues
None / list anything ambiguous.
```

**Reviewer protocol (separate subagent):**

The reviewer agent works in the same worktree:
1. Reads `pipeline/reports/family-1-implementer.md`.
2. Re-runs `npm run rule:coverage -- <tagId>` for each new rule. Numbers must match the implementer's report (regenerate the artifact if needed).
3. Picks 10 random positives from each rule's match sample (via `pipeline/reports/rule-coverage.json`) and confirms each is semantically a correct match. *If any is wrong*, file as a finding.
4. Picks 10 random near-misses from each rule's sample and confirms each is correctly excluded. *If any should match*, file as a finding.
5. Reads the test files: confirms ≥3 positives + ≥3 negatives per rule.
6. Validates `pairsWith` against the spec table above.
7. Writes `pipeline/reports/family-1-reviewer.md`:

```markdown
# Family 1 — Removal: Reviewer Report

## Status: approved | changes_requested | escalate

## Coverage re-run
<table of rule id, match count, taggable% — must match implementer report>

## Positive spot-checks
For each rule, ✓ or 🛑 for each of 10 sampled positives. Note any 🛑s.

## Near-miss spot-checks
For each rule, ✓ or 🛑 for each of 10 sampled near-misses. Note any 🛑s.

## Findings
List specific issues blocking approval; or "None" if approved.

## Decision
approved | changes_requested | escalate
```

If `changes_requested`, the implementer iterates and the reviewer re-runs the protocol. Loop until `approved`.

## Family 2: Mana / token resources

**Worktree:** `~/worktrees/mtg-graph-family-2-mana` from `v0.7.0-phase-0`.

**New files:**
- `pipeline/rules/effect.add_mana.ts` + `.test.ts`
- `pipeline/rules/effect.create_treasure.ts` + `.test.ts`
- `pipeline/rules/effect.create_food.ts` + `.test.ts`
- `pipeline/rules/effect.create_clue.ts` + `.test.ts`

**Tags:**

| `tagId` | axis | label | description | pairsWith | nearMiss |
|---|---|---|---|---|---|
| `effect.add_mana` | effect | Adds mana | Adds mana to a player's mana pool — ramp / fixing / ritual. | `[]` | `['add']` / `['mana','{w','{u','{b','{r','{g','{c']` / `6` |
| `effect.create_treasure` | effect | Creates Treasure tokens | Creates one or more Treasure tokens. | `[]` (Family 10 declares `condition.bargain` pairing from its side) | `['treasure']` / `['token','create']` / `6` |
| `effect.create_food` | effect | Creates Food tokens | Creates one or more Food tokens. | `[]` (Family 10 declares `condition.bargain` from its side) | `['food']` / `['token','create']` / `6` |
| `effect.create_clue` | effect | Creates Clue tokens | Creates one or more Clue tokens. | `[]` | `['clue']` / `['token','create']` / `6` |

**Important:** `effect.add_mana` is the most overmatch-prone rule in this family. The regex must distinguish "add mana" effects from cards that *say* "mana" in another context (e.g., "Spend this mana only to cast..."). Starter regex: `/\b(?:add|adds)\s+(?:\d+\s+)?(?:\{[wubrgc]\}|\{c\}|one|two|three)\s+mana\b|\badd[s]?\s+\{[wubrgc]\}/`.

For all rules: examples-driven test files with ≥3 positives + ≥3 negatives, then `npm run rule:coverage -- <tagId>` audit, iterate.

**Hand-off + reviewer protocol:** same template as Family 1, substituting Family 2 names.

## Family 3: Tribes (data + graph extension)

**Worktree:** `~/worktrees/mtg-graph-family-3-tribes` from `v0.7.0-phase-0`.

**Files:**
- Modify: `pipeline/themes.ts` — add `THEME_TRIBES`.
- Create: `pipeline/rules/condition.cares_tribe.ts` + `.test.ts`.
- Modify: `pipeline/rules/effect.create_creature_token.ts` — populate `metadata.creatureTypes`.
- Modify: `pipeline/rules/effect.create_creature_token.test.ts` — assert the metadata.
- Modify: `pipeline/graph.ts` — emit tribe edges from token creature types.
- Modify: `pipeline/graph.test.ts` — fixture-driven test.

**Step 1: Extend `pipeline/themes.ts`:**

```ts
export const THEME_TRIBES = [
  'human', 'elf', 'faerie', 'goblin', 'knight',
  'wizard', 'dwarf', 'zombie', 'vampire', 'merfolk',
] as const;

export type ThemeTribe = (typeof THEME_TRIBES)[number];

export function tribePattern(s: string): string {
  // tribes are simple nouns; plural is +s
  return `${s}s?`;
}
```

**Step 2: Implement `condition.cares_tribe.ts`** as a parametric rule + tagDefs (analogous to `condition.cares_subtype.ts`):

```ts
// pipeline/rules/condition.cares_tribe.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { THEME_TRIBES, tribePattern, capitalize, pluralize } from '../themes';

function makeRule(tribe: string): Rule {
  const re = new RegExp(`\\b${tribePattern(tribe)}\\b`);
  return {
    id: `condition.cares_tribe.${tribe}`,
    axis: 'condition',
    match: (t) => {
      const m = t.match(re);
      return m ? { evidence: m[0] } : false;
    },
    nearMiss: { anchors: [tribe], proximity: [tribe], window: 1 }, // degenerate; near-miss skipped by coverage CLI
  };
}

export const rules: Rule[] = THEME_TRIBES.map(makeRule);

export const tagDefs: TagDef[] = THEME_TRIBES.map((tribe) => ({
  tagId: `condition.cares_tribe.${tribe}`,
  axis: 'condition',
  label: `Cares about ${capitalize(pluralize(tribe))}`,
  description: `References the ${capitalize(tribe)} creature type.`,
  pairsWith: ['effect.create_creature_token'], // form edges only when token's creatureTypes includes this tribe — graph.ts filters
  category: 'theme',
}));
```

**Step 3: Extend `effect.create_creature_token.ts` to populate `metadata.creatureTypes`:**

```ts
// pipeline/rules/effect.create_creature_token.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { THEME_TRIBES } from '../themes';

export const tagDef: TagDef = {
  tagId: 'effect.create_creature_token',
  axis: 'effect',
  label: 'Creates a creature token',
  description: "Creates a creature token specifically. Tighter than effect.create_token — excludes Treasures, Roles, Foods, etc.",
  pairsWith: ['trigger.another_creature_etb', 'trigger.token_created'],
};

const PATTERNS = [
  /create [^.]{0,80}?creature tokens?/,
  /create [^.]{0,60}?\b\d+\/\d+\b[^.]{0,40}?tokens?/,
];

function extractCreatureTypes(evidence: string): string[] {
  const found: string[] = [];
  for (const tribe of THEME_TRIBES) {
    if (new RegExp(`\\b${tribe}s?\\b`, 'i').test(evidence)) found.push(tribe);
  }
  return found;
}

export const rule: Rule = {
  id: 'effect.create_creature_token',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) {
        const types = extractCreatureTypes(m[0]);
        return { evidence: m[0], ...(types.length ? { metadata: { creatureTypes: types } } : {}) };
      }
    }
    return false;
  },
  nearMiss: { anchors: ['create'], proximity: ['token','creature'], window: 8 },
};
```

**Step 4: Extend `pipeline/graph.ts` to gate tribe edges on metadata:**

The condition pairs `effect.create_creature_token → condition.cares_tribe.X`. Without filtering, *every* token-maker would link to *every* tribe-cares card. We want the edge only when the token's `creatureTypes` includes the tribe.

Add to the edge emission loop in `buildEdges`:

```ts
// Inside the for-each (effectId, consumerId) block, after the source/target pairing:
if (consumerId.startsWith('condition.cares_tribe.')) {
  const tribe = consumerId.slice('condition.cares_tribe.'.length);
  const sourceCard = cards.find((c) => c.oracleId === source);
  const tokenTag = sourceCard?.tags.find(
    (t) => t.tagId === 'effect.create_creature_token' && Array.isArray((t.metadata as { creatureTypes?: string[] } | undefined)?.creatureTypes)
  );
  const types = (tokenTag?.metadata as { creatureTypes?: string[] } | undefined)?.creatureTypes ?? [];
  if (!types.includes(tribe)) continue; // skip this pairing for this card
}
```

(The `.find()` is O(n) per pairing; if it shows up in profiling, replace with a map from oracleId → card built once.)

**Step 5: Test** in `pipeline/graph.test.ts`:

```ts
it('emits a tribe edge only when the token creature type matches', () => {
  const cards: Card[] = [
    {
      ...baseCard('humans-maker', 'Town Mayor'),
      tags: [{
        tagId: 'effect.create_creature_token',
        axis: 'effect',
        evidence: 'create a 1/1 white human soldier creature token',
        metadata: { creatureTypes: ['human', 'soldier'] },
      }],
    },
    {
      ...baseCard('zombies-maker', 'Necromancer'),
      tags: [{
        tagId: 'effect.create_creature_token',
        axis: 'effect',
        evidence: 'create a 2/2 black zombie creature token',
        metadata: { creatureTypes: ['zombie'] },
      }],
    },
    {
      ...baseCard('humans-payoff', 'Humans Matter'),
      tags: [{ tagId: 'condition.cares_tribe.human', axis: 'condition', evidence: 'human' }],
    },
  ];
  const catalog: TagDef[] = [
    { tagId: 'effect.create_creature_token', axis: 'effect', label: '', description: '', pairsWith: [] },
    { tagId: 'condition.cares_tribe.human', axis: 'condition', label: '', description: '', pairsWith: ['effect.create_creature_token'] },
  ];
  const edges = buildEdges(cards, catalog);
  // Only the humans-maker should connect to humans-payoff. The zombies-maker should not.
  const tribeEdges = edges.filter((e) => e.reason.targetTagId === 'condition.cares_tribe.human');
  expect(tribeEdges).toHaveLength(1);
  expect(tribeEdges[0]?.source).toBe('humans-maker');
});
```

**Step 6: Coverage commands** the reviewer must re-run:
- `npm run rule:coverage -- condition.cares_tribe.human` (each tribe in `THEME_TRIBES`, but a spot-check on 3–4 suffices)
- `npm run rule:coverage -- --pairings`

**Hand-off + reviewer protocol:** Family 3's reviewer additionally verifies that the metadata extension on `effect.create_creature_token` doesn't regress existing tag emissions (compare before/after on the rebuilt artifact).

## Family 4: Spellslinger

**Worktree:** `~/worktrees/mtg-graph-family-4-spellslinger`.

**New files:**
- `pipeline/rules/condition.cares_noncreature_spell.ts` + `.test.ts`
- `pipeline/rules/effect.has_prowess.ts` + `.test.ts`

**Tags:**

| `tagId` | axis | label | description | pairsWith | nearMiss |
|---|---|---|---|---|---|
| `condition.cares_noncreature_spell` | condition | Cares about noncreature spells | Triggers or scales off casting noncreature (instant/sorcery) spells. | `['trigger.spell_cast']` | `['noncreature','instant','sorcery']` / `['spell','cast']` / `6` |
| `effect.has_prowess` | effect | Has Prowess | Has the prowess keyword (triggers off own casts). | `['trigger.spell_cast']` | None (keyword check, not text mining; set `nearMiss: undefined`) |

**Implementation notes:**

`effect.has_prowess` is keyword-driven, not regex-against-text. The rule's `match(normalizedText)` signature still takes normalized text, but the rule needs access to the card itself. Two paths:

- **A.** Match against `\bprowess\b` in normalized text (works because the keyword line is in the oracle text). Simple, regex-based, works.
- **B.** Add a separate `matchCard?: (card: Card) => boolean | TagMatch` field to `Rule` for keyword-list-based matching.

Use **A** — keep the rule interface uniform. Implementation:

```ts
// pipeline/rules/effect.has_prowess.ts
export const rule: Rule = {
  id: 'effect.has_prowess',
  axis: 'effect',
  match: (t) => (/\bprowess\b/.test(t) ? { evidence: 'prowess' } : false),
};
```

Test positives: text containing "prowess" anywhere; negatives: text without it. Coverage should show 30+ matches.

## Family 5: Card selection

**Worktree:** `~/worktrees/mtg-graph-family-5-card-selection`.

**New files:**
- `pipeline/rules/effect.scry.ts` + `.test.ts`
- `pipeline/rules/effect.surveil.ts` + `.test.ts`
- `pipeline/rules/effect.look_at_top_n.ts` + `.test.ts`
- `pipeline/rules/effect.tutor_any.ts` + `.test.ts`

**Tags:**

| `tagId` | axis | label | description | pairsWith | nearMiss |
|---|---|---|---|---|---|
| `effect.scry` | effect | Scry | Scries 1 or more — pure library-top selection. | `[]` | `['scry']` / `['scry']` / `1` (degenerate; near-miss not very useful for keyword) |
| `effect.surveil` | effect | Surveil | Surveils 1 or more — mills the cards put on bottom. | `['condition.cares_graveyard']` *(Family 9; declare and let the consistency test catch the dangle until Family 9 merges — actually `pairsWith: []` works since Family 9 declares from condition side)* | same as scry |
| `effect.look_at_top_n` | effect | Looks at top of library | Reveals or looks at the top N cards of a library. | `[]` | `['look','reveal']` / `['top','library']` / `8` |
| `effect.tutor_any` | effect | Tutors any card | Searches library for any card (no subtype restriction). | `[]` | `['search']` / `['library','card']` / `8` |

**Note:** to keep parallel work decoupled, Family 5 sets `effect.surveil.tagDef.pairsWith = []`. Family 9 owns `condition.cares_graveyard` and declares `pairsWith: ['effect.mill', 'effect.reanimate', 'effect.exile_from_graveyard', 'effect.surveil']` from the condition side — bidirectional graph builder produces the edge.

`effect.tutor_any` must EXCLUDE searches restricted to a subtype (those are handled by `effect.tutors_subtype.*`). Test negatives must include "search your library for a Shrine card" → should NOT match `effect.tutor_any`.

## Family 6: Tap / Untap effects

**Worktree:** `~/worktrees/mtg-graph-family-6-tap-untap`.

**New files:**
- `pipeline/rules/effect.tap.ts` + `.test.ts`
- `pipeline/rules/effect.untap.ts` + `.test.ts`

**Tags:**

| `tagId` | axis | label | description | pairsWith | nearMiss |
|---|---|---|---|---|---|
| `effect.tap` | effect | Taps a permanent | Taps a target permanent (typically as a soft control / removal effect). | `['trigger.tapped_or_untapped']` | `['tap']` / `['creature','permanent','target']` / `6` |
| `effect.untap` | effect | Untaps a permanent | Untaps a target permanent. | `['trigger.tapped_or_untapped']` | `['untap']` / `['creature','permanent','target']` / `6` |

Must NOT match "{T}:" (the tap symbol as a cost — that's not the effect tapping something). Must NOT match "doesn't untap during your untap step" (steady-state, not an effect). Starter regex for `effect.tap`: `/\btap target (?:[\w\-]+ )?(?:creature|permanent|artifact|land)\b/`.

## Family 7: Steal / Copy

**Worktree:** `~/worktrees/mtg-graph-family-7-steal-copy`.

**New files:**
- `pipeline/rules/effect.control_change.ts` + `.test.ts`
- `pipeline/rules/effect.copy_spell.ts` + `.test.ts`
- `pipeline/rules/effect.copy_permanent.ts` + `.test.ts`

**Tags:**

| `tagId` | axis | label | description | pairsWith | nearMiss |
|---|---|---|---|---|---|
| `effect.control_change` | effect | Steals control | Gains control of an opponent's permanent. | `[]` | `['gain','control']` / `['creature','permanent','target']` / `8` |
| `effect.copy_spell` | effect | Copies a spell | Creates a copy of a spell. | `['trigger.spell_cast']` *(copying a spell is an extra cast event)* | `['copy']` / `['spell','instant','sorcery']` / `8` |
| `effect.copy_permanent` | effect | Copies a permanent | Creates a token that is a copy of a permanent. | `['trigger.another_creature_etb', 'trigger.token_created']` | `['copy']` / `['creature','token','permanent']` / `8` |

## Family 8: Lifegain payoff

**Worktree:** `~/worktrees/mtg-graph-family-8-lifegain`.

**New files:**
- `pipeline/rules/condition.cares_lifegain.ts` + `.test.ts`

**Tag:**

| `tagId` | axis | label | description | pairsWith | nearMiss |
|---|---|---|---|---|---|
| `condition.cares_lifegain` | condition | Cares about lifegain | Triggers or scales when you gain life. | `['effect.life_changed']` | `['gain']` / `['life']` / `4` |

## Family 9: Archetype themes

**Worktree:** `~/worktrees/mtg-graph-family-9-archetype-themes`.

**New files:**
- `pipeline/rules/condition.cares_tokens.ts` + `.test.ts`
- `pipeline/rules/condition.cares_artifacts.ts` + `.test.ts`
- `pipeline/rules/condition.cares_enchantments.ts` + `.test.ts`
- `pipeline/rules/condition.cares_graveyard.ts` + `.test.ts`

**Tags:**

| `tagId` | axis | label | description | pairsWith | nearMiss |
|---|---|---|---|---|---|
| `condition.cares_tokens` | condition | Cares about tokens | Triggers or scales off tokens you control or create. | `['effect.create_token', 'effect.create_creature_token', 'effect.create_treasure', 'effect.create_food', 'effect.create_clue']` | `['token']` / `['create','control','sacrifice']` / `8` |
| `condition.cares_artifacts` | condition | Cares about artifacts | References artifact count or artifact ETBs. | `[]` (no broad "cast an artifact" effect tag in v0.7 — leave dangling; orchestrator confirms no needed edges) | `['artifact']` / `['cast','control','enters']` / `6` |
| `condition.cares_enchantments` | condition | Cares about enchantments | References enchantment count or enchantment ETBs. | `[]` (same as artifacts) | `['enchantment']` / `['cast','control','enters']` / `6` |
| `condition.cares_graveyard` | condition | Cares about graveyard | Triggers or scales off graveyard size or content. | `['effect.mill', 'effect.reanimate', 'effect.exile_from_graveyard', 'effect.surveil']` | `['graveyard']` / `['cards','number']` / `6` |

(For `condition.cares_artifacts` / `cares_enchantments` with empty `pairsWith`, the tags exist primarily for drawer-side filtering. They still contribute to coverage.)

## Family 10: Set mechanics

**Worktree:** `~/worktrees/mtg-graph-family-10-set-mechanics`.

**New files:**
- `pipeline/rules/condition.bargain.ts` + `.test.ts`
- `pipeline/rules/condition.adventure_matters.ts` + `.test.ts`

**Tags:**

| `tagId` | axis | label | description | pairsWith | nearMiss |
|---|---|---|---|---|---|
| `condition.bargain` | condition | Bargain | Has the Bargain keyword (sacrifice as alt-cost). | `['effect.create_token', 'effect.create_treasure', 'effect.create_food', 'effect.create_clue']` *(token fodder)* | `['bargain']` / `['bargain']` / `1` (degenerate) |
| `condition.adventure_matters` | condition | Adventure matters | Triggers or scales on Adventure spells cast (excluding the card itself being an Adventure). | `['trigger.spell_cast']` | `['adventure']` / `['cast','spell']` / `6` |

`condition.adventure_matters` must NOT match when the card *itself* has an Adventure (which means it has a `// Adventure` typeline portion). Need to check the card structure, not just the text — use a `matchCard` hook *or* exclude based on a feature in `normalizedText`. Pragmatic: in the existing pipeline, multi-face card text is concatenated. If the card has its own Adventure, the text will mention "// Adventure" or similar — but the normalize step strips that. Simpler: check if the card's `typeLine` includes "Adventure" — but the rule only sees normalized text, not the card.

**Resolution:** extend the `Rule` type with an optional `matchCard?: (card: Card) => boolean | TagMatch` callback that, if present, is run *instead of* `match` and receives the whole card. Add a separate `// pipeline/rules/runner.ts` branch for it.

(This is a v0.7 type extension, but it's small — about 6 lines in `runner.ts`. Family 10 owns the change. Document it in the family's reviewer report.)

## Family 11: Keyword properties

**Worktree:** `~/worktrees/mtg-graph-family-11-keywords`.

**New files:**
- `pipeline/rules/effect.has_evasion.ts` + `.test.ts`
- `pipeline/rules/effect.has_deathtouch.ts` + `.test.ts`
- `pipeline/rules/effect.has_lifelink.ts` + `.test.ts`
- `pipeline/rules/effect.has_first_strike.ts` + `.test.ts`
- `pipeline/rules/effect.has_trample.ts` + `.test.ts`
- `pipeline/rules/condition.cares_evasion.ts` + `.test.ts`
- `pipeline/rules/condition.cares_deathtouch.ts` + `.test.ts`

**Tags:**

| `tagId` | axis | label | description | pairsWith | matches |
|---|---|---|---|---|---|
| `effect.has_evasion` | effect | Has evasion | flying, menace, intimidate, or unblockable | `['condition.cares_evasion']` | `/\b(?:flying|menace|intimidate)\b/` plus typeline static "can't be blocked" abilities |
| `effect.has_deathtouch` | effect | Has deathtouch | | `['condition.cares_deathtouch']` | `/\bdeathtouch\b/` |
| `effect.has_lifelink` | effect | Has lifelink | | `['condition.cares_lifegain']` *(Family 8)* | `/\blifelink\b/` |
| `effect.has_first_strike` | effect | Has first/double strike | metadata `{ doubleStrike: true }` when applicable | `[]` | `/\bdouble strike\b|\bfirst strike\b/` |
| `effect.has_trample` | effect | Has trample | | `[]` | `/\btrample\b/` |
| `condition.cares_evasion` | condition | Cares about evasion | "creatures with flying," etc. | `['effect.has_evasion']` | `/\bcreatures? (?:you control )?with (?:flying|menace)\b|\bflying creatures? you control\b/` |
| `condition.cares_deathtouch` | condition | Cares about deathtouch | | `['effect.has_deathtouch']` | `/\b(?:creatures? )?(?:you control )?with deathtouch\b/` |

**`nearMiss`:** For keyword-presence effect rules, set `nearMiss: undefined` (the keyword name itself is unambiguous). The coverage CLI already skips the near-miss section when `nearMiss` is undefined. For the two cares-conditions, use anchors=`['with']` and proximity=`['flying','menace','deathtouch']` window=`3`.

All Family 11 rules tag *normalized oracle text* (not `card.keywords[]`) — keeps the rule interface uniform. Since keyword names appear verbatim in the oracle text after normalization, this works fine.

---

# Phase 2 — Integration (sequential, main session)

## Task 2.1: Merge family worktrees one at a time

- [ ] **Step 1: For each `approved` family, merge its worktree**

```bash
# example for family 1
git checkout main
git merge ~/worktrees/mtg-graph-family-1-removal --no-ff -m "feat(v0.7): family 1 — removal"
```

Repeat for all 11 families. If any conflict (shouldn't happen after the registry refactor — each family adds new files), resolve before continuing.

- [ ] **Step 2: After each merge, run the full test suite**

```bash
npm test
```

Expected: all green. If a test fails, the offending family's reviewer should not have approved — escalate to user.

- [ ] **Step 3: After all 11 families merged, run the catalog consistency test**

```bash
npx vitest run pipeline/catalog.test.ts
```

Expected: all 4 invariants pass. The bidirectional pairing means a dangling pairsWith on one side gets caught here.

## Task 2.2: Rebuild the artifact and run the coverage gate

- [ ] **Step 1: Regenerate the artifact**

```bash
npm run build:cards -- --standard
```

Expected: completes; `app/public/data/cards-standard.json` updated.

- [ ] **Step 2: Run `rule:coverage --all`**

```bash
npm run rule:coverage -- --all
```

Look at the bottom line: aggregate taggable coverage.

- **If ≥ 91%:** target hit, proceed.
- **If < 91%:** write `pipeline/reports/v0.7-coverage-gap.md` describing what's missing and which categories the deferred LLM verification pass needs to close. Ship anyway (per spec §6.5).

- [ ] **Step 3: Run `rule:mine` and diff against baseline**

```bash
npm run rule:mine
diff <(jq '.twoGrams[0:20]' pipeline/reports/baseline-mine-2026-05-21.json) <(jq '.twoGrams[0:20]' pipeline/reports/rule-mine.json)
```

For each phrase in the *new* top-20 that's still untagged, either:
- Verify it's now covered by a rule's positive matches, OR
- Document the intentional skip in `pipeline/reports/mine-exclusions.md`:

```markdown
# v0.7 Intentional mine-exclusions

These high-frequency phrases in untagged taggable cards are intentional skips:

- "ward N" — defensive keyword; no payoffs in current Standard; defer to v0.8.
- "..." — ...
```

## Task 2.3: Bump `RULE_VERSION` and commit

- [ ] **Step 1: Edit `pipeline/catalog.ts`**

Change:
```ts
export const RULE_VERSION = 'v0.6.0';
```
to:
```ts
export const RULE_VERSION = 'v0.7.0';
```

- [ ] **Step 2: Regenerate the artifact one more time**

```bash
npm run build:cards -- --standard
```

The artifact now has `ruleVersion: 'v0.7.0'`. App's IndexedDB cache will invalidate on next load.

- [ ] **Step 3: Run all tests one final time**

```bash
npm test
cd app && npm test && cd ..
```

Expected: all pipeline + app tests pass.

- [ ] **Step 4: Commit and tag**

```bash
git add pipeline/catalog.ts app/public/data/cards-standard.json pipeline/reports/mine-exclusions.md pipeline/reports/v0.7-coverage-gap.md
git commit -m "release: v0.7.0 — mechanics expansion + discovery workflow"
git tag v0.7.0
```

## Task 2.4: Verify in the running app

- [ ] **Step 1: Start the dev server**

```bash
cd app && npm run dev
```

- [ ] **Step 2: Open the browser** and confirm:
  - Card detail drawer shows new tags on representative cards (e.g., Cut Down → "Destroys a creature", a flying creature → "Has evasion").
  - Interaction edges are richer than before (spot-check a token-maker — should connect to "tribes you care about" cards).
  - Deck builder still functions; legality test passes; no console errors.

- [ ] **Step 3: Run the Playwright smoke test**

```bash
cd app && npm run e2e
```

Expected: passes.

- [ ] **Step 4: Stop the dev server and commit if anything changed**

(Nothing should change at this stage — the app is read-only over the artifact.)

Phase 2 complete. v0.7 shipped.

---

# Self-Review Notes

- **Spec coverage:** Every section of the spec maps to a task or family. Phase 0 covers spec §2 (invariants), §3 (tooling), §5 (registry refactor + bidirectional pairing + nearMiss). Phase 1 covers spec §4 (all 11 families). Phase 2 covers spec §6.1 Phase 2 + §6.4 acceptance + §6.5 coverage gate + §7.3 rollout. Spec §6.2 implementer loop is the per-family TDD discipline in the briefs. Spec §6.3 reviewer protocol is templated in Family 1 and referenced by all others.
- **Placeholder scan:** No "TBD" or "fill in later." Each family brief has tag IDs, axes, descriptions, pairings, and starter near-miss specs spelled out. Code snippets are complete for Phase 0 tasks; family briefs give starter test cases + starter regex patterns and let the implementer subagent iterate via the coverage script (which is the design's whole point — the workflow is the implementation tool).
- **Type consistency:** `TagDef`, `Rule`, `NearMissSpec`, `Card`, `InteractionEdge` are used consistently. The `matchCard` extension in Family 10 is new; the family's reviewer report flags it for orchestrator review. The aggregator's sync/async pattern is consistent across uses.
