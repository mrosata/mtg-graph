# MSH Audit Consensus Report

**Set:** Marvel Super Heroes (MSH) — 281 cards  
**ruleVersion:** v0.48.0  
**Agents:** Agent 1 (15 cards flagged), Agent 2 (34 cards flagged), Agent 3 (40 cards flagged)  
**Date:** 2026-07-02

---

## 1. Strong Consensus — All 3 agents flagged same card + same tagId + same direction

### 1.1 Baron Helmut Zemo — missing `effect.exile_from_graveyard`

**All three agents flagged this.** The Boast ability reads "Exile any number of black cards from your graveyard…" — explicit graveyard exile in the non-reminder body of the card. The exile_from_graveyard rule almost certainly requires a "exile target … card from" framing and misses the "exile any number … from your graveyard" multi-exile variant used by Boast.

- Agent 1: flagged under "exile any number of black cards from your graveyard" — Boast-style multi-exile
- Agent 2: same, noting it's inside the activated ability clause
- Agent 3: same

**Confidence: HIGH.**

---

### 1.2 Baron Helmut Zemo — missing `condition.cares_graveyard`

**All three agents flagged this.** The Boast ability requires evaluating graveyard content ("with fifteen or more black mana symbols among their mana costs") before selecting targets. The rule likely requires more direct "care" language and misses Boast-gated graveyard selection.

- Agent 1: "selecting cards from the graveyard based on graveyard content"
- Agent 2: "activated ability targets GY content"
- Agent 3: "Boast targets cards in the graveyard as input"

**Confidence: HIGH.**

---

### 1.3 Ms. Marvel, Kamala Khan — missing `condition.cares_hand_size`

**All three agents flagged this.** Oracle text: "Ms. Marvel's base power is equal to the number of cards in your hand." The tag definition explicitly includes per-card-count scaling, and the rule likely requires "for each card in your hand" framing, missing "equal to the number of cards in your hand."

- Agent 1: flagged the scaling clause
- Agent 2: flagged the scaling clause
- Agent 3: flagged both the scaling clause and the "no maximum hand size" static line

**Confidence: HIGH.**

---

## 2. Majority Consensus — 2/3 agents flagged same card + same tagId + same direction

### 2.1 Baron Helmut Zemo — missing `effect.has_activated_ability` (A2, A3)

Boast is a conditional activated ability (cost: attacked this turn + once per turn). The rule likely requires a `{cost}:` cost pattern and misses Boast-style activations. A1 did not flag this specific tag but did flag the Boast ability's other issues. A2 and A3 both explicitly called out the missing tag.

**Confidence: HIGH.**

---

### 2.2 Beast, Erudite Aerialist — FP `effect.grants_evasion` (A2, A3)

Both agents agree this is a false positive. The card gives flying to **itself** conditionally ("if it has a +1/+1 counter on it, it gains flying until end of turn"), not to other creatures. The `effect.grants_evasion` tag covers cards that grant evasion keywords to other creatures or tokens. Self-conditional keyword gains should not fire this tag.

A1 did not review Beast.

**Nuance:** A3 additionally flagged missing `condition.cares_plus_one_counter` for the "+1/+1 counter" condition gate; A2 did not flag this secondary issue.

**Confidence: HIGH (FP).**

---

### 2.3 Black Widow, Double Agent — missing `effect.grants_evasion` (A2, A3)

Oracle: "it gains first strike and menace until end of turn." Both agents note that menace is a form of evasion covered by the `effect.grants_evasion` tag definition. The `effect.grants_first_strike` is already tagged; menace is not being picked up as evasion.

A1 did not review this card.

**Confidence: HIGH.**

---

### 2.4 Black Widow, Super Spy — missing `effect.cast_from_exile` (A2, A3)

Oracle: "you may cast the exiled nonland card until end of turn." Both agents flagged this as the canonical cast-from-exile pattern. The exile_from_library tag is also missing (see 2.5).

**Confidence: HIGH.**

---

### 2.5 Black Widow, Super Spy — missing `effect.exile_from_library` (A2, A3)

Oracle: "that player exiles cards from the top of their library." Both agents flagged the library-exile clause.

**Confidence: HIGH.**

---

### 2.6 Captain America, Super-Soldier — missing `condition.cares_tribe.hero` (A2, A3)

Oracle: "other Heroes you control have hexproof." Both agents flagged this as an explicit Hero-tribal payoff. Agent 3 noted Captain America, Wings of Freedom has the same tag for similar text; Super-Soldier should match too.

A1 did not review this card.

**Confidence: HIGH.**

---

### 2.7 Cloak and Dagger, Entwined — missing `effect.exile_creature` (A2, A3)

Oracle: "exile…the chosen creature until Cloak and Dagger leave the battlefield." Both agents flagged this as a temporary creature exile (Oblivion Ring pattern). A2 additionally flagged `effect.exile_from_battlefield`; A3 did not add that secondary tag.

**Confidence: HIGH.**

---

### 2.8 Doc Samson, Super Psychiatrist — missing `effect.counter_modified` (A2, A3)

Both agents flagged the missing counter-modification tag. The card's primary function is a static replacement that increases counter placement. A2 also flagged `effect.plus_one_counter` (A3 did not). Note: agents gave slightly different oracle text descriptions — A2 quotes a +1/+1-specific replacement while A3 describes a broader "each kind of counter" replacement. The underlying miss is agreed; the exact oracle text should be checked against the artifact.

**Confidence: HIGH for `effect.counter_modified`; MEDIUM for `effect.plus_one_counter` (single agent).**

---

### 2.9 Hercules, Prince of Power — missing `condition.power_up` (A2, A3)

Oracle contains the Power-up keyword ("Power-up — {4}{G}: Put a +1/+1 counter on Hercules…"). The `condition.power_up` tag was added for MSH Power-up cards but did not match Hercules. Both agents flagged the miss.

A1 did not review this card.

**Confidence: HIGH.**

