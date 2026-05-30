# Auditor 1 findings — 25 cards

## Braided Net // Braided Quipu

**Type:** Artifact // Artifact
**Mana cost:** (none)

**Oracle text:**

```
This artifact enters with three net counters on it.
{T}, Remove a net counter from this artifact: Tap another target nonland permanent. Its activated abilities can't be activated for as long as it remains tapped.
Craft with artifact {1}{U}

{3}{U}, {T}: Draw a card for each artifact you control, then put this artifact into its owner's library third from the top.
```

**Current tags:** `condition.cares_artifacts`, `effect.counter_modified`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.tap`

### Issues

- **missing**: `effect.tuck_to_library`
  - **What's wrong:** Card literally tucks itself to its owner's library third from the top — canonical tuck phrasing — but tag not applied.
  - **Evidence vs reality:** `pipeline/rules/effect.tuck_to_library.ts` only matches three frames keyed on "target X". Self-tuck phrasing "put this artifact into its owner's library Nth from the top" is unhandled.
  - **Suggested fix:** Add a fourth frame for self-tuck: `put __self__ ... on(to)? ... library` (optionally with `Nth from the top` tail).

- **coverage-gap**: Craft mechanic (LCI)
  - **What's wrong:** "Craft with artifact {cost}" has no `effect.has_craft` (or similar) tag. Multiple cards in this batch (also Clay-Fired Bricks) use craft.
  - **Suggested fix:** Add `effect.has_craft` since craft creates a unique pairing axis with graveyard/exile/artifact themes.

---

## Brass's Tunnel-Grinder // Tecutlan, the Searing Rift

**Type:** Legendary Artifact // Legendary Land — Cave
**Mana cost:** (none)

**Oracle text:**

```
When Brass's Tunnel-Grinder enters, discard any number of cards, then draw that many cards plus one.
At the beginning of your end step, if you descended this turn, put a bore counter on Brass's Tunnel-Grinder. Then if there are three or more bore counters on it, remove those counters and transform it. (You descended if a permanent card was put into your graveyard from anywhere.)

