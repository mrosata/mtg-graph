# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

---

## Locke, Treasure Hunter  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Rogue
**Mana cost:** {1}{B}{R}

**Oracle text:**
```
Locke can't be blocked by creatures with greater power.
Mug — Whenever Locke attacks, each player mills a card. If a land card was milled this way, create a Treasure token. Until end of turn, you may cast a spell from among those cards.
```

**Current tags:** `effect.cast_from_exile`, `effect.create_token`, `effect.create_treasure`, `effect.mill`, `trigger.attack_or_block`

### Issues

- **false-positive**: `effect.cast_from_exile`
  - **What's wrong:** "Those cards" were milled to graveyards, not exiled. The cast is from graveyard (like flashback), not from exile.
  - **Evidence vs reality:** evidence was `"cast a spell from among those cards"`, but milled cards go to graveyards, not exile.
  - **Suggested fix:** Narrow the `effect.cast_from_exile` anaphoric lookbehind to require a preceding exile verb. Replace this tag with `effect.grants_cast_from_graveyard`.

---

## Thunderous Debut  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Sorcery
**Mana cost:** {5}{G}{G}

**Oracle text:**
```
Bargain (You may sacrifice an artifact, enchantment, or token as you cast this spell.)
Look at the top twenty cards of your library. You may reveal up to two creature cards from among them.
If this spell was bargained, put the revealed cards onto the battlefield. Otherwise, put the revealed cards into your hand.
Then shuffle.
```

