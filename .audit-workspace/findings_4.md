# Auditor 4 findings — 25 cards

## Goblin Tomb Raider

**Type:** Creature — Goblin Pirate
**Mana cost:** {R}

**Oracle text:**
```
As long as you control an artifact, this creature gets +1/+0 and has haste.
```

**Current tags:** `effect.grants_haste`, `effect.grants_stat_buff`

### Issues

- **false-positive**: `effect.grants_haste`
  - **What's wrong:** Conditional self-buff ("this creature gets +1/+0 and has haste"), not granting haste to another creature. `grants_haste` is for "target creature gains haste" / "creatures you control have haste" — anthem-style grants to OTHER creatures.
  - **Evidence vs reality:** evidence `"this creature gets +1/+0 and has haste"` is self-reference; "this creature" inside the card's own oracle text equals the card itself.
  - **Suggested fix:** Narrow `grants_haste` regex to exclude "this creature gets ... has X" self-buff frames. Re-tag as `effect.has_haste` (conditional intrinsic).
- **missing**: `condition.cares_artifacts`
  - **What's wrong:** "As long as you control an artifact" gates the bonus on artifact count — classic `cares_artifacts` payoff.
  - **Evidence vs reality:** "you control an artifact" matches the description "References artifact count, artifact ETBs, or artifacts you control."
  - **Suggested fix:** Broaden `condition.cares_artifacts` to cover "as long as you control an artifact" / "if you control an artifact".

---

## Goldfury Strider

**Type:** Artifact Creature — Golem
**Mana cost:** {4}{R}

**Oracle text:**
```
Trample
Tap two untapped artifacts and/or creatures you control: Target creature gets +2/+0 until end of turn. Activate only as a sorcery.
```

**Current tags:** `effect.grants_stat_buff`, `effect.has_trample`

### Issues

- **missing**: `effect.has_activated_ability`
  - **What's wrong:** Card has an activated ability with cost clause and colon ("Tap ... : Target creature gets +2/+0").
  - **Evidence vs reality:** the line matches the "cost: effect" pattern but uses a "Tap N untapped" cost prefix instead of `{T}`/`{N}`.
  - **Suggested fix:** Broaden `has_activated_ability` regex to also catch "Tap N untapped ... :" cost prefixes, not just mana-symbol-led costs.

---

## Grasping Shadows // Shadows' Lair

**Type:** Enchantment // Land — Cave
**Mana cost:** (none)

**Oracle text:**
```
Whenever a creature you control attacks alone, it gains deathtouch and lifelink until end of turn. Put a dread counter on this enchantment. Then if there are three or more dread counters on it, transform it.
{T}: Add {B}.
{B}, {T}, Remove a dread counter from this land: You draw a card and you lose 1 life.
```

**Current tags:** `effect.add_mana`, `effect.counter_modified`, `effect.draws_or_discards`, `effect.grants_deathtouch`, `effect.grants_lifelink`, `effect.has_activated_ability`, `effect.life_changed`, `trigger.attack_or_block`

### Issues

- **coverage-gap**: no fine-grained `effect.loses_life_self` separate from `effect.life_changed`
  - **What's wrong:** "You draw a card and you lose 1 life" — self-life-loss drawback. `effect.life_changed` covers it, but a finer-grained tag would help pair with lifeloss-matters payoffs. Just noting.
  - **Suggested fix:** Out of scope.

---

## Guardian of the Great Door

**Type:** Creature — Angel
**Mana cost:** {W}{W}

**Oracle text:**
```
As an additional cost to cast this spell, tap four untapped artifacts, creatures, and/or lands you control.
Flying
```

**Current tags:** `condition.cares_lands`, `effect.has_evasion_intrinsic`, `effect.tap`

### Issues

- **false-positive**: `effect.tap`
  - **What's wrong:** `effect.tap` is meant for "Tap target permanent" soft-control. Here, "tap four untapped artifacts, creatures, and/or lands" is a convoke/improvise-style additional cost paid before casting — not a resolution effect on a target permanent.
  - **Evidence vs reality:** evidence `"tap four untapped artifacts"` lives in the cost-payment clause; the card's only resolution effect is Flying.
  - **Suggested fix:** Narrow `effect.tap` to exclude "as an additional cost ... tap N untapped permanents" clauses; require the tap to target a permanent.
- **false-positive**: `condition.cares_lands`
  - **What's wrong:** "lands you control" appears only in the additional-cost clause; the card doesn't scale, trigger, or pay off on land count.
  - **Evidence vs reality:** evidence `"lands you control"` is incidental to the cost-list.
  - **Suggested fix:** Narrow `cares_lands` to exclude appearance inside "as an additional cost" clauses, or require an actual count/scaling reference ("for each land", "equal to the number of lands").

---

## Growing Rites of Itlimoc // Itlimoc, Cradle of the Sun

**Type:** Legendary Enchantment // Legendary Land
**Mana cost:** (none)

**Oracle text:**
```
When Growing Rites of Itlimoc enters, look at the top four cards of your library. You may reveal a creature card from among them and put it into your hand. Put the rest on the bottom of your library in any order.
At the beginning of your end step, if you control four or more creatures, transform Growing Rites of Itlimoc.
{T}: Add {G}.
{T}: Add {G} for each creature you control.
```

**Current tags:** `effect.add_mana`, `effect.has_activated_ability`, `effect.look_at_top_n`, `trigger.beginning_of_end_step`

### Issues

