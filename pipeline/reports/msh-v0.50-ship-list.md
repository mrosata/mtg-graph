# MSH Batch — APPROVED Ship List (v0.50.0)

Verdicts settled by dual review (A pragmatic / B skeptical) + tiebreaker with empirical checks. The implementation agent applies these EXACTLY — no re-litigating verdicts. TDD per rule: add regression rows FIRST (watch fail), then edit rule, watch pass. Run `npm run test:pipeline` after every ~5 items. All regexes below were validated by reviewers against the real files — but reconcile each against the actual pattern structure in the file (adapt variable names/frames as needed, preserving intent).

## New rule files (3)

**S1. `pipeline/rules/effect.connive.ts`** (+ `.test.ts`)
- tagDef: tagId `effect.connive`, effect axis, description ~"Connives — draws a card, then discards a card, putting a +1/+1 counter on the creature if a nonland card was discarded." pairsWith: `['trigger.card_drawn_discarded', 'condition.cares_plus_one_counter']`.
- rule: text match `/\bconnives?\b/` plus `card.keywords?.includes('Connive')` if the Rule shape supports card access (mirror `effect.has_cycling.ts`).
- nearMiss: `{ anchors: ['connive'], proximity: ['draw', 'discard', 'counter'], window: 6 }`
- Tests: positives — "when this creature enters, it connives." (A.I.M. Scientists), "whenever you cast a black spell from your hand, __self__ connives." (Baron Helmut Zemo), "at the beginning of combat on your turn, target creature you control connives." (Leader); negatives — 3 unrelated texts (e.g. "draw a card, then discard a card" without the keyword must NOT match this tag).

**S2. `pipeline/rules/effect.has_extort.ts`** (+ `.test.ts`)
- tagDef: tagId `effect.has_extort`, description ~"Has extort — whenever you cast a spell, may pay {W/B} to drain each opponent for 1." pairsWith: `['condition.cares_lifegain', 'condition.cares_lifeloss']`.
- rule: keyword-anchor, mirror `effect.has_cycling.ts` (`card.keywords.includes('Extort')`, fallback text `/\bextort\b/`).
- Cards: The Kingpin of Crime, Life Insurance, Crypt Ghast.
- Tests: 3 positives ("extort" keyword line variants) + 3 negatives (e.g. "extortion" should not match — use word boundary).

**S3. `pipeline/rules/effect.tutors_subtype.plan.ts`** (+ `.test.ts`) — standalone file, do NOT add 'plan' to THEME_SUBTYPES (would FP cares_subtype.plan on plan-counter cards).
- tagDef: tagId `effect.tutors_subtype.plan`, description ~"Searches the library for a Plan card." pairsWith: `['condition.controls_plan']`.
- rule: `/search(?:es)?\s+[^.]{0,40}?library for (?:a |an )?[^.]{0,40}?\bplan cards?\b/` (mirror effect.tutors_subtype.ts frame).
- Positive: "search your library for a plan card, reveal it, put it into your hand, then shuffle." (The Masters of Evil). Negatives incl. "put a plan counter on this enchantment".

## Infra fixes (2)

