# Disguise Mechanic Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three new tags (`effect.has_disguise`, `effect.cloak`, `trigger.turned_face_up`) covering ~70 Standard cards from the MKM/DSK face-down archetype, per spec `docs/superpowers/specs/2026-05-27-disguise-mechanic-family-design.md` (commit `f5c0935`).

**Architecture:** Three colocated rule files in `pipeline/rules/`, each exporting both `tagDef` and `rule`. Auto-discovered by `aggregator.ts`. `effect.has_disguise` uses the `matchCard` shape (mirroring `effect.has_ward`) with Scryfall's `card.keywords` array as the authoritative ground truth plus a regex fallback. `effect.cloak` and `trigger.turned_face_up` use text-only `match`. No `children` expansion needed for this family (Disguise's cost reveal doesn't propagate to a downstream tag). RULE_VERSION bump in `shared/version.ts` triggers IndexedDB cache invalidation. tagFamilies.ts registration is explicit per the convention established by the suspect/collect-evidence families. TDD: failing test → minimal regex → green.

**Tech Stack:** TypeScript, Vitest, regex literals against normalized oracle text (lowercased, reminder-stripped, `__SELF__`-substituted). Scryfall `card.keywords` array for the keyword-guard side of `effect.has_disguise`. Em-dashes (U+2014) survive normalization — copy verbatim from `card_lookup.mjs --normalized` output.

---

## File map

**Create:**
- `pipeline/rules/effect.has_disguise.ts` — rule + tagDef for the printed-keyword producer (matchCard shape)
- `pipeline/rules/effect.has_disguise.test.ts`
- `pipeline/rules/effect.cloak.ts` — rule + tagDef for the Cloak/Manifest-Dread producer (text-only match)
- `pipeline/rules/effect.cloak.test.ts`
- `pipeline/rules/trigger.turned_face_up.ts` — rule + tagDef for the face-up trigger (text-only match)
- `pipeline/rules/trigger.turned_face_up.test.ts`

**Modify:**
- `shared/version.ts` line 2 — bump `'v0.14.3'` → `'v0.14.4'`
- `app/src/lib/tagFamilies.ts` — add three entries under `set-mechanics`
- `CARD_ISSUES.md` — drop the Disguise-family bullets from the Alley Assailant entry (lines 269–277) and remove the Aurelia's Vindicator entry (the only audit bullet there is the family-level Disguise gap)

---

## Task 1: Bump RULE_VERSION

Starter task — small, isolated.

**Files:**
- Modify: `shared/version.ts` line 2

- [ ] **Step 1: Read current version**

Run: `cat /Users/Dada/mtg-graph/shared/version.ts`
Expected: `export const RULE_VERSION = 'v0.14.3';`

- [ ] **Step 2: Edit the file**

Replace the contents of `/Users/Dada/mtg-graph/shared/version.ts` with:

```ts
// shared/version.ts
export const RULE_VERSION = 'v0.14.4';
```

- [ ] **Step 3: Verify**

Run: `cat /Users/Dada/mtg-graph/shared/version.ts`
Expected: shows `v0.14.4`.

- [ ] **Step 4: Commit**

