# Deferred card-tag issues

Open issues from prior audit rounds (Round 1–6) that were NOT shipped because they require:

- **Tier 3 family-level rules** — new tag axes covering ≥5 cards, need design discussion before authoring.
- **Tier 4 single-card / borderline** — too narrow to justify a rule today, defer until a 2nd case surfaces.

When a 2nd card surfaces for any Tier 4 item, promote it to Tier 3 and author the family-level rule.

Resolved entries from prior rounds have been removed and live in git history (search commits for `v0.14.6`–`v0.14.9`).

---

# Tier 3 — family-level coverage gaps (new rules to author)

## Case mechanic family (MKM)

Three cards share this gap, plus ~11 more MKM Case cards in Standard. Need a new mechanic family:
- `effect.solve_case` (producer — "To solve: X. When solved, Y")
- `trigger.case_solved` (carer — "whenever you solve a Case")
- `condition.cares_solved_case` (static modifiers gated on Solved)

### Case File Auditor  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Creature — Human Detective
**Mana cost:** {2}{W}

**Oracle text:**

```
When this creature enters and whenever you solve a Case, look at the top six cards of your library. You may reveal an enchantment card from among them and put it into your hand. Put the rest on the bottom of your library in a random order.
You may spend mana as though it were mana of any color to cast Case spells.
```

**Current tags:** `effect.look_at_top_n`, `trigger.self_etb`

- **missing**: `trigger.case_solved` / `effect.solve_case` — Case is a MKM enchantment subtype with a "solve" mechanic — distinct from suspect, disguise, collect-evidence. ~14 Case cards in MKM (Case of the Stashed Skeleton, Case of the Crimson Pulse, etc.). No catalog representation.

### Case of the Burning Masks  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {1}{R}{R}

**Oracle text:**

```
When this Case enters, it deals 3 damage to target creature an opponent controls.
To solve — Three or more sources you controlled dealt damage this turn.
Solved — Sacrifice this Case: Exile the top three cards of your library. Choose one of them. You may play that card this turn.
```

**Current tags:** `effect.deals_damage`, `effect.exile_from_library`, `effect.impulse_draw`, `effect.sacrifice_enchantment`, `trigger.self_etb`

- **missing**: Case mechanic family (cross-ref Case File Auditor).

### Case of the Gateway Express  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {1}{W}

**Oracle text:**

```
When this Case enters, choose target creature you don't control. Each creature you control deals 1 damage to that creature.
To solve — Three or more creatures attacked this turn.
Solved — Creatures you control get +1/+0.
```

**Current tags:** `effect.causes_damage`, `effect.grants_stat_buff`, `trigger.self_etb`

- **missing**: Case mechanic family (cross-ref Case File Auditor).

---

## Cast-from-graveyard license axis

Two cards share this gap. Existing `condition.cast_from_graveyard` is keyword-only (Flashback / Disturb / Escape) and won't fire on temporary cast-from-graveyard *grants*.

### Tarrian's Journal // The Tomb of Aclazotz  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact — Book // Legendary Land — Cave

**Oracle text:**

```
{T}, Sacrifice another artifact or creature: Draw a card. Activate only as a sorcery.
{2}, {T}, Discard your hand: Transform Tarrian's Journal.

{T}: Add {B}.
{T}: You may cast a creature spell from your graveyard this turn. If you do, it enters with a finality counter on it and is a Vampire in addition to its other types. ...
```

