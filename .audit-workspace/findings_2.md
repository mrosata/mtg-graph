# Auditor 2 findings — 25 cards

## Coati Scavenger

**Type:** Creature — Raccoon
**Mana cost:** {2}{G}

**Oracle text:**
```
Descend 4 — When this creature enters, if there are four or more permanent cards in your graveyard, return target permanent card from your graveyard to your hand.
```

**Current tags:** `condition.cares_graveyard`, `effect.bounce_artifact`, `effect.bounce_creature`, `effect.bounce_enchantment`, `effect.bounce_land`, `effect.bounce_or_blink`, `effect.bounce_planeswalker`, `effect.return_from_graveyard_to_hand`, `trigger.self_etb`

### Issues

- **false-positive**: `effect.bounce_artifact`, `effect.bounce_creature`, `effect.bounce_enchantment`, `effect.bounce_land`, `effect.bounce_or_blink`, `effect.bounce_planeswalker`
  - **What's wrong:** Bounce should mean battlefield-to-hand. This card returns a permanent card *from the graveyard* to hand. The correct tag (`return_from_graveyard_to_hand`) already fired; the six bounce tags are systemic over-matches.
  - **Evidence vs reality:** evidence was `"return target permanent card from your graveyard to your hand"` — all six bounce rules ignored the "from your graveyard" qualifier.
  - **Suggested fix:** All `bounce_*` rules should exclude `from (your|a|target) graveyard` phrasing in a negative lookahead.

- **coverage-gap**: no `condition.descend` exists
  - **What's wrong:** "Descend N" is a recurring LCI ability word with discrete semantics; only the generic `condition.cares_graveyard` carries the signal.
  - **Suggested fix:** Add `condition.descend` (mirrors `condition.celebration`). Applies to Coati Scavenger, Council of Echoes, Corpses of the Lost, Didact Echo, Deep Goblin Skulltaker in this batch alone.

---

## Cogwork Wrestler

**Type:** Artifact Creature — Gnome
**Mana cost:** {U}

**Oracle text:**
```
Flash
When this creature enters, target creature an opponent controls gets -2/-0 until end of turn.
```

**Current tags:** `effect.has_flash`, `trigger.self_etb`

### Issues

- **missing**: `effect.debuff_minus_n`
  - **What's wrong:** "target creature gets -2/-0" is a -N/-M debuff. The rule probably requires both stat slots be negative (-N/-M with both negative); it misses power-only debuffs (-N/-0).
  - **Suggested fix:** Broaden `effect.debuff_minus_n` regex to allow 0 in the toughness slot, e.g. `-[1-9X]/-[0-9X]`.

---

## Contested Game Ball

**Type:** Artifact
**Mana cost:** {2}

**Oracle text:**
```
Whenever you're dealt combat damage, the attacking player gains control of this artifact and untaps it.
{2}, {T}: Draw a card and put a point counter on this artifact. Then if it has five or more point counters on it, sacrifice it and create a Treasure token.
```

**Current tags:** `effect.control_change`, `effect.counter_modified`, `effect.create_token`, `effect.create_treasure`, `effect.draws_or_discards`, `effect.has_activated_ability`, `trigger.attack_or_block`

### Issues

- **wrong-axis / false-positive**: `trigger.attack_or_block`
  - **What's wrong:** Trigger fires off "you're dealt combat damage," not on a creature attacking/blocking. The word "attack" in "attacking player" describes the recipient of control, not the trigger condition.
  - **Evidence vs reality:** evidence was `"whenever you're dealt combat damage, the attack"` — matched on the incidental "attack" substring.
  - **Suggested fix:** Tighten `trigger.attack_or_block` to require "whenever {creature} attacks" or "whenever {creature} blocks" anchor. Replace here with `trigger.damage_dealt`.

- **missing**: `trigger.damage_dealt`
  - **What's wrong:** "Whenever you're dealt combat damage" is canonical damage-dealt phrasing.
  - **Suggested fix:** Add "you're/you are dealt {combat }?damage" to `trigger.damage_dealt` anchors.

- **missing**: `effect.sacrifice_artifact`
  - **What's wrong:** "sacrifice it" with "this artifact" antecedent is self-sacrifice. The rule misses pronoun-form self-sacrifice.
  - **Suggested fix:** Allow "sacrifice it" when an antecedent like "this artifact"/"this creature" appears earlier in the sentence.

---

## Corpses of the Lost

**Type:** Enchantment
**Mana cost:** {2}{B}

**Oracle text:**
```
Skeletons you control get +1/+0 and have haste.
When this enchantment enters, create a 2/2 black Skeleton Pirate creature token.
At the beginning of your end step, if you descended this turn, you may pay 1 life. If you do, return this enchantment to its owner's hand. (You descended if a permanent card was put into your graveyard from anywhere.)
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.grants_stat_buff`, `trigger.beginning_of_end_step`, `trigger.self_etb`

### Issues