---

### 2.10 Hex Magic — missing `effect.cast_from_exile` (A2, A3)

Oracle: "you may play cards exiled this way." Both agents flagged the canonical cast-from-exile pattern. The card exiles your hand then lets you play from exile until end of next turn.

**Confidence: HIGH.**

---

### 2.11 Invisible Woman, Sue Storm — missing `condition.cares_tribe.hero` (A2, A3)

Oracle: "Whenever you put one or more +1/+1 counters on one or more other Heroes you control…" Both agents flagged the Hero-tribal scoping of the trigger condition. A3 additionally flagged `condition.cares_plus_one_counter` for the counter clause; A2 did not.

**Confidence: HIGH for `condition.cares_tribe.hero`; MEDIUM for `condition.cares_plus_one_counter` (single agent, see §4).**

---

### 2.12 Iron Man Armor — missing `condition.cares_artifacts` (A2, A3)

Oracle (activated creature form): "This creature gets +1/+1 for each artifact you control." Both agents flagged per-artifact scaling as a `condition.cares_artifacts` payoff.

**Confidence: HIGH.**

---

### 2.13 Kid Loki — missing `effect.grants_hexproof` (A2, A3)

Oracle: "Each creature you control that you've put one or more +1/+1 counters on this turn has hexproof." Both agents flagged the missing hexproof-grant tag. A3 additionally flagged `condition.cares_plus_one_counter` for the counter condition; A2 did not.

**Confidence: HIGH for `effect.grants_hexproof`; MEDIUM for `condition.cares_plus_one_counter` (see §4).**

---

### 2.14 Leader, Super-Genius — missing `effect.draws_or_discards` (A2, A3)

Oracle (replacement clause, not reminder text): "instead you draw a card, then that creature connives." The draw occurs in the main oracle body, not in parenthetical reminder. Both agents confirmed this is outside stripped reminder text and should fire the draws tag.

A1 reviewed Leader but only flagged missing `effect.connive` (catalog gap).

**Confidence: HIGH.**

---

### 2.15 Mjölnir, Hammer of Thor — FP `effect.board_wipe` (A2; A3 did not flag)

**Only 2 of 3 agents; A2 flagged it, A3 did not review.** A2 argues "deals 2 damage to each creature" is mass damage, not a destroy/exile-all wipe. This is a legitimate classification question — a board_wipe tag that fires on mass damage rather than mass destroy/exile is over-broad. A2 also flagged missing `effect.amplifies_damage_or_lifeloss` ("Double all damage equipped creature would deal"). A3 did not flag either finding.

**Confidence: MEDIUM (FP). The board_wipe classification is debatable but mass damage ≠ board_wipe is a defensible narrowing.**

---

### 2.16 Okoye, Dora Milaje Leader — missing `effect.grants_first_strike` (A2, A3)

Oracle: "Attacking creature tokens you control have first strike." Both agents flagged the static first-strike grant to tokens as missing from the tags.

**Confidence: HIGH.**

---

### 2.17 Powerful Broker — missing `effect.counter_modified` (A2, A3)