```bash
cd /Users/Dada/mtg-graph && git add shared/version.ts && git commit -m "$(cat <<'EOF'
chore: bump RULE_VERSION to v0.14.4

Prepares for the Disguise mechanic family (effect.has_disguise,
effect.cloak, trigger.turned_face_up). New tags force client
IndexedDB cache invalidation on next artifact load.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `effect.has_disguise` rule + tests (TDD)

The printed-keyword producer. Uses the `matchCard` shape (mirroring `effect.has_ward`) with Scryfall's `card.keywords.includes('Disguise')` as the authoritative ground truth, plus a regex fallback on the normalized text for the rare cases where Scryfall's keyword-parsing misses the printed keyword.

**Reference precedent:** `pipeline/rules/effect.has_ward.ts` (look-up before writing the new rule). The shape, the `matchCard` signature, and the `isIntrinsicKeyword` helper import all transplant directly.

**Files:**
- Create: `pipeline/rules/effect.has_disguise.test.ts`
- Create: `pipeline/rules/effect.has_disguise.ts`

- [ ] **Step 1: Write the failing test**

Create `/Users/Dada/mtg-graph/pipeline/rules/effect.has_disguise.test.ts` with these exact contents:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_disguise';
import type { Card } from '../../shared/types';

function card(keywords: string[], oracleText = ''): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: 'Creature',
    types: ['Creature'], subtypes: [], supertypes: [], oracleText,
    keywords, power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.has_disguise', () => {
  it.each([
    // Scryfall keyword guard fires alone — the canonical path
    [['Disguise'], 'disguise {4}{b}'],
    [['Flying', 'Lifelink', 'Ward', 'Disguise'], 'flying, lifelink, ward {2} disguise {x}{3}{w}'],
    // Costless-land form (Branch of Vitu-Ghazi)
    [['Disguise'], '{t}: add {c}. disguise {3}'],
    // Numeric cost (Bolrac-Clan Basher)
    [['Disguise'], 'double strike, trample disguise {3}{r}{r}'],
    // Sanity: keyword without disguise text — keyword array is authoritative; should still fire
    [['Disguise'], ''],
  ])('matches when keyword Disguise is intrinsic: %j', (kw, text) => {
    expect(rule.matchCard!(card(kw, text), text)).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Cloak']],
    [['Manifest']],
  ])('does not match when keywords lack Disguise: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not match a flavor-text mention of disguise without the printed keyword', () => {
    // No Disguise in keyword array — purely incidental word use in oracle/flavor.
    // (Reminder text and granted-ability quotes are stripped before rules run,
    // so this is the only way "disguise" could appear without being the keyword.)
    const c = card(['Flying'], 'flying. the rogue donned a disguise.');
    expect(rule.matchCard!(c, 'flying. the rogue donned a disguise.')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from repo root: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/effect.has_disguise.test.ts`
Expected: FAIL with module resolution error (`Cannot find module './effect.has_disguise'`).

- [ ] **Step 3: Write the minimal implementation**

Create `/Users/Dada/mtg-graph/pipeline/rules/effect.has_disguise.ts` with these exact contents:

