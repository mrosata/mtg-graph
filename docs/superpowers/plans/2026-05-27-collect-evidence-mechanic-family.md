# Collect-Evidence Mechanic Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three new tags (`effect.collect_evidence`, `condition.evidence_collected`, `trigger.collected_evidence`) covering 21/22 Standard collect-evidence cards (Axebane Ferox excluded as opponent-side ward-cost frame), per spec `docs/superpowers/specs/2026-05-27-collect-evidence-mechanic-family-design.md` (commit `746adcc`).

**Architecture:** Three colocated rule files in `pipeline/rules/`, each exporting both `tagDef` and `rule`. Auto-discovered by `aggregator.ts`. The `effect.collect_evidence` tagDef declares `children: ['effect.exile_from_graveyard']` so the tag-expansion post-pass propagates exile-from-graveyard to every collect-evidence card (the mechanical exile lives in stripped reminder text and wouldn't otherwise fire). RULE_VERSION bump in `shared/version.ts` triggers IndexedDB cache invalidation. tagFamilies.ts registration is explicit per the gap that surfaced mid-task on the suspect family. TDD: failing test → minimal regex → green.

**Tech Stack:** TypeScript, Vitest, regex literals against normalized oracle text (lowercased, reminder-stripped, `__SELF__`-substituted). JavaScript regex lookbehind for the `(?<!ward—)` exclusion.

---

## File map

**Create:**
- `pipeline/rules/effect.collect_evidence.ts` — rule + tagDef for the producer (with `children` expansion)
- `pipeline/rules/effect.collect_evidence.test.ts`
- `pipeline/rules/condition.evidence_collected.ts` — rule + tagDef for the one-shot modal gate
- `pipeline/rules/condition.evidence_collected.test.ts`
- `pipeline/rules/trigger.collected_evidence.ts` — rule + tagDef for the per-collect trigger
- `pipeline/rules/trigger.collected_evidence.test.ts`

**Modify:**
- `shared/version.ts` line 2 — bump `'v0.14.2'` → `'v0.14.3'`
- `app/src/lib/tagFamilies.ts` — add three entries under `set-mechanics`
- `CARD_ISSUES.md` — delete the Analyze the Pollen entry (it tracked the now-shipped collect-evidence coverage gap)

---

## Task 1: Bump RULE_VERSION

Starter task — small, isolated.

**Files:**
- Modify: `shared/version.ts` line 2

- [ ] **Step 1: Read current version**

Run: `cat /Users/Dada/mtg-graph/shared/version.ts`
Expected: `export const RULE_VERSION = 'v0.14.2';`

- [ ] **Step 2: Edit the file**

Replace the contents of `/Users/Dada/mtg-graph/shared/version.ts` with:

```ts
// shared/version.ts
export const RULE_VERSION = 'v0.14.3';
```

- [ ] **Step 3: Verify**

Run: `cat /Users/Dada/mtg-graph/shared/version.ts`
Expected: shows `v0.14.3`.

- [ ] **Step 4: Commit**

```bash
cd /Users/Dada/mtg-graph && git add shared/version.ts && git commit -m "$(cat <<'EOF'
chore: bump RULE_VERSION to v0.14.3

Prepares for the collect-evidence mechanic family (effect.collect_evidence,
condition.evidence_collected, trigger.collected_evidence). New tags force
client IndexedDB cache invalidation on next artifact load.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `effect.collect_evidence` rule + tests (TDD)

The producer side. Matches the keyword-action phrase "collect evidence N" where N is a digit or the letter X. Lookbehind excludes the opponent-side ward-cost frame.

**Files:**
- Create: `pipeline/rules/effect.collect_evidence.test.ts`
- Create: `pipeline/rules/effect.collect_evidence.ts`

- [ ] **Step 1: Write the failing test**

Create `/Users/Dada/mtg-graph/pipeline/rules/effect.collect_evidence.test.ts` with these exact contents:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.collect_evidence';

describe('effect.collect_evidence', () => {
  it.each([
    // Analyze the Pollen — additional-cost form
    ['as an additional cost to cast this spell, you may collect evidence 8.'],
    // Cryptex — activated cost with {T} prefix
    ['{t}, collect evidence 3: add one mana of any color.'],
    // Conspiracy Unraveler — alt-cost form
    ['you may collect evidence 10 rather than pay the mana cost for spells you cast.'],
    // Urgent Necropsy — variable X form
    ['as an additional cost to cast this spell, collect evidence x, where x is the total mana value of the permanents this spell targets.'],
    // Lamplight Phoenix — optional trigger consequent ("may exile it and collect evidence 4")
    ['when this creature dies, you may exile it and collect evidence 4.'],
    // Kylox's Voltstrider — bare colon-cost without {T}
    ['collect evidence 6: this vehicle becomes an artifact creature until end of turn.'],
    // Sample Collector — combat trigger optional cost
    ['whenever this creature attacks, you may collect evidence 3.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Axebane Ferox — opponent-side ward cost; the (?<!ward—) lookbehind must block this
    ['deathtouch, haste ward—collect evidence 4.'],
    // Modal gate phrasing — not the producer
    ['if evidence was collected, instead search your library for a creature or land card.'],
    // Per-collect trigger phrase — no digit/x suffix; producer must not fire
    ['whenever you collect evidence, investigate.'],
    // Bare reference without a digit/x
    ['the detective examines the evidence carefully.'],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from repo root: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/effect.collect_evidence.test.ts`
Expected: FAIL with module resolution error (`Cannot find module './effect.collect_evidence'`).

- [ ] **Step 3: Write the minimal implementation**

Create `/Users/Dada/mtg-graph/pipeline/rules/effect.collect_evidence.ts` with these exact contents:

```ts
// pipeline/rules/effect.collect_evidence.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.collect_evidence',
  axis: 'effect',
  label: 'Collect Evidence',
  description:
    'MKM keyword action. Exile cards from your graveyard with total mana value N or greater (as additional cost, alt cost, activated-ability cost, or optional triggered cost). Producer for `condition.evidence_collected` and `trigger.collected_evidence`. Also a form of graveyard-exile — applied via `children` expansion to `effect.exile_from_graveyard`.',
  pairsWith: [
    'condition.evidence_collected',
    'trigger.collected_evidence',
    'condition.cares_graveyard',
    'condition.cares_exile_pile',
  ],
  children: ['effect.exile_from_graveyard'],
};

// Match the keyword-action phrase "collect evidence N" where N is a digit
// (typically 2, 3, 4, 6, 8, 10) or the literal letter x (variable form,
// e.g. Urgent Necropsy). The (?<!ward—) lookbehind excludes Axebane
// Ferox's "Ward—Collect evidence 4" ward-cost frame: in that frame the
// OPPONENT collects evidence to keep their spell on the stack — the
// controller is not collecting. Same axis-flip pattern as the suspect
// family's edict carve-out.
//
// The trailing \b ensures we don't match the verb form "you collect
// evidence" (no numeric suffix) used in the per-collect trigger phrase.
const PATTERN = /(?<!ward—)\bcollect evidence (?:\d+|x)\b/;

export const rule: Rule = {
  id: 'effect.collect_evidence',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['collect evidence'],
    proximity: ['additional cost', 'rather than pay', 'may', '{t}', 'whenever'],
    window: 8,
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run from repo root: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/effect.collect_evidence.test.ts`
Expected: PASS, 13 tests passing (7 positives + 6 negatives).

- [ ] **Step 5: Commit**

```bash
cd /Users/Dada/mtg-graph && git add pipeline/rules/effect.collect_evidence.ts pipeline/rules/effect.collect_evidence.test.ts && git commit -m "$(cat <<'EOF'
feat(rules): add effect.collect_evidence

Producer side of the collect-evidence mechanic family. Matches the
keyword-action phrase "collect evidence N" (digit or X) across all
cost frames: additional cost, alt cost, activated cost, optional
triggered cost. The (?<!ward—) lookbehind excludes Axebane Ferox's
opponent-side ward-cost frame.

Declares children: ['effect.exile_from_graveyard'] so the tag-expansion
post-pass propagates exile-from-graveyard to every collect-evidence
card. The mechanical exile lives in stripped reminder text and would
not otherwise fire.

Expected coverage: 21 cards (22 minus Axebane Ferox).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `condition.evidence_collected` rule + tests (TDD)

The one-shot modal gate. Fires when "if evidence was collected" appears.

**Files:**
- Create: `pipeline/rules/condition.evidence_collected.test.ts`
- Create: `pipeline/rules/condition.evidence_collected.ts`

- [ ] **Step 1: Write the failing test**

Create `/Users/Dada/mtg-graph/pipeline/rules/condition.evidence_collected.test.ts` with these exact contents:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.evidence_collected';

describe('condition.evidence_collected', () => {
  it.each([
    // Analyze the Pollen — modal upgrade
    ['if evidence was collected, instead search your library for a creature or land card.'],
    // Bite Down on Crime — cost reduction
    ['this spell costs {2} less to cast if evidence was collected.'],
    // Deadly Cover-Up — extra-effect rider
    ["if evidence was collected, exile a card from an opponent's graveyard."],
    // Behind the Mask — alternate stats rider
    ['if evidence was collected, it has base power and toughness 1/1 until end of turn instead.'],
    // Vitu-Ghazi Inspector — ETB conditional
    ['when this creature enters, if evidence was collected, put a +1/+1 counter on target creature and you gain 2 life.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Producer phrasing — not the gate
    ['you may collect evidence 6.'],
    // Per-collect trigger — not the gate
    ['whenever you collect evidence, investigate.'],
    // Partial phrase only
    ['evidence collected'],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
    ['create a clue token.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/condition.evidence_collected.test.ts`
Expected: FAIL with module resolution error.

- [ ] **Step 3: Write the minimal implementation**

Create `/Users/Dada/mtg-graph/pipeline/rules/condition.evidence_collected.ts` with these exact contents:

```ts
// pipeline/rules/condition.evidence_collected.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.evidence_collected',
  axis: 'condition',
  label: 'Evidence collected',
  description:
    'One-shot modal/scaling gate. Fires when the collect-evidence cost was paid on this spell or ability ("if evidence was collected, ..."). Consumer for `effect.collect_evidence`.',
  pairsWith: ['effect.collect_evidence'],
};

// Single literal frame. "Evidence" is a low-traffic word in MTG outside
// the MKM mechanic, so a bare phrase match is sufficient. No \b before
// "if" because the phrase typically starts a clause (preceded by "." or
// "," or beginning of text).
const PATTERN = /\bif evidence was collected\b/;

export const rule: Rule = {
  id: 'condition.evidence_collected',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['evidence was collected'],
    proximity: ['if', 'instead', 'costs'],
    window: 4,
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/condition.evidence_collected.test.ts`
Expected: PASS, 11 tests passing (5 positives + 6 negatives).

- [ ] **Step 5: Commit**

```bash
cd /Users/Dada/mtg-graph && git add pipeline/rules/condition.evidence_collected.ts pipeline/rules/condition.evidence_collected.test.ts && git commit -m "$(cat <<'EOF'
feat(rules): add condition.evidence_collected

One-shot modal-gate side of the collect-evidence mechanic family.
Matches "if evidence was collected" — the modal upgrade / cost-
reduction / extra-effect rider used by 7 MKM spells to gate a
better effect on whether the keyword-action cost was paid.

Expected coverage: 7 cards.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `trigger.collected_evidence` rule + tests (TDD)

The per-collect trigger. Fires each time the controller collects evidence.

**Files:**
- Create: `pipeline/rules/trigger.collected_evidence.test.ts`
- Create: `pipeline/rules/trigger.collected_evidence.ts`

- [ ] **Step 1: Write the failing test**

Create `/Users/Dada/mtg-graph/pipeline/rules/trigger.collected_evidence.test.ts` with these exact contents:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.collected_evidence';

describe('trigger.collected_evidence', () => {
  it.each([
    // Evidence Examiner
    ['whenever you collect evidence, investigate.'],
    // Surveillance Monitor
    ['whenever you collect evidence, create a 1/1 colorless thopter artifact creature token with flying.'],
    // Hypothetical future card — the trigger frame at end of a clause
    ['flying. whenever you collect evidence, draw a card.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Producer — not the trigger
    ['you may collect evidence 4.'],
    // Modal gate — not the trigger
    ['if evidence was collected, draw a card.'],
    // "When you do" follow-on after producer — not the same trigger frame
    ['you may collect evidence 3. when you do, put a +1/+1 counter on target creature you control.'],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/trigger.collected_evidence.test.ts`
Expected: FAIL with module resolution error.

- [ ] **Step 3: Write the minimal implementation**

Create `/Users/Dada/mtg-graph/pipeline/rules/trigger.collected_evidence.ts` with these exact contents:

```ts
// pipeline/rules/trigger.collected_evidence.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.collected_evidence',
  axis: 'trigger',
  label: 'On collecting evidence',
  description:
    'Triggers each time the controller collects evidence (the keyword action). Distinct from `condition.evidence_collected`, which is the one-shot modal gate fired by "if evidence was collected".',
  pairsWith: ['effect.collect_evidence'],
};

// Single frame: "whenever you collect evidence". Note the verb form is
// "collect evidence" (no digit/x suffix) — distinct from the producer's
// "collect evidence N" keyword-action form. Word boundaries on both
// sides prevent partial matches.
const PATTERN = /\bwhenever you collect evidence\b/;

export const rule: Rule = {
  id: 'trigger.collected_evidence',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['collect evidence'],
    proximity: ['whenever you'],
    window: 3,
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/trigger.collected_evidence.test.ts`
Expected: PASS, 8 tests passing (3 positives + 5 negatives).

- [ ] **Step 5: Commit**

```bash
cd /Users/Dada/mtg-graph && git add pipeline/rules/trigger.collected_evidence.ts pipeline/rules/trigger.collected_evidence.test.ts && git commit -m "$(cat <<'EOF'
feat(rules): add trigger.collected_evidence

Per-collect trigger side of the collect-evidence mechanic family.
Matches "whenever you collect evidence" — fires each time the
controller collects evidence (Evidence Examiner, Surveillance Monitor).
Distinct from condition.evidence_collected, which is the one-shot
modal gate.

Expected coverage: 2 cards.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Register the three new tags in `tagFamilies.ts`

`app/src/lib/tagFamilies.ts` requires every catalog tag to be explicitly registered (enforced by `pipeline/tagFamilies-consistency.test.ts`). Without this, the full test gate in Task 6 will fail.

**Files:**
- Modify: `app/src/lib/tagFamilies.ts` — add three entries under `set-mechanics`

- [ ] **Step 1: Verify insertion points**

Run: `grep -n "'condition.descend'\|'effect.discover'\|'effect.unsuspect'\|'trigger.discovered'" /Users/Dada/mtg-graph/app/src/lib/tagFamilies.ts`
Expected: shows the four anchor lines (approximate line numbers: 185, 186, 201, 202).

- [ ] **Step 2: Insert `condition.evidence_collected`**

Use the Edit tool on `/Users/Dada/mtg-graph/app/src/lib/tagFamilies.ts`:

`old_string`:

```
  'condition.descend': 'set-mechanics',
  'effect.discover': 'set-mechanics',
```

`new_string`:

```
  'condition.descend': 'set-mechanics',
  'condition.evidence_collected': 'set-mechanics',
  'effect.collect_evidence': 'set-mechanics',
  'effect.discover': 'set-mechanics',
```

(Two new entries inserted in one Edit: `condition.evidence_collected` after `condition.descend`, and `effect.collect_evidence` immediately before `effect.discover`.)

- [ ] **Step 3: Insert `trigger.collected_evidence`**

Use the Edit tool on `/Users/Dada/mtg-graph/app/src/lib/tagFamilies.ts`:

`old_string`:

```
  'effect.unsuspect': 'set-mechanics',
  'trigger.discovered': 'set-mechanics',
```

`new_string`:

```
  'effect.unsuspect': 'set-mechanics',
  'trigger.collected_evidence': 'set-mechanics',
  'trigger.discovered': 'set-mechanics',
```

- [ ] **Step 4: Verify all three entries are present**

Run: `grep -n "collect_evidence\|evidence_collected" /Users/Dada/mtg-graph/app/src/lib/tagFamilies.ts`
Expected: shows three matching lines, all mapped to `'set-mechanics'`.

- [ ] **Step 5: Run the tagFamilies consistency test**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/tagFamilies-consistency.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/Dada/mtg-graph && git add app/src/lib/tagFamilies.ts && git commit -m "$(cat <<'EOF'
feat(app): register collect-evidence family tags in tagFamilies

Adds effect.collect_evidence, condition.evidence_collected, and
trigger.collected_evidence to the set-mechanics family. Required for
the tagFamilies-consistency test gate. Explicit step in the plan this
time (the suspect family hit this as a mid-task gap).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Full gate + artifact rebuild + verify match counts + children expansion smoke check

End-to-end check: catalog validation, app build, artifact rebuild, rule-coverage CLI to confirm expected match counts (21 / 7 / 2), and a smoke check that `effect.exile_from_graveyard` grew by 21 via the children expansion.

**Files:** none modified by you. The artifact regen writes `app/public/data/cards-standard.json` (gitignored — no commit).

- [ ] **Step 1: Run the full test gate**

Run from repo root: `cd /Users/Dada/mtg-graph && npm test`
Expected: ALL tests pass, including the new rule test files (Tasks 2–4), `pipeline/catalog.test.ts` (pairings, axis-cross, children), `pipeline/tagFamilies-consistency.test.ts`, the app vitest suite, and the app `npm run build` (tsc + vite).

If anything fails, STOP and report. Do NOT make changes to fix failures without controller approval.

- [ ] **Step 2: Rebuild the standard artifact**

Run: `cd /Users/Dada/mtg-graph && npm run build:cards -- --standard`
Expected: writes `app/public/data/cards-standard.json` (~4,446 cards), no errors. Prints a coverage summary line.

- [ ] **Step 3: Verify per-tag match counts via rule:coverage**

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- effect.collect_evidence`
Expected: reports **21 matches** with sample card names from the spec's per-card table (Analyze the Pollen, Behind the Mask, Bite Down on Crime, Conspiracy Unraveler, Crimestopper Sprite, Cryptex, Deadly Cover-Up, Evidence Examiner, Extract a Confession, Forensic Researcher, Hedge Whisperer, Incinerator of the Guilty, Izoni Center of the Web, Kylox's Voltstrider, Lamplight Phoenix, Polygraph Orb, Sample Collector, Surveillance Monitor, Tenth District Hero, Urgent Necropsy, Vitu-Ghazi Inspector). **Must NOT include Axebane Ferox.**

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- condition.evidence_collected`
Expected: reports **7 matches** (Analyze the Pollen, Behind the Mask, Bite Down on Crime, Crimestopper Sprite, Deadly Cover-Up, Extract a Confession, Vitu-Ghazi Inspector).

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- trigger.collected_evidence`
Expected: reports **2 matches** (Evidence Examiner, Surveillance Monitor).