**Current tags:** `condition.bargain`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.look_at_top_n`

### Issues

- **missing**: `effect.cheat_into_play`
  - **What's wrong:** When bargained, creatures go directly from library to battlefield without casting.
  - **Evidence vs reality:** evidence was `"put the revealed cards onto the battlefield"`, and this is cheat-into-play (library → battlefield, no cast).
  - **Suggested fix:** Extend `effect.cheat_into_play` to match "put the revealed cards onto the battlefield" in library-reveal-then-place contexts.

- **missing**: `effect.tutors_creature`
  - **What's wrong:** Non-bargained mode reveals creatures and puts them in hand — a creature tutor.
  - **Evidence vs reality:** evidence was `"reveal up to two creature cards … put … into your hand"`, which is creature search.
  - **Suggested fix:** Extend `effect.tutors_creature` to match "reveal … creature cards … put … into your hand" from top-N frames.

---

## Iroh, Grand Lotus  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Noble Ally
**Mana cost:** {3}{G}{U}{R}

**Oracle text:**
```
Firebending 2
During your turn, each non-Lesson instant and sorcery card in your graveyard has flashback. The flashback cost is equal to that card's mana cost.
During your turn, each Lesson card in your graveyard has flashback {1}.
```

**Current tags:** `condition.cares_instant_sorcery_in_graveyard`, `condition.cares_subtype.lesson`, `effect.has_firebending`

### Issues

- **missing**: `effect.grants_cast_from_graveyard`
  - **What's wrong:** Iroh grants flashback (cast-from-graveyard license) en masse to graveyard cards.
  - **Evidence vs reality:** evidence was `"cards in your graveyard has flashback"`, which is the canonical license-grant pattern (Muldrotha, Conduit of Worlds, Past in Flames).
  - **Suggested fix:** Extend `effect.grants_cast_from_graveyard` to match "cards in your graveyard has/have flashback" bulk-grant frames.

---

## Animate Dead  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Enchantment — Aura
**Mana cost:** {1}{B}

**Oracle text:**
```
Enchant creature card in a graveyard
When this Aura enters, if it's on the battlefield, it loses "enchant creature card in a graveyard" and gains "enchant creature put onto the battlefield with this Aura." Return enchanted creature card to the battlefield under your control and attach this Aura to it. When this Aura leaves the battlefield, that creature's controller sacrifices it.
Enchanted creature gets -1/-0.
```

**Current tags:** `effect.debuff_minus_n`, `effect.reanimate`, `effect.sacrifice_creature`, `effect.sacrifice_enchantment`, `trigger.enchantment_leaves_battlefield`, `trigger.self_etb`

### Issues

- **false-positive**: `effect.sacrifice_enchantment`
  - **What's wrong:** "That creature's controller sacrifices it" — the pronoun "it" refers to the reanimated creature, not an enchantment. The Aura has left the battlefield before this trigger fires.
  - **Evidence vs reality:** evidence was `"sacrifices it"`, but "it" is the creature, not an enchantment.
  - **Suggested fix:** Narrow `effect.sacrifice_enchantment` to require explicit enchantment noun ("sacrifice this enchantment," "sacrifice an enchantment") rather than matching bare "sacrifices it" pronouns in Aura LTB clauses.

---

## Moonshadow  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Creature — Elemental
**Mana cost:** {B}

**Oracle text:**
```
Menace
This creature enters with six -1/-1 counters on it.
Whenever one or more permanent cards are put into your graveyard from anywhere while this creature has a -1/-1 counter on it, remove a -1/-1 counter from this creature.
```

**Current tags:** `effect.counter_modified`, `effect.has_menace`

### Issues

- **missing**: `condition.cares_graveyard`
  - **What's wrong:** The trigger fires on cards being put into your graveyard — a graveyard-activity trigger.
  - **Evidence vs reality:** evidence was `"whenever one or more permanent cards are put into your graveyard"`, which is a direct graveyard-fill trigger.
  - **Suggested fix:** Extend `condition.cares_graveyard` to match "whenever … permanent cards are put into your graveyard" trigger patterns.

---

## Knickknack Ouphe  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Creature — Ouphe
**Mana cost:** {X}{G}

**Oracle text:**
```
This creature enters with X +1/+1 counters on it.
When this creature enters, reveal the top X cards of your library. You may put any number of Aura cards with mana value X or less from among them onto the battlefield. Then put all cards revealed this way that weren't put onto the battlefield on the bottom of your library in a random order.
```

**Current tags:** `condition.cares_low_mana_value`, `condition.cares_subtype.aura`, `condition.has_x_in_cost`, `effect.counter_modified`, `effect.look_at_top_n`, `effect.plus_one_counter`, `trigger.self_etb`

### Issues

- **missing**: `effect.cheat_into_play`
  - **What's wrong:** Cards go directly from library reveal onto the battlefield without casting — textbook cheat-into-play.
  - **Evidence vs reality:** evidence was `"put any number of Aura cards … onto the battlefield"` from a top-X reveal, which bypasses casting.
  - **Suggested fix:** Extend `effect.cheat_into_play` to match "put [cards] … onto the battlefield" after a top-N library reveal.

---

## God-Eternal Bontu  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Zombie God
**Mana cost:** {3}{B}{B}

**Oracle text:**
```
Menace
When God-Eternal Bontu enters, sacrifice any number of other permanents, then draw that many cards.
When God-Eternal Bontu dies or is put into exile from the battlefield, you may put it into its owner's library third from the top.
```

**Current tags:** `effect.draws_or_discards`, `effect.has_menace`, `effect.sacrifice_permanent`, `trigger.creature_dies`, `trigger.self_etb`, `effect.sacrifice_creature`, `effect.sacrifice_artifact`, `effect.sacrifice_enchantment`, `effect.sacrifice_planeswalker`, `effect.sacrifice_land`

### Issues

- **missing**: `effect.tuck_to_library`
  - **What's wrong:** The card tucks itself into the library at a specific position on death/exile.
  - **Evidence vs reality:** evidence was `"put it into its owner's library third from the top"`, which is a library tuck.
  - **Suggested fix:** Extend `effect.tuck_to_library` to match "put it into … library [position] from the top" positional variants.

---

## Bennie Bracks, Zoologist  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Elf Druid
**Mana cost:** {3}{W}

**Oracle text:**
```
Convoke
At the beginning of each end step, if you created a token this turn, draw a card.
```

**Current tags:** `effect.draws_or_discards`, `effect.has_convoke`, `trigger.beginning_of_end_step`

### Issues

- **missing**: `condition.cares_tokens`
  - **What's wrong:** The ability gates on token creation this turn — a token-creation payoff.
  - **Evidence vs reality:** evidence was `"if you created a token this turn"`, which matches the token-cares consumer axis.
  - **Suggested fix:** Extend `condition.cares_tokens` to match "if you created a token this turn" conditional-gate patterns.

---

## Weftstalker Ardent  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Creature — Drix Artificer
**Mana cost:** {2}{R}

**Oracle text:**
```
Whenever another creature or artifact you control enters, this creature deals 1 damage to each opponent.
Warp {R}
```

**Current tags:** `condition.cares_artifacts`, `effect.deals_damage`, `effect.has_warp`, `trigger.another_creature_etb`

### Issues

- **missing**: `trigger.another_artifact_etb`
  - **What's wrong:** The trigger fires on "creature or artifact" entries, but only the creature trigger is tagged.
  - **Evidence vs reality:** evidence was `"another creature or artifact you control enters"` — artifacts are explicitly listed.
  - **Suggested fix:** When trigger text is "creature or artifact enters," both `trigger.another_creature_etb` and `trigger.another_artifact_etb` should fire.

---

## Xande, Dark Mage  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Wizard
**Mana cost:** {2}{U}{B}

**Oracle text:**
```
Menace
Xande gets +1/+1 for each noncreature, nonland card in your graveyard.
```

**Current tags:** `effect.grants_stat_buff`, `effect.has_menace`

### Issues

- **missing**: `condition.cares_graveyard`
  - **What's wrong:** The creature scales its power/toughness based on graveyard content — a direct graveyard-count payoff.
  - **Evidence vs reality:** evidence was `"gets +1/+1 for each noncreature, nonland card in your graveyard"`, which is a graveyard-count scaler.
  - **Suggested fix:** Extend `condition.cares_graveyard` to match "[Card] gets +N/+N for each [type] card in your graveyard" scaler patterns.

---

## Mission Briefing  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Instant
**Mana cost:** {U}{U}

**Oracle text:**
```
Surveil 2, then choose an instant or sorcery card in your graveyard. You may cast it this turn. If that spell would be put into your graveyard, exile it instead.
```

**Current tags:** `condition.cares_instant_sorcery_in_graveyard`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.surveil`

