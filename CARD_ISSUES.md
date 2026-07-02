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

## The Ruinous Wrecking Crew  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Villain
**Mana cost:** {X}{B}{R}

**Oracle text:**
```
The Ruinous Wrecking Crew enters with X +1/+1 counters on it.
When The Ruinous Wrecking Crew enters, choose up to X —
• Discard a card, then draw a card.
• Target opponent loses 2 life.
• Destroy target token.
• Each player sacrifices a creature of their choice.
```

**Current tags:** `condition.has_x_in_cost`, `effect.counter_modified`, `effect.destroy_permanent`, `effect.draws_or_discards`, `effect.edict`, `effect.life_changed`, `effect.plus_one_counter`, `trigger.self_etb`, `effect.destroy_creature`, `effect.destroy_artifact`, `effect.destroy_enchantment`, `effect.destroy_planeswalker`, `effect.destroy_land`

### Issues

- **false-positive**: `effect.destroy_planeswalker`, `effect.destroy_land`
  - **What's wrong:** "Destroy target token" does not generically cover planeswalker or land tokens — these are essentially nonexistent in Standard practice.
  - **Evidence vs reality:** evidence was `"destroy target token"`, but tokens are almost exclusively creatures, artifacts, or enchantments.
  - **Suggested fix:** The typed-destroy expansion logic should exclude planeswalker and land when the target is a generic token.

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

## The Kingpin of Crime  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Villain
**Mana cost:** {1}{B}{G}{U}

**Oracle text:**
```
Extort (Whenever you cast a spell, each opponent loses 1 life and you gain that much life.)
{1}, {T}: Create a 1/2 black and green Pest creature token.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`

### Issues

- **missing**: `trigger.spell_cast`, `effect.drain`
  - **What's wrong:** Extort's reminder text is stripped, leaving only the bare "extort" keyword. The trigger (spell_cast) and drain effect are both semantically present but unmatched.
  - **Evidence vs reality:** evidence was `"extort"` (bare keyword), but the reminder text "(whenever you cast a spell, each opponent loses 1 life and you gain that much life)" is stripped.
  - **Suggested fix:** Add an Extort keyword-anchor rule that emits `trigger.spell_cast` and `effect.drain`.

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

## Okoye, Dora Milaje Leader  <!-- audited 2026-06-21, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Warrior Ally
**Mana cost:** {1}{R}{W}

**Oracle text:**
```
Attacking creature tokens you control have first strike.
```

**Current tags:** `effect.grants_evasion`

### Issues

- **missing**: `effect.grants_first_strike`
  - **What's wrong:** The card grants first strike to attacking tokens.
  - **Evidence vs reality:** evidence was `"attacking creature tokens you control have first strike"`, which is a first-strike grant.
  - **Suggested fix:** Extend `effect.grants_first_strike` to match "have first strike" anthem grants on tokens.

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

## A.I.M. Scientists  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Creature — Human Scientist Villain
**Mana cost:** {3}{U}

**Oracle text:**
```
When this creature enters, it connives. (Draw a card, then discard a card. If you discarded a nonland card, put a +1/+1 counter on this creature.)
Basic landcycling {2} ({2}, Discard this card: Search your library for a basic land card, reveal it, put it into your hand, then shuffle.)
```

**Current tags:** `effect.has_cycling`, `trigger.self_etb`

### Issues

- **coverage-gap**: connive keyword — no tag in catalog
  - **What's wrong:** The connive mechanic draws a card, discards a card, then conditionally places a +1/+1 counter — all three component effects live entirely in the reminder text block `(...)`, which is stripped before rule matching. The normalized oracle text retains only "it connives." No `effect.connive` or equivalent tag exists in the catalog.
  - **Evidence vs reality:** evidence was `"it connives"` — the keyword is present but its semantic content is invisible to all current rules.
  - **Suggested fix:** Add a connive keyword-anchor rule emitting `effect.draws_or_discards` and `effect.plus_one_counter`. Systemic gap: also affects Baron Helmut Zemo, Baron Strucker HYDRA Overlord, Kang Temporal Tyrant, Leader Super-Genius, and M.O.D.O.K.

---

## Baron Helmut Zemo  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Noble Villain
**Mana cost:** {B}{B}{B}

**Oracle text:**
```
Whenever you cast a black spell from your hand, Baron Helmut Zemo connives.
Boast — Exile any number of black cards from your graveyard with fifteen or more black mana symbols among their mana costs: Copy those exiled cards. You may cast up to three of the copies without paying their mana costs. (Activate only if this creature attacked this turn and only once each turn.)
```

**Current tags:** `effect.cast_for_free`, `trigger.spell_cast`

### Issues

- **missing**: `effect.has_activated_ability`
  - **What's wrong:** The Boast line is an activated ability (cost: effect) with a non-standard "Boast —" prefix instead of the typical `{mana}:` or `{T}:` format. The rule likely requires a conventional cost prefix and misses this pattern.
  - **Evidence vs reality:** evidence was `"boast — exile any number of black cards from your graveyard...:"` — a cost:effect structure is present even with the non-standard activation restriction.
  - **Suggested fix:** Extend `effect.has_activated_ability` to recognize the "Boast — [cost]:" pattern (em-dash prefix, activation restriction in reminder text).

- **missing**: `effect.exile_from_graveyard`
  - **What's wrong:** The Boast ability's cost is "Exile any number of black cards from your graveyard" — explicitly exiles cards from the graveyard as an activation cost.
  - **Evidence vs reality:** evidence was `"exile any number of black cards from your graveyard"` — unambiguous graveyard exile.
  - **Suggested fix:** Verify that `effect.exile_from_graveyard` covers exile-as-cost appearances (text before the `:` in an activated ability line).