Oracle: "For each kind of counter on target permanent or player, give that permanent or player another counter of that kind." Both agents agree counter_modified is missing. A3 additionally flagged `effect.proliferate` (functionally equivalent, though the word isn't used); A2 did not flag proliferate.

**Confidence: HIGH for `effect.counter_modified`; MEDIUM for `effect.proliferate` (see §4).**

---

### 2.18 Rick Jones, Destined Sidekick — missing `effect.return_from_graveyard_to_hand` (A2, A3)

Oracle: "{3}, {T}: Mill four cards. You may put a Hero or enchantment card from among those cards into your hand." Both agents agree the milled cards enter the graveyard first, then retrieval to hand is graveyard recursion to hand.

**Confidence: HIGH.**

---

### 2.19 Robot Domination — missing `trigger.creature_dies` (A1, A3)

Oracle: "Whenever one or more creature cards are put into your graveyard from anywhere…" Both agents flagged this as a death/GY-entry trigger. The rule likely requires "whenever a creature dies" framing and misses the "creature cards put into your graveyard from anywhere" variant.

A2 did not flag Robot Domination at all.

**Confidence: HIGH.**

---

### 2.20 Scientist Supreme of A.I.M. — missing `condition.cares_artifacts` (A2, A3)

Oracle: "Copy target activated or triggered ability you control from an artifact source." Both agents flagged that the ability is gated on artifact sources, making this a `condition.cares_artifacts` payoff.

**Confidence: HIGH.**

---

### 2.21 Super Intelligence — missing `trigger.upkeep` (A2, A3)

Oracle: "At the beginning of the upkeep of enchanted creature's controller, that player draws a card." Both agents flagged the missing upkeep trigger tag.

**Confidence: HIGH.**

---

### 2.22 The Masters of Evil — missing Plan-related tag (A1, A2; different tags)

Both A1 and A2 agree something is missing but disagree on which tag:
- A1: missing `effect.tutors_subtype.plan` (a new tag, analogous to tutors_subtype.saga)
- A2: missing `condition.controls_plan` (existing tag added in a recent commit)

The oracle reads: "{1}{B}, Discard this card: Search your library for a Plan card, reveal it, put it into your hand, then shuffle." Searching for a Plan card is both a Plan-subtype tutor AND a Plan-care payoff. The existing `condition.controls_plan` tag (if it matches search-for-Plan text) could cover this; if it only matches "while you control a Plan" framing, then `effect.tutors_subtype.plan` as a new tag may also be warranted.

A3 did not review this card.

**Confidence: HIGH that something is missing; MEDIUM on which tag (check `condition.controls_plan` regex against "search your library for a Plan card" framing first).**

---

### 2.23 The Mighty Thor, Jane Foster — missing `trigger.another_artifact_etb` (A2, A3)

Oracle: "Whenever an Equipment you control enters, draw a card." Both agents flagged this as an artifact-subtype ETB trigger (Equipment is an artifact subtype). The rule either misses Equipment-specific ETB framing or requires "artifact" to appear in the trigger text rather than accepting Equipment subtypes.

**Confidence: HIGH.**

---

### 2.24 The Mighty Thor, Jane Foster — missing `effect.blink` (A2, A3)

Oracle: "Whenever The Mighty Thor attacks, exile up to one target nontoken artifact or creature, then return that card to the battlefield tapped." Both agents note "exile…then return" is an immediate blink (same ability resolution), not an end-step return, and qualifies even though it returns tapped.

**Confidence: HIGH.**

---

### 2.25 The Super Hero Civil War — missing `effect.control_steal` (A2 as `effect.control_change`; A3 as `effect.control_steal`)

Both agents flagged Chapter I of this Saga: "Gain control of up to two target creatures…for as long as this Saga remains on the battlefield." The tag name differs between agents (A2: `effect.control_change`, A3: `effect.control_steal`). Both describe the same temporary control-theft effect.

**Confidence: HIGH (the miss is agreed); check which tag name the catalog uses.**

---

### 2.26 The Ten Rings — missing `condition.cares_hand_size` (A1, A2)

Oracle: "Your maximum hand size is ten. At the beginning of your end step, if you have fewer than ten cards in hand, draw cards equal to the difference." Both agents flagged this as hand-size gating and scaling. The rule likely requires "for each card in your hand" and misses "fewer than N cards in hand" / "draw equal to the difference" framings.

A3 did not review this card.

**Confidence: HIGH.**

---

### 2.27 The Thing, Ben Grimm — missing `condition.cares_tribe.hero` (A2, A3)

Oracle: "Whenever one or more Heroes you control deal damage to a player, put two +1/+1 counters on The Thing." Both agents flagged the Hero-tribal scoping of the trigger condition.

**Confidence: HIGH.**

---

### 2.28 Vision Quest — missing `effect.plus_one_counter` (A2, A3)

Oracle: "put it onto the battlefield with X additional +1/+1 counters on it." Both agents flagged the counter placement. (`effect.counter_modified` is listed for A2 but that specific finding is lower confidence; `effect.plus_one_counter` is solid.)

**Confidence: HIGH.**

---

### 2.29 Worlds Within Worlds — missing `effect.cheat_into_play` (A2, A3)

Oracle: "Each player may put any number of creature cards from their hand onto the battlefield." Both agents flagged hand-to-battlefield bypassing casting costs.

**Confidence: HIGH.**

---

## 3. Cross-Card Pattern Consensus — agents flagged DIFFERENT cards with the SAME rule-shape failure

### Pattern 3.1 — Connive catalog gap

**Rule file:** `pipeline/rules/effect.connive.ts` (does not exist — new rule needed)  
**Fix type:** New rule  
**Agents:** A1 (primary, 11 cards explicitly); A2 and A3 (reviewed connive cards but did not flag the catalog gap, instead flagging secondary issues on individual cards)

**Affected cards (A1):** A.I.M. Scientists, Baron Helmut Zemo, Baron Strucker HYDRA Overlord, Kang Temporal Tyrant, Leader Super-Genius, M.O.D.O.K., Madame Masque, Red Room Recruit, Swordsman Sharp Scoundrel, Trickster's Stratagem, Villainous Hideout  
**Additional connive card (A3 oracle quoted):** Beast, Erudite Aerialist (oracle includes "Connive" keyword; A3 flagged other issues but did not call out the catalog gap)

**Fix sketch:** Create `pipeline/rules/effect.connive.ts` matching the connive keyword action in oracle text. The keyword appears as a standalone word followed by its reminder text in parentheses, and also as verb form ("connives," "it connives," "Baron Helmut Zemo connives") triggered from various ability types (ETB, attack, activated, triggered). The rule needs to catch both the keyword form on the card's own line ("Connive.") and the verb form in triggered/activated ability bodies. A `condition.connive` tag (for connive-lords and payoffs like Leader) may also be warranted as a companion tag pairing with `effect.connive`.

**Confidence: HIGH.** This is the largest single catalog gap in the set.

---

### Pattern 3.2 — `condition.cares_tribe.hero` regex miss

**Rule file:** `pipeline/rules/condition.cares_tribe.ts` (parametric rule)  
**Fix type:** Broaden  
**Agents:** A2 (Captain America Super-Soldier, Invisible Woman, The Thing), A3 (Captain America Super-Soldier, Invisible Woman, The Thing)

**Affected cards:** Captain America, Super-Soldier; Invisible Woman, Sue Storm; The Thing, Ben Grimm — all with "Heroes you control" in trigger conditions or static abilities. Cards already correctly tagged include Captain America, Wings of Freedom (A3 confirms it has the tag and uses similar text), suggesting the rule matches some phrasings but not others.

**Fix sketch:** The `condition.cares_tribe.hero` regex is not catching the "other Heroes you control have [keyword]" (Captain America Super-Soldier), "other Heroes you control get +1/+1" (Invisible Woman), and "one or more Heroes you control deal damage" (The Thing) framings. Broaden the Hero tribe entry in `THEME_TRIBES` or the regex pattern to cover static grant ("other Heroes you control have"), triggered ("Heroes you control deal"), and counter-placement scoped to Heroes.

**Confidence: HIGH.** Three cards, same miss, confirmed by two independent agents.

---

### Pattern 3.3 — `trigger.another_artifact_etb` regex miss

**Rule file:** `pipeline/rules/trigger.another_artifact_etb.ts` (or the file handling this tag)  
**Fix type:** Broaden  
**Agents:** A2 (The Mighty Thor, Jane Foster), A3 (The Mighty Thor, HYDRA Assault Robot, Ultron)

**Affected cards:**  
- The Mighty Thor, Jane Foster: "Whenever an Equipment you control enters" — Equipment is an artifact subtype (A2 + A3)  
- HYDRA Assault Robot: "Whenever another Villain and/or artifact you control enters" — explicitly includes artifacts (A3)  
- Ultron, Artificial Malevolence: "Whenever another nontoken artifact you control enters" — textbook artifact ETB (A3)

**Fix sketch:** The rule likely fires on "whenever another artifact" framing but misses (a) Equipment-specific ETB triggers where "artifact" isn't in the trigger text, and (b) compound triggers like "Villain and/or artifact." Broaden to accept Equipment as an artifact subtype in the ETB trigger, and accept compound "X and/or artifact" forms. The HYDRA Assault Robot case may also benefit from treating "Villain and/or artifact" as matching both `trigger.another_creature_etb` (villain = creature) AND `trigger.another_artifact_etb` (artifact).

**Confidence: HIGH (The Mighty Thor, Ultron); MEDIUM (HYDRA Assault Robot compound form).**

---

### Pattern 3.4 — `effect.cast_from_exile` regex miss

**Rule file:** `pipeline/rules/effect.cast_from_exile.ts`  
**Fix type:** Broaden  
**Agents:** A2 (Black Widow Super Spy, Hex Magic), A3 (Black Widow Super Spy, Hex Magic)

**Affected cards:**  
- Black Widow, Super Spy: "you may cast the exiled nonland card until end of turn"  
- Hex Magic: "you may play cards exiled this way"

**Fix sketch:** The rule likely matches "cast…from exile" or "play…from exile" with "exile" as the static zone name, but misses (a) "cast the exiled [card]" where "exiled" is a past-tense modifier rather than a zone reference, and (b) "play cards exiled this way" where the exile zone reference is indirect. Broaden to catch "cast the exiled," "play cards exiled this way," and similar paraphrases.

**Confidence: HIGH.**

---

### Pattern 3.5 — `condition.cares_artifacts` regex miss (multiple MSH cards)

**Rule file:** `pipeline/rules/condition.cares_artifacts.ts`  
**Fix type:** Broaden  
**Agents:** A2 (Iron Man Armor, Scientist Supreme of A.I.M.), A3 (Iron Man Armor, Scientist Supreme of A.I.M., Ironheart, Tony Stark // The Invincible Iron Man)

**Affected cards:**  
- Iron Man Armor: "+1/+1 for each artifact you control" (A2 + A3)  
- Scientist Supreme: ability copies abilities "from an artifact source" (A2 + A3)  
- Ironheart: Improvise + "Noncreature spells you cast have improvise" (A3)  
- Tony Stark: tutors for artifact cards, puts artifact cards from hand onto battlefield (A3)

**Fix sketch:** The rule catches direct artifact counting but misses: (a) "for each artifact" in creature-form activated ability text (Iron Man Armor), (b) "from an artifact source" as a gating qualifier (Scientist Supreme), (c) Improvise as an artifact-payoff mechanic and the "have improvise" static grant (Ironheart), and (d) artifact-specific tutors/cheat-in (Tony Stark). The Improvise case (Ironheart) may specifically need the rule to recognize Improvise as an artifact-care mechanic, since it's a named keyword without "artifact" appearing in the primary clause.

**Confidence: HIGH (Iron Man Armor, Scientist Supreme); MEDIUM (Ironheart Improvise frame, Tony Stark).**

---

### Pattern 3.6 — Token subtype triggers tribal FP

**Rule file:** `pipeline/rules/condition.cares_tribe.ts` (parametric rule — same file as Pattern 3.2)  
**Fix type:** Narrow  
**Agents:** A3 only (The Sentry / villain, White Tiger / cat)

**Affected cards:**  
- The Sentry, Golden Guardian: "creates The Void, a legendary 5/5 black Horror Villain creature token" — tagged `condition.cares_tribe.villain` because "villain" appears in the token's type line  
- White Tiger, Ava Ayala: "create The Tiger God, a legendary 4/4 green Cat God creature token" — tagged `condition.cares_tribe.cat` because "cat" appears in the token's creature type

**Fix sketch:** The `condition.cares_tribe.<X>` rule is matching tribe names that appear inside token creation text (as the token's type, not as a conditional or payoff clause). The fix is to require that the tribe name appear in a syntactic position indicating care (e.g., "whenever [tribe] you control," "for each [tribe]," "[tribe] you control get") rather than after "create a [stats] [type] creature token" or "a [tribe] creature token." A negative lookahead or context-window check after "token" production text would prevent these FPs.

**Confidence: HIGH (A3 both; the logic is sound and the anti-pattern is called out in the audit brief).**

---

## 4. Single-flag findings

### From Agent 1 only

**A.I.M. Scientists, Baron Strucker HYDRA Overlord, Kang Temporal Tyrant, M.O.D.O.K., Madame Masque, Red Room Recruit, Swordsman Sharp Scoundrel, Trickster's Stratagem, Villainous Hideout — missing `effect.connive`**  
**Judgment: SOLID.** These are all part of the Connive catalog gap (Pattern 3.1). Same finding — different cards. A1 is the only agent who explicitly framed them as `effect.connive` misses, but the underlying catalog gap is independently verifiable from oracle text.

**Super-Adaptoid — FP `effect.grants_haste`**  
**Judgment: SOLID but contested.** A1 argues the haste counter goes to itself (self-enhancement via counter-copying), not granted to other creatures, making `effect.grants_haste` a FP. A2 argues the opposite (more grants_* tags are needed for "do the same for flying, first strike, etc."). See §5 Disagreements.

**The Masters of Evil — missing `effect.tutors_subtype.plan`**  
**Judgment: SOLID as a new-tag candidate** if `condition.controls_plan` doesn't already match "Search your library for a Plan card." Check `condition.controls_plan` regex first; if it covers tutor-for-plan text, the new tag may be redundant. See §2.22.

---

### From Agent 2 only

**Claim the Kingdom — missing `effect.grants_indestructible`**  
**Judgment: SOLID.** "Put an indestructible counter on target creature" — indestructible counter grants indestructible. Clear miss.

**Iron Fist, Living Weapon — missing `effect.has_activated_ability` and `effect.deals_damage`**  
**Judgment: BORDERLINE.** The activated ability and damage text are inside a quoted string granted to a token/creature ("'{T}: This creature deals 2 damage to any target'"). Tagging oracle text inside quoted grant strings may be intentionally excluded from the pipeline to avoid tagging the capability of a thing the card creates rather than the card itself.

**Mjölnir, Hammer of Thor — missing `effect.amplifies_damage_or_lifeloss`**  
**Judgment: SOLID.** "Double all damage equipped creature would deal" is a damage-doubling effect that fits `effect.amplifies_damage_or_lifeloss` regardless of the board_wipe FP question.

**Restorative Technique — missing `effect.ramp_nonland`**  
**Judgment: SOLID.** Card searches for a basic land and puts it onto the battlefield tapped — non-land ramp pattern.

**Taskmaster, Mercenary Mimic — missing `condition.cares_graveyard`**  
**Judgment: SOLID.** "becomes a copy of up to one target creature on the battlefield or creature card in a graveyard" — explicitly targets GY cards as a copy source.

**The Sentry, Golden Guardian — missing `effect.create_creature_token` / `effect.create_token`**  
**Judgment: BORDERLINE.** "Target opponent creates The Void, a legendary 5/5 black Horror Villain creature token" — the opponent is the actor. Whether this gets create_creature_token when the producing player is an opponent is the anti-pattern flagged in the brief. If the rule requires "you create" subject form, this is a true miss (rule needs broadening for opponent-creates-as-penalty); if "you create" is intentional, this is not a miss.

**Vision Quest — missing `effect.counter_modified`**  
**Judgment: BORDERLINE.** `effect.plus_one_counter` (which A2 + A3 both flagged) is stronger; `effect.counter_modified` may be a redundant or overlapping tag for the same placement. Check whether the catalog distinguishes them.

**Yellowjacket, Heartless Marauder — missing `effect.grants_stat_buff`**  
**Judgment: SOLID.** "Yellowjacket gets +1/+0 and gains lifelink until end of turn" — `effect.grants_lifelink` fires but the stat component is untagged. The stat buff appears to be on-self rather than on others, so whether this tag applies depends on whether `effect.grants_stat_buff` is scoped to self-buffs or other-buffs.

---

### From Agent 3 only

**Beast — missing `condition.cares_plus_one_counter`**  
**Judgment: SOLID.** "if it has a +1/+1 counter on it" — explicit counter-care gating. Works independently of the grants_evasion FP question.

**Captain America, Wings of Freedom — missing `effect.grants_stat_buff`**  
**Judgment: SOLID.** "each other Hero you control gets +X/+X until end of turn" — stat buff to other creatures.

**Echo, Perceptive Prodigy — missing `effect.amplifies_triggers` and `condition.cares_activated_abilities`**  
**Judgment: SOLID.** "Copy target activated or triggered ability you control from a creature source" — both tags apply (copies triggered abilities = amplifies_triggers; gated on activated abilities = cares_activated_abilities). Same pattern as Scientist Supreme (§2.20) but from creature sources rather than artifact sources.

**HYDRA Assault Robot — missing `trigger.another_artifact_etb`**  
**Judgment: SOLID.** Already covered under Pattern 3.3.

**Invisible Woman — missing `condition.cares_plus_one_counter`**  
**Judgment: SOLID.** "Whenever you put one or more +1/+1 counters on one or more other Heroes" — counter-placement trigger. Note: the `condition.cares_tribe.hero` miss (§2.11) is separate; both are missing.

**Ironheart, Clever Champion — missing `condition.cares_artifacts` and `effect.cost_reduction`**  
**Judgment: SOLID.** Improvise taps artifacts to pay for mana costs — artifact payoff and cost reduction. Both are direct mechanic reads, not speculative. Already noted in Pattern 3.5.

**Justice, Vance Astrovik — missing `trigger.permanent_leaves_battlefield`**  
**Judgment: SOLID.** "Whenever another nonland permanent you control is returned to its owner's hand" — permanent-leaves trigger; "returned to hand" phrasing likely misses the LTB trigger regex.

**Kid Loki — missing `condition.cares_plus_one_counter`**  
**Judgment: SOLID.** "each creature you control that you've put one or more +1/+1 counters on this turn" — explicit counter-care gate.

**King T'Challa // Black Panther — missing `condition.cares_cards_drawn_this_turn`**  
**Judgment: SOLID.** "Whenever a player draws their second card each turn" — exact pattern for which Kid Loki has this tag.

**Powerful Broker — missing `effect.proliferate`**  
**Judgment: SOLID (functionally), MEDIUM (tag fit).** The effect is proliferate-equivalent. If the catalog's proliferate tag matches the keyword rather than the effect, this may need checking. `effect.counter_modified` is the safer higher-confidence tag (§2.17).

**Quicksilver, Brash Blur — missing `effect.plus_one_counter`**  
**Judgment: SOLID.** "put a +1/+1 counter and a double strike counter on Quicksilver" — `effect.counter_modified` is tagged but `effect.plus_one_counter` is not.

**Rewrite History — missing `trigger.tapped_or_untapped`**  
**Judgment: SOLID.** "Whenever one or more creatures you control become tapped" — tap-trigger pattern driving the card's primary engine.

**Robot Domination — missing `condition.cares_graveyard`**  
**Judgment: SOLID.** Goes with the `trigger.creature_dies` miss (§2.19); the GY-entry trigger also qualifies as a graveyard-care pattern.

**S.H.I.E.L.D. Spy Kit — missing `effect.untap`**  
**Judgment: SOLID.** "untap it" on solo attack — explicit untap effect.

**Scientist Supreme — missing `effect.amplifies_triggers` and `condition.cares_activated_abilities`**  
**Judgment: SOLID.** Same pattern as Echo (same oracle mechanic, different source type). Already established as a gap from Pattern 3.5 / §2.20.

**The Ruinous Wrecking Crew — FP `effect.destroy_land`**  
**Judgment: SOLID.** "Destroy target token" is not land destruction. The destroy_land rule fires because land tokens theoretically exist, but no Standard land tokens mean this is spurious. The rule needs a narrowing to exclude "destroy target token" from matching (or require "land" to be adjacent to the destroy target).

**The Sentry, Golden Guardian — FP `condition.cares_tribe.villain`**  
**Judgment: SOLID.** Already covered under Pattern 3.6. The "villain" in the token type line should not trigger tribe-care.

**Tony Stark // The Invincible Iron Man — missing `condition.cares_artifacts`**  
**Judgment: SOLID.** Both faces key on artifact cards. Already covered under Pattern 3.5.

**Ultron, Artificial Malevolence — missing `trigger.another_artifact_etb`**  
**Judgment: SOLID.** Already covered under Pattern 3.3.

**White Tiger, Ava Ayala — FP `condition.cares_tribe.cat`**  
**Judgment: SOLID.** Already covered under Pattern 3.6.

**World War Hulk — missing `effect.grants_stat_buff`**  
**Judgment: SOLID.** Chapter III "double its power and toughness" is a conditional stat increase to a creature. Whether "double" maps to the `grants_stat_buff` tag (which may expect fixed +X/+X) is worth checking, but the stat-buff intent is clear.

---

## 5. Disagreements — agents contradicted each other on same card + same tag

### 5.1 Super-Adaptoid — `effect.grants_haste` direction

- **Agent 1:** `effect.grants_haste` is a **false positive**. The card places a haste counter on itself (acquired from another creature), not on other creatures. The entire `effect.grants_*` framework is wrong for this card; the mechanic is self-keyword-copying.
- **Agent 2:** The `effect.grants_*` framework is **incomplete** — `effect.grants_haste` may be correct (or at least tolerable), and the real problem is that the "do the same for flying, first strike, double strike, deathtouch, indestructible, lifelink, menace, reach, trample, and vigilance" clause means additional tags (`effect.grants_evasion`, `effect.grants_first_strike`, etc.) are missing.
- **Agent 3:** Did not review Super-Adaptoid.

**Synthesis:** This is a genuine philosophical disagreement. Agent 1's position is stronger on the semantics: `effect.grants_*` tags describe giving a keyword to OTHER permanents, and Super-Adaptoid acquires keywords from a target creature onto itself. The "do the same for X" clause copies keywords onto Super-Adaptoid (self), not from it. However, the practical effect of this mechanic (it eventually has flying, trample, etc.) means it does interact with the same deck slots as a card that grants evasion.

**Recommendation:** Accept Agent 1's FP interpretation for `effect.grants_haste`. The card should not carry any `effect.grants_*` tags since it is not granting to others. Consider a new `effect.gains_keywords` or `effect.copy_keywords_from_target` tag if this pattern appears on more cards.

---

### 5.2 The Sentry, Golden Guardian — same card, different findings (not a contradiction)

- **Agent 2:** Missing `effect.create_creature_token` and `effect.create_token` (opponent-creates-token not captured)
- **Agent 3:** FP `condition.cares_tribe.villain` (villain in token type = false tribe-care)

These are **different tags**, not contradictory claims on the same tag. They are listed here only for completeness to show both findings exist for one card.

**Net picture for The Sentry:** The current `condition.cares_tribe.villain` tag is likely a FP (Pattern 3.6). The `effect.create_creature_token` miss is borderline (opponent as actor). Remove the villain FP; defer the create-token miss to a policy decision on opponent-creates-token.

---

## 6. Recommended Fix Batches — grouped by rule file

### Batch A — New rule (no current rule file)

#### `pipeline/rules/effect.connive.ts` — CREATE NEW
- **Fix type:** New rule
- **Driving cards:** A.I.M. Scientists, Baron Helmut Zemo, Baron Strucker, Kang, Leader, M.O.D.O.K., Madame Masque, Red Room Recruit, Swordsman, Trickster's Stratagem, Villainous Hideout, Beast (oracle keyword form)
- **Driving agents:** A1 (all 11 explicitly); A2 and A3 (saw connive cards, flagged secondary issues)
- **Fix sketch:** Add a new `effect.connive` tag matching the connive keyword in oracle text. The regex must catch (a) "connive." as a standalone keyword line, (b) "it connives" / "connives" as a verb in ability bodies, and (c) "have it connive" in triggered ability text. A companion `condition.cares_connive` (or pairing on Leader's side) should pair with `effect.connive`. Connive is part of the draw-discard loop, so `effect.connive` should pairsWith `trigger.card_drawn_discarded`, `effect.draws_or_discards`, and counter-related tags.
- **Confidence: HIGH**

---

### Batch B — Broadening existing rules

#### `pipeline/rules/condition.cares_tribe.ts` — BROADEN (hero entries)
- **Fix type:** Broaden
- **Driving cards:** Captain America Super-Soldier, Invisible Woman, The Thing (A2 + A3 each); also Captain America Wings (already correct, confirms some patterns work)
- **Fix sketch:** The hero tribe pattern must catch "other Heroes you control have [keyword]" (static grant), "Heroes you control deal" (trigger scoping), and "one or more Heroes you control" (trigger condition). Current patterns likely only catch "for each Hero" / "whenever a Hero" forms.
- **Confidence: HIGH**

#### `pipeline/rules/condition.cares_hand_size.ts` — BROADEN
- **Fix type:** Broaden
- **Driving cards:** Ms. Marvel (A1 + A2 + A3), The Ten Rings (A1 + A2)
- **Fix sketch:** Extend the regex to catch (a) "equal to the number of cards in your hand" (Ms. Marvel power scaling), (b) "fewer than N cards in hand" (The Ten Rings gate), and (c) "draw cards equal to the difference" following a hand-size comparison. The current rule likely only matches "for each card in your hand" or "maximum hand size" static line without catching scaled-draw-to-difference patterns.
- **Confidence: HIGH**

#### `pipeline/rules/trigger.creature_dies.ts` — BROADEN
- **Fix type:** Broaden
- **Driving cards:** Robot Domination (A1 + A3)
- **Fix sketch:** Extend to catch "whenever one or more creature cards are put into your graveyard from anywhere" in addition to the standard "whenever a creature dies" / "whenever a creature you control dies" forms. The "from anywhere" variant covers death, mill, exile-to-GY, and discard routes but should still fire the creature_dies tag since the primary use case is creature death.
- **Confidence: HIGH**

#### `pipeline/rules/trigger.another_artifact_etb.ts` — BROADEN
- **Fix type:** Broaden
- **Driving cards:** The Mighty Thor (A2 + A3), Ultron (A3), HYDRA Assault Robot (A3)
- **Fix sketch:** (1) Accept Equipment as an implicit artifact subtype in ETB triggers — when "Equipment you control enters" appears, fire `trigger.another_artifact_etb`. (2) Accept compound "X and/or artifact" triggers as also matching artifact ETB. (3) Confirm "nontoken artifact you control enters" is already matched (Ultron) — if it isn't, add it.
- **Confidence: HIGH**

#### `pipeline/rules/effect.cast_from_exile.ts` — BROADEN
- **Fix type:** Broaden
- **Driving cards:** Black Widow Super Spy (A2 + A3), Hex Magic (A2 + A3)
- **Fix sketch:** Extend to catch "cast the exiled [noun]" (past-tense "exiled" as modifier) and "play cards exiled this way" (indirect exile zone reference via "this way"). The current rule likely requires "from exile" as a zone phrase.
- **Confidence: HIGH**

#### `pipeline/rules/effect.exile_from_library.ts` — BROADEN
- **Fix type:** Broaden
- **Driving cards:** Black Widow Super Spy (A2 + A3)
- **Fix sketch:** Catch "exiles cards from the top of their library" (opponent's library as subject). Current rule may require "you exile" subject form.
- **Confidence: HIGH**

#### `pipeline/rules/condition.cares_artifacts.ts` — BROADEN
- **Fix type:** Broaden
- **Driving cards:** Iron Man Armor (A2 + A3), Scientist Supreme (A2 + A3), Ironheart (A3), Tony Stark (A3)
- **Fix sketch:** (1) Catch "+1/+1 for each artifact you control" inside creature-mode activated ability text. (2) Catch "from an artifact source" as a gating qualifier. (3) Recognize Improvise keyword and "have improvise" static grant as artifact-payoff. (4) Consider whether artifact-card-specific tutors/cheat-in (Tony Stark) should fire this tag — only if the rule definition includes "cares about artifact card types for selection purposes."
- **Confidence: HIGH (Iron Man, Scientist Supreme, Ironheart); MEDIUM (Tony Stark)**

#### `pipeline/rules/effect.blink.ts` — BROADEN
- **Fix type:** Broaden
- **Driving cards:** The Mighty Thor, Jane Foster (A2 + A3)
- **Fix sketch:** Catch "exile…then return that card to the battlefield" where the return is in the same triggered ability (not end-step delayed), even if it returns tapped. Current rule may require end-step return or "return it to the battlefield under its owner's control" exact phrasing without the "tapped" qualifier.
- **Confidence: HIGH**

#### `pipeline/rules/effect.grants_evasion.ts` — NARROW (self-grant exclusion)
- **Fix type:** Narrow
- **Driving cards:** Beast, Erudite Aerialist (A2 + A3 FP)
- **Fix sketch:** Add a guard that excludes self-conditional keyword grants where the subject of the grant is the card itself ("it gains [keyword]" scoped to itself via "if it has a counter on it"). The rule should only fire when evasion is granted to OTHER creatures or tokens the card creates. A negative-context check on "it gains [keyword]" where "it" resolves to the card itself should prevent this FP.
- **Confidence: HIGH**

#### `pipeline/rules/condition.controls_plan.ts` — BROADEN (or check coverage)
- **Fix type:** Broaden (if regex doesn't already match)
- **Driving cards:** The Masters of Evil (A1 + A2)
- **Fix sketch:** Check whether `condition.controls_plan` matches "Search your library for a Plan card" framing (tutoring for a Plan). If the rule only matches "while you control a Plan" / "if you control a Plan" static conditions, add tutor-for-Plan as a Plan-payoff use case. Also consider whether a separate `effect.tutors_subtype.plan` is warranted for the effect axis.
- **Confidence: HIGH (that something is missing); MEDIUM (which fix)**

#### `pipeline/rules/effect.exile_from_graveyard.ts` — BROADEN
- **Fix type:** Broaden
- **Driving cards:** Baron Helmut Zemo (A1 + A2 + A3)
- **Fix sketch:** Catch "Exile any number of [type] cards from your graveyard" multi-exile form. Current rule likely requires "exile target … card from a graveyard" or "exile … from your graveyard" with a single target.
- **Confidence: HIGH**

#### `pipeline/rules/condition.cares_graveyard.ts` — BROADEN
- **Fix type:** Broaden
- **Driving cards:** Baron Helmut Zemo (A1 + A2 + A3), Robot Domination (A3), Taskmaster (A2)
- **Fix sketch:** Catch (a) Boast-style graveyard selection ("with fifteen or more [property] among their mana costs" preceded by "from your graveyard"), (b) copy-from-graveyard targeting ("becomes a copy of…creature card in a graveyard"), and (c) GY-entry triggers ("creature cards are put into your graveyard"). The rule may have strict "cares about" language requirements that exclude these indirect graveyard interactions.
- **Confidence: HIGH**

#### `pipeline/rules/effect.return_from_graveyard_to_hand.ts` — CHECK / BROADEN
- **Fix type:** Broaden
- **Driving cards:** Rick Jones, Destined Sidekick (A2 + A3)
- **Fix sketch:** Check whether "put a Hero or enchantment card from among those cards into your hand" (where "those cards" were just milled to the graveyard) matches the return-from-GY rule. The rule may require explicit "graveyard" to appear in the return clause, but here the GY reference is implicit ("among those cards" = among the milled cards, which went to GY).
- **Confidence: HIGH**

#### `pipeline/rules/effect.grants_first_strike.ts` — BROADEN
- **Fix type:** Broaden
- **Driving cards:** Okoye, Dora Milaje Leader (A2 + A3); Black Widow Double Agent (A2 + A3 — evasion; first_strike already tagged on Black Widow)
- **Fix sketch:** Okoye: "Attacking creature tokens you control have first strike" — static anthem to attacking tokens. Check whether the rule catches static-grant phrasings as well as triggered grants.
- **Confidence: HIGH (Okoye)**

#### `pipeline/rules/trigger.upkeep.ts` — CHECK / BROADEN
- **Fix type:** Broaden
- **Driving cards:** Super Intelligence (A2 + A3)
- **Fix sketch:** "At the beginning of the upkeep of enchanted creature's controller" — the upkeep trigger fires for a third party (not "your upkeep" or "each player's upkeep"). Check whether the rule only matches "your upkeep" framing.
- **Confidence: HIGH**

#### `pipeline/rules/effect.counter_modified.ts` or `effect.plus_one_counter.ts` — CHECK / BROADEN
- **Fix type:** Broaden
- **Driving cards:** Doc Samson (A2 + A3, counter_modified), Powerful Broker (A2 + A3, counter_modified), Vision Quest (A2 + A3, plus_one_counter)
- **Fix sketch:** (1) Doc Samson's counter-replacement replacement effect likely requires "put a counter" language rather than "put that many plus one of each kind." (2) Powerful Broker's give-each-kind effect may need explicit handling. (3) Vision Quest's "X additional +1/+1 counters" may require "additional" to be added to the match.
- **Confidence: HIGH**

#### `pipeline/rules/effect.cheat_into_play.ts` — BROADEN
- **Fix type:** Broaden
- **Driving cards:** Worlds Within Worlds (A2 + A3)
- **Fix sketch:** "Each player may put any number of creature cards from their hand onto the battlefield" — the "players" as subject (not just "you") and "from their hand" phrasing may be missed. Current rule likely requires "you may put … onto the battlefield" subject form.
- **Confidence: HIGH**

---

### Batch C — Narrowing existing rules (false positives)

#### `pipeline/rules/condition.cares_tribe.ts` — NARROW (token subtype FP)
- **Fix type:** Narrow
- **Driving cards:** The Sentry / villain (A3), White Tiger / cat (A3)
- **Fix sketch:** Require that the tribe name appear in a conditional or payoff clause, not inside token creation text. A negative lookahead or proximity check: if "villain" / "cat" (or any tribe name) appears only within "create a [stats] [type] creature token" windows, do not fire the tribe-care tag. Cards that create Hero tokens (e.g., White Tiger creating "The Tiger God, a legendary 4/4 green Cat God creature token") are token producers, not tribe-care payoffs.
- **Confidence: HIGH**

#### `pipeline/rules/effect.destroy_land.ts` — NARROW
- **Fix type:** Narrow
- **Driving cards:** The Ruinous Wrecking Crew (A3)
- **Fix sketch:** "Destroy target token" should not match `effect.destroy_land` even though land tokens theoretically exist. Narrow the rule to require "land" or "nonbasic land" or "basic land" to appear in the destroy target clause. "Destroy target token" without a land qualifier should not fire.
- **Confidence: HIGH**

#### `pipeline/rules/effect.board_wipe.ts` — NARROW
- **Fix type:** Narrow (conditional)
- **Driving cards:** Mjölnir, Hammer of Thor (A2)
- **Fix sketch:** "Deals 2 damage to each creature" is mass damage, not a board wipe (destroy/exile/sacrifice all). If the rule matches "deals N damage to each creature" as a board_wipe, narrow it to require mass destruction/exile/sacrifice language or require that the damage amount be sufficient to be considered board-clearing (which is unreliable as a heuristic). Prefer excluding damage-based mass effects from this tag entirely.
- **Confidence: MEDIUM (single agent; the classification is debatable)**

---

### Batch D — pairsWith additions

#### `pipeline/rules/effect.connive.ts` (new) — pairsWith
When `effect.connive` is created, it should pairsWith:
- `trigger.card_drawn_discarded` (connive involves draw + conditional discard)
- `effect.draws_or_discards`
- `effect.plus_one_counter` (conditional counter placement)
- `condition.cares_plus_one_counter` (for Leader-style connive lords)

---

### Findings not recommended for immediate fixes

| Card | Finding | Reason deferred |
|---|---|---|
| Super-Adaptoid grants_haste | See §5.1 — FP agreed (A1), but the self-keyword-copy mechanic needs its own tag design before fixing | Design question |
| The Sentry create_creature_token | Opponent-creates-token — policy decision needed on whether opponent-actor token creation gets the tag | Policy |
| Iron Fist quoted ability text | Tagging capabilities of granted abilities may be intentionally out of scope | Design scope |
| Vision Quest effect.counter_modified | Likely covered by effect.plus_one_counter; check for overlap before adding both | Redundancy check |
| Yellowjacket grants_stat_buff | Self-buff vs. other-buff scope question for grants_stat_buff | Scope clarification |

---

*End of consensus report. Total confirmed findings: 3 strong consensus, 29 majority consensus, 6 cross-card patterns (covering 30+ additional cards), 38 single-agent findings. Primary catalog gap: Connive (11 cards). Primary FP pattern: token-subtype triggers tribal tag (2 cards confirmed). Highest-priority fix batch: Batch A (new Connive rule) + Batch B (Hero tribal broaden, hand-size broaden, artifact-etb broaden).*
