# Suspect Mechanic Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three new tags (`effect.suspect`, `condition.cares_suspected`, `effect.unsuspect`) covering 19/20 Standard suspect cards, per spec `docs/superpowers/specs/2026-05-27-suspect-mechanic-family-design.md` (commit `43f2a73`).

**Architecture:** Three colocated rule files in `pipeline/rules/`, each exporting both `tagDef` and `rule`. Auto-discovered by `aggregator.ts` — no edits to `index.ts` or `catalog.ts`. RULE_VERSION bump in `shared/version.ts` triggers IndexedDB cache invalidation on the client. TDD: failing test → minimal regex → green.

**Tech Stack:** TypeScript, Vitest, regex literals against normalized oracle text (lowercased, reminder-stripped, `__SELF__`-substituted).

---

## File map

**Create:**
- `pipeline/rules/effect.suspect.ts` — rule + tagDef for the producer
- `pipeline/rules/effect.suspect.test.ts` — TDD fixtures
- `pipeline/rules/condition.cares_suspected.ts` — rule + tagDef for the carer
- `pipeline/rules/condition.cares_suspected.test.ts` — TDD fixtures
- `pipeline/rules/effect.unsuspect.ts` — rule + tagDef for the clearer
- `pipeline/rules/effect.unsuspect.test.ts` — TDD fixtures

**Modify:**
- `shared/version.ts` line 2 — bump `'v0.14.1'` → `'v0.14.2'`
- `CARD_ISSUES.md` — delete the Absolving Lammasu entry (it tracked the now-shipped suspect coverage gap)

---

## Task 1: Bump RULE_VERSION

Starter task — small, isolated, gates the artifact rebuild later.

**Files:**
- Modify: `shared/version.ts` line 2

- [ ] **Step 1: Read current version**

Run: `cat /Users/Dada/mtg-graph/shared/version.ts`
Expected: `export const RULE_VERSION = 'v0.14.1';`

- [ ] **Step 2: Edit the file**

Replace the contents of `/Users/Dada/mtg-graph/shared/version.ts` with:

```ts
// shared/version.ts
export const RULE_VERSION = 'v0.14.2';
```

- [ ] **Step 3: Verify the change**

Run: `cat /Users/Dada/mtg-graph/shared/version.ts`
Expected: shows `v0.14.2`.

- [ ] **Step 4: Commit**

```bash
git add shared/version.ts
git commit -m "$(cat <<'EOF'
chore: bump RULE_VERSION to v0.14.2

Prepares for the suspect mechanic family (effect.suspect,
condition.cares_suspected, effect.unsuspect). New tags force client
IndexedDB cache invalidation on next artifact load.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `effect.suspect` rule + tests (TDD)

The producer side. Matches the keyword action `suspect <object>` where the object is a creature target reference.

**Files:**
- Create: `pipeline/rules/effect.suspect.test.ts`
- Create: `pipeline/rules/effect.suspect.ts`

- [ ] **Step 1: Write the failing test**

Create `/Users/Dada/mtg-graph/pipeline/rules/effect.suspect.test.ts` with these exact contents:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.suspect';

describe('effect.suspect', () => {
  it.each([
    // Absolving Lammasu — bare "suspect up to one target creature"
    ['when this creature dies, you gain 3 life and suspect up to one target creature an opponent controls.'],
    // Agrus Kos — "suspect it" after a punctuation break
    ["if it's suspected, exile it. otherwise, suspect it."],
    // Case of the Stashed Skeleton — chained "and suspect it"
    ['when this case enters, create a 2/1 black skeleton creature token and suspect it.'],
    // Rubblebelt Braggart — "you may suspect it"
    ["whenever this creature attacks, if it's not suspected, you may suspect it."],
    // Convenient Target — "suspect enchanted creature"
    ['when this aura enters, suspect enchanted creature.'],
    // Frantic Scapegoat — transfer frame "suspect one of the other creatures"
    ['if this creature is suspected, you may suspect one of the other creatures.'],
    // Clandestine Meddler — "suspect up to one other target creature you control"
    ['when this creature enters, suspect up to one other target creature you control.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Carer phrasing — the adjective form, not the verb
    ['put a +1/+1 counter on target suspected creature you control.'],
    // Gate, not producer — "is suspected" alone (no "suspect <obj>")
    ["if it's suspected, exile it."],
    // Reminder text — stripped pre-tag, but a regression guard
    ["a suspected creature has menace and can't block."],
    // Unrelated mechanic
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from repo root: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/effect.suspect.test.ts`
Expected: FAIL with module resolution error (`Cannot find module './effect.suspect'`).