- **missing**: `effect.copy_spell`
  - **What's wrong:** "Copy those exiled cards" creates copies of cards. The `effect.copy_spell` family should fire.
  - **Evidence vs reality:** evidence was `"copy those exiled cards"` — card copies are being made.
  - **Suggested fix:** Add a regex arm to `effect.copy_spell` catching "copy those exiled cards."

---

## Beast, Erudite Aerialist  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Mutant Scientist Hero
**Mana cost:** {3}{G/U}

**Oracle text:**
```
As long as you've put one or more +1/+1 counters on Beast this turn, he has flying.
Whenever Beast deals combat damage to a player, draw a card.
```

**Current tags:** `effect.draws_or_discards`, `effect.grants_evasion`, `trigger.damage_dealt`

### Issues

- **false-positive**: `effect.grants_evasion`
  - **What's wrong:** Beast's ability grants flying to himself conditionally ("he has flying"), not to other creatures. The `effect.grants_evasion` description states "Gives flying, menace, or intimidate to **other creatures** or to tokens it creates."
  - **Evidence vs reality:** evidence was `"has flying"`, but this is a self-conditional gain — Beast gaining flying for himself when counters are placed on him this turn, not a grant to other creatures.
  - **Suggested fix:** Narrow `effect.grants_evasion` to exclude self-conditional-gain patterns ("__SELF__ has flying" / "he has flying"). Self-evasion should resolve to `effect.has_flying` rather than the other-grant axis.

---

## Black Widow, Double Agent  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Hero Villain
**Mana cost:** {1}{W}{B}

**Oracle text:**
```
Deathtouch
Whenever a creature you control attacks alone, it gains first strike and menace until end of turn. (It can't be blocked except by two or more creatures.)
```

**Current tags:** `effect.grants_first_strike`, `effect.has_deathtouch`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.grants_evasion`
  - **What's wrong:** The trigger grants menace (alongside first strike) to the attacking creature. The `effect.grants_evasion` description explicitly covers menace ("Gives flying, menace, or intimidate to other creatures"), but the tag is absent.
  - **Evidence vs reality:** evidence was `"gains first strike and menace until end of turn"` — menace is unambiguously an evasion keyword granted to another creature.
  - **Suggested fix:** Broaden `effect.grants_evasion` to capture "gains...menace" in grant contexts (not only "with menace" on token-creation lines).

---

## Captain America, Super-Soldier  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Soldier Hero
**Mana cost:** {1}{W}{W}

**Oracle text:**
```
First strike
Captain America enters with a shield counter on him. (If he would be dealt damage or destroyed, remove a shield counter from him instead.)
As long as Captain America has a shield counter on him, you and other Heroes you control have hexproof.
```

**Current tags:** `effect.counter_modified`, `effect.grants_hexproof`, `effect.has_first_strike`

### Issues

- **missing**: `condition.cares_tribe.hero`
  - **What's wrong:** "Other Heroes you control have hexproof" explicitly references the Hero creature type as recipients of a conditional ability. `condition.cares_tribe.hero` should fire.
  - **Evidence vs reality:** evidence was `"other heroes you control have hexproof"` — the word "heroes" appears in the oracle text as a creature-type filter.
  - **Suggested fix:** Ensure `condition.cares_tribe.hero` regex captures "heroes you control" in static-grant/conditional-anthem contexts, not only in triggered-ability phrases.

---

## Captain America, Wings of Freedom  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Soldier Hero
**Mana cost:** {2}{W}

**Oracle text:**
```
Flying, first strike, ward {1}
Whenever Captain America attacks, each other Hero you control gets +X/+X until end of turn, where X is Captain America's toughness.
```

**Current tags:** `condition.cares_tribe.hero`, `effect.has_first_strike`, `effect.has_flying`, `effect.has_ward`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.grants_stat_buff`
  - **What's wrong:** The attack trigger grants "+X/+X until end of turn" to each other Hero you control — a scalable anthem-style stat buff. `effect.grants_stat_buff` covers "+N/+M buff to one or more creatures."
  - **Evidence vs reality:** evidence was `"each other hero you control gets +x/+x until end of turn"` — a temporary stat grant to multiple creatures.
  - **Suggested fix:** Ensure `effect.grants_stat_buff` regex captures dynamic "+X/+X" patterns (not only fixed "+N/+N" integers).

---

## Castle Doom  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Land
**Mana cost:** (none)

**Oracle text:**
```
{T}: Add {C}.
{T}: Add one mana of any color. Spend this mana only to cast an artifact spell.
{3}, {T}, Sacrifice an artifact: Create a 3/3 colorless Robot Villain artifact creature token named Doombot. Activate only as a sorcery.
```