### Issues

- **missing**: `effect.grants_cast_from_graveyard`
  - **What's wrong:** "You may cast it this turn" grants one-shot graveyard-cast permission.
  - **Evidence vs reality:** evidence was `"you may cast it this turn"` after selecting from graveyard, which is a cast-from-graveyard license (flashback-like).
  - **Suggested fix:** Extend `effect.grants_cast_from_graveyard` to match "you may cast it this turn" after graveyard-selection steps.

---

## Donatello, the Brains  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Mutant Ninja Turtle
**Mana cost:** {2}{U}

**Oracle text:**
```
If one or more tokens would be created under your control, those tokens plus a Mutagen token are created instead.
Partner—Character select
```

**Current tags:** `condition.cares_tokens`

### Issues

- **missing**: `effect.create_token`
  - **What's wrong:** A Mutagen token is definitively created via replacement effect whenever any tokens are created.
  - **Evidence vs reality:** evidence was `"those tokens plus a Mutagen token are created instead"` — the card creates a token.
  - **Suggested fix:** Extend `effect.create_token` to match "plus a … token are created instead" replacement-effect frames.

---

## Xavier Sal, Infested Captain  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Fungus Pirate
**Mana cost:** {B}{G}{U}

**Oracle text:**
```
{T}, Remove a counter from another permanent you control: Populate. Activate only as a sorcery. (Create a token that's a copy of a creature token you control.)
{T}, Sacrifice another creature: Proliferate. Activate only as a sorcery.
```

**Current tags:** `effect.counter_modified`, `effect.has_activated_ability`, `effect.proliferate`, `effect.sacrifice_creature`

### Issues

- **missing**: `effect.copy_permanent_token`, `effect.create_creature_token`, `effect.create_token`
  - **What's wrong:** Populate creates a token copy of a creature token, but the keyword's reminder text is stripped, leaving no rule to match the bare "populate" keyword.
  - **Evidence vs reality:** evidence was `"populate"` (bare keyword), but reminder text ("create a token that's a copy of a creature token") is stripped during normalization.
  - **Suggested fix:** Add a dedicated Populate keyword-anchor rule that emits `effect.copy_permanent_token`, `effect.create_creature_token`, and `effect.create_token`.

---

## Anticausal Vestige  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Creature — Eldrazi
**Mana cost:** {6}

**Oracle text:**
```
When this creature leaves the battlefield, draw a card, then you may put a permanent card with mana value less than or equal to the number of lands you control from your hand onto the battlefield tapped.
Warp {4}
```

