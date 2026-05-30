# Cheat-Into-Play Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two new tags (`effect.cheat_into_play`, `effect.cast_from_library_top`) covering ~25 Standard cards from the "put-onto-battlefield from non-graveyard" + "cast from top of library" archetypes, per spec `docs/superpowers/specs/2026-05-27-cheat-into-play-family-design.md` (commit `462b170`).

**Architecture:** Two colocated rule files in `pipeline/rules/`, each exporting both `tagDef` and `rule`. Auto-discovered by `aggregator.ts`. `effect.cheat_into_play` uses a multi-pattern array (like `effect.reanimate`) — three regex alternations covering search/look/exile sub-patterns, plus a rule-level post-match filter to exclude face-down/manifest-dread spans (those are `effect.cloak`). `effect.cast_from_library_top` uses two simpler text-only patterns. No `children` expansion. RULE_VERSION bump triggers IndexedDB cache invalidation. tagFamilies.ts registration as `themes` (siblings to `effect.reanimate`). TDD: failing test → minimal regex → green.

**Tech Stack:** TypeScript, Vitest, regex literals against normalized oracle text (lowercased, reminder-stripped, `~`/name → `__SELF__`). Multi-pattern array iteration mirrors the `effect.reanimate` shape.

---

## File map

**Create:**
- `pipeline/rules/effect.cheat_into_play.ts` — rule + tagDef for the put-onto-battlefield producer (multi-pattern array + post-match filter)
- `pipeline/rules/effect.cheat_into_play.test.ts`
- `pipeline/rules/effect.cast_from_library_top.ts` — rule + tagDef for the Future Sight–style top-of-library permission
- `pipeline/rules/effect.cast_from_library_top.test.ts`