**Current tags:** `condition.cares_artifacts`, `effect.add_mana`, `effect.create_creature_token`, `effect.create_token`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.sacrifice_artifact`

### Issues

- **missing**: `condition.cares_tribe.villain`
  - **What's wrong:** The activated ability creates a "Robot **Villain** artifact creature token named Doombot." The Villain creature type is directly in the token's type line but the tag is absent. Systemic pattern: Castle Doom, Construct a Cosmic Cube, Doctor Doom, HYDRA Troopers, Robot Domination, and Ultron all create Villain tokens without this tag; The Sentry (which also creates a Villain token) does get it — indicating a regex inconsistency.
  - **Evidence vs reality:** evidence was `"robot villain artifact creature token"` — the word "villain" is present in the oracle text.
  - **Suggested fix:** Verify and broaden `condition.cares_tribe.villain` to capture Villain in token type-line descriptions consistently ("Robot Villain," "Horror Villain," plain "Villain creature token").

---

## Claim the Kingdom  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Enchantment — Plan
**Mana cost:** {1}{G}

**Oracle text:**
```
Landfall — Whenever a land you control enters, put a +1/+1 counter on target creature you control and a plan counter on this enchantment.
When the fourth plan counter is put on this enchantment, sacrifice it. When you do, put an indestructible counter on target creature you control.
```

**Current tags:** `condition.cares_lands`, `effect.counter_modified`, `effect.plus_one_counter`, `effect.sacrifice_enchantment`, `trigger.counter_changed`, `trigger.landfall`

### Issues

- **missing**: `effect.grants_indestructible`
  - **What's wrong:** "Put an indestructible counter on target creature you control" grants indestructible. Captain Marvel, Earth's Protector uses identical language and correctly gets `effect.grants_indestructible`; Claim the Kingdom does not.
  - **Evidence vs reality:** evidence was `"put an indestructible counter on target creature you control"` — placing an indestructible counter definitionally grants the indestructible keyword.
  - **Suggested fix:** Confirm `effect.grants_indestructible` is not scoped only to named-self contexts; it should fire on "put an indestructible counter on target creature" broadly.

---

## Construct a Cosmic Cube  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Enchantment — Plan
**Mana cost:** {2}{B}

**Oracle text:**
```
Whenever you draw your second card each turn, create a 2/1 black Villain creature token with menace and put a plan counter on this enchantment.
When the seventh plan counter is put on this enchantment, sacrifice it. When you do, you control target opponent during their next turn. (You see all cards that player could see and make all decisions for them.)
```

**Current tags:** `condition.cares_cards_drawn_this_turn`, `effect.counter_modified`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_evasion`, `effect.sacrifice_enchantment`, `trigger.card_drawn_discarded`, `trigger.counter_changed`

### Issues

- **missing**: `condition.cares_tribe.villain`
  - **What's wrong:** Creates "a 2/1 black **Villain** creature token with menace." Villain is in the token type line. Same systemic miss as Castle Doom, Doctor Doom, HYDRA Troopers, Robot Domination, and Ultron.
  - **Evidence vs reality:** evidence was `"2/1 black villain creature token"` — Villain creature type is named in the oracle text.
  - **Suggested fix:** Same fix as Castle Doom — broaden `condition.cares_tribe.villain` to capture Villain in token type-line descriptions.

---

## Doctor Doom  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Scientist Villain
**Mana cost:** {4}{B}{B}

**Oracle text:**
```
When Doctor Doom enters, create two 3/3 colorless Robot Villain artifact creature tokens named Doombot.
As long as you control an artifact creature or a Plan, Doctor Doom has indestructible.
At the beginning of your end step, you draw a card and lose 1 life.
```

**Current tags:** `condition.cares_artifacts`, `condition.controls_plan`, `effect.create_creature_token`, `effect.create_token`, `effect.draws_or_discards`, `effect.grants_indestructible`, `effect.life_changed`, `trigger.beginning_of_end_step`, `trigger.self_etb`

### Issues

- **missing**: `condition.cares_tribe.villain`
  - **What's wrong:** Creates "two 3/3 colorless Robot **Villain** artifact creature tokens named Doombot." Villain is in the token type line. Same systemic miss as Castle Doom and others.
  - **Evidence vs reality:** evidence was `"robot villain artifact creature token"` — Villain type is referenced in the oracle text.
  - **Suggested fix:** Same fix as Castle Doom — broaden `condition.cares_tribe.villain` to capture Villain in token type lines.

---

## Hercules, Prince of Power  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Demigod Warrior Hero
**Mana cost:** {2}{G}

**Oracle text:**
```
Power-up — {4}{G}: Put a +1/+1 counter on Hercules. He gains vigilance, indestructible, and haste until end of turn. (Activate each power-up ability only once. Reduce the cost by his mana cost if he entered this turn.)
```

**Current tags:** `effect.counter_modified`, `effect.grants_haste`, `effect.grants_indestructible`, `effect.grants_vigilance`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.plus_one_counter`

### Issues

- **missing**: `condition.power_up`
  - **What's wrong:** Hercules has a "Power-up —" keyword ability but is missing `condition.power_up`. Every other Power-up creature in MSH (Abomination, Captain Marvel, Hulk Gamma Goliath, Human Torch, Kang the Conqueror, Nick Fury, Quicksilver, Stature, Thanos, White Tiger) correctly gets this tag. Hercules is the lone miss.
  - **Evidence vs reality:** evidence was `"power-up — {4}{g}:"` — the keyword is explicitly present in the normalized oracle text.
  - **Suggested fix:** Investigate why the `condition.power_up` regex misses Hercules; "power-up" appears at the start of the ability line in the same pattern as all other Power-up creatures.

---

## HYDRA Troopers  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Creature — Human Soldier Villain
**Mana cost:** {2}{B}

**Oracle text:**
```
When this creature enters, create a tapped 2/1 black Villain creature token with menace if there are two or more creature cards in your graveyard. Otherwise, mill two cards. (Put the top two cards of your library into your graveyard.)
```

**Current tags:** `condition.cares_graveyard`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_evasion`, `effect.mill`, `trigger.self_etb`

### Issues

- **missing**: `condition.cares_tribe.villain`
  - **What's wrong:** Creates "a tapped 2/1 black **Villain** creature token with menace." Villain is in the token type line. Same systemic miss as Castle Doom and others.
  - **Evidence vs reality:** evidence was `"2/1 black villain creature token"` — Villain creature type is referenced.
  - **Suggested fix:** Same fix as Castle Doom — broaden `condition.cares_tribe.villain` to capture Villain in token type-line descriptions.

---

## Invisible Woman, Sue Storm  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Hero
**Mana cost:** {4}{W}

**Oracle text:**
```
Lifelink
Whenever you put one or more +1/+1 counters on one or more other Heroes you control, you may create a 0/4 colorless Wall creature token with defender.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.has_lifelink`, `trigger.counter_changed`