**Current tags:** `condition.cares_lands`, `condition.cares_low_mana_value`, `effect.draws_or_discards`, `effect.has_warp`, `trigger.creature_leaves_battlefield`

### Issues

- **missing**: `effect.cheat_into_play`
  - **What's wrong:** A permanent goes directly from hand to battlefield without casting — textbook cheat-into-play.
  - **Evidence vs reality:** evidence was `"put a permanent card … from your hand onto the battlefield"`, which bypasses the casting process.
  - **Suggested fix:** Extend `effect.cheat_into_play` to match "put a permanent card … from your hand onto the battlefield" hand-to-battlefield patterns.

---

## Skullcap Snail  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Creature — Fungus Snail
**Mana cost:** {1}{B}

**Oracle text:**
```
When this creature enters, target opponent exiles a card from their hand.
```

**Current tags:** `effect.targeted_discard`, `trigger.self_etb`

### Issues

- **false-positive**: `effect.targeted_discard`
  - **What's wrong:** The card exiles from hand (exile zone), not discards (graveyard zone) — fundamentally different mechanics.
  - **Evidence vs reality:** evidence was `"target opponent exiles a card from their hand"`, but the destination is exile, not graveyard.
  - **Suggested fix:** Narrow `effect.targeted_discard` to exclude "exiles a card from their hand" — restrict to discard (graveyard destination).

---

## Master of Death  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Creature — Zombie Wizard
**Mana cost:** {1}{U}{B}

**Oracle text:**
```
When this creature enters, surveil 2.
At the beginning of your upkeep, if this card is in your graveyard, you may pay 1 life. If you do, return it to your hand.
```

**Current tags:** `effect.life_changed`, `effect.surveil`, `trigger.self_etb`, `trigger.upkeep`

### Issues

- **missing**: `effect.return_from_graveyard_to_hand`
  - **What's wrong:** The card recursively returns itself from graveyard to hand.
  - **Evidence vs reality:** evidence was `"return it to your hand"` when "this card is in your graveyard" — classic self-recursion.
  - **Suggested fix:** Extend `effect.return_from_graveyard_to_hand` to match "return it to your hand" when the gate is "if this card is in your graveyard."

---

## Promise of Aclazotz // Foul Rebirth  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Enchantment // Sorcery — Adventure
**Mana cost:** {2}{B}{B} // {1}{B}

**Oracle text:**
```
At the beginning of your end step, you may sacrifice a non-Demon creature. If you do, populate. (Create a token that's a copy of a creature token you control.)

Sacrifice a non-Demon creature. If you do, create a 4/3 white and black Vampire Demon creature token with flying.
```

