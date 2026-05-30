# Subagent communication — fix-strategy discussion (batch 2026-05-26)

**Goal:** Read `CARD_ISSUES.md` and converge on a concrete, prioritized fix plan. Three agents (A, B, C) iterate up to 5 rounds.

**Rules:**
- Each round, every agent reads CARD_ISSUES.md and every prior section of this file, then appends to their own section for that round.
- After the round, the orchestrator checks for convergence: if all three explicitly sign off on the same plan, the discussion ends.
- The plan should be **the right fix, not the cheapest** — but should also be **achievable** in one PR cycle.
- Plan must call out: priority order, which fixes share root cause (bundle them), which need new rules vs rule narrowings, which are out of scope.
- Don't litigate every CARD_ISSUES entry in writing. Group by mechanic family / cluster.
- Agents disagree by **stating the disagreement explicitly** and proposing an alternative.

**Final output format** (when agents agree): a single `## AGREED PLAN` section at the bottom listing ordered work items, each tagged `[narrow]` (precision fix to existing rule), `[new-rule]` (add a new tag), or `[skip/defer]` (out of scope for this round). Each item should name the rule file(s) touched and the cards it benefits.

**Context:**
- CARD_ISSUES.md was just refreshed by a 5-agent audit of 125 cards (49 with issues, organized into 5 family clusters + a coverage-gap meta section).
- Previous batch's discussion archived at `.SUBAGENT_COMMUNICATION.prev.md` for reference (the AGREED PLAN there already shipped — don't replay it).

---

## Round 1

### Agent A (Round 1)

**Perspective:** Systemic leverage. The 40-card punch list resolves to a small number of regex-pattern bugs each affecting a *cluster* of cards. Prefer one shared fix per cluster over per-card narrowings. Two clusters (self-ETB leak, edict-leak) account for ~12 of the 40 entries. The Craft/exile-pile cluster is another 4 cards via one regex broadening. That's a dense PR; everything else is the long tail.

## P0 — Self-ETB leak on `trigger.another_creature_etb` (1 regex, 4+ cards immediate, family-wide)

**Root cause:** `whenever (?:a |another |one or more (?:nontoken )?)?(?:[\w\-]+ ){0,3}creatures?` — the determiner alternation is *optional*, and `[\w\-]+` accepts "this" as an adjective. So "Whenever this creature enters" matches the another-creature-ETB regex as well as the (correct) self-ETB rule. Cards in batch: Queen's Bay Paladin, Sentinel of the Nameless City, Threefold Thunderhulk, Visage of Dread back face. Plausibly also Market Gnome, Palani's Hatcher, and most of Bloomburrow's Impending-cycle DFCs that we'd find on a re-audit.
**File:** `pipeline/rules/trigger.another_creature_etb.ts` line 22.
**Fix [narrow]:** Add a negative lookbehind / lookahead for the `this ` / `__self__` adjective in the pre-noun slot — explicitly require `(?:a |another |one or more )` to anchor the determiner (drop the optional outer `?`), OR add `(?!this\s|__self__\s)` before the `[\w\-]+` filler. The tribal arm on line 31 already correctly requires `another`, so the second arm needs no change.
**Impact:** 4 cards in batch, almost certainly 10–20+ on next audit (every "Whenever this creature enters or attacks" card).

## P1 — Edict / aristocrats-trigger leak on the typed-sacrifice family (6 files, shared fix, 7 false tags cured)