### Issues

- **missing**: `condition.cares_tribe.hero`
  - **What's wrong:** The trigger condition explicitly gates on "other **Heroes** you control" — the Hero creature type is the filter for the trigger. This is exactly what `condition.cares_tribe.hero` captures.
  - **Evidence vs reality:** evidence was `"one or more other heroes you control"` — Hero type is the condition being checked.
  - **Suggested fix:** Ensure `condition.cares_tribe.hero` regex captures "heroes you control" in trigger-condition context ("whenever you put counters on ... heroes you control"), not only in anthem/grant body text.

---

## Iron Fist, Living Weapon  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Warrior Hero
**Mana cost:** {2}{R}

**Oracle text:**
```
Whenever you cast a spell that targets a creature you control, Iron Fist gains "{T}: Iron Fist deals damage equal to his power to any other target" until end of turn.
```

**Current tags:** `trigger.spell_cast`

### Issues

- **missing**: `effect.has_activated_ability`
  - **What's wrong:** The triggered ability temporarily grants Iron Fist an activated ability. The `{T}:` cost:effect pattern is embedded in a quoted string in the oracle text, but the rule may not look inside quoted grant strings.
  - **Evidence vs reality:** evidence was `"{t}: iron fist deals damage equal to his power"` — a cost:effect structure is present in the oracle text, just inside a quoted grant.
  - **Suggested fix:** Ensure `effect.has_activated_ability` captures activated ability patterns inside quoted grant strings (`gains "...:..." until end of turn`).

- **missing**: `effect.deals_damage`
  - **What's wrong:** The granted ability deals damage ("Iron Fist deals damage equal to his power to any other target"). `effect.deals_damage` should fire.
  - **Evidence vs reality:** evidence was `"iron fist deals damage equal to his power"` — a source-of-damage effect is present inside the quoted grant.
  - **Suggested fix:** Ensure `effect.deals_damage` captures "__SELF__ deals damage" patterns inside quoted grant-ability strings.

---

## King T'Challa // Black Panther, Hope Enduring  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Noble Hero // Legendary Creature — Human Warrior Hero
**Mana cost:** (none — transform MDFC)

**Oracle text:**
```
Flash
Whenever a player draws their second card each turn, you draw a card.
{4}{W}{U}: Transform King T'Challa. Activate only as a sorcery.

Flash
Double strike
Prevent all damage that would be dealt to Black Panther.
Whenever Black Panther deals combat damage to a player, draw a card.
```

**Current tags:** `effect.draws_or_discards`, `trigger.card_drawn_discarded`, `effect.prevent_damage`, `trigger.damage_dealt`, `effect.has_activated_ability`, `effect.has_double_strike`, `effect.has_first_strike`, `effect.has_flash`, `effect.has_mana_activated_ability`

### Issues

- **false-positive**: `effect.has_first_strike`
  - **What's wrong:** Neither face of this card has "First strike" — only "Double strike" appears (on the back face). The `effect.has_first_strike` rule fires on the "Double strike" text, matching "strike" inside "double strike." Systemic FP: same root cause as Mockingbird Ace Agent, The Vision, and Quicksilver Brash Blur.
  - **Evidence vs reality:** evidence was `"double strike"` — no "first strike" text exists on either face.
  - **Suggested fix:** Narrow `effect.has_first_strike` regex to exclude double strike. A negative lookahead (`(?<!double )first strike`) or requiring the keyword to appear in isolation would fix the systemic issue across all four affected cards.

---

## Leader, Super-Genius  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Gamma Scientist Villain
**Mana cost:** {2}{U}{U}

**Oracle text:**
```
If a creature you control would connive, instead you draw a card, then that creature connives.
At the beginning of combat on your turn, target creature you control connives. (Draw a card, then discard a card. If you discarded a nonland card, put a +1/+1 counter on that creature.)
```

**Current tags:** `trigger.beginning_of_combat`

### Issues

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** The first ability's oracle text contains "instead you draw a card" explicitly — not inside any parenthetical reminder text. This is a replacement effect that draws a card before the connive keyword fires.
  - **Evidence vs reality:** evidence was `"instead you draw a card"` — in normalized text, outside any `(...)` block, in the outer replacement clause.
  - **Suggested fix:** Ensure `effect.draws_or_discards` captures "you draw a card" in replacement-effect contexts ("instead you draw a card, then...").

---

## Luke Cage, Power Man  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Hero
**Mana cost:** {3}{W}

**Oracle text:**
```
Unbreakable Skin — Whenever Luke Cage attacks alone, he gets +2/+0 and gains indestructible until end of turn. (Damage and effects that say "destroy" don't destroy him.)
```