**S4. `pipeline/normalize.ts` — replaceSelfReferences word-boundary bug** (root cause of Hercules missing `condition.power_up`)
- Name segments (e.g. "Power" from "Hercules, Prince of Power") are substring-replaced without boundaries, corrupting "Power-up" → "__self__-up".
- Fix at ~line 58: build the segment regex with guards: `new RegExp('(?<![\\w-])' + escaped + '(?![\\w-])', 'gi')`.
- Regression test (normalize's test file): normalizing Hercules' oracle text with name "Hercules, Prince of Power" preserves "power-up —" and still replaces standalone name references.
- NOTE: global normalization change — expect small artifact-wide diffs; the full test suite + coverage check must stay green.

**S5. `pipeline/tag-expansion.ts` — suppress typed-child expansion for token-only destroy evidence** (Ruinous Wrecking Crew FP: "destroy target token" fanning out to destroy_land/planeswalker/etc.)
- In the childType expansion branch (~lines 40-44), skip typed children when the evidence names only tokens: `if (/\btokens?\b/.test(evidence) && !/\bpermanents?\b/.test(evidence)) continue;` — adapt to the actual code shape there (there is existing non-type suppression to sit alongside).
- Keep `effect.destroy_permanent` parent tag itself.
- Regression: a test asserting "destroy target token." expands to destroy_permanent but NOT destroy_land (find where expansion is tested — tag-expansion tests or destroy_permanent tests).

## Rule broadenings

**S6. `condition.cares_hand_size`** — add pattern `/\b(?:you have |target player has )?no maximum hand size\b/`. Positive: "you have no maximum hand size." (Ms. Marvel). (The quoted base-power text is stripped by stripQuotedAbilities — do NOT try to match it.)

**S7. `condition.cares_graveyard`** — add copy-source-from-graveyard arm: `/\b(?:becomes? a )?cop(?:y|ies) of [^.]{0,60}?cards? in (?:a|your|target|any) graveyard\b/`. Positive: Taskmaster "...becomes a copy of up to one target creature on the battlefield or creature card in a graveyard...". Must NOT reintroduce Animate Dead ("enchant creature card in a graveyard") — keep/verify that negative row.

**S8. `effect.has_activated_ability`** — PROSE_ACTIVATED_PATTERN filler `{0,80}` → `{0,120}` (~line 62). Positive: Zemo's "boast — exile any number of black cards from your graveyard with fifteen or more black mana symbols among their mana costs: copy those exiled cards."

**S9. `effect.grants_evasion`** — TRIGGERED_SELF_BUFF strip (~lines 93-96) wrongly eats clauses where the trigger subject is ANOTHER creature you control ("whenever a creature you control attacks alone, it gains first strike and menace"). Guard the gate so it only strips when the subject is self. Suggested: in the "it"-subject branch replace the filler with `(?:(?!\b(?:a|another|each|target|one or more)\s+creatures?\b)[^.])*?`. Regression BOTH directions: Black Widow Double Agent text now matches (menace granted to another creature); existing self-trigger negatives (e.g. Rot Farm Mortipede-style rows) still stripped.

**S10. `effect.exile_creature`** — add chosen-creature anaphor arm: `/\bexile (?:a |an )?[^.]{0,60}?\bthe chosen creature\b(?!\s+from)/`, subject to the existing FLICKER_TAIL suppression. Positive: Cloak and Dagger "you may exile a nonland card from their hand or the chosen creature until cloak and dagger leave the battlefield." Negative: Thor's "exile up to one target nontoken artifact or creature, then return that card to the battlefield tapped" (blink — stays suppressed).

**S11. `effect.counter_modified`** — two new arms:
- `/\bif (?:you|a player|an effect) would put one or more counters on [^.]{0,60}?,\s*(?:put|it puts)\b[^.]{0,80}?counters?\b[^.]{0,60}?\binstead\b/` (Doc Samson replacement-amplifier; also fixes Doubling Season)
- `/\bgive [^.]{0,60}?\banother counter of that kind\b/` (Powerful Broker)

**S12. `effect.proliferate`** — add functional comp-rules arm (keyword absent): `/\bfor each kind of counter on (?:target|each|a|any) (?:permanent or player|player or permanent|permanent|player)\b[^.]{0,80}?\banother counter of that kind\b/`. Positive: Powerful Broker. Footprint exactly 1 card.

**S13. `effect.plus_one_counter`** — (a) pattern-1 tail: allow multi-word counter names in "+1/+1 counter and a X counter" conjunctions (current tail only admits single-word counter kinds — e.g. "double strike counter" breaks it). Positive: Quicksilver "put a +1/+1 counter and a double strike counter on __self__". (b) new arm `/\bput (?:it|them|that card) onto the battlefield with (?:a |an |\d+ |x )?(?:additional )?\+1\/\+1 counters?/`. Positive: Vision Quest.

**S14. `condition.cares_plus_one_counter`** — add: `/\byou(?:'ve| have) put (?:a |an |\d+ |one or more )?\+1\/\+1 counters? on\b/` and `/\bwhenever you put (?:a |an |\d+ |one or more )?\+1\/\+1 counters? on\b/`. Positives: Beast, Kid Loki, Invisible Woman texts (see msh-fix-groups.md FG-11).

**S15. `condition.cares_artifacts`** — add `/\babilit(?:y|ies) you control from an artifact source\b/`. Positive: Scientist Supreme. Do NOT add anything for Iron Man Armor (quoted text) or Tony Stark (selector frames — intentionally excluded).

**S16. `effect.grants_keyword`** — two fixes:
- Frame (b) filler `[^.]{0,50}?` → `[^.]{0,80}?` (~line 50). Positive: Kid Loki "each creature you control that you've put one or more +1/+1 counters on this turn has hexproof" → grants_hexproof.
- Frame (i) `put a ${kw} counter` → `put (?:a|an) ${kw} counter` (~line 158). Positive: Claim the Kingdom "put an indestructible counter on target creature you control" → grants_indestructible.

**S17. `effect.draws_or_discards`** — two arms:
- add `instead ` to the leadin connector set (~line 40). Positive: Leader "if a creature you control would connive, instead you draw a card, then that creature connives."
- self-discard-cost arm `/\bdiscard this card\b(?=[^.]{0,80}:)/`. Positive: The Masters of Evil "{1}{b}, discard this card: search your library...". (Verified footprint 12 cards, 10/10 precision sample.)

**S18. `effect.amplifies_damage_or_lifeloss`** — generalize the "double all damage" pattern (~line 46) to admit specific subjects: `/\bdouble all damage (?:that )?[^.]{0,80}? would deal\b/`. Positive: Mjölnir "double all damage equipped creature would deal." Verify existing positives (Collective Inferno) still match.

**S19. `effect.control_change`** — GAIN_CONTROL (~line 17): insert `(?:up to (?:one|two|three|\d+) )?` after `control of `. Positive: The Super Hero Civil War "gain control of up to two target creatures with total mana value 6 or less...". Verify DONATION_SCRUB unaffected.

**S20. `effect.ramp_nonland`** — add arm `/\btarget player [^.]{0,60}?searches their library for [^.]{0,40}?basic (?:land|plains|island|swamp|mountain|forest)[^.]{0,80}?onto the battlefield\b/`. Positive: Restorative Technique. Must NOT match opponent-compensation fetches ("its controller may search" — Assassin's Trophy shape).

**S21. `effect.amplifies_triggers` AND `condition.cares_activated_abilities`** — add `/\bcopy target activated or triggered ability\b/` to both rules. Positives: Echo, Scientist Supreme.

**S22. `trigger.permanent_leaves_battlefield`** — LTB_VERB (~line 26) += `|is returned to its owner'?s hand`; remove `nonland` from the exclusion lookahead (~line 29). FLIP the explicit negative test row ("nonland permanent ... must NOT match") to positive WITH a comment citing the v0.15 destroy_permanent precedent ("nonland permanent is functionally universal"). Positive: Justice "whenever another nonland permanent you control is returned to its owner's hand".

**S23. `condition.cares_cards_drawn_this_turn`** — broaden the ordinal frame's subject (~line 34): `/\b(?:you draw your|(?:a player|each player|an opponent) draws (?:their|his or her)) (?:first|second|third|fourth|fifth|\d+(?:st|nd|rd|th)) card each turn\b/`. Positives: King T'Challa "whenever a player draws their second card each turn"; keep Kid Loki matching.

**S24. `trigger.tapped_or_untapped`** — passive arm (~line 25) alternation → also admit plural: `(?:becomes? tapped|becomes? untapped|is tapped|is untapped|are tapped|are untapped|enters tapped|enters untapped)`. Positive: Rewrite History "whenever one or more creatures you control become tapped".

**S25. `effect.untap`** — SELF_TRIGGER_PRONOUN subject (~line 82) → `(?:this creature|equipped creature|enchanted creature)`; plus third arm `/\bwhenever a creature you control becomes tapped\b[^.]{0,80}?,\s*untap it\b/`. Positive: S.H.I.E.L.D. Spy Kit "whenever equipped creature attacks alone, untap it and scry 1."

**S26. `effect.grants_stat_buff`** — two arms:
- `/\beach (?:other )?[a-z]+(?: you control)? gets? \+(?:\d+|x)\/\+(?:\d+|x)/` (Captain America Wings of Freedom "each other hero you control gets +x/+x")
- `/\bdouble (?:its|that creature'?s|target creature'?s) power and toughness\b/` (World War Hulk) — note the stretch in the tagDef description if it currently says "+N/+M" only.
- Do NOT add flat self-buff forms ("he gets +2/+0", "__self__ gets +4/+4") — intentional exclusion, documented in the file.

**S27. `effect.debuff_minus_n`** — tagDef DESCRIPTION only (~line 10): → "Gives creatures -N/-N — one-shot or static/continuous (can kill via toughness ≤ 0)." No regex change, no test change (M.O.D.O.K. already matches; this legitimizes it).

**S28. `effect.copy_spell`** — add arm `/\bcop(?:y|ies) (?:those|the) (?:exiled )?cards?\b[^.]{0,40}?(?:\.\s*|,\s*then\s+)[^.]{0,60}?\bcast (?:the |that |up to \w+ of the |any number of the )cop(?:y|ies)\b/`. Positives: Baron Helmut Zemo "copy those exiled cards. you may cast up to three of the copies without paying their mana costs."; Surge to Victory.

**S29. `effect.create_creature_token`** — Pattern 3 (copy-token frame, ~line 39): extend the evidence span through the token-typing continuation so `metadata.creatureTypes` extraction sees "...if the token isn't a creature, it becomes a 2/2 robot villain creature in addition to its other types". Tiebreaker-validated shape:
```
new RegExp(`${OC}\\bcreates?\\s+[^.]{0,80}?tokens?\\s+that(?:\\s+(?:is|are)|['’]s)\\s+(?:a\\s+)?cop(?:y|ies)\\s+of\\s+(?:it|them|__self__|this creature|target creature|that creature|those creatures)(?:[^.]{0,40}\\.\\s*if the tokens? (?:isn't|aren't) (?:a )?creatures?, (?:it|they) becomes? (?:a |an )?(?:[\\w\\/\\-]+ ){0,5}?creatures?)?`)
```
Adapt to the file's actual Pattern 3. Test: Ultron's normalized text yields creatureTypes containing "villain".

**S30. `condition.cares_tribe`** — typeGrantPattern subject slot (~line 75): `enchanted|equipped` → `(?:enchanted|equipped|that)\s+creature`. Positive: Thunderbolts Conspiracy "that creature is a hero in addition to its other types." → cares_tribe.hero. Existing self-typing negatives (Skyknight Squire "it", Superior Spider-Man "he's") must stay negative.

## Finalization
- Bump `RULE_VERSION` in `pipeline/catalog.ts` → `v0.50.0`.
- Bump `shared/version.ts` if that's where the release version lives (match repo precedent from v0.49.0 commit).
- `npm run test:pipeline` full pass; `npm run rule:coverage -- --pairings` must resolve all pairsWith (3 new rules!).
- Leave the working tree DIRTY (no commit) — a verifier reviews the diff first.

## REJECTED (do not implement — for the commit body)
- FG-26 has/grants_first_strike on double strike: intentional superset design (metadata.doubleStrike).
- FG-31 opponent-actor token creation (The Sentry): intentional OPPONENT_CREATES exclusion (v0.14.9 controller-leak fix).
- FG-33 quoted-grant ability internals (Iron Fist): stripQuotedAbilities policy.
- FG-5 Zemo half (Boast cost as cares_graveyard): selector/cost frame, covered by exile_from_graveyard.
- FG-8 Thor half (exile_creature/exile_artifact): FLICKER_TAIL blink suppression working as designed.
- FG-12 Iron Man Armor (quoted) + Tony Stark (selector frames) halves.
- FG-25 flat self-buffs (Luke Cage, Super-Skrull, Yellowjacket): owned by a future has_stat_buff axis.
- FG-30 new creates_tribe_token family: redundant — metadata.creatureTypes + graph gate already emit producer edges.
- Super-Adaptoid grants_haste FP claim: v0.21.0 self-conditional design.
- Mjölnir board_wipe FP claim: rejected v0.49.0.

## Known follow-up (log, don't fix now)
- Grants-axis opponent-actor leak: The Sentry gets grants_evasion/grants_indestructible from a token granted to the OPPONENT (create_* rules have the actor guard; grants_* token frames don't).