If any count is off, STOP. Re-read the spec's "Per-card expected matches" table to identify which card is missing or extra. Report BLOCKED with specifics.

- [ ] **Step 4: Verify Axebane Ferox is correctly excluded**

Run: `cd /Users/Dada/mtg-graph && node /Users/Dada/.claude/skills/mtg-graph-card-tag-audit/card_lookup.mjs "Axebane Ferox"`
Expected: tags list does NOT include `effect.collect_evidence`, `condition.evidence_collected`, or `trigger.collected_evidence`. The `(?<!ward—)` lookbehind correctly blocks the ward-cost frame.

- [ ] **Step 5: Children expansion smoke check (effect.exile_from_graveyard)**

**Important:** `npm run rule:coverage` reports the raw-regex match count for the named rule, NOT the post-tag-expansion count. So it will still show the pre-expansion baseline (~59-60) even when the children expansion is working correctly. To verify the children expansion, query the artifact JSON directly:

```bash
cd /Users/Dada/mtg-graph && python3 -c "
import json
d = json.load(open('app/public/data/cards-standard.json'))
have_efg = [c['name'] for c in d['cards'] if any(t['tagId']=='effect.exile_from_graveyard' for t in c['tags'])]
have_ce  = [c['name'] for c in d['cards'] if any(t['tagId']=='effect.collect_evidence' for t in c['tags'])]
print(f'effect.exile_from_graveyard (post-expansion): {len(have_efg)}')
print(f'effect.collect_evidence: {len(have_ce)}')
overlap = set(have_efg) & set(have_ce)
print(f'overlap (collect-evidence cards also tagged with exile_from_graveyard): {len(overlap)}')
print(f'expected overlap: {len(have_ce)} (all collect-evidence cards should expand)')
"
```

