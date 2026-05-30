# PR1 Coding Report (v0.13.4 — precision tightening)

## Items completed

All three items from the agreed plan landed:

- **Item 1: Normalize-layer quote-strip pre-pass** — Added `stripQuotedAbilities()` to `pipeline/normalize.ts`, wired into `normalizeOracleText()` between reminder-strip and self-reference replacement. Strips paired double quotes (`"..."` and curly `“...”`). Single quotes intentionally NOT stripped — they are almost always contractions / possessives in oracle text.
- **Item 2: Bounce family graveyard guard** — Added `(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)` guard to PATTERN_BROAD in all six bounce rule files (creature/artifact/enchantment/land/planeswalker) and to PATTERN_RETURN/BLINK in `effect.bounce_or_blink.ts`. Regression tests reference Coati Scavenger's actual normalized oracle text.
- **Item 3: 13 sub-tweaks** — All 13 landed. Each with a regression test referencing the cited card's actual normalized oracleText (sourced via `card_lookup.mjs`):
  - (a) `effect.tap`: negative lookahead `(?!(?:digit|word|a|an) untapped)` to skip convoke-style cost frames (Guardian of the Great Door, Caparocti Sunborn, Fear of Exposure).
  - (b) `effect.fight` PATTERN_SHAPED: negative lookbehind `(?<!this |the |that |__self__\s)` to skip single-source damage frames (Dire Flail, Itzquinth).
  - (c) `effect.deals_damage`: `IT` lookbehind extended from `(?<=: )` to `(?<=: |, )` for modern ETB "When this <type> enters, it deals N damage" templates (Idol of the Deep King, Magmatic Galleon).
  - (d) `effect.pacify`: negative lookahead `(?![^.]{0,40}?(?:this turn|until end of turn))` to exclude one-shot combat tricks (Breeches, Eager Pillager). NOTE: this required FLIPPING two existing positive tests for "can't block this turn" to negatives — they were incorrectly classified.
  - (e) `effect.mill`: added `a|an` to NUM alternation (Inverted Iceberg).
  - (f) `effect.debuff_minus_n`: changed `[1-9]\d*\/-[1-9]\d*` → `[1-9]\d*\/-\d+` to allow `-N/-0` (Cogwork Wrestler). Flipped existing `-3/-0` negative test to positive.
  - (g) `effect.exile_from_graveyard`: (1) OWN_QUANTIFIED filler `[^:.—]+?` forbids colons/periods/em-dashes so it can't span activation separators (Fabrication Foundry); (2) FOREIGN_OR_GENERIC accepts `a single graveyard` / `target player's graveyard` (Digsite Conservator).
  - (h) `condition.cares_tribe`: stripFraming windows bumped `{1,7}` → `{1,12}` for long multi-color/multi-type token templates (Canonized in Blood's "white and black vampire demon creature token with flying").
  - (i) `trigger.attack_or_block`: added trailing `\b` to verb forms so participles inside noun phrases don't match (Contested Game Ball's "the attacking player").
  - (j) `trigger.card_drawn_discarded`: added `one or more (?:TYPE )?cards?` alternative (Inti, Seneschal of the Sun).
  - (k) `trigger.creature_dies`: post-creature filler `{0,4}` → `{0,10}` AND token class expanded to `[\w'+\/-]` to tolerate "+1/+1 counter on it" between "creature" and "dies" (Explorer's Cache).
  - (l) `condition.cares_exile_pile`: pattern 2 extended to accept `cards? (?:you own |owned by you )?exiled with (?:__self__|this <type>)` (Intrepid Paleontologist).
  - (m) `effect.tutors_basic_land`: NOUN class accepts typed basics — `lands?|plains|islands?|swamps?|mountains?|forests?` (Clay-Fired Bricks).

- **RULE_VERSION** bumped `v0.13.3` → `v0.13.4` in `shared/version.ts`.

## Items deferred / unchanged

None. All Item-1/2/3 work landed in scope.

## Test status

- `npm run test:pipeline`: **2031 tests passed, 171 files** (was 2002 before — net +29 new regression tests).
- `npm test` (full gate): pipeline + shared + 361 app tests + Vite production build all green.

## Coverage deltas (before vs after, all from rule:coverage --all)

Aggregate taggable coverage: **4368/4426 → 4370/4426 (+2 cards, both 98.7%)**.

### Tags with material precision tightening (counts dropped — FPs removed)