**Current tags:** `condition.cares_tribe.demon` (×2 from both faces), `effect.sacrifice_creature`, `trigger.beginning_of_end_step`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_evasion`, `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.copy_permanent_token`
  - **What's wrong:** The main face uses Populate, which creates a token copy of a creature token. The reminder text is stripped, leaving no rule for the bare keyword.
  - **Evidence vs reality:** evidence was `"populate"`, but reminder text is stripped.
  - **Suggested fix:** Add a Populate keyword-anchor rule (same fix as Xavier Sal).

---

## Crackling Doom  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Instant
**Mana cost:** {R}{W}{B}

**Oracle text:**
```
Crackling Doom deals 2 damage to each opponent. Each opponent sacrifices a creature with the greatest power among creatures that player controls.
```

**Current tags:** `condition.cares_high_power`, `effect.cast_noncreature_spell`, `effect.deals_damage`, `effect.edict`, `effect.is_instant_or_sorcery`

### Issues

- **false-positive**: `condition.cares_high_power`
  - **What's wrong:** "With the greatest power" is a targeting selector on the edict, not a payoff for high-power creatures.
  - **Evidence vs reality:** evidence was `"with the greatest power"`, but this is a selection criterion on the edict target, not a payoff/scale/gate.
  - **Suggested fix:** Tighten `condition.cares_high_power` to require a payoff frame (deals extra damage, grants bonuses, scales off power) rather than matching edict targeting clauses.

---

## The Princess Takes Flight  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Enchantment — Saga
**Mana cost:** {2}{W}

**Oracle text:**
```
(As this Saga enters and after your draw step, add a lore counter. Sacrifice after III.)
I — Exile up to one target creature.
II — Target creature you control gets +2/+2 and gains flying until end of turn.
III — Return the exiled card to the battlefield under its owner's control.
```

**Current tags:** `effect.cheat_into_play`, `effect.exile_creature`, `effect.grants_evasion`, `effect.grants_stat_buff`

### Issues

- **false-positive**: `effect.cheat_into_play`
  - **What's wrong:** The return is "under its owner's control" — this returns the opponent's creature to the opponent, not a cheat-into-play for your own card.
  - **Evidence vs reality:** evidence was `"exiled card to the battlefield"`, but the phrase is "under its owner's control," returning the opponent's card.
  - **Suggested fix:** Guard `effect.cheat_into_play` against "under its owner's control" returns — restrict to "under your control" for true cheating.

---

## Rust Harvester  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Artifact Creature — Robot
**Mana cost:** {R}

**Oracle text:**
```
Menace
{2}, {T}, Exile an artifact card from your graveyard: Put a +1/+1 counter on this creature, then it deals damage equal to its power to any target.
```

**Current tags:** `effect.counter_modified`, `effect.exile_from_graveyard`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.has_menace`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.deals_damage`
  - **What's wrong:** "It deals damage equal to its power to any target" is a direct damage effect.
  - **Evidence vs reality:** evidence was `"deals damage equal to its power"`, which is a damage effect pattern not currently matched.
  - **Suggested fix:** Extend `effect.deals_damage` to match "deals damage equal to its power" damage-scaling patterns.

---

## Fanatic of the Harrowing  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Creature — Human Cleric
**Mana cost:** {3}{B}

**Oracle text:**
```
When this creature enters, each player discards a card. If you discarded a card this way, draw a card.
```

**Current tags:** `effect.draws_or_discards`, `effect.targeted_discard`, `trigger.self_etb`

### Issues

- **false-positive**: `effect.targeted_discard`
  - **What's wrong:** "Each player discards" is symmetrical discard (hits the controller too), not "targeted opponent" discard.
  - **Evidence vs reality:** evidence was `"each player discards"`, but `effect.targeted_discard` is for opponent-only discard.
  - **Suggested fix:** Narrow `effect.targeted_discard` to exclude "each player" — restrict to "each opponent" or "target opponent."

---

## Saheeli, the Sun's Brilliance  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Artificer
**Mana cost:** {U}{R}

**Oracle text:**
```
{U}{R}, {T}: Create a token that's a copy of another target creature or artifact you control, except it's an artifact in addition to its other types. It gains haste. Sacrifice it at the beginning of the next end step.
```

**Current tags:** `condition.cares_artifacts`, `effect.copy_permanent_token`, `effect.create_token`, `effect.grants_haste`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.sacrifice_creature`, `trigger.beginning_of_end_step`

### Issues

- **missing**: `effect.sacrifice_artifact`
  - **What's wrong:** When copying a pure artifact, the token is an artifact (not a creature), and it gets sacrificed. `effect.sacrifice_artifact` should also fire.
  - **Evidence vs reality:** evidence was `"sacrifice it"` when the token is "a copy of another target creature or artifact," which can be a pure artifact.
  - **Suggested fix:** Add `effect.sacrifice_artifact` to cover the artifact-copy case.

---

## Mosswort Bridge  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Land
**Mana cost:** (none)

**Oracle text:**
```
Hideaway 4 (When this land enters, look at the top four cards of your library, exile one face down, then put the rest on the bottom in a random order.)
This land enters tapped.
{T}: Add {G}.
{G}, {T}: You may play the exiled card without paying its mana cost if creatures you control have total power 10 or greater.
```