**Root cause:** `effect.sacrifice_<type>.ts` files have PATTERN_OWN and PATTERN_BROAD that admit `each\s+` in the determiner alternation and have no trigger-frame exclusion. Two distinct leaks share the same root:
1. **Edict leak:** "each opponent sacrifices a <type>" fires the controller-side typed-sac tags (Throne of the Grim Captain: 4 wrong tags; Tithing Blade: 1 wrong tag).
2. **Aristocrats-trigger leak:** "whenever you sacrifice another permanent" fires all 6 typed/general sac tags on Vito, Fanatic of Aclazotz (6 wrong tags — the card observes sacrifices, doesn't cause them).

**Files:** all 6 `pipeline/rules/effect.sacrifice_{artifact,creature,enchantment,land,permanent,planeswalker}.ts`.
**Fix [narrow], shared shape:** I push for **one shared helper** (`pipeline/rules/_sacrifice_subject.ts` or inline constant exported from `effect.sacrifice_permanent.ts`) that exposes two negative-context predicates:
- `NEGATIVE_EDICT = /(?:each|target|an?)\s+opponent\s+sacrifices?/` — guard match against this preceding the verb.
- `NEGATIVE_TRIGGER = /\bwhenever\s+(?:you\s+)?sacrifice|when(?:ever)?\s+a\s+permanent\s+[^.]*?\bis\s+sacrificed\b/` — exclude the observing-trigger frames.

Then each of the 6 files imports both and rejects matches whose `m.index` falls inside a trigger/edict span (compute once per text). **I expect B to push for 6 inline copies** to avoid coupling — I'll fight for the helper because the shape is *literally identical* across all six files and we already know they'll all need it. The "one bug becomes six" risk is lower than for `grants_*` (B's prior caution) because the *bad context* is shared while each file's positive pattern stays its own. Concession path: ship as inline duplicate first, refactor to helper in a follow-up if B insists.

**Impact:** 11 false tags cured across 3 cards in batch. Class is "every modern aristocrats payoff + every edict + every Craft back face with an opponent-edict trigger" — easily 20+ cards on rebuild.

## P2 — Manland self-animation leak on `effect.grants_evasion` and `condition.cares_deathtouch` (shared root, 4 cards cured)

**Root cause:** Manland animation clauses ("this land becomes a 2/3 [color] [tribe] creature with flying/menace/deathtouch") slip past both rules because:
- `effect.grants_evasion` Pattern[2] `becomes? a [^.]{0,40}\b(?:flying|menace|intimidate)\b` doesn't distinguish self-animation from anthem/token-grant.
- `condition.cares_deathtouch` Pattern matches "creature with deathtouch" anywhere — including the same animation clause.

Cards in batch: Restless Anchorage (grants_evasion flying FP), Restless Vents (grants_evasion menace FP), Restless Reef (cares_deathtouch FP), plus Vito's Inquisitor (separate "it gains menace" anaphoric self-pump).

**Files:** `pipeline/rules/effect.grants_evasion.ts`, `pipeline/rules/condition.cares_deathtouch.ts`.
**Fix [narrow]:** Apply a `stripFraming` pre-pass that masks the `becomes a [...] creature with <kw>` clause before scanning — same approach `condition.cares_tribe` already uses. For `grants_evasion` Pattern[2] specifically, narrow to require a subject token (`token` / `another` / `target` / `each other creature`) immediately before the `becomes` arm, so self-animation lands and Vehicle crew clauses are excluded.

For Vito's Inquisitor (anaphoric "it gains menace" referring to __SELF__): extend the Pattern[1] lookbehind to also block " it " when the preceding clause's subject is __SELF__. Pragmatic implementation: add `(?<!\bit )` to the existing lookbehind chain, then accept that this also blocks legitimate "target creature gets X. It gains menace." pump spells — those should fire via the "target creature ... gains" sentence anyway. Borderline; flag for B/C input.

**Impact:** 4 cards in batch. Whole Restless manland cycle + all Vehicle/Equipment animations that grant a keyword to themselves. ~15 cards on rebuild.

## P3 — Craft / exile-pile pattern broadening (1 file, 4 cards cured)

**Root cause:** `condition.cares_exile_pile` Pattern[2] only matches `exiled with __self__` / `exiled with this <type>`. Modern Craft cards use 3 additional shapes none of which match:
- Possessive anaphor: "the exiled cards' colors" (Pit of Offerings)
- "exiled cards used to craft (it|this <type>)" (Sunbird Effigy, Enigma Jewel)
- "cast a spell from exile" + "each card exiled this way" (Quintorius Kand)

**File:** `pipeline/rules/condition.cares_exile_pile.ts`.
**Fix [narrow]:** Add patterns 4, 5, 6:
- `/\bthe exiled cards'? (?:colors?|types?|mana values?|names?)\b/`
- `/\bexiled cards? used to craft (?:it|this (?:creature|artifact|enchantment|land|permanent))\b/`
- `/\bcast (?:a |target )?[\w\s]*?spell from exile\b/` and `/\beach card exiled this way\b/`

**Impact:** 4 cards in batch (Pit of Offerings, Quintorius Kand, Sunbird Effigy, Enigma Jewel). Entire Craft-pile axis becomes representable. Note `pairsWith: ['effect.exile_from_library']` already exists, so no orphan-edge concern.

## P4 — `cares_artifacts` disjunction / "as long as" broadening (1 file, 4 cards cured)

**Root cause:** `condition.cares_artifacts` Pattern 6 handles "if an artifact entered" but not the three modern Craft/Pirate variants:
- "as long as an artifact entered the battlefield under your control this turn" (Shipwreck Sentry)
- "if this artifact or another artifact entered" (Master's Manufactory)
- Tap-disjunction: "tap two untapped artifacts and/or creatures you control" (Sunshot Militia) — "you control" qualifies "creatures", not "artifacts"
- Reveal-disjunction: "an artifact or Pirate card" (Staunch Crewmate)

**File:** `pipeline/rules/condition.cares_artifacts.ts`.
**Fix [narrow]:** Patch Pattern 6 to accept `as long as` lead-in and `this <type> or another <type>` subject. Patch Pattern 3 to admit disjunctive "you control" qualifier: `\bartifacts? (?:and/or [\w\s]+? |or [\w\s]+? )?you control\b`. Add new pattern for disjunctive dig filters: `\b(?:an? |target )?artifact or [\w\-]+ card\b`.

**Impact:** 4 cards in batch. Plus probably most LCI Map/Pirate dig cards and OTJ "tap N untapped artifacts/creatures" outlaws.

## P5 — Long tail of single-card-immediate narrowings (group these into one PR)

These each have a small surface area but high signal-per-touch:

| File | Fix | Cards cured |
|---|---|---|
| `effect.untap.ts` | Exclude `whenever you untap ...` trigger frame; consider documenting `untap this creature during X` as in-scope (vigilance-style) or not | Millennium Calendar, Thousand Moons Infantry |
| `effect.life_changed.ts` | Relax `\d+ life` to `[\d,]+ life` to accept "1,000 life" | Millennium Calendar |
| `effect.destroy_{artifact,enchantment}.ts` | PATTERN_BROAD filler `(?:[\w\-]+\s+){0,5}?` → `(?:[\w\-]+[,\s]+){0,5}?` to cross commas in "noncreature, nonland permanent" | Molten Collapse (2 missing tags) |
| `effect.exile_{artifact}.ts` | Add Vehicle synonym arm — Vehicle is always an artifact per CR 205.3g | Ray of Ruin |
| `effect.look_at_top_n.ts` | Add `reveal (?:that many\|N) cards from the top of [\w\s']+ library` | Ojer Kaslem |
| `condition.cares_noncreature_spell.ts` | Add `whenever ... cast (?:a|an|another) (?:instant\|sorcery) spell` (single-subtype noncreature triggers) | Ojer Pakpatiq |
| `condition.cares_tokens.ts` | Add replacement-effect frame `if (?:a\|one or more) [\w\s]+? tokens? would be created` | Ojer Taq |
| `condition.descend.ts` | Add `(?:number of times\|each time) you descended this turn` | The Mycotyrant |
| `trigger.creature_dies.ts` | Allow plural subject `(?:creatures\|__self__).*\s+(?:die\|dies)` | The Skullspore Nexus |
| `condition.cares_high_power.ts` | Accept `is the greatest power` (not only `with the greatest power`) | The Skullspore Nexus |
| `effect.mill.ts` | Accept variable-N `mills cards equal to` | The Ancient One |
| `effect.tuck_to_library.ts` | Frame A2 with possessive `target X's owner puts it` | Unlucky Drop |
| `effect.animate_land.ts` | Add anaphoric "It becomes" after target-land anchor | Tendril of the Mycotyrant |
| `trigger.creature_leaves_battlefield.ts` | Add `is exiled from the battlefield` to LTB_VERB (Craft LTB-exile) | Market Gnome |
| `effect.reanimate.ts` | Add reversed-order pattern `return to battlefield ... card ... from graveyard` | Squirming Emergence |
| `effect.explore.ts` | Exclude bare `whenever ... explores` trigger frame; require imperative subject | Merfolk Cave-Diver, Nicanzil |
| `effect.counterspell.ts` | Narrow to `\bspell\b`; tag now lies (matches abilities). Triggers `effect.stifle` decision — see Open Questions. | Tishana's Tidebinder |
| `effect.pacify.ts` | Accept `permanents?` in subject alternation (alongside `creatures`) | Petrify |

**Impact:** ~18 single-file edits curing ~22 issues in batch. Each is well-scoped TDD.

## New-rule recommendations (gated on consumer pairsWith)

Applying last round's discipline (no orphan tags):

- **`trigger.upkeep`** [new-rule, ship] — Multiple batch cards (Everflowing Well, Tithing Blade, Millennium Calendar implicitly). Pairs with `condition.descend` (which it already exists alongside in many cards), with `effect.life_changed`, with `condition.cares_graveyard`. Real consumer surface. Mirror `trigger.beginning_of_combat` / `trigger.beginning_of_end_step` shape exactly.
- **`trigger.landfall`** [new-rule, ship] — "When a land you control enters." Pairs with `effect.ramp_nonland`, `condition.cares_lands`, `effect.create_creature_token`. Twists and Turns + class. Real consumer surface.
- **`condition.cares_low_power`** [new-rule, ship] — Symmetric to existing `condition.cares_high_power`. Unstable Glyphbridge in batch; class is "creature with power 2 or less" payoffs (recurring in MKM/DSK white). Pairs with `effect.grants_stat_buff` (anthem-style buff to small creatures).
- **`effect.ramp_nonland` broadening** [narrow, ship] — Add "put a land card from your hand onto the battlefield" pattern. Spelunking + Nicanzil. Not a new tag; existing rule broadens.
- **`effect.stifle` vs narrowing `counterspell`** [defer, gated on second card] — Only Tishana's Tidebinder surfaces this. Narrow `counterspell` to spell-only now (cures the FP); defer the sibling tag until a second card appears.
- **`condition.cares_counters` (non +1/+1)** [defer] — Single batch card (Millennium Calendar's time counters). Class is real but author after second card surfaces.
- **`effect.exile_from_hand`** [defer, narrow alternative] — Skullcap Snail. Broadening `targeted_discard` to admit "exiles a card from their hand" is the lighter touch — defer the dedicated tag.
- **`effect.has_defender`** [defer] — Low pairing value in Standard. Single card (Shipwreck Sentry). Wait.
- **`effect.cheat_into_play`** [defer] — Already deferred in v0.14 plan. Throne of the Grim Captain restates the case; still defer.

## Defer list (one-line reasons)

- **Tarrian's Journal cast-from-graveyard effect:** Borderline coverage gap; single card; either broaden `condition.cast_from_graveyard` or wait. Defer until a second card surfaces.
- **The Everflowing Well clone_in_place:** Verify the existing `effect.clone_in_place` (added in last batch's v0.14) fires; if not, debug — but don't reopen the split.
- **Throne of the Grim Captain `effect.exile_from_graveyard` from Craft reminder text:** Reminder text is stripped; not an issue. Mark the audit entry resolved.
- **Per-card pronoun-self quirks (Millennium Calendar "sacrifice it" on artifact):** Single-card edge; the rule already handles `__SELF__`. Add the pronoun-anaphor case only if a second card surfaces.

## Open questions for B and C

1. **Shared `_sacrifice_subject.ts` helper vs 6 inline copies (P1)?** I want the helper because the negative-context predicate is *literally identical*. B's prior caution about `grants_*` helpers was about *positive* shape variance; sacrifice-context-exclusion is a single shared constant. Push back?
2. **`effect.grants_evasion` Pattern[1] lookbehind extension to block bare `it`:** Risks blocking legitimate target-creature pump ("target creature ... it gains menace"). Acceptable cost, or do we need sentence-scoped anaphor resolution (out of scope)?
3. **`effect.counterspell` narrow now vs author `effect.stifle` now:** Tishana is the only card. I lean narrow-now, defer-stifle; expect B to push for proper split. Test the "two-card rule" — do we have a second stifle card we know of?
4. **`condition.cares_deathtouch` stripFraming approach:** Lift the helper from `condition.cares_tribe` into a shared `_stripFraming.ts`, or copy inline? Same question as Q1, smaller scope (2 files: cares_deathtouch + grants_evasion).

**I can sign off on a plan: not yet — awaiting B and C's Round 1.**

### Agent C (Round 1)

**Perspective:** Verify the regex before agreeing the fix is right. I opened five of the cluster rules and grep-confirmed each audit diagnosis below; I flag one borderline misdiagnosis and push back on two of A's expansions. Scope discipline is non-negotiable: every narrowing rides a coverage-delta gate, and new tags ship only if a pairsWith consumer already exists.

#### Verified findings (regex quoted, audit confirmed)

1. **`trigger.another_creature_etb` self-leak — CONFIRMED.** `pipeline/rules/trigger.another_creature_etb.ts:22` reads:
   ```
   whenever (?:a |another |one or more (?:nontoken )?)?(?:[\w\-]+ ){0,3}creatures?(?:\s+\w+){0,3}\s+enters?
   ```
   Outer determiner group is optional. "this " slots into `(?:[\w\-]+ ){0,3}` as a single word-token. All four batch cards (Queen's Bay Paladin, Sentinel of the Nameless City, Threefold Thunderhulk, Visage of Dread back face) fire it. A's diagnosis is right; the fix is `(?!this\s)` ahead of the filler or, cleaner, make the determiner group mandatory by removing the trailing `?`. **I prefer the latter** — explicit determiner required, leaves the tribal arm at line 31 untouched. The "Whenever creatures you control enter" frame (no determiner) is rare enough that requiring `a|another|one or more` doesn't introduce false negatives I've grep-confirmed.

2. **Typed-sacrifice edict + aristocrats-trigger leak — CONFIRMED.** `pipeline/rules/effect.sacrifice_creature.ts:17` PATTERN_OWN admits `each\s+` in the determiner alternation; `\w+\s+` admits "opponent " between "each" and "creature". Same shape across all 6 files. PATTERN_BROAD's `another\s+` arm catches Vito's "sacrifice another permanent". Audit and A both right.

3. **`effect.grants_evasion` manland leak — CONFIRMED.** `pipeline/rules/effect.grants_evasion.ts:34`:
   ```
   /\bbecomes? a [^.]{0,40}\b(?:flying|menace|intimidate)\b/
   ```
   Zero subject anchor. "this land becomes a 2/3 white and blue Bird creature with flying" matches trivially. Pattern[1]'s lookbehind only blocks "this <single-word-type>" / "__self__"; bare "it gains menace" (Vito's Inquisitor) walks past.

4. **`condition.cares_deathtouch` manland leak — CONFIRMED.** `pipeline/rules/condition.cares_deathtouch.ts:19` pattern is `\b(?:creatures? )?(?:you control )?with deathtouch\b`. "creature with deathtouch" matches inside Restless Reef's animation clause; no becomes-frame exclusion.

5. **`effect.counterspell` accepts abilities — CONFIRMED.** `effect.counterspell.ts:19` alternation is `(?:spell|ability)`. TagDef says "Counters a target spell on the stack". Mismatch is real for Tishana's Tidebinder.

6. **`effect.untap` "whenever you untap" leak — CONFIRMED.** `effect.untap.ts:21` filler `(?:[\w\-]+ ){0,3}` admits "one or more" (3 tokens) before "permanents". Millennium Calendar's trigger frame fires as effect. Thousand Moons Infantry: "untap this creature" matches via "this " in the same filler slot.

7. **`condition.cares_exile_pile` Craft-pile gap — CONFIRMED.** `cares_exile_pile.ts:25-34` has 3 patterns; none cover "the exiled cards' colors" (possessive), "exiled cards used to craft it" (Sunbird/Enigma Jewel shape), "cast a spell from exile" (Quintorius), or "each card exiled this way" (Quintorius -6). Four gap shapes, one rule file. A's P3 fix list is the right minimum.

8. **`effect.destroy_artifact/enchantment` PATTERN_BROAD comma gap — CONFIRMED.** `destroy_artifact.ts:15` PATTERN_OWN already uses `[\w\-]+[,\s]+` (admits commas), but PATTERN_BROAD on line 19 uses `[\w\-]+\s+` (no comma). Molten Collapse's "noncreature, nonland permanent" hits BROAD not OWN. Single-character class fix: `\s` → `[,\s]`.

9. **`trigger.creature_dies` plural-subject gap — CONFIRMED.** Pattern requires `(?:creature|__self__)` singular. "creatures … die" (Skullspore Nexus) does not match. Single-character fix: `creature` → `creatures?` and verb alternation `(?:dies|die)`.

10. **`effect.reanimate` reversed-order gap — CONFIRMED.** Pattern 1 requires `card → from graveyard → battlefield` order; Squirming Emergence is `battlefield → card → in graveyard`. Real miss, alternate pattern needed.

11. **`condition.descend` "number of times you descended" gap — CONFIRMED.** Three patterns; none match Mycotyrant's "X is the number of times you descended this turn".

12. **`condition.cares_artifacts` Pattern 6 — CONFIRMED.** Line 22: `(?:if|when) (?:an?|one or more) artifacts? .* entered`. Fails on "as long as" lead-in (Shipwreck Sentry), "this artifact or another artifact" disjunctive subject (Master's Manufactory). Pattern 3 `artifacts? you control` fails on Sunshot Militia because "you control" qualifies "creatures" in the disjunction.

#### Borderline / pushback on diagnoses

- **The Everflowing Well "becomes a copy of that spell":** Audit calls this a missing `effect.clone_in_place`. I read `effect.clone_in_place.ts:36` — BECOMES_COPY *intentionally* excludes "spell" from the copied-noun alternation; spell-copy belongs to `effect.copy_spell`. The card is a *permanent becoming a copy of a spell* (the spell-permanent's resolved-permanent shape). This is genuinely novel templating; not a regex bug. **I disagree with the audit's framing** — verify clone_in_place's exclusion was intentional (it was, per the v0.14 split rationale) and either (a) add a "becomes a copy of [...] spell" arm to clone_in_place that excludes the stack-copy case, or (b) defer as edge case. I lean **defer**; one-card surface.

- **`condition.cares_high_power` "is the greatest power":** Confirmed gap, but I push back gently on shipping the fix. The Skullspore Nexus phrasing is `X is the greatest power among creatures you control` — that's stat-buff scaling, the same family `with the greatest power` was designed to cover. Tiny edit, real coverage win. Concede to A and ship.

- **`effect.tuck_to_library` possessive form (Unlucky Drop):** Confirmed gap (Frame A requires "owner of target X" not "target X's owner"). One card. Add Frame A2; trivial, ship.

#### Minimum-edit list (my opening position)

Group by PR cycle. Items 1–4 share the precision-PR; items 5–7 share the coverage-PR. The grants/sacrifice family fixes need a coverage gate.

**Precision PR (v0.13.5):**
1. **[narrow]** `trigger.another_creature_etb.ts` — drop trailing `?` on outer determiner group (require `a|another|one or more`). 4 cards in batch; plausibly 15+ on re-audit. Coverage gate: `npm run rule:coverage -- trigger.another_creature_etb` before/after, expect *drop* equal to self-ETB card count, no other regression.
2. **[narrow]** All 6 `effect.sacrifice_*.ts` — exclude edict + observer-trigger contexts. **I disagree with A's shared helper proposal — see Open Questions Q1.** Inline the two negative-context predicates in each of the 6 files; same constant, copy-pasted; refactor only if a 7th file needs it. 11 false tags cured in batch. Coverage gate: per-file before/after; expect drops of ~5–15% per file (aristocrats observers are common); investigate if any file drops >20%.
3. **[narrow]** `effect.grants_evasion.ts` + `condition.cares_deathtouch.ts` — both gain a `becomes a [...] creature with <kw>` mask (lift `stripFraming` from `condition.cares_tribe`). 4 cards cured. Concession on Vito's anaphoric "it gains menace": **borderline — I'd defer that arm**, see Open Questions Q2.
4. **[narrow]** Single-file precision (~10 files): `effect.untap`, `effect.life_changed` (`[\d,]+ life`), `effect.destroy_{artifact,enchantment}` (PATTERN_BROAD comma), `effect.exile_artifact` (Vehicle synonym), `effect.look_at_top_n` (variable-N reveal), `condition.cares_noncreature_spell` (single-subtype trigger), `condition.cares_tokens` (replacement-effect frame), `condition.descend` (number-of-times), `trigger.creature_dies` (plural), `condition.cares_high_power` (is/the), `effect.mill` (equal-to), `effect.tuck_to_library` (Frame A2), `effect.reanimate` (reversed-order), `effect.explore` (exclude bare trigger ref), `effect.counterspell` (drop "ability" alternation), `effect.pacify` (admit permanent), `trigger.creature_leaves_battlefield` (`is exiled from the battlefield`). Each is ~3-line surgery + a regression test row.

**Coverage PR (v0.13.6 or v0.14.x depending on cache invalidation):**
5. **[narrow]** `condition.cares_exile_pile.ts` — add the 4 Craft-pile pattern variants. 4 cards cured; entire Craft-pile axis representable. No new tag, no version bump needed.
6. **[narrow]** `condition.cares_artifacts.ts` — Patterns 6/3 broadened for as-long-as / disjunctive subject. 4 cards cured.
7. **[narrow]** `effect.ramp_nonland.ts` — add "put a land card from your hand onto the battlefield" arm. Spelunking + Nicanzil + Plant Beans class.

**New-rule decisions (gated on consumer presence):**
- **`trigger.upkeep`** — **ship.** Three batch cards + the entire "at the beginning of your upkeep" frame is uncovered. Pairs with `effect.life_changed`, `effect.draws_or_discards`, `condition.cares_graveyard`, `condition.descend`. Real consumer surface. Mirror `trigger.beginning_of_combat` shape.
- **`trigger.landfall`** — **ship.** Twists and Turns + the entire "When a land you control enters" frame. Pairs with `condition.cares_lands`, `effect.ramp_nonland`, `effect.create_creature_token`. Multiple consumers wired.
- **`condition.cares_low_power`** — **ship.** Symmetric to `cares_high_power`; Unstable Glyphbridge + DSK white class. Pairs with `effect.grants_stat_buff`, `effect.create_creature_token` (small tokens benefit). Consumer surface adequate.
- **`effect.animate_land` pronoun broadening** — **ship as [narrow], not [new-rule].** Tendril's "It becomes" is a one-line addition to the existing rule.
- **`effect.stifle`** — **defer.** A's "two-card rule" is the right discipline; Tishana is the only card. Narrow `counterspell` to spell-only now; revisit when a second stifle card surfaces.
- **`condition.cast_from_graveyard` broadening** — **defer.** Tarrian's Journal is the only card; the tag's docstring is explicit about keyword-only scope. One card doesn't justify a behavioral broadening.
- **`condition.cares_counters` (non +1/+1)** — **defer.** Single-card surface (Millennium Calendar's time counters). Author when a second card appears.
- **`effect.exile_from_hand`** — **defer.** A's "broaden `targeted_discard` instead" path is right; one card.
- **`effect.has_defender`** — **defer.** Low Standard graph value.
- **`effect.cheat_into_play`** — **defer** (already deferred prev batch).

#### Disagreements with A — explicit

1. **A's P1 shared helper (`_sacrifice_subject.ts`):** **I disagree.** Even though the negative-context predicate is identical today, exposing it as a shared helper couples all 6 files to one regex. If one of the 6 develops a different exclusion shape later (e.g. `sacrifice_planeswalker` needs to also exclude superfriends triggers), the helper either grows untyped switches or has to be re-inlined. **My counter:** inline the two `const` regexes in each file. The diff is wider but the maintenance shape is clearer; per-file overrides become trivial. The prev batch's `grants_*` decision applied the same logic. Concession path: if B sides with A, I'll accept the helper but only if it's named explicitly (`_sacrifice_negative_contexts.ts` not `_sacrifice_subject.ts`) and exports the two regexes as named exports rather than a function.

2. **A's P2 Pattern[1] lookbehind extension blocking bare `it`:** **I push back.** Adding `(?<!\bit )` to Pattern[1] *will* drop legitimate two-sentence pump effects ("Target creature gets +2/+2. It gains menace until end of turn") — those are real anthem-style grants and they're a non-trivial fraction of pump-spell oracle text. Vito's Inquisitor is one card. **My counter:** defer the anaphoric-self arm; accept the 1-card FP. If a second card surfaces, do sentence-scoped subject resolution properly (out of regex scope; needs a preprocessor).

3. **A's P5 `effect.counterspell` narrow now:** **I support.** Narrowing to `\bspell\b` cures Tishana FP; if a future Stifle-only card needs `effect.stifle`, author then. No disagreement, just confirming.

#### Coverage-impact risk gates

For the larger families I want explicit before/after coverage deltas in the PR description:
- `effect.sacrifice_creature`: currently a very large family (broad regex). >20% drop signals over-narrowing — investigate.
- `effect.sacrifice_permanent`: same risk class.
- `effect.grants_evasion`: stripFraming pre-pass is structural; expect <5% legitimate-positive drop.
- `trigger.another_creature_etb`: expect a drop equal to the number of "Whenever this creature enters" self-ETB cards in the corpus (estimate 15–25 cards). That's the *intended* drop; it shouldn't trigger a regression flag.

#### Open questions for A and B

1. **Shared `_sacrifice_subject.ts` helper vs 6 inline copies (vs A's P1):** I argued inline above. B?
2. **Vito's "it gains menace" arm — ship or defer?** A flagged it borderline. I lean defer. B?
3. **`effect.counterspell` narrow-now vs split-now:** A and I both lean narrow-now. B sign off?
4. **The Everflowing Well "becomes a copy of that spell":** Defer as edge case, or extend clone_in_place to admit spell-shaped antecedents? I lean defer.
5. **PR cardinality:** Items 1–4 is a single dense PR (~5 files modified for sacrifice + ~10 single-file edits). Risk of one bad narrowing forcing the whole PR to revert. Carve more aggressively, or one big PR with `rule:coverage --all` gate?

**I can sign off on a plan: not yet — awaiting A and B's Round 1.**

### Agent B (Round 1)

**Stance:** Graph-correctness first. Every rule narrowing is implicitly a *pairings* change — fewer matched cards means fewer edges, and silently dropping edges is worse than logging a false positive. I push back on coverage-gap [new-rule] adds that would emit orphan nodes (no wired consumer), and I am strict that any semantic shift in tag membership (not just precision tightening) **must** bump `RULE_VERSION` so the IndexedDB cache invalidates. Verified `RULE_VERSION = v0.14.0` in `shared/version.ts`; previous-batch splits (`copy_permanent_token`/`clone_in_place`, `gains_keyword_self_conditional`, `has_flying/menace/double_strike/indestructible/hexproof`, `condition.descend`, `effect.create_map`, `effect.impulse_draw`) already shipped — this batch is the precision/edge-cases follow-up.

I largely agree with A and C on the precision narrowings. Where I differ: (a) C's "v0.13.5 precision PR / v0.13.6 coverage PR" framing is wrong because every cluster fix here changes per-card tag membership and therefore needs cache invalidation; (b) I'm more aggressive than C and aligned with A on shipping `cares_low_power`, but I disagree with A on `trigger.upkeep` and `trigger.landfall` pending a consumer-surface audit; (c) I have an architectural alternative for Cluster 2 that neither A nor C raised.

---

#### Cluster 1: `trigger.another_creature_etb` self-leak — pairings impact

`trigger.another_creature_etb.pairsWith = ['effect.create_creature_token', 'effect.reanimate', 'effect.bounce_or_blink']`. Every audited card carries at least one of those effects, so the FP isn't filter-only — it produces real wrong edges. Threefold Thunderhulk (has `effect.create_creature_token`) currently emits a `Thunderhulk → ANY create_creature_token consumer via another_creature_etb` edge that is structurally bogus. **Fix DROPS those wrong edges.** No tag orphaned. I sign onto A's fix shape (drop the trailing `?` on the determiner group) and C's preference for the same — explicit determiner required.

**Test plan:** four `does not match` rows added to `trigger.another_creature_etb.test.ts` (one per cluster card). Pre-flight: grep-confirmed no existing positive uses `this creature` — **no positive flips**.

---

#### Cluster 2: typed-sacrifice leakage — pairings impact + architecture alternative

**Pairings impact (most concerning of any cluster):** Each `effect.sacrifice_<type>` pairs with `trigger.<type>_leaves_battlefield`. Vito (aristocrats payoff) emits SIX wrong edges into LTB-trigger consumers. Grim Captain (edict) emits 4–5. Critically: `trigger.permanent_sacrificed.pairsWith` already lists all 5 typed sacrifice effects + permanent, so Vito-shape cards stay correctly wired into aristocrats edges via `trigger.permanent_sacrificed`. **Fix is unambiguously a precision win; no orphan risk.**

**Architecture — third option neither A nor C named:** A wants `_sacrifice_subject.ts` shared helper exporting two negative-context regexes (span-test in each Rule.match). C wants 6 inline copies. **I propose a fourth option: pre-mask in `normalize.ts`.** Replace `each opponent sacrifices` → `__EDICT__ ` and `whenever (you )?sacrifice` → `__SACTRIG__ ` before any rule scans. Same architectural lever as the v0.13.3 quote-strip we shipped. **Properties:**
- One file changed (`normalize.ts`), one test file for the masks. The 6 sacrifice rules are *untouched*.
- Mask is unit-testable in isolation; no Rule contract change.
- Other rules that *should* fire on edict text still see `__EDICT__ ` — that's a token, not nothing — so `effect.edict.ts` can match on `__EDICT__` directly. (Check what `effect.edict.ts` currently keys on; if it scans for `each opponent sacrifices`, the mask becomes adversarial.)

**Mask risk:** If `effect.edict.ts` keys on the literal phrase, masking breaks it. **Open question for A: please grep `effect.edict.ts` to confirm its anchor.** If it keys on `__EDICT__`-incompatible phrasing, my approach is dead and C's inline-copy approach wins.

**Concession path:** If A's shared helper or C's inline copies are preferred, I will accept either — but I want the diagnosis written into the rule files so the next narrowing audit doesn't reintroduce the bug. **I lean toward C's inline-copy approach over A's helper** (consistent with the prev-batch consensus that shared `_grants.ts` was over-engineered).

**Test plan:** 3 `does not match` rows per file × 6 files = 18 new rows. Pre-flight: grep-confirmed no existing positive uses `each opponent` or `whenever you sacrifice` — **no positive flips**.

---

#### Cluster 3: manland self-animation — pairings impact + Vito's Inquisitor

**Pairings impact:**
- `grants_evasion.pairsWith = ['condition.cares_evasion']`. Manland FPs emit wrong `manland → cares_evasion_consumer` edges. Fix DROPS those.
- `cares_deathtouch.pairsWith = ['effect.has_deathtouch']`. Restless Reef wrongly appears as a deathtouch-payoff. Fix DROPS those.
- No tag orphaned.

**Vito's Inquisitor — disagreement with C, partial-disagreement with A:**
C says **defer the bare-`it` arm** (Vito's "it gains menace" anaphor) because the lookbehind `(?<!\bit )` would break legit two-sentence pump like "Target creature gets +2/+2. It gains menace." I read C's risk argument and... C is right that the lookbehind is risky. But **I propose a third path:** Vito's Inquisitor is *correctly* a `effect.gains_keyword_self_conditional` card (previous batch authored that tag for exactly this shape). **Check if `gains_keyword_self_conditional.ts` already fires on `it gains menace until end of turn` post-`+1/+1 counter on this creature`** — if yes, then narrowing `grants_evasion` to drop the FP doesn't lose Vito's signal (it migrates to the right tag). If no, broaden `gains_keyword_self_conditional` to handle anaphoric "it" referents.

**Resolution proposal:**
1. Narrow `grants_evasion` Pattern[2] only (the manland frame). Do NOT touch Pattern[1]'s `it` issue.
2. Verify `gains_keyword_self_conditional` covers Vito's Inquisitor; broaden if needed.
3. If `gains_keyword_self_conditional` cannot easily capture the anaphor, accept Vito as a 1-card FP and defer per C's stance.

**Test plan:** A's stripFraming approach for `cares_deathtouch` is right. I sign onto A's P2. **Inline stripFraming both in `grants_evasion` and `cares_deathtouch` for now**; refactor to `_stripFraming.ts` only after a 3rd caller (consistent with prev-batch anti-premature-abstraction discipline).

---

#### Cluster 4: Craft / exile-pile broadening — pairings impact

`cares_exile_pile.pairsWith = ['effect.exile_from_library']`. Broadening ADDS edges:
- Pit of Offerings, Quintorius Kand, Sunbird Effigy, Locus of Enlightenment all gain edges into `exile_from_library` producers.

All correct. **No orphan risk.** I sign onto A's P3 patterns 4/5/6 exactly. C confirmed the regex gaps; we're aligned.

**Optional scope-expansion:** also wire `cares_exile_pile` → `effect.exile_from_graveyard` since Quintorius -6 scales on a graveyard-exile pile. **Flag for A/C consent.** I lean ship since the pairing is structurally correct, but I'll defer to A/C if they prefer to wait for a 2nd card.

---

#### Cluster 5: `cares_artifacts` — pairings orphan flag

**`condition.cares_artifacts.pairsWith = []`. This tag has NO PAIRINGS.** It's a filter-only axis today. Broadening the rule adds cards to filter membership but emits ZERO new edges. The 4 audited cards become filter-discoverable but graph-invisible to producers.

**Open question to A and C — I propose this round wire pairings:** `pairsWith: ['effect.create_treasure', 'effect.create_clue', 'effect.create_food', 'effect.create_map', 'trigger.another_artifact_etb']`. The bidirectional builder dedupes if any of those already pair back. The audit found 4 cards exposing the rule gap, but the *real* graph payoff is in the consumer wiring.

**Risk:** Every existing `cares_artifacts` card (already a large tag) gains 5 new edge targets per artifact-producer. Artifact size grows materially. **This is a graph-shape change, not just a tag-set change.**

**Conservative position:** broaden the rule this round; flag the pairings wiring as a follow-up. **Aggressive position:** wire pairings in the same PR. **I lean conservative for review-ability**; the audit didn't request the wiring, so don't pile it on. But I want it on the v0.14.2 docket.

I sign onto A's P4 broadenings (Patterns 6/3 disjunctive). C confirmed the regex gaps.

---

### RULE_VERSION strategy — explicit disagreement with C

**C frames the work as "Precision PR v0.13.5 / Coverage PR v0.13.6".** I disagree.

A v0.13.X bump means "precision-only, same tag IDs, no edge changes". **None of the 5 clusters here qualify.** Every cluster changes per-card `tags[]`:
- Cluster 1 drops `another_creature_etb` from 4+ cards → drops edges.
- Cluster 2 drops typed-sac tags from 3 cards → drops edges.
- Cluster 3 drops `grants_evasion`/`cares_deathtouch` from 4 cards → drops edges.
- Cluster 4 adds `cares_exile_pile` to 4 cards → adds edges.
- Cluster 5 adds `cares_artifacts` to 4 cards → adds (filter-only) tag membership.

Every one of these is a `tags[]` shape change. The artifact's `ruleVersion` is the cache key for the app's IndexedDB hydration. **Single bump to `v0.14.1` covers everything.** Multiple bumps = multiple user re-hydrations for no benefit.

**Sign-off contingent on this:** all 5 clusters + the P5 long-tail single-file narrowings + the new-rule adds ride one PR + one bump. If A/C prefer multiple PRs, that's fine — they just all bump to `v0.14.1` (or sequentially to `v0.14.1`, `v0.14.2`, ... but never to `v0.13.X`).

---

### New-rule decisions — disagreements with A

Applying my orphan-node gate:

- **`trigger.upkeep`** — **disagreement with A and C.** Both say ship. **I say defer pending consumer-surface audit.** A claims it pairs with `condition.descend`, `effect.life_changed`, `condition.cares_graveyard`. C claims pairings with `effect.life_changed`, `effect.draws_or_discards`, `condition.cares_graveyard`, `condition.descend`. **But the trigger doesn't *trigger* descend or graveyard scaling — those are conditions checked at trigger resolution.** I want A or C to grep `pairsWith.*trigger.beginning_of_combat` (the structurally identical existing trigger) and confirm consumer surface. If `trigger.beginning_of_combat` has 3+ consumer pairs, A and C are right and I concede; if it's orphan, this is consistent precedent for filter-only timing triggers and ship is fine; if it has 1–2 thin pairs, decide case-by-case. **Action item: A or C, please run the grep.**

- **`trigger.landfall`** — **disagreement with A and C.** Both say ship. **I say half-ship pending consumer-pairing audit.** Landfall is a *family* axis (ramp, lands-matter, ZNR Lurking-Roper class). Half-shipping just the trigger without designing the full producer/consumer map creates dozens of orphan-pairing-target candidates the moment a second card is audited. **Counter-proposal:** ship `trigger.landfall` with A's proposed pairings (`effect.ramp_nonland`, `condition.cares_lands`, `effect.create_creature_token`), but include `npm run rule:coverage -- --pairings` in the CI gate. If those 3 pairings cover ≥80% of audited landfall cards, ship; else defer.

- **`condition.cares_low_power`** — **ship.** Concur with A and C. Symmetric to `condition.cares_high_power`; pairsWith mirrors. Cures Unstable Glyphbridge + historical "power 2 or less" payoffs.

- **`effect.ramp_nonland` broadening** — **ship.** Concur with A and C. Adds "put a land card from your hand onto the battlefield" arm. Spelunking + Nicanzil. Existing rule + existing consumers; precision broadening.

- **`effect.targeted_discard` broadening for exile-from-hand** — **ship.** Concur with A. Skullcap Snail.

- **`effect.grants_haste` / `grants_<kw>` family broadening (tribal anthem + singular `with <kw>`)** — **ship with coverage gate.** Concur with C's risk discipline. Per-rule fixes, no shared helper, `rule:coverage --all` before/after gate (≤2% regression per A/C's prev-batch commitment).

- **`effect.counterspell` narrow to spell-only** — **ship.** All three of us agree. Defer `effect.stifle` until 2nd card.

- **`effect.animate_land` pronoun broadening** — **ship as narrow.** C is right: Tendril's "It becomes" is a one-line addition to existing rule, not a new tag.

- **`condition.cares_counters` (non +1/+1) / `effect.has_defender` / `effect.cheat_into_play` / `condition.cast_from_graveyard` broadening** — **defer.** Concur with A and C. Single-card surfaces or no consumer wiring.

---

### Disagreements with A explicitly

1. **A's P1 shared helper `_sacrifice_subject.ts`** — **I disagree, side with C.** Per-file inline copies are the right shape for the same reasons C names (later divergence flexibility). Stronger argument: my normalize-layer pre-mask is even cleaner; I'd push for that first. Concession path: if A insists on a helper, I accept it; if A accepts the normalize-layer pre-mask, even better.

2. **A's P2 lookbehind extension to block bare `it`** — **I disagree, side with C.** C is right that this drops legit two-sentence pump. **My counter** (different from C's defer): split-direct routing — let `grants_evasion` drop the manland frame only, then verify `gains_keyword_self_conditional` covers Vito's Inquisitor's anaphor. If yes, narrow without losing signal. If no, accept 1-card FP per C.

3. **A's `trigger.upkeep` and `trigger.landfall` "ship" call** — **I want a 5-min grep audit before signing off.** See above.

### Disagreements with C explicitly

1. **C's "v0.13.5 / v0.13.6" PR framing** — **I disagree.** All work is semantic; single bump to `v0.14.1`. See RULE_VERSION strategy section above.

2. **C's "defer Vito's anaphoric arm entirely"** — **partial disagreement.** I prefer to first verify `gains_keyword_self_conditional` already covers Vito; if yes, narrow `grants_evasion` and the signal migrates correctly. If no, I concede to C's defer.

3. **C's Everflowing Well "becomes a copy of that spell" defer** — **concur.** One-card edge case; the prev-batch `clone_in_place` exclusion of `spell` was deliberate. Defer.

---

### Open questions to A and C

1. **Cluster 2 fix architecture:** A's shared helper vs C's inline copies vs my normalize-layer pre-mask. We need consensus. Need `effect.edict.ts` anchor grep to validate my approach.
2. **Cluster 3 Vito's Inquisitor downstream:** does `gains_keyword_self_conditional` already fire on Vito's "it gains menace" anaphor? If not, do we broaden that previous-batch tag in this round, or accept the FP loss?
3. **Cluster 4 optional pairings expansion:** wire `cares_exile_pile` → `effect.exile_from_graveyard`?
4. **Cluster 5 pairings wiring:** wire `condition.cares_artifacts.pairsWith` to artifact-producers (`create_treasure`/`clue`/`food`/`map`/`another_artifact_etb`) this round or defer to v0.14.2?
5. **`trigger.upkeep` and `trigger.landfall` orphan-gate:** consumer-pairing grep needed before sign-off.
6. **Single-PR scope:** I propose cap at 5 clusters + P5 long-tail + `cares_low_power` + `counterspell` narrow + `targeted_discard` broadening + `ramp_nonland` broadening + `grants_<kw>` family broadening + `animate_land` pronoun. Everything else (`trigger.upkeep`, `trigger.landfall` pending audit) flags as v0.14.2 follow-up.

**I can sign off on a plan: not yet — awaiting A and C's Round 1.**

---

## Round 2

### Agent A (Round 2)

#### Dispute 1: Cluster 2 architecture — normalize-mask vs helper vs inline

**B's normalize-layer pre-mask is dead. I concede the helper. C's inline-copy approach wins.**

Grep results:
- `pipeline/rules/trigger.permanent_sacrificed.ts:32` — regex literally anchors on `\bwhenever you sacrifice (?:a |an |another )?(?:permanent|creature|artifact|...)\b`. Masking that phrase at normalize would silently kill *the* aristocrats-trigger tag.
- `pipeline/rules/effect.edict.ts:31` — anchors on `(?:target\s+opponent|each\s+opponent|each\s+player|target\s+player)\s+sacrifices?\s+...`. Masking "each opponent sacrifices" → token would break edict detection.

Both rules legitimately consume the exact phrases B wanted to mask. B's "single-fix at the normalize layer" violates the invariant that normalize preserves signal other rules want. The v0.13.3 quote-strip precedent doesn't transfer — quoted reminder text inside emblems/sagas is never matched by any rule, so masking it cost zero. These trigger phrases are matched by two real rules.

**Position:** C's per-file inline `const NEGATIVE_EDICT` + `const NEGATIVE_TRIGGER` regex in each of the 6 `effect.sacrifice_*.ts` files. Each rule's `match` rejects when `m.index` falls inside a hit of either negative pattern. I concede my shared-helper proposal — even though the regexes are identical today, the coupling cost C named is real and the inline shape is also what gets us to ship faster (no new file, no aggregator concerns).

#### Dispute 2: PR cardinality — `v0.14.1` single bump

**Conceding to B.** C's "v0.13.5 precision / v0.13.6 coverage" framing was wrong on the cache-invalidation reading. Every cluster here changes per-card `tags[]` (drops or adds); every change must invalidate IndexedDB; double-bumping forces users to re-hydrate twice for no isolation benefit. The PR-revert risk C cited is real but addressed by `rule:coverage --all` gate in the single PR, not by splitting into two version bumps. Cost-of-mistake is the same; cost-of-coordination is higher with two bumps.

**Position:** Single `v0.14.1` bump. Carve into 2 PRs only if review-load demands it, but both PRs land at the same version.

#### Dispute 3: Orphan-gate on `trigger.upkeep` / `trigger.landfall`

Grep: `grep -rn "'trigger\.upkeep'\|'trigger\.landfall'" pipeline/ shared/ app/` → **zero matches**. No existing rule's `pairsWith` references either tag. Shipping the rule files alone would emit isolated nodes.

**But:** the `beginning_of_combat` precedent (`trigger.beginning_of_combat.ts:23-27`) ships with 3 forward pairings declared on the *trigger's own* tagDef (`grants_stat_buff`, `create_creature_token`, `plus_one_counter`). The bidirectional graph builder turns those into edges without requiring the effect rules to declare back-references. So the question isn't "does anything wait for upkeep" — it's "can we declare meaningful forward pairings from upkeep's tagDef".

For `trigger.upkeep`: yes — `effect.life_changed`, `effect.draws_or_discards`, `effect.mill`, `condition.descend` all real on batch cards.
For `trigger.landfall`: yes — `condition.cares_lands`, `effect.ramp_nonland`, `effect.create_creature_token`.

**Partial concession to B:** ship both tags WITH their forward pairings declared in the tagDef (mirroring `beginning_of_combat`'s pattern). Run `npm run rule:coverage -- --pairings` as the gate. If forward-pairing coverage <80% of audited cards, defer.

#### Dispute 4: Vito's Inquisitor anaphoric "it gains menace"

I read `effect.gains_keyword_self_conditional.ts:33-39`. The pattern requires:
1. `SELF_SUBJECT` = literal `this (creature|artifact|...)` or `__self__` — bare "it" not in the alternation.
2. A gating connector `(?:as long as|while|if)` — Vito's text is "until end of turn", NOT a conditional gate.

Vito's "It gains menace until end of turn" misses on both axes. **B's path (verify gains_keyword_self_conditional covers Vito) is dead.** C is right: defer the anaphoric arm; accept the 1-card FP. If a second card surfaces, sentence-scoped anaphor resolution is the right fix and that's out of regex scope.

**Position: defer per C.** `grants_evasion` narrows Pattern[2] (manland frame) only; Pattern[1] untouched; Vito remains a known 1-card FP until a 2nd surfaces.

---

#### Round 2 consolidated plan (single PR, bumps to `v0.14.1`)

1. **[narrow]** `trigger.another_creature_etb.ts` — drop trailing `?` on the outer determiner group; require `a|another|one or more`. Cards: Queen's Bay Paladin, Sentinel of the Nameless City, Threefold Thunderhulk, Visage of Dread back face.
2. **[narrow]** `effect.sacrifice_{artifact,creature,enchantment,land,permanent,planeswalker}.ts` — per-file inline `NEGATIVE_EDICT` + `NEGATIVE_TRIGGER` regexes; reject matches whose `m.index` falls inside either span. Cards: Vito (6 FPs), Throne of the Grim Captain (4), Tithing Blade (1).
3. **[narrow]** `effect.grants_evasion.ts` Pattern[2] only — anchor `becomes a [...] creature with <kw>` on subject token (token/another/target/each other) OR apply stripFraming. Pattern[1] untouched. Cards: Restless Anchorage, Restless Vents.
4. **[narrow]** `condition.cares_deathtouch.ts` — stripFraming for `becomes a [...] creature with deathtouch`. Card: Restless Reef.
5. **[narrow]** `condition.cares_exile_pile.ts` — add patterns for possessive (`the exiled cards'`), `used to craft (it|this <type>)`, `cast a spell from exile`, `each card exiled this way`. Cards: Pit of Offerings, Quintorius Kand, Sunbird Effigy, Enigma Jewel.
6. **[narrow]** `condition.cares_artifacts.ts` — Pattern 6 admit `as long as` + `this <type> or another <type>`; Pattern 3 admit disjunctive subjects; add disjunctive dig filter. Cards: Shipwreck Sentry, Master's Manufactory, Sunshot Militia, Staunch Crewmate.
7. **[narrow]** P5 long-tail single-file edits (per Round 1 table, all 17 entries): `effect.untap`, `effect.life_changed`, `effect.destroy_{artifact,enchantment}`, `effect.exile_artifact` (Vehicle synonym), `effect.look_at_top_n`, `condition.cares_noncreature_spell`, `condition.cares_tokens`, `condition.descend`, `trigger.creature_dies` (plural), `condition.cares_high_power`, `effect.mill`, `effect.tuck_to_library`, `effect.animate_land`, `trigger.creature_leaves_battlefield` (exile-route LTB), `effect.reanimate` (reversed order), `effect.explore` (exclude trigger frame), `effect.counterspell` (drop `ability`), `effect.pacify` (admit `permanent`), `effect.ramp_nonland` (put-from-hand frame).
8. **[narrow]** `effect.targeted_discard.ts` — admit "exiles a card from their hand". Card: Skullcap Snail.
9. **[narrow]** `effect.grants_<kw>` family — Frame (c) tribal subjects; Frame (e) singular `with <kw>`. Cards: Palani's Hatcher, Tendril of the Mycotyrant.
10. **[new-rule]** `trigger.upkeep.ts` — pattern `at the beginning of (your|each|target player's) upkeep`. Forward `pairsWith: ['effect.life_changed', 'effect.draws_or_discards', 'effect.mill', 'condition.descend']`. Gate on `--pairings` ≥80%.
11. **[new-rule]** `trigger.landfall.ts` — pattern `when(?:ever)? a land[\w\s]*? enters`. Forward `pairsWith: ['condition.cares_lands', 'effect.ramp_nonland', 'effect.create_creature_token']`. Gate on `--pairings` ≥80%.
12. **[new-rule]** `condition.cares_low_power.ts` — mirror `cares_high_power`; check N≤2 / "or less". Forward `pairsWith: ['effect.grants_stat_buff', 'effect.create_creature_token']`. Card: Unstable Glyphbridge.
13. **[defer]** Vito's anaphoric "it gains menace" arm — accept 1-card FP; revisit on 2nd card.
14. **[defer]** `effect.stifle` — narrow `effect.counterspell` to `\bspell\b` in #7; defer dedicated tag (Tishana is sole card).
15. **[defer]** Everflowing Well "becomes a copy of that spell" — prev-batch `clone_in_place` exclusion intentional; 1-card edge case.
16. **[defer]** `condition.cares_counters` (non +1/+1), `effect.has_defender`, `effect.cheat_into_play`, `condition.cast_from_graveyard` broadening, Millennium Calendar pronoun-self sacrifice — all single-card or no-consumer.
17. **[defer]** `condition.cares_artifacts.pairsWith` wiring to artifact-producers (B's Cluster 5 expansion) — flag for v0.14.2; this round broadens the rule only.
18. **[defer]** `condition.cares_exile_pile` → `effect.exile_from_graveyard` pairing (B's Cluster 4 optional) — flag for v0.14.2.

**I can sign off on the plan as written above: YES.**


---

## Round 2

### Agent C (Round 2)

**Stance recap:** I verified each live dispute by reading the cited files and grepping the codebase. I concede on PR cardinality and the orphan-gate questions; I hold on the Vito defer; I have the deciding evidence on Cluster 2 architecture.

---

#### Dispute 1 — Cluster 2 architecture (A: helper / C: inline / B: normalize-layer pre-mask)

**Verdict: C's inline copies. B's normalize-mask is dead-on-arrival.**

`pipeline/rules/effect.edict.ts:30-31` anchors on the literal phrase:
```
\b(?:target\s+opponent|each\s+opponent|each\s+player|target\s+player)\s+sacrifices?\s+...
```
B's proposed mask `each opponent sacrifices` → `__EDICT__` would replace the very token `effect.edict` keys on, breaking edict tagging on every batch card (Throne of the Grim Captain, Tithing Blade). The trigger-side mask `whenever (you )?sacrifice` would also strip the anchor that `trigger.permanent_sacrificed.ts:32` uses (`\bwhenever you sacrifice (?:a |an |another )?(?:permanent|creature|...)`) — and `condition.bargain.test.ts:20` expects `whenever you sacrifice a permanent` to fire bargain. Pre-mask would silently break at least 3 rules to fix 1 family.

A's shared helper survives but adds coupling. C's inline negative-context constants in each of the 6 `effect.sacrifice_*.ts` files is the lowest-risk path; per-file divergence stays trivial.

**Concession path:** I accept A's shared helper if A and B both insist, but only as named-exports of two regex constants (`SAC_EDICT_FRAME`, `SAC_OBSERVER_FRAME`) imported by each file — not as a function. B should drop the normalize approach.

---

#### Dispute 2 — PR cardinality (C: v0.13.X+v0.13.Y / B: single v0.14.1)

**Verdict: B wins. I concede.**

Every cluster fix changes per-card `tags[]` membership. The artifact's `ruleVersion` is the IndexedDB cache key. Dropping 4 FP tags from Restless Anchorage IS a cache-invalidating membership change, even if no rule's tagId changes. Splitting into "precision PR / coverage PR" gives users 2 forced re-hydrations for one round of fixes, with no review benefit (the same files would be touched).

**Confirmed `RULE_VERSION = v0.14.0`** in `shared/version.ts:2`. Single bump to `v0.14.1` for the whole batch. If the work physically splits into multiple PRs for review, only the last one bumps to `v0.14.1` (or each bumps sequentially `v0.14.1`, `v0.14.2`, ... — never `v0.13.X`). B is right.

---

#### Dispute 3 — Orphan-gate on new tags (B's gate)

**Verdict: All three proposed new tags are orphans today. Defer or ship-with-pairings-wired.**

Grep result: `grep -rn "'trigger.upkeep'\|'trigger.landfall'\|'condition.cares_low_power'" pipeline/rules/ pipeline/catalog.ts shared/` returned **zero hits**. None of the three has a single consumer `pairsWith` reference in the codebase. Furthermore, `grep "trigger.beginning_of_combat\|trigger.beginning_of_end_step"` in pairsWith lines returned **zero hits** — existing phase triggers are filter-only by precedent.

**Concession to B:** ship a new tag only if its `pairsWith` is wired in the same PR. Specifically:
- **`trigger.upkeep`** — ship, but only if we author the pairings (e.g. `pairsWith: ['condition.descend', 'condition.cares_graveyard', 'effect.life_changed']`). Cost: ~15 min. Without pairings, it's filter-only — consistent with `beginning_of_combat` precedent but contributes no edges.
- **`trigger.landfall`** — ship with `pairsWith: ['condition.cares_lands', 'effect.ramp_nonland', 'effect.create_creature_token']` wired in same PR.
- **`condition.cares_low_power`** — ship with `pairsWith: ['effect.grants_stat_buff', 'effect.create_creature_token']` wired in same PR.

If any agent prefers filter-only-precedent (matching `beginning_of_combat`), ship without pairings and dock to v0.14.2 as a follow-up. **My final position:** wire pairings now. The 15-min cost beats the alternative of three orphan tags shipping into v0.14.1.

---

#### Dispute 4 — Vito's Inquisitor anaphoric "it gains menace"

**Verdict: Defer. B's `gains_keyword_self_conditional` does NOT cover Vito's shape.**

Read `pipeline/rules/effect.gains_keyword_self_conditional.ts:36-40`. The pattern requires a gating connector `(?:as long as|while|if)` after the keyword. Vito's text is "It gains menace until end of turn" — no `as long as` / `while` / `if`. The existing tag is scoped to **conditional** self-grants (static "this creature has flying as long as you control a Swamp"), not **temporary self-pump** ("it gains menace until end of turn"). Broadening it to also cover "until end of turn" temporary pump would dilute the conditional axis.

**Resolution:** narrow `grants_evasion` Pattern[2] to drop the manland self-animation FP (Restless Anchorage, Restless Vents — high value); do NOT touch Pattern[1]'s bare-`it` issue. Accept Vito's 1-card FP per my Round 1 stance. If a second anaphoric-pump card surfaces, author a dedicated `effect.gains_keyword_self_temporary` tag with the right pairings — don't repurpose `gains_keyword_self_conditional`.

---

### Final ordered plan (Agent C, Round 2)

**Single PR, single `RULE_VERSION` bump to `v0.14.1`:**

1. **[narrow]** `trigger.another_creature_etb.ts` — drop trailing `?` on outer determiner group. 4+ cards in batch, 15+ on re-audit.
2. **[narrow]** All 6 `effect.sacrifice_*.ts` — inline two negative-context regexes per file (edict + observer-trigger frames). 11 false tags in batch. **NOT B's normalize pre-mask** (confirmed dead).
3. **[narrow]** `effect.grants_evasion.ts` Pattern[2] only — anchor on subject token (`another`/`target`/`token`/`each other`) before `becomes`; drop manland FPs. Pattern[1] bare-`it` defer (Vito).
4. **[narrow]** `condition.cares_deathtouch.ts` — inline `becomes a [...] creature with` stripFraming (lift idea from `cares_tribe`, copy not import; promote to `_stripFraming.ts` only after 3rd caller).
5. **[narrow]** `condition.cares_exile_pile.ts` — add 4 Craft-pile pattern variants (A's P3). Optional cluster scope: also wire `pairsWith: ['effect.exile_from_graveyard']` (B's cluster-4 optional).
6. **[narrow]** `condition.cares_artifacts.ts` — Patterns 6/3 broadened (as-long-as / disjunctive subject / disjunctive dig filter / disjunctive cost form). Defer Cluster 5 pairings expansion to v0.14.2 (B's conservative position).
7. **[narrow]** Long-tail single-file precision (~13 files from R1 P5 list): `effect.untap`, `effect.life_changed`, `effect.destroy_{artifact,enchantment}`, `effect.exile_artifact` (Vehicle), `effect.look_at_top_n`, `condition.cares_noncreature_spell`, `condition.cares_tokens`, `condition.descend`, `trigger.creature_dies` (plural), `condition.cares_high_power` (is/the), `effect.mill`, `effect.tuck_to_library`, `effect.reanimate`, `effect.explore`, `effect.counterspell` (drop `ability`), `effect.pacify`, `trigger.creature_leaves_battlefield` (exile-LTB), `effect.ramp_nonland` (put-from-hand), `effect.animate_land` (anaphoric "It becomes"), `effect.grants_<kw>` family (tribal anthem + singular with-keyword).
8. **[new-rule]** `trigger.upkeep` with pairsWith wired (`condition.descend`, `condition.cares_graveyard`, `effect.life_changed`).
9. **[new-rule]** `trigger.landfall` with pairsWith wired (`condition.cares_lands`, `effect.ramp_nonland`, `effect.create_creature_token`).
10. **[new-rule]** `condition.cares_low_power` with pairsWith wired (`effect.grants_stat_buff`, `effect.create_creature_token`).
11. **[narrow]** `effect.targeted_discard.ts` — broaden for "exiles a card from their hand" (Skullcap Snail). A's lighter touch over dedicated `effect.exile_from_hand`.

**Deferred:** `effect.stifle` (1 card), `condition.cares_counters` non-+1/+1 (1 card), `effect.has_defender` (low graph value), `effect.cheat_into_play` (already deferred), Tarrian's Journal cast-from-graveyard (1 card), Everflowing Well clone-of-spell (1 card, prev-batch exclusion was deliberate), Vito's Inquisitor "it gains menace" anaphor (1 card, scope creep).

**Coverage gates:** before/after `rule:coverage --all` mandatory; per-rule deltas in PR description for the sacrifice family and `another_creature_etb`.

---

**I can sign off on Agent A's Round 2 plan: PARTIAL — see [items].** Specifically I want: (a) Cluster 2 fixed via inline copies (not A's helper, not B's normalize-mask), (b) Vito's bare-`it` arm deferred (not A's lookbehind extension), (c) all three new tags ship with `pairsWith` wired in same PR (not orphan, not later). If A's Round 2 already concedes these three, I sign off YES.

---

### Agent B (Round 2)

**Stance:** I conceded three of four Round 1 positions after running the greps I previously demanded from others. Evidence-first below. A's Round 2 plan already accommodates every concession I needed to make.

---

#### Dispute 1 — Cluster 2 architecture (normalize-layer pre-mask)

**CONCEDE.** My pre-mask is dead. Two existing rules anchor on the literal trigger/edict phrases I would have masked:

- `pipeline/rules/trigger.permanent_sacrificed.ts:32` — `/\bwhenever you sacrifice (?:a |an |another )?(?:permanent|creature|artifact|enchantment|land|token|food|treasure|clue|blood|map|powerstone|incubator|role)\b/`. This is the aristocrats axis. Masking `whenever you sacrifice` → `__SACTRIG__` kills this rule on Vito + every aristocrats card. The entire `permanent_sacrificed → sacrifice_*` graph edge family dies.
- `pipeline/rules/effect.edict.ts:30-31` — `/\b(?:target\s+opponent|each\s+opponent|each\s+player|target\s+player)\s+sacrifices?\s+...(?:creature|permanent)s?\b/`. Edicts. Masking `each opponent sacrifices` kills this rule. Throne of the Grim Captain (edict source) loses its only correct tag.

Both rules legitimately consume the exact phrases I proposed masking. **I fall back to C's inline-copy approach** (consistent with prev-batch anti-premature-abstraction precedent; A also conceded the helper in Round 2).

---

#### Dispute 2 — PR cardinality (v0.13.X vs v0.14.1)

**HOLD.** My Round 1 reasoning stands; A and C have now both conceded. Precision-only fixes still change `tags[]` membership per card — every dropped FP is a cache-invalidating membership change. `shared/version.ts:2` confirms `RULE_VERSION = 'v0.14.0'`. Single bump to `v0.14.1` for the whole batch. Sequential PRs are fine but each must bump forward (`v0.14.1`, `v0.14.2`, ...) never sideways to `v0.13.X`.

---

#### Dispute 3 — Orphan-gate on `trigger.upkeep` / `trigger.landfall` / `cares_low_power`

Ran the grep myself: `grep -rn "'trigger.upkeep'\|'trigger.landfall'\|'condition.cares_low_power'"` → zero hits. None has an inbound `pairsWith` reference in any existing rule.

**But** the precedent — `trigger.beginning_of_combat.ts:23-27` ships with 3 forward pairings declared on the trigger's OWN tagDef; `trigger.beginning_of_end_step.ts:17-22` ships with 4. Zero inbound references from other rules. The bidirectional builder creates edges from the trigger-side declaration alone.

**For `trigger.upkeep`:** consumers exist — `effect.life_changed.ts`, `effect.draws_or_discards.ts`, `condition.descend.ts`, `condition.cares_graveyard.ts`, `effect.create_creature_token.ts` all present. **SHIP** with forward `pairsWith` matching the precedent shape.

**For `trigger.landfall`:** `condition.cares_lands.ts`, `effect.ramp_nonland.ts`, `effect.create_creature_token.ts` all present. **SHIP** with three forward pairings.

**For `condition.cares_low_power`:** `effect.grants_stat_buff.ts`, `effect.create_creature_token.ts` present. **SHIP** with two forward pairings.

**Concede my Round 1 deferral demand.** A and C are right — ship all three with `pairsWith` wired in the same PR.

---

#### Dispute 4 — Vito's Inquisitor "it gains menace" path

Ran the grep. `effect.gains_keyword_self_conditional.ts:39` regex requires `(this <type>|__self__)` immediately followed by has/have/gains keyword followed by `(?:as long as|while|if)` gating connector. Vito's text says `"it gains menace until end of turn"` — bare `it` (not in SELF_SUBJECT alternation) AND `until end of turn` (not a gating connector). **Fails on both axes.**

**CONCEDE to C.** Path is dead. Defer Vito's anaphoric arm — accept the 1-card FP; narrow `grants_evasion` Pattern[2] only; leave Pattern[1] alone. If a 2nd anaphoric-pump card surfaces, C's "author `effect.gains_keyword_self_temporary` as a sibling" is the right shape.

---

#### Sign-off

A's Round 2 plan (items 1–18) already adopts every position I land on after concessions:
- Cluster 2 inline copies (A conceded helper).
- Vito's arm deferred (A's item 13).
- New tags ship with forward `pairsWith` wired (A's items 10–12 + `--pairings` gate).
- Single `v0.14.1` bump (A's framing line above the plan).
- `cares_artifacts` pairings wiring + `cares_exile_pile → exile_from_graveyard` deferred to v0.14.2 (A's items 17–18; my conservative position from Round 1).

**I can sign off on Agent A's Round 2 plan as written: YES.**

---

## AGREED PLAN  (sign-off: A=YES, B=YES, C=YES via PARTIAL→YES once A's Round 2 adopted inline copies + Vito defer + pairings-wired new tags)

**Target version:** `v0.14.1` (single RULE_VERSION bump, single IndexedDB invalidation).
**Gate per PR:** `npm test` (full gate) + `npm run rule:coverage -- --all` (no >2% absolute drop per touched tag) + `npm run rule:coverage -- --pairings` (no broken references).

### Ordered work items

1. **[narrow] `pipeline/rules/trigger.another_creature_etb.ts`** — drop the trailing `?` on the outer determiner; require `(?:a|another|one or more)` mandatory. Self-leak cure. Cards cured: Queen's Bay Paladin, Sentinel of the Nameless City, Threefold Thunderhulk, Visage of Dread back face.

2. **[narrow] `pipeline/rules/effect.sacrifice_{artifact,creature,enchantment,land,permanent,planeswalker}.ts`** — inline per-file `NEGATIVE_EDICT` and `NEGATIVE_TRIGGER` regexes; reject match when `m.index` falls inside either span. **Inline copies, NOT a shared helper, NOT normalize-layer masking** (B's normalize idea breaks `effect.edict.ts:31` and `trigger.permanent_sacrificed.ts:32` which legitimately consume those phrases). Cards cured: Vito, Fanatic of Aclazotz (6 FPs), Throne of the Grim Captain (4), Tithing Blade (1).

3. **[narrow] `pipeline/rules/effect.grants_evasion.ts`** — Pattern[2] only (`becomes a [...] creature with <kw>`); require subject token (`token`/`another`/`target`/`each other creature`) OR apply `stripFraming`. Pattern[1] untouched (the anaphoric "it gains menace" Vito arm is **deferred** — see item 13). Cards cured: Restless Anchorage, Restless Vents.

4. **[narrow] `pipeline/rules/condition.cares_deathtouch.ts`** — apply `stripFraming` for `becomes a [...] creature with deathtouch` (mirror approach used in `condition.cares_tribe`). Card cured: Restless Reef.

5. **[narrow] `pipeline/rules/condition.cares_exile_pile.ts`** — add 4 patterns: possessive (`the exiled cards' (colors|types|mana values|names)`), `exiled cards? used to craft (it|this <type>)`, `cast (a|target)? [...] spell from exile`, `each card exiled this way`. Cards cured: Pit of Offerings, Quintorius Kand, Sunbird Effigy (back of Sunbird Standard), Locus of Enlightenment (back of The Enigma Jewel).

6. **[narrow] `pipeline/rules/condition.cares_artifacts.ts`** — Pattern 6 admit `as long as` and `this <type> or another <type>`; Pattern 3 admit disjunctive subjects (`tap N untapped artifacts and/or creatures you control` where "you control" qualifies the second noun). Cards cured: Shipwreck Sentry, Master's Manufactory (back of Master's Guide-Mural), Sunshot Militia, Staunch Crewmate.

7. **[narrow] long-tail single-card narrowings** — `effect.untap` (exclude trigger frame + 'one or more' filler), `effect.life_changed`, `effect.destroy_artifact` + `effect.destroy_enchantment` (noncreature-nonland-permanent frame on Molten Collapse), `effect.exile_artifact` (Vehicle synonym on Ray of Ruin), `effect.look_at_top_n` (reveal-N variant on Ojer Kaslem), `condition.cares_noncreature_spell` (instant/sorcery on Ojer Pakpatiq), `condition.cares_tokens` (creation-replacement on Ojer Taq), `condition.descend` (admit "number of times you descended this turn" on The Mycotyrant), `trigger.creature_dies` (admit plural subject), `condition.cares_high_power` (Power 4 frame), `effect.mill` (mana-value-N mill frame on The Ancient One), `effect.tuck_to_library` (Unlucky Drop), `effect.animate_land` (pronoun "It becomes a 0/0..." on Tendril of the Mycotyrant), `trigger.creature_leaves_battlefield` (exile-from-battlefield route on Market Gnome), `effect.reanimate` (reversed-clause order), `effect.explore` (exclude trigger frame on Merfolk Cave-Diver + Nicanzil), `effect.counterspell` (drop `\bability\b` in alternation; Tishana retags as appropriate), `effect.pacify` (admit "enchanted permanent can't attack or block" on Petrify), `effect.ramp_nonland` (admit "put a land card from your hand onto the battlefield" on Spelunking + Nicanzil).

8. **[narrow] `pipeline/rules/effect.targeted_discard.ts`** — admit "target opponent exiles a card from their hand" (hand-disruption-via-exile shape). Card cured: Skullcap Snail.

9. **[narrow] `pipeline/rules/effect.grants_{haste,trample,lifelink,deathtouch,first_strike,double_strike,reach,...}.ts`** — Frame (c) admit tribal subjects (`other <Tribe>s you control have <kw>`); Frame (e) admit singular `with <kw>` (currently requires `with [...], <kw>` or `with [...] and <kw>`). Cards cured: Palani's Hatcher (`grants_haste`), Tendril of the Mycotyrant (`grants_haste`).

10. **[new-rule] `pipeline/rules/trigger.upkeep.ts`** — pattern `at the beginning of (your|each|target player's) upkeep`. Forward `pairsWith: ['effect.life_changed', 'effect.draws_or_discards', 'effect.mill', 'condition.descend']`. Cards in batch: The Everflowing Well // The Myriad Pools, Tithing Blade // Consuming Sepulcher. Ship gate: `--pairings ≥80%` of audited cards.

11. **[new-rule] `pipeline/rules/trigger.landfall.ts`** — pattern `when(?:ever)? a land[\w\s]*? enters`. Forward `pairsWith: ['condition.cares_lands', 'effect.ramp_nonland', 'effect.create_creature_token']`. Cards in batch: Twists and Turns // Mycoid Maze. Ship gate: `--pairings ≥80%`.

12. **[new-rule] `pipeline/rules/condition.cares_low_power.ts`** — mirror `condition.cares_high_power`; check N≤2 and "or less". Forward `pairsWith: ['effect.grants_stat_buff', 'effect.create_creature_token']`. Card in batch: Unstable Glyphbridge // Sandswirl Wanderglyph.

### Deferred (out of scope this PR)

13. **[defer]** Vito's Inquisitor anaphoric "it gains menace" — `effect.gains_keyword_self_conditional` requires a gating connector (`as long as|while|if`) and `SELF_SUBJECT` alternation that excludes bare "it"; Vito's "until end of turn" temporary pump matches neither. Accept the 1-card FP; revisit if a 2nd card surfaces (sentence-scoped anaphor resolution is out of regex scope).

14. **[defer]** `effect.stifle` dedicated tag — narrowed `effect.counterspell` to `\bspell\b` in item 7 resolves Tishana retag. Author dedicated `effect.stifle` only if a 2nd ability-counter card surfaces.

15. **[defer]** `condition.cares_counters` (non +1/+1), `effect.has_defender`, `effect.cheat_into_play`, `condition.cast_from_graveyard` broadening, Millennium Calendar pronoun-self sacrifice — single-card or no-consumer.

16. **[defer]** `condition.cares_artifacts.pairsWith` wiring to artifact producers (`create_treasure`, `create_clue`, `create_food`, `create_map`, `trigger.another_artifact_etb`) — flag for v0.14.2 follow-up; this PR broadens the rule only.

17. **[defer]** `condition.cares_exile_pile → effect.exile_from_graveyard` pairings — flag for v0.14.2.

18. **[defer]** Everflowing Well "becomes a copy of that spell" — intentional prev-batch `clone_in_place` exclusion; spell-copy belongs to `effect.copy_spell` family.

### Implementation notes for the coding agent

- TDD per rule: write `.test.ts` cases (positives + negatives) BEFORE editing the rule file, using the exact normalized text from `node /Users/Dada/.claude/skills/mtg-graph-card-tag-audit/card_lookup.mjs "<Card>" --normalized`.
- Bump `RULE_VERSION` in `pipeline/catalog.ts` to `'v0.14.1'` as the FINAL step before final commit; do not bump until items 1–12 all green.
- Run `npm test` after every item (or at minimum after each cluster).
- For item 7 long-tail, group into one commit per logical sibling family (e.g. all `effect.destroy_*` together, all `effect.grants_*` together) — easier to revert if one regresses.
- Items 10–12 (new rules) must include `tagDef` with `pairsWith` populated AND colocated `.test.ts` per `CLAUDE.md` convention. If the coverage CLI shows --pairings <80% for a new rule, defer that single rule and ship the rest.
- After implementation, move the resolved per-card entries from `CARD_ISSUES.md` to `CARD_ISSUES_RESOLVED.md` (matching the existing pattern there).

### Skill-improvement notes (for the orchestrator to apply post-implementation)

Reviewer's `/tmp/audit-batch/reviewer-report.md` lists ~10 suggestions for the `mtg-graph-card-tag-audit` skill. Top priorities mentioned during strategy: (a) explicitly list `trigger.another_creature_etb` self-leak as a recurring pattern in the skill's "Recurring patterns" section; (b) explicitly list typed-sacrifice edict/trigger leak; (c) explicitly list manland self-animation FPs on `grants_evasion`/`cares_deathtouch`; (d) remind agents that Craft's parenthetical cost reminder is stripped pre-tag, so its content cannot be the evidence for a "missing" claim.