- **missing**: `effect.grants_haste`
  - **What's wrong:** "Skeletons you control … have haste" is a textbook tribal-anthem grants_haste. Rule likely requires generic "creatures you control" and misses tribe-restricted phrasing.
  - **Suggested fix:** Broaden `grants_haste` to accept "<Tribe> you control … have/has haste."

- **missing**: `condition.cares_tribe.skeleton` and `condition.cares_tribe.pirate`
  - **What's wrong:** Skeleton-tribal anthem and creates a Skeleton Pirate token. If these tribes are in `THEME_TRIBES`, the rule should fire.
  - **Suggested fix:** Verify Skeleton/Pirate in `THEME_TRIBES`; ensure `cares_tribe` fires on "Skeletons you control" anthem form.

- **coverage-gap**: no `condition.descend`
  - **What's wrong:** "if you descended this turn" is the gated-trigger form of descend. Same gap as Coati Scavenger.

---

## Cosmium Confluence

**Type:** Sorcery
**Mana cost:** {4}{G}

**Oracle text:**
```
Choose three. You may choose the same mode more than once.
• Search your library for a Cave card, put it onto the battlefield tapped, then shuffle.
• Put three +1/+1 counters on a Cave you control. It becomes a 0/0 Elemental creature with haste. It's still a land.
• Destroy target enchantment.
```

**Current tags:** `condition.cares_lands`, `condition.cares_subtype.cave`, `effect.cast_noncreature_spell`, `effect.counter_modified`, `effect.destroy_enchantment`, `effect.is_instant_or_sorcery`, `effect.plus_one_counter`, `effect.tutors_subtype.cave`

### Issues

- **missing**: `effect.grants_haste`
  - **What's wrong:** "It becomes a 0/0 Elemental creature with haste" grants haste via land-animation. Rule misses "becomes a … creature with haste" phrasing.
  - **Suggested fix:** Add "becomes a … creature with haste" to `grants_haste` anchors.

- **missing**: `effect.ramp_nonland`
  - **What's wrong:** Mode 1 puts a Cave onto the battlefield — that's ramp semantics. `tutors_subtype.cave` fires but the ramp dimension is lost.
  - **Suggested fix:** Verify `effect.ramp_nonland` covers "put it onto the battlefield" for subtype-tutored lands.

---

## Deepfathom Echo

**Type:** Creature — Merfolk Spirit
**Mana cost:** {2}{G}{U}

**Oracle text:**
```
At the beginning of combat on your turn, this creature explores. Then you may have it become a copy of another creature you control until end of turn. (To have this creature explore, reveal the top card of your library. Put that card into your hand if it's a land. Otherwise, put a +1/+1 counter on this creature, then put the card back or put it into your graveyard.)
```

**Current tags:** `effect.copy_permanent`, `effect.explore`, `trigger.beginning_of_combat`

### Issues

- **false-positive (description mismatch)**: `effect.copy_permanent`
  - **What's wrong:** TagDef description: "Creates a *token* that is a copy of a permanent." But this card doesn't create a token — it transforms itself into a copy of another creature until EOT (in-place clone).
  - **Evidence vs reality:** evidence was `"become a copy of another creature"` — matches the copy text, but the tag description is about token-copies (Spark Double style), not in-place clones.
  - **Suggested fix:** Either broaden the `effect.copy_permanent` description to cover "becomes a copy" clone effects, or split into `effect.create_copy_token` vs `effect.clone_in_place`.

---

## Diamond Pick-Axe

**Type:** Artifact — Equipment
**Mana cost:** {R}

**Oracle text:**
```
Indestructible (Effects that say "destroy" don't destroy this Equipment.)
Equipped creature gets +1/+1 and has "Whenever this creature attacks, create a Treasure token." (It's an artifact with "{T}, Sacrifice this token: Add one mana of any color.")
Equip {2}
```

**Current tags:** `effect.create_token`, `effect.create_treasure`, `effect.grants_stat_buff`, `trigger.attack_or_block`

### Issues

- **coverage-gap**: no `effect.has_indestructible`
  - **What's wrong:** Card has printed Indestructible. Catalog only has `grants_indestructible`; the printed keyword is invisible.
  - **Suggested fix:** Add `effect.has_indestructible` (mirror of `effect.has_lifelink`/`has_deathtouch`). Same gap applies to `has_hexproof`, `has_menace`, `has_flying` (currently subsumed under `has_evasion_intrinsic`), and `has_double_strike` (currently metadata flag only on `has_first_strike`).

---

## Didact Echo

**Type:** Creature — Spirit Cleric
**Mana cost:** {4}{U}

**Oracle text:**
```
When this creature enters, draw a card.
Descend 4 — This creature has flying as long as there are four or more permanent cards in your graveyard.
```

**Current tags:** `condition.cares_graveyard`, `effect.draws_or_discards`, `effect.grants_evasion`, `trigger.self_etb`

### Issues