**Current tags:** `effect.grants_indestructible`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.grants_stat_buff`
  - **What's wrong:** "He gets +2/+0 until end of turn" is a temporary power boost. `effect.grants_stat_buff` covers "+N/+M buff to one or more creatures." Iron Man, Master of Machines correctly receives this tag for self-buffs; Luke Cage does not.
  - **Evidence vs reality:** evidence was `"he gets +2/+0"` — a stat buff applied to himself temporarily.
  - **Suggested fix:** Confirm `effect.grants_stat_buff` covers "he gets +N/+M" self-buff phrasing, not only "creatures get" or "target creature gets."

---

## M.O.D.O.K.  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Artifact Creature — Villain
**Mana cost:** {3}{B}{B}

**Oracle text:**
```
Flying, lifelink
Mental Organism — Pay 3 life: M.O.D.O.K. connives. Activate only during your turn. (Draw a card, then discard a card. If you discarded a nonland card, put a +1/+1 counter on this creature.)
Designed Only for Killing — Creatures your opponents control get -1/-1.
```

**Current tags:** `effect.debuff_minus_n`, `effect.has_activated_ability`, `effect.has_flying`, `effect.has_lifelink`, `effect.life_changed`

### Issues

- **false-positive**: `effect.debuff_minus_n`
  - **What's wrong:** The tag description says "Gives a creature -N/-N **until end of turn**." M.O.D.O.K.'s "Designed Only for Killing" ability is a **permanent static continuous ability** — "Creatures your opponents control get -1/-1" with no temporal qualifier. This is a mass static anthem-in-reverse, not a transient until-EOT debuff.
  - **Evidence vs reality:** evidence was `"-1/-1"` from "creatures your opponents control get -1/-1" — no "until end of turn" clause; the effect is continuous while M.O.D.O.K. is on the battlefield.
  - **Suggested fix:** Narrow `effect.debuff_minus_n` to require "until end of turn" or equivalent temporality in the matched clause. Static mass-debuff effects may need a separate `effect.static_debuff` tag or the description should be updated to explicitly include static debuffs.

---

## Mockingbird, Ace Agent  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Spy Hero
**Mana cost:** {3}{W}

**Oracle text:**
```
Double strike
Whenever you cast a spell that targets a creature you control, put a +1/+1 counter on Mockingbird.
```

**Current tags:** `effect.counter_modified`, `effect.has_double_strike`, `effect.has_first_strike`, `effect.plus_one_counter`, `trigger.spell_cast`

### Issues

- **false-positive**: `effect.has_first_strike`
  - **What's wrong:** Mockingbird has "Double strike" but NOT "First strike." The `effect.has_first_strike` rule fires on the "Double strike" oracle text — same root cause as King T'Challa, The Vision, and Quicksilver. Systemic issue.
  - **Evidence vs reality:** evidence was `"double strike"` — no "first strike" text is present; the rule matches "strike" inside "double strike."
  - **Suggested fix:** Narrow `effect.has_first_strike` regex to exclude double strike (negative lookahead or require "first" before "strike" not preceded by "double ").

---

## Okoye, Dora Milaje Leader  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Warrior Hero
**Mana cost:** {3}{W}

**Oracle text:**
```
When Okoye enters, create two 1/1 white Soldier creature tokens.
Attacking creature tokens you control have first strike.
```

**Current tags:** `condition.cares_tokens`, `effect.create_creature_token`, `effect.create_token`, `trigger.self_etb`

### Issues

- **missing**: `effect.grants_first_strike`
  - **What's wrong:** "Attacking creature tokens you control have first strike" is a static perpetual grant of first strike to a class of creatures. `effect.grants_first_strike` description: "Grants the first strike keyword to one or more creatures (temporary or perpetual)." This fits exactly.
  - **Evidence vs reality:** evidence was `"attacking creature tokens you control have first strike"` — first strike is granted to a category of controlled creatures via a static ability.
  - **Suggested fix:** Ensure `effect.grants_first_strike` captures "have first strike" in static-grant contexts ("X you control have first strike"), not only "gains first strike" in triggered/activated contexts.

---

## Quicksilver, Brash Blur  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Mutant Hero
**Mana cost:** {R}

**Oracle text:**
```
If Quicksilver, Brash Blur is in your opening hand, you may begin the game with him on the battlefield.
Haste
Power-up — {4}{R}: Put a +1/+1 counter and a double strike counter on Quicksilver. (Activate each power-up ability only once. Reduce the cost by his mana cost if he entered this turn.)
```

**Current tags:** `condition.power_up`, `effect.counter_modified`, `effect.grants_double_strike`, `effect.grants_first_strike`, `effect.has_activated_ability`, `effect.has_haste`, `effect.has_mana_activated_ability`

### Issues

- **false-positive**: `effect.grants_first_strike`
  - **What's wrong:** The Power-up ability places "a double strike counter on Quicksilver" — granting double strike, not first strike. The `effect.grants_first_strike` rule fires because "double strike counter" contains "strike." Same systemic root cause as the `has_first_strike` misfire on King T'Challa, Mockingbird, and The Vision.
  - **Evidence vs reality:** evidence was `"a double strike counter"` — no "first strike" text exists; "strike" in "double strike counter" is being matched.
  - **Suggested fix:** Same root fix — prevent grants_first_strike from matching "double strike" text.

- **missing**: `effect.plus_one_counter`
  - **What's wrong:** "Put a +1/+1 counter **and** a double strike counter on Quicksilver" — a +1/+1 counter is unambiguously being placed, but the tag is absent. The intervening "and a double strike counter" breaks the phrase-match if the regex requires "put a +1/+1 counter on" as an unbroken substring.
  - **Evidence vs reality:** evidence was `"put a +1/+1 counter and a double strike counter on"` — the +1/+1 counter placement is clear.
  - **Suggested fix:** Broaden `effect.plus_one_counter` regex to allow "put a +1/+1 counter [and [a/an ... counter]]+ on [target]" conjunctive patterns.

---

## Rewrite History  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Enchantment — Plan
**Mana cost:** {2}{U}

**Oracle text:**
```
Whenever one or more creatures you control become tapped, draw a card, then discard a card and put a plan counter on this enchantment.
When the fourth plan counter is put on this enchantment, sacrifice it. When you do, return up to two target instant and/or sorcery cards from your graveyard to your hand.
```

**Current tags:** `condition.cares_instant_sorcery_in_graveyard`, `effect.counter_modified`, `effect.draws_or_discards`, `effect.return_from_graveyard_to_hand`, `effect.sacrifice_enchantment`, `trigger.counter_changed`

### Issues

- **missing**: `trigger.tapped_or_untapped`
  - **What's wrong:** "Whenever one or more creatures you control become tapped" is the primary trigger for this card's draw-discard ability. `trigger.tapped_or_untapped` is completely absent. Agent Maria Hill uses nearly identical language and correctly has this tag; Rewrite History uses plural collective phrasing.
  - **Evidence vs reality:** evidence was `"whenever one or more creatures you control become tapped"` — a tap-trigger pattern is present using plural phrasing.
  - **Suggested fix:** Broaden `trigger.tapped_or_untapped` to capture "creatures (plural) become tapped" / "one or more creatures … become tapped" in addition to the singular "a creature becomes tapped."

---

## Robot Domination  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Enchantment — Plan
**Mana cost:** {3}{B}

**Oracle text:**
```
Whenever one or more creature cards are put into your graveyard from anywhere, you draw a card, lose 1 life, and put a plan counter on this enchantment.
When the third plan counter is put on this enchantment, sacrifice it and create three 2/2 colorless Robot Villain artifact creature tokens.
```

**Current tags:** `effect.counter_modified`, `effect.create_creature_token`, `effect.create_token`, `effect.draws_or_discards`, `effect.life_changed`, `effect.sacrifice_enchantment`, `trigger.counter_changed`

### Issues

- **missing**: `condition.cares_tribe.villain`
  - **What's wrong:** Creates "three 2/2 colorless Robot **Villain** artifact creature tokens." Villain is in the token type line. Same systemic miss as Castle Doom, Doctor Doom, HYDRA Troopers, Construct a Cosmic Cube, and Ultron.
  - **Evidence vs reality:** evidence was `"robot villain artifact creature tokens"` — Villain type is referenced.
  - **Suggested fix:** Same fix as Castle Doom — broaden `condition.cares_tribe.villain` to capture Villain in token type-line descriptions.

- **missing**: `condition.cares_graveyard`
  - **What's wrong:** "Whenever one or more creature cards are put into your graveyard from anywhere" is the triggering condition — the card's draw/life effect fires based on creatures entering the graveyard from any zone. `condition.cares_graveyard` should fire.
  - **Evidence vs reality:** evidence was `"whenever one or more creature cards are put into your graveyard from anywhere"` — the phrase "your graveyard" is present as the condition.
  - **Suggested fix:** Ensure `condition.cares_graveyard` matches "put into your graveyard from anywhere" trigger clauses (not only static count conditions like "X or more creature cards in your graveyard").

---

## Super Intelligence  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Enchantment — Aura
**Mana cost:** {U}

**Oracle text:**
```
Enchant creature
At the beginning of the upkeep of enchanted creature's controller, that player draws a card.
```

**Current tags:** `effect.draws_or_discards`

### Issues

- **missing**: `trigger.upkeep`
  - **What's wrong:** "At the beginning of the upkeep of enchanted creature's controller" is clearly an upkeep trigger. `trigger.upkeep` is absent.
  - **Evidence vs reality:** evidence was `"at the beginning of the upkeep of enchanted creature's controller"` — an upkeep trigger with a non-standard possessive-noun-phrase subject instead of "your" or "each player's."
  - **Suggested fix:** Verify `trigger.upkeep` regex captures "at the beginning of the upkeep of [possessive phrase]" not only "at the beginning of your upkeep."

---

## Super-Skrull  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Skrull Shapeshifter Villain
**Mana cost:** {1}{B}{B}{B}

**Oracle text:**
```
Flying
{2}{W}: Create a 0/4 colorless Wall creature token with defender.
{3}{G}: Super-Skrull gets +4/+4 until end of turn.
{4}{R}: Super-Skrull deals 4 damage to target creature.
{5}{U}: Target player draws four cards.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.deals_damage`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.has_flying`, `effect.has_mana_activated_ability`