- [ ] **Step 3: Write the minimal implementation**

Create `/Users/Dada/mtg-graph/pipeline/rules/effect.suspect.ts` with these exact contents:

```ts
// pipeline/rules/effect.suspect.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.suspect',
  axis: 'effect',
  label: 'Suspect',
  description:
    'MKM keyword action. Targets a creature and gives it suspect status (menace, can\'t block). Producer for `condition.cares_suspected` payoffs and acts as a menace-grant feeder for `condition.cares_evasion` (suspected creatures count as menace creatures).',
  pairsWith: ['condition.cares_suspected', 'condition.cares_evasion'],
};

// Match the keyword action `suspect <object>` where the object is a
// creature target reference. Frame variants:
//   1. "suspect it" — most common, after a punctuation break establishing
//      the antecedent (Agrus Kos, Caught Red-Handed, Person of Interest, …)
//   2. "and/then/may suspect <obj>" — chained or modal clause
//      (Case of the Stashed Skeleton "and suspect it"; Rubblebelt Braggart
//      "you may suspect it")
//   3. "suspect enchanted creature" — aura form (Convenient Target)
//   4. "suspect one of (the) (other) creatures" — transfer frame
//      (Frantic Scapegoat)
//   5. "suspect up to N other target creature(s) (you control)" — generic
//      target form (Absolving Lammasu, Clandestine Meddler, Reasonable
//      Doubt, Rune-Brand Juggler, J. Jonah Jameson)
//
// The leading word-boundary `\b` keeps the verb form distinct from the
// adjective "suspected".
const PATTERN =
  /\b(?:(?:and|then|may) )?suspect (?:it|enchanted creature|one of (?:the )?(?:other )?creatures?|(?:up to (?:one|two|three)\s+)?(?:other\s+)?target creatures?)\b/;

export const rule: Rule = {
  id: 'effect.suspect',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['suspect'],
    proximity: ['target creature', 'it', 'enchanted creature', 'creature you control'],
    window: 8,
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run from repo root: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/effect.suspect.test.ts`
Expected: PASS, 12 tests passing (7 positives + 5 negatives).

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/effect.suspect.ts pipeline/rules/effect.suspect.test.ts
git commit -m "$(cat <<'EOF'
feat(rules): add effect.suspect

Producer side of the suspect mechanic family. Matches the keyword
action `suspect <object>` across the five frame variants used in MKM:
bare "suspect it", chained "and/may/then suspect", aura "suspect
enchanted creature", transfer "suspect one of the other creatures",
and generic "suspect (up to N) (other) target creature(s)".

Expected coverage: 15 cards (16 producers minus Presumed Dead, whose
suspect verb lives inside a stripped granted-ability quote).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `condition.cares_suspected` rule + tests (TDD)

The carer side. Gates, scales, targets, or statically references suspected creatures.

**Files:**
- Create: `pipeline/rules/condition.cares_suspected.test.ts`
- Create: `pipeline/rules/condition.cares_suspected.ts`

- [ ] **Step 1: Write the failing test**

Create `/Users/Dada/mtg-graph/pipeline/rules/condition.cares_suspected.test.ts` with these exact contents:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_suspected';