**Current tags:** `condition.cares_high_power`, `effect.add_mana`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`

### Issues

- **missing**: `effect.exile_from_library`, `effect.cast_for_free`, `trigger.self_etb`
  - **What's wrong:** Hideaway's semantic content (exile from library, cast for free, ETB trigger) lives in stripped reminder text. The bare "hideaway 4" keyword is not matched by any rule.
  - **Evidence vs reality:** evidence was `"hideaway 4"`, but the reminder text that describes the three effects is stripped.
  - **Suggested fix:** Add a Hideaway keyword-anchor rule that emits `trigger.self_etb`, `effect.exile_from_library`, and `effect.cast_for_free`.

---

## Into the Pit  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Enchantment
**Mana cost:** {2}{B}

**Oracle text:**
```
You may look at the top card of your library any time.
You may cast spells from the top of your library by sacrificing a nonland permanent in addition to paying their other costs.
```

**Current tags:** `effect.cast_from_library_top`, `effect.look_at_top_n`

### Issues

- **missing**: `effect.sacrifice_permanent`
  - **What's wrong:** "By sacrificing a nonland permanent in addition to paying their other costs" is an explicit additional-cost sacrifice.
  - **Evidence vs reality:** evidence was `"sacrificing a nonland permanent"`, which is a nonland permanent sacrifice cost.
  - **Suggested fix:** Extend `effect.sacrifice_permanent` to match "by sacrificing a nonland permanent" additional-cost frames.

---

## Kulrath Zealot  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Creature — Elemental Warrior
**Mana cost:** {4}{R}

**Oracle text:**
```
When this creature enters, exile the top card of your library. Until the end of your next turn, you may play that card.
Basic landcycling {1}{R}
```

**Current tags:** `effect.cast_from_exile`, `effect.exile_from_library`, `effect.has_cycling`, `effect.impulse_draw`, `trigger.self_etb`

### Issues

- **missing**: `effect.tutors_basic_land`
  - **What's wrong:** Basic landcycling is a basic land search (the reminder text searches the library for a basic land).
  - **Evidence vs reality:** evidence was `"basic landcycling"`, which is a type-specific cycling variant not matched by `effect.tutors_basic_land`.
  - **Suggested fix:** Extend `effect.tutors_basic_land` to match "basic landcycling" and other type-specific cycling variants.

---

## Nymris, Oona's Trickster  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Faerie Knight
**Mana cost:** {3}{U}{B}

**Oracle text:**
```
Flash
Flying
Whenever you cast your first spell during each opponent's turn, look at the top two cards of your library. Put one of those cards into your hand and the other into your graveyard.
```

**Current tags:** `effect.has_flash`, `effect.has_flying`, `effect.look_at_top_n`, `effect.mill`, `trigger.spell_cast`

### Issues

- **missing**: `condition.cares_spells_cast_this_turn`
  - **What's wrong:** "Whenever you cast your first spell during each opponent's turn" is an ordinal-gate trigger on opponent turns.
  - **Evidence vs reality:** evidence was `"your first spell during each opponent's turn"`, which is an ordinal gate on spell-cast count.
  - **Suggested fix:** Verify that `condition.cares_spells_cast_this_turn` matches opponent-turn variants of ordinal spell-cast gates.

---

## Teval, Arbiter of Virtue  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Spirit Dragon
**Mana cost:** {2}{B}{G}{U}

**Oracle text:**
```
Flying, lifelink
Spells you cast have delve. (Each card you exile from your graveyard while casting those spells pays for {1}.)
Whenever you cast a spell, you lose life equal to its mana value.
```

**Current tags:** `effect.has_flying`, `effect.has_lifelink`, `effect.life_changed`, `trigger.spell_cast`

### Issues

- **missing**: `condition.cares_graveyard`, `effect.exile_from_graveyard`, `effect.cost_reduction`
  - **What's wrong:** Delve grants are stripped to the bare "delve" keyword, leaving no rule to match. The three effects (graveyard-cares, exile-from-graveyard, cost-reduction) are all semantically present but hidden in stripped reminder text.
  - **Evidence vs reality:** evidence was `"have delve"` (bare keyword), but the reminder text "(Each card you exile from your graveyard while casting those spells pays for {1})" is stripped.
  - **Suggested fix:** Add a Delve keyword-anchor rule that emits `condition.cares_graveyard`, `effect.exile_from_graveyard`, and `effect.cost_reduction`.

---

## Steel Overseer  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Artifact Creature — Construct
**Mana cost:** {2}

**Oracle text:**
```
{T}: Put a +1/+1 counter on each artifact creature you control.
```

**Current tags:** `effect.counter_modified`, `effect.has_activated_ability`, `effect.plus_one_counter`

### Issues

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** "Each artifact creature you control" explicitly references artifacts — this is an artifact-cares group.
  - **Evidence vs reality:** evidence was `"artifact creature[s] you control"`, which is scoped to artifacts.
  - **Suggested fix:** Extend `condition.cares_artifacts` to match "artifact creature[s] you control" in effect-scope phrases.

---

## Mirrorwing Dragon  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Creature — Dragon
**Mana cost:** {2}{U}{U}

**Oracle text:**
```
Flying
Whenever a spell targets this creature, that player copies that spell for each other creature they control that the spell could target.
```

**Current tags:** `effect.has_flying`, `trigger.spell_targets`

### Issues

- **missing**: `effect.copy_spell`
  - **What's wrong:** The card copies spells targeting this creature for each other valid target — a copy-spell effect.
  - **Evidence vs reality:** evidence was `"copies that spell"`, which is a spell-copy effect.
  - **Suggested fix:** Add `effect.copy_spell` to reflect Mirrorwing Dragon's copying ability.

---

## Summon: Esper Ramuh  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Wizard
**Mana cost:** (none)

**Oracle text:**
```
Menace
Summon: Esper Ramuh gets +1/+1 for each noncreature, nonland card in your graveyard.
```

**Current tags:** `effect.has_menace`

### Issues

- **missing**: `condition.cares_graveyard`
  - **What's wrong:** The creature scales its power/toughness based on graveyard content — a direct graveyard-count payoff.
  - **Evidence vs reality:** evidence was `"gets +1/+1 for each noncreature, nonland card in your graveyard"`, which is a graveyard-count scaler.
  - **Suggested fix:** Same pattern as Xande, Dark Mage — extend `condition.cares_graveyard` to match graveyard-count scalers.

---

## Crashing Wave  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Instant
**Mana cost:** {2}{U}

**Oracle text:**
```
Distribute three stun counters among any number of tapped creatures you don't control.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.stun_counter`
  - **What's wrong:** The spell places stun counters on creatures.
  - **Evidence vs reality:** evidence was `"distribute three stun counters"`, which matches the stun-counter effect.
  - **Suggested fix:** Extend `effect.stun_counter` to match "distribute [N] stun counters" spread patterns.