- **false-positive (description mismatch)**: `effect.grants_evasion`
  - **What's wrong:** TagDef says "Gives flying … to other creatures or to tokens it creates." But this card grants flying *to itself* conditionally — not granting evasion to other creatures.
  - **Evidence vs reality:** evidence was `"has flying"` — matches "this creature has flying as long as…" which is a conditional self-grant.
  - **Suggested fix:** Split `grants_evasion` into `grants_evasion_to_others` vs `gains_evasion_conditional_self`, or require "creatures you control" / "target creature" / "another creature" context.

- **coverage-gap**: no `condition.descend`
  - Same gap as Coati Scavenger.

---

## Digsite Conservator

**Type:** Artifact Creature — Gnome
**Mana cost:** {2}

**Oracle text:**
```
Sacrifice this creature: Exile up to four target cards from a single graveyard. Activate only as a sorcery.
When this creature dies, you may pay {4}. If you do, discover 4. (Exile cards from the top of your library until you exile a nonland card with mana value 4 or less. Cast it without paying its mana cost or put it into your hand. Put the rest on the bottom in a random order.)
```

**Current tags:** `effect.discover`, `effect.has_activated_ability`, `effect.sacrifice_creature`, `trigger.creature_dies`

### Issues

- **missing**: `effect.exile_from_graveyard`
  - **What's wrong:** "Exile up to four target cards from a single graveyard" is canonical graveyard hate.
  - **Suggested fix:** Broaden anchors to include "from a single graveyard" / "from target player's graveyard" phrasing.

---

## Deep Goblin Skulltaker

**Type:** Creature — Goblin Warrior
**Mana cost:** {2}{B}

**Oracle text:**
```
Menace
At the beginning of your end step, if you descended this turn, put a +1/+1 counter on this creature. (You descended if a permanent card was put into your graveyard from anywhere.)
```

**Current tags:** `effect.counter_modified`, `effect.has_evasion_intrinsic`, `effect.plus_one_counter`, `trigger.beginning_of_end_step`

### Issues

- **coverage-gap**: no `condition.descend`
  - **What's wrong:** Same descend gap as Coati Scavenger. Note this card doesn't even get `condition.cares_graveyard` (because reminder text is stripped and "put into your graveyard from anywhere" lives only in the reminder), so the descend signal is entirely lost.

---

## Compass Gnome

**Type:** Artifact Creature — Gnome
**Mana cost:** {2}

**Oracle text:**
```
When this creature enters, you may search your library for a basic land card or Cave card, reveal it, then shuffle and put that card on top.
```

**Current tags:** `condition.cares_subtype.cave`, `effect.tutors_basic_land`, `effect.tutors_subtype.cave`, `trigger.self_etb`

### Issues

- **false-positive (description mismatch)**: `effect.tutors_basic_land`, `effect.tutors_subtype.cave`
  - **What's wrong:** Tutored card goes "on top" of library, not into hand or into play. The `tutors_*` family typically implies card joins hand/play; here the tempo is much weaker.
  - **Evidence vs reality:** evidence matched the "search your library for a basic land card" anchor but ignored disposition "put that card on top."
  - **Suggested fix:** Add `effect.tutors_top_of_library` and exclude these from the standard `tutors_*` family, or extend tagDef descriptions to cover top-of-library disposition explicitly.

---

## Clean cards (no issues found)

- Colossadactyl
- Confounding Riddle
- Cosmium Blast
- Council of Echoes (descend gap noted under Coati; target on battlefield so tags ok)
- Curator of Sun's Creation
- Daring Discovery
- Dauntless Dismantler
- Dead Weight
- Deathcap Marionette
- Deconstruction Hammer
- Deep-Cavern Bat
- Deeproot Pilgrimage
- Defossilize
- Dinotomaton

---

## Cross-card recurring patterns observed in this batch

1. **`condition.descend` does not exist.** Five cards in this batch use descend; should be a first-class condition tag mirroring `condition.celebration`.
2. **Bounce family false-positives on graveyard-to-hand returns.** All six `bounce_*` tags fired on Coati Scavenger's "return ... from graveyard ... to hand." Add a negative lookahead for "from (your|a|target) graveyard."
3. **Anthem-style "<Tribe> you control have/get X" misses the grants_<keyword> tags** (Corpses of the Lost grants haste to Skeletons but no `grants_haste` fires).
4. **No `effect.has_indestructible`/`has_hexproof`/`has_menace`/`has_flying`/`has_double_strike`** — `has_evasion_intrinsic` umbrella collapses flying/menace/intimidate distinctions; indestructible has no `has_*` tag at all.
5. **`effect.copy_permanent` description claims "creates a token"** but rule fires on in-place clone effects too (Deepfathom Echo).
6. **Tutor-to-top-of-library conflated with tutor-to-hand/play** (Compass Gnome).
7. **`trigger.attack_or_block` over-matches on "attacking player" prose** (Contested Game Ball) — needs an anchor that requires "{creature} attacks/blocks," not bare "attack."

---

**Summary:** 25 cards audited, 11 with issues, 14 clean.