**Current tags:** `condition.cares_tribe.vampire`, `effect.add_mana`, `effect.counter_modified`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.sacrifice_artifact`, `effect.sacrifice_creature`

- **missing**: cast-from-graveyard license (no exact tag exists) — Back face's "You may cast a creature spell from your graveyard this turn" is a graveyard-as-casting-source effect. Either broaden `condition.cast_from_graveyard` to also match effect-granted casting, or author a sibling tag.

### Case of the Uneaten Feast  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {W}

**Oracle text:**

```
Whenever a creature you control enters, you gain 1 life.
To solve — You've gained 5 or more life this turn.
Solved — Sacrifice this Case: Creature cards in your graveyard gain "You may cast this card from your graveyard" until end of turn.
```

**Current tags:** `condition.cares_graveyard`, `condition.cares_lifegain`, `effect.life_changed`, `effect.sacrifice_enchantment`, `trigger.another_creature_etb`

- **missing**: cast-from-graveyard license — "Creature cards in your graveyard gain 'You may cast this card from your graveyard'" is a temporary grant. Same axis as Tarrian's Journal. Also blocked on the Case mechanic family above.

---

## Extra-combat-phase family

Appears on ~10 Standard cards (Anzrag the Quake-Mole, Great Train Heist, Fear of Missing Out, Aurelia the Warleader, Full Throttle, All-Out Assault, Balthier and Fran, Genji Glove, …). Distinct mechanic from beginning-of-combat triggers — these grant an additional attack step. Pair with `trigger.beginning_of_combat` and combat-payoff conditions.

## Lure / must-be-blocked family

Appears on ~8 Standard cards (Disturbed Slumber, Anzrag the Quake-Mole, Fear of Being Hunted, Joraga Invocation, Magitek Scythe, The Masamune, Vinebred Brawler, Raphael Ninja Destroyer). Small family but distinct from combat triggers and from `effect.pacify`. Low-priority — likely defer to a wider combat-axis batch.

### Anzrag, the Quake-Mole  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Legendary Creature — Mole God
**Mana cost:** {2}{R}{G}

**Oracle text:**

```
Whenever Anzrag becomes blocked, untap each creature you control. After this phase, there is an additional combat phase.
{3}{R}{R}{G}{G}: Anzrag must be blocked each combat this turn if able.
```

**Current tags:** `effect.has_activated_ability`, `effect.untap`, `trigger.attack_or_block`

- **missing**: `effect.extra_combat` (family above).
- **missing**: `effect.lure` / `effect.must_be_blocked` (family above).
- **borderline**: `trigger.attack_or_block` on "becomes blocked" — Anzrag is the attacker BEING BLOCKED, not blocking. Semantic stretch; revisit when the combat-axis batch lands. Preferred: author `trigger.becomes_blocked` for the attacker-side combat trigger and narrow `attack_or_block`.

---

## doubles_triggers family (Panharmonicon)

### Delney, Streetwise Lookout  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Legendary Creature — Human Scout
**Mana cost:** {2}{W}

**Oracle text:**

```
Creatures you control with power 2 or less can't be blocked by creatures with power 3 or greater.
If a triggered ability of a creature you control with power 2 or less triggers, that ability triggers an additional time.
```

**Current tags:** `condition.cares_low_power`

- **missing**: `effect.doubles_triggers` — Panharmonicon family ("that ability triggers an additional time"). Other cards in this family in Standard: Panharmonicon, Spirit-Sister's Call, ETB-doublers, Strixhaven Stadium triggers. Design decision needed: pair with every `trigger.*` (broad) or only ETB-family triggers (narrow)? Suggest narrow (ETB + LTB) for v1.

---

# Tier 4 — single-card / borderline (defer until 2nd case surfaces)

## Vito's Inquisitor  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Creature — Vampire Knight
**Mana cost:** {3}{B}

**Oracle text:**

```
{B}, Sacrifice another creature or artifact: Put a +1/+1 counter on this creature. It gains menace until end of turn.
```

**Current tags:** `effect.counter_modified`, `effect.grants_evasion`, `effect.has_activated_ability`, `effect.plus_one_counter`, `effect.sacrifice_artifact`, `effect.sacrifice_creature`

- **false-positive**: `effect.grants_evasion` — "It gains menace until end of turn" — anaphoric "it" refers to __SELF__. Pattern[1]'s lookbehind blocks `this <type>` and `__self__` but not bare "it". Sentence-scoped anaphor resolution is out of regex scope; accept the 1-card FP and revisit if a 2nd card surfaces.

---

## The Everflowing Well // The Myriad Pools  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact // Legendary Artifact Land

**Oracle text (back face):**

```
{T}: Add {U}.
Whenever you cast a permanent spell using mana produced by The Myriad Pools, up to one other target permanent you control becomes a copy of that spell until end of turn.
```

**Current tags:** `condition.cares_graveyard`, `condition.descend`, `effect.add_mana`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.mill`, `trigger.self_etb`, `trigger.spell_cast`, `trigger.upkeep`

