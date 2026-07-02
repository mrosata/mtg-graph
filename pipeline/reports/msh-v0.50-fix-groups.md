# MSH Remaining Fix Groups (post-v0.49.0)

Consolidated from `audit-consensus.md` + MSH entries in `CARD_ISSUES.md`, reconciled against what commit `5edbe7f` (v0.49.0) already shipped. Every card+tag below was verified MISSING (or still-present FP) in the current v0.49.0 artifact (`app/public/data/cards-standard.json`).

Context the reviewers must respect:
- v0.49.0 deliberately NARROWED `condition.cares_tribe` so tribe names inside token-creation text do NOT fire the tribe-care tag (Pattern 3.6: The Sentry/villain, White Tiger/cat were FPs). Any proposal to re-add tribe tags for token producers contradicts that shipped decision and needs a different mechanism if accepted.
- Project design decision v0.21.0: non-evasion self-conditional keyword grants intentionally stay on `effect.grants_<kw>`; there is also an `effect.gains_keyword_self_conditional` tag. Do not re-flag those as FPs.
- Oracle text is normalized before matching: lowercased, reminder text `(...)` stripped, card's own name → `__SELF__`.
- `effect.grants_keyword` is a parametric rule generating `effect.grants_first_strike`, `effect.grants_hexproof`, `effect.grants_indestructible`, etc. `condition.cares_tribe` and `effect.tutors_subtype` are parametric over `pipeline/themes.ts` lists.

---

## FG-1 — NEW RULE: `effect.connive` (keyword-anchor)
**Fix type:** new rule file `pipeline/rules/effect.connive.ts`
**Cards (11):** A.I.M. Scientists, Baron Helmut Zemo, Baron Strucker HYDRA Overlord, Kang Temporal Tyrant, Leader Super-Genius, M.O.D.O.K., Madame Masque, Red Room Recruit, Swordsman Sharp Scoundrel, Trickster's Stratagem, Villainous Hideout
**Evidence:** normalized text retains only the keyword/verb: "it connives", "__self__ connives", "target creature you control connives", "if a creature you control would connive"
**Sketch:** match `\bconnives?\b` (keyword + verb forms). Connive = draw + discard + conditional +1/+1 counter, so `pairsWith`: `trigger.card_drawn_discarded`, `condition.cares_plus_one_counter` (and consider `effect.draws_or_discards`-side pairings). Largest single theme gap in the set. Follow `nearMiss` convention.

## FG-2 — NEW RULE: Extort keyword-anchor
**Fix type:** new rule (e.g. `pipeline/rules/effect.has_extort.ts`)
**Cards:** The Kingpin of Crime ("extort" — reminder text stripped, so trigger/drain semantics invisible)
**Sketch:** keyword-anchor rule like `effect.has_cycling`. Decide tag id (`effect.has_extort`) and pairings (drain/lifegain payoffs, spell-cast triggers). Check how many Standard cards have extort (may be 1 — still worth it for MSC upcoming?).

## FG-3 — BROADEN `condition.cares_hand_size`
**Cards:** Ms. Marvel, Kamala Khan — "ms. marvel's base power is equal to the number of cards in your hand" (inside a quoted gains-grant) + "you have no maximum hand size"
**Sketch:** add "equal to the number of cards in your hand" pattern; consider "no maximum hand size".

## FG-4 — FIX `condition.power_up` miss
**Cards:** Hercules, Prince of Power — "power-up — {4}{g}: put a +1/+1 counter on __SELF__. he gains vigilance, indestructible, and haste until end of turn."
**Sketch:** every other MSH Power-up card matches; Hercules is the lone miss. Diagnose the regex (likely something about the sentence shape after the colon, or the reminder-strip interacting with the em-dash). Fix the root cause, don't special-case.

## FG-5 — BROADEN `condition.cares_graveyard`
**Cards:** Baron Helmut Zemo — Boast cost "exile any number of black cards from your graveyard with fifteen or more black mana symbols among their mana costs"; Taskmaster, Mercenary Mimic — "becomes a copy of up to one target creature on the battlefield or creature card in a graveyard"
**Sketch:** admit copy-source-from-graveyard targeting and quality-gated graveyard selection. Judge each card separately — Zemo may be adequately covered by `effect.exile_from_graveyard` (already tagged).