- **missing**: `trigger.self_etb`
  - **What's wrong:** "When Growing Rites of Itlimoc enters" — after name normalization this should become "when __SELF__ enters", the canonical self_etb anchor.
  - **Evidence vs reality:** the trigger didn't fire; possible DFC normalization bug where only the combined "//" face name is replaced, not the front-face name alone.
  - **Suggested fix:** Verify `stripScryfallCard` / name-normalization handles DFC face names (so "Growing Rites of Itlimoc enters" → "__SELF__ enters" binds self_etb).

---

## Huatli, Poet of Unity // Roar of the Fifth People

**Type:** Legendary Creature — Human Warrior Bard // Enchantment — Saga
**Mana cost:** (none)

**Oracle text:**
```
When Huatli enters, search your library for a basic land card, reveal it, put it into your hand, then shuffle.
{3}{R/W}{R/W}: Exile Huatli, then return her to the battlefield transformed under her owner's control. Activate only as a sorcery.
I — Create two 3/3 green Dinosaur creature tokens.
II — This Saga gains "Creatures you control have '{T}: Add {R}, {G}, or {W}.'"
III — Search your library for a Dinosaur card, reveal it, put it into your hand, then shuffle.
IV — Dinosaurs you control gain double strike and trample until end of turn.
```

**Current tags:** `condition.cares_tribe.dinosaur`, `effect.add_mana`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_double_strike`, `effect.grants_trample`, `effect.has_activated_ability`, `effect.ramp_nonland`, `effect.tutors_basic_land`, `trigger.self_etb`

### Issues

- **missing**: `effect.tutors_creature`
  - **What's wrong:** Saga chapter III "Search your library for a Dinosaur card" — a Dinosaur card is a creature card. Catalog has `effect.tutors_creature` ("any creature — not subtype-restricted") but no `tutors_subtype.dinosaur`.
  - **Evidence vs reality:** "search your library for a dinosaur card"; tribal-card-type searches qualify as creature searches.
  - **Suggested fix:** Broaden `effect.tutors_creature` to include tribal phrasings ("search your library for a [Tribe] card") for tribes in `THEME_TRIBES`.

---

## Huatli's Final Strike

**Type:** Instant
**Mana cost:** {2}{G}

**Oracle text:**
```
Target creature you control gets +1/+0 until end of turn. It deals damage equal to its power to target creature an opponent controls.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.grants_stat_buff`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.causes_damage`
  - **What's wrong:** Catalog description for `causes_damage`: 'Causes damage to be dealt via another permanent (typically "target creature you control deals damage equal to its power...")'. Exactly this card's effect.
  - **Evidence vs reality:** "it deals damage equal to its power to target creature an opponent controls" — textbook causes_damage anchor, but the antecedent "target creature you control" is in a prior sentence.
  - **Suggested fix:** Ensure `causes_damage` regex catches "it deals damage equal to its power" continuations where the subject was named in a prior sentence.

---

## Hunter's Blowgun

**Type:** Artifact — Equipment
**Mana cost:** {1}

**Oracle text:**
```
Equipped creature gets +1/+1.
Equipped creature has deathtouch during your turn. Otherwise, it has reach.
Equip {2}
```

**Current tags:** `effect.grants_deathtouch`, `effect.grants_stat_buff`

### Issues

- **missing**: `effect.grants_reach`
  - **What's wrong:** "Otherwise, it has reach" grants reach to the equipped creature.
  - **Evidence vs reality:** "it has reach" referring to the equipped creature.
  - **Suggested fix:** Broaden `grants_reach` regex to cover "equipped creature has reach" and conditional-otherwise frames.

---

## Idol of the Deep King // Sovereign's Macuahuitl

**Type:** Artifact // Artifact — Equipment
**Mana cost:** (none)

**Oracle text:**
```
Flash
When this artifact enters, it deals 2 damage to any target.
Craft with artifact {2}{R}
When this Equipment enters, attach it to target creature you control.
Equipped creature gets +2/+0.
Equip {2}
```

**Current tags:** `effect.grants_stat_buff`, `effect.has_flash`, `trigger.self_etb`

### Issues

- **missing**: `effect.deals_damage`
  - **What's wrong:** "When this artifact enters, it deals 2 damage to any target" is the main effect of the front face. `effect.deals_damage` should fire.
  - **Evidence vs reality:** oracle contains "deals 2 damage to any target" — the canonical deals_damage anchor.
  - **Suggested fix:** Verify the `deals_damage` regex isn't being suppressed by an "it" subject pronoun; "it deals N damage to any target" should match.
- **coverage-gap**: no `effect.has_craft` / no `effect.has_equip`
  - **What's wrong:** Craft and Equip are keyword mechanics with no catalog tag. Known gap, flagging the family.
  - **Suggested fix:** Out of scope; consider keyword-axis tags for Equipment/craftable-artifact pairings.

---

## Clean cards (no issues found)

- Glimpse the Core
- Glorifier of Suffering
- Glowcap Lantern
- Greedy Freebooter
- Helping Hand
- Hermitic Nautilus
- Hidden Cataract
- Hidden Courtyard
- Hidden Necropolis
- Hidden Nursery
- Hidden Volcano
- Hit the Mother Lode
- Hotfoot Gnome
- Hoverstone Pilgrim
- Hulking Raptor
- Hurl into History

---

**Summary:**
- Cards audited: 25
- Cards with issues: 9
- Cards clean: 16