Expected:
- `effect.exile_from_graveyard (post-expansion)`: ≥80 (some pre-existing direct matches + 21 from collect-evidence).
- `effect.collect_evidence`: 21.
- `overlap`: 21 (every collect-evidence card carries the exile_from_graveyard tag via the expansion).

If `overlap` is less than 21, the children expansion isn't firing for some cards. Investigate `pipeline/tag-expansion.ts`.

- [ ] **Step 6: Verify pairsWith integrity**

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- --pairings`
Expected: PASS (no "unknown tag id" errors).

- [ ] **Step 7: No artifact commit**

Per `CLAUDE.md`, `app/public/data/*.json` is gitignored. The artifact regenerates from committed rule code on every fresh checkout. Confirm:

Run: `cd /Users/Dada/mtg-graph && git check-ignore app/public/data/cards-standard.json && echo gitignored-confirmed`
Expected: prints `app/public/data/cards-standard.json` then `gitignored-confirmed`. No commit needed.

---

## Task 7: Clean up CARD_ISSUES.md

Per the audit skill convention, delete the issue entry whose coverage gap has been shipped. The Analyze the Pollen entry was logged to track the collect-evidence family coverage gap; it's now resolved.

**Files:**
- Modify: `/Users/Dada/mtg-graph/CARD_ISSUES.md` (delete the Analyze the Pollen entry block, including its leading `---` separator, leaving the next entry's separator in place).

- [ ] **Step 1: Pre-check the entry exists**

Run: `cd /Users/Dada/mtg-graph && grep -c "^## Analyze the Pollen" CARD_ISSUES.md`
Expected: `1`.

If `0`, someone has already removed it — skip the rest and report DONE with a note. If `>1`, stop and report BLOCKED.

- [ ] **Step 2: Delete the block via a Python one-liner**

Run from repo root:

```bash
cd /Users/Dada/mtg-graph && python3 <<'PY'
import re
path = 'CARD_ISSUES.md'
src = open(path).read()
# Match: leading newline + --- + blank + "## Analyze the Pollen" + everything
# up to (but not including) the next "\n---\n" separator. DOTALL lets .*?
# span newlines; non-greedy gives the next ---, not the last.
pattern = re.compile(r'\n---\n\n## Analyze the Pollen.*?(?=\n---\n)', re.DOTALL)
new, n = pattern.subn('', src)
if n != 1:
    raise SystemExit(f'expected exactly 1 deletion, got {n} — aborting, file unchanged')
open(path, 'w').write(new)
print(f'deleted 1 block ({len(src) - len(new)} bytes)')
PY
```

Expected stdout: `deleted 1 block (NNNN bytes)` (where N is roughly 1500+).

If you see `expected exactly 1 deletion, got 0` — the file's structure has drifted; report BLOCKED with the file contents around the heading.

- [ ] **Step 3: Verify the entry is gone and neighbors are intact**

Run: `cd /Users/Dada/mtg-graph && grep -c "^## Analyze the Pollen" CARD_ISSUES.md`
Expected: `0`.

Run: `cd /Users/Dada/mtg-graph && grep -n "^## " CARD_ISSUES.md`
Expected: lists all the OTHER per-card headings. The previous neighbor (`## Alquist Proft, Master Sleuth`) and the next neighbor (`## Anzrag's Rampage`) should both still appear.

- [ ] **Step 4: Check for orphan references**

The Analyze the Pollen entry may be referenced by other entries that say "see Analyze the Pollen for the collect-evidence coverage gap" (similar to how the suspect cleanup found an orphan in Agrus Kos). Search:

Run: `cd /Users/Dada/mtg-graph && grep -n "Analyze the Pollen" CARD_ISSUES.md`
Expected: ideally `0` results.

If there ARE orphan references (e.g., from Cryptex, Conspiracy Unraveler, or other collect-evidence cards that got audit entries for OTHER reasons but referenced Analyze the Pollen for the collect-evidence concern), edit each one to remove the stale "missing (deferred): collect-evidence family" bullet. Use the Edit tool with the exact bullet text as old_string.

- [ ] **Step 5: Commit**

```bash
cd /Users/Dada/mtg-graph && git add CARD_ISSUES.md && git commit -m "$(cat <<'EOF'
chore(audit): resolve Analyze the Pollen entry

Collect-evidence mechanic family shipped in v0.14.3 (effect.collect_evidence,
condition.evidence_collected, trigger.collected_evidence). The Analyze
the Pollen entry was the punch-list tracker for that coverage gap;
removed per the audit skill convention. Any orphan references in other
entries cleaned up in the same commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review checklist (executor-facing)

Before considering the plan complete, the executor should confirm:

- [ ] Three new rule files exist under `pipeline/rules/` and each exports BOTH `tagDef` and `rule`.
- [ ] Three colocated `.test.ts` files exist with at least 3 positives + 3 negatives each.
- [ ] `effect.collect_evidence` tagDef declares `children: ['effect.exile_from_graveyard']`.
- [ ] `shared/version.ts` is at `v0.14.3`.
- [ ] `app/src/lib/tagFamilies.ts` has all three new entries under `set-mechanics`.
- [ ] `npm test` (root) passes — pipeline tests, app tests, app build.
- [ ] `npm run rule:coverage -- effect.collect_evidence` reports 21 (Axebane Ferox NOT included).
- [ ] `npm run rule:coverage -- condition.evidence_collected` reports 7.
- [ ] `npm run rule:coverage -- trigger.collected_evidence` reports 2.
- [ ] `npm run rule:coverage -- effect.exile_from_graveyard` reports 81 (was 60 + 21 via children expansion).
- [ ] `npm run rule:coverage -- --pairings` passes.
- [ ] Axebane Ferox has none of the three new tags (excluded by lookbehind).
- [ ] `CARD_ISSUES.md` no longer contains an `## Analyze the Pollen` heading or any orphan references to it.
- [ ] Six commits on `feature/conditional-pairings`: version bump, three rule commits, tagFamilies registration, CARD_ISSUES cleanup. (No artifact commit — gitignored.)