(Transforms from Brass's Tunnel-Grinder.)
{T}: Add {R}.
Whenever you cast a permanent spell using mana produced by Tecutlan, discover X, where X is that spell's mana value.
```

**Current tags:** `effect.add_mana`, `effect.counter_modified`, `effect.discover`, `effect.draws_or_discards`, `effect.has_activated_ability`, `trigger.beginning_of_end_step`, `trigger.self_etb`, `trigger.spell_cast`

### Issues

- **coverage-gap**: descend mechanic (systemic — see end note)
- **coverage-gap**: transform / DFC transform effect — no `effect.transform` tag exists, so downstream consumers can't tell this card flips.

---

## Breeches, Eager Pillager

**Type:** Legendary Creature — Goblin Pirate
**Mana cost:** {2}{R}

**Oracle text:**

```
First strike
Whenever a Pirate you control attacks, choose one that hasn't been chosen this turn —
• Create a Treasure token.
• Target creature can't block this turn.
• Exile the top card of your library. You may play it this turn.
```

**Current tags:** `effect.create_token`, `effect.create_treasure`, `effect.exile_from_library`, `effect.has_first_strike`, `effect.pacify`, `trigger.attack_or_block`

### Issues

- **false-positive**: `effect.pacify`
  - **What's wrong:** Pacify is for permanent Pacifism / Arrest "can't attack or block" Aura-style lockdown, but this is a one-turn "can't block this turn" combat rider.
  - **Evidence vs reality:** Evidence `"target creature can't block"` is substring-true but the rule fires on any "can't block" without checking for the persistent / Aura semantics — here it's qualified by "this turn".
  - **Suggested fix:** Tighten `effect.pacify` to require absence of "this turn" / "until end of turn" qualifier, or split a separate one-turn evasion-strip tag.

- **coverage-gap**: Pirate tribe (systemic — see end note)

- **coverage-gap**: impulse-draw "may play it this turn"
  - **What's wrong:** "Exile the top card of your library. You may play it this turn." is the canonical impulse-draw / Light Up the Stage pattern. Only `effect.exile_from_library` fires — no payoff/advantage tag for impulse draw exists.

---

## Bringer of the Last Gift

**Type:** Creature — Vampire Demon
**Mana cost:** {6}{B}{B}

**Oracle text:**

```
Flying
When this creature enters, if you cast it, each player sacrifices all other creatures they control. Then each player returns all creature cards from their graveyard that weren't put there this way to the battlefield.
```

**Current tags:** `effect.edict`, `effect.has_evasion_intrinsic`, `effect.reanimate`, `effect.sacrifice_creature`, `trigger.self_etb`

### Issues

- **missing**: `effect.board_wipe` (coverage gap)
  - **What's wrong:** "each player sacrifices all other creatures they control" is a sacrifice-shaped board wipe but `effect.board_wipe` only matches "destroy|exile all/each" phrasings.
  - **Evidence vs reality:** PATTERN in `pipeline/rules/effect.board_wipe.ts` is `(?:destroy|exile)\s+(?:all|each)\s+...` — sacrifice-based mass removal is unrepresented.
  - **Suggested fix:** Broaden board_wipe to include "sacrifices? all" / "each player sacrifices? all" forms, or add a sister tag `effect.mass_sacrifice`.

---

## Canonized in Blood

**Type:** Enchantment
**Mana cost:** {1}{B}

**Oracle text:**

```
At the beginning of your end step, if you descended this turn, put a +1/+1 counter on target creature you control. (You descended if a permanent card was put into your graveyard from anywhere.)
{5}{B}{B}, Sacrifice this enchantment: Create a 4/3 white and black Vampire Demon creature token with flying.
```

**Current tags:** `condition.cares_tribe.vampire`, `effect.counter_modified`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_evasion`, `effect.has_activated_ability`, `effect.plus_one_counter`, `effect.sacrifice_enchantment`, `trigger.beginning_of_end_step`

### Issues

- **false-positive**: `condition.cares_tribe.vampire`
  - **What's wrong:** Card does not care about Vampires as a payoff group — it merely creates a token whose creature type happens to include Vampire.
  - **Evidence vs reality:** Evidence is just `"vampire"`. The `stripFraming` regex in `pipeline/rules/condition.cares_tribe.ts` (`\bcreates?\s+(?:[\w\/]+\s+){1,7}?tokens?\b`) tries to strip token-creation framing, but the description here ("create a 4/3 white and black vampire demon creature token") has 8 intervening words ("a 4/3 white and black vampire demon creature"), exceeding the lazy `{1,7}` cap, so framing strip fails and "vampire" leaks through.
  - **Suggested fix:** Loosen the strip-framing window from `{1,7}` to `{1,10}` or `{1,12}` — modern color-laden token descriptions routinely exceed 7 words.

- **coverage-gap**: descend (systemic — see end note)

---

## Caparocti Sunborn

**Type:** Legendary Creature — Human Soldier
**Mana cost:** {2}{R}{W}

**Oracle text:**

```
Whenever Caparocti Sunborn attacks, you may tap two untapped artifacts and/or creatures you control. If you do, discover 3. (Exile cards from the top of your library until you exile a nonland card with mana value 3 or less. Cast it without paying its mana cost or put it into your hand. Put the rest on the bottom in a random order.)
```

**Current tags:** `effect.discover`, `effect.tap`, `trigger.attack_or_block`

### Issues

- **false-positive**: `effect.tap`
  - **What's wrong:** The tap is a convoke-style "tap your own untapped permanents" rider inside a trigger, not a soft-control/removal tap of an opponent's target permanent.
  - **Evidence vs reality:** Evidence `"tap two untapped artifacts"`. The tagDef explicitly says "Taps a target permanent (soft control / removal effect)." The rule's cost-vs-effect gate only fires when a colon follows the match (activation-cost shape); here the convoke-style rider is in the body of a triggered ability so the gate doesn't trip.
  - **Suggested fix:** Add a "you may tap ... you control" guard, or require the tapped noun to be preceded by `target` (the rule currently allows the bare noun without `target`).

---

## Clay-Fired Bricks // Cosmium Kiln

**Type:** Artifact // Artifact
**Mana cost:** (none)

**Oracle text:**

```
When this artifact enters, search your library for a basic Plains card, reveal it, put it into your hand, then shuffle. You gain 2 life.
Craft with artifact {5}{W}{W} ({5}{W}{W}, Exile this artifact, Exile another artifact you control or an artifact card from your graveyard: Return this card transformed under its owner's control. Craft only as a sorcery.)

When this artifact enters, create two 1/1 colorless Gnome artifact creature tokens.
Creatures you control get +1/+1.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.grants_stat_buff`, `effect.life_changed`, `trigger.self_etb`

### Issues

- **missing**: `effect.tutors_basic_land`
  - **What's wrong:** "search your library for a basic Plains card" is the canonical basic-land tutor, but the rule pattern requires the literal word "land".
  - **Evidence vs reality:** `pipeline/rules/effect.tutors_basic_land.ts` PATTERN `search ... for ... basic lands? cards?` does not match "basic Plains card" / "basic Island card" / etc. The basic-type variant is a common modern phrasing.
  - **Suggested fix:** Extend PATTERN to accept `basic (?:land|plains|island|swamp|mountain|forest)s? cards?`.

- **coverage-gap**: Craft mechanic
  - **Suggested fix:** Same as Braided Net — add `effect.has_craft`.

---

## Systemic coverage gap: Descend mechanic

Cards in this batch using descend with no matching catalog tag:
- Brass's Tunnel-Grinder ("if you descended this turn")
- Broodrage Mycoid ("if you descended this turn")
- Canonized in Blood ("if you descended this turn")
- Child of the Volcano ("if you descended this turn")
- Chupacabra Echo ("Fathomless descent —" ability word)

Also Calamitous Cave-In and Cavernous Maw scale on "Cave cards in graveyard" — a descend-adjacent payoff (cares_graveyard fires, but a more specific "permanent cards in graveyard" axis is missing).

**Suggested fix:** Add `condition.descended` (matches "if you descended this turn" + ability word "fathomless descent —") and consider `condition.cares_permanents_in_graveyard` for the related payoff.

---

## Systemic coverage gap: Pirate tribe

Pirate references in this batch with no `condition.cares_tribe.pirate`:
- Breeches, Eager Pillager ("Whenever a Pirate you control attacks")
- Captain Storm, Cosmium Raider ("put a +1/+1 counter on target Pirate you control")

Pirate is a recurring tribal axis (LCI / Standard) missing from `pipeline/themes.ts` THEME_TRIBES.

**Suggested fix:** Add `pirate` to THEME_TRIBES.

---

## Clean cards (no issues found)

- Brackish Blunder
- Brazen Blademaster
- Broodrage Mycoid (descend gap is systemic)
- Buried Treasure
- Burning Sun Cavalry
- Calamitous Cave-In
- Captain Storm, Cosmium Raider (Pirate gap is systemic)
- Captivating Cave
- Careening Mine Cart
- Cartographer's Companion
- Cavern of Souls
- Cavernous Maw
- Cavern Stomper
- Cenote Scout
- Chart a Course
- Child of the Volcano (descend gap is systemic)
- Chimil, the Inner Sun
- Chupacabra Echo (descend gap is systemic)

---

## Summary

- Cards audited: 25
- Cards with issues: 7
- Cards clean: 18