| Tag | Before | After | Delta | Notes |
|---|---|---|---|---|
| effect.has_activated_ability | 1005 | 968 | -37 | Quote-strip kills quoted granted-ability cost colons |
| trigger.attack_or_block | 389 | 355 | -34 | Verb \b stops participle matches |
| effect.bounce_creature | 94 | 74 | -20 | Coati-style graveyard recursion no longer FPs |
| effect.bounce_or_blink | 25 | 7 | -18 | Same |
| effect.add_mana | 439 | 422 | -17 | Quote-strip on granted Treasure abilities etc. |
| effect.ramp_nonland | 217 | 200 | -17 | Same |
| effect.pacify | 20 | 6 | -14 | "Can't block this turn" no longer counts as lockdown |
| effect.tap | 110 | 97 | -13 | Convoke-cost frames excluded |
| effect.bounce_artifact | 54 | 34 | -20 | Coati-style |
| effect.bounce_enchantment | 49 | 29 | -20 | Coati-style |
| effect.bounce_planeswalker | 49 | 29 | -20 | Coati-style |
| effect.bounce_land | 26 | 8 | -18 | Coati-style |
| effect.grants_stat_buff | 612 | 586 | -26 | Quote-strip on granted "+N/+N" inside token bodies |
| effect.sacrifice_artifact | 173 | 166 | -7 | Quote-strip |
| effect.fight | 39 | 35 | -4 | Lookbehind on this/the/that/__self__ |
| trigger.damage_dealt | 108 | 95 | -13 | Quote-strip on granted "Whenever ... deals damage" |
| trigger.spell_cast | 201 | 190 | -11 | Quote-strip |
| effect.reanimate | 143 | 136 | -7 | Quote-strip |
| effect.life_changed | 383 | 371 | -12 | Quote-strip |
| effect.draws_or_discards | 664 | 655 | -9 | Quote-strip |
| effect.create_treasure | 82 | 80 | -2 | Quote-strip on Treasure-token granted ability |
| condition.cares_lands | 144 | 139 | -5 | Quote-strip removes "land" mentions inside granted abilities |
| condition.cares_noncreature_spell | 107 | 97 | -10 | Quote-strip |
| condition.cares_tribe.human | 12 | 8 | -4 | Wider stripFraming kills more token-frame FPs |
| condition.cares_tribe.vampire | 8 | 6 | -2 | Canonized-in-Blood-style |
| condition.cares_tribe.zombie | 11 | 9 | -2 | Same |
| condition.cares_tribe.rat | 18 | 17 | -1 | Same |

### Tags with precision broadening (counts went up — true positives picked up)

| Tag | Before | After | Delta | Notes |
|---|---|---|---|---|
| effect.deals_damage | 248 | 309 | +61 | `, it deals` lookbehind picks up modern ETB templates |
| effect.debuff_minus_n | 87 | 108 | +21 | -N/-0 power-only debuffs |
| effect.mill | 97 | 111 | +14 | "mill a card" / "mill an X card" |
| condition.cares_exile_pile | 12 | 23 | +11 | "cards you own exiled with this creature" |
| effect.exile_from_graveyard | 54 | 60 | +6 | "from a single graveyard" / "from target player's" |
| effect.tutors_basic_land | 64 | 70 | +6 | "basic Plains/Island/Swamp/Mountain/Forest" |
| trigger.card_drawn_discarded | 30 | 35 | +5 | "one or more cards" batched form |

### Per-card spot checks (audit cards now correct)

- **Coati Scavenger**: was 9 tags incl. 6 false bounce_* tags. Now: `condition.cares_graveyard`, `effect.return_from_graveyard_to_hand`, `trigger.self_etb` (3 correct).
- **Kitesail Larcenist**: was 7 tags incl. 4 quoted-ability FPs (`add_mana`, `has_activated_ability`, `ramp_nonland`, `sacrifice_artifact`). Now: 3 (intrinsic keywords + ETB trigger).
- **Guardian of the Great Door / Caparocti / Fear of Exposure**: `effect.tap` FP removed.
- **Dire Flail**: `effect.fight` FP removed.
- **Idol of the Deep King / Magmatic Galleon**: `effect.deals_damage` now correctly fires.
- **Breeches, Eager Pillager**: `effect.pacify` FP removed.
- **Inverted Iceberg**: `effect.mill` now fires on "mill a card".
- **Cogwork Wrestler**: `effect.debuff_minus_n` now fires.
- **Fabrication Foundry**: `effect.exile_from_graveyard` FP removed.
- **Digsite Conservator**: `effect.exile_from_graveyard` now fires.
- **Canonized in Blood**: `condition.cares_tribe.vampire` FP removed.
- **Contested Game Ball**: `trigger.attack_or_block` FP removed.
- **Inti, Seneschal of the Sun**: `trigger.card_drawn_discarded` now fires.
- **Explorer's Cache**: `trigger.creature_dies` now fires.
- **Intrepid Paleontologist**: `condition.cares_exile_pile` now fires.
- **Clay-Fired Bricks**: `effect.tutors_basic_land` now fires.