describe('condition.cares_suspected', () => {
  it.each([
    // Agrus Kos — "if it's suspected"
    ["if it's suspected, exile it."],
    // Agency Coroner — "was suspected"
    ['if the sacrificed creature was suspected, draw two cards instead.'],
    // Eliminate the Impossible — "are suspected"
    ['if any of them are suspected, they\'re no longer suspected.'],
    // Rubblebelt Braggart — "is not suspected"
    ["whenever this creature attacks, if it's not suspected, you may suspect it."],
    // Deadly Complication — "target suspected creature"
    ['put a +1/+1 counter on target suspected creature you control.'],
    // Rune-Brand Juggler — "sacrifice a suspected creature"
    ['{3}{b}{r}, sacrifice a suspected creature: target creature gets -5/-5 until end of turn.'],
    // Case of the Stashed Skeleton — "suspected skeletons you control"
    ['to solve — you control no suspected skeletons.'],
    // Clandestine Meddler — "suspected creatures you control"
    ['whenever one or more suspected creatures you control attack, surveil 1.'],
    // Airtight Alibi — "can't become suspected"
    ["enchanted creature gets +2/+2 and can't become suspected."],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Producer phrasing — the verb form, not the adjective
    ['when this creature enters, suspect it.'],
    // Clearer-only frame — the (?!no longer\s+) lookahead must block this
    ["it's no longer suspected."],
    ['all suspected creatures are no longer suspected.'],
    // Unrelated mechanic
    ['draw a card.'],
    ['destroy target creature.'],
    ['create a clue token.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // Regression: Airtight Alibi shape must produce exactly ONE cares hit
  // on "it's suspected" — the lookahead must prevent the second clause
  // ("it's no longer suspected") from also satisfying the rule.
  it('matches exactly the cares-suspected span in a combined frame', () => {
    const text = "if it's suspected, it's no longer suspected.";
    const result = rule.match!(text);
    expect(result).toBeTruthy();
    if (typeof result === 'object' && result) {
      // Evidence should be the FIRST occurrence — "it's suspected", not
      // "it's no longer suspected".
      expect(result.evidence).toBe("it's suspected");
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/condition.cares_suspected.test.ts`
Expected: FAIL with module resolution error.

- [ ] **Step 3: Write the minimal implementation**

Create `/Users/Dada/mtg-graph/pipeline/rules/condition.cares_suspected.ts` with these exact contents:

```ts
// pipeline/rules/condition.cares_suspected.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_suspected',
  axis: 'condition',
  label: 'Cares about suspected creatures',
  description:
    'Triggers, scales, gates, or targets based on whether a creature is suspected. Includes anti-suspect statics ("can\'t become suspected") since they reference the same status.',
  pairsWith: ['effect.suspect', 'effect.unsuspect'],
};

// Six frames cover modern carer templating:
//   1. Gate clauses: "is/are/was/were/it's/they're (not) suspected"
//      — the (?!no longer\s+) lookahead blocks the clearer's "is no longer
//      suspected" frame from double-firing on this rule.
//   2. Target removal: "target suspected creature" / "target suspected <tribe>"
//   3. Sacrifice cost: "sacrifice a suspected creature" / "sacrifice a
//      suspected <tribe>"
//   4. Possessive control reference (post-positioned): "(no |any )?suspected
//      creature(s)? you control" / "<tribe>(s)? you control"
//      (Clandestine Meddler, Deadly Complication, Rune-Brand Juggler)
//   5. Possessive control reference (pre-positioned): "you control (no |any )?
//      suspected creature(s)?" / "<tribe>(s)?"
//      (Case of the Stashed Skeleton's "you control no suspected Skeletons"
//      — Case-card "to solve" framing inverts the usual word order)
//   6. Anti-suspect static: "can't become suspected"
//
// The \w+ slot in the typed alternations is intentionally liberal (any
// subtype-shaped word) rather than restricted to THEME_TRIBES. See the
// design doc rationale.
const PATTERNS = [
  /\b(?:is|are|was|were|it's|they're)\s+(?:not\s+)?(?!no longer\s+)suspected\b/,
  /\btarget suspected (?:creature|\w+)\b/,
  /\bsacrifice a suspected (?:creature|\w+)\b/,
  /\b(?:no |any )?suspected (?:creature|\w+)s? you control\b/,
  /\byou control (?:no |any )?suspected (?:creature|\w+)s?\b/,
  /\bcan't become suspected\b/,
];

export const rule: Rule = {
  id: 'condition.cares_suspected',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: {
    anchors: ['suspected'],
    proximity: ['is', 'are', 'was', 'target', 'sacrifice', 'control', "can't become"],
    window: 6,
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/condition.cares_suspected.test.ts`
Expected: PASS, 16 tests passing (9 positives + 6 negatives + 1 regression case).

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/condition.cares_suspected.ts pipeline/rules/condition.cares_suspected.test.ts
git commit -m "$(cat <<'EOF'
feat(rules): add condition.cares_suspected

Carer side of the suspect mechanic family. Five frames covered:
gate clauses ("is/was/are/it's (not) suspected"), target removal
("target suspected creature"), sacrifice cost ("sacrifice a suspected
creature"), possessive references ("suspected creatures you control",
including tribal variants like "suspected Skeletons"), and the
anti-suspect static ("can't become suspected").

Negative lookahead in frame 1 prevents the clearer rule's
"is no longer suspected" phrase from double-firing here.

Expected coverage: 11 cards.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `effect.unsuspect` rule + tests (TDD)

The clearer side. Removes suspect status from a creature.

**Files:**
- Create: `pipeline/rules/effect.unsuspect.test.ts`
- Create: `pipeline/rules/effect.unsuspect.ts`

- [ ] **Step 1: Write the failing test**

Create `/Users/Dada/mtg-graph/pipeline/rules/effect.unsuspect.test.ts` with these exact contents:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.unsuspect';

describe('effect.unsuspect', () => {
  it.each([
    // Absolving Lammasu — "are no longer suspected"
    ['all suspected creatures are no longer suspected.'],
    // Airtight Alibi — "it's no longer suspected"
    ["if it's suspected, it's no longer suspected."],
    // Eliminate the Impossible — "they're no longer suspected"
    ["if any of them are suspected, they're no longer suspected."],
    // Deadly Complication — "become no longer suspected" (modal "may have it become…")
    ['you may have it become no longer suspected.'],
    // Frantic Scapegoat — "is no longer suspected"
    ['if you do, this creature is no longer suspected.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Carer — "is suspected" without "no longer"
    ["if it's suspected, exile it."],
    // Producer
    ['when this creature enters, suspect it.'],
    // Bare reference without the clearer frame
    ['a suspected creature has menace.'],
    // Unrelated mechanic
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/effect.unsuspect.test.ts`
Expected: FAIL with module resolution error.

- [ ] **Step 3: Write the minimal implementation**

Create `/Users/Dada/mtg-graph/pipeline/rules/effect.unsuspect.ts` with these exact contents:

```ts
// pipeline/rules/effect.unsuspect.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.unsuspect',
  axis: 'effect',
  label: 'Clear suspect',
  description:
    'Removes the suspect status from a creature ("is/are no longer suspected", "becomes no longer suspected"). Counter-play and payoff for `condition.cares_suspected`.',
  pairsWith: ['condition.cares_suspected'],
};

// One frame: subject + "no longer suspected". Subject is one of:
//   is | are | it's | they're | become | becomes
// The leading \b anchors the subject word; the trailing \b anchors after
// "suspected".
const PATTERN = /\b(?:is|are|it's|they're|become|becomes) no longer suspected\b/;

export const rule: Rule = {
  id: 'effect.unsuspect',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['no longer suspected'],
    proximity: ['is', 'are', "it's", "they're", 'become'],
    window: 4,
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/effect.unsuspect.test.ts`
Expected: PASS, 10 tests passing (5 positives + 5 negatives).

- [ ] **Step 5: Commit**

```bash
git add pipeline/rules/effect.unsuspect.ts pipeline/rules/effect.unsuspect.test.ts
git commit -m "$(cat <<'EOF'
feat(rules): add effect.unsuspect

Clearer side of the suspect mechanic family. Matches the unsuspect
frame: subject ("is/are/it's/they're/become/becomes") followed by
"no longer suspected". Pairs with condition.cares_suspected as
counter-play / consumer.

Expected coverage: 5 cards.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Full gate + artifact rebuild + match-count verification

End-to-end check: catalog validation, app build, artifact rebuild, and rule-coverage CLI to confirm the expected match counts (15 / 11 / 5).

**Files:** none modified; this task is verification only (modulo the artifact regen, which writes `app/public/data/cards-standard.json`).

- [ ] **Step 1: Run the full test gate**

Run from repo root: `cd /Users/Dada/mtg-graph && npm test`
Expected: ALL tests pass, including:
- `pipeline/catalog.test.ts > tag catalog > every rule id is in the catalog`
- `pipeline/catalog.test.ts > tag catalog > every catalog axis matches its rule axis`
- `pipeline/catalog.test.ts > tag catalog > every pairsWith reference resolves to a catalog entry`
- `pipeline/catalog.test.ts > tag catalog > effects only pair with triggers and vice versa`
- The three new rule test files (Tasks 2–4)

If the "effects only pair with triggers and vice versa" check fails, it means one of the proposed pairings violates the axis-cross constraint. The pairings in this plan are all `effect → condition`, which satisfies it — but if it fails, re-read the spec's "Tags" section and the failing rule's `pairsWith` array.

- [ ] **Step 2: Rebuild the standard artifact**

Run: `cd /Users/Dada/mtg-graph && npm run build:cards -- --standard`
Expected: writes `app/public/data/cards-standard.json` (~4,446 cards), no errors. Prints a coverage summary line at the end.

- [ ] **Step 3: Verify per-tag match counts via rule:coverage**

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- effect.suspect`
Expected: reports **15 matches** with sample card names including Absolving Lammasu, Agrus Kos, Barbed Servitor, Case of the Stashed Skeleton, Caught Red-Handed, Clandestine Meddler, Convenient Target, Frantic Scapegoat, It Doesn't Add Up, Person of Interest, Reasonable Doubt, Repeat Offender, Rubblebelt Braggart, Rune-Brand Juggler, J. Jonah Jameson.

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- condition.cares_suspected`
Expected: reports **11 matches** including Agency Coroner, Agrus Kos, Airtight Alibi, Case of the Stashed Skeleton, Clandestine Meddler, Deadly Complication, Eliminate the Impossible, Frantic Scapegoat, Repeat Offender, Rubblebelt Braggart, Rune-Brand Juggler.

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- effect.unsuspect`
Expected: reports **5 matches** including Absolving Lammasu, Airtight Alibi, Deadly Complication, Eliminate the Impossible, Frantic Scapegoat.

If any count is off, do NOT proceed to Step 4. Re-read the spec's "Per-card expected matches" table, identify which card is missing or extra, and adjust the failing rule's regex. Then re-run the relevant `.test.ts` and this verification command.

- [ ] **Step 4: Verify Presumed Dead is the documented FN**

Run: `cd /Users/Dada/mtg-graph && node /Users/Dada/.claude/skills/mtg-graph-card-tag-audit/card_lookup.mjs "Presumed Dead"`
Expected: card found; tags list does NOT include `effect.suspect`, `condition.cares_suspected`, or `effect.unsuspect`. This is the known FN — granted-ability quote stripping removes the suspect verb before tagging. No action needed; documented in the spec's "Known limitations."

- [ ] **Step 5: Verify pairsWith integrity**

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- --pairings`
Expected: PASS (no "unknown tag id" errors). The three new tags reference `condition.cares_suspected`, `condition.cares_evasion`, `effect.suspect`, `effect.unsuspect` — all in-catalog.

- [ ] **Step 6: (no artifact commit — gitignored)**

Per `CLAUDE.md`, `app/public/data/*.json` is gitignored by design — the artifact regenerates from committed rule code on every fresh checkout. Confirm via `git check-ignore app/public/data/cards-standard.json` (exits 0 if ignored). No commit needed for Task 5. The local-disk artifact is only for serving the dev server.

---

## Task 6: Clean up CARD_ISSUES.md

Per the audit skill convention, delete the issue entry whose coverage gap has been shipped. The Absolving Lammasu entry was logged to track the suspect family coverage gap; it's now resolved.

**Files:**
- Modify: `/Users/Dada/mtg-graph/CARD_ISSUES.md` (delete the Absolving Lammasu entry block, including its leading `---` separator, leaving the next entry's separator in place).

- [ ] **Step 1: Pre-check the entry exists**

Run: `cd /Users/Dada/mtg-graph && grep -c "^## Absolving Lammasu" CARD_ISSUES.md`
Expected: `1`.

If `0`, someone else has already removed it — skip the rest of this task and proceed to "Self-review checklist." If `>1`, stop and resolve manually.

- [ ] **Step 2: Delete the block via a Python one-liner**

The deletion uses anchored regex matching: the block runs from the `---` separator preceding `## Absolving Lammasu` up to (but not including) the next `---` separator. This is robust against line-number drift and apostrophe-in-card-name concerns.

Run from repo root:

```bash
cd /Users/Dada/mtg-graph && python3 <<'PY'
import re
path = 'CARD_ISSUES.md'
src = open(path).read()
# Match: leading newline + --- + blank + "## Absolving Lammasu" + everything
# up to (but not including) the next "\n---\n" separator. DOTALL lets .*?
# span newlines; non-greedy gives the next ---, not the last.
pattern = re.compile(r'\n---\n\n## Absolving Lammasu.*?(?=\n---\n)', re.DOTALL)
new, n = pattern.subn('', src)
if n != 1:
    raise SystemExit(f'expected exactly 1 deletion, got {n} — aborting, file unchanged')
open(path, 'w').write(new)
print(f'deleted 1 block ({len(src) - len(new)} bytes)')
PY
```

Expected stdout: `deleted 1 block (NNNN bytes)` (where N is roughly 1700+).

If you see `expected exactly 1 deletion, got 0` — the file's structure has drifted; fall back to manual Edit using the heading line as the unique anchor.

- [ ] **Step 3: Verify the entry is gone and neighbors are intact**

Run: `cd /Users/Dada/mtg-graph && grep -c "^## Absolving Lammasu" CARD_ISSUES.md`
Expected: `0`.

Run: `cd /Users/Dada/mtg-graph && grep -n "^## " CARD_ISSUES.md`
Expected: lists all the OTHER per-card headings. Specifically, the previous neighbor (`## Zoyowa's Justice`) and the next neighbor (`## Agency Outfitter`) should both still appear, with exactly one `---` between them in the file.

Run: `cd /Users/Dada/mtg-graph && grep -B1 -A1 "^## Agency Outfitter" CARD_ISSUES.md | head -5`
Expected: shows `---` immediately above (with a blank line between).

- [ ] **Step 4: Commit**

```bash
cd /Users/Dada/mtg-graph && git add CARD_ISSUES.md && git commit -m "$(cat <<'EOF'
chore(audit): resolve Absolving Lammasu entry

Suspect mechanic family shipped in v0.14.2 (effect.suspect,
condition.cares_suspected, effect.unsuspect). The Absolving Lammasu
entry was the punch-list tracker for that coverage gap; removed per
the audit skill convention.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review checklist (executor-facing)

Before considering the plan complete, the executor should confirm:

- [ ] Three new rule files exist under `pipeline/rules/` and each exports BOTH `tagDef` and `rule`.
- [ ] Three colocated `.test.ts` files exist with at least 3 positives + 3 negatives each (per `CLAUDE.md` TDD rule).
- [ ] `shared/version.ts` is at `v0.14.2`.
- [ ] `npm test` (root) passes — pipeline tests, app tests, app build.
- [ ] `npm run rule:coverage -- effect.suspect` reports 15.
- [ ] `npm run rule:coverage -- condition.cares_suspected` reports 11.
- [ ] `npm run rule:coverage -- effect.unsuspect` reports 5.
- [ ] `npm run rule:coverage -- --pairings` passes.
- [ ] Presumed Dead has none of the three new tags (documented FN).
- [ ] `CARD_ISSUES.md` no longer contains an `## Absolving Lammasu` heading.
- [ ] Six commits on `feature/conditional-pairings`: version bump, three rule commits, artifact rebuild, CARD_ISSUES cleanup.