### Issues

- **missing**: `effect.grants_stat_buff`
  - **What's wrong:** "{3}{G}: Super-Skrull gets +4/+4 until end of turn" is a temporary self-stat-buff activated ability. `effect.grants_stat_buff` fires on "+N/+M buff to one or more creatures." The same pattern (self-buff "gets +N/+N") is also missing on Luke Cage, Power Man.
  - **Evidence vs reality:** evidence was `"super-skrull gets +4/+4 until end of turn"` — a self-stat-buff is present.
  - **Suggested fix:** Confirm `effect.grants_stat_buff` covers "gets +N/+N until end of turn" self-buff phrasing (not only "creatures get" or "target creature gets").

---

## The Kingpin of Crime  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Villain
**Mana cost:** {1}{W}{B}

**Oracle text:**
```
Extort (Whenever you cast a spell, you may pay {W/B}. If you do, each opponent loses 1 life and you gain that much life.)
Whenever you attack, you may pay 2 life. If you do, until end of turn, creatures you control with toughness greater than their power assign combat damage equal to their toughness rather than their power.
```

**Current tags:** `effect.life_changed`, `trigger.attack_or_block`

### Issues

- **coverage-gap**: extort keyword — no tag in catalog
  - **What's wrong:** The Extort mechanic — "whenever you cast a spell, you may pay {W/B}; if you do, each opponent loses 1 life and you gain that much life" — is entirely encoded in the reminder text block `(...)`, which is stripped before rule matching. After normalization the oracle text retains only "extort." No `trigger.spell_cast` or `effect.drain` fires from the keyword alone. (`effect.life_changed` does fire, but from the second ability, not from extort.)
  - **Evidence vs reality:** evidence was `"extort"` — the keyword is present but its spell-cast trigger and drain effect are invisible to all current rules.
  - **Suggested fix:** Add an Extort keyword-anchor rule emitting `trigger.spell_cast` and `effect.drain`. Same pattern as `effect.has_cycling` firing on the bare cycling keyword.

---

## The Masters of Evil  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Villain
**Mana cost:** {5}{B}