```ts
// pipeline/rules/effect.has_disguise.ts
//
// Intrinsic-only — requires Scryfall's `keywords` array to include "Disguise"
// AND the keyword to appear either on a standalone keyword-block line
// (e.g. "Disguise {4}{B}") via the isIntrinsicKeyword helper, OR (defensively)
// as a regex match on the cost-block syntax. The dual-layer mirrors
// `effect.has_ward`: Scryfall's `keywords` array is authoritative; the text
// check is a defense against parser drift.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { isIntrinsicKeyword } from '../normalize';

// Regex fallback for the cost-block syntax "disguise {N}", "disguise {X}{...}".
// The required `\{` anchors against incidental word use ("the rogue donned a
// disguise" cannot match). The word boundary on the left prevents matches
// against compound words.
const DISGUISE_COST = /\bdisguise\s*\{/;

export const tagDef: TagDef = {
  tagId: 'effect.has_disguise',
  axis: 'effect',
  label: 'Has disguise',
  description:
    'Has the Disguise keyword as a printed intrinsic ability. The card can be cast face-down for {3} as a 2/2 creature with ward {2}, and turned face up any time by paying its disguise cost.',
  pairsWith: ['trigger.turned_face_up'],
};

export const rule: Rule = {
  id: 'effect.has_disguise',
  axis: 'effect',
  matchCard: (card, normalized) => {
    if (!card.keywords.includes('Disguise')) return false;
    if (isIntrinsicKeyword(card.oracleText, 'Disguise')) return { evidence: 'Disguise' };
    if (DISGUISE_COST.test(normalized)) return { evidence: 'Disguise (cost block)' };
    return false;
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/effect.has_disguise.test.ts`
Expected: PASS, 10 tests passing (5 keyword-intrinsic positives + 4 no-keyword negatives + 1 flavor-text negative).

- [ ] **Step 5: Commit**

```bash
cd /Users/Dada/mtg-graph && git add pipeline/rules/effect.has_disguise.ts pipeline/rules/effect.has_disguise.test.ts && git commit -m "$(cat <<'EOF'
feat(rules): add effect.has_disguise

Producer side of the Disguise mechanic family. Uses Scryfall's
`card.keywords` array as the authoritative ground truth, with a
`disguise \{` regex fallback for defensive coverage. Mirrors the
two-layer pattern shipped for effect.has_ward in Round 1.

Expected coverage: 38 cards (all printed Disguise in Standard).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `effect.cloak` rule + tests (TDD)

The keyword-action producer. Matches `cloak <object>` frames AND the bare `manifest dread` keyword (since manifest dread invokes cloak via reminder text, which is stripped pre-rule).

**Files:**
- Create: `pipeline/rules/effect.cloak.test.ts`
- Create: `pipeline/rules/effect.cloak.ts`

- [ ] **Step 1: Get the normalized text of representative cards (informational)**

Run: `cd /Users/Dada/mtg-graph && for c in "Cryptic Coat" "Hide in Plain Sight" "Etrata, Deadly Fugitive" "Bashful Beastie" "Conductive Machete"; do echo "=== $c ==="; node /Users/Dada/.claude/skills/mtg-graph-card-tag-audit/card_lookup.mjs "$c" --normalized --text-only 2>&1 | head -5; echo; done`

Expected: shows the normalized text containing `cloak the top card` (Cryptic Coat), `cloak that card` (Hide in Plain Sight), `cloak target creature an opponent controls` (Etrata, Deadly Fugitive), and bare `manifest dread` (Bashful Beastie, Conductive Machete). Use the actual substrings if any differ from the test fixtures below.

- [ ] **Step 2: Write the failing test**

Create `/Users/Dada/mtg-graph/pipeline/rules/effect.cloak.test.ts` with these exact contents:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.cloak';

describe('effect.cloak', () => {
  it.each([
    // Cryptic Coat — "cloak the top card of your library"
    ['{2}{u}: cloak the top card of your library.'],
    // Hide in Plain Sight — "cloak that card" (anaphoric, after a look-at-top intro)
    ['look at the top three cards of your library. you may cloak that card.'],
    // Etrata, Deadly Fugitive — "cloak target creature an opponent controls"
    ['cloak target creature an opponent controls.'],
    // Manifest dread — bare keyword (reminder strips the "cloak one of those cards" detail)
    ['when this creature enters, manifest dread.'],
    // Manifest dread in mid-clause
    ['{2}{u}, {t}: manifest dread.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Noun form — the resulting permanent, not the producer
    ['whenever a cloaked creature you control attacks, you gain 1 life.'],
    // "Manifest" alone (old-Khans Manifest, not Manifest Dread)
    ['manifest the top card of your library.'],
    // Bare "cloak" with no target/object — degenerate, must not fire
    ['cloak.'],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/effect.cloak.test.ts`
Expected: FAIL with module resolution error.

- [ ] **Step 4: Write the minimal implementation**

Create `/Users/Dada/mtg-graph/pipeline/rules/effect.cloak.ts` with these exact contents:

```ts
// pipeline/rules/effect.cloak.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.cloak',
  axis: 'effect',
  label: 'Cloak',
  description:
    'MKM/DSK keyword action. Produces a face-down 2/2 creature (with ward {2}) from a specified source — `cloak` (target card on top of library, opponent\'s card you don\'t own, etc.) or `manifest dread` (look at top 2, cloak one + mill the other). The face-down creature can be turned face up later by paying its disguise cost.',
  pairsWith: ['trigger.turned_face_up'],
};

// Match either:
//   1. `cloak <object>` — verb form with a target or anaphoric object
//      ("cloak the top card", "cloak that card", "cloak target ...")
//   2. `manifest dread` — the DSK keyword action (its reminder text "cloak
//      one of those cards" is stripped pre-rule, so the bare keyword is
//      what survives in normalized text)
//
// The verb-form alternation requires an object slot, so "cloaked creature"
// (the noun result) and a bare "cloak." command cannot match.
const PATTERN =
  /\b(?:cloak (?:the top card|that card|an?\s+\w+|target [\w\s]+)|manifest dread)\b/;

export const rule: Rule = {
  id: 'effect.cloak',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['cloak', 'manifest dread'],
    proximity: ['top card', 'target', 'that card'],
    window: 6,
  },
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/effect.cloak.test.ts`
Expected: PASS, 10 tests passing (5 positives + 5 negatives).

- [ ] **Step 6: Commit**

```bash
cd /Users/Dada/mtg-graph && git add pipeline/rules/effect.cloak.ts pipeline/rules/effect.cloak.test.ts && git commit -m "$(cat <<'EOF'
feat(rules): add effect.cloak

Keyword-action producer side of the Disguise mechanic family. Matches
both `cloak <object>` verb frames (top card / that card / target X)
and bare `manifest dread` (whose reminder text is stripped pre-rule,
so the bare keyword is what survives).

Expected coverage: ~30 cards (5 cloak + 25 manifest dread).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `trigger.turned_face_up` rule + tests (TDD)

The face-up trigger. Two alternations: self-frame (most common, `when this <type> is turned face up`) AND broader whenever-any frame (Case of the Pilfered Proof's `whenever a Detective you control ... is turned face up`).

**Files:**
- Create: `pipeline/rules/trigger.turned_face_up.test.ts`
- Create: `pipeline/rules/trigger.turned_face_up.ts`

- [ ] **Step 1: Write the failing test**

Create `/Users/Dada/mtg-graph/pipeline/rules/trigger.turned_face_up.test.ts` with these exact contents:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.turned_face_up';

describe('trigger.turned_face_up', () => {
  it.each([
    // Aurelia's Vindicator
    ['when this creature is turned face up, exile up to x other target creatures.'],
    // Branch of Vitu-Ghazi — land, not creature
    ['{t}: add {c}. disguise {3} when this land is turned face up, add two mana of any one color.'],
    // Bubble Smuggler — "as" replacement variant
    ['disguise {5}{u} as this creature is turned face up, put four +1/+1 counters on it.'],
    // Alley Assailant
    ['when this creature is turned face up, target opponent loses 3 life and you gain 3 life.'],
    // Case of the Pilfered Proof — whenever-any frame with "or" disjunction
    ['whenever a detective you control enters or is turned face up, put a +1/+1 counter on it.'],
    // Whenever-any frame, standalone
    ['whenever a face-down creature you control is turned face up, draw a card.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // ETB trigger, not face-up
    ['when this creature enters, draw a card.'],
    // Bare state statement — no trigger verb prefix
    ['this creature is turned face up.'],
    // Reference to prior face-up events — not a trigger
    ['the cards that were turned face up this turn return to their owners\' hands.'],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/trigger.turned_face_up.test.ts`
Expected: FAIL with module resolution error.

- [ ] **Step 3: Write the minimal implementation**

Create `/Users/Dada/mtg-graph/pipeline/rules/trigger.turned_face_up.ts` with these exact contents:

```ts
// pipeline/rules/trigger.turned_face_up.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.turned_face_up',
  axis: 'trigger',
  label: 'On turning face up',
  description:
    'Triggers when a face-down permanent is turned face up. Covers both Disguise-printed cards flipping themselves (self-trigger frame) AND payoffs that care about ANY face-down creature being turned face up (Case of the Pilfered Proof). Also matches the rare "as this creature is turned face up" replacement-effect frame (Bubble Smuggler).',
  pairsWith: ['effect.has_disguise', 'effect.cloak'],
};

// Two alternations. The first is the common self-trigger frame:
//   "When/as this <type> is turned face up, ..."
// (Bubble Smuggler is the only "as" replacement; everything else uses "when".)
// Permanent-type alternation mirrors trigger.self_etb (case + class added).
const SELF_FRAME =
  /\b(?:when|as) this (?:creature|land|permanent|artifact|enchantment|saga|case) is turned face up\b/;

// The second is the broader "whenever any X is turned face up" payoff frame
// (Case of the Pilfered Proof). The non-greedy [\w\s]+? filler is bounded by
// the `is turned face up` anchor, so no catastrophic backtracking.
const WHENEVER_ANY =
  /\b(?:when|whenever) (?:a|each|any|another) [\w\s]+? is turned face up\b/;

export const rule: Rule = {
  id: 'trigger.turned_face_up',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(SELF_FRAME) ?? t.match(WHENEVER_ANY);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['turned face up'],
    proximity: ['when', 'as', 'whenever', 'this creature', 'this land'],
    window: 4,
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/trigger.turned_face_up.test.ts`
Expected: PASS, 11 tests passing (6 positives + 5 negatives).

- [ ] **Step 5: Commit**

```bash
cd /Users/Dada/mtg-graph && git add pipeline/rules/trigger.turned_face_up.ts pipeline/rules/trigger.turned_face_up.test.ts && git commit -m "$(cat <<'EOF'
feat(rules): add trigger.turned_face_up

Carer side of the Disguise mechanic family. Two alternations:
self-frame (when/as this <type> is turned face up, ...) and the
broader whenever-any frame (whenever a Detective you control ...
is turned face up). The permanent-type alternation mirrors
trigger.self_etb (case + class added in Round 2).

Pairs with effect.has_disguise and effect.cloak.

Expected coverage: ~35 cards.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Register the three new tags in `tagFamilies.ts`

`app/src/lib/tagFamilies.ts` requires every catalog tag to be explicitly registered (enforced by `pipeline/tagFamilies-consistency.test.ts`). All three new tags go under `set-mechanics` (the convention for set-specific MKM/DSK keywords; evergreen keywords go in `keywords`).

**Files:**
- Modify: `app/src/lib/tagFamilies.ts` — add three entries under `set-mechanics`

- [ ] **Step 1: Verify insertion anchors**

Run: `grep -n "'effect.collect_evidence'\|'effect.has_airbend'\|'effect.is_room'\|'effect.suspect'\|'trigger.explored'" /Users/Dada/mtg-graph/app/src/lib/tagFamilies.ts`
Expected: shows lines around 187, 190, 201, 202, 206. These are the anchor points the inserts go between.

- [ ] **Step 2: Insert `effect.cloak`**

Alphabetical position: between `effect.collect_evidence` and `effect.discover`.

Use the Edit tool on `/Users/Dada/mtg-graph/app/src/lib/tagFamilies.ts`:

`old_string`:

```
  'effect.collect_evidence': 'set-mechanics',
  'effect.discover': 'set-mechanics',
```

`new_string`:

```
  'effect.collect_evidence': 'set-mechanics',
  'effect.cloak': 'set-mechanics',
  'effect.discover': 'set-mechanics',
```

- [ ] **Step 3: Insert `effect.has_disguise`**

Alphabetical position: between `effect.has_airbend` and `effect.has_earthbend`.

Use the Edit tool on `/Users/Dada/mtg-graph/app/src/lib/tagFamilies.ts`:

`old_string`:

```
  'effect.has_airbend': 'set-mechanics',
  'effect.has_earthbend': 'set-mechanics',
```

`new_string`:

```
  'effect.has_airbend': 'set-mechanics',
  'effect.has_disguise': 'set-mechanics',
  'effect.has_earthbend': 'set-mechanics',
```

- [ ] **Step 4: Insert `trigger.turned_face_up`**

Alphabetical position: after `trigger.explored` (last entry in the set-mechanics trigger.* block).

Use the Edit tool on `/Users/Dada/mtg-graph/app/src/lib/tagFamilies.ts`:

`old_string`:

```
  'trigger.explored': 'set-mechanics',

  // keywords
```

`new_string`:

```
  'trigger.explored': 'set-mechanics',
  'trigger.turned_face_up': 'set-mechanics',

  // keywords
```

- [ ] **Step 5: Verify all three entries are present**

Run: `grep -n "has_disguise\|effect.cloak\|turned_face_up" /Users/Dada/mtg-graph/app/src/lib/tagFamilies.ts`
Expected: shows three matching lines, all mapped to `'set-mechanics'`.

- [ ] **Step 6: Run the tagFamilies consistency test**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/tagFamilies-consistency.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/Dada/mtg-graph && git add app/src/lib/tagFamilies.ts && git commit -m "$(cat <<'EOF'
feat(app): register Disguise family tags in tagFamilies

Adds effect.has_disguise, effect.cloak, and trigger.turned_face_up
to the set-mechanics family. Required for the tagFamilies-consistency
test gate.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Full gate + artifact rebuild + verify match counts

End-to-end check: catalog validation, app build, artifact rebuild, rule-coverage CLI to confirm expected match counts (38 / ~30 / ~35).

**Files:** none modified by you. The artifact regen writes `app/public/data/cards-standard.json` (gitignored — no commit).

- [ ] **Step 1: Run the full test gate**

Run from repo root: `cd /Users/Dada/mtg-graph && npm test`
Expected: ALL tests pass, including the new rule test files (Tasks 2–4), `pipeline/catalog.test.ts` (pairings, axis-cross), `pipeline/tagFamilies-consistency.test.ts`, the app vitest suite, and the app `npm run build` (tsc + vite).

If anything fails, STOP and report. Do NOT make changes to fix failures without controller approval.

- [ ] **Step 2: Rebuild the standard artifact**

Run: `cd /Users/Dada/mtg-graph && npm run build:cards -- --standard`
Expected: writes `app/public/data/cards-standard.json` (~4,446 cards), no errors. Prints a coverage summary line.

- [ ] **Step 3: Verify per-tag match counts via rule:coverage**

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- effect.has_disguise`
Expected: reports **38 matches**. Sample card names should include Alley Assailant, Aurelia's Vindicator, Basilica Stalker, Bolrac-Clan Basher, Branch of Vitu-Ghazi, Bubble Smuggler.

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- effect.cloak`
Expected: reports **between 25 and 32 matches** (5 cloak verb-form + 25 manifest dread — exact count depends on which cloak frames appear in current Standard). Sample names should include Cryptic Coat, Hide in Plain Sight, Etrata Deadly Fugitive (cloak frames) AND Bashful Beastie, Conductive Machete, Break Down the Door (manifest dread).

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- trigger.turned_face_up`
Expected: reports **between 30 and 38 matches**. Should include Aurelia's Vindicator, Alley Assailant, Branch of Vitu-Ghazi (when frame), Bubble Smuggler (as frame), and Case of the Pilfered Proof (whenever-any frame).

If any count is wildly off (>5 from these ranges), STOP. Use `node /Users/Dada/.claude/skills/mtg-graph-card-tag-audit/card_lookup.mjs "<card>" --normalized` to investigate specific misses, and report BLOCKED with specifics.

- [ ] **Step 4: Spot-check a few representative cards**

Run: `cd /Users/Dada/mtg-graph && node /Users/Dada/.claude/skills/mtg-graph-card-tag-audit/card_lookup.mjs "Aurelia's Vindicator"`
Expected: tags include `effect.has_disguise` AND `trigger.turned_face_up`.

Run: `cd /Users/Dada/mtg-graph && node /Users/Dada/.claude/skills/mtg-graph-card-tag-audit/card_lookup.mjs "Bubble Smuggler"`
Expected: tags include `effect.has_disguise` AND `trigger.turned_face_up` (the "as" replacement frame). The +1/+1 counter tag is also there from before.

Run: `cd /Users/Dada/mtg-graph && node /Users/Dada/.claude/skills/mtg-graph-card-tag-audit/card_lookup.mjs "Cryptic Coat"`
Expected: tags include `effect.cloak`.

Run: `cd /Users/Dada/mtg-graph && node /Users/Dada/.claude/skills/mtg-graph-card-tag-audit/card_lookup.mjs "Case of the Pilfered Proof"`
Expected: tags include `trigger.turned_face_up` (via the whenever-any frame). Note: this card may NOT have `effect.has_disguise` (it's an enchantment, not a Disguise-printed card).

- [ ] **Step 5: Verify pairsWith integrity**

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- --pairings`
Expected: PASS (no "unknown tag id" errors).

- [ ] **Step 6: No artifact commit**

Per `CLAUDE.md`, `app/public/data/*.json` is gitignored. The artifact regenerates from committed rule code on every fresh checkout. Confirm:

Run: `cd /Users/Dada/mtg-graph && git check-ignore app/public/data/cards-standard.json && echo gitignored-confirmed`
Expected: prints `app/public/data/cards-standard.json` then `gitignored-confirmed`. No commit needed.

---

## Task 7: Clean up CARD_ISSUES.md

Per the audit skill convention, drop the issue entries / bullets whose coverage gap has been shipped. For this family, that's:

1. **Alley Assailant** entry (lines ~252–278) — has two bullets (`effect.has_disguise` family-level + `trigger.turn_face_up` family-level). Both shipped — but note the existing entry uses the proposed tag IDs `effect.has_disguise`/`trigger.turn_face_up`, while we actually shipped `effect.has_disguise` (same) and `trigger.turned_face_up` (note tense). The bullets are the family entry — drop them entirely since the family is now shipped.
2. **Aurelia's Vindicator** entry — its only bullet is the family-level Disguise gap. Drop the entire entry.

**Files:**
- Modify: `/Users/Dada/mtg-graph/CARD_ISSUES.md`

- [ ] **Step 1: Pre-check entries exist**

Run: `cd /Users/Dada/mtg-graph && grep -c "^## Alley Assailant\|^## Aurelia's Vindicator" CARD_ISSUES.md`
Expected: `2`.

If `0` or `1`, the file structure has drifted — STOP and report BLOCKED.

- [ ] **Step 2: Drop the family-level Disguise bullets from Alley Assailant**

Use the Edit tool on `/Users/Dada/mtg-graph/CARD_ISSUES.md`.

`old_string`:

```
- **missing**: `effect.has_disguise` (no such tag exists — family-level coverage gap)
  - **What's wrong:** Disguise (MKM keyword) has no catalog representation. It's a face-down/face-up morph variant on 38 Standard cards (Alley Assailant, Aurelia's Vindicator, Basilica Stalker, Bolrac-Clan Basher, Branch of Vitu-Ghazi, Bubble Smuggler, Concealed Weapon, Coveted Falcon, …). Companion mechanic Cloak (5 cards) and the broader "turned face up" trigger frame (35 cards) are also unrepresented.
  - **Evidence vs reality:** missing — keyword line `"Disguise {4}{B}{B}"` and the trigger line `"When this creature is turned face up, ..."` both have no matching tag. Reminder text strips, so `ward` from the reminder doesn't survive.
  - **Suggested fix:** Author the keyword family: `effect.has_disguise`, `effect.has_cloak`, `trigger.turn_face_up`, and (optionally) `condition.cares_face_down`. Pair `trigger.turn_face_up` with effects that gate on flipping face-up — most disguise cards have ETB-on-flip payoffs (here, the drain). Family scope: 38 disguise + 5 cloak + ~35 "turned face up" cards.
  - **Note:** This entry is recorded under Alley Assailant since it's the first audited case. Do NOT relitigate per-card for the remaining disguise/cloak cards — refer back to this entry.

- **missing**: `trigger.turn_face_up` (component of disguise family above)
  - **What's wrong:** "When this creature is turned face up" is the trigger framing that pairs with disguise/cloak. Without it, the drain effect (currently tagged only as `effect.life_changed`) has no trigger context — the graph can't connect the face-up trigger to its payoffs.
  - **Suggested fix:** Part of the disguise family rule batch — author concurrently with `effect.has_disguise`.
```

`new_string`: (empty string — these two bullets are the entire Issues section of the Alley Assailant entry. If they're the only bullets, the entry effectively becomes a stub with no issues, which means the whole entry should be removed in Step 3.)

After this edit, verify by reading the Alley Assailant section:

Run: `cd /Users/Dada/mtg-graph && sed -n '/^## Alley Assailant/,/^---$/p' CARD_ISSUES.md`
Expected: shows the header, the type/cost/oracle text/current tags, then `### Issues` with NOTHING below it (or just whitespace).

- [ ] **Step 3: Drop the whole Alley Assailant entry (now empty of issues)**

Use the Edit tool on `/Users/Dada/mtg-graph/CARD_ISSUES.md`. The exact content below will need to be confirmed by reading the file first — but it's the header + body of the Alley Assailant entry plus the preceding `---` separator.

Run the read first:

```bash
cd /Users/Dada/mtg-graph && grep -n "^---$\|^## " CARD_ISSUES.md | grep -B 2 -A 2 "Alley Assailant"
```

Then use Edit with `old_string` = `\n---\n\n## Alley Assailant ... <up to but not including the next \n---\n>` and `new_string` = `` (empty).

The exact text varies; read the file to construct the precise old_string.

After deletion, verify:

Run: `cd /Users/Dada/mtg-graph && grep -c "^## Alley Assailant" CARD_ISSUES.md`
Expected: `0`.

- [ ] **Step 4: Drop the whole Aurelia's Vindicator entry**

Use the Edit tool on `/Users/Dada/mtg-graph/CARD_ISSUES.md`. The Aurelia's Vindicator entry only has the family-level Disguise bullet, so the whole entry can be removed.

Read the file to find the exact bounds of the entry first:

```bash
cd /Users/Dada/mtg-graph && sed -n '/^## Aurelia.s Vindicator/,/^---$/p' CARD_ISSUES.md
```

Then use Edit with `old_string` = `## Aurelia's Vindicator <full entry text> \n\n---` and `new_string` = `` (empty).

After deletion, verify:

Run: `cd /Users/Dada/mtg-graph && grep -c "^## Aurelia" CARD_ISSUES.md`
Expected: `0`.

- [ ] **Step 5: Search for orphan references**

Other entries may reference "see Alley Assailant" or similar (the original Alley Assailant entry's "Note:" line explicitly said it was the canonical record for the family). Search:

Run: `cd /Users/Dada/mtg-graph && grep -ni "alley assailant\|aurelia's vindicator\|disguise\|cloak\|face up\|face-up" CARD_ISSUES.md`
Expected: ideally `0` results. If any remain, edit them out — those references are now stale.

- [ ] **Step 6: Commit**

```bash
cd /Users/Dada/mtg-graph && git add CARD_ISSUES.md && git commit -m "$(cat <<'EOF'
chore(audit): resolve Disguise / Cloak / turn-face-up coverage entries

Disguise mechanic family shipped in v0.14.4 (effect.has_disguise,
effect.cloak, trigger.turned_face_up). Removed:
- Alley Assailant entry (the canonical family-level record)
- Aurelia's Vindicator entry (single family-level bullet)
- Any orphan references in other entries

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review checklist (executor-facing)

Before considering the plan complete, the executor should confirm:

- [ ] Three new rule files exist under `pipeline/rules/` and each exports BOTH `tagDef` and `rule`.
- [ ] Three colocated `.test.ts` files exist with at least 3 positives + 3 negatives each.
- [ ] `effect.has_disguise` uses the `matchCard` shape (mirroring `effect.has_ward`).
- [ ] `effect.cloak` and `trigger.turned_face_up` use the `match` shape (text-only).
- [ ] `shared/version.ts` is at `v0.14.4`.
- [ ] `app/src/lib/tagFamilies.ts` has all three new entries under `set-mechanics`.
- [ ] `npm test` (root) passes — pipeline tests, app tests, app build.
- [ ] `npm run rule:coverage -- effect.has_disguise` reports 38.
- [ ] `npm run rule:coverage -- effect.cloak` reports 25–32.
- [ ] `npm run rule:coverage -- trigger.turned_face_up` reports 30–38.
- [ ] `npm run rule:coverage -- --pairings` passes.
- [ ] Aurelia's Vindicator has `effect.has_disguise` + `trigger.turned_face_up`.
- [ ] Cryptic Coat has `effect.cloak`.
- [ ] Case of the Pilfered Proof has `trigger.turned_face_up` (whenever-any frame).
- [ ] `CARD_ISSUES.md` no longer contains `## Alley Assailant` or `## Aurelia's Vindicator` headings, nor any orphan references to disguise/cloak/face-up.
- [ ] Seven commits on `feature/card-issues-batch-1`: version bump, three rule commits, tagFamilies registration, CARD_ISSUES cleanup. (No artifact commit — gitignored.)