## Gotchas

1. **Tests already had wrong positives that needed flipping.**
   - `effect.pacify` had `'target creature can't block this turn'` as a positive — incorrect per the Pacifism semantic (permanent lockdown vs one-turn combat trick). Flipped to negative.
   - `effect.debuff_minus_n` had `'target creature gets -3/-0'` as a negative — incorrect (it's still a debuff, just power-only). Flipped to positive.
   - This suggests prior rule authors encoded some judgment calls in tests that conflict with downstream consumer-rule expectations. Worth a broader pass during the v0.14.0 grants_* refactor.

2. **The spec's "require target before tapped noun" for effect.tap would have broken Colossification.**
   - "Tap enchanted creature" is a legitimate tap effect that doesn't use the word "target". I used a different fix: negative lookahead on the bare-count pattern `tap N untapped` (where N is a digit/word number) — this catches the convoke cost shape without breaking the enchanted/equipped/etc. forms.

3. **Quote-strip caused larger coverage shifts than feared but no test regressions.**
   - The audit warned this could be too invasive. In practice the existing pipeline tests use raw-text strings without quoted granted abilities — those tests pass through unchanged. The 2026-card pipeline tests all stayed green.
   - The ~37-card drop in `effect.has_activated_ability` is purely FP removal: a Treasure-granting card like Kitesail Larcenist shouldn't be tagged as "has an activated ability" just because the Treasure it grants has one.

4. **Coati's normalized oracle text includes "descend 4 —" as the lead-in.**
   - The em-dash made the inline test strings non-obvious to construct. I used the actual normalized text (em-dash + space-period punctuation preserved) — this is essential for tests to match real pipeline behavior.

5. **`trigger.creature_dies` regex needed BOTH a window bump AND a character-class expansion.**
   - The spec said just "raise post-creature filler cap from `{0,4}` to `{0,10}`". But the `[\w']+` token class couldn't match "+1/+1" (because of the `+` and `/`). Had to also widen the class to `[\w'+\/-]+`. Worth flagging in the audit skill template that character-class expansion may be needed alongside window bumps.

## Skill-improvement suggestions for `mtg-graph-card-tag-audit`

1. **Add a "spec normalization" step that converts the actual normalized oracle text into the expected test-string format.** When proposing a regression test, the audit currently says "use the card's actual normalized oracleText" but doesn't auto-render it. I had to manually massage em-dashes, "__self__" substitution, lowercase, period spacing, etc. A helper that prints `normalizeOracleText(card.oracleText, card.name)` would eliminate transcription errors.

2. **Flag existing tests that contradict the audit verdict.** Before recommending a fix that requires flipping a positive to a negative (or vice versa), the audit should call out: "WARNING: `effect.pacify.test.ts:14` currently asserts the opposite of the recommended fix. Flipping it is part of the change." I caught these by reading test files but it slowed me down.

3. **For regex tightening that's actually a character-class problem (not a window problem), say so explicitly.** Item (k) for `trigger.creature_dies` is framed as "raise post-creature filler cap from `{0,4}` to `{0,10}`, tolerating '+1/+1 counter on it' between creature and dies". The "tolerating" part is the character class. Make this a separate bullet so implementers don't miss it.

4. **For the convoke / additional-cost class of FPs in `effect.tap`, surface the alternative "require target" vs "block bare-count untapped" trade-off in the audit so the fix author doesn't have to derive it.** The "preferred: require target" suggestion broke Colossification — the audit should note which existing positives use non-target subjects so the fix author can spot the trade-off up front.

5. **Card-name disambiguation for substring matches.** `node card_lookup.mjs "Breeches"` returned "Card not found" because of ambiguous matches. The lookup is helpful when it picks one (e.g. "Inti" → "Inti, Seneschal of the Sun") but should always print the chosen match's full name so the test author knows what string was used. (It does this in some cases via "(matched on substring → X)" but not consistently.)

6. **Pipeline tests use the post-normalize text, not the raw Scryfall text.** The audit skill's `card_lookup.mjs` shows the raw oracle text. For regression tests we need the normalized form (lowercased, `__self__` substituted, newlines collapsed, parens stripped, etc.). Add a `--normalized` flag to the lookup that emits the normalized string verbatim, ready to paste into a test.

## Files touched

Pipeline:
- `pipeline/normalize.ts` (quote-strip)
- `pipeline/normalize.test.ts` (quote-strip tests)
- `shared/version.ts` (RULE_VERSION bump)
- 6 bounce rule files + their tests (item 2)
- 13 misc rule files + their tests (item 3 a–m)

Artifact:
- `app/public/data/cards-standard.json` rebuilt (this is a build artifact; not staged).

No app code, types, or store changes.