---

## Eternal Skylord  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Creature — Angel Knight
**Mana cost:** {3}{W}

**Oracle text:**
```
Flying, vigilance
Amass Zombies 2 (If you don't control an Army, create a 0/0 black Zombie Army creature token first. Put two +1/+1 counters on an Army you control.)
```

**Current tags:** `effect.counter_modified`, `effect.has_flying`, `effect.has_vigilance`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.create_creature_token`
  - **What's wrong:** Amass creates a Zombie Army token if none exists. The reminder text is stripped, leaving no rule for the bare "amass" keyword.
  - **Evidence vs reality:** evidence was `"amass zombies 2"` (bare keyword), but reminder text includes token creation.
  - **Suggested fix:** Add an Amass keyword-anchor rule that emits `effect.create_creature_token` and `effect.plus_one_counter`.

---

## Dauthi Voidwalker  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Creature — Dauthi Rogue
**Mana cost:** {B}{B}

**Oracle text:**
```
Shadow
If a card would be put into an opponent's graveyard from anywhere, instead exile it with a void counter on it.
{T}, Sacrifice this creature: Choose an exiled card an opponent owns with a void counter on it. You may play it this turn without paying its mana cost.
```

**Current tags:** `effect.cast_from_exile`, `effect.has_activated_ability`, `effect.sacrifice_creature`

### Issues

- **missing**: `condition.cares_exile_pile`
  - **What's wrong:** The activated ability uses exiled cards (from this card's replacement effect) as a resource. The card generates and exploits an exile pile.
  - **Evidence vs reality:** evidence was `"exiled card an opponent owns with a void counter"`, which is an exile pile gated on cards this card exiled.
  - **Suggested fix:** Extend `condition.cares_exile_pile` to match "exiled card … with a void counter" patterns for cards exiled by this card's effect.

---

## FOLLOW-UP: grants-axis opponent-actor leak  <!-- filed 2026-07-02, v0.50.0 batch -->

The Sentry, Golden Guardian gets `effect.grants_evasion` / `effect.grants_indestructible` from keywords on a token it makes an OPPONENT create. The create_* rules carry the OPPONENT_CREATES actor guard; the grants_* token frames do not. FP class to fix: actor-guard the grants_* token-creation frames.

---