- **missing**: `effect.clone_in_place` — "up to one other target permanent you control becomes a copy of that spell until end of turn." Intentional exclusion: spell-copy belongs to the `effect.copy_spell` family rather than the permanent-copy `clone_in_place` axis.

---

## Agency Outfitter  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Creature — Sphinx Detective
**Mana cost:** {4}{U}{U}

**Oracle text:**

```
Flying
When this creature enters, you may search your graveyard, hand and/or library for a card named Magnifying Glass and/or a card named Thinking Cap and put them onto the battlefield. If you search your library this way, shuffle.
```

**Current tags:** `effect.has_flying`, `effect.reanimate`, `trigger.self_etb`

- **missing (narrow / borderline)**: `effect.tutor_any` — searches the library for a named card and puts it onto the battlefield. Name-specific tutors are rare; broaden `effect.tutor_any` only if a 2nd case surfaces.

---

## Archdruid's Charm  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Instant
**Mana cost:** {G}{G}{G}

**Oracle text:**

```
Choose one —
• Search your library for a creature or land card and reveal it. Put it onto the battlefield tapped if it's a land card. Otherwise, put it into your hand. Then shuffle.
• Put a +1/+1 counter on target creature you control. It deals damage equal to its power to target creature you don't control.
• Exile target artifact or enchantment.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.causes_damage`, `effect.counter_modified`, `effect.exile_artifact`, `effect.exile_enchantment`, `effect.is_instant_or_sorcery`, `effect.plus_one_counter`, `effect.tutors_creature`

- **missing (borderline / coverage gap)**: ramp + tutor framing — Mode 1 is non-basic ramp (any land, into play tapped). `effect.ramp_nonland` restricts to **basic** land. Either broaden `effect.ramp_nonland` to drop the "basic" restriction, or author a sibling `effect.ramp_any_land`. Wider broadening probably has more graph value — pairs naturally with `trigger.landfall` and `condition.cares_lands`.

---

## Hustle // Bustle  <!-- audited 2026-05-28, ruleVersion v0.14.8 -->

**Type:** Instant // Sorcery
**Mana cost:** {U/R} // {4}{R/G}{R/G}

**Oracle text:**

```
Target creature attacks or blocks this turn if able.

Creatures you control get +2/+2 and gain trample until end of turn. You may turn a creature you control face up.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.grants_stat_buff`, `effect.grants_trample`, `effect.is_instant_or_sorcery`

- **missing (Tier 4)**: `effect.turn_face_up` — producer half of the Disguise/Cloak face-up axis. Catalog has `trigger.turned_face_up` (consumer side) but no producer-side tag. Defer until 2nd face-down payoff surfaces alongside Goblin Maskmaker (also Tier 4 for `condition.cares_face_down`).

---

## Lamplight Phoenix  <!-- audited 2026-05-28, ruleVersion v0.8.0 -->

**Type:** Creature — Phoenix
**Mana cost:** {1}{R}{R}

**Oracle text:**

```
Flying
When this creature dies, you may exile it and collect evidence 4. If you do, return this card to the battlefield tapped.
```

**Current tags:** `effect.collect_evidence`, `effect.exile_from_graveyard`, `effect.has_flying`, `trigger.creature_dies`