## FG-6 — BROADEN `effect.has_activated_ability`
**Cards:** Baron Helmut Zemo — "boast — exile any number of black cards from your graveyard...: copy those exiled cards..."
**Sketch:** ability-word-prefixed activated abilities with non-symbol costs. Note M.O.D.O.K.'s "mental organism — pay 3 life:" DOES match — figure out why Zemo's doesn't.

## FG-7 — BROADEN `effect.grants_evasion` (menace in conjunction)
**Cards:** Black Widow, Double Agent — "whenever a creature you control attacks alone, it gains first strike and menace until end of turn." (`effect.grants_first_strike` fires; evasion does not)
**Sketch:** the evasion rule misses menace when it appears second in a keyword conjunction ("gains X and menace").

## FG-8 — BROADEN `effect.exile_creature` (+ `effect.exile_artifact`) disjunction/indirect forms
**Cards:** The Mighty Thor, Jane Foster — "exile up to one target nontoken artifact or creature, then return that card..."; Cloak and Dagger, Entwined — "you may exile a nonland card from their hand or the chosen creature until cloak and dagger leave the battlefield"
**Sketch:** admit "artifact or creature" disjunction targets and "the chosen creature" anaphor. Thor also warrants `effect.exile_artifact`.

## FG-9 — BROADEN `effect.counter_modified`
**Cards:** Doc Samson, Super Psychiatrist — "if you would put one or more counters on a permanent you control, put that many plus one of each of those kinds of counters on that permanent instead."; Powerful Broker — "for each kind of counter on target permanent or player, give that permanent or player another counter of that kind."
**Sketch:** admit counter-replacement-amplifier and give-another-of-each-kind frames. Secondary question: should Powerful Broker get `effect.proliferate` (functionally identical to proliferate but doesn't use the keyword)? Judge tag-def fit.

## FG-10 — BROADEN `effect.plus_one_counter`
**Cards:** Quicksilver, Brash Blur — "put a +1/+1 counter and a double strike counter on __SELF__"; Vision Quest — "put it onto the battlefield with x additional +1/+1 counters on it"
**Sketch:** conjunction of counter kinds; "with X additional +1/+1 counters" ETB-with form.

## FG-11 — BROADEN `condition.cares_plus_one_counter`
**Cards:** Beast, Erudite Aerialist — "as long as you've put one or more +1/+1 counters on __SELF__ this turn, he has flying"; Invisible Woman, Sue Storm — "whenever you put one or more +1/+1 counters on one or more other heroes you control"; Kid Loki — "each creature you control that you've put one or more +1/+1 counters on this turn has hexproof"
**Sketch:** admit "you've put one or more +1/+1 counters on ... this turn" gates and "whenever you put ... +1/+1 counters on" triggers.

## FG-12 — BROADEN `condition.cares_artifacts`
**Cards:** Iron Man Armor — quoted grant "this creature gets +1/+1 for each artifact you control"; Scientist Supreme of A.I.M. — "copy target activated or triggered ability you control from an artifact source"; Tony Stark // The Invincible Iron Man — front: reveal artifact card to hand; back: "you may put an artifact card from your hand onto the battlefield" (MEDIUM confidence — tutor/cheat selection vs. true artifact-count payoff; judge tag-def fit)
**Sketch:** "for each artifact you control" (already? verify), "from an artifact source" gate. Tony Stark separately.

## FG-13 — BROADEN `effect.grants_keyword` static class-grant (hexproof)
**Cards:** Kid Loki — "each creature you control that you've put one or more +1/+1 counters on this turn has hexproof"
**Sketch:** admit "each creature you control that [qualifier] has <keyword>" static-grant frame in `buildGrantRegex`.

## FG-14 — BROADEN `effect.draws_or_discards`
**Cards:** Leader, Super-Genius — "if a creature you control would connive, instead you draw a card, then that creature connives."; The Masters of Evil — activation cost "discard this card"
**Sketch:** replacement-clause "instead you draw a card"; self-discard-as-cost "discard this card".

## FG-15 — BROADEN `effect.amplifies_damage_or_lifeloss`
**Cards:** Mjölnir, Hammer of Thor — "double all damage equipped creature would deal"
**Sketch:** admit "double all damage [subject] would deal" equipment frame.

## FG-16 — Plan tutor: `effect.tutors_subtype.plan` or broaden `condition.controls_plan`
**Cards:** The Masters of Evil — "search your library for a plan card, reveal it, put it into your hand, then shuffle."
**Sketch:** check `pipeline/themes.ts` THEME_SUBTYPES — if `plan` can be added, the parametric `effect.tutors_subtype` gets it for free and pairs with `condition.controls_plan`. Verify pairing wiring.

## FG-17 — BROADEN `effect.control_change`
**Cards:** The Super Hero Civil War — Saga I: "gain control of up to two target creatures with total mana value 6 or less for as long as this saga remains on the battlefield."
**Sketch:** admit "gain control of up to N target creatures" + "for as long as" temporal clause.

## FG-18 — FIX `effect.grants_indestructible` miss (indestructible counter)
**Cards:** Claim the Kingdom — "when you do, put an indestructible counter on target creature you control." (Captain Marvel, Earth's Protector with near-identical text DOES get the tag — diagnose the difference, likely the "when you do," prefix or sentence position)

## FG-19 — Land-ramp tag fit: Restorative Technique
**Cards:** Restorative Technique — "target player gains 2 life, then searches their library for a basic land card, puts it onto the battlefield tapped, then shuffles."
**Sketch:** `effect.tutors_basic_land` already fires. Consensus flagged missing `effect.ramp_nonland` — but READ that tag's def first (it may mean nonland mana sources, in which case this is a bad suggestion and the right call may be REJECT or a different land-to-battlefield ramp tag if one exists).

## FG-20 — BROADEN `effect.amplifies_triggers` + `condition.cares_activated_abilities`
**Cards:** Echo, Perceptive Prodigy — "{1}, {t}: copy target activated or triggered ability you control from a creature source."; Scientist Supreme of A.I.M. — "pay 2 life: copy target activated or triggered ability you control from an artifact source."
**Sketch:** admit "copy target activated or triggered ability" for both tags (check each tag's def for fit).

## FG-21 — BROADEN `trigger.permanent_leaves_battlefield`
**Cards:** Justice, Vance Astrovik — "whenever another nonland permanent you control is returned to its owner's hand, put a +1/+1 counter on justice."
**Sketch:** returned-to-hand IS leaving the battlefield. Judge whether this trigger axis intends zone-agnostic LTB; if so admit "is returned to its owner's hand" as an LTB frame.

## FG-22 — BROADEN `condition.cares_cards_drawn_this_turn`
**Cards:** King T'Challa // Black Panther — "whenever a player draws their second card each turn, you draw a card." (Kid Loki's "whenever you draw your second card" matches)
**Sketch:** admit "a player draws their second card" subject variant.

## FG-23 — BROADEN `trigger.tapped_or_untapped`
**Cards:** Rewrite History — "whenever one or more creatures you control become tapped"
**Sketch:** plural collective "creatures ... become tapped" (singular "becomes tapped" matches today).

## FG-24 — BROADEN `effect.untap`
**Cards:** S.H.I.E.L.D. Spy Kit — "whenever equipped creature attacks alone, untap it and scry 1."
**Sketch:** pronoun-object "untap it" in trigger bodies.

## FG-25 — BROADEN `effect.grants_stat_buff`
**Cards:** Captain America, Wings of Freedom — "each other hero you control gets +x/+x until end of turn"; World War Hulk — Saga III "double its power and toughness"; Luke Cage — "he gets +2/+0 and gains indestructible"; Super-Skrull — "{3}{g}: __self__ gets +4/+4 until end of turn"; Yellowjacket — "__self__ gets +1/+0 and gains lifelink"
**Sketch:** dynamic "+x/+x"; "double its power and toughness"; self-buff pronoun forms ("he gets", "__self__ gets" in activated/triggered bodies). FIRST check the tag def's scope (self vs other) — Iron Man, Master of Machines reportedly gets it for a self-buff, so self-buffs appear in-scope.

## FG-26 — NARROW `effect.has_first_strike` + `effect.grants_first_strike` (double-strike FP)
**Cards (FPs):** King T'Challa // Black Panther, Mockingbird Ace Agent, The Vision (has/grants firing on "double strike"), Quicksilver ("double strike counter")
**Sketch:** likely `(?<!double )first strike` style guard — BUT first check whether matching double strike is intentional (double strike rules-wise includes first-strike damage; there may be a deliberate design or test row). If intentional, verdict REJECT with the design note; if not, ship the guard on both has_ and grants_ variants.

## FG-27 — NARROW destroy_* expansion on "destroy target token"
**Cards (FP):** The Ruinous Wrecking Crew — "destroy target token." currently fires effect.destroy_creature, destroy_artifact, destroy_enchantment, destroy_planeswalker, destroy_land (all five) + destroy_permanent
**Sketch:** "token" as a destroy object should not expand to every permanent type. Recommend keeping `effect.destroy_permanent` only. Check `pipeline/rules/permanent-types.ts` / tag-expansion machinery.

## FG-28 — NARROW or re-scope `effect.debuff_minus_n`
**Cards (FP per tag-def):** M.O.D.O.K. — "creatures your opponents control get -1/-1" is a STATIC continuous debuff; tag def says "until end of turn"
**Sketch:** either require temporality in the match, or update the tag description to include static debuffs (cheaper, and arguably static mass-debuff is MORE useful to surface). Judge which serves users better.

## FG-29 — BROADEN `effect.copy_spell` (copy exiled cards)
**Cards:** Baron Helmut Zemo — "copy those exiled cards. you may cast up to three of the copies without paying their mana costs."
**Sketch:** check tag def — if copy_spell covers copying cards (not just spells on the stack), admit "copy those exiled cards".

## FG-30 — DESIGN QUESTION: tribal-token producers
**Cards:** Castle Doom, Construct a Cosmic Cube, Doctor Doom, HYDRA Troopers, Robot Domination, Ultron (Villain tokens), The Sentry (Villain token), White Tiger (Cat God token)
**Context:** v0.49.0 deliberately removed `condition.cares_tribe.<x>` from token-creation text. But a user building a Villain-tribal deck DOES want producers of Villain tokens to surface as interacting with Villain payoffs (e.g. The Masters of Evil's "+2/+1 to other Villains").
**Sketch:** if accepted, the mechanism should be a NEW producer-side parametric tag (e.g. `effect.creates_tribe_token.<tribe>` over THEME_TRIBES) whose tagDef `pairsWith` `condition.cares_tribe.<tribe>` — NOT a re-broadening of cares_tribe. Judge value vs. scope; it's the single highest-leverage relationship addition for MSH tribal play if shipped.

## FG-31 — POLICY: opponent-actor token creation
**Cards:** The Sentry, Golden Guardian — "target opponent creates the void, a legendary 5/5 black horror villain creature token..."
**Sketch:** should `effect.create_creature_token`/`effect.create_token` fire when an OPPONENT is the creating actor? The tags drive "token payoff" pairings — opponent-created tokens don't serve your token payoffs, but the card does put a token into play (relevant for cares_tokens-style interactions from the opponent's perspective, which the graph doesn't model per-player). Judge.

## FG-32 — JUDGE `condition.cares_tribe.hero` on type-granting text
**Cards:** Thunderbolts Conspiracy — "that creature is a hero in addition to its other types."
**Sketch:** type-GRANTING is arguably a Hero-tribal enabler (makes your reanimated Villains count for Hero payoffs). Judge whether cares_tribe should admit "is a <tribe> in addition to its other types".

## FG-33 — DEFER/JUDGE: quoted-grant ability internals
**Cards:** Iron Fist, Living Weapon — grants itself `"{t}: iron fist deals damage equal to his power to any other target"` (missing has_activated_ability, deals_damage per audit)
**Sketch:** consensus leaned "intentionally out of scope" (capabilities of granted abilities). Note Ms. Marvel/Iron Man Armor quoted grants DO need their host tags via other groups. Render a policy verdict: tag inside quoted grants or not — and be consistent with whatever FG-3/FG-12 decide for quoted text.

---

PRE-RESOLVED (do not review):
- Super-Adaptoid `effect.grants_haste` FP claim → REJECTED per v0.21.0 design (self-conditional keyword gains stay on grants_<kw>; `effect.gains_keyword_self_conditional` exists for the axis split).
- Mjölnir `effect.board_wipe` FP claim → REJECTED in v0.49.0 as working-as-designed (mass damage is a true positive per v0.14.9 intent).