**Oracle text:**
```
Other Villains you control get +2/+1.
{1}{B}, Discard this card: Search your library for a Plan card, reveal it, put it into your hand, then shuffle.
```

**Current tags:** `condition.cares_tribe.villain`, `effect.grants_stat_buff`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`

### Issues

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** The activation cost includes "Discard this card." Other cards with "Discard a card" as an activation cost (e.g., Misty Knight, Hero for Hire) correctly fire `effect.draws_or_discards`. The Masters of Evil uses the self-discard form and does not get tagged.
  - **Evidence vs reality:** evidence was `"discard this card"` — a card is discarded as part of the activation cost.
  - **Suggested fix:** Ensure `effect.draws_or_discards` captures "discard this card" (self-discard-as-cost) in addition to "discard a card."

---

## The Mighty Thor, Jane Foster  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human God Hero
**Mana cost:** {1}{W}{U}

**Oracle text:**
```
Flying
Whenever The Mighty Thor attacks, exile up to one target nontoken artifact or creature, then return that card to the battlefield tapped under its owner's control.
Whenever an Equipment you control enters, draw a card.
```

**Current tags:** `condition.cares_subtype.equipment`, `effect.draws_or_discards`, `effect.has_flying`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.exile_creature`
  - **What's wrong:** The attack trigger says "exile up to one target nontoken artifact or **creature**" — explicitly exiles creatures as a disjunction target.
  - **Evidence vs reality:** evidence was `"exile up to one target nontoken artifact or creature"` — unambiguous creature exile present as part of a disjunction.
  - **Suggested fix:** Ensure `effect.exile_creature` captures "exile … artifact or creature" disjunction patterns (not only "exile target creature" direct-object form).

- **missing**: `effect.exile_artifact`
  - **What's wrong:** The same attack trigger also exiles nontoken **artifacts** ("exile up to one target nontoken artifact or creature"). `effect.exile_artifact` should fire.
  - **Evidence vs reality:** evidence was `"exile up to one target nontoken artifact"` — artifact exile is present.
  - **Suggested fix:** Same fix — ensure exile rules handle the "artifact or creature" disjunction.

- **missing**: `trigger.another_artifact_etb`
  - **What's wrong:** "Whenever an Equipment you control enters" is an artifact ETB trigger — Equipment is an artifact subtype. Moon Girl and Devil Dinosaur get `trigger.another_artifact_etb` for "whenever an artifact you control enters"; Thor's trigger is scoped to Equipment but should match the same axis.
  - **Evidence vs reality:** evidence was `"whenever an equipment you control enters"` — an artifact ETB trigger narrowed to Equipment subtype.
  - **Suggested fix:** Ensure `trigger.another_artifact_etb` fires on "whenever an equipment … enters" (subtype match) in addition to "whenever another artifact … enters."

---

## The Sentry, Golden Guardian  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Hero
**Mana cost:** {3}{W}

**Oracle text:**
```
Flying, vigilance, indestructible
When The Sentry enters, target opponent creates The Void, a legendary 5/5 black Horror Villain creature token with flying, indestructible, and "The Void attacks each combat if able."
```

**Current tags:** `condition.cares_tribe.villain`, `effect.grants_evasion`, `effect.grants_indestructible`, `effect.has_flying`, `effect.has_indestructible`, `effect.has_vigilance`, `trigger.self_etb`

### Issues

- **missing**: `effect.create_creature_token`
  - **What's wrong:** The ETB ability directs a target opponent to create The Void, "a legendary 5/5 black Horror Villain creature token." A creature token is created, but `effect.create_creature_token` is absent — presumably because the rule only matches "you create" or "create a" patterns, not "target opponent creates."
  - **Evidence vs reality:** evidence was `"target opponent creates the void, a legendary 5/5 black horror villain creature token"` — creature token creation is present.
  - **Suggested fix:** Broaden `effect.create_creature_token` (and its companion `effect.create_token`) to capture "target opponent creates" patterns alongside "you create" / "create a."

- **missing**: `effect.create_token`
  - **What's wrong:** Companion to the above — `effect.create_token` should fire whenever any token is created, regardless of which player performs the creation.
  - **Evidence vs reality:** Same evidence as above.
  - **Suggested fix:** Same fix as `effect.create_creature_token`.

---

## The Super Hero Civil War  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Enchantment — Saga
**Mana cost:** {3}{R}{W}

**Oracle text:**
```
(As this Saga enters and after your draw step, add a lore counter. Sacrifice after III.)
I — Gain control of up to two target creatures with total mana value 6 or less for as long as this Saga remains on the battlefield.
II — Creatures you control get +1/+1 and gain vigilance until end of turn.
III — Target creature you control fights up to one other target creature.
```

**Current tags:** `effect.fight`, `effect.grants_stat_buff`, `effect.grants_vigilance`

### Issues

- **missing**: `effect.control_change`
  - **What's wrong:** Chapter I says "Gain control of up to two target creatures … for as long as this Saga remains on the battlefield" — a conditional/temporary control-taking effect. `effect.control_change` covers "Gains control of an opponent's permanent."
  - **Evidence vs reality:** evidence was `"gain control of up to two target creatures"` — taking control of opponents' permanents is unambiguous.
  - **Suggested fix:** Ensure `effect.control_change` fires on Saga chapter text and handles "for as long as" temporal-attachment clauses.

---

## The Thing, Ben Grimm  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Creature — Human Hero
**Mana cost:** {5}{G}

**Oracle text:**
```
Trample
Whenever one or more Heroes you control deal damage to a player, put two +1/+1 counters on The Thing.
```

**Current tags:** `effect.counter_modified`, `effect.has_trample`, `effect.plus_one_counter`, `trigger.damage_dealt`

### Issues