- **missing (Tier 4 — Phoenix self-recursion family)**: `effect.cheat_into_play` — self-recurring creature returns to battlefield from exile after dying. Distinct from `effect.reanimate` (graveyard-to-battlefield). Defer until a 2nd Phoenix-style exile-to-battlefield card surfaces; Lightning Phoenix / Aurelia and related cards likely qualify when their Standard sets ship.

---

## Marketwatch Phantom  <!-- audited 2026-05-28, ruleVersion v0.8.0 -->

**Type:** Creature — Spirit Detective
**Mana cost:** {1}{W}

**Oracle text:**

```
Whenever another creature you control with power 2 or less enters, this creature gains flying until end of turn.
```

**Current tags:** `condition.cares_low_power`, `trigger.another_creature_etb`

- **missing (Tier 4 — gains_keyword_self_triggered)**: triggered self-keyword-grant has no precise tag. `effect.grants_evasion` is scoped to OTHER creatures (and v0.14.26 strips the triggered self-buff form to prevent the FP), while `effect.gains_keyword_self_conditional` is scoped to `as long as/while/if/during` gates — `whenever X, this creature gains <kw>` falls between them. Author `effect.gains_keyword_self_triggered` (or extend `gains_keyword_self_conditional` to include trigger gates) when a 2nd card surfaces. Rot Farm Mortipede shares the templating but with a stat-buff anchor so it carries `effect.grants_stat_buff` — Marketwatch Phantom currently carries no grant-axis tag at all.

---

## Niv-Mizzet, Guildpact  <!-- audited 2026-05-28, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Dragon Avatar
**Mana cost:** {W}{U}{B}{R}{G}

**Oracle text:**

```
Flying, hexproof from multicolored
Whenever Niv-Mizzet deals combat damage to a player, it deals X damage to any target, target player draws X cards, and you gain X life, where X is the number of different color pairs among permanents you control that are exactly two colors.
```

**Current tags:** `effect.deals_damage`, `effect.draws_or_discards`, `effect.has_flying`, `effect.life_changed`, `trigger.damage_dealt`

- **missing (Tier 4 — multicolor-as-resource)**: no `condition.cares_multicolor` / `condition.cares_color_pairs` axis exists. Card scales on "number of different color pairs among permanents you control that are exactly two colors". Defer until a 2nd Standard multicolor-payoff card surfaces.

---

## Persuasive Interrogators  <!-- audited 2026-05-28, ruleVersion v0.8.0 -->

**Type:** Creature — Gorgon Detective
**Mana cost:** {4}{B}{B}

**Oracle text:**

```
When this creature enters, investigate.
Whenever you sacrifice a Clue, target opponent gets two poison counters.
```

**Current tags:** `effect.counter_modified`, `effect.create_clue`, `effect.create_token`, `trigger.permanent_sacrificed`, `trigger.self_etb`

- **missing (Tier 4 — poison/infect/toxic axis)**: no poison-counter family in catalog. Toxic, Infect, Proliferate-with-poison are all uncovered. The v0.14.18 `effect.counter_modified` broadening to the player-counter "gets" frame picks up the placement axis generically; a dedicated `effect.places_poison_counters` + `condition.cares_poison` family is the right home if more poison cards surface in Standard.

---

## Pompous Gadabout  <!-- audited 2026-05-28, ruleVersion v0.14.32 -->

**Type:** Creature — Human Citizen
**Mana cost:** {2}{G}

**Oracle text:**

```
During your turn, this creature has hexproof.
This creature can't be blocked by creatures that don't have a name.
```

**Current tags:** `effect.unblockable`

- **coverage gap (Tier 4 — non-evasion self-conditional grants)**: `effect.gains_keyword_self_conditional` is scoped to evasion keywords (flying/menace/intimidate). Self-conditional hexproof ("during your turn, this creature has hexproof") falls through entirely — no tag captures it. Either rename and broaden the rule to all keywords, or spin sibling rules per keyword. Most non-evasion keywords have no consumer tags so the missing-tag is cosmetic; defer until a payoff axis demands it.