**Modify:**
- `shared/version.ts` line 2 — bump `'v0.14.4'` → `'v0.14.5'`
- `app/src/lib/tagFamilies.ts` — add two entries under `themes`
- `CARD_ISSUES.md` — drop the now-resolved bullets / entries (Break Out, Anzrag's Rampage cheat_into_play bullet, Assemble the Players, plus Tier 3 Item U if it survived)

---

## Task 1: Bump RULE_VERSION

Starter task — small, isolated.

**Files:**
- Modify: `shared/version.ts` line 2

- [ ] **Step 1: Read current version**

Run: `cat /Users/Dada/mtg-graph/shared/version.ts`
Expected: `export const RULE_VERSION = 'v0.14.4';`

- [ ] **Step 2: Edit the file**

Replace the contents of `/Users/Dada/mtg-graph/shared/version.ts` with:

```ts
// shared/version.ts
export const RULE_VERSION = 'v0.14.5';
```

- [ ] **Step 3: Verify**

Run: `cat /Users/Dada/mtg-graph/shared/version.ts`
Expected: shows `v0.14.5`.

- [ ] **Step 4: Commit**

```bash
cd /Users/Dada/mtg-graph && git add shared/version.ts && git commit -m "$(cat <<'EOF'
chore: bump RULE_VERSION to v0.14.5

Prepares for the cheat-into-play family (effect.cheat_into_play,
effect.cast_from_library_top). New tags force client IndexedDB
cache invalidation on next artifact load.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `effect.cheat_into_play` rule + tests (TDD)

The put-onto-battlefield producer. Multi-pattern array (like `effect.reanimate`) with three regex sub-patterns + a rule-level post-match filter that excludes face-down/manifest-dread spans (those are `effect.cloak`).

**Reference precedent:** Read `pipeline/rules/effect.reanimate.ts` before writing — it shows the multi-pattern-array shape, the iteration in `match`, and how to set evidence from the matched regex.

**Files:**
- Create: `pipeline/rules/effect.cheat_into_play.test.ts`
- Create: `pipeline/rules/effect.cheat_into_play.ts`

- [ ] **Step 1: Write the failing test**

Create `/Users/Dada/mtg-graph/pipeline/rules/effect.cheat_into_play.test.ts` with these exact contents:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.cheat_into_play';

describe('effect.cheat_into_play', () => {
  it.each([
    // Pattern A — search library + put onto battlefield (non-land)
    ['search your library for a creature card with mana value x or less, put it onto the battlefield, then shuffle.'],
    ['search your library for an artifact card, put it onto the battlefield, then shuffle.'],
    // Pattern B — look at top + put onto battlefield (across sentence boundaries)
    ['look at the top six cards of your library. you may reveal a creature card from among them. if that card has mana value 2 or less, you may put it onto the battlefield.'],
    ['look at the top six cards of your library. you may reveal a creature card with mana value less than or equal to the number of lands you control from among them and put it onto the battlefield.'],
    // Pattern C — exiled cards → battlefield
    ['put any number of exiled cards with that name onto the battlefield.'],
    ['you may put an exiled creature card used to craft __self__ onto the battlefield.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Pattern A negatives — land tutors must NOT fire (those are effect.tutors_basic_land / ramp_nonland)
    ['search your library for a basic forest card, put that card onto the battlefield, then shuffle.'],
    ['search your library for a plains card and put it onto the battlefield tapped.'],
    ['search your library for a cave card, put it onto the battlefield tapped, then shuffle.'],
    // Reanimate — graveyard → battlefield is effect.reanimate, not cheat_into_play
    ['return target creature card from your graveyard to the battlefield.'],
    // Cloak/manifest — face-down creation is effect.cloak
    ['manifest dread.'],
    // Pattern B negative — look at top + put face-down (Hide in Plain Sight shape) must NOT fire
    ['look at the top three cards of your library. you may cloak that card. put the rest into your graveyard.'],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from repo root: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/effect.cheat_into_play.test.ts`
Expected: FAIL with module resolution error (`Cannot find module './effect.cheat_into_play'`).

- [ ] **Step 3: Write the minimal implementation**

Create `/Users/Dada/mtg-graph/pipeline/rules/effect.cheat_into_play.ts` with these exact contents:

```ts
// pipeline/rules/effect.cheat_into_play.ts
//
// "Cheat into play" — put a card from a zone OTHER than the graveyard
// directly onto the battlefield, skipping the casting process. Three
// sub-patterns: search/library (A), look-at-top (B), exiled card → battlefield
// (C). Distinct from effect.reanimate (graveyard → battlefield).
//
// Pattern A has a negative lookahead carving out basic-land and named-land-type
// searches (those are effect.tutors_basic_land / effect.ramp_nonland).
// Pattern B uses a [\s\S] filler to span sentence boundaries, BUT the rule's
// match() function applies a post-match filter to reject spans containing
// face-down / manifest-dread terms (those are effect.cloak).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.cheat_into_play',
  axis: 'effect',
  label: 'Cheat into play',
  description:
    'Puts a card from a zone OTHER than the graveyard directly onto the battlefield — skipping the casting process. Covers three sub-patterns: search library + put onto battlefield (Nature\'s Rhythm, Guardian Sunmare), look at top N + put onto battlefield (Break Out, Loot, Whiskervale Forerunner), and exiled card → battlefield (Throne of the Grim Captain, Ghost Vacuum, Anzrag\'s Rampage). Distinct from `effect.reanimate` which is strictly graveyard → battlefield.',
  pairsWith: ['condition.cares_exile_pile'],
};

// Pattern A: search library + put onto battlefield.
// Negative lookahead excludes basic-land and named-land-type searches
// (handled by effect.tutors_basic_land / effect.ramp_nonland).
const SEARCH_PUT =
  /\bsearch your library for (?!a basic\b|an? (?:plains|island|swamp|mountain|forest|cave|desert|gate|town|sphere|locus|lair)\b)[^.]{0,150}\bput (?:it|them|that card|those cards) onto the battlefield\b/;

// Pattern B: look at top + put onto battlefield. [\s\S]{0,300} allows
// spanning sentence boundaries (Break Out is 3 sentences). Face-down /
// cloak spans are rejected by the post-match filter in match().
const LOOK_PUT =
  /\blook at the top \w+ cards? of your library\b[\s\S]{0,300}\bput (?:it|them|that card|those cards) onto the battlefield\b/;

// Pattern C: exiled cards → battlefield. Anchors on the
// "exiled cards"/"cards exiled"/"exiled creature card" reference.
const EXILED_PUT =
  /\b(?:exiled cards?|cards? exiled (?:this way|with [\w\s'—]+)|exiled creature cards?)[^.]{0,80}\bonto the battlefield\b/;

const PATTERNS: ReadonlyArray<RegExp> = [SEARCH_PUT, LOOK_PUT, EXILED_PUT];

// Post-match filter: any of these substrings inside the matched span
// indicate this is effect.cloak territory (face-down creation), not
// cheat_into_play.
const FACE_DOWN_SUBSTRINGS = ['face down', 'face-down', 'manifest dread', 'cloak '];

export const rule: Rule = {
  id: 'effect.cheat_into_play',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (!m) continue;
      const span = m[0];
      if (FACE_DOWN_SUBSTRINGS.some((s) => span.includes(s))) continue;
      return { evidence: span };
    }
    return false;
  },
  nearMiss: {
    anchors: ['onto the battlefield'],
    proximity: ['search your library', 'look at the top', 'exiled card', 'exiled creature'],
    window: 6,
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/effect.cheat_into_play.test.ts`
Expected: PASS, 14 tests passing (6 positives + 8 negatives).

- [ ] **Step 5: Commit**

```bash
cd /Users/Dada/mtg-graph && git add pipeline/rules/effect.cheat_into_play.ts pipeline/rules/effect.cheat_into_play.test.ts && git commit -m "$(cat <<'EOF'
feat(rules): add effect.cheat_into_play

Puts a card from a non-graveyard zone directly onto the battlefield —
skipping the casting process. Three sub-patterns: search library + put
onto battlefield (Pattern A), look-at-top + put (Pattern B with
cross-sentence span), and exiled card → battlefield (Pattern C).

Negative lookahead in Pattern A excludes basic-land + named-land-type
searches. Rule-level post-match filter rejects face-down / manifest-dread
spans (those are effect.cloak).

Pairs with condition.cares_exile_pile (sub-pattern C feeds the exile
pile carer).

Expected coverage: 14 cards.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `effect.cast_from_library_top` rule + tests (TDD)

The Future Sight–style top-of-library cast/play permission. Text-only `match` shape with two regex alternations.

**Files:**
- Create: `pipeline/rules/effect.cast_from_library_top.test.ts`
- Create: `pipeline/rules/effect.cast_from_library_top.ts`

- [ ] **Step 1: Write the failing test**

Create `/Users/Dada/mtg-graph/pipeline/rules/effect.cast_from_library_top.test.ts` with these exact contents:

```ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.cast_from_library_top';

describe('effect.cast_from_library_top', () => {
  it.each([
    // Assemble the Players
    ['you may cast a creature spell with power 2 or less from the top of your library.'],
    // Case of the Locked Hothouse
    ['you may play lands and cast creature and enchantment spells from the top of your library.'],
    // Generic Future Sight frame
    ['you may cast spells from the top of your library.'],
    // Vivien Champion style
    ['you may cast creature spells from the top of your library.'],
    // "play <thing> from the top" frame
    ['you may play the top card of your library if it\'s a land card.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Different zone — cast-from-graveyard is a different mechanic
    ['cast this card from your graveyard.'],
    // Reveal alone, no cast permission
    ['reveal the top card of your library. add one mana of any of its colors.'],
    // Impulse draw — exiles first, then "play that card this turn" — different axis
    ['exile the top three cards of your library. choose one of them. you may play that card this turn.'],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/effect.cast_from_library_top.test.ts`
Expected: FAIL with module resolution error.

- [ ] **Step 3: Write the minimal implementation**

Create `/Users/Dada/mtg-graph/pipeline/rules/effect.cast_from_library_top.ts` with these exact contents:

```ts
// pipeline/rules/effect.cast_from_library_top.ts
//
// Grants permission to cast or play cards from the top of your library —
// the Future Sight / Vivien Champion / Garruk's Horde family. Distinct
// from Cascade and Discover (which exile-then-cast at resolution, not as
// a persistent permission).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.cast_from_library_top',
  axis: 'effect',
  label: 'Cast from library top',
  description:
    'Grants permission to cast or play cards from the top of your library (Future Sight / Vivien Champion / Garruk\'s Horde family). Covers `cast/play <thing> from the top of your library` permission frames. Distinct from Cascade and Discover (which exile-then-cast as part of resolution, already covered by their own axes).',
  pairsWith: [],
};

// Pattern 1: canonical license — "may cast/play <thing> from the top of your library"
const MAY_CAST_FROM_TOP =
  /\bmay (?:cast|play) (?:[\w\s,]+? )?from the top of your library\b/;

// Pattern 2: "may play the top card of your library" frame (Oracle of Mul Daya,
// land-only top-of-library plays).
const MAY_PLAY_TOP_CARD =
  /\bmay play the top card of (?:your|their) library\b/;

const PATTERNS: ReadonlyArray<RegExp> = [MAY_CAST_FROM_TOP, MAY_PLAY_TOP_CARD];

export const rule: Rule = {
  id: 'effect.cast_from_library_top',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: {
    anchors: ['from the top of your library', 'top card of your library'],
    proximity: ['may cast', 'may play'],
    window: 6,
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/rules/effect.cast_from_library_top.test.ts`
Expected: PASS, 10 tests passing (5 positives + 5 negatives).

- [ ] **Step 5: Commit**

```bash
cd /Users/Dada/mtg-graph && git add pipeline/rules/effect.cast_from_library_top.ts pipeline/rules/effect.cast_from_library_top.test.ts && git commit -m "$(cat <<'EOF'
feat(rules): add effect.cast_from_library_top

Grants permission to cast or play cards from the top of your library —
Future Sight / Vivien Champion / Garruk's Horde family. Two
alternations: "may cast/play <thing> from the top of your library"
(canonical license) and "may play the top card of your library"
(land-only top-of-library plays).

Distinct from Cascade and Discover (resolution-time, not persistent
permission). Distinct from effect.impulse_draw (exile-then-play with
duration, already its own axis).

Expected coverage: 11 cards.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Register both new tags in `tagFamilies.ts`

`app/src/lib/tagFamilies.ts` requires every catalog tag to be explicitly registered (enforced by `pipeline/tagFamilies-consistency.test.ts`). Both tags go under `themes` (siblings to `effect.reanimate`, the canonical "reanimator" archetype tag).

**Files:**
- Modify: `app/src/lib/tagFamilies.ts` — add two entries under `themes`

- [ ] **Step 1: Verify insertion anchor**

Run: `grep -n "'effect.adventure_card'\|'effect.reanimate'" /Users/Dada/mtg-graph/app/src/lib/tagFamilies.ts`
Expected: shows two lines, with `effect.adventure_card` immediately above `effect.reanimate`. Both should be mapped to `'themes'`.

- [ ] **Step 2: Insert both new entries between `effect.adventure_card` and `effect.reanimate`**

Alphabetical positions: `effect.cast_from_library_top` (c-a-s < c-h-e) goes first, then `effect.cheat_into_play`. Both fit between adventure_card and reanimate.

Use the Edit tool on `/Users/Dada/mtg-graph/app/src/lib/tagFamilies.ts`:

`old_string`:

```
  'effect.adventure_card': 'themes',
  'effect.reanimate': 'themes',
```

`new_string`:

```
  'effect.adventure_card': 'themes',
  'effect.cast_from_library_top': 'themes',
  'effect.cheat_into_play': 'themes',
  'effect.reanimate': 'themes',
```

- [ ] **Step 3: Verify both entries are present**

Run: `grep -n "cheat_into_play\|cast_from_library_top" /Users/Dada/mtg-graph/app/src/lib/tagFamilies.ts`
Expected: shows two matching lines, both mapped to `'themes'`.

- [ ] **Step 4: Run the tagFamilies consistency test**

Run: `cd /Users/Dada/mtg-graph && npx vitest run pipeline/tagFamilies-consistency.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/Dada/mtg-graph && git add app/src/lib/tagFamilies.ts && git commit -m "$(cat <<'EOF'
feat(app): register cheat-into-play family tags in tagFamilies

Adds effect.cheat_into_play and effect.cast_from_library_top to the
themes family (siblings to effect.reanimate). Required for the
tagFamilies-consistency test gate.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Full gate + artifact rebuild + verify match counts

End-to-end check: catalog validation, app build, artifact rebuild, rule-coverage CLI to confirm expected match counts (~14 / ~11).

**Files:** none modified by you. The artifact regen writes `app/public/data/cards-standard.json` (gitignored — no commit).

- [ ] **Step 1: Run the full test gate**

Run from repo root: `cd /Users/Dada/mtg-graph && npm test`
Expected: ALL tests pass, including the two new rule test files, `pipeline/catalog.test.ts` (pairings + axis-cross), `pipeline/tagFamilies-consistency.test.ts`, the app vitest suite, and the app `npm run build` (tsc + vite).

If anything fails, STOP and report BLOCKED with the exact failure.

- [ ] **Step 2: Rebuild the standard artifact**

Run: `cd /Users/Dada/mtg-graph && npm run build:cards -- --standard`
Expected: writes `app/public/data/cards-standard.json` (~4,446 cards), no errors.

- [ ] **Step 3: Verify per-tag match counts via rule:coverage**

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- effect.cheat_into_play`
Expected: **between 12 and 18 matches** (target ~14). Sample names should include: Nature's Rhythm, Transmutation Font, Guardian Sunmare, Repurposing Bay, Honored Knight-Captain (Pattern A); Break Out, Loot Exuberant Explorer, Whiskervale Forerunner (Pattern B); Throne of the Grim Captain, Ghost Vacuum, Anzrag's Rampage, The Darkness Crystal, Sothera the Supervoid (Pattern C).

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- effect.cast_from_library_top`
Expected: **between 9 and 14 matches** (target ~11). Sample names should include: Johann Apprentice Sorcerer, Assemble the Players, Case of the Locked Hothouse, Glarb Calamity's Augur, Vizier of the Menagerie, Traveling Chocobo.

Record each actual count.

- [ ] **Step 4: Spot-check representative cards**

Run each and verify the named tag is present:
- `cd /Users/Dada/mtg-graph && node /Users/Dada/.claude/skills/mtg-graph-card-tag-audit/card_lookup.mjs "Break Out"` — expect `effect.cheat_into_play`
- `cd /Users/Dada/mtg-graph && node /Users/Dada/.claude/skills/mtg-graph-card-tag-audit/card_lookup.mjs "Throne of the Grim Captain // The Grim Captain"` — expect `effect.cheat_into_play` on at least one face
- `cd /Users/Dada/mtg-graph && node /Users/Dada/.claude/skills/mtg-graph-card-tag-audit/card_lookup.mjs "Assemble the Players"` — expect `effect.cast_from_library_top`
- `cd /Users/Dada/mtg-graph && node /Users/Dada/.claude/skills/mtg-graph-card-tag-audit/card_lookup.mjs "Hide in Plain Sight"` — must NOT have `effect.cheat_into_play` (face-down filter excludes it). Should have `effect.cloak`.
- `cd /Users/Dada/mtg-graph && node /Users/Dada/.claude/skills/mtg-graph-card-tag-audit/card_lookup.mjs "Glimpse the Core"` — must NOT have `effect.cheat_into_play` (basic-land search excluded).

- [ ] **Step 5: Verify pairsWith integrity**

Run: `cd /Users/Dada/mtg-graph && npm run rule:coverage -- --pairings`
Expected: PASS (no "unknown tag id" errors).

- [ ] **Step 6: Confirm no artifact commit needed**

Run: `cd /Users/Dada/mtg-graph && git check-ignore app/public/data/cards-standard.json && echo gitignored-confirmed`
Expected: shows the path then `gitignored-confirmed`. NO commit.

**Report format (final reply):**
- `DONE` + summary: full `npm test` result, 2 coverage counts, spot-check results, --pairings result, OR
- `BLOCKED` + diagnosis.

Under 200 words.

---

## Task 6: Clean up CARD_ISSUES.md

Per the audit skill convention, drop the issue entries / bullets whose coverage gap has been shipped. For this family, that's:

1. **Break Out entry** — had `missing: effect.cheat_into_play (known persistent gap)` bullet. Likely the entire entry, but verify other bullets first.
2. **Anzrag's Rampage entry** — had `missing (deferred): effect.cheat_into_play` bullet (in a multi-bullet entry). Remove the cheat_into_play bullet, keep the rest.
3. **Assemble the Players entry** — had `missing: effect.cast_from_library_top` family-level bullet (probably the only bullet — remove the whole entry).
4. **Round 4 audit Tier 3 Item U** — the canonical multi-card reference to cheat_into_play / cast_from_graveyard_license gap. Remove the Item U bullet from the Tier 3 section (it's about cheat_into_play, which is now shipped; the cast-from-graveyard-license half is still a gap, so retitle / split the bullet to keep only the gap that remains).
5. **Tier 1 / Tier 2 / Tier 3 action plan references** — search for any other lines mentioning cheat_into_play / cast_from_library_top and remove or update.

**Files:**
- Modify: `/Users/Dada/mtg-graph/CARD_ISSUES.md`

- [ ] **Step 1: Pre-check entries exist**

Run: `cd /Users/Dada/mtg-graph && grep -nE "^## (Break Out|Anzrag.s Rampage|Assemble the Players)" CARD_ISSUES.md`
Expected: 3 matches (one per entry).

If `0` or fewer than expected, the file structure has drifted — STOP and report what you found.

- [ ] **Step 2: Read each entry in full**

Run for each:
```bash
cd /Users/Dada/mtg-graph && sed -n '/^## Break Out  /,/^## [^B]/p' CARD_ISSUES.md
cd /Users/Dada/mtg-graph && sed -n "/^## Anzrag.s Rampage/,/^## [^A]/p" CARD_ISSUES.md
cd /Users/Dada/mtg-graph && sed -n '/^## Assemble the Players/,/^## [^A]/p' CARD_ISSUES.md
```

This shows you the exact contents to use as `old_string` for the Edit operations.

- [ ] **Step 3: Edit each entry**

For each entry:
- If the cheat_into_play / cast_from_library_top bullet is the ONLY bullet → delete the entire entry block including its trailing `---` separator. The `new_string` is empty (`""`).
- If the entry has OTHER bullets (like Anzrag's Rampage which has bounce_creature + beginning_of_end_step + cares_artifacts + cheat_into_play) → remove only the cheat_into_play bullet. The `new_string` is the full entry minus that one bullet.

Use the Edit tool. Each Edit must have a UNIQUE `old_string` — include enough surrounding context if there's ambiguity.

- [ ] **Step 4: Clean up the Round 4 Tier 3 Item U reference**

Run: `cd /Users/Dada/mtg-graph && grep -n "Item U\|U\. " CARD_ISSUES.md`

Find the Tier 3 section's "Item U" bullet about `effect.cheat_into_play`. Edit it to either:
- DELETE the entire item if it's only about cheat_into_play (now shipped).
- TRIM it to mention only the still-unresolved `cast_from_graveyard_license` half if the bullet covers both gaps.

Read the bullet content first to determine the right action.

- [ ] **Step 5: Verify deletions**

Run: `cd /Users/Dada/mtg-graph && grep -c "^## Break Out\|^## Assemble the Players" CARD_ISSUES.md`
Expected: `0` if both entries were fully removed (likely both were single-bullet entries).

Run: `cd /Users/Dada/mtg-graph && grep -ni "cheat_into_play\|cast_from_library_top" CARD_ISSUES.md`
Expected: `0` results (or only inside oracle-text code blocks, which is fine — they're literal card text, not bullet references).

- [ ] **Step 6: Confirm CARD_ISSUES.md is still well-formed**

Run: `cd /Users/Dada/mtg-graph && grep -E "^---$" CARD_ISSUES.md | wc -l`
Expected: about the same number as before (separators between remaining entries). No back-to-back `---\n---\n`.

Run: `cd /Users/Dada/mtg-graph && head -50 CARD_ISSUES.md`
Visually inspect for broken heading hierarchy.

- [ ] **Step 7: Commit**

```bash
cd /Users/Dada/mtg-graph && git add CARD_ISSUES.md && git commit -m "$(cat <<'EOF'
chore(audit): resolve cheat-into-play / cast-from-library-top entries

Cheat-into-play family shipped in v0.14.5 (effect.cheat_into_play,
effect.cast_from_library_top). Removed:
- Break Out entry (cheat_into_play single-bullet)
- Anzrag's Rampage cheat_into_play bullet (kept other bullets)
- Assemble the Players entry (cast_from_library_top single-bullet)
- Round 4 Tier 3 Item U reference to cheat_into_play

Cast-from-graveyard license (Tarrian's Journal-style) remains an
unresolved future-work gap and is preserved in the audit notes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review checklist (executor-facing)

Before considering the plan complete, the executor should confirm:

- [ ] Two new rule files exist under `pipeline/rules/` and each exports BOTH `tagDef` and `rule`.
- [ ] Two colocated `.test.ts` files exist with at least 3 positives + 3 negatives each.
- [ ] `effect.cheat_into_play` uses the multi-pattern array shape with a post-match face-down filter.
- [ ] `effect.cast_from_library_top` uses the multi-pattern array shape (2 patterns).
- [ ] `shared/version.ts` is at `v0.14.5`.
- [ ] `app/src/lib/tagFamilies.ts` has both new entries under `themes`.
- [ ] `npm test` (root) passes — pipeline tests, app tests, app build.
- [ ] `npm run rule:coverage -- effect.cheat_into_play` reports 12–18.
- [ ] `npm run rule:coverage -- effect.cast_from_library_top` reports 9–14.
- [ ] `npm run rule:coverage -- --pairings` passes.
- [ ] Break Out has `effect.cheat_into_play`.
- [ ] Assemble the Players has `effect.cast_from_library_top`.
- [ ] Hide in Plain Sight does NOT have `effect.cheat_into_play` (face-down filter works).
- [ ] Glimpse the Core does NOT have `effect.cheat_into_play` (basic-land carve-out works).
- [ ] `CARD_ISSUES.md` no longer contains `## Break Out` or `## Assemble the Players` headings, nor bullet references to `effect.cheat_into_play` or `effect.cast_from_library_top`.
- [ ] Six commits on `main`: version bump, two rule commits, tagFamilies registration, CARD_ISSUES cleanup. (No artifact commit — gitignored. Task 5 is verification-only with no commit.)