- **missing**: `condition.cares_tribe.hero`
  - **What's wrong:** The trigger condition is "Whenever one or more **Heroes** you control deal damage" — the trigger explicitly gates on the Hero creature type. Same pattern as Captain America, Super-Soldier and Invisible Woman, Sue Storm.
  - **Evidence vs reality:** evidence was `"whenever one or more heroes you control deal damage to a player"` — Hero type is the subject of the trigger condition.
  - **Suggested fix:** Ensure `condition.cares_tribe.hero` regex captures "heroes you control" in trigger-condition phrasing (as the trigger subject, not only as anthem targets).

---

## The Vision  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Artifact Creature — Robot Hero
**Mana cost:** {4}

**Oracle text:**
```
Flying, vigilance
Whenever you cast a noncreature spell, choose one that hasn't been chosen this turn —
• Solar Beam — The Vision gains double strike until end of turn.
• Density Control — The Vision gains indestructible until end of turn.
• Technopathy — Draw a card.
```

**Current tags:** `condition.cares_noncreature_spell`, `effect.draws_or_discards`, `effect.grants_double_strike`, `effect.grants_first_strike`, `effect.grants_indestructible`, `effect.has_flying`, `effect.has_vigilance`, `trigger.spell_cast`

### Issues

- **false-positive**: `effect.grants_first_strike`
  - **What's wrong:** "The Vision gains double strike until end of turn" grants double strike — not first strike. The `effect.grants_first_strike` rule fires because "double strike" contains "strike." Same systemic root cause as King T'Challa, Mockingbird, and Quicksilver.
  - **Evidence vs reality:** evidence was `"__self__ gains double strike"` — no "first strike" text exists; the rule matches "strike" inside "double strike."
  - **Suggested fix:** Same root fix — prevent grants_first_strike from matching "double strike" text.

---

## Thunderbolts Conspiracy  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Enchantment
**Mana cost:** {3}{B}

**Oracle text:**
```
Flash
Whenever a Villain you control dies, return it to the battlefield under its owner's control with a finality counter on it. That creature is a Hero in addition to its other types. (If a creature with a finality counter on it would die, exile it instead.)
```

**Current tags:** `condition.cares_tribe.villain`, `effect.counter_modified`, `effect.has_flash`, `effect.reanimate`, `trigger.creature_dies`

### Issues

- **missing**: `condition.cares_tribe.hero`
  - **What's wrong:** "That creature is a **Hero** in addition to its other types" — the Hero creature type is directly referenced in the oracle text (the card grants the Hero type to reanimated Villains). The card both cares about Villain (trigger condition) and produces Hero (type-change effect).
  - **Evidence vs reality:** evidence was `"that creature is a hero in addition to its other types"` — Hero creature type appears in the non-reminder oracle text.
  - **Suggested fix:** Ensure `condition.cares_tribe.hero` regex captures "is a hero in addition to" type-grant patterns, not only "hero you control" possessive-reference patterns.

---

## Ultron, Artificial Malevolence  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Legendary Artifact Creature — Robot Villain
**Mana cost:** {3}

**Oracle text:**
```
Whenever another nontoken artifact you control enters, you may pay {2}. If you do, create a token that's a copy of it. If the token isn't a creature, it becomes a 2/2 Robot Villain creature in addition to its other types.
```

**Current tags:** `condition.cares_artifacts`, `effect.copy_permanent_token`, `effect.create_creature_token`, `effect.create_token`

### Issues

- **missing**: `trigger.another_artifact_etb`
  - **What's wrong:** "Whenever another nontoken artifact you control enters" is exactly the trigger pattern `trigger.another_artifact_etb` covers. The tag fires for Moon Girl and Devil Dinosaur ("whenever an artifact you control enters") but not for Ultron, presumably because the "nontoken" qualifier breaks the match.
  - **Evidence vs reality:** evidence was `"whenever another nontoken artifact you control enters"` — an artifact ETB trigger with a "nontoken" qualifier.
  - **Suggested fix:** Ensure `trigger.another_artifact_etb` captures "whenever another nontoken artifact you control enters" (with "nontoken" qualifier) in addition to the plain form.

- **missing**: `condition.cares_tribe.villain`
  - **What's wrong:** "If the token isn't a creature, it becomes a 2/2 Robot **Villain** creature in addition to its other types" — Villain type is named in the oracle text. Same systemic miss as Castle Doom and others.
  - **Evidence vs reality:** evidence was `"robot villain creature in addition to"` — Villain creature type is referenced.
  - **Suggested fix:** Same fix as Castle Doom — broaden `condition.cares_tribe.villain` to capture Villain in "becomes a ... Villain creature" patterns as well as token type-line descriptions.

---

## Worlds Within Worlds  <!-- audited 2026-06-26, ruleVersion v0.48.0 -->

**Type:** Sorcery
**Mana cost:** {5}{G}{U}

**Oracle text:**
```
Exile all creatures. Each player may put any number of creature cards from their hand onto the battlefield. Then put all cards exiled this way into their owners' hands. Exile Worlds Within Worlds.
```

**Current tags:** `effect.board_wipe`, `effect.cast_noncreature_spell`, `effect.exile_creature`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.cheat_into_play`
  - **What's wrong:** "Each player may put any number of creature cards from their hand onto the battlefield" — putting cards directly from hand to battlefield bypasses the casting process. `effect.cheat_into_play` covers "Puts a card from a zone OTHER than the graveyard directly onto the battlefield — skipping the casting process."
  - **Evidence vs reality:** evidence was `"each player may put any number of creature cards from their hand onto the battlefield"` — hand-to-battlefield without casting.
  - **Suggested fix:** Ensure `effect.cheat_into_play` matches "put [cards] from [their/your] hand onto the battlefield" (all-player form, not only "from your hand").
