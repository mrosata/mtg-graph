# Mechanics Expansion & Discovery Workflow — v0.7 Design

**Status:** Draft for review
**Date:** 2026-05-21
**Author:** Brainstorming session (Claude + Michael)
**Supersedes:** none (extends the v0.1 design in the sibling repo's `docs/superpowers/specs/2026-05-21-mtg-graph-db-design.md`)

## 1. Overview & goals

v0.7 ships two simultaneous deliverables:

1. **34 new tag rules** + **10 generated tribe tags** across 11 mechanic families (Slice 2 of the discovery session), plus fixes for three brittle existing rules (`trigger.creature_etb`, `effect.mill`, `trigger.counter_changed`).
2. **A discovery workflow** — two CLI scripts (`rule:coverage`, `rule:mine`) plus an `isTaggable(card)` helper — that lets implementer and reviewer agents independently verify rule quality and surface missed mechanics.

### Success criteria

- **Taggable-denominator coverage ≥ 91%** (definition in §3.1) on the current Standard artifact (4,446 cards across 17 sets).
- All 11 families pass paired implementer ↔ reviewer hand-off (§6).
- `npm test` green (pipeline + shared + app). `npm run build:cards -- --standard` succeeds.
- `RULE_VERSION` bumped to `v0.7.0`.

### Out of scope (deferred)

- **LLM-assisted gap-finding** (Nova Lite or Haiku per the v0.2 roadmap) — reserved for a *verification* pass after we reach ~91% on regexes alone. The LLM's role is "check our work and tell us what we missed."
- **Slice 3 long-tail mechanics:** energy, dungeons, level-up, crew, role tokens as payoff, saga-as-payoff.
- **Non-+1/+1 counters beyond stun:** -1/-1, charge, loyalty manipulation, etc.
- **Tribes beyond the 10 listed in §4 Family 3.**
- **Damage prevention, hexproof/indestructible as effects.**

### Baseline (2026-05-21)

- 4,446 cards / 17 Standard sets in `cards-standard.json` (rule version `v0.6.0`).
- **53%** of cards have **0 interaction edges**.
- **38%** of cards (1,693) are completely **untagged**.
- `trigger.creature_etb` fires only 38 times (regex too tight).
- `effect.mill` fires only 2 times (regex requires `\d+` digit-form; modern wording is "mill four cards" word-form).

## 2. Architectural invariants preserved

- Pipeline remains the source of truth for graph structure. App stays a read-only viewer.
- `oracleId` is the primary key everywhere; merge + dedupe across sets unchanged.
- Rules target normalized text (`__SELF__` substitution, reminder text stripped, lowercased) — unchanged.
- `RULE_VERSION` bump invalidates the app's IndexedDB cache on next load.

## 3. Discovery workflow tooling

All under `pipeline/`. Pure Node + TS. No external API deps. Same scripts run by both implementer and reviewer agents — reviewer findings are reproducible.

### 3.1. `isTaggable(card)` helper

Lives in `pipeline/coverage.ts`. Returns `boolean`.

```ts
export function isTaggable(card: Card): boolean {
  const normalized = normalizeOracleText(card.oracleText, card.name);
  if (normalized.length === 0) return false;            // true vanilla
  if (isBasicLand(card)) return false;                  // Plains, Island, etc.
  if (isPlainManaTapLand(card, normalized)) return false; // "{t}: add {g}"
  return true;
}
```

**Vanilla-keyword creatures are taggable.** A card whose entire oracle text is "Flying" is still deck-relevant (Azorius Skies, Esper Flyers). Family 11 (§4) introduces `effect.has_<keyword>` tags driven off `card.keywords[]`, so these cards *will* receive tags — they don't need to be excluded from the denominator. There is no `isSingleEvergreenKeyword` exclusion.

**`isPlainManaTapLand`:** the card is a Land *and* its normalized text matches `^(\{t\}: add [^.]+\.?)+$` — one or more mana-tap clauses only. Lands with any other ability (ETB, scry, drain, etc.) are taggable.

`isTaggable` is the coverage *denominator*. The coverage script also prints the *naive* denominator (all cards) as a sanity check.

### 3.2. `npm run rule:coverage [-- <ruleId> | --all | --pairings]`

Output format:

```
rule: effect.destroy_creature
  matches: 187 cards (8.4% of all, 7.8% of taggable)

  --- 10 random positives ---
  Cut Down                "destroy target creature with mana value 2 or less"
  Go for the Throat       "destroy target nonartifact creature"
  ...

  --- 20 near-miss unmatched cards (anchor=destroy, proximity=creature, window=8) ---
  Sunfall                 "exile all creatures, then their controllers create..."
  Farewell                "choose any number. for each one, choose..."
  ...
```

Near-miss lexicon is declared per rule in the rule file:

```ts
export const rule: Rule = {
  id: 'effect.destroy_creature',
  axis: 'effect',
  match: (t) => ...,
  nearMiss: { anchors: ['destroy'], proximity: ['creature'], window: 8 },
};
```

A near-miss = a card whose normalized text contains *any* anchor within `window` whitespace-separated tokens of *any* proximity term, **and** which is not matched by the rule. (Tokens are the result of `normalizedText.split(/\s+/)` — punctuation stays attached to adjacent words, matching the same model rules use.) The reviewer reviews near-misses to confirm exclusions are intentional.

**`--all`** runs every rule in sequence and prints a one-line summary per rule (rule id, match count, taggable %) plus the aggregate taggable coverage. Skips the random-positives and near-misses sections — `--all` is the executive summary, not the audit view.

**`--pairings`** validates that every `pairsWith` references an existing tag id. Hard error on mismatch.

**Output:** human-readable to stdout, machine-readable JSON sibling at `pipeline/reports/rule-coverage.json` so reviewer agents can diff deterministically.

### 3.3. `npm run rule:mine`

Enumerates the most frequent 2-grams and 3-grams in *untagged taggable* cards' normalized oracle text. Output:

```
Top 2-grams in untagged taggable cards (n=1452):
  127  add mana
   89  scry 2
   71  target creature
   ...

Top 3-grams in untagged taggable cards:
   89  add one mana
   58  counter target spell
   ...
```

- Stopwords stripped (`the`, `a`, `to`, `you`, `target`, `it`, `that`, etc.).
- Configurable min-frequency floor (default `30`).
- Stopword list and floor live alongside the script.
- Run at project kickoff (committed as `pipeline/reports/baseline-mine-2026-05-21.json`) and at the end of Phase 2 (compared against baseline). Top-20 remaining high-frequency phrases must either now appear in a rule's positive matches, or be documented in `pipeline/reports/mine-exclusions.md` (e.g., "ward N — intentional skip; defensive keyword; no payoff cards in current Standard").

## 4. Mechanic families (Slice 2)

Each family below = one implementer agent + one reviewer agent. Tag IDs follow the existing `<axis>.<id>` convention. Pairings shown only where they create meaningful graph edges. Tribe and theme entries use the existing parametric pattern (`themes.ts` loop) rather than separate rule files.

### Family 1 — Removal (5 rules)

| Tag | Axis | Pairs with |
|---|---|---|
| `effect.destroy_creature` | effect | `trigger.creature_dies`, `trigger.permanent_leaves_battlefield` |
| `effect.destroy_permanent` | effect | `trigger.permanent_leaves_battlefield` |
| `effect.counterspell` | effect | *(none — defensive; flag in catalog description)* |
| `effect.board_wipe` | effect | `trigger.creature_dies`, `trigger.permanent_leaves_battlefield` |
| `effect.debuff_minus_n` | effect | `trigger.creature_dies` *(can kill via toughness ≤ 0)* |

Example cards: Cut Down, Go for the Throat, Disdainful Stroke, Sunfall, Candy Grapple.

### Family 2 — Mana / token resources (4 rules)

| Tag | Axis | Pairs with |
|---|---|---|
| `effect.add_mana` | effect | *(none — fuels everything; labeled as "ramp")* |
| `effect.create_treasure` | effect | `trigger.token_created` (future: `condition.cares_treasure`) |
| `effect.create_food` | effect | `trigger.token_created` |
| `effect.create_clue` | effect | `trigger.token_created` |

Treasure/Food/Clue rules refine — but do not replace — `effect.create_token`. A card making Treasures gets *both* `effect.create_token` (umbrella) and `effect.create_treasure` (specific) tags.

### Family 3 — Tribes (data-only — themes.ts extension + graph builder refinement)

Extend `pipeline/themes.ts`:

```ts
export const THEME_TRIBES = [
  'human', 'elf', 'faerie', 'goblin', 'knight',
  'wizard', 'dwarf', 'zombie', 'vampire', 'merfolk',
] as const;
```

Generates `condition.cares_tribe.<tribe>` for each (10 tag defs). No `tutors_tribe.<tribe>` — tribal tutors are too rare in Standard to justify.

**Rule enhancement:** `effect.create_creature_token` currently does *not* populate metadata. Family 3 extends it to populate `metadata.creatureTypes: string[]` by parsing the token's creature types out of the matched evidence (e.g. "create a 1/1 white Human Soldier creature token" → `['human', 'soldier']`). This is a *minor* extension to an existing rule, not a new rule, and Family 3 owns it.

**Graph builder refinement (`pipeline/graph.ts`):** if a card has an `effect.create_creature_token` tag whose `metadata.creatureTypes` includes any tribe `T` from `THEME_TRIBES`, add an edge `card → cares_tribe.T`. One fixture-driven test in `pipeline/graph.test.ts` covers it.

### Family 4 — Spellslinger (2 rules)

| Tag | Axis | Pairs with |
|---|---|---|
| `condition.cares_noncreature_spell` | condition | `trigger.spell_cast` |
| `effect.has_prowess` | effect | `trigger.spell_cast` |

`effect.has_prowess` is the first time a static keyword becomes an effect tag. Justification: prowess creates a *real* graph edge — a spellslinger card *enables* a prowess card. The match is keyword-based (`/^prowess$/m` after normalize) rather than text-mining. Note the overlap with `condition.cares_noncreature_spell`: a card with prowess could in principle get both tags. The drawer query "show me prowess creatures specifically" is the use case that justifies keeping prowess as a separately-labeled tag.

### Family 5 — Card selection (4 rules)

| Tag | Axis | Pairs with |
|---|---|---|
| `effect.scry` | effect | *(none — pure top-of-library selection)* |
| `effect.surveil` | effect | `condition.cares_graveyard` *(surveil mills the unwanted cards)* |
| `effect.look_at_top_n` | effect | *(none)* |
| `effect.tutor_any` | effect | *(none — labeled for drawer)* |

Scry and surveil are split into separate rules so the conditional pairing falls out of the standard `pairsWith` mechanism — no graph-builder special-casing required.

### Family 6 — Tap / Untap effects (2 rules)

`effect.tap` and `effect.untap`. Both pair with `trigger.tapped_or_untapped`. Symmetric counterpart to the existing trigger.

### Family 7 — Steal / Copy (3 rules)

| Tag | Axis | Pairs with |
|---|---|---|
| `effect.control_change` | effect | *(weak — flag in catalog)* |
| `effect.copy_spell` | effect | `trigger.spell_cast` (copying *is* casting in graph terms) |
| `effect.copy_permanent` | effect | `trigger.another_creature_etb`, `trigger.token_created` *(copy of a permanent is a new permanent entering)* |

### Family 8 — Lifegain payoff (1 rule)

`condition.cares_lifegain` ↔ `effect.life_changed`. Closes the trigger/effect/condition loop for lifegain decks.

### Family 9 — Archetype themes (4 rules)

`condition.cares_tokens` (↔ `effect.create_token`, `effect.create_creature_token`), `condition.cares_artifacts`, `condition.cares_enchantments`, `condition.cares_graveyard` (↔ `effect.mill`, `effect.reanimate`, `effect.exile_from_graveyard`).

All four condition tags declare their pairings from the *condition side* (`pairsWith: ['effect.mill', ...]`) and rely on the bidirectional graph builder (§5.4) to produce edges. No edits to existing effect rule files required.

### Family 10 — Set mechanics (2 rules)

| Tag | Axis | Pairs with |
|---|---|---|
| `condition.bargain` | condition | `effect.create_token`, `effect.create_treasure`, `effect.create_food`, `effect.create_clue` *(tokens are common bargain fodder)* |
| `condition.adventure_matters` | condition | `trigger.spell_cast` |

`condition.bargain` matches the keyword "Bargain" on the card. `condition.adventure_matters` references "Adventure" outside of being one (i.e., the card is not itself a multi-face adventure card — checked structurally, not by regex).

### Family 11 — Keyword properties (7 rules)

Driven off the existing `card.keywords[]` field in the artifact — *no oracle-text regex required*. Each rule checks for keyword presence in structured data and emits a tag (with metadata noting which keyword variant matched, when relevant).

| Tag | Axis | Matched keywords | Pairs with |
|---|---|---|---|
| `effect.has_evasion` | effect | `flying`, `menace`, `intimidate`, `unblockable` (and explicit "can't be blocked" static abilities — keyword-level only) | `condition.cares_evasion` |
| `effect.has_deathtouch` | effect | `deathtouch` | `condition.cares_deathtouch` |
| `effect.has_lifelink` | effect | `lifelink` | existing `condition.cares_lifegain` (Family 8) |
| `effect.has_first_strike` | effect | `first strike`, `double strike` (metadata flag `{ doubleStrike: true }` when the latter) | *(none — labeled for drawer / archetype filter)* |
| `effect.has_trample` | effect | `trample` | *(none — labeled for drawer / archetype filter)* |
| `condition.cares_evasion` | condition | *(text-based — "creatures with flying", "flying creatures you control", etc.)* | `effect.has_evasion` |
| `condition.cares_deathtouch` | condition | *(text-based — "creatures you control with deathtouch", etc.)* | `effect.has_deathtouch` |

**Why no `tutors_keyword`:** keyword tutors are rare in Standard; defer to v0.8 if a real card surfaces the need.

**`nearMiss` for keyword effects:** uses anchors that are the keyword name itself (e.g., `anchors: ['flying']`, `proximity: ['flying']` is degenerate); for these rules the `nearMiss` field is `null` and the coverage script skips the near-miss section. The keyword presence check is unambiguous and doesn't need that audit layer.

**Defensive keywords intentionally skipped in v0.7:** `ward`, `hexproof`, `indestructible`, `shroud`, `vigilance`, `reach`, `haste`, `defender`, `flash`. These either don't anchor recognized Standard archetypes (`ward`, `shroud`) or are too narrow in scope to justify a tag in this slice (`haste` matters for aggro but the deck-theme tag is more naturally captured at a higher level). Revisit in v0.8 if mining or LLM verification surfaces clear payoffs.

### Family count summary

- 11 implementer agents, 11 reviewer agents.
- 34 new rule-file tags (5+4+0+2+4+2+3+1+4+2+7) + 10 generated tribe tags = **44 new tag defs**.
- 3 brittle fixes are Phase 0 work (§6.1), not family work — they reshape tag IDs other families' pairings reference.
- Family 3 additionally extends `effect.create_creature_token` metadata (rule enhancement, not new tag).
- Family 11's biggest coverage win: vanilla-keyword creatures (a card whose oracle text is just "Flying") now receive a tag and contribute to coverage rather than appearing as untagged-but-trivial.

## 5. Registry refactor (Phase 0 prerequisite)

The current `pipeline/rules/index.ts` and `pipeline/catalog.ts` require every new rule to edit *both* shared files, creating merge conflicts under parallel agent execution. Refactor before any family work:

### 5.1. Co-locate `TagDef` with rule

Each rule file gains a `tagDef` (or `tagDefs` for multi-rule subtype files) export alongside its `rule` / `rules`:

```ts
// pipeline/rules/effect.destroy_creature.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.destroy_creature',
  axis: 'effect',
  label: 'Destroys a creature',
  description: 'Destroys a target creature.',
  pairsWith: ['trigger.creature_dies', 'trigger.permanent_leaves_battlefield'],
};

export const rule: Rule = {
  id: 'effect.destroy_creature',
  axis: 'effect',
  match: (t) => ...,
  nearMiss: { anchors: ['destroy'], proximity: ['creature'], window: 8 },
};
```

The tag id appears only once in the rule file. No more "edit catalog AND edit registry."

### 5.2. Glob-discover both registries

Rewrite `pipeline/rules/index.ts` and `pipeline/catalog.ts` as small aggregators that scan `pipeline/rules/(trigger|effect|condition).*.ts` and collect:

- `rule` (singular) → push to `allRules`.
- `rules` (array, for parametric files) → spread into `allRules`.
- `tagDef` (singular) → push to `tagCatalog`.
- `tagDefs` (array) → spread into `tagCatalog`.

The current parametric files (`effect.tutors_subtype.ts`, `condition.cares_subtype.ts`) and the new tribe files keep their `rules` + `tagDefs` shape — the aggregator handles both forms.

Discovery uses Node's `fs.readdirSync` (synchronous, deterministic, simple) — not `import.meta.glob` (Vite-specific).

### 5.3. Catalog consistency test

Existing `pipeline/catalog.test.ts` invariants stay: every rule id has a tag def and vice versa. After refactor, the test runs against the auto-collected aggregator output. **Typo regression** is the highest-value catch — assert the error message names the offending id.

### 5.4. Bidirectional pairing in the graph builder

Today, `pipeline/graph.ts` walks edges in one direction only: for each *effect* tag on a source card, it looks up `effect.pairsWith` and joins to cards that have the listed trigger/condition. A *condition*'s `pairsWith` is purely symbolic — never read by the builder.

Under parallel agent execution, this creates a cross-family ordering problem: Family 9 introduces `condition.cares_graveyard`, but for it to form edges, the existing `effect.mill` / `effect.reanimate` / `effect.exile_from_graveyard` tag defs must be updated to list the new condition — and those files live in *other* families' implicit ownership.

**Fix:** extend the graph builder to walk pairings bidirectionally. For every (effect, trigger/condition) pair declared on *either* side via `pairsWith`, emit one edge from the effect-side card to the trigger/condition-side card. Dedupe with the existing `seen` key (`source|target|sourceTag|targetTag`) — same key whether the pairing was declared from one side, the other, or both.

With bidirectional walking, each family declares pairings from *its own* side. The graph builder produces the same edges regardless. Cross-family file edits are eliminated.

One added test in `pipeline/graph.test.ts`: a condition tag that declares `pairsWith` to an existing effect (whose `pairsWith` does *not* list it back) still produces the expected edge.

### 5.5. Rule extension for `nearMiss`

Extend `Rule` type in `pipeline/rules/types.ts`:

```ts
export type NearMissSpec = {
  anchors: string[];     // words that must appear in the text
  proximity: string[];   // words that must appear within `window` tokens of any anchor
  window: number;        // token distance (default 8)
};

export type Rule = {
  id: string;
  axis: TagAxis;
  match: (normalizedText: string) => boolean | TagMatch;
  nearMiss?: NearMissSpec;  // optional; required for v0.7 implementations
};
```

`nearMiss` is **optional on existing rules** (legacy v0.6 rules continue to work, `rule:coverage` simply skips the near-miss section for them) but **required on every new rule added in v0.7**, including the three brittle-fix rules (which are effectively rewritten). Phase 0 backfills `nearMiss` on the three brittle-fix rules before Phase 1 starts so the same coverage discipline applies there.

## 6. Agent orchestration & reviewer protocol

### 6.1. Phases

**Phase 0 — Foundation (main session, sequential, no agents):**

1. Registry refactor (§5.1–5.3) — move tag defs into rule files, rewrite registries as glob aggregators.
2. Bidirectional pairing in the graph builder (§5.4).
3. `nearMiss` type extension (§5.5).
4. Discovery tooling (§3) — `isTaggable`, `rule:coverage`, `rule:mine` scripts.
5. Baseline `rule:mine` committed under `pipeline/reports/baseline-mine-2026-05-21.json`.
6. **Brittle fixes land in Phase 0**, not family work — they create or reshape tag IDs that other families' pairings depend on. Specifically:
   - `trigger.creature_etb` → split into `trigger.self_etb` + `trigger.another_creature_etb` (existing pairings on `effect.create_creature_token`, `effect.reanimate`, `effect.bounce_or_blink` move to `trigger.another_creature_etb`).
   - `effect.mill` → accept word-form numbers and broaden phrasing.
   - `trigger.counter_changed` → broaden phrasing.
   - Each brittle-fix change comes with new `nearMiss` and adds positive + false-positive-resist + edge-case fixture tests.

**Phase 1 — Family work (parallel, 11 implementer + 11 reviewer):**

- Each family runs in its own git worktree (`superpowers:using-git-worktrees`), branched off the Phase 0 commit.
- Implementer and reviewer for a given family share the worktree.
- Zero file conflicts: agents only add new files under `pipeline/rules/` (Family 3 also touches `pipeline/themes.ts` and `pipeline/graph.ts`).

**Phase 2 — Integration (main session, sequential):**

1. Merge each family's worktree to main, one at a time, after both signers approved.
2. Re-run `npm test`, `npm run build:cards -- --standard`, `npm run rule:coverage -- --all`, `npm run rule:mine`.
3. Diff end-state `rule:mine` against the Phase 0 baseline. Document remaining high-frequency exclusions in `pipeline/reports/mine-exclusions.md`.
4. Bump `RULE_VERSION` to `v0.7.0`.

### 6.2. Per-family implementer loop

1. **Read** the family's section in this spec, existing rules in the same axis for conventions, and `Rule`/`TagDef` types.
2. **TDD:** for each rule, write `<tagId>.test.ts` first with ≥3 cases (positive, false-positive-resist, edge case). Red → impl → green.
3. **Add `tagDef` + `rule` + `nearMiss`** to the new rule file. Auto-discovery picks them up.
4. **Run coverage:** `npm run rule:coverage -- <tagId>` for each new rule. Iterate the regex until positives look clean and near-misses contain nothing that obviously should match.
5. **Run pairing check:** `npm run rule:coverage -- --pairings`. Hard error on any unknown pairing target.
6. **Hand off** with a report at `pipeline/reports/family-<n>-implementer.md`: rule list, coverage numbers, example positives, intentional near-miss exclusions, and (for Family 3 only) the `effect.create_creature_token` metadata-extension delta.

### 6.3. Per-family reviewer protocol

A paired reviewer agent (different `subagent_type` from implementer; choice pinned in the implementation plan):

1. Reads `pipeline/reports/family-<n>-implementer.md`.
2. **Re-runs** `npm run rule:coverage -- <tagId>` independently — does not trust the implementer's numbers.
3. Spot-checks **10 random positives** per rule for semantic correctness.
4. Spot-checks **10 near-misses** per rule for intentional exclusion.
5. Verifies fixture-test coverage (≥3 cases per rule).
6. Verifies `pairsWith` correctness by reading both ends' catalog descriptions.
7. Writes `pipeline/reports/family-<n>-reviewer.md` with status:
   - `approved` — merge.
   - `changes_requested` — list of specific issues; implementer iterates; reviewer re-checks.
   - `escalate` — orchestrator (main session / user) resolves.

### 6.4. Acceptance criteria per family

All true:

- All new rule + family tests green at the worktree root.
- `npm run rule:coverage -- <tagId>` shows nonzero matches per rule.
- Both implementer and reviewer reports committed; reviewer status `approved`.
- No edits outside `pipeline/rules/` *except* Family 3 (`themes.ts`, `graph.ts`). Cross-family edits need orchestrator approval.

### 6.5. Coverage gate at Phase 2

Before bumping `RULE_VERSION`:

- `rule:coverage --all` taggable-denominator coverage **≥ 91%**.
- `rule:mine` top-20 remaining high-frequency phrases either now match a rule's positives or are documented in `pipeline/reports/mine-exclusions.md`.

**If 91% is missed:** write the gap up in `pipeline/reports/v0.7-coverage-gap.md`, document what categories the LLM verification pass will need to close, and ship `v0.7.0` anyway. The deferred LLM pass is exactly the tool for closing the last 5–9%.

## 7. Testing, risks, rollout

### 7.1. Test layers preserved

- Unit tests per rule (TDD; paired `<id>.test.ts` files). Required.
- Catalog consistency test (`pipeline/catalog.test.ts`) runs against the auto-collected aggregator.
- Pipeline e2e test (`pipeline/e2e.test.ts`) extended with one fixture card per new family.
- App tests unchanged — the artifact contract is preserved.

### 7.2. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Reviewer signs off on a regex that overmatches in subtle ways | `rule:coverage` forces 10 random positives + 20 near-miss reviews. |
| Tribes generator inflates tag count without graph density | Family 3 graph-builder refinement wires token creature types → tribe edges; fixture test in `graph.test.ts`. |
| `effect.add_mana` trivially matches every mana-tap land | `isTaggable` excludes plain mana-tap lands from denominator; coverage prints both naive and taggable numbers. |
| Brittle-fix changes break existing edges and downstream app tests | Phase 2 re-runs full app suite against rebuilt artifact before `RULE_VERSION` bump. |
| `rule:mine` output too noisy to triage | Configurable min-frequency floor (default 30); stopword list checked in. |
| A family overflows one agent's context | Implementer can spawn sub-implementer subagents per rule; reviewer still signs off on the whole family. |
| Auto-discovery introduces nondeterminism in rule order | `fs.readdirSync` returns sorted on macOS by default; aggregator sorts results explicitly to remove dependency on FS order. |

### 7.3. Rollout

- Artifact regenerated locally (`npm run build:cards -- --standard`) at the end of Phase 2 and committed.
- `RULE_VERSION` bumps to `v0.7.0`. App's IndexedDB invalidation triggers on next load.
- No backward-compat shims — artifact is regenerated wholesale; clients re-hydrate.

## 8. Open questions

- **`subagent_type` choice for reviewer agents:** pin in the implementation plan, not here. Candidates: `code-reviewer`, `general-purpose` with a strict reviewer prompt, or a custom `mtg-rule-reviewer` spawned with a focused brief.
- **Worktree vs. branch-only isolation for parallel families:** the `using-git-worktrees` skill is the default; if 11 worktrees becomes operationally heavy, fall back to one branch per family with serialized merges.

## 9. Implementation plan

The implementation plan (`docs/superpowers/plans/`) is a separate document, authored next via `superpowers:writing-plans` once this spec is approved.
