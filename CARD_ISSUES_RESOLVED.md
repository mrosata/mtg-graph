# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

---

## Agatha of the Vile Cauldron  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Human Warlock
**Mana cost:** {R}{G}

**Oracle text:**

```
Activated abilities of creatures you control cost {X} less to activate, where X is Agatha's power. This effect can't reduce the mana in that cost to less than one mana.
{4}{R}{G}: Other creatures you control get +1/+1 and gain trample and haste until end of turn.
```

**Current tags:** `condition.cares_activated_abilities`, `effect.cost_reduction`, `effect.grants_stat_buff`, `effect.has_activated_ability`, `effect.has_trample`

### Issues

- **false-positive**: `effect.has_trample`
  - **What's wrong:** Agatha does not have trample herself; she grants trample to other creatures via her activated ability.
  - **Evidence vs reality:** evidence was `"trample"`, drawn from `"get +1/+1 and gain trample and haste until end of turn"` — that's a temporary grant to OTHER creatures, not a printed/intrinsic keyword on Agatha.
  - **Suggested fix:** narrow `has_trample` to require a self-scoped form (printed keyword on its own line, or "this creature has trample") and exclude `"gain trample"` / `"gains trample"` grant phrasing.
- **missing**: `effect.grants_evasion` (sort of) / no `grants_trample` or `grants_haste` tag exists
  - **What's wrong:** Card grants trample + haste to other creatures, but the catalog has no `effect.grants_trample` / `effect.grants_haste`. `effect.grants_evasion` is flying/menace/intimidate only, so it doesn't cover this either.
  - **Evidence vs reality:** `"gain trample and haste until end of turn"` — real anthem-style keyword-grant effect that the graph currently can't represent beyond the +1/+1 piece.
  - **Suggested fix:** consider authoring `effect.grants_keyword_combat` (or split per keyword) so synergies like "haste enablers" / "trample enablers" are discoverable. Coverage gap, not a same-card narrowing.

---

## Agatha's Soul Cauldron  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact
**Mana cost:** {2}

**Oracle text:**

```
You may spend mana as though it were mana of any color to activate abilities of creatures you control.
Creatures you control with +1/+1 counters on them have all activated abilities of all creature cards exiled with Agatha's Soul Cauldron.
{T}: Exile target card from a graveyard. When a creature card is exiled this way, put a +1/+1 counter on target creature you control.
```

**Current tags:** `condition.cares_activated_abilities`, `condition.cares_plus_one_counter`, `effect.counter_modified`, `effect.exile_from_graveyard`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.has_activated_ability`
  - **What's wrong:** Card has `{T}: Exile target card from a graveyard.` — a textbook activated ability ("cost: effect" line) — but the tag did not fire.
  - **Evidence vs reality:** the third paragraph leads with `{T}:`, which is the canonical activated-ability anchor. Suggests the rule's regex requires a mana-cost activation or scopes to creatures rather than any permanent.
  - **Suggested fix:** broaden `has_activated_ability` to cover `{T}:` (tap-only) costs on non-creature permanents, not just `{mana}: effect` lines on creatures.
- **missing**: `trigger.creature_leaves_graveyard`
  - **What's wrong:** "When a creature card is exiled this way" is a triggered ability that fires when a creature card leaves a graveyard (via Cauldron's own exile activation).
  - **Evidence vs reality:** The "this way" back-reference ties to "Exile target card from a graveyard" in the same paragraph — by RAW this is a graveyard-exile trigger. The tag description ("Triggers when cards leave or are exiled from a graveyard") covers this directly.
  - **Suggested fix:** add a regex case for "when a creature card is exiled this way" anchored to a prior `exile .* from a graveyard` clause in the same paragraph.

---

## Aquatic Alchemist // Bubble Up  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Creature — Elemental // Sorcery — Adventure
**Mana cost:** {1}{U} // {2}{U}

**Oracle text:**

```
Whenever you cast your first instant or sorcery spell each turn, this creature gets +2/+0 until end of turn.

Put target instant or sorcery card from your graveyard on top of your library. (Then exile this card. You may cast the creature later from exile.)
```

**Current tags:** `condition.cares_instant_sorcery_in_graveyard`, `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.grants_stat_buff`

### Issues

- **missing**: `trigger.spell_cast`
  - **What's wrong:** Front face triggers on "Whenever you cast your first instant or sorcery spell each turn" — a textbook spell-cast trigger — but the tag did not fire.
  - **Evidence vs reality:** "whenever you cast ... spell" is the canonical anchor for `trigger.spell_cast`. May be over-narrowed to exclude "first ... each turn" qualifiers, or scoped only to "whenever you cast a spell" with no adjective.
  - **Suggested fix:** ensure `spell_cast` regex tolerates ordinal/per-turn qualifiers ("your first", "the second", "each turn") between `whenever you cast` and `spell`.
- **missing**: `condition.cares_noncreature_spell`
  - **What's wrong:** Trigger gates on casting an instant or sorcery — the prowess-style noncreature-spell payoff — but the tag is absent.
  - **Evidence vs reality:** "cast your first instant or sorcery spell each turn" is the exact phrase this condition is meant to capture (modulo the "first ... each turn" qualifier).
  - **Suggested fix:** broaden `cares_noncreature_spell` to match the same per-turn-qualified spell-cast pattern as the fix for `trigger.spell_cast`.

---

## Archon's Glory  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {W}

**Oracle text:**

```
Bargain (You may sacrifice an artifact, enchantment, or token as you cast this spell.)
Target creature gets +2/+2 until end of turn. If this spell was bargained, that creature also gains flying and lifelink until end of turn.
```

**Current tags:** `condition.bargain`, `effect.cast_noncreature_spell`, `effect.grants_evasion`, `effect.grants_stat_buff`, `effect.has_lifelink`, `effect.is_instant_or_sorcery`

### Issues

- **false-positive**: `effect.has_lifelink`
  - **What's wrong:** Archon's Glory is an Instant — it cannot itself "have" lifelink. It temporarily grants lifelink to a target creature.
  - **Evidence vs reality:** evidence was `"lifelink"`, drawn from `"that creature also gains flying and lifelink until end of turn"` — a grant clause, not a self-keyword. (`grants_evasion` already fires on the flying half via the right axis; this is the symmetric miss for lifelink.)
  - **Suggested fix:** narrow `has_lifelink` to require either a standalone keyword line, "this creature has lifelink", or to refuse matching when the matched span sits inside a "gains/gain ... until end of turn" or "target creature gains" grant frame. Mirror whatever fix is applied to `has_trample` (Agatha entry above) — same pattern, different keyword.

---

## Armory Mice  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Creature — Mouse
**Mana cost:** {1}{W}

**Oracle text:**

```
Celebration — This creature gets +0/+2 as long as two or more nonland permanents entered the battlefield under your control this turn.
```

**Current tags:** `effect.grants_stat_buff`

### Issues

- **missing**: no `condition.celebration` / `condition.cares_etb_count_this_turn` tag exists
  - **What's wrong:** Celebration is a Bloomburrow ability word that gates effects on "two or more nonland permanents entered the battlefield under your control this turn." The catalog has no tag for it, so this whole interaction axis is invisible to the graph.
  - **Evidence vs reality:** "celebration —" prefix + the literal "permanents entered the battlefield ... this turn" condition. Pairs naturally with token-creation, land-drop, and ETB-heavy decks.
  - **Suggested fix:** coverage gap — author `condition.celebration` (anchored on the ability-word "Celebration —") and optionally a broader `condition.cares_etb_count_this_turn` for non-keyword variants. Pairs with `effect.create_token`, `effect.create_creature_token`, `trigger.another_creature_etb`.

---

## Ashiok's Reaper  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Creature — Nightmare
**Mana cost:** {3}{B}

**Oracle text:**

```
Whenever an enchantment you control is put into a graveyard from the battlefield, draw a card.
```

**Current tags:** `condition.cares_enchantments`, `effect.draws_or_discards`

### Issues

- **missing**: `trigger.enchantment_leaves_battlefield`
  - **What's wrong:** Card's whole ability is a textbook enchantment-leaves-battlefield trigger ("Whenever an enchantment you control is put into a graveyard from the battlefield"), but the tag did not fire.
  - **Evidence vs reality:** "put into a graveyard from the battlefield" is the canonical RAW phrasing for a destroy/sac trigger. The tag description explicitly says "covers destroy, exile, bounce, sacrifice." Rule likely only matches "leaves the battlefield" / "dies" wording and misses the "put into a graveyard from the battlefield" phrasing.
  - **Suggested fix:** broaden `enchantment_leaves_battlefield` regex to also match `enchantment .* (?:is|are) put into (?:a|its owner's) graveyard from the battlefield`. Mirror fix likely needed for `artifact_leaves_battlefield`, `creature_leaves_battlefield`, `land_leaves_battlefield`, `planeswalker_leaves_battlefield`.

---

## Ashiok, Wicked Manipulator  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Legendary Planeswalker — Ashiok
**Mana cost:** {3}{B}{B}

**Oracle text:**

```
If you would pay life while your library has at least that many cards in it, exile that many cards from the top of your library instead.
+1: Look at the top two cards of your library. Exile one of them and put the other into your hand.
−2: Create two 1/1 black Nightmare creature tokens with "At the beginning of combat on your turn, if a card was put into exile this turn, put a +1/+1 counter on this token."
−7: Target player exiles the top X cards of their library, where X is the total mana value of cards you own in exile.
```

**Current tags:** `effect.counter_modified`, `effect.create_creature_token`, `effect.create_token`, `effect.look_at_top_n`, `effect.plus_one_counter`

### Issues

- **missing**: no `effect.exile_from_library` / `condition.cares_exile_pile` tag exists
  - **What's wrong:** Three of Ashiok's four abilities (the static life→exile replacement, +1 card-pick exile, and −7 X-exile) all push cards from library into the exile zone, and the −7 specifically scales on the size of the player's own exile pile. The catalog has `effect.exile_from_battlefield` and `effect.exile_from_graveyard` but no library-→-exile or "cares about exile pile" axis.
  - **Evidence vs reality:** "exile that many cards from the top of your library", "Exile one of them" (post `look at the top two cards of your library`), "Target player exiles the top X cards of their library", "X is the total mana value of cards you own in exile".
  - **Suggested fix:** coverage gap — author `effect.exile_from_library` (the mill-but-to-exile family: Ashiok, Bojuka Bog style effects) and `condition.cares_exile_pile` (cards you own in exile as a resource). Pairs with the Nightmare token's "if a card was put into exile this turn" condition the same way `cares_lifegain` pairs with `life_changed`.
- **missing**: no `trigger.beginning_of_combat` / `trigger.beginning_of_turn_phase` tag exists
  - **What's wrong:** The −2 Nightmare token has "At the beginning of combat on your turn" — a common upkeep/combat-phase trigger family with zero catalog coverage. (Same axis would surface upkeep triggers, end-step triggers, etc.)
  - **Evidence vs reality:** literal "at the beginning of combat on your turn" in the token-grant clause.
  - **Suggested fix:** coverage gap — consider a `trigger.phase_begins` (broad) or family of phase-scoped triggers (`upkeep`, `combat`, `end_step`). Pairs with anthem effects, tap-down effects, sac-outlet timing.

---

## Back for Seconds  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {2}{B}

**Oracle text:**

```
Bargain (You may sacrifice an artifact, enchantment, or token as you cast this spell.)
Return up to two target creature cards from your graveyard to your hand. If this spell was bargained, you may put one of those cards with mana value 4 or less onto the battlefield instead of putting it into your hand.
```

**Current tags:** `condition.bargain`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.return_from_graveyard_to_hand`

### Issues

- **missing**: `effect.reanimate`
  - **What's wrong:** Card has a conditional reanimation mode — "put one of those cards [from your graveyard] ... onto the battlefield instead" — but only the `return_to_hand` half got tagged.
  - **Evidence vs reality:** literal "put one of those cards with mana value 4 or less onto the battlefield" sourced from graveyard cards. That's textbook reanimation.
  - **Suggested fix:** broaden `effect.reanimate` regex to catch the "you may put ... onto the battlefield instead of putting it into your hand" frame (modal reanimation following a return-to-hand clause). Common in Bargain spells.

---

## Beanstalk Wurm // Plant Beans  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Creature — Plant Wurm // Sorcery — Adventure
**Mana cost:** {4}{G} // {1}{G}

**Oracle text:**

```
Reach

You may play an additional land this turn. (Then exile this card. You may cast the creature later from exile.)
```

**Current tags:** `effect.adventure_card`, `effect.cast_noncreature_spell`

### Issues

- **missing**: no `effect.play_extra_land` (or `effect.additional_land_drop`) exists
  - **What's wrong:** "You may play an additional land this turn" is a small but distinct family (Exploration, Azusa, Wayward Swordtooth, Plant Beans, Explore the Wilds). Zero catalog coverage. Pairs naturally with `effect.ramp_nonland` / landfall payoffs.
  - **Evidence vs reality:** literal "you may play an additional land this turn" on the adventure face.
  - **Suggested fix:** coverage gap — author `effect.play_extra_land`. Anchors on `play an additional land`, `play (one|two) additional lands`. Probably a small family (<10 cards in Standard).
- **missing**: no `effect.has_reach` tag exists
  - **What's wrong:** Catalog has `has_trample`, `has_lifelink`, `has_first_strike`, etc., but not `has_reach`. Reach is a meaningful intrinsic keyword (defensive flying-coverage), absent from the catalog. Affects ~30+ Standard creatures.
  - **Evidence vs reality:** literal "Reach" keyword on the creature face.
  - **Suggested fix:** coverage gap — author `effect.has_reach` to fill out the intrinsic-keyword family. Similar pattern to existing `effect.has_*` rules.

---

## Beseech the Mirror  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {1}{B}{B}{B}

**Oracle text:**

```
Bargain (You may sacrifice an artifact, enchantment, or token as you cast this spell.)
Search your library for a card, exile it face down, then shuffle. If this spell was bargained, you may cast the exiled card without paying its mana cost if that spell's mana value is 4 or less. Put the exiled card into your hand if it wasn't cast this way.
```

**Current tags:** `condition.bargain`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.tutor_any`

### Issues

- **missing**: no `effect.cast_for_free` / `effect.cast_without_paying_mana` tag exists
  - **What's wrong:** "Cast without paying its mana cost" is a small but distinct family (Beseech the Mirror, Cosmic Intervention, cascade-adjacent effects, free-spell payoffs). Currently no catalog tag — pairs naturally with `condition.cares_high_mana_value` (free-casting a 4+ MV spell) and `effect.tutor_any` (tutor-and-cast combo).
  - **Evidence vs reality:** literal "you may cast the exiled card without paying its mana cost" — a Bargain-gated free cast at MV 4 or less.
  - **Suggested fix:** coverage gap — author `effect.cast_for_free`. Anchors on `cast .* without paying (its|the) mana cost`. Small family but iconic (cascade was last v0.7 family) and a real combo trigger for goldfish-style decks.

---

## Bitter Chill  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Enchantment — Aura
**Mana cost:** {1}{U}

**Oracle text:**

```
Enchant creature
When this Aura enters, tap enchanted creature.
Enchanted creature doesn't untap during its controller's untap step.
When this Aura is put into a graveyard from the battlefield, you may pay {1}. If you do, scry 1, then draw a card.
```

**Current tags:** `condition.cares_subtype.aura`, `effect.scry`, `effect.tap`

### Issues

- **missing**: `trigger.enchantment_leaves_battlefield`
  - **What's wrong:** This is the recurring "put into a graveyard from the battlefield" wording gap — the rule misses the RAW phrasing that's equivalent to "leaves the battlefield" / "dies".
  - **Evidence vs reality:** literal "When this Aura is put into a graveyard from the battlefield" on the LTB clause.
  - **Suggested fix:** broaden `trigger.enchantment_leaves_battlefield` anchor to include `is put into a graveyard from the battlefield` (and the same for the other `*_leaves_battlefield` family rules per the recurring-patterns note).

- **missing**: `trigger.self_etb`
  - **What's wrong:** "When this Aura enters" is modern self-ETB templating for a non-creature card. The current rule may be scoped to "this creature enters" / "creature" wording. Same shape applies to Rooms, Equipment, Vehicles, planeswalkers with ETBs.
  - **Evidence vs reality:** literal "When this Aura enters, tap enchanted creature."
  - **Suggested fix:** broaden `trigger.self_etb` to match `when this (aura|enchantment|artifact|equipment|vehicle|planeswalker|permanent) enters` — not just `this creature enters` and `__SELF__ enters`.

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** Card literally draws a card on LTB pay-to-trigger but `draws_or_discards` didn't fire.
  - **Evidence vs reality:** literal "scry 1, then draw a card".
  - **Suggested fix:** verify the `draws_or_discards` regex catches `draw a card` cleanly (not just `draw cards` / `draw N cards`). May be a simple anchor gap.

- **false-positive** (borderline / pattern-level): `condition.cares_subtype.aura`
  - **What's wrong:** Evidence is self-reference ("this Aura"), not Aura-tribal payoff. The rule fires on any card mentioning "Aura", which sweeps in self-referential Auras. Likely produces spurious graph edges to Aura-tribal anthems.
  - **Evidence vs reality:** the only "aura" mentions are `this Aura enters` and `this Aura is put into a graveyard` — both self-references, not external Aura references.
  - **Suggested fix:** narrow `cares_subtype.aura` (and likely all `cares_subtype.*` rules) to exclude `this Aura` / `this [SUBTYPE]` self-references — or scope to the card not being of that subtype itself. Same pattern likely applies to `cares_subtype.role`, `cares_subtype.equipment`, etc.

---

## Blossoming Tortoise  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Creature — Turtle
**Mana cost:** {2}{G}{G}

**Oracle text:**

```
Whenever this creature enters or attacks, mill three cards, then return a land card from your graveyard to the battlefield tapped.
Activated abilities of lands you control cost {1} less to activate.
Land creatures you control get +1/+1.
```

**Current tags:** `condition.cares_activated_abilities`, `effect.cost_reduction`, `effect.grants_stat_buff`, `effect.mill`, `effect.reanimate`, `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **missing**: no `condition.cares_lands` / `condition.cares_land_creatures` tag exists
  - **What's wrong:** This card's whole identity is "lands matter" — it reanimates lands, reduces land activated abilities, and buffs land creatures (manlands). With no `cares_lands` tag, it can't graph-edge into manland decks, landfall payoffs, or "lands in graveyard" archetypes (Crawling Barrens, Mishra's Foundry, etc.).
  - **Evidence vs reality:** literal "return a **land card** from your graveyard", "Activated abilities of **lands** you control", "**Land creatures** you control get +1/+1" — three separate land-payoff references in one card.
  - **Suggested fix:** coverage gap — author `condition.cares_lands` (broad — anchors on `lands? you control`, `land card`, `each land`) and possibly `condition.cares_manlands` (narrow — `land creatures`). Pairs with `effect.is_manland`, landfall triggers, and the ramp/lands-matter graph cluster.

---

## Boundary Lands Ranger  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Creature — Human Ranger
**Mana cost:** {1}{R}

**Oracle text:**

```
At the beginning of combat on your turn, if you control a creature with power 4 or greater, you may discard a card. If you do, draw a card.
```

**Current tags:** `effect.draws_or_discards`

### Issues

- **missing**: no `condition.cares_high_power` / `condition.cares_power_4_plus` tag exists
  - **What's wrong:** "Power 4 or greater" is a discrete archetype gate (FDN Big Score red, Gruul stompy, OTJ Outlaw checks). Currently zero catalog coverage. Without it, this card has nothing to pair against on the condition side.
  - **Evidence vs reality:** literal "if you control a creature with power 4 or greater".
  - **Suggested fix:** coverage gap — author `condition.cares_high_power`. Anchors on `power [4-9] or greater`, `power [4-9]+ or more`, `with the greatest power`. Pairs with `effect.grants_stat_buff` (anthems), `effect.plus_one_counter` (counter payoffs), `effect.create_creature_token` with power 4+ tokens.
- (Beginning-of-combat trigger is a known catalog gap — not relitigated here.)

---

## Bramble Familiar // Fetch Quest  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Creature — Elemental Raccoon // Sorcery — Adventure
**Mana cost:** {1}{G} // {5}{G}{G}

**Oracle text:**

```
{T}: Add {G}.
{1}{G}, {T}, Discard a card: Return this creature to its owner's hand.

Mill seven cards. Then put a creature, enchantment, or land card from among the milled cards onto the battlefield.
```

**Current tags:** `effect.add_mana`, `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.mill`, `effect.ramp_nonland`

### Issues

- **missing**: `effect.reanimate`
  - **What's wrong:** Adventure half is a self-mill + put-onto-battlefield (graveyard → battlefield) — that's textbook reanimation. Same shape as Beluna Grandsquall's adventure side (logged separately as `return_from_graveyard_to_hand` miss). Together these are a recurring "mill N, then put a [type] card from among the milled cards onto the battlefield/into hand" pattern that the recursion rules don't catch.
  - **Evidence vs reality:** literal "put a creature, enchantment, or land card from among the milled cards onto the battlefield" — cards are in graveyard at that point.
  - **Suggested fix:** broaden `effect.reanimate` regex anchor to include `from among (the|those) (milled|exiled) cards .* onto the battlefield`. Same broadening should apply to `effect.return_from_graveyard_to_hand` for the hand variant.

- **missing** (borderline): `effect.bounce_creature` (self-targeted)
  - **What's wrong:** "Return this creature to its owner's hand" is a self-bounce as part of an activated ability cost-payoff loop. Whether self-bounce should tag as `bounce_creature` is a design question — but currently the rule is silent on it. Some Standard cards (Mistmeadow Witch, Ephemerate-blink targets) benefit from being indexed as bounce.
  - **Evidence vs reality:** literal "Return this creature to its owner's hand".
  - **Suggested fix:** decide whether self-bounce belongs in `effect.bounce_creature` or a new `effect.self_bounce`. If the latter, the regex anchor would be `return (this|__SELF__) (creature|permanent) to its owner's hand`. Useful for flicker/ETB engines.

---

## Brave the Wilds  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {G}

**Oracle text:**

```
Bargain (You may sacrifice an artifact, enchantment, or token as you cast this spell.)
If this spell was bargained, target land you control becomes a 3/3 Elemental creature with haste that's still a land.
Search your library for a basic land card, reveal it, put it into your hand, then shuffle.
```

**Current tags:** `condition.bargain`, `condition.cares_tribe.elemental`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: no `effect.tutors_land` / `effect.tutors_basic_land` tag exists
  - **What's wrong:** Catalog has `effect.tutors_creature`, `effect.tutor_any`, and `effect.tutors_subtype.*` for many subtypes but no land tutor. Basic-land-to-hand is a distinct ramp family (Cultivate, Lay of the Land, Brave the Wilds, Reclaim the Wastes) that doesn't fire `effect.ramp_nonland` because it goes to hand, not play.
  - **Evidence vs reality:** literal "Search your library for a **basic land card**, reveal it, put it into your hand".
  - **Suggested fix:** coverage gap — author `effect.tutors_basic_land` (anchors on `search your library for a (basic )?land card`). Probably worth splitting `_to_hand` vs `_to_play` since Cultivate / Rampant Growth land-to-play is already partially covered by `ramp_nonland`.

- **missing**: no `effect.animate_land` tag exists
  - **What's wrong:** "Target land becomes a 3/3 Elemental creature with haste that's still a land" is the land-animation family (Living Lands, Awaken, Brave the Wilds, Nissa, Worldwaker). Distinct from `effect.is_manland` (intrinsic) — this animates someone else's land. No catalog coverage.
  - **Evidence vs reality:** literal "target land you control becomes a 3/3 Elemental creature with haste that's still a land".
  - **Suggested fix:** coverage gap — author `effect.animate_land`. Pairs with `condition.cares_lands` (suggested above) and `effect.is_manland`. Small but iconic family.

- **false-positive** (borderline): `condition.cares_tribe.elemental`
  - **What's wrong:** Evidence "elemental" is the type of the *created* token (animated land), not an external Elemental-tribal reference. Same pattern as the `cares_subtype.aura` self-reference issue on Bitter Chill — `cares_tribe.*` rules fire on type names appearing as token types, which sweeps in spurious tribal edges.
  - **Evidence vs reality:** the only "elemental" mention is "becomes a 3/3 **Elemental** creature" — the type of the animated land token, not a creature you're caring about as a tribal payoff.
  - **Suggested fix:** narrow `cares_tribe.*` regex anchors to exclude `becomes (a|an) [N/N ]?[TRIBE] (creature|token)` and `create (a|an) [TRIBE] (creature )?token` framings. Same pattern across all tribal rules.

---

## Callous Sell-Sword // Burn Together  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Creature — Human Soldier // Sorcery — Adventure
**Mana cost:** {1}{B} // {R}

**Oracle text:**

```
This creature enters with a +1/+1 counter on it for each creature that died under your control this turn.

Target creature you control deals damage equal to its power to any other target. Then sacrifice it.
```

**Current tags:** `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.deals_damage`
  - **What's wrong:** Adventure half is a fling-style "deals damage equal to its power to any other target" — textbook damage effect. Both halves of an Adventure should be tagged; here the back face is invisible to the rules.
  - **Evidence vs reality:** literal "Target creature you control deals damage equal to its power to any other target".
  - **Suggested fix:** verify `effect.deals_damage` regex anchors on `deals damage` (it should — Magma Spray, Lightning Strike all fire it). May be an adventure-face indexing issue: the rule isn't seeing the back face text. Worth checking the multi-face concatenation path.

- **missing**: `effect.sacrifice_creature`
  - **What's wrong:** "Then sacrifice it" after a target-creature damage effect is the classic Fling/Burn Together sacrifice-as-effect (not a cost). Rule should fire.
  - **Evidence vs reality:** literal "Then sacrifice it" where "it" refers to "Target creature you control" earlier in the same sentence.
  - **Suggested fix:** verify `effect.sacrifice_creature` anchors on `sacrifice (it|that creature|the creature)` not just `sacrifice a creature`. Pronoun back-reference is the failure mode.

- **missing**: no `condition.cares_creatures_died_this_turn` (morbid scaling) tag exists
  - **What's wrong:** "For each creature that died under your control this turn" is a discrete scaling pattern (morbid, the Aftermath dies-count, Mortician Beetle, Grim Lavamancer). No catalog coverage. Distinct from `trigger.creature_dies` (which triggers on the death) and `condition.cares_graveyard` (which counts graveyard contents).
  - **Evidence vs reality:** literal "for each creature that died under your control this turn".
  - **Suggested fix:** coverage gap — author `condition.cares_creatures_died_this_turn`. Anchors on `creatures? (that |you control )?died (under your control )?this turn`, `for each creature that died`. Pairs with `effect.sacrifice_creature`, `effect.create_creature_token` sac-fodder, aristocrats strategies.

---

## Candy Trail  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Artifact — Food Clue
**Mana cost:** {1}

**Oracle text:**

```
When this artifact enters, scry 2.
{2}, {T}, Sacrifice this artifact: You gain 3 life and draw a card.
```

**Current tags:** `effect.sacrifice_artifact`, `effect.scry`, `trigger.self_etb`

### Issues

- **missing**: `effect.life_changed`
  - **What's wrong:** "You gain 3 life" is the canonical life-gain phrase. Rule didn't fire.
  - **Evidence vs reality:** literal "You gain 3 life".
  - **Suggested fix:** verify `effect.life_changed` regex anchors on `you gain \d+ life`. Likely a simple anchor miss. Pairs the card with `cares_lifegain` payoffs.

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** "draw a card" on a sac-outlet artifact, but the rule doesn't fire. Same shape as Bitter Chill miss (logged separately) — `draws_or_discards` is missing simple "draw a card" matches.
  - **Evidence vs reality:** literal "and draw a card".
  - **Suggested fix:** verify `effect.draws_or_discards` regex matches `draw a card` (singular, not requiring digit). This is now a confirmed recurring pattern — log under the rule, not per card.

- **note** (no missing tag, but worth flagging): the card has both Food and Clue subtypes but the catalog has only `effect.create_food` / `effect.create_clue` (creation axis), not "is food" / "is clue" condition tags. Food/Clue subtypes are common in Standard (Eldraine ELD/WOE, MKM) — small coverage gap if grouping cards by Food/Clue archetype matters.

---

## Charging Hooligan  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Creature — Human Peasant
**Mana cost:** {3}{R}

**Oracle text:**

```
Whenever this creature attacks, it gets +1/+0 until end of turn for each attacking creature. If a Rat is attacking, this creature gains trample until end of turn.
```

**Current tags:** `effect.grants_stat_buff`, `effect.has_trample`, `trigger.attack_or_block`

### Issues

- **false-positive**: `effect.has_trample`
  - **What's wrong:** Recurring "keyword-grant leaking into `effect.has_<keyword>`" pattern — but here it's a CONDITIONAL SELF-GRANT, not a static keyword. The card does not print trample on its keyword line; it temporarily gains trample only if a Rat is attacking. Tagging it `has_trample` over-claims and produces wrong graph edges to "creatures with trample" payoffs.
  - **Evidence vs reality:** evidence was `"trample"` but the surrounding clause is "this creature **gains trample** until end of turn" inside a Rat-tribal conditional.
  - **Suggested fix:** narrow `effect.has_trample` to require trample as a keyword-line (post-normalization, on its own line OR adjacent to other keywords), excluding `gains? trample` and `have trample` grant frames. Same fix should apply to all `has_<keyword>` rules per recurring-patterns note.

- **missing**: no `condition.cares_tribe.rat` tag exists
  - **What's wrong:** "If a Rat is attacking" is a Rat-tribal reference. Catalog has tribal tags for Knight/Goblin/Faerie/etc. but no Rat. The Rat archetype is real in Standard (MKM, OTJ, DSK) and has at least a handful of payoffs.
  - **Evidence vs reality:** literal "If a Rat is attacking".
  - **Suggested fix:** coverage gap — add Rat to the `THEME_TRIBES` list so `condition.cares_tribe.rat` is parametrically generated.

---

## Cooped Up  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Enchantment — Aura
**Mana cost:** {1}{W}

**Oracle text:**

```
Enchant creature
Enchanted creature can't attack or block.
{2}{W}: Exile enchanted creature.
```

**Current tags:** (none)

### Issues

- **missing**: `effect.exile_creature`
  - **What's wrong:** "{2}{W}: Exile enchanted creature" — a textbook activated exile-removal effect, but the rule didn't fire. Probable cause: rule anchors on `exile target creature` and misses Aura-frame `exile enchanted creature`.
  - **Evidence vs reality:** literal "Exile enchanted creature".
  - **Suggested fix:** broaden `effect.exile_creature` to match `exile (enchanted|equipped) creature` (and similar attached-creature framings on Auras/Equipment). Same broadening for `destroy_creature` if it has the same anchor.

- **missing**: no `effect.cant_attack_or_block` / `effect.pacify` / `effect.lockdown` tag exists
  - **What's wrong:** "Enchanted creature can't attack or block" is the Pacifism family (Cooped Up, Pacifism, Arrest, Imprisoned in the Moon-ish effects). Distinct from `effect.tap` (one-shot) and `effect.bounce_creature` (returns). Currently zero catalog coverage despite being one of W/U's primary removal-replacement mechanics.
  - **Evidence vs reality:** literal "Enchanted creature can't attack or block".
  - **Suggested fix:** coverage gap — author `effect.pacify` (or `effect.cant_attack_or_block`). Anchors on `can't attack( or block)?`, `enchanted creature can't (attack|block|cast|use)`. Pair with `condition.cares_subtype.aura` and white control archetypes.

- **note**: card got ZERO tags. Even the activated-ability indicator and Aura subtype-line didn't produce a `has_activated_ability` tag (rule is creature-scoped, intentional). A vanilla-tagged Aura should still get `condition.cares_subtype.aura` only if it self-references "Aura" — Cooped Up does not, so the absence is consistent with the prior Bitter Chill discussion (where self-reference was flagged as a borderline FP). Worth confirming this is the intended behavior: zero-tag Auras hurt graph connectivity.

---

## Devouring Sugarmaw // Have for Dinner  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->

**Type:** Creature — Horror // Instant — Adventure
**Mana cost:** {2}{B}{B} // {1}{W}

**Oracle text:**

```
Menace, trample
At the beginning of your upkeep, you may sacrifice an artifact, enchantment, or token. If you don't, tap this creature.

Create a 1/1 white Human creature token and a Food token. (Then exile this card. You may cast the creature later from exile.)
```

**Current tags:** `condition.cares_tribe.human`, `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.create_creature_token`, `effect.create_food`, `effect.create_token`, `effect.has_evasion_intrinsic`, `effect.has_trample`, `effect.sacrifice_artifact`, `effect.tap`

### Issues

- **false-positive**: `condition.cares_tribe.human`
  - **What's wrong:** Recurring `cares_tribe.X` firing on token-type framing (same as Brave the Wilds with Elemental). "1/1 white Human creature token" names the token's type — it's the type the card *creates*, not a Human-tribal payoff condition. Tagging this `cares_tribe.human` sweeps the card into Human-tribal graph edges (anthems, lords) where it shouldn't appear.
  - **Evidence vs reality:** the only "human" mention is "Create a 1/1 white **Human** creature token".
  - **Suggested fix:** narrow `condition.cares_tribe.*` to exclude `create a [N/N] [color] [TRIBE] (creature )?token` and similar token-creation framings. Likely a single regex anchor change parametrically applied to all `THEME_TRIBES`.

- **false-positive**: `effect.tap`
  - **What's wrong:** Rule description says "Taps a target permanent (soft control / removal effect)" — but here "tap this creature" is a SELF-tap drawback if you don't sacrifice. Not removal, not control — it's the cost of skipping an upkeep tax. Wrong axis.
  - **Evidence vs reality:** evidence "tap this creature" — but context is "If you don't [sacrifice], tap this creature" inside an upkeep trigger, not a target-permanent removal.
  - **Suggested fix:** narrow `effect.tap` to require target-permanent framing (`tap target (creature|permanent|artifact|land)`) and exclude self-targeting (`tap this (creature|permanent)`, `tap __SELF__`). Also exclude phrases inside cost/drawback clauses, though those are harder to detect.

- **missing**: `effect.sacrifice_enchantment`
  - **What's wrong:** "you may sacrifice an artifact, enchantment, or token" — `sacrifice_artifact` fired but `sacrifice_enchantment` did not. The rule description explicitly says it "Includes broad 'sacrifice a permanent' phrasing" and "an enchantment" in a multi-type sac list, but the rule may anchor on `sacrifice (a |an )?enchantment` specifically and miss the "or enchantment" middle position.
  - **Evidence vs reality:** literal "sacrifice an artifact, enchantment, or token".
  - **Suggested fix:** verify `sacrifice_enchantment` anchor accepts comma-separated multi-type lists (`sacrifice .*,? enchantment,? .*`). Same pattern for the artifact-listed-with-enchantment-or-token Bargain phrasing.

---

## Armored Kincaller  <!-- audited 2026-05-25, ruleVersion v0.12.6; resolved v0.12.7 -->

**Type:** Creature — Dinosaur
**Mana cost:** {2}{G}

**Oracle text:**

```
When this creature enters, you may reveal a Dinosaur card from your hand. If you do or if you control another Dinosaur, you gain 3 life.
```

**Current tags:** `effect.life_changed`, `trigger.self_etb`

### Issues

- **missing**: no `condition.cares_tribe.dinosaur` exists
  - **What's wrong:** Card explicitly references Dinosaur cards in hand and Dinosaurs you control — a tribal payoff. THEME_TRIBES in `pipeline/themes.ts` includes dwarf/elemental/elf/faerie/goblin/human/knight/merfolk/rat/vampire/wizard/zombie but omits Dinosaur. Dinosaur is a flagship LCI Standard tribe (Bonehoard Dracosaur, Cavern of Souls reprint targets, etc.).
  - **Evidence vs reality:** card has "reveal a Dinosaur card from your hand" and "if you control another Dinosaur" — both classic tribal payoff frames.
  - **Suggested fix:** add `Dinosaur` to THEME_TRIBES in `pipeline/themes.ts`. The parametric rule will then auto-generate `condition.cares_tribe.dinosaur` (and `effect.tutors_subtype.dinosaur` if applicable).

**Resolution (v0.12.7):** `dinosaur` added to `THEME_TRIBES`; `condition.cares_tribe.dinosaur` now fires on this card.

---

## Belligerent Yearling  <!-- audited 2026-05-25, ruleVersion v0.12.6; resolved v0.12.7 -->

**Type:** Creature — Dinosaur
**Mana cost:** {1}{R}

**Oracle text:**

```
Trample
Whenever another Dinosaur you control enters, you may have this creature's base power become equal to that creature's power until end of turn.
```

**Current tags:** `effect.has_trample`, `trigger.another_creature_etb`

### Issues

- **missing**: `condition.cares_tribe.dinosaur` — recurring tribe gap, see Armored Kincaller entry above

**Resolution (v0.12.7):** `dinosaur` added to `THEME_TRIBES`; `condition.cares_tribe.dinosaur` now fires on this card.

---

## Archon's Glory  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.8: `effect.has_lifelink` was already fixed in a prior pass by switching to intrinsic-only Scryfall keyword check; grant-clause "gains lifelink" no longer matches. -->

**Type:** Instant
**Mana cost:** {W}

**Oracle text:**

```
Bargain (You may sacrifice an artifact, enchantment, or token as you cast this spell.)
Target creature gets +2/+2 until end of turn. If this spell was bargained, that creature also gains flying and lifelink until end of turn.
```

**Current tags:** `condition.bargain`, `effect.cast_noncreature_spell`, `effect.grants_evasion`, `effect.grants_lifelink`, `effect.grants_stat_buff`, `effect.is_instant_or_sorcery`

### Issues

- **false-positive**: `effect.has_lifelink`
  - **What's wrong:** Archon's Glory is an Instant — it cannot itself "have" lifelink. It temporarily grants lifelink to a target creature.
  - **Evidence vs reality:** evidence was `"lifelink"`, drawn from `"that creature also gains flying and lifelink until end of turn"` — a grant clause, not a self-keyword. (`grants_evasion` already fires on the flying half via the right axis; this is the symmetric miss for lifelink.)
  - **Suggested fix:** narrow `has_lifelink` to require either a standalone keyword line, "this creature has lifelink", or to refuse matching when the matched span sits inside a "gains/gain ... until end of turn" or "target creature gains" grant frame. Mirror whatever fix is applied to `has_trample` (Agatha entry above) — same pattern, different keyword.

---

## Charging Hooligan  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.8: `effect.has_trample` was already fixed in a prior pass by switching to intrinsic-only Scryfall keyword check; conditional self-grant "gains trample until end of turn" no longer matches. -->

**Type:** Creature — Human Peasant
**Mana cost:** {3}{R}

**Oracle text:**

```
Whenever this creature attacks, it gets +1/+0 until end of turn for each attacking creature. If a Rat is attacking, this creature gains trample until end of turn.
```

**Current tags:** `condition.cares_tribe.rat`, `effect.grants_stat_buff`, `effect.grants_trample`, `trigger.attack_or_block`

### Issues

- **false-positive**: `effect.has_trample`
  - **What's wrong:** Recurring "keyword-grant leaking into `effect.has_<keyword>`" pattern — but here it's a CONDITIONAL SELF-GRANT, not a static keyword. The card does not print trample on its keyword line; it temporarily gains trample only if a Rat is attacking. Tagging it `has_trample` over-claims and produces wrong graph edges to "creatures with trample" payoffs.
  - **Evidence vs reality:** evidence was `"trample"` but the surrounding clause is "this creature **gains trample** until end of turn" inside a Rat-tribal conditional.
  - **Suggested fix:** narrow `effect.has_trample` to require trample as a keyword-line (post-normalization, on its own line OR adjacent to other keywords), excluding `gains? trample` and `have trample` grant frames. Same fix should apply to all `has_<keyword>` rules per recurring-patterns note.

---

## Into the Fae Court  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.8: `condition.cares_evasion` now strips token-creation grant clauses and block-restriction clauses ("can block only creatures with flying") before pattern-matching. -->

**Type:** Sorcery
**Mana cost:** {3}{U}{U}

**Oracle text:**

```
Draw three cards. Create a 1/1 blue Faerie creature token with flying and "This token can block only creatures with flying."
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.create_creature_token`, `effect.create_token`, `effect.draws_or_discards`, `effect.grants_evasion`, `effect.is_instant_or_sorcery`

### Issues

- **false-positive**: `condition.cares_evasion`
  - **What's wrong:** The tag's description says "References creatures with flying, menace, or intimidate as a payoff group" — but this card's "creatures with flying" reference is inside the *token's* blocking-restriction clause ("This token can block only creatures with flying"). It's not a payoff group for the caster; it's a defensive restriction on the produced token.
  - **Evidence vs reality:** evidence was `"creatures with flying"`, but that substring sits inside a token's blocking restriction — not a "Whenever a creature with flying attacks" / "Creatures you control with flying get +X/+X" payoff pattern.
  - **Suggested fix:** narrow `condition.cares_evasion` to exclude matches inside token grant clauses, especially blocking restrictions (`can(?:'t| only) block`).

---

## Abuelo, Ancestral Echo  <!-- audited 2026-05-25, ruleVersion v0.12.6 -->
<!-- Resolved in RULE_VERSION v0.12.8: `effect.exile_creature` and `effect.exile_artifact` now skip matches followed by a "Return it/them/that creature/target ... to the battlefield" flicker tail; `effect.bounce_creature` / `effect.bounce_artifact` already correctly cover the flicker semantics. -->

**Type:** Legendary Creature — Spirit
**Mana cost:** {1}{W}{U}

**Oracle text:**

```
Flying, ward {2}
{1}{W}{U}: Exile another target creature or artifact you control. Return it to the battlefield under its owner's control at the beginning of the next end step.
```

**Current tags:** `condition.cares_artifacts`, `effect.bounce_artifact`, `effect.bounce_creature`, `effect.has_activated_ability`, `effect.has_evasion_intrinsic`

### Issues

- **false-positive**: `effect.exile_creature`
  - **What's wrong:** The "exile" is part of a flicker (exile-and-return at next end step), not removal. `bounce_creature` already covers this case per its tagDef.
  - **Evidence vs reality:** evidence was `"exile another target creature"`, but the very next sentence says "Return it to the battlefield ... at the beginning of the next end step." The exile_creature tagDef is for removal; flicker is a separate axis.
  - **Suggested fix:** narrow exile_creature regex to exclude the "exile ... Return it to the battlefield" flicker frame (lookahead for "Return it" / "return them" in the next clause).
- **false-positive**: `effect.exile_artifact`
  - **What's wrong:** Same as above — flicker, not removal.
  - **Evidence vs reality:** evidence was `"exile another target creature or artifact"`. Flicker covered by `bounce_artifact`.
  - **Suggested fix:** mirror the flicker exclusion in exile_artifact regex.

---

## Agatha of the Vile Cauldron  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- FP bullet(s) resolved in v0.12.8; missing bullets remain for Phase 3+ -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Legendary Creature — Human Warlock
**Mana cost:** {R}{G}

**Oracle text:**

```
Activated abilities of creatures you control cost {X} less to activate, where X is Agatha's power. This effect can't reduce the mana in that cost to less than one mana.
{4}{R}{G}: Other creatures you control get +1/+1 and gain trample and haste until end of turn.
```

**Current tags:** `condition.cares_activated_abilities`, `effect.cost_reduction`, `effect.grants_haste`, `effect.grants_stat_buff`, `effect.grants_trample`, `effect.has_activated_ability`

### Issues

- **missing**: `effect.grants_evasion` (sort of) / no `grants_trample` or `grants_haste` tag exists
  - **What's wrong:** Card grants trample + haste to other creatures, but the catalog has no `effect.grants_trample` / `effect.grants_haste`. `effect.grants_evasion` is flying/menace/intimidate only, so it doesn't cover this either.
  - **Evidence vs reality:** `"gain trample and haste until end of turn"` — real anthem-style keyword-grant effect that the graph currently can't represent beyond the +1/+1 piece.
  - **Suggested fix:** consider authoring `effect.grants_keyword_combat` (or split per keyword) so synergies like "haste enablers" / "trample enablers" are discoverable. Coverage gap, not a same-card narrowing.

---

## Agatha's Soul Cauldron  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Legendary Artifact
**Mana cost:** {2}

**Oracle text:**

```
You may spend mana as though it were mana of any color to activate abilities of creatures you control.
Creatures you control with +1/+1 counters on them have all activated abilities of all creature cards exiled with Agatha's Soul Cauldron.
{T}: Exile target card from a graveyard. When a creature card is exiled this way, put a +1/+1 counter on target creature you control.
```

**Current tags:** `condition.cares_activated_abilities`, `condition.cares_plus_one_counter`, `effect.counter_modified`, `effect.exile_from_graveyard`, `effect.has_activated_ability`, `effect.plus_one_counter`, `trigger.creature_leaves_graveyard`

### Issues

- **missing**: `effect.has_activated_ability`
  - **What's wrong:** Card has `{T}: Exile target card from a graveyard.` — a textbook activated ability ("cost: effect" line) — but the tag did not fire.
  - **Evidence vs reality:** the third paragraph leads with `{T}:`, which is the canonical activated-ability anchor. Suggests the rule's regex requires a mana-cost activation or scopes to creatures rather than any permanent.
  - **Suggested fix:** broaden `has_activated_ability` to cover `{T}:` (tap-only) costs on non-creature permanents, not just `{mana}: effect` lines on creatures.
- **missing**: `trigger.creature_leaves_graveyard`
  - **What's wrong:** "When a creature card is exiled this way" is a triggered ability that fires when a creature card leaves a graveyard (via Cauldron's own exile activation).
  - **Evidence vs reality:** The "this way" back-reference ties to "Exile target card from a graveyard" in the same paragraph — by RAW this is a graveyard-exile trigger. The tag description ("Triggers when cards leave or are exiled from a graveyard") covers this directly.
  - **Suggested fix:** add a regex case for "when a creature card is exiled this way" anchored to a prior `exile .* from a graveyard` clause in the same paragraph.

---

## Aquatic Alchemist // Bubble Up  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Elemental // Sorcery — Adventure
**Mana cost:** {1}{U} // {2}{U}

**Oracle text:**

```
Whenever you cast your first instant or sorcery spell each turn, this creature gets +2/+0 until end of turn.

Put target instant or sorcery card from your graveyard on top of your library. (Then exile this card. You may cast the creature later from exile.)
```

**Current tags:** `condition.cares_instant_sorcery_in_graveyard`, `condition.cares_noncreature_spell`, `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.grants_stat_buff`, `trigger.spell_cast`

### Issues

- **missing**: `trigger.spell_cast`
  - **What's wrong:** Front face triggers on "Whenever you cast your first instant or sorcery spell each turn" — a textbook spell-cast trigger — but the tag did not fire.
  - **Evidence vs reality:** "whenever you cast ... spell" is the canonical anchor for `trigger.spell_cast`. May be over-narrowed to exclude "first ... each turn" qualifiers, or scoped only to "whenever you cast a spell" with no adjective.
  - **Suggested fix:** ensure `spell_cast` regex tolerates ordinal/per-turn qualifiers ("your first", "the second", "each turn") between `whenever you cast` and `spell`.
- **missing**: `condition.cares_noncreature_spell`
  - **What's wrong:** Trigger gates on casting an instant or sorcery — the prowess-style noncreature-spell payoff — but the tag is absent.
  - **Evidence vs reality:** "cast your first instant or sorcery spell each turn" is the exact phrase this condition is meant to capture (modulo the "first ... each turn" qualifier).
  - **Suggested fix:** broaden `cares_noncreature_spell` to match the same per-turn-qualified spell-cast pattern as the fix for `trigger.spell_cast`.

---

## Ashiok's Reaper  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Nightmare
**Mana cost:** {3}{B}

**Oracle text:**

```
Whenever an enchantment you control is put into a graveyard from the battlefield, draw a card.
```

**Current tags:** `condition.cares_enchantments`, `effect.draws_or_discards`, `trigger.enchantment_leaves_battlefield`

### Issues

- **missing**: `trigger.enchantment_leaves_battlefield`
  - **What's wrong:** Card's whole ability is a textbook enchantment-leaves-battlefield trigger ("Whenever an enchantment you control is put into a graveyard from the battlefield"), but the tag did not fire.
  - **Evidence vs reality:** "put into a graveyard from the battlefield" is the canonical RAW phrasing for a destroy/sac trigger. The tag description explicitly says "covers destroy, exile, bounce, sacrifice." Rule likely only matches "leaves the battlefield" / "dies" wording and misses the "put into a graveyard from the battlefield" phrasing.
  - **Suggested fix:** broaden `enchantment_leaves_battlefield` regex to also match `enchantment .* (?:is|are) put into (?:a|its owner's) graveyard from the battlefield`. Mirror fix likely needed for `artifact_leaves_battlefield`, `creature_leaves_battlefield`, `land_leaves_battlefield`, `planeswalker_leaves_battlefield`.

---

## Back for Seconds  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Sorcery
**Mana cost:** {2}{B}

**Oracle text:**

```
Bargain (You may sacrifice an artifact, enchantment, or token as you cast this spell.)
Return up to two target creature cards from your graveyard to your hand. If this spell was bargained, you may put one of those cards with mana value 4 or less onto the battlefield instead of putting it into your hand.
```

**Current tags:** `condition.bargain`, `condition.cares_low_mana_value`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.reanimate`, `effect.return_from_graveyard_to_hand`

### Issues

- **missing**: `effect.reanimate`
  - **What's wrong:** Card has a conditional reanimation mode — "put one of those cards [from your graveyard] ... onto the battlefield instead" — but only the `return_to_hand` half got tagged.
  - **Evidence vs reality:** literal "put one of those cards with mana value 4 or less onto the battlefield" sourced from graveyard cards. That's textbook reanimation.
  - **Suggested fix:** broaden `effect.reanimate` regex to catch the "you may put ... onto the battlefield instead of putting it into your hand" frame (modal reanimation following a return-to-hand clause). Common in Bargain spells.

---

## Beanstalk Wurm // Plant Beans  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Plant Wurm // Sorcery — Adventure
**Mana cost:** {4}{G} // {1}{G}

**Oracle text:**

```
Reach

You may play an additional land this turn. (Then exile this card. You may cast the creature later from exile.)
```

**Current tags:** `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.has_reach`, `effect.play_extra_land`

### Issues

- **missing**: no `effect.play_extra_land` (or `effect.additional_land_drop`) exists
  - **What's wrong:** "You may play an additional land this turn" is a small but distinct family (Exploration, Azusa, Wayward Swordtooth, Plant Beans, Explore the Wilds). Zero catalog coverage. Pairs naturally with `effect.ramp_nonland` / landfall payoffs.
  - **Evidence vs reality:** literal "you may play an additional land this turn" on the adventure face.
  - **Suggested fix:** coverage gap — author `effect.play_extra_land`. Anchors on `play an additional land`, `play (one|two) additional lands`. Probably a small family (<10 cards in Standard).
- **missing**: no `effect.has_reach` tag exists
  - **What's wrong:** Catalog has `has_trample`, `has_lifelink`, `has_first_strike`, etc., but not `has_reach`. Reach is a meaningful intrinsic keyword (defensive flying-coverage), absent from the catalog. Affects ~30+ Standard creatures.
  - **Evidence vs reality:** literal "Reach" keyword on the creature face.
  - **Suggested fix:** coverage gap — author `effect.has_reach` to fill out the intrinsic-keyword family. Similar pattern to existing `effect.has_*` rules.

---

## Beseech the Mirror  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Sorcery
**Mana cost:** {1}{B}{B}{B}

**Oracle text:**

```
Bargain (You may sacrifice an artifact, enchantment, or token as you cast this spell.)
Search your library for a card, exile it face down, then shuffle. If this spell was bargained, you may cast the exiled card without paying its mana cost if that spell's mana value is 4 or less. Put the exiled card into your hand if it wasn't cast this way.
```

**Current tags:** `condition.bargain`, `effect.cast_for_free`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.tutor_any`

### Issues

- **missing**: no `effect.cast_for_free` / `effect.cast_without_paying_mana` tag exists
  - **What's wrong:** "Cast without paying its mana cost" is a small but distinct family (Beseech the Mirror, Cosmic Intervention, cascade-adjacent effects, free-spell payoffs). Currently no catalog tag — pairs naturally with `condition.cares_high_mana_value` (free-casting a 4+ MV spell) and `effect.tutor_any` (tutor-and-cast combo).
  - **Evidence vs reality:** literal "you may cast the exiled card without paying its mana cost" — a Bargain-gated free cast at MV 4 or less.
  - **Suggested fix:** coverage gap — author `effect.cast_for_free`. Anchors on `cast .* without paying (its|the) mana cost`. Small family but iconic (cascade was last v0.7 family) and a real combo trigger for goldfish-style decks.

---

## Bitter Chill  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- FP bullet(s) resolved in v0.12.8; missing bullets remain for Phase 3+ -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Enchantment — Aura
**Mana cost:** {1}{U}

**Oracle text:**

```
Enchant creature
When this Aura enters, tap enchanted creature.
Enchanted creature doesn't untap during its controller's untap step.
When this Aura is put into a graveyard from the battlefield, you may pay {1}. If you do, scry 1, then draw a card.
```

**Current tags:** `effect.draws_or_discards`, `effect.scry`, `effect.tap`, `trigger.enchantment_leaves_battlefield`, `trigger.self_etb`

### Issues

- **missing**: `trigger.enchantment_leaves_battlefield`
  - **What's wrong:** This is the recurring "put into a graveyard from the battlefield" wording gap — the rule misses the RAW phrasing that's equivalent to "leaves the battlefield" / "dies".
  - **Evidence vs reality:** literal "When this Aura is put into a graveyard from the battlefield" on the LTB clause.
  - **Suggested fix:** broaden `trigger.enchantment_leaves_battlefield` anchor to include `is put into a graveyard from the battlefield` (and the same for the other `*_leaves_battlefield` family rules per the recurring-patterns note).

- **missing**: `trigger.self_etb`
  - **What's wrong:** "When this Aura enters" is modern self-ETB templating for a non-creature card. The current rule may be scoped to "this creature enters" / "creature" wording. Same shape applies to Rooms, Equipment, Vehicles, planeswalkers with ETBs.
  - **Evidence vs reality:** literal "When this Aura enters, tap enchanted creature."
  - **Suggested fix:** broaden `trigger.self_etb` to match `when this (aura|enchantment|artifact|equipment|vehicle|planeswalker|permanent) enters` — not just `this creature enters` and `__SELF__ enters`.

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** Card literally draws a card on LTB pay-to-trigger but `draws_or_discards` didn't fire.
  - **Evidence vs reality:** literal "scry 1, then draw a card".
  - **Suggested fix:** verify the `draws_or_discards` regex catches `draw a card` cleanly (not just `draw cards` / `draw N cards`). May be a simple anchor gap.

---

## Blossoming Tortoise  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Turtle
**Mana cost:** {2}{G}{G}

**Oracle text:**

```
Whenever this creature enters or attacks, mill three cards, then return a land card from your graveyard to the battlefield tapped.
Activated abilities of lands you control cost {1} less to activate.
Land creatures you control get +1/+1.
```

**Current tags:** `condition.cares_activated_abilities`, `condition.cares_lands`, `effect.cost_reduction`, `effect.grants_stat_buff`, `effect.mill`, `effect.reanimate`, `trigger.another_creature_etb`, `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **missing**: no `condition.cares_lands` / `condition.cares_land_creatures` tag exists
  - **What's wrong:** This card's whole identity is "lands matter" — it reanimates lands, reduces land activated abilities, and buffs land creatures (manlands). With no `cares_lands` tag, it can't graph-edge into manland decks, landfall payoffs, or "lands in graveyard" archetypes (Crawling Barrens, Mishra's Foundry, etc.).
  - **Evidence vs reality:** literal "return a **land card** from your graveyard", "Activated abilities of **lands** you control", "**Land creatures** you control get +1/+1" — three separate land-payoff references in one card.
  - **Suggested fix:** coverage gap — author `condition.cares_lands` (broad — anchors on `lands? you control`, `land card`, `each land`) and possibly `condition.cares_manlands` (narrow — `land creatures`). Pairs with `effect.is_manland`, landfall triggers, and the ramp/lands-matter graph cluster.

---

## Boundary Lands Ranger  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Human Ranger
**Mana cost:** {1}{R}

**Oracle text:**

```
At the beginning of combat on your turn, if you control a creature with power 4 or greater, you may discard a card. If you do, draw a card.
```

**Current tags:** `condition.cares_high_power`, `effect.draws_or_discards`

### Issues

- **missing**: no `condition.cares_high_power` / `condition.cares_power_4_plus` tag exists
  - **What's wrong:** "Power 4 or greater" is a discrete archetype gate (FDN Big Score red, Gruul stompy, OTJ Outlaw checks). Currently zero catalog coverage. Without it, this card has nothing to pair against on the condition side.
  - **Evidence vs reality:** literal "if you control a creature with power 4 or greater".
  - **Suggested fix:** coverage gap — author `condition.cares_high_power`. Anchors on `power [4-9] or greater`, `power [4-9]+ or more`, `with the greatest power`. Pairs with `effect.grants_stat_buff` (anthems), `effect.plus_one_counter` (counter payoffs), `effect.create_creature_token` with power 4+ tokens.
- (Beginning-of-combat trigger is a known catalog gap — not relitigated here.)

---

## Brave the Wilds  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- FP bullet(s) resolved in v0.12.8; missing bullets remain for Phase 3+ -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Sorcery
**Mana cost:** {G}

**Oracle text:**

```
Bargain (You may sacrifice an artifact, enchantment, or token as you cast this spell.)
If this spell was bargained, target land you control becomes a 3/3 Elemental creature with haste that's still a land.
Search your library for a basic land card, reveal it, put it into your hand, then shuffle.
```

**Current tags:** `condition.bargain`, `condition.cares_lands`, `effect.animate_land`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.tutors_basic_land`

### Issues

- **missing**: no `effect.tutors_land` / `effect.tutors_basic_land` tag exists
  - **What's wrong:** Catalog has `effect.tutors_creature`, `effect.tutor_any`, and `effect.tutors_subtype.*` for many subtypes but no land tutor. Basic-land-to-hand is a distinct ramp family (Cultivate, Lay of the Land, Brave the Wilds, Reclaim the Wastes) that doesn't fire `effect.ramp_nonland` because it goes to hand, not play.
  - **Evidence vs reality:** literal "Search your library for a **basic land card**, reveal it, put it into your hand".
  - **Suggested fix:** coverage gap — author `effect.tutors_basic_land` (anchors on `search your library for a (basic )?land card`). Probably worth splitting `_to_hand` vs `_to_play` since Cultivate / Rampant Growth land-to-play is already partially covered by `ramp_nonland`.

- **missing**: no `effect.animate_land` tag exists
  - **What's wrong:** "Target land becomes a 3/3 Elemental creature with haste that's still a land" is the land-animation family (Living Lands, Awaken, Brave the Wilds, Nissa, Worldwaker). Distinct from `effect.is_manland` (intrinsic) — this animates someone else's land. No catalog coverage.
  - **Evidence vs reality:** literal "target land you control becomes a 3/3 Elemental creature with haste that's still a land".
  - **Suggested fix:** coverage gap — author `effect.animate_land`. Pairs with `condition.cares_lands` (suggested above) and `effect.is_manland`. Small but iconic family.

---

## Callous Sell-Sword // Burn Together  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->
<!-- v0.12.9 false-alarm audit: the `effect.deals_damage` bullet was reviewed and ruled mis-categorized. The card has `effect.causes_damage` (indirect damage via a targeted creature), which is the correct axis for "target creature you control deals damage equal to its power to any other target." `effect.deals_damage` is intentionally self-only. -->

**Type:** Creature — Human Soldier // Sorcery — Adventure
**Mana cost:** {1}{B} // {R}

**Oracle text:**

```
This creature enters with a +1/+1 counter on it for each creature that died under your control this turn.

Target creature you control deals damage equal to its power to any other target. Then sacrifice it.
```

**Current tags:** `condition.cares_creatures_died_this_turn`, `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.causes_damage`, `effect.counter_modified`, `effect.plus_one_counter`, `effect.sacrifice_creature`

### Issues

- **missing**: `effect.deals_damage`
  - **What's wrong:** Adventure half is a fling-style "deals damage equal to its power to any other target" — textbook damage effect. Both halves of an Adventure should be tagged; here the back face is invisible to the rules.
  - **Evidence vs reality:** literal "Target creature you control deals damage equal to its power to any other target".
  - **Suggested fix:** verify `effect.deals_damage` regex anchors on `deals damage` (it should — Magma Spray, Lightning Strike all fire it). May be an adventure-face indexing issue: the rule isn't seeing the back face text. Worth checking the multi-face concatenation path.

- **missing**: `effect.sacrifice_creature`
  - **What's wrong:** "Then sacrifice it" after a target-creature damage effect is the classic Fling/Burn Together sacrifice-as-effect (not a cost). Rule should fire.
  - **Evidence vs reality:** literal "Then sacrifice it" where "it" refers to "Target creature you control" earlier in the same sentence.
  - **Suggested fix:** verify `effect.sacrifice_creature` anchors on `sacrifice (it|that creature|the creature)` not just `sacrifice a creature`. Pronoun back-reference is the failure mode.

- **missing**: no `condition.cares_creatures_died_this_turn` (morbid scaling) tag exists
  - **What's wrong:** "For each creature that died under your control this turn" is a discrete scaling pattern (morbid, the Aftermath dies-count, Mortician Beetle, Grim Lavamancer). No catalog coverage. Distinct from `trigger.creature_dies` (which triggers on the death) and `condition.cares_graveyard` (which counts graveyard contents).
  - **Evidence vs reality:** literal "for each creature that died under your control this turn".
  - **Suggested fix:** coverage gap — author `condition.cares_creatures_died_this_turn`. Anchors on `creatures? (that |you control )?died (under your control )?this turn`, `for each creature that died`. Pairs with `effect.sacrifice_creature`, `effect.create_creature_token` sac-fodder, aristocrats strategies.

---

## Candy Trail  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Artifact — Food Clue
**Mana cost:** {1}

**Oracle text:**

```
When this artifact enters, scry 2.
{2}, {T}, Sacrifice this artifact: You gain 3 life and draw a card.
```

**Current tags:** `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.life_changed`, `effect.sacrifice_artifact`, `effect.scry`, `trigger.self_etb`

### Issues

- **missing**: `effect.life_changed`
  - **What's wrong:** "You gain 3 life" is the canonical life-gain phrase. Rule didn't fire.
  - **Evidence vs reality:** literal "You gain 3 life".
  - **Suggested fix:** verify `effect.life_changed` regex anchors on `you gain \d+ life`. Likely a simple anchor miss. Pairs the card with `cares_lifegain` payoffs.

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** "draw a card" on a sac-outlet artifact, but the rule doesn't fire. Same shape as Bitter Chill miss (logged separately) — `draws_or_discards` is missing simple "draw a card" matches.
  - **Evidence vs reality:** literal "and draw a card".
  - **Suggested fix:** verify `effect.draws_or_discards` regex matches `draw a card` (singular, not requiring digit). This is now a confirmed recurring pattern — log under the rule, not per card.

- **note** (no missing tag, but worth flagging): the card has both Food and Clue subtypes but the catalog has only `effect.create_food` / `effect.create_clue` (creation axis), not "is food" / "is clue" condition tags. Food/Clue subtypes are common in Standard (Eldraine ELD/WOE, MKM) — small coverage gap if grouping cards by Food/Clue archetype matters.

---

## Cooped Up  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Enchantment — Aura
**Mana cost:** {1}{W}

**Oracle text:**

```
Enchant creature
Enchanted creature can't attack or block.
{2}{W}: Exile enchanted creature.
```

**Current tags:** `effect.exile_creature`, `effect.has_activated_ability`, `effect.pacify`

### Issues

- **missing**: `effect.exile_creature`
  - **What's wrong:** "{2}{W}: Exile enchanted creature" — a textbook activated exile-removal effect, but the rule didn't fire. Probable cause: rule anchors on `exile target creature` and misses Aura-frame `exile enchanted creature`.
  - **Evidence vs reality:** literal "Exile enchanted creature".
  - **Suggested fix:** broaden `effect.exile_creature` to match `exile (enchanted|equipped) creature` (and similar attached-creature framings on Auras/Equipment). Same broadening for `destroy_creature` if it has the same anchor.

- **missing**: no `effect.cant_attack_or_block` / `effect.pacify` / `effect.lockdown` tag exists
  - **What's wrong:** "Enchanted creature can't attack or block" is the Pacifism family (Cooped Up, Pacifism, Arrest, Imprisoned in the Moon-ish effects). Distinct from `effect.tap` (one-shot) and `effect.bounce_creature` (returns). Currently zero catalog coverage despite being one of W/U's primary removal-replacement mechanics.
  - **Evidence vs reality:** literal "Enchanted creature can't attack or block".
  - **Suggested fix:** coverage gap — author `effect.pacify` (or `effect.cant_attack_or_block`). Anchors on `can't attack( or block)?`, `enchanted creature can't (attack|block|cast|use)`. Pair with `condition.cares_subtype.aura` and white control archetypes.

- **note**: card got ZERO tags. Even the activated-ability indicator and Aura subtype-line didn't produce a `has_activated_ability` tag (rule is creature-scoped, intentional). A vanilla-tagged Aura should still get `condition.cares_subtype.aura` only if it self-references "Aura" — Cooped Up does not, so the absence is consistent with the prior Bitter Chill discussion (where self-reference was flagged as a borderline FP). Worth confirming this is the intended behavior: zero-tag Auras hurt graph connectivity.

---

## Devouring Sugarmaw // Have for Dinner  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- FP bullet(s) resolved in v0.12.8; missing bullets remain for Phase 3+ -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Horror // Instant — Adventure
**Mana cost:** {2}{B}{B} // {1}{W}

**Oracle text:**

```
Menace, trample
At the beginning of your upkeep, you may sacrifice an artifact, enchantment, or token. If you don't, tap this creature.

Create a 1/1 white Human creature token and a Food token. (Then exile this card. You may cast the creature later from exile.)
```

**Current tags:** `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.create_creature_token`, `effect.create_food`, `effect.create_token`, `effect.has_evasion_intrinsic`, `effect.has_trample`, `effect.sacrifice_artifact`, `effect.sacrifice_enchantment`

### Issues

- **missing**: `effect.sacrifice_enchantment`
  - **What's wrong:** "you may sacrifice an artifact, enchantment, or token" — `sacrifice_artifact` fired but `sacrifice_enchantment` did not. The rule description explicitly says it "Includes broad 'sacrifice a permanent' phrasing" and "an enchantment" in a multi-type sac list, but the rule may anchor on `sacrifice (a |an )?enchantment` specifically and miss the "or enchantment" middle position.
  - **Evidence vs reality:** literal "sacrifice an artifact, enchantment, or token".
  - **Suggested fix:** verify `sacrifice_enchantment` anchor accepts comma-separated multi-type lists (`sacrifice .*,? enchantment,? .*`). Same pattern for the artifact-listed-with-enchantment-or-token Bargain phrasing.

---

## Frantic Firebolt  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Instant
**Mana cost:** {2}{R}

**Oracle text:**

```
Frantic Firebolt deals X damage to target creature, where X is 2 plus the number of cards in your graveyard that are instant cards, sorcery cards, and/or have an Adventure.
```

**Current tags:** `condition.adventure_matters`, `condition.cares_graveyard`, `condition.cares_instant_sorcery_in_graveyard`, `effect.cast_noncreature_spell`, `effect.deals_damage`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `condition.cares_instant_sorcery_in_graveyard`
  - **What's wrong:** X scales with "instant cards, sorcery cards" in graveyard — exact "Izzet spells-matter engine" axis the tag describes. Only the broader `cares_graveyard` fired; the more specific tag (which drives Izzet graph edges) is absent.
  - **Evidence vs reality:** literal "number of cards in your graveyard that are instant cards, sorcery cards".
  - **Suggested fix:** broaden `condition.cares_instant_sorcery_in_graveyard` anchor to match `(instant|sorcery) (card)?s? in (your |a )?graveyard` and the equivalent count-form `cards in (your )?graveyard that are instant`.

---

## Freeze in Place  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Sorcery
**Mana cost:** {1}{U}

**Oracle text:**

```
Tap target creature an opponent controls and put three stun counters on it. Scry 2. (If a permanent with a stun counter would become untapped, remove one from it instead.)
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.counter_modified`, `effect.is_instant_or_sorcery`, `effect.scry`, `effect.tap`

### Issues

- **missing**: `effect.counter_modified`
  - **What's wrong:** "put three stun counters on it" places counters but `counter_modified` (the generic "places or removes counters" tag) didn't fire. Stun counters are a non-+1/+1 counter type the rule likely doesn't recognize.
  - **Evidence vs reality:** literal "put three stun counters on it".
  - **Suggested fix:** broaden `effect.counter_modified` anchor to recognize non-+1/+1 named counter types (`(stun|loyalty|charge|time|...) counter(s)?`) — or generalize to `put .* counter(s)? on`.

---

## Frolicking Familiar // Blow Off Steam  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Otter Wizard // Instant — Adventure
**Mana cost:** {2}{U} // {R}

**Oracle text:**

```
Flying
Whenever you cast an instant or sorcery spell, this creature gets +1/+1 until end of turn.

Blow Off Steam deals 1 damage to any target. (Then exile this card. You may cast the creature later from exile.)
```

**Current tags:** `condition.cares_noncreature_spell`, `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.deals_damage`, `effect.grants_stat_buff`, `effect.has_evasion_intrinsic`, `trigger.spell_cast`

### Issues

- **missing**: `effect.deals_damage`
  - **What's wrong:** Adventure face "Blow Off Steam deals 1 damage to any target" is a direct-damage burn effect. Tag didn't fire, likely because the rule anchors on `__SELF__ deals X damage` and the Adventure face uses the named-spell form "Blow Off Steam deals…" rather than the `~` self-reference (only the creature face becomes `__SELF__`).
  - **Evidence vs reality:** literal "Blow Off Steam deals 1 damage to any target" on the Adventure face.
  - **Suggested fix:** broaden `effect.deals_damage` to recognize multi-face cards where one face's card name (not `__SELF__`) is the damage source, or pre-normalize all face names to `__SELF__` before tagging.

---

## Gadwick's First Duel  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Enchantment — Saga
**Mana cost:** {1}{U}

**Oracle text:**

```
(As this Saga enters and after your draw step, add a lore counter. Sacrifice after III.)
I — Create a Cursed Role token attached to up to one target creature. (If you control another Role on it, put that one into the graveyard. Enchanted creature is 1/1.)
II — Scry 2.
III — When you next cast an instant or sorcery spell with mana value 3 or less this turn, copy that spell. You may choose new targets for the copy.
```

**Current tags:** `condition.cares_low_mana_value`, `condition.cares_noncreature_spell`, `effect.copy_spell`, `effect.create_role`, `effect.create_token`, `effect.scry`

### Issues

- **missing**: `condition.cares_noncreature_spell`
  - **What's wrong:** Saga III triggers "When you next cast an instant or sorcery spell" — this is the canonical noncreature-spell payoff phrasing, but the condition didn't fire. Probably because the rule anchors on `whenever you cast` and misses `when you next cast`.
  - **Evidence vs reality:** literal "When you next cast an instant or sorcery spell".
  - **Suggested fix:** broaden `condition.cares_noncreature_spell` anchor to include `when (you next|the next time you) cast (an? )?(instant|sorcery)` — the "next-spell" framing is common on copy/buff payoffs.

---

## Galvanic Giant // Storm Reading  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Giant Wizard // Instant — Adventure
**Mana cost:** {3}{U} // {5}{U}{U}

**Oracle text:**

```
Whenever you cast a spell with mana value 5 or greater, tap target creature an opponent controls and put a stun counter on it.

Draw four cards, then discard two cards. (Then exile this card. You may cast the creature later from exile.)
```

**Current tags:** `condition.cares_high_mana_value`, `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.counter_modified`, `effect.draws_or_discards`, `effect.tap`, `trigger.spell_cast`

### Issues

- **missing**: `effect.counter_modified`
  - **What's wrong:** Same stun-counter blind spot as Freeze in Place. "put a stun counter on it" should match the generic counter_modified tag.
  - **Evidence vs reality:** literal "put a stun counter on it".
  - **Suggested fix:** see Freeze in Place — broaden `effect.counter_modified` to recognize named non-+1/+1 counter types.

---

## Gnawing Crescendo  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Instant
**Mana cost:** {2}{R}

**Oracle text:**

```
Creatures you control get +2/+0 until end of turn. Whenever a nontoken creature you control dies this turn, create a 1/1 black Rat creature token with "This token can't block."
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_stat_buff`, `effect.is_instant_or_sorcery`, `trigger.creature_dies`

### Issues

- **missing**: `trigger.creature_dies`
  - **What's wrong:** Spell creates a delayed creature-dies trigger ("Whenever a nontoken creature you control dies this turn, create…"). Tag describes "has an ability that triggers when a creature dies" — the spell HAS such an ability for the turn. Probable cause: rule scoped to permanents and skips instants/sorceries.
  - **Evidence vs reality:** literal "Whenever a nontoken creature you control dies this turn".
  - **Suggested fix:** broaden `trigger.creature_dies` to also tag instants/sorceries with delayed `whenever .* (creature|nontoken creature) .* dies (this turn)?` triggers. Same pattern likely applies to other `trigger.*` rules vs. instant/sorcery-based delayed triggers.

---

## Greta, Sweettooth Scourge  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Legendary Creature — Human Warrior
**Mana cost:** {1}{B}{G}

**Oracle text:**

```
When Greta enters, create a Food token. (It's an artifact with "{2}, {T}, Sacrifice this token: You gain 3 life.")
{G}, Sacrifice a Food: Put a +1/+1 counter on target creature. Activate only as a sorcery.
{1}{B}, Sacrifice a Food: You draw a card and you lose 1 life.
```

**Current tags:** `effect.counter_modified`, `effect.create_food`, `effect.create_token`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.life_changed`, `effect.plus_one_counter`, `effect.sacrifice_artifact`, `trigger.self_etb`

### Issues

- **missing**: `trigger.self_etb`
  - **What's wrong:** "When Greta enters, create a Food token" — textbook self-ETB trigger. After name normalization "Greta" becomes `__SELF__`, so the rule should fire. Probable cause: the rule expects "this creature enters" / "when __SELF__ enters" and misses the bare `when __SELF__ enters,` (no "creature"/"this" before).
  - **Evidence vs reality:** literal "When Greta enters," → normalized "when __SELF__ enters,".
  - **Suggested fix:** broaden `trigger.self_etb` anchor to allow `when __SELF__ enters` with no preceding "this (creature|artifact|enchantment|…)" qualifier.

- **missing**: `effect.sacrifice_artifact`
  - **What's wrong:** "Sacrifice a Food" twice in costs. Food is an artifact subtype, so sacrificing a Food IS sacrificing an artifact. Tag description explicitly covers "sacrifice a permanent" broad phrasing but apparently not subtype-named sacrifice. Same axis miss likely affects Treasure/Clue sacrifice.
  - **Evidence vs reality:** literal "Sacrifice a Food" (×2).
  - **Suggested fix:** broaden `effect.sacrifice_artifact` to recognize artifact-subtype sacrifice (`sacrifice an? (food|treasure|clue|equipment|vehicle|blood|map|powerstone)`). Parametric extension also useful for `effect.sacrifice_enchantment` (Aura, Saga, Class, Curse, Role) and `effect.sacrifice_creature` (tribal-named token sacrifices).

---

## Gruff Triplets  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Satyr Warrior
**Mana cost:** {3}{G}{G}{G}

**Oracle text:**

```
Trample
When this creature enters, if it isn't a token, create two tokens that are copies of it.
When this creature dies, put a number of +1/+1 counters equal to its power on each creature you control named Gruff Triplets.
```

**Current tags:** `effect.copy_permanent`, `effect.counter_modified`, `effect.create_creature_token`, `effect.create_token`, `effect.has_trample`, `effect.plus_one_counter`, `trigger.creature_dies`, `trigger.self_etb`

### Issues

- **missing**: `effect.create_creature_token`
  - **What's wrong:** "create two tokens that are copies of it" — copies of a creature are creature tokens. The `create_creature_token` tag should fire; only the generic `create_token` did.
  - **Evidence vs reality:** literal "create two tokens that are copies of it" where the copy source is a creature (`__SELF__`).
  - **Suggested fix:** broaden `effect.create_creature_token` to recognize copy-token framings where the source is implicitly a creature (`create .* token(s)? that (is|are) (a )?cop(y|ies) of (it|this creature|__SELF__|target creature)`).

- **missing**: `effect.plus_one_counter`
  - **What's wrong:** "put a number of +1/+1 counters equal to its power on each creature you control" — this is a +1/+1 counter effect. Tag description: "Puts +1/+1 counters on creatures (direct, ETB-with, blink-with, or doubling)." Probably missed because rule anchors on fixed-count phrasings (`put a +1/+1 counter`, `put X +1/+1 counters`) and misses "a number of … equal to" framings.
  - **Evidence vs reality:** literal "put a number of +1/+1 counters equal to its power on each creature you control".
  - **Suggested fix:** broaden `effect.plus_one_counter` to match `put (a number of |X )?(\\+1/\\+1 )?counter(s)? .* on (each|target|every) creature`.

- **missing**: `effect.counter_modified`
  - **What's wrong:** Generic counter-modification tag should also fire for the +1/+1 placement above. Same root cause as plus_one_counter — anchor doesn't catch "a number of … equal to" framing.
  - **Evidence vs reality:** same as plus_one_counter.
  - **Suggested fix:** same as plus_one_counter.

---

## Gumdrop Poisoner // Tempt with Treats  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Human Warlock // Instant — Adventure
**Mana cost:** {2}{B} // {B}

**Oracle text:**

```
Lifelink
When this creature enters, up to one target creature gets -X/-X until end of turn, where X is the amount of life you gained this turn.

Create a Food token. (Then exile this card. You may cast the creature later from exile.)
```

**Current tags:** `condition.cares_lifegain`, `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.create_food`, `effect.create_token`, `effect.debuff_minus_n`, `effect.has_lifelink`, `trigger.self_etb`

### Issues

- **missing**: `condition.cares_lifegain`
  - **What's wrong:** "where X is the amount of life you gained this turn" — X scales on life gained this turn, the canonical "cares about lifegain" condition. Tag description: "Triggers or scales off life being gained." Didn't fire.
  - **Evidence vs reality:** literal "where X is the amount of life you gained this turn".
  - **Suggested fix:** broaden `condition.cares_lifegain` to match `life you gained this turn`, `amount of life (you|each player) gained`, and the X-scaling form.

---

## Hearth Elemental // Stoke Genius  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Elemental // Sorcery — Adventure
**Mana cost:** {5}{R} // {1}{R}

**Oracle text:**

```
This spell costs {X} less to cast, where X is the number of cards in your graveyard that are instant cards, sorcery cards, and/or have an Adventure.

Discard your hand, then draw two cards. (Then exile this card. You may cast the creature later from exile.)
```

**Current tags:** `condition.adventure_matters`, `condition.cares_graveyard`, `condition.cares_instant_sorcery_in_graveyard`, `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.cost_reduction`, `effect.draws_or_discards`

### Issues

- **missing**: `condition.cares_instant_sorcery_in_graveyard`
  - **What's wrong:** Same as Frantic Firebolt — graveyard count scales on instant/sorcery cards specifically. The "Izzet spells-matter" engine condition didn't fire.
  - **Evidence vs reality:** literal "number of cards in your graveyard that are instant cards, sorcery cards".
  - **Suggested fix:** see Frantic Firebolt.

---

## Hollow Scavenger // Bakery Raid  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Wolf // Sorcery — Adventure
**Mana cost:** {2}{G} // {G}

**Oracle text:**

```
{1}, Sacrifice a Food: This creature gets +2/+2 until end of turn. Activate only once each turn.

Create a Food token. (Then exile this card. You may cast the creature later from exile.)
```

**Current tags:** `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.create_food`, `effect.create_token`, `effect.grants_stat_buff`, `effect.has_activated_ability`, `effect.sacrifice_artifact`

### Issues

- **missing**: `effect.sacrifice_artifact`
  - **What's wrong:** Same "sacrifice a Food = sacrifice an artifact" miss as Greta. Food is an artifact subtype.
  - **Evidence vs reality:** literal "Sacrifice a Food".
  - **Suggested fix:** see Greta — parametric extension to recognize artifact-subtype sacrifice.

---

## Hopeful Vigil  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Enchantment
**Mana cost:** {1}{W}

**Oracle text:**

```
When this enchantment enters, create a 2/2 white Knight creature token with vigilance.
When this enchantment is put into a graveyard from the battlefield, scry 2.
{2}{W}: Sacrifice this enchantment.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.grants_vigilance`, `effect.has_activated_ability`, `effect.sacrifice_enchantment`, `effect.scry`, `trigger.enchantment_leaves_battlefield`, `trigger.self_etb`

### Issues

- **missing**: `effect.has_activated_ability`
  - **What's wrong:** Recurring pattern — `has_activated_ability` is creature-scoped and misses mana-cost activations on non-creature permanents. "{2}{W}: Sacrifice this enchantment" is a textbook activated ability on an enchantment.
  - **Evidence vs reality:** literal "{2}{W}: Sacrifice this enchantment."
  - **Suggested fix:** broaden `effect.has_activated_ability` to fire on any non-land permanent with a `cost: effect` line (currently scoped to creatures per known recurring pattern).

---

## Hopeless Nightmare  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Enchantment
**Mana cost:** {B}

**Oracle text:**

```
When this enchantment enters, each opponent discards a card and loses 2 life.
When this enchantment is put into a graveyard from the battlefield, scry 2.
{2}{B}: Sacrifice this enchantment.
```

**Current tags:** `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.life_changed`, `effect.sacrifice_enchantment`, `effect.scry`, `effect.targeted_discard`, `trigger.enchantment_leaves_battlefield`, `trigger.self_etb`

### Issues

- **missing**: `effect.has_activated_ability`
  - **What's wrong:** Same recurring pattern as Hopeful Vigil — `has_activated_ability` is creature-scoped and misses mana-cost activations on non-creature permanents. "{2}{B}: Sacrifice this enchantment" is a textbook activated ability on an enchantment.
  - **Evidence vs reality:** literal "{2}{B}: Sacrifice this enchantment."
  - **Suggested fix:** see Hopeful Vigil — broaden `effect.has_activated_ability` to any non-land permanent.

---

## Howling Galefang  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Beast
**Mana cost:** {2}{G}{G}

**Oracle text:**

```
Vigilance
This creature has haste as long as you own a card in exile that has an Adventure.
```

**Current tags:** `condition.adventure_matters`, `effect.grants_haste`, `effect.has_vigilance`

### Issues

- **missing**: `effect.has_vigilance`
  - **What's wrong:** Printed Vigilance keyword (in `keywords: ["Vigilance"]`) didn't tag. Standard `has_<keyword>` miss.
  - **Evidence vs reality:** literal "Vigilance" on its own line in oracle text and listed in keywords.
  - **Suggested fix:** verify `effect.has_vigilance` regex anchors on a standalone keyword line, not on grant clauses. (May be the recurring "keyword-grants leaking" rule with the opposite bug — failing to fire on intrinsic.)

---

## Hylda of the Icy Crown  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- FP bullet(s) resolved in v0.12.8; missing bullets remain for Phase 3+ -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Legendary Creature — Human Warlock
**Mana cost:** {2}{W}{U}

**Oracle text:**

```
Whenever you tap an untapped creature an opponent controls, you may pay {1}. When you do, choose one —
• Create a 4/4 white and blue Elemental creature token.
• Put a +1/+1 counter on each creature you control.
• Scry 2, then draw a card.
```

**Current tags:** `effect.counter_modified`, `effect.create_creature_token`, `effect.create_token`, `effect.draws_or_discards`, `effect.plus_one_counter`, `effect.scry`, `trigger.tapped_or_untapped`

### Issues

- **missing**: `trigger.tapped_or_untapped`
  - **What's wrong:** "Whenever you tap an untapped creature an opponent controls" is the canonical Hylda/melee-trigger form. The catalog tag exists and describes exactly this event.
  - **Evidence vs reality:** literal "whenever you tap an untapped creature an opponent controls".
  - **Suggested fix:** ensure `trigger.tapped_or_untapped` matches `whenever you tap` (active-voice "you tap"), not just `becomes tapped` (passive-voice).

---

## Icewrought Sentry  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Elemental Soldier
**Mana cost:** {2}{U}

**Oracle text:**

```
Vigilance
Whenever this creature attacks, you may pay {1}{U}. When you do, tap target creature an opponent controls.
Whenever you tap an untapped creature an opponent controls, this creature gets +2/+1 until end of turn.
```

**Current tags:** `effect.grants_stat_buff`, `effect.has_vigilance`, `effect.tap`, `trigger.attack_or_block`, `trigger.tapped_or_untapped`

### Issues

- **missing**: `effect.has_vigilance`
  - **What's wrong:** Printed Vigilance keyword (in `keywords: ["Vigilance"]`) didn't tag. Same miss as Howling Galefang.
  - **Evidence vs reality:** literal "Vigilance" on first line of oracle text.
  - **Suggested fix:** see Howling Galefang — same `has_vigilance` regex issue.

- **missing**: `trigger.tapped_or_untapped`
  - **What's wrong:** "Whenever you tap an untapped creature an opponent controls" — same Hylda-shaped trigger phrasing.
  - **Evidence vs reality:** literal "whenever you tap an untapped creature an opponent controls".
  - **Suggested fix:** see Hylda of the Icy Crown.

---

## Imodane, the Pyrohammer  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Legendary Creature — Human Knight
**Mana cost:** {2}{R}{R}

**Oracle text:**

```
Whenever an instant or sorcery spell you control that targets only a single creature deals damage to that creature, Imodane deals that much damage to each opponent.
```

**Current tags:** `condition.cares_noncreature_spell`, `effect.deals_damage`, `trigger.damage_dealt`

### Issues

- **missing**: `effect.deals_damage`
  - **What's wrong:** Imodane literally deals damage to each opponent as the consequence of the trigger. The rule fired on the trigger clause but not on the effect clause.
  - **Evidence vs reality:** literal "__SELF__ deals that much damage to each opponent".
  - **Suggested fix:** ensure `effect.deals_damage` matches `__self__ deals .* damage to (each opponent|target ...)` even when the damage amount is variable ("that much damage").

- **missing**: `condition.cares_noncreature_spell`
  - **What's wrong:** The trigger explicitly gates on an instant or sorcery spell — a spells-matter payoff. Per recurring pattern in skill notes ("`condition.cares_noncreature_spell` misses ordinal/per-turn qualifiers"), this card's "whenever an instant or sorcery spell you control ... deals damage" framing isn't matching either.
  - **Evidence vs reality:** literal "whenever an instant or sorcery spell you control that targets only a single creature deals damage".
  - **Suggested fix:** broaden `condition.cares_noncreature_spell` to match `whenever an? (instant or sorcery|noncreature) spell you control` patterns regardless of the post-clause (deals damage / resolves / etc.).

---

## Ingenious Prodigy  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Human Wizard
**Mana cost:** {X}{U}

**Oracle text:**

```
Skulk (This creature can't be blocked by creatures with greater power.)
This creature enters with X +1/+1 counters on it.
At the beginning of your upkeep, if this creature has one or more +1/+1 counters on it, you may remove a +1/+1 counter from it. If you do, draw a card.
```

**Current tags:** `condition.cares_plus_one_counter`, `condition.has_x_in_cost`, `effect.counter_modified`, `effect.draws_or_discards`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.plus_one_counter`
  - **What's wrong:** "This creature enters with X +1/+1 counters on it" is the canonical ETB-with-counters phrasing. The tagDef description explicitly includes "ETB-with" as one of the matched shapes.
  - **Evidence vs reality:** literal "This creature enters with X +1/+1 counters on it".
  - **Suggested fix:** verify `effect.plus_one_counter` covers the `enters with (X|N|a) \+1/\+1 counter` phrasing — likely missing the X-variable case.

---

## Johann's Stopgap  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->
<!-- v0.12.9 false-alarm audit: the `effect.bounce_or_blink` bullet was reviewed and ruled mis-categorized. The `effect.bounce_or_blink` rule intentionally EXCLUDES typed-permanent bounces ("nonland permanent") because the typed children (`bounce_creature`, `bounce_artifact`, `bounce_enchantment`, `bounce_planeswalker`) already fire individually on a nonland-permanent bounce. The umbrella tag is reserved for true-untyped bounces ("target permanent", "all permanents"). The bullet conflicted with the deliberate child/parent split. -->

**Type:** Sorcery
**Mana cost:** {3}{U}

**Oracle text:**

```
Bargain (You may sacrifice an artifact, enchantment, or token as you cast this spell.)
This spell costs {2} less to cast if it's bargained.
Return target nonland permanent to its owner's hand. Draw a card.
```

**Current tags:** `condition.bargain`, `effect.bounce_artifact`, `effect.bounce_creature`, `effect.bounce_enchantment`, `effect.bounce_planeswalker`, `effect.cast_noncreature_spell`, `effect.cost_reduction`, `effect.draws_or_discards`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.bounce_or_blink`
  - **What's wrong:** "Return target nonland permanent to its owner's hand" is the textbook untyped-bounce phrasing — exactly what the `effect.bounce_or_blink` tagDef description names ("Returns a permanent to hand without type restriction"). The four typed bounces all fired but the umbrella didn't.
  - **Evidence vs reality:** literal "Return target nonland permanent to its owner's hand".
  - **Suggested fix:** verify `effect.bounce_or_blink` rule actually matches `return target (?:nonland )?permanent to .* hand`. Currently it seems scoped to a narrower phrasing.

---

## Kellan's Lightblades  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Instant
**Mana cost:** {1}{W}

**Oracle text:**

```
Bargain (You may sacrifice an artifact, enchantment, or token as you cast this spell.)
Kellan's Lightblades deals 3 damage to target attacking or blocking creature. If this spell was bargained, destroy that creature instead.
```

**Current tags:** `condition.bargain`, `effect.cast_noncreature_spell`, `effect.deals_damage`, `effect.destroy_creature`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.destroy_creature`
  - **What's wrong:** "destroy that creature instead" is a clean conditional destroy. The conditional ("if this spell was bargained") shouldn't suppress the tag — the effect is still in the card's capability surface.
  - **Evidence vs reality:** literal "destroy that creature instead".
  - **Suggested fix:** verify `effect.destroy_creature` matches `destroy (that|target) creature` even under an `if ... instead` conditional frame.

---

## Leaping Ambush  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Instant
**Mana cost:** {G}

**Oracle text:**

```
Target creature gets +1/+3 and gains reach until end of turn. Untap it.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.grants_reach`, `effect.grants_stat_buff`, `effect.is_instant_or_sorcery`, `effect.untap`

### Issues

- **missing**: `effect.untap`
  - **What's wrong:** "Untap it" is a direct untap effect (the target creature from the prior sentence). The pronoun-target form is the miss — likely the rule requires "untap target X" with an explicit target.
  - **Evidence vs reality:** literal "Untap it." as a standalone sentence following a "target creature" reference.
  - **Suggested fix:** broaden `effect.untap` to match `untap (it|that|them)\.` when an antecedent "target" reference appears earlier in the clause.

---

## Not Dead After All  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Instant
**Mana cost:** {B}

**Oracle text:**

```
Until end of turn, target creature you control gains "When this creature dies, return it to the battlefield tapped under its owner's control, then create a Wicked Role token attached to it." (Enchanted creature gets +1/+1. When this token is put into a graveyard, each opponent loses 1 life.)
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.create_role`, `effect.create_token`, `effect.is_instant_or_sorcery`, `effect.reanimate`, `trigger.creature_dies`

### Issues

- **missing**: `effect.reanimate`
  - **What's wrong:** Card grants a self-reanimation trigger ("when this creature dies, return it to the battlefield") but reanimate tag did not fire.
  - **Evidence vs reality:** "return it to the battlefield tapped under its owner's control" matches the reanimate definition (return card to battlefield).
  - **Suggested fix:** broaden `effect.reanimate` regex to match "return it/that creature to the battlefield" inside granted-ability quotes.

---

## Picklock Prankster // Free the Fae  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Creature — Faerie Rogue // Instant — Adventure
**Mana cost:** {1}{U} // {1}{U}

**Oracle text:**

```
Flying, vigilance

Mill four cards. Then put an instant, sorcery, or Faerie card from among the milled cards into your hand.
```

**Current tags:** `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.has_evasion_intrinsic`, `effect.has_vigilance`, `effect.mill`

### Issues

- **missing**: `effect.has_vigilance`
  - **What's wrong:** Creature has vigilance on its keyword line but the intrinsic tag did not fire.
  - **Evidence vs reality:** keyword line is "Flying, vigilance" — `has_evasion_intrinsic` correctly caught flying, but vigilance was dropped.
  - **Suggested fix:** verify `effect.has_vigilance` regex matches comma-joined keyword lines ("flying, vigilance").

---

## Abuelo's Awakening  <!-- audited 2026-05-25, ruleVersion v0.12.6 -->
<!-- FP bullet(s) resolved in v0.12.8; missing bullets remain for Phase 3+ -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Sorcery
**Mana cost:** {X}{3}{W}

**Oracle text:**

```
Return target artifact or non-Aura enchantment card from your graveyard to the battlefield with X additional +1/+1 counters on it. It's a 1/1 Spirit creature with flying in addition to its other types.
```

**Current tags:** `condition.has_x_in_cost`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.plus_one_counter`, `effect.reanimate`

### Issues

- **missing**: `effect.plus_one_counter`
  - **What's wrong:** "with X additional +1/+1 counters on it" puts +1/+1 counters on the reanimated permanent (which becomes a creature). Should fire.
  - **Evidence vs reality:** the "ETB with N +1/+1 counters" frame on a reanimation effect isn't recognized.
  - **Suggested fix:** broaden plus_one_counter to recognize "Return ... with N additional +1/+1 counters on it" (reanimation-with-counters frame).

---

## Aclazotz, Deepest Betrayal // Temple of the Dead  <!-- audited 2026-05-25, ruleVersion v0.12.6 -->
<!-- FP bullet(s) resolved in v0.12.8; missing bullets remain for Phase 3+ -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Legendary Creature — Bat God // Land
**Mana cost:** (none)

**Oracle text:**

```
Flying, lifelink
Whenever Aclazotz attacks, each opponent discards a card. For each opponent who can't, you draw a card.
Whenever an opponent discards a land card, create a 1/1 black Bat creature token with flying.
When Aclazotz dies, return it to the battlefield tapped and transformed under its owner's control.

(Transforms from Aclazotz, Deepest Betrayal.)
{T}: Add {B}.
{2}{B}, {T}: Transform this land. Activate only if a player has one or fewer cards in hand and only as a sorcery.
```

**Current tags:** `effect.add_mana`, `effect.create_creature_token`, `effect.create_token`, `effect.draws_or_discards`, `effect.grants_evasion`, `effect.has_activated_ability`, `effect.has_evasion_intrinsic`, `effect.has_lifelink`, `effect.reanimate`, `effect.targeted_discard`, `trigger.attack_or_block`, `trigger.card_drawn_discarded`, `trigger.creature_dies`

### Issues

- **missing**: `trigger.card_drawn_discarded`
  - **What's wrong:** "Whenever an opponent discards a land card, create ..." is a discard-trigger but the discard/draw trigger tag didn't fire.
  - **Evidence vs reality:** the second ability literally starts with "Whenever an opponent discards a land card". The discard-trigger regex likely requires "you discard" or "a player discards" without the typed-card qualifier.
  - **Suggested fix:** broaden trigger.card_drawn_discarded to recognize "Whenever (an opponent|a player|you) discards a <type> card".

---

## Acrobatic Leap  <!-- audited 2026-05-25, ruleVersion v0.12.6 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Instant
**Mana cost:** {W}

**Oracle text:**

```
Target creature gets +1/+3 and gains flying until end of turn. Untap it.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.grants_evasion`, `effect.grants_stat_buff`, `effect.is_instant_or_sorcery`, `effect.untap`

### Issues

- **missing**: `effect.untap`
  - **What's wrong:** "Untap it." is a direct untap effect but the tag didn't fire.
  - **Evidence vs reality:** literal text is "Untap it." — the pronoun-referent form. Likely the untap regex requires "untap target X" with an explicit object.
  - **Suggested fix:** broaden effect.untap to also match pronoun-form "Untap it." / "Untap them." when a prior sentence in the same effect established a creature target.

---

## Adaptive Gemguard  <!-- audited 2026-05-25, ruleVersion v0.12.6 -->
<!-- FP bullet(s) resolved in v0.12.8; missing bullets remain for Phase 3+ -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Artifact Creature — Gnome
**Mana cost:** {3}{W}

**Oracle text:**

```
Tap two untapped artifacts and/or creatures you control: Put a +1/+1 counter on this creature. Activate only as a sorcery.
```

**Current tags:** `effect.counter_modified`, `effect.has_activated_ability`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.has_activated_ability`
  - **What's wrong:** The card has a clear activated ability ("Tap two...: Put a +1/+1 counter on this creature.") but `effect.has_activated_ability` did not fire.
  - **Evidence vs reality:** the activation cost is non-mana (no `{X}` symbol, no `{T}` symbol — just "Tap two untapped artifacts and/or creatures"). The tag regex likely keys on `{T}:` or `{cost}:` symbols and misses the spelled-out tap-multiple cost.
  - **Suggested fix:** broaden effect.has_activated_ability to recognize spelled-out non-symbol activation costs ("Tap N untapped X: ...", "Sacrifice X: ...", "Discard a card: ...").

---

## Akal Pakal, First Among Equals  <!-- audited 2026-05-25, ruleVersion v0.12.6 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Legendary Creature — Human Advisor
**Mana cost:** {2}{U}

**Oracle text:**

```
At the beginning of each player's end step, if an artifact entered the battlefield under your control this turn, look at the top two cards of your library. Put one of them into your hand and the other into your graveyard.
```

**Current tags:** `condition.cares_artifacts`, `effect.look_at_top_n`, `trigger.beginning_of_end_step`

### Issues

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** Trigger gates on "if an artifact entered the battlefield under your control this turn" — textbook cares_artifacts payoff condition (the central reason to play this card in an artifact deck).
  - **Evidence vs reality:** the rule likely keys on "artifact you control" / "an artifact entered" — the latter phrasing may be missing.
  - **Suggested fix:** broaden cares_artifacts regex to also catch "if an artifact entered the battlefield under your control" / "an artifact ETB'd this turn".

---

## Anim Pakal, Thousandth Moon  <!-- audited 2026-05-25, ruleVersion v0.12.6 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Legendary Creature — Human Soldier
**Mana cost:** {1}{R}{W}

**Oracle text:**

```
Whenever you attack with one or more non-Gnome creatures, put a +1/+1 counter on Anim Pakal, then create X 1/1 colorless Gnome artifact creature tokens that are tapped and attacking, where X is the number of +1/+1 counters on Anim Pakal.
```

**Current tags:** `condition.cares_plus_one_counter`, `effect.counter_modified`, `effect.create_creature_token`, `effect.create_token`, `effect.plus_one_counter`, `trigger.attack_or_block`

### Issues

- **missing**: `condition.cares_plus_one_counter`
  - **What's wrong:** Token count scales off "the number of +1/+1 counters on Anim Pakal" — a textbook cares_plus_one_counter scaling payoff.
  - **Evidence vs reality:** rule likely matches "has a +1/+1 counter on it" rather than "the number of +1/+1 counters on X" (the counting / X-scaling form).
  - **Suggested fix:** broaden cares_plus_one_counter to also recognize "X is the number of +1/+1 counters on [permanent]" / "equal to the number of +1/+1 counters on ..."

---

## Bartolomé del Presidio  <!-- audited 2026-05-25, ruleVersion v0.12.6 -->
<!-- Resolved in RULE_VERSION v0.12.9: rule broadenings — see commit log for the specific rule changes. -->

**Type:** Legendary Creature — Vampire Knight
**Mana cost:** {W}{B}

**Oracle text:**

```
Sacrifice another creature or artifact: Put a +1/+1 counter on Bartolomé del Presidio.
```

**Current tags:** `effect.counter_modified`, `effect.has_activated_ability`, `effect.plus_one_counter`, `effect.sacrifice_artifact`, `effect.sacrifice_creature`

### Issues

- **missing**: `effect.has_activated_ability` (recurring — same pattern as Adaptive Gemguard)
  - **What's wrong:** "Sacrifice another creature or artifact: Put a +1/+1 counter on ..." is a clear activated ability (cost: effect), but no mana symbol / `{T}` is in the cost. has_activated_ability rule likely keys on `{...}:` symbol activations.
  - **Evidence vs reality:** the ability uses a spelled-out "Sacrifice ...: ..." form. No symbolic cost present.
  - **Suggested fix:** see Adaptive Gemguard entry — broaden has_activated_ability to recognize spelled-out non-symbol activation costs.

---

## Armory Mice  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.13.0: new `condition.celebration` rule anchors on the Bloomburrow ability-word marker "celebration —" and now tags this card. -->

**Type:** Creature — Mouse
**Mana cost:** {1}{W}

**Oracle text:**

```
Celebration — This creature gets +0/+2 as long as two or more nonland permanents entered the battlefield under your control this turn.
```

**Current tags:** `effect.grants_stat_buff`

### Issues

- **missing**: no `condition.celebration` / `condition.cares_etb_count_this_turn` tag exists
  - **What's wrong:** Celebration is a Bloomburrow ability word that gates effects on "two or more nonland permanents entered the battlefield under your control this turn." The catalog has no tag for it, so this whole interaction axis is invisible to the graph.
  - **Evidence vs reality:** "celebration —" prefix + the literal "permanents entered the battlefield ... this turn" condition. Pairs naturally with token-creation, land-drop, and ETB-heavy decks.
  - **Suggested fix:** coverage gap — author `condition.celebration` (anchored on the ability-word "Celebration —") and optionally a broader `condition.cares_etb_count_this_turn` for non-keyword variants. Pairs with `effect.create_token`, `effect.create_creature_token`, `trigger.another_creature_etb`.

---

## Gallant Pie-Wielder  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- bullet(s) resolved in v0.12.9 -->
<!-- Resolved in RULE_VERSION v0.13.0: new `condition.celebration` rule anchors on the Bloomburrow ability-word marker "celebration —" and now tags this card. -->

**Type:** Creature — Dwarf Knight
**Mana cost:** {2}{W}

**Oracle text:**

```
First strike
Celebration — This creature has double strike as long as two or more nonland permanents entered the battlefield under your control this turn.
```

**Current tags:** `effect.grants_double_strike`, `effect.has_first_strike`

### Issues

- **missing**: no `condition.celebration` tag exists
  - **What's wrong:** Known catalog coverage gap (ability-word triggers). Celebration is a recurring WOE-block payoff word ("two or more nonland permanents entered the battlefield under your control this turn") that gates several cards in this batch (Gallant Pie-Wielder, Goddric, Grand Ball Guest). Without the tag, these cards don't graph-connect via the shared trigger.
  - **Evidence vs reality:** literal "Celebration —" ability-word marker.
  - **Suggested fix:** coverage gap — author `condition.celebration`. Anchor on `celebration —` or the literal Celebration text "two or more nonland permanents entered the battlefield under your control this turn". Pair with `trigger.permanent_etb`-style consumers.

---

## Goddric, Cloaked Reveler  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- FP bullet(s) resolved in v0.12.8; missing bullets remain for Phase 3+ -->
<!-- bullet(s) resolved in v0.12.9 -->
<!-- Resolved in RULE_VERSION v0.13.0: new `condition.celebration` rule anchors on the Bloomburrow ability-word marker "celebration —" and now tags this card. -->

**Type:** Legendary Creature — Human Noble
**Mana cost:** {1}{R}{R}

**Oracle text:**

```
Haste
Celebration — As long as two or more nonland permanents entered the battlefield under your control this turn, Goddric is a Dragon with base power and toughness 4/4, flying, and "{R}: Dragons you control get +1/+0 until end of turn." (It loses all other creature types.)
```

**Current tags:** `condition.cares_subtype.dragon`, `effect.grants_stat_buff`, `effect.has_activated_ability`, `effect.has_haste`

### Issues

- **missing**: no `condition.celebration` tag exists
  - **What's wrong:** Same coverage gap as Gallant Pie-Wielder. Celebration ability-word has no catalog tag.
  - **Evidence vs reality:** literal "Celebration —" ability-word marker.
  - **Suggested fix:** see Gallant Pie-Wielder.

---

## Grand Ball Guest  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- bullet(s) resolved in v0.12.9 -->
<!-- Resolved in RULE_VERSION v0.13.0: new `condition.celebration` rule anchors on the Bloomburrow ability-word marker "celebration —" and now tags this card. -->

**Type:** Creature — Human Peasant
**Mana cost:** {1}{R}

**Oracle text:**

```
Celebration — This creature gets +1/+1 and has trample as long as two or more nonland permanents entered the battlefield under your control this turn.
```

**Current tags:** `effect.grants_stat_buff`, `effect.grants_trample`

### Issues

- **missing**: no `condition.celebration` tag exists
  - **What's wrong:** Same coverage gap as Gallant Pie-Wielder.
  - **Evidence vs reality:** literal "Celebration —" ability-word marker.
  - **Suggested fix:** see Gallant Pie-Wielder.

---

## A-Geological Appraiser  <!-- audited 2026-05-25, ruleVersion v0.12.6 -->
<!-- Resolved in RULE_VERSION v0.13.0: new `effect.discover` rule anchors on "discover N" (and "discovers N/X" variants) and now tags this card. New `trigger.discovered` ships alongside but only catches one card in current Standard (Curator of Sun's Creation). -->

**Type:** Creature — Human Artificer
**Mana cost:** {3}{R}{R}

**Oracle text:**

```
When Geological Appraiser enters, if you cast it, discover 3. (Exile cards from the top of your library until you exile a nonland card with mana value 3 or less. Cast it without paying its mana cost or put it into your hand. Put the rest on the bottom in a random order.)
```

**Current tags:** `trigger.self_etb`

### Issues

- **missing**: no `effect.discover` / `condition.discovered` exists
  - **What's wrong:** Discover is a full LCI mechanic (cascade-adjacent: exile until you find a nonland with mana value ≤ N, cast it free or put into hand). Multiple Standard cards use it (Geological Appraiser, Akawalli, Quintorius Kand, etc.) and the catalog has no tag for it.
  - **Evidence vs reality:** oracle text has "discover 3" as a keyword action; no tag's description references discover.
  - **Suggested fix:** add `effect.discover` (action) + likely `trigger.discovered` (payoff) — discover-matters cards exist (e.g. "whenever you discover, ...").

---

## Amalia Benavides Aguirre  <!-- audited 2026-05-25, ruleVersion v0.12.6 -->
<!-- Resolved in RULE_VERSION v0.13.0: new `effect.explore` rule anchors on the bare keyword verb "explore[s]" and now tags this card. New `trigger.explored` ships alongside, pairsWith-linked to effect.explore. -->

**Type:** Legendary Creature — Vampire Scout
**Mana cost:** {W}{B}

**Oracle text:**

```
Ward—Pay 3 life.
Whenever you gain life, Amalia Benavides Aguirre explores. Then destroy all other creatures if its power is exactly 20. (To have this creature explore, reveal the top card of your library. Put that card into your hand if it's a land. Otherwise, put a +1/+1 counter on this creature, then put the card back or put it into your graveyard.)
```

**Current tags:** `condition.cares_lifegain`, `effect.board_wipe`, `effect.destroy_creature`, `trigger.life_changed`

### Issues

- **missing**: no `effect.explore` / `trigger.explored` exists
  - **What's wrong:** Explore is a full LCI/Ixalan-era mechanic (reveal top, land → hand, else +1/+1 counter and choose to keep on top or mill). Multiple Standard cards use it as both an action and a trigger condition; the catalog has no tag for it. Amalia is the iconic combo enabler — without an `effect.explore` tag the lifegain + explore + board-wipe interaction can't be discovered through the graph.
  - **Evidence vs reality:** oracle text has "Amalia Benavides Aguirre explores" as a keyword action; no tag's description references explore.
  - **Suggested fix:** add `effect.explore` (the action) and `trigger.explored` (the payoff side: "whenever a creature you control explores"). Plenty of Standard cards in LCI/OTJ/etc.

---

## Bat Colony  <!-- audited 2026-05-25, ruleVersion v0.12.6 -->
<!-- Resolved in RULE_VERSION v0.13.0: Cave added to THEME_SUBTYPES (parametric `condition.cares_subtype.cave` auto-generated, Option A — Cave's framings parallel creature subtypes); `condition.cares_lands` broadened to recognize land-subtype-control phrasings ("a <subtype> you control", "for each <subtype>", "number of <subtype>") for the basics plus Cave/Desert/Gate/Town/Planet. -->

**Type:** Enchantment
**Mana cost:** {2}{W}

**Oracle text:**

```
When this enchantment enters, create a 1/1 black Bat creature token with flying for each mana from a Cave spent to cast it.
Whenever a Cave you control enters, put a +1/+1 counter on target creature you control.
```

**Current tags:** `effect.counter_modified`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_evasion`, `effect.plus_one_counter`, `trigger.self_etb`

### Issues

- **missing**: `condition.cares_lands`
  - **What's wrong:** Card references "a Cave you control" (Cave is a land subtype) twice. cares_lands description includes "lands you control" — should catch land-subtype phrasing too.
  - **Evidence vs reality:** rule likely matches the word "land" / "lands" but not subtype-only ("Cave you control", "Plains you control", etc.).
  - **Suggested fix:** broaden cares_lands to also match land-subtype names (Cave, Plains, Mountain, etc.) when in "<subtype> you control" / "<subtype> entered" frames.
- **missing**: no `condition.cares_subtype.cave` exists
  - **What's wrong:** LCI introduced Caves as a tribal land subtype with its own payoff cycle (Bat Colony, Spelunking, Hidden Cataract, etc.). The subtype-cares parametric covers aura/class/curse/dragon/equipment/lesson/role/saga/shrine/vehicle but omits Cave.
  - **Evidence vs reality:** "for each mana from a Cave spent to cast it" and "Whenever a Cave you control enters" are textbook Cave-matters payoffs.
  - **Suggested fix:** add `Cave` to THEME_SUBTYPES in `pipeline/themes.ts`. The parametric rule auto-generates `condition.cares_subtype.cave` (and the corresponding `tutors_subtype.cave`, if needed). Note: Cave is a land subtype, not a creature subtype, so the parametric rule may need a small extension to handle land-subtype framing.


---

## Graceful Takedown  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in RULE_VERSION v0.13.1: `effect.fight` added (literal "fight(s)" verb plus "fight-shaped" `creatures? ... each deal damage equal to (its|their) power to target creature` frame; pairs with `condition.cares_high_power` and `trigger.damage_dealt`). -->

**Type:** Sorcery
**Mana cost:** {1}{G}

**Oracle text:**

```
Any number of target enchanted creatures you control and up to one other target creature you control each deal damage equal to their power to target creature you don't control.
```

**Current tags:** `condition.cares_subtype.aura`, `effect.cast_noncreature_spell`, `effect.causes_damage`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: no `effect.fight` tag exists
  - **What's wrong:** Known catalog coverage gap (per `mtg-graph-card-tag-audit` skill notes — "Fight effects — no effect.fight"). Graceful Takedown is a fight-shaped removal spell. No catalog tag matches.
  - **Evidence vs reality:** entire card text.
  - **Suggested fix:** coverage gap — author `effect.fight`. Anchor on `fight(s)?`, `each deal damage equal to (its|their) power to`, and the Setessan Tactics / Prey Upon shape.

---

## The Apprentice's Folly  <!-- audited 2026-05-25, ruleVersion v0.12.4 -->
<!-- Resolved in RULE_VERSION v0.13.1: `effect.sacrifice_creature` broadened with contextual token-subtype lookahead — if the same oracle text creates a creature token of subtype X (via "<n>/<n> ... X creature token" or "is a X in addition to its other types") and later says "sacrifice ... X(s)", the tag fires. Chose contextual lookup over a hard-coded whitelist so the rule generalizes to any creature-type token a card invents. -->

**Type:** Enchantment — Saga
**Mana cost:** {2}{U}{R}

**Oracle text:**

```
(As this Saga enters and after your draw step, add a lore counter. Sacrifice after III.)
I, II — Choose target nontoken creature you control that doesn't have the same name as a token you control. Create a token that's a copy of it, except it isn't legendary, is a Reflection in addition to its other types, and has haste.
III — Sacrifice all Reflections you control.
```

**Current tags:** `condition.cares_tokens`, `effect.copy_permanent`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_haste`

### Issues

- **missing**: `effect.sacrifice_creature` (and `effect.sacrifice_permanent`)
  - **What's wrong:** "Sacrifice all Reflections you control" sacrifices creature tokens but no sacrifice tag fires.
  - **Evidence vs reality:** sacrifice_creature regex requires the literal word "creature(s)" in the sacrificed object. Sacrificing by token-subtype-name (Reflection, Treasure, Food, Clue, …) isn't recognized.
  - **Suggested fix:** broaden sacrifice_creature to also accept token-creature-subtype names, OR add a separate "sacrifice tokens by type" axis. Note: sacrificing Treasures / Food / Clues is widespread (token-as-resource), so this gap is recurring.

---

## Abyssal Gorestalker  <!-- audited 2026-05-25, ruleVersion v0.12.6 -->
<!-- Resolved in RULE_VERSION v0.13.1: `effect.edict` added (opponent-scoped sacrifice — "target opponent / each opponent / each player / target player sacrifices a creature|permanent"). Fires alongside `effect.sacrifice_creature` on symmetric "each player" cards, which is correct: both the edict semantic and the controller-side sac semantic are present. -->

**Type:** Creature — Horror
**Mana cost:** {4}{B}{B}

**Oracle text:**

```
When this creature enters, each player sacrifices two creatures of their choice.
```

**Current tags:** `effect.sacrifice_creature`, `trigger.self_etb`

### Issues

- **missing**: no `effect.edict` exists
  - **What's wrong:** "Each player sacrifices two creatures" is an edict — forcing an opponent to sacrifice (Diabolic Edict family). The current `effect.sacrifice_creature` is ambiguous about who sacrifices; edicts deserve their own axis because they pair with different deck strategies (token sac fodder for opponent, tribal hate, etc.).
  - **Evidence vs reality:** `effect.sacrifice_creature` fires on "sacrifices two creatures" but the controller-only "edict" semantic is missing.
  - **Suggested fix:** add `effect.edict` covering "each opponent sacrifices", "target opponent sacrifices", "each player sacrifices". Recurring family (Innocent Blood, Diabolic Edict, Gix's Command, etc.).

---

## Ashiok, Wicked Manipulator  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved in v0.13.2: authored `effect.exile_from_library` (72 cards) + `condition.cares_exile_pile` (12 cards). Ashiok now tags both axes, plus the partial progress from v0.13.1 already resolved the `trigger.beginning_of_combat` bullet. -->

**Type:** Legendary Planeswalker — Ashiok
**Mana cost:** {3}{B}{B}

**Oracle text:**

```
If you would pay life while your library has at least that many cards in it, exile that many cards from the top of your library instead.
+1: Look at the top two cards of your library. Exile one of them and put the other into your hand.
−2: Create two 1/1 black Nightmare creature tokens with "At the beginning of combat on your turn, if a card was put into exile this turn, put a +1/+1 counter on this token."
−7: Target player exiles the top X cards of their library, where X is the total mana value of cards you own in exile.
```

**Current tags:** `effect.counter_modified`, `effect.create_creature_token`, `effect.create_token`, `effect.look_at_top_n`, `effect.plus_one_counter`

### Issues

- **missing**: no `effect.exile_from_library` / `condition.cares_exile_pile` tag exists
  - **What's wrong:** Three of Ashiok's four abilities (the static life→exile replacement, +1 card-pick exile, and −7 X-exile) all push cards from library into the exile zone, and the −7 specifically scales on the size of the player's own exile pile. The catalog has `effect.exile_from_battlefield` and `effect.exile_from_graveyard` but no library-→-exile or "cares about exile pile" axis.
  - **Evidence vs reality:** "exile that many cards from the top of your library", "Exile one of them" (post `look at the top two cards of your library`), "Target player exiles the top X cards of their library", "X is the total mana value of cards you own in exile".
  - **Suggested fix:** coverage gap — author `effect.exile_from_library` (the mill-but-to-exile family: Ashiok, Bojuka Bog style effects) and `condition.cares_exile_pile` (cards you own in exile as a resource). Pairs with the Nightmare token's "if a card was put into exile this turn" condition the same way `cares_lifegain` pairs with `life_changed`.

---

## Bramble Familiar // Fetch Quest  <!-- audited 2026-05-24, ruleVersion v0.8.0 -->
<!-- Resolved as: design decision — self-bounce is too rare in Standard (5 cards: Bramble Familiar, Mistbreath Elder, Arcanis the Omnipotent, Fleeting Effigy, Trusty Boomerang) to warrant a dedicated `effect.self_bounce` tag, and broadening `effect.bounce_creature` would over-broaden a tag whose semantic has historically been "bounces another creature." Bullet dropped without code change in v0.13.2. -->

**Type:** Creature — Elemental Raccoon // Sorcery — Adventure
**Mana cost:** {1}{G} // {5}{G}{G}

**Oracle text:**

```
{T}: Add {G}.
{1}{G}, {T}, Discard a card: Return this creature to its owner's hand.

Mill seven cards. Then put a creature, enchantment, or land card from among the milled cards onto the battlefield.
```

**Current tags:** `effect.add_mana`, `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.mill`, `effect.ramp_nonland`, `effect.reanimate`

### Issues

- **missing** (borderline): `effect.bounce_creature` (self-targeted)
  - **What's wrong:** "Return this creature to its owner's hand" is a self-bounce as part of an activated ability cost-payoff loop. Whether self-bounce should tag as `bounce_creature` is a design question — but currently the rule is silent on it. Some Standard cards (Mistmeadow Witch, Ephemerate-blink targets) benefit from being indexed as bounce.
  - **Evidence vs reality:** literal "Return this creature to its owner's hand".
  - **Suggested fix:** decide whether self-bounce belongs in `effect.bounce_creature` or a new `effect.self_bounce`. If the latter, the regex anchor would be `return (this|__SELF__) (creature|permanent) to its owner's hand`. Useful for flicker/ETB engines.

---

## Heartflame Duelist // Heartflame Slash  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in v0.13.2: broadened `effect.grants_lifelink` (and all sibling grants_* keyword rules) with a spell-grants frame matching "(instant|sorcery|spells) you control (have|gain) <kw>". Heartflame Duelist now fires grants_lifelink correctly. -->

**Type:** Creature — Human Knight // Instant — Adventure
**Mana cost:** {1}{W} // {2}{R}

**Oracle text:**

```
Instant and sorcery spells you control have lifelink.

Heartflame Slash deals 3 damage to any target. (Then exile this card. You may cast the creature later from exile.)
```

**Current tags:** `condition.cares_noncreature_spell`, `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.deals_damage`

### Issues

- **missing**: no `effect.grants_lifelink` covering spell-grants
  - **What's wrong:** Card grants lifelink to spells (a property of spells, not creatures). The `effect.grants_lifelink` description scopes to "one or more creatures". Spells-have-lifelink is a different axis (rare but exists: Heartflame Duelist, Karlov of the Ghost Council variants). Not a clean fit for the existing tag.
  - **Evidence vs reality:** literal "Instant and sorcery spells you control have lifelink".
  - **Suggested fix:** minor coverage gap — either extend `effect.grants_lifelink` to cover the spells-have-X axis, or accept this as too rare to tag.

---

## Horned Loch-Whale // Lagoon Breach  <!-- audited 2026-05-25, ruleVersion v0.8.0 -->
<!-- Resolved in v0.13.2: authored `effect.has_flash` (132 cards), `effect.has_ward` (55 cards), and `effect.tuck_to_library` (15 cards). Horned Loch-Whale now tags all three. -->

**Type:** Creature — Whale // Instant — Adventure
**Mana cost:** {4}{U}{U} // {1}{U}

**Oracle text:**

```
Flash
Ward {2}
This creature enters tapped unless it's your turn.

The owner of target attacking creature you don't control puts it on their choice of the top or bottom of their library.
```

**Current tags:** `effect.adventure_card`, `effect.cast_noncreature_spell`

### Issues

- **missing**: no `effect.has_flash` exists
  - **What's wrong:** Coverage gap — no catalog tag for the Flash printed-intrinsic keyword. Flash is on dozens of Standard cards (creatures, artifacts, enchantments) and gates a "can be cast at instant speed" axis that pairs naturally with combat-trick / control archetypes.
  - **Evidence vs reality:** literal "Flash" in keywords list.
  - **Suggested fix:** add `effect.has_flash` paralleling `effect.has_haste` / `effect.has_vigilance`.

- **missing**: no `effect.has_ward` exists
  - **What's wrong:** Coverage gap — no catalog tag for the Ward keyword family. Ward gates a "targeted removal-tax" axis used heavily in midrange.
  - **Evidence vs reality:** literal "Ward {2}" in keywords / oracle text.
  - **Suggested fix:** add `effect.has_ward` (with metadata.cost for the ward amount, optionally).

- **missing**: no tag for "tuck to top/bottom of library" exists
  - **What's wrong:** Coverage gap — "puts it on their choice of the top or bottom of their library" is a soft-bounce / tuck removal axis distinct from `effect.bounce_creature` (which returns to hand). Family: Whelming Wave variants, Memory Lapse, Condescend, etc.
  - **Evidence vs reality:** literal "puts it on their choice of the top or bottom of their library".
  - **Suggested fix:** add `effect.tuck_to_library` — only worth doing if more Standard cards use the phrasing (low priority).

---

## Bloodletter of Aclazotz  <!-- audited 2026-05-25, ruleVersion v0.12.6 -->
<!-- Resolved in v0.13.2: authored `effect.amplifies_damage_or_lifeloss` (4 cards) covering both damage- and lifeloss-doublers in a single rule (Bloodletter, Neriv, Chocobo Kick, Cut Propulsion) — same "twice that much (damage|life)" regex shape, single tag avoids redundant axes. Pairs with `trigger.damage_dealt` and `trigger.life_changed`. -->

**Type:** Creature — Vampire Demon
**Mana cost:** {1}{B}{B}{B}

**Oracle text:**

```
Flying
If an opponent would lose life during your turn, they lose twice that much life instead. (Damage causes loss of life.)
```

**Current tags:** `effect.has_evasion_intrinsic`

### Issues

- **missing**: no `effect.damage_amplifier` / `effect.life_loss_doubler` exists
  - **What's wrong:** "Lose twice that much life instead" is a doubling replacement effect — the classic Wound Reflection / Fiery Emancipation / Furnace of Rath / Citystalker Connoisseur family. This is a deck-defining payoff axis (any burn / lifeloss strategy wants these), but no tag captures it.
  - **Evidence vs reality:** the existing `effect.life_changed` is for causing life changes; doublers/replacers don't fit. trigger.life_changed is a trigger, not a static.
  - **Suggested fix:** add `effect.amplifies_lifeloss` (or broader `effect.replacement_doubler` if both damage- and lifeloss-doublers should share an axis). Pairs well with `effect.deals_damage` / `effect.life_changed` from the opponent-targeting side.
# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

---

## Braided Net // Braided Quipu  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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

---

## Breeches, Eager Pillager  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **What's wrong:** Pacify is the Pacifism / Arrest "can't attack or block" persistent Aura-style lockdown, but this is a one-turn "can't block this turn" combat rider.
  - **Evidence vs reality:** Rule `pipeline/rules/effect.pacify.ts` PATTERN `\b(?:enchanted|equipped|target|that|each) creatures? (?:can'?t|cannot|can not) (?:attack(?: or block)?|block(?: or attack)?|attack, block)\b` does not check for a "this turn" / "until end of turn" qualifier, so a one-turn combat rider fires the same tag as a permanent lock.
  - **Suggested fix:** Add a negative lookahead disallowing `this turn` / `until end of turn` immediately after the verb phrase.

---

## Bringer of the Last Gift  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Creature — Vampire Demon
**Mana cost:** {6}{B}{B}

**Oracle text:**

```
Flying
When this creature enters, if you cast it, each player sacrifices all other creatures they control. Then each player returns all creature cards from their graveyard that weren't put there this way to the battlefield.
```

**Current tags:** `effect.edict`, `effect.has_evasion_intrinsic`, `effect.reanimate`, `effect.sacrifice_creature`, `trigger.self_etb`

### Issues

- **coverage-gap**: no `effect.board_wipe` for sacrifice-shaped mass removal
  - **What's wrong:** "each player sacrifices all other creatures they control" is a sacrifice-based board wipe, but `effect.board_wipe` is keyed on `(?:destroy|exile)\s+(?:all|each)` — sacrifice-based mass removal is unrepresented.
  - **Suggested fix:** Broaden `effect.board_wipe` to include `sacrifices? all` / `each player sacrifices? all` forms, or add a sister tag `effect.mass_sacrifice`.

---

## Canonized in Blood  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **What's wrong:** The only "vampire" reference is in the token's type line ("4/3 white and black Vampire Demon creature token"). Card doesn't care about Vampires as a tribal payoff.
  - **Evidence vs reality:** `pipeline/rules/condition.cares_tribe.ts` `stripFraming` uses `\bcreates?\s+(?:[\w\/]+\s+){1,7}?tokens?\b` to strip token-creation phrasing. Here there are 8 words between "create" and "token" ("a 4/3 white and black vampire demon creature"), exceeding the `{1,7}` cap so strip fails and "vampire" leaks through.
  - **Suggested fix:** Loosen the strip-framing window from `{1,7}` to `{1,10}` or `{1,12}` — modern color-laden token descriptions routinely exceed 7 words.

---

## Caparocti Sunborn  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Legendary Creature — Human Soldier
**Mana cost:** {2}{R}{W}

**Oracle text:**

```
Whenever Caparocti Sunborn attacks, you may tap two untapped artifacts and/or creatures you control. If you do, discover 3. (Exile cards from the top of your library until you exile a nonland card with mana value 3 or less. Cast it without paying its mana cost or put it into your hand. Put the rest on the bottom in a random order.)
```

**Current tags:** `effect.discover`, `effect.tap`, `trigger.attack_or_block`

### Issues

- **false-positive**: `effect.tap`
  - **What's wrong:** The tap is a convoke-style "tap your own untapped permanents" rider inside a triggered ability, not soft control / removal of a target permanent.
  - **Evidence vs reality:** `pipeline/rules/effect.tap.ts` cost-vs-effect gate only suppresses the match when a `:` follows in the local window (activation cost). Inside a triggered ability the gate doesn't trip, and PATTERN allows the bare noun without `target`. Evidence is `"tap two untapped artifacts"`.
  - **Suggested fix:** Add a "you may tap … you control" guard, or require the tapped noun to be preceded by `target`.

---

## Clay-Fired Bricks // Cosmium Kiln  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **What's wrong:** "search your library for a basic Plains card" is a canonical basic-land tutor, but the rule pattern requires the literal word "land".
  - **Evidence vs reality:** `pipeline/rules/effect.tutors_basic_land.ts` PATTERN `search ... for ... basic lands? cards?` does not match "basic Plains card" / "basic Island card" / etc. The basic-type variant is common modern phrasing.
  - **Suggested fix:** Extend PATTERN to accept `basic (?:land|plains|island|swamp|mountain|forest)s? cards?`.

---

## Coati Scavenger  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Creature — Raccoon
**Mana cost:** {2}{G}

**Oracle text:**

```
Descend 4 — When this creature enters, if there are four or more permanent cards in your graveyard, return target permanent card from your graveyard to your hand.
```

**Current tags:** `condition.cares_graveyard`, `effect.bounce_artifact`, `effect.bounce_creature`, `effect.bounce_enchantment`, `effect.bounce_land`, `effect.bounce_or_blink`, `effect.bounce_planeswalker`, `effect.return_from_graveyard_to_hand`, `trigger.self_etb`

### Issues

- **false-positive**: `effect.bounce_artifact`, `effect.bounce_creature`, `effect.bounce_enchantment`, `effect.bounce_land`, `effect.bounce_or_blink`, `effect.bounce_planeswalker`
  - **What's wrong:** Bounce means battlefield-to-hand. This card returns a permanent card *from the graveyard* to hand (`effect.return_from_graveyard_to_hand` already fires). All six bounce tags are systemic over-matches when the source zone is the graveyard.
  - **Evidence vs reality:** Each fires on `"return target permanent card from your graveyard to your hand"`. In `pipeline/rules/effect.bounce_creature.ts`, the `PATTERN_RETURN_OWN` arm has a negative-lookahead guard against `\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?`, but `PATTERN_BROAD` (which matches `permanents?`) lacks the same guard, so "permanent card from your graveyard to your owner's hand" slips through. The other bounce family rules have the same shape.
  - **Suggested fix:** Add the same negative-lookahead guard to every `PATTERN_BROAD` (and any other arm matching `permanent`) across `effect.bounce_*` rules.

---

## Cogwork Wrestler  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **What's wrong:** "target creature gets -2/-0" is a -N/-M debuff but probably requires both stat slots to be negative; it appears to miss power-only debuffs (-N/-0).
  - **Suggested fix:** Broaden `effect.debuff_minus_n` regex to allow 0 in the toughness slot, e.g. `-[1-9X]/-[0-9X]`.

---

## Contested Game Ball  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Artifact
**Mana cost:** {2}

**Oracle text:**

```
Whenever you're dealt combat damage, the attacking player gains control of this artifact and untaps it.
{2}, {T}: Draw a card and put a point counter on this artifact. Then if it has five or more point counters on it, sacrifice it and create a Treasure token.
```

**Current tags:** `effect.control_change`, `effect.counter_modified`, `effect.create_token`, `effect.create_treasure`, `effect.draws_or_discards`, `effect.has_activated_ability`, `trigger.attack_or_block`

### Issues

- **false-positive**: `trigger.attack_or_block`
  - **What's wrong:** Trigger fires off "you're dealt combat damage," not on a creature attacking/blocking. "Attacking player" describes the recipient of control, not the trigger condition.
  - **Evidence vs reality:** evidence was `"whenever you're dealt combat damage, the attack"`. Trigger matched on the incidental "attack" substring inside the noun "attacking player".
  - **Suggested fix:** Tighten `trigger.attack_or_block` anchors so the verb after "{subject}" must be `attacks` / `blocks` (not a participial "attacking player").

- **missing**: `effect.sacrifice_artifact`
  - **What's wrong:** "sacrifice it" with "this artifact" antecedent is self-sacrifice. The rule misses pronoun-form self-sacrifice.
  - **Suggested fix:** Allow `sacrifice it` when an antecedent like "this artifact"/"this creature" appears earlier in the sentence.

---

## Corpses of the Lost  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **Suggested fix:** Broaden `effect.grants_haste` to accept "<Tribe> you control … have/has haste."

---

## Cosmium Confluence  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **Suggested fix:** Add "becomes a … creature with haste" to `effect.grants_haste` anchors.

- **missing**: `effect.ramp_nonland`
  - **What's wrong:** Mode 1 puts a Cave directly onto the battlefield (ramp semantics). `tutors_subtype.cave` fires but the ramp dimension is lost.
  - **Suggested fix:** Verify `effect.ramp_nonland` covers "search your library for a [land subtype] card, put it onto the battlefield" for subtype-tutored lands.

---

## Deepfathom Echo  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **Evidence vs reality:** evidence was `"become a copy of another creature"`.
  - **Suggested fix:** Either broaden the `effect.copy_permanent` description to cover "becomes a copy" clone effects, or split into `effect.create_copy_token` vs `effect.clone_in_place`.

---

## Didact Echo  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **What's wrong:** TagDef says "Gives flying … to other creatures or to tokens it creates." Card grants flying *to itself* conditionally — not granting evasion to other creatures.
  - **Evidence vs reality:** evidence was `"has flying"` matching "this creature has flying as long as…" which is a conditional self-grant.
  - **Suggested fix:** Split `grants_evasion` into "grants to others" vs "gains conditional self", or require "creatures you control" / "target creature" / "another creature" context.

---

## Digsite Conservator  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **Suggested fix:** Broaden anchors in `pipeline/rules/effect.exile_from_graveyard.ts` to include "from a single graveyard" / "from target player's graveyard" phrasing.

---

## Dire Flail // Dire Blunderbuss  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Artifact — Equipment // Artifact — Equipment
**Mana cost:** (none)

**Oracle text:**

```
Equipped creature gets +2/+0.
Equip {1}
Craft with artifact {3}{R}{R} ({3}{R}{R}, Exile this artifact, Exile another artifact you control or an artifact card from your graveyard: Return this card transformed under its owner's control. Craft only as a sorcery.)

Equipped creature gets +3/+0 and has "Whenever this creature attacks, you may sacrifice an artifact other than Dire Blunderbuss. When you do, this creature deals damage equal to its power to target creature."
```

**Current tags:** `effect.deals_damage`, `effect.fight`, `effect.grants_stat_buff`, `effect.sacrifice_artifact`, `trigger.attack_or_block`

### Issues

- **false-positive**: `effect.fight`
  - **What's wrong:** This is a unilateral attack-trigger damage effect (granted via Equipment); the target creature does not deal damage back, so it is not a fight.
  - **Evidence vs reality:** `pipeline/rules/effect.fight.ts` `PATTERN_SHAPED` regex `\bcreatures?(?:\s+you control)?[^.]{0,140}?(?:each\s+)?deals?\s+damage\s+equal\s+to\s+(?:its|their)\s+power\s+to\s+target\s+creature` accepts "this creature" because `\bcreatures?` only requires a word boundary before "creature". Real fight semantics need mutual damage.
  - **Suggested fix:** Constrain `PATTERN_SHAPED` subject so `creatures?` is actually the head noun (negative lookbehind for "this " / "the " / "that " / `__self__`), or require a plural-deal frame ("creatures … each deal").

---

## Disturbed Slumber  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Instant
**Mana cost:** {1}{G}

**Oracle text:**

```
Until end of turn, target land you control becomes a 4/4 Dinosaur creature with reach and haste. It's still a land. It must be blocked this turn if able.
```

**Current tags:** `condition.cares_lands`, `effect.animate_land`, `effect.cast_noncreature_spell`, `effect.grants_haste`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.grants_reach`
  - **What's wrong:** Animated land gains "reach and haste". `effect.grants_haste` fires (haste is preceded by "and"), but `effect.grants_reach` does not because Frame (e) of `effect.grants_keyword` requires `(?:,\s*|\band\s+)reach` after `with`, and here `with reach` has nothing before reach.
  - **Suggested fix:** Extend Frame (e) of `effect.grants_keyword` to also match the first keyword in the with-clause: `with\s+${kw}\b` (with bounded preceding filler) — not only the comma/and-prefixed continuation.

---

## Dowsing Device // Geode Grotto  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Artifact // Land — Cave
**Mana cost:** (none)

**Oracle text:**

```
Whenever this artifact or another artifact you control enters, up to one target creature you control gets +1/+0 and gains haste until end of turn. Then transform this artifact if you control four or more artifacts.

(Transforms from Dowsing Device.)
{T}: Add {R}.
{2}{R}, {T}: Until end of turn, target creature gains haste and gets +X/+0, where X is the number of artifacts you control. Activate only as a sorcery.
```

**Current tags:** `condition.cares_artifacts`, `effect.add_mana`, `effect.grants_haste`, `effect.grants_stat_buff`, `effect.has_activated_ability`

### Issues

- **missing**: `trigger.self_etb`
  - **What's wrong:** "Whenever this artifact or another artifact you control enters" is a combined self+other ETB trigger. The self-ETB half is not tagged.
  - **Suggested fix:** Allow `trigger.self_etb` to match the combined form `whenever this <type> or another …<type> … enters`.

- **missing**: `trigger.another_artifact_etb`
  - **What's wrong:** Same combined clause is also an "another artifact ETB" trigger, but the rule's regex doesn't cover the "whenever this artifact or another artifact …" templating.
  - **Suggested fix:** Broaden `trigger.another_artifact_etb` to also recognize `whenever this artifact or another artifact …enters` (similarly extend for creature/enchantment ETB).

---

## Echoing Deeps  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Land — Cave
**Mana cost:** (none)

**Oracle text:**

```
You may have this land enter tapped as a copy of any land card in a graveyard, except it's a Cave in addition to its other types.
{T}: Add {C}.
```

**Current tags:** `condition.cares_graveyard`, `condition.cares_lands`, `condition.cares_subtype.cave`, `effect.add_mana`, `effect.has_activated_ability`

### Issues

- **missing**: `effect.copy_permanent`
  - **What's wrong:** The card enters as a copy of any land card in a graveyard. `effect.copy_permanent`'s `ENTER_AS_COPY` regex `\benter(?:s)? as a copy of\b` fails because oracle text reads "enter **tapped** as a copy of".
  - **Suggested fix:** Update `ENTER_AS_COPY` to `\benter(?:s)?(?:\s+\w+){0,2}\s+as a copy of\b` to admit "enter tapped as a copy of" and similar modifier insertions.

---

## Explorer's Cache  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Artifact
**Mana cost:** {1}{G}

**Oracle text:**

```
This artifact enters with two +1/+1 counters on it.
Whenever a creature you control with a +1/+1 counter on it dies, put a +1/+1 counter on this artifact.
{T}: Move a +1/+1 counter from this artifact onto target creature. Activate only as a sorcery.
```

**Current tags:** `condition.cares_plus_one_counter`, `effect.counter_modified`, `effect.has_activated_ability`, `effect.plus_one_counter`

### Issues

- **missing**: `trigger.creature_dies`
  - **What's wrong:** "Whenever a creature you control with a +1/+1 counter on it dies" is a classic creature-dies trigger that doesn't fire.
  - **Evidence vs reality:** `pipeline/rules/trigger.creature_dies.ts` regex caps post-"creature" filler at 4 word tokens; here "you control with a +1/+1 counter on it dies" is ~8 tokens (and `+1/+1` contains `/` not matched by `\w`).
  - **Suggested fix:** Raise post-creature filler from `{0,4}` to `{0,10}` and tolerate `+1/+1`-style tokens (or strip "+1/+1 counter" pre-match).

---

## Fabrication Foundry  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Artifact
**Mana cost:** {1}{W}

**Oracle text:**

```
{T}: Add {W}. Spend this mana only to cast an artifact spell or activate an ability of an artifact source.
{2}{W}, {T}, Exile one or more other artifacts you control with total mana value X: Return target artifact card with mana value X or less from your graveyard to the battlefield. Activate only as a sorcery.
```

**Current tags:** `condition.cares_artifacts`, `effect.add_mana`, `effect.exile_from_graveyard`, `effect.has_activated_ability`, `effect.ramp_nonland`, `effect.reanimate`

### Issues

- **false-positive**: `effect.exile_from_graveyard`
  - **What's wrong:** The exile cost targets battlefield artifacts ("Exile one or more other artifacts you control"), not graveyard cards. The "from your graveyard" phrase belongs to the unrelated reanimate clause downstream.
  - **Evidence vs reality:** evidence was `"exile one or more other artifacts you control with total mana value x: return target artifact card with mana value x or less from your graveyard"`. The `OWN_QUANTIFIED` arm `exile one or more .+? from your graveyard(?!s*\s*[:—])` greedily spans the `: ` activation separator and the entire return clause to reach "from your graveyard" downstream.
  - **Suggested fix:** Constrain `OWN_QUANTIFIED` to stop at clause boundaries (forbid `:`, `.`, em-dash inside the `.+?` filler) so it cannot span an activation separator into a different effect.

---

## Gishath, Sun's Avatar  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Legendary Creature — Dinosaur Avatar
**Mana cost:** {5}{R}{G}{W}

**Oracle text:**

```
Vigilance, trample, haste
Whenever Gishath deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.
```

**Current tags:** `condition.cares_tribe.dinosaur`, `effect.has_haste`, `effect.has_trample`, `effect.has_vigilance`, `trigger.damage_dealt`

### Issues

- **missing**: `effect.look_at_top_n`
  - **What's wrong:** "Reveal that many cards from the top of your library" is exactly the look_at_top_n mechanic, but the rule misses this word order.
  - **Evidence vs reality:** `PATTERN_PLURAL` requires "top <N> cards of [whose] library" — number BEFORE "cards". Gishath uses "<N> cards from the top of … library" (different connector).
  - **Suggested fix:** Add alt pattern `\b(?:reveal|look at) (?:\d+|x|one|...|that many) cards from the top of [\w\s']+? library\b`.

---

## Goblin Tomb Raider  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **Evidence vs reality:** evidence `"this creature gets +1/+0 and has haste"` is self-reference.
  - **Suggested fix:** Narrow `effect.grants_haste` to exclude "this creature gets ... has X" self-buff frames.

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** "As long as you control an artifact" gates the bonus on artifact count — classic `cares_artifacts` payoff.
  - **Suggested fix:** Broaden `condition.cares_artifacts` to cover "as long as you control an artifact" / "if you control an artifact".

---

## Goldfury Strider  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **What's wrong:** Card has an activated ability with cost clause and colon ("Tap N untapped artifacts and/or creatures you control: Target creature gets +2/+0").
  - **Evidence vs reality:** `PROSE_ACTIVATED_PATTERN` in `pipeline/rules/effect.has_activated_ability.ts` does include the `tap` verb, but anchors at sentence start `(?:^|\.\s|\n)`. The cost-clause appears to not match — possibly because the convoke/improvise-style "tap N untapped …" prefix isn't recognized in the bounded window, or the sentence-start anchor fails after the "Trample" keyword line.
  - **Suggested fix:** Verify and broaden the prose-activated pattern so "Tap N untapped … : …" cost prefixes match (consider explicitly allowing `tap N` with a numeric word in front of the noun phrase).

---

## Growing Rites of Itlimoc // Itlimoc, Cradle of the Sun  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **What's wrong:** "When Growing Rites of Itlimoc enters" — after name normalization this should become "when __SELF__ enters", the canonical self_etb anchor, but the trigger didn't fire.
  - **Evidence vs reality:** Likely DFC normalization bug: front-face name "Growing Rites of Itlimoc" may not be substituted when only the full DFC name "Growing Rites of Itlimoc // Itlimoc, Cradle of the Sun" (or face combinations) is.
  - **Suggested fix:** Verify `stripScryfallCard` / name-normalization handles DFC face names so "Growing Rites of Itlimoc enters" → "__SELF__ enters" binds self_etb.

---

## Guardian of the Great Door  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **What's wrong:** `effect.tap` is meant for "Tap target permanent" soft-control. Here, "tap four untapped artifacts, creatures, and/or lands" is a convoke/improvise-style additional cost paid before casting — not a resolution effect.
  - **Evidence vs reality:** evidence `"tap four untapped artifacts"` lives in an additional-cost clause; the card's only resolution-time ability is Flying.
  - **Suggested fix:** Narrow `effect.tap` to exclude "as an additional cost ... tap N untapped permanents" clauses; require the tap to target a permanent.

- **false-positive**: `condition.cares_lands`
  - **What's wrong:** "lands you control" appears only in the additional-cost clause; the card doesn't scale, trigger, or pay off on land count.
  - **Suggested fix:** Narrow `cares_lands` to exclude appearance inside "as an additional cost" clauses, or require an actual count/scaling reference.

---

## Huatli, Poet of Unity // Roar of the Fifth People  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **What's wrong:** Saga chapter III "Search your library for a Dinosaur card" — a Dinosaur card is a creature card. `tutors_creature` exists; `tutors_subtype.dinosaur` does not.
  - **Suggested fix:** Broaden `effect.tutors_creature` to include tribal phrasings ("search your library for a [Tribe] card") for tribes in `THEME_TRIBES`.

---

## Huatli's Final Strike  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Instant
**Mana cost:** {2}{G}

**Oracle text:**

```
Target creature you control gets +1/+0 until end of turn. It deals damage equal to its power to target creature an opponent controls.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.grants_stat_buff`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.causes_damage`
  - **What's wrong:** Catalog description for `causes_damage`: 'Causes damage to be dealt via another permanent (typically "target creature you control deals damage equal to its power...")'. Exactly this card's effect, but the antecedent "target creature you control" is in a prior sentence and the second sentence uses "It deals damage equal to its power".
  - **Suggested fix:** Ensure `causes_damage` regex catches "it deals damage equal to its power" continuations where the subject was named in a prior sentence (or pre-process pronouns).

---

## Hunter's Blowgun  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **Suggested fix:** Broaden `effect.grants_reach` regex to cover "equipped creature has reach" and conditional-otherwise frames where the subject pronoun "it" refers to the equipped creature.

---

## Idol of the Deep King // Sovereign's Macuahuitl  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

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
  - **What's wrong:** "When this artifact enters, it deals 2 damage to any target" is unambiguously a damage effect.
  - **Evidence vs reality:** `pipeline/rules/effect.deals_damage.ts` scopes the pronoun-"it" subject via lookbehind `(?<=: )it` — only matching when "it" follows an activated-ability colon. The ETB-style ", it deals" (comma-after-trigger-clause) never matches.
  - **Suggested fix:** Add an alternation accepting "it" after `, ` inside an enter/trigger clause, e.g. `\benters, it deals \d+ (?:combat )?damage\b` (and parallel for "equal to" / X damage).

---

## Inti, Seneschal of the Sun  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Legendary Creature — Human Knight
**Mana cost:** {1}{R}

**Oracle text:**

```
Whenever you attack, you may discard a card. When you do, put a +1/+1 counter on target attacking creature. It gains trample until end of turn.
Whenever you discard one or more cards, exile the top card of your library. You may play that card until your next end step.
```

**Current tags:** `effect.counter_modified`, `effect.draws_or_discards`, `effect.exile_from_library`, `effect.grants_trample`, `effect.plus_one_counter`, `trigger.attack_or_block`

### Issues

- **missing**: `trigger.card_drawn_discarded`
  - **What's wrong:** "Whenever you discard one or more cards" is canonical card-discarded trigger that should fire.
  - **Evidence vs reality:** Rule regex in `pipeline/rules/trigger.card_drawn_discarded.ts` only allows `(?:draws?|discards?) a (?:<TYPE> )?card|<their> <first|...> card`. Does NOT accept the "one or more cards" quantifier, so this trigger silently misses on every "discard one or more" / "draw one or more" templating.
  - **Suggested fix:** Add a `one or more (?:<TYPE> )?cards?` alternative to the trigger-object pattern.

---

## Intrepid Paleontologist  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Creature — Human Druid
**Mana cost:** {1}{G}

**Oracle text:**

```
{T}: Add one mana of any color.
{2}: Exile target card from a graveyard.
You may cast Dinosaur creature spells from among cards you own exiled with this creature. If you cast a spell this way, that creature enters with a finality counter on it. (If a creature with a finality counter on it would die, exile it instead.)
```

**Current tags:** `condition.cares_tribe.dinosaur`, `effect.add_mana`, `effect.counter_modified`, `effect.exile_from_graveyard`, `effect.has_activated_ability`, `effect.ramp_nonland`

### Issues

- **missing**: `condition.cares_exile_pile`
  - **What's wrong:** "cards you own exiled with this creature" is the canonical "exile pile as resource" templating (pattern 2 in the rule's own comments — "cards exiled with __self__").
  - **Evidence vs reality:** `pipeline/rules/condition.cares_exile_pile.ts` pattern 2 is `/\bcards? exiled with __self__\b/`. Only the self-name-normalized form is recognized. Cards using "this creature" / "this artifact" instead of repeating the cardname silently miss (normalization does NOT rewrite "this creature" to `__SELF__`).
  - **Suggested fix:** Extend pattern 2 to `cards? exiled with (?:__self__|this (?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker))`.

---

## Inverted Iceberg // Iceberg Titan  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Artifact // Artifact Creature — Golem
**Mana cost:** (none)

**Oracle text:**

```
When this artifact enters, mill a card, then draw a card. (To mill a card, put the top card of your library into your graveyard.)
Craft with artifact {4}{U}{U} ({4}{U}{U}, Exile this artifact, Exile another artifact you control or an artifact card from your graveyard: Return this card transformed under its owner's control. Craft only as a sorcery.)

Whenever this creature attacks, you may tap or untap target artifact or creature.
```

**Current tags:** `effect.draws_or_discards`, `effect.tap`, `effect.untap`, `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **missing**: `effect.mill`
  - **What's wrong:** "mill a card" is canonical modern mill wording.
  - **Evidence vs reality:** `pipeline/rules/effect.mill.ts` defines `NUM = (?:\d+|one|two|...|twenty)`. The singular article "a" is not in NUM, so `mills? a cards?` never matches. Many recent cards use "mill a card" exclusively.
  - **Suggested fix:** Add `a|an` to the alternation, e.g. `mills? (?:a|an|<NUM>) cards?`.

---

## Itzquinth, Firstborn of Gishath  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Legendary Creature — Dinosaur
**Mana cost:** {R}{G}

**Oracle text:**

```
Haste
When Itzquinth enters, you may pay {2}. When you do, target Dinosaur you control deals damage equal to its power to another target creature.
```

**Current tags:** `condition.cares_tribe.dinosaur`, `effect.has_haste`, `trigger.self_etb`

### Issues

- **missing**: `effect.fight` and `effect.causes_damage`
  - **What's wrong:** "target Dinosaur you control deals damage equal to its power to another target creature" is fight-shaped removal.
  - **Evidence vs reality:** Both `pipeline/rules/effect.fight.ts` (`PATTERN_SHAPED`) and `pipeline/rules/effect.causes_damage.ts` (`CREATURE_PHRASE`) require the subject noun to literally be "creature(s)". A tribe-name subject ("Dinosaur") is unrecognized.
  - **Suggested fix:** Allow a single capitalized tribe word (from `THEME_TRIBES`) as an alternative subject in both rules' subject patterns.

---

## Kitesail Larcenist  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Creature — Human Pirate
**Mana cost:** {2}{U}

**Oracle text:**

```
Flying, ward {1}
When this creature enters, for each player, choose up to one other target artifact or creature that player controls. For as long as this creature remains on the battlefield, the chosen permanents become Treasure artifacts with "{T}, Sacrifice this artifact: Add one mana of any color" and lose all other abilities.
```

**Current tags:** `effect.add_mana`, `effect.has_activated_ability`, `effect.has_evasion_intrinsic`, `effect.has_ward`, `effect.ramp_nonland`, `effect.sacrifice_artifact`, `trigger.self_etb`

### Issues

- **false-positive**: `effect.has_activated_ability`, `effect.add_mana`, `effect.ramp_nonland`, `effect.sacrifice_artifact`
  - **What's wrong:** All four match on text inside the quoted granted ability that the chosen permanents *become* (`"{T}, Sacrifice this artifact: Add one mana of any color"`). Kitesail itself has no activated ability, produces no mana, and does not sacrifice. The rules do not skip text inside paired quotes.
  - **Evidence vs reality:** evidence for `has_activated_ability` is `"{t}, sacrifice this artifact:"` — string is wrapped in the quotes of the granted Treasure ability. Same root cause for the other three.
  - **Suggested fix:** Strip (or skip) quoted granted-ability text before scanning for colon-frames and similar effect anchors. Single fix addresses all four FPs here.

---

## Magmatic Galleon  <!-- audited 2026-05-25, ruleVersion v0.13.3 -->

**Type:** Artifact — Vehicle
**Mana cost:** {3}{R}{R}

**Oracle text:**

```
When this Vehicle enters, it deals 5 damage to target creature an opponent controls.
Whenever one or more creatures your opponents control are dealt excess noncombat damage, create a Treasure token.
Crew 2
```

**Current tags:** `effect.create_token`, `effect.create_treasure`, `trigger.self_etb`

### Issues

- **missing**: `effect.deals_damage`
  - **What's wrong:** "When this Vehicle enters, it deals 5 damage to target creature" is unambiguously a damage effect.
  - **Evidence vs reality:** Same root cause as Idol of the Deep King: `pipeline/rules/effect.deals_damage.ts` scopes the pronoun-"it" subject via lookbehind `(?<=: )it`, so the ETB-style ", it deals" templating never matches.
  - **Suggested fix:** Add an alternation accepting "it" after `, ` inside an enter/trigger clause (single fix benefits both cards above).

- **missing**: `trigger.damage_dealt`
  - **What's wrong:** "Whenever one or more creatures your opponents control are dealt excess noncombat damage" is a passive-voice damage trigger.
  - **Evidence vs reality:** `pipeline/rules/trigger.damage_dealt.ts` requires `whenever ... deals damage` (active voice only).
  - **Suggested fix:** Add `whenever (?:[^,.]*?) (?:is|are) dealt (?:\w+ )?damage` as a second alternative.

---

## Systemic patterns observed

These cut across many cards in the audited batch. Fixing the rule or adding the new tag in one place addresses every card in the bucket.

### Coverage gaps (tags that don't exist in the catalog at all)

- **Descend (LCI ability word / gated trigger)** — no `condition.descend` exists. Cards in this batch alone: Brass's Tunnel-Grinder, Broodrage Mycoid, Canonized in Blood, Child of the Volcano, Chupacabra Echo, Coati Scavenger, Corpses of the Lost, Council of Echoes, Deep Goblin Skulltaker, Didact Echo, Echo of Dusk, Enterprising Scallywag, Frilled Cave-Wurm, Join the Dead, Malamet Veteran. Mirrors the existing `condition.celebration` pattern. Recommend `condition.descend` matching `if you descended this turn` and the ability-word `(?:fathomless )?descend(?: \d+)? —`. Note Deep Goblin Skulltaker doesn't even get `condition.cares_graveyard` (reminder text is stripped before tagging) so the signal is entirely lost without a dedicated tag.

- **Pirate tribe** — not in `pipeline/themes.ts` `THEME_TRIBES`. Cards in batch referencing Pirates as a tribal payoff: Breeches, Eager Pillager ("Whenever a Pirate you control attacks"), Captain Storm, Cosmium Raider ("put a +1/+1 counter on target Pirate you control"). Recommend adding `pirate`.

- **Skeleton tribe** — not in `THEME_TRIBES`. Corpses of the Lost has "Skeletons you control get +1/+0 and have haste" — pure tribal anthem.

- **Map tokens** — Treasure / Food / Clue / Role all have typed tags (`effect.create_treasure` etc.); `effect.create_map` does not. Cards in batch: Fanatical Offering, Get Lost, Kellan, Daring Traveler // Journey On.

- **Craft mechanic (LCI)** — no `effect.has_craft`. Cards in batch: Braided Net, Clay-Fired Bricks, Dire Flail, Idol of the Deep King, Inverted Iceberg, Kaslem's Stonetree.

- **Equip / Reconfigure keyword as activated ability** — Equip's "{N}: Attach to target creature you control" lives only in reminder text (stripped pre-tag), so `effect.has_activated_ability` doesn't fire on Equipment cards that have no other activated ability. Cards in batch: Hunter's Blowgun, Malamet Scythe. Family-level (same hole applies to Reconfigure, Cycling-without-cost, etc.).

- **Printed-keyword `has_*` family is incomplete** — `effect.has_indestructible`, `effect.has_hexproof`, `effect.has_menace`, `effect.has_flying`, `effect.has_double_strike` do not exist. `has_evasion_intrinsic` umbrella collapses flying/menace/intimidate distinctions; indestructible / hexproof / menace / double strike are catalog-invisible for "printed" purposes. (`grants_*` siblings already exist for indestructible / hexproof / double strike.) Cards in batch: Diamond Pick-Axe (indestructible), Deep Goblin Skulltaker (menace).

- **Cheat-into-play family** — no `effect.cheat_into_play` / `effect.put_card_onto_battlefield`. Sneak Attack / Elvish Piper / Gishath / See the Unwritten / Selvala's Stampede / Ghalta, Stampede Tyrant all share this "put card from hand/library/exile directly onto the battlefield" frame. Reanimate covers graveyard→battlefield only.

- **Transform (DFC) effect** — no `effect.transform` tag. Multiple DFCs in batch self-transform; downstream consumers can't tell.

- **Impulse draw** — no `effect.impulse_draw` for "exile the top card. You may play it this turn / until your next end step." Cards in batch: Breeches, Inti.

- **"Left battlefield this turn" condition** — only `condition.cares_creatures_died_this_turn` exists. The broader "creature that left the battlefield under your control this turn" (Kutzil's Flanker) — sacrifice-aristocrat axis — silently misses.

- **Stax-style restrictions** — "Your opponents can't cast spells during your turn" / "Defense Grid" / "Aven Mindcensor" family has no tag. Kutzil, Malamet Exemplar in batch.

- **Loses-life-self (drawback)** — only `effect.life_changed` exists. A finer-grained "you lose N life" drawback tag would help pair lifeloss-matters payoffs. Grasping Shadows in batch (low-priority note).

### Precision bugs (existing rules that over-/under-match systemically)

- **Bounce family ignores "from … graveyard" qualifier in the `permanent` arm.** `effect.bounce_*` rules all have a `PATTERN_BROAD` (or equivalent) arm that matches `permanents?` without the graveyard guard their `PATTERN_RETURN_OWN` has. Coati Scavenger fires all six. Fix once: add the same negative lookahead to every broad arm.

- **`trigger.attack_or_block` over-matches on "attacking player" prose.** Contested Game Ball. Needs an anchor requiring "{creature} attacks/blocks", not bare "attack" / "attacking".

- **`effect.tap` fires inside additional-cost / convoke-rider clauses.** Caparocti Sunborn, Guardian of the Great Door. The cost-vs-effect gate looks for a `:` only, missing the "as an additional cost" frame and the in-body trigger-rider frame. Suggested: require `target` before the tapped noun, or add explicit guards for additional-cost / "you may tap … you control" phrasings.

- **`effect.fight` PATTERN_SHAPED matches "this creature deals damage equal to its power to target creature" unilateral damage.** Dire Flail (Equipment-granted attack trigger). Subject `\bcreatures?` accepts "this creature" via word boundary. Fix: negative lookbehind for "this " / "the " / "that " / `__self__` before "creature".

- **`effect.deals_damage` `IT` subject lookbehind only matches `(?<=: )it`.** Misses every "When this <type> enters, it deals N damage" ETB-burn frame. Idol of the Deep King, Magmatic Galleon. Add `, it deals` alternation.

- **`trigger.damage_dealt` is active-voice only.** Passive "are dealt … damage" silently misses (Magmatic Galleon's excess-damage trigger).

- **`effect.grants_evasion` description claims "to other creatures or tokens it creates" but the rule fires on conditional self-grants.** Didact Echo. Either split into two tags or constrain to require an other-creature subject.

- **`effect.copy_permanent` description claims "creates a token that is a copy"** but rule fires on in-place clone effects ("become a copy"). Deepfathom Echo. Broaden description, or split `create_copy_token` vs `clone_in_place`.

- **`effect.copy_permanent` ENTER_AS_COPY misses "enter tapped as a copy".** Echoing Deeps. Insert `(?:\s+\w+){0,2}` between `enter(?:s)?` and `as a copy of`.

- **`condition.cares_tribe` `stripFraming` window `{1,7}` is too tight for modern color-laden token descriptions.** Canonized in Blood ("4/3 white and black Vampire Demon creature token") leaks "vampire". Bump to `{1,10}` or `{1,12}`.

- **`effect.grants_keyword` Frame (e) requires a comma/and before the keyword in the with-clause.** "becomes a 4/4 Dinosaur creature with reach and haste" loses `grants_reach` (haste fires via the "and reach" arm). Disturbed Slumber.

- **`effect.grants_haste` (and likely the rest of `grants_<keyword>` family) doesn't match "<Tribe> you control … have/has haste" anthems.** Corpses of the Lost. Allow tribe nouns as subjects.

- **`effect.grants_*` family doesn't match conditional self-buff "this creature gets +X/+Y and has haste".** Goblin Tomb Raider. Conditional self-gain is a different mechanic from anthem-grant; either split or add a self-exclusion.

- **`effect.grants_haste` (and likely `grants_*`) doesn't match "becomes a … creature with haste" land-animation frames.** Cosmium Confluence mode 2.

- **`effect.grants_reach` doesn't match "equipped creature has reach" / "Otherwise, it has reach" conditional frames.** Hunter's Blowgun.

- **`effect.exile_from_graveyard` OWN_QUANTIFIED greedy `.+?` spans `:` activation-separator into a different effect.** Fabrication Foundry. Constrain to forbid `:` / `.` / em-dash in the filler.

- **`effect.exile_from_graveyard` misses "from a single graveyard" / "from target player's graveyard".** Digsite Conservator.

- **`effect.tutors_basic_land` requires the literal word "land" — misses "basic Plains card" / "basic Island card" / etc.** Clay-Fired Bricks.

- **`effect.tutors_creature` doesn't match tribal-card searches.** Huatli, Poet of Unity chapter III "Search your library for a Dinosaur card" silently misses.

- **`effect.ramp_nonland` doesn't handle "look at top N, put a land onto the battlefield" frames.** Kaslem's Stonetree, Cosmium Confluence mode 1.

- **`effect.mill` doesn't accept the article "a" as a count.** "mill a card" (modern singular templating, used widely) silently misses. Inverted Iceberg.

- **`effect.debuff_minus_n` requires both stat slots to be negative.** Misses power-only debuffs (-N/-0). Cogwork Wrestler.

- **`effect.board_wipe` is keyed on `(?:destroy|exile)\s+(?:all|each)`.** Sacrifice-shaped mass removal ("each player sacrifices all other creatures they control") unrepresented. Bringer of the Last Gift.

- **`effect.pacify` doesn't check for "this turn" / "until end of turn" qualifier.** One-turn combat riders ("target creature can't block this turn") fire the same tag as permanent Pacifism. Breeches, Eager Pillager.

- **`trigger.creature_dies` post-creature filler cap `{0,4}` too tight; doesn't tolerate `+1/+1`-style tokens.** "creature you control with a +1/+1 counter on it dies" silently misses. Explorer's Cache.

- **`trigger.card_drawn_discarded` doesn't accept "one or more cards" quantifier.** Inti, Seneschal of the Sun.

- **`trigger.self_etb` and `trigger.another_artifact_etb` (and likely sibling another_*_etb) don't recognize the combined "Whenever this artifact or another artifact … enters" templating.** Dowsing Device. Common Bloomburrow/OTJ pattern.

- **`trigger.self_etb` may not normalize DFC front-face names.** Growing Rites of Itlimoc's "When Growing Rites of Itlimoc enters" doesn't fire self_etb — possibly because name substitution only handles the combined "//" name. Worth verifying `stripScryfallCard`.

- **`condition.cares_exile_pile` pattern 2 only matches `__self__` form, missing "this creature" / "this artifact" antecedents.** Intrepid Paleontologist.

- **Granted-ability quotes are scanned for colon-frames.** Kitesail Larcenist's "become Treasure artifacts with \"{T}, Sacrifice this artifact: Add one mana of any color\"" produces 4 false positives: `has_activated_ability`, `add_mana`, `ramp_nonland`, `sacrifice_artifact`. Single fix: strip text inside paired quotes before scanning for effects/activation costs.

- **`condition.cares_lands` fires on "lands you control" inside additional-cost clauses without scaling/payoff.** Guardian of the Great Door.

---

## v0.14.1 batch — resolved 2026-05-26

The following per-card entries were resolved by the v0.14.1 rule changes (see
`SUBAGENT_COMMUNICATION.md` AGREED PLAN items 1–12). Cluster headers from the
audit batch preserved for context.

---

### Cluster: trigger.another_creature_etb self-leak (resolved by item 1)

## Queen's Bay Paladin  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Creature — Vampire Knight
**Mana cost:** {3}{B}{B}

**Oracle text:**

```
Whenever this creature enters or attacks, return up to one target Vampire card from your graveyard to the battlefield with a finality counter on it. You lose life equal to its mana value.
```

**Current tags:** `condition.cares_tribe.vampire`, `effect.life_changed`, `effect.reanimate`, `trigger.another_creature_etb`, `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **false-positive**: `trigger.another_creature_etb`
  - **What's wrong:** "Whenever this creature enters" is a self-ETB trigger. The rule fires on this card alongside the correct `trigger.self_etb`.
  - **Evidence vs reality:** Regex `whenever (?:a |another |one or more (?:nontoken )?)?(?:[\w\-]+ ){0,3}creatures?` accepts "this " in the `[\w\-]+` adjective slot. Self-ETB shouldn't double-tag as another-creature-ETB.
  - **Suggested fix:** narrow `trigger.another_creature_etb` to require "another " / "other " / "a creature other than" — explicitly exclude "this " / "__self__" prefixes.

---

## Sentinel of the Nameless City  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Creature — Merfolk Warrior Scout
**Mana cost:** {2}{G}

**Oracle text:**

```
Vigilance
Whenever this creature enters or attacks, create a Map token.
```

**Current tags:** `effect.create_map`, `effect.create_token`, `effect.has_vigilance`, `trigger.another_creature_etb`, `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **false-positive**: `trigger.another_creature_etb`
  - **What's wrong:** Same self-ETB → another-creature-ETB leakage.
  - **Suggested fix:** narrow as above.

---

## Threefold Thunderhulk  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Artifact Creature — Gnome
**Mana cost:** {7}

**Oracle text:**

```
This creature enters with three +1/+1 counters on it.
Whenever this creature enters or attacks, create a number of 1/1 colorless Gnome artifact creature tokens equal to its power.
{2}, Sacrifice another artifact: Put a +1/+1 counter on this creature.
```

**Current tags:** `effect.counter_modified`, `effect.create_creature_token`, `effect.create_token`, `effect.has_activated_ability`, `effect.plus_one_counter`, `effect.sacrifice_artifact`, `trigger.another_creature_etb`, `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **false-positive**: `trigger.another_creature_etb`
  - **What's wrong:** Same self-ETB leak.
  - **Suggested fix:** see cluster note.

---

## Visage of Dread // Dread Osseosaur  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Artifact // Creature — Dinosaur Skeleton Horror
**Mana cost:** (none)

**Oracle text:**

```
When this artifact enters, target opponent reveals their hand. You choose an artifact or creature card from it. That player discards that card.
...
Menace
Whenever this creature enters or attacks, you may mill two cards.
```

**Current tags:** `effect.has_menace`, `effect.mill`, `effect.targeted_discard`, `trigger.another_creature_etb`, `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **false-positive**: `trigger.another_creature_etb`
  - **What's wrong:** Back face's "Whenever this creature enters or attacks" is self-ETB; same leakage. (Front-face's "When this artifact enters" fires `trigger.self_etb` correctly via the artifact branch.)
  - **Suggested fix:** see cluster note.

---

### Cluster: typed-sacrifice leakage (edicts and triggers)

## Vito, Fanatic of Aclazotz  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Vampire Demon
**Mana cost:** {2}{W}{B}

**Oracle text:**

```
Flying
Whenever you sacrifice another permanent, you gain 2 life if this is the first time this ability has resolved this turn. If it's the second time, each opponent loses 2 life. If it's the third time, create a 4/3 white and black Vampire Demon creature token with flying.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.grants_evasion`, `effect.has_flying`, `effect.life_changed`, `effect.sacrifice_artifact`, `effect.sacrifice_creature`, `effect.sacrifice_enchantment`, `effect.sacrifice_land`, `effect.sacrifice_permanent`, `effect.sacrifice_planeswalker`, `trigger.permanent_sacrificed`

### Issues

- **false-positive**: `effect.sacrifice_artifact`, `effect.sacrifice_creature`, `effect.sacrifice_enchantment`, `effect.sacrifice_land`, `effect.sacrifice_permanent`, `effect.sacrifice_planeswalker` (six redundant tags)
  - **What's wrong:** All six typed/general sacrifice effects fire on "whenever you sacrifice another permanent" — a TRIGGER observing a sacrifice event, not the card's effect. Vito is an aristocrats payoff, not a sacrifice outlet. `trigger.permanent_sacrificed` correctly covers the actual semantic.
  - **Evidence vs reality:** PATTERN_BROAD (`sacrifice(?:s)? ... permanents?`) matches "sacrifice another permanent" anywhere — including inside a trigger clause. The rule has no trigger-frame exclusion.
  - **Suggested fix:** narrow all `effect.sacrifice_*` rules to exclude `whenever (you )?sacrifice` and `when(ever)? a permanent .* is sacrificed` trigger frames.

---

## Throne of the Grim Captain // The Grim Captain  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact // Legendary Creature — Skeleton Spirit Pirate
**Mana cost:** (none)

**Oracle text:**

```
{T}: Mill two cards.
Craft with a Dinosaur, a Merfolk, a Pirate, and a Vampire {4} (...)

Menace, trample, lifelink, hexproof
Whenever The Grim Captain attacks, each opponent sacrifices a nonland permanent of their choice. Then you may put an exiled creature card used to craft The Grim Captain onto the battlefield under your control tapped and attacking.
```

**Current tags:** `condition.cares_tribe.{dinosaur,merfolk,pirate,vampire}`, `effect.edict`, `effect.has_activated_ability`, `effect.has_hexproof`, `effect.has_lifelink`, `effect.has_menace`, `effect.has_trample`, `effect.mill`, `effect.sacrifice_artifact`, `effect.sacrifice_creature`, `effect.sacrifice_enchantment`, `effect.sacrifice_planeswalker`, `trigger.attack_or_block`

### Issues

- **false-positive**: `effect.sacrifice_artifact`, `effect.sacrifice_creature`, `effect.sacrifice_enchantment`, `effect.sacrifice_planeswalker` (edict → typed-sacrifice leakage)
  - **What's wrong:** "each opponent sacrifices a nonland permanent" is an edict (opponent-side sacrifice), correctly tagged as `effect.edict`. The typed sacrifice tags should NOT double-tag because this card's controller doesn't sacrifice anything.
  - **Evidence vs reality:** PATTERN_BROAD's `each\s+` arm matches "each opponent sacrifices a ... permanent". Same regex matches typed forms (PATTERN_OWN) via "each opponent sacrifices a [...] artifact/creature/etc.".
  - **Suggested fix:** add negative lookbehind for `(each |target |an? )opponent ` preceding the verb, or require a `you` / activation-cost subject.

---

## Tithing Blade // Consuming Sepulcher  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Artifact // Artifact
**Mana cost:** (none)

**Oracle text:**

```
When this artifact enters, each opponent sacrifices a creature of their choice.
Craft with creature {4}{B} (...)

At the beginning of your upkeep, each opponent loses 1 life and you gain 1 life.
```

**Current tags:** `effect.edict`, `effect.life_changed`, `effect.sacrifice_creature`, `trigger.self_etb`

### Issues

- **false-positive**: `effect.sacrifice_creature`
  - **What's wrong:** Same edict → typed-sacrifice leakage. "Each opponent sacrifices a creature" is an edict; the controller does not sacrifice.
  - **Suggested fix:** see Throne of the Grim Captain.
- **missing**: `trigger.upkeep` — see Recurring patterns.

---

### Cluster: manland / animation self-grant false positives

## Restless Anchorage  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Land
**Mana cost:** (none)

**Oracle text:**

```
This land enters tapped.
{T}: Add {W} or {U}.
{1}{W}{U}: Until end of turn, this land becomes a 2/3 white and blue Bird creature with flying. It's still a land.
Whenever this land attacks, create a Map token.
```

**Current tags:** `effect.add_mana`, `effect.create_map`, `effect.create_token`, `effect.grants_evasion`, `effect.has_activated_ability`, `effect.is_manland`, `trigger.attack_or_block`

### Issues

- **false-positive**: `effect.grants_evasion`
  - **What's wrong:** Manland self-animation grants flying to ITSELF, not to another creature/token. The tagDef scopes to "other creatures or to tokens it creates".
  - **Evidence vs reality:** Pattern[2] `becomes? a [^.]{0,40}\b(?:flying|menace|intimidate)\b` doesn't distinguish self-animation from anthem grants.
  - **Suggested fix:** anchor pattern[2] on "another"/"target"/"each"/token-create subject; or add a lookbehind for "this land becomes" / "__self__ becomes".

---

## Restless Reef  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Land
**Mana cost:** (none)

**Oracle text:**

```
This land enters tapped.
{T}: Add {U} or {B}.
{2}{U}{B}: Until end of turn, this land becomes a 4/4 blue and black Shark creature with deathtouch. It's still a land.
Whenever this land attacks, target player mills four cards.
```

**Current tags:** `condition.cares_deathtouch`, `effect.add_mana`, `effect.has_activated_ability`, `effect.is_manland`, `effect.mill`, `trigger.attack_or_block`

### Issues

- **false-positive**: `condition.cares_deathtouch`
  - **What's wrong:** Pattern matches "creature with deathtouch" inside the manland's self-animation clause. The card has no deathtouch payoff — the tagDef ("references deathtouch creatures as a payoff group") doesn't apply.
  - **Suggested fix:** apply the same `BECOMES_CREATURE` stripFraming idea used by `condition.cares_tribe` before matching, or exclude "with deathtouch" inside `becomes? a [...] creature with` frames.

---

## Restless Vents  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Land
**Mana cost:** (none)

**Oracle text:**

```
This land enters tapped.
{T}: Add {B} or {R}.
{1}{B}{R}: Until end of turn, this land becomes a 2/3 black and red Insect creature with menace. It's still a land.
Whenever this land attacks, you may discard a card. If you do, draw a card.
```

**Current tags:** `effect.add_mana`, `effect.draws_or_discards`, `effect.grants_evasion`, `effect.has_activated_ability`, `effect.is_manland`, `trigger.attack_or_block`

### Issues

- **false-positive**: `effect.grants_evasion`
  - **What's wrong:** Same manland self-animation pattern as Restless Anchorage — `becomes a 2/3 [...] creature with menace`.
  - **Suggested fix:** see Restless Anchorage.

---

### Cluster: Craft-pile / exile-pile coverage gaps (resolved by item 5) + cares_artifacts (item 6) + long-tail (item 7) + grants_<kw> (item 9) + new rules (items 10–12)

## Pit of Offerings  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Land — Cave
**Mana cost:** (none)

**Oracle text:**

```
This land enters tapped.
When this land enters, exile up to three target cards from graveyards.
{T}: Add {C}.
{T}: Add one mana of any of the exiled cards' colors.
```

**Current tags:** `effect.add_mana`, `effect.exile_from_graveyard`, `effect.has_activated_ability`, `trigger.self_etb`

### Issues

- **missing**: `condition.cares_exile_pile`
  - **What's wrong:** Second {T} activation scales on "any of the exiled cards' colors" — the exile zone is the resource for the mana ability. Rule's Pattern 2 only matches `exiled with __self__` / `exiled with this <type>`; this card uses the possessive "the exiled cards' colors".
  - **Suggested fix:** broaden `condition.cares_exile_pile` to match possessive/anaphoric references to "the exiled cards" within activated-ability bodies.

---

## Quintorius Kand  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Planeswalker — Quintorius
**Mana cost:** {3}{R}{W}

**Oracle text:**

```
Whenever you cast a spell from exile, Quintorius Kand deals 2 damage to each opponent and you gain 2 life.
+1: Create a 3/2 red and white Spirit creature token.
−3: Discover 4.
−6: Exile any number of target cards from your graveyard. Add {R} for each card exiled this way. You may play those cards this turn.
```

**Current tags:** `effect.add_mana`, `effect.create_creature_token`, `effect.create_token`, `effect.deals_damage`, `effect.discover`, `effect.exile_from_graveyard`, `effect.life_changed`, `effect.ramp_nonland`, `trigger.spell_cast`

### Issues

- **missing**: `condition.cares_exile_pile`
  - **What's wrong:** Two distinct exile-as-resource signals: "Whenever you cast a spell from exile" (cast-from-exile payoff) and "for each card exiled this way" (-6 ability scales on its own exile pile). Neither matches the three current patterns.
  - **Suggested fix:** broaden `condition.cares_exile_pile` to match `cast (a spell|target) from exile` and `each card exiled this way` (anaphoric exile-pile references).

---

## Sunbird Standard // Sunbird Effigy  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Artifact // Artifact Creature — Bird Construct
**Mana cost:** (none)

**Oracle text:**

```
{T}: Add one mana of any color.
Craft with one or more {5} (...)

Flying, vigilance, haste
Sunbird Effigy's power and toughness are each equal to the number of colors among the exiled cards used to craft it.
{T}: For each color among the exiled cards used to craft this creature, add one mana of that color.
```

**Current tags:** `effect.add_mana`, `effect.has_activated_ability`, `effect.has_flying`, `effect.has_haste`, `effect.has_vigilance`, `effect.ramp_nonland`

### Issues

- **missing**: `condition.cares_exile_pile`
  - **What's wrong:** Back face's P/T and mana ability scale on "the exiled cards used to craft it" / "the exiled cards used to craft this creature". Canonical Craft-pile scaling shape — pile rooted to this specific permanent.
  - **Suggested fix:** add `exiled cards used to craft (it|this <type>)` (and the more general `cards exiled (with|by) <self>` / `exiled with this <type>`) to `condition.cares_exile_pile`.

---

## The Enigma Jewel // Locus of Enlightenment  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact // Legendary Artifact
**Mana cost:** (none)

**Oracle text:**

```
The Enigma Jewel enters tapped.
{T}: Add {C}{C}. Spend this mana only to activate abilities.
Craft with four or more nonlands with activated abilities {8}{U} (...)

Locus of Enlightenment has each activated ability of the exiled cards used to craft it. You may activate each of those abilities only once each turn.
Whenever you activate an ability that isn't a mana ability, copy it. You may choose new targets for the copy.
```

**Current tags:** `condition.cares_activated_abilities`, `effect.add_mana`, `effect.has_activated_ability`, `effect.ramp_nonland`

### Issues

- **missing**: `condition.cares_exile_pile`
  - **What's wrong:** Back face's static ability scales on "the exiled cards used to craft it" — exile pile is the resource. Same Craft-pile shape as Sunbird Effigy.
  - **Suggested fix:** see Sunbird Standard.

---

### Cluster: cares_artifacts coverage gaps (Craft / ETB-this-turn variants)

## Master's Guide-Mural // Master's Manufactory  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Artifact // Artifact
**Mana cost:** (none)

**Oracle text:**

```
When this artifact enters, create a 4/4 white and blue Golem artifact creature token.
Craft with artifact {4}{W}{W}{U} (...)

{T}: Create a 4/4 white and blue Golem artifact creature token. Activate only if this artifact or another artifact entered the battlefield under your control this turn.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.has_activated_ability`, `trigger.self_etb`

### Issues

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** Activation gate "Activate only if this artifact or another artifact entered the battlefield under your control this turn" is a textbook artifact-ETB-this-turn condition. Pattern 6 requires `if/when an? artifacts entered`; here the subject is the disjunction "this artifact or another artifact".
  - **Suggested fix:** broaden Pattern 6 to also accept `if (this <type> or )?(another )?artifact entered the battlefield` and the implicit-determiner Craft-activation form.

---

## Shipwreck Sentry  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Creature — Human Pirate
**Mana cost:** {1}{U}

**Oracle text:**

```
Defender
As long as an artifact entered the battlefield under your control this turn, this creature can attack as though it didn't have defender.
```

**Current tags:** (none)

### Issues

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** "As long as an artifact entered the battlefield under your control this turn" is the same artifact-ETB-this-turn gate Pattern 6 handles via "if/when". Conjunction form ("as long as") not currently supported.
  - **Suggested fix:** broaden Pattern 6 to also accept `as long as an? artifacts? (has |have )?entered the battlefield under your control this turn`.

---

## Staunch Crewmate  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Creature — Human Pirate
**Mana cost:** {1}{U}

**Oracle text:**

```
When this creature enters, look at the top four cards of your library. You may reveal an artifact or Pirate card from among them and put it into your hand. Put the rest on the bottom of your library in a random order.
```

**Current tags:** `condition.cares_tribe.pirate`, `effect.look_at_top_n`, `trigger.self_etb`

### Issues

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** ETB filter is "an artifact or Pirate card" — `cares_tribe.pirate` correctly fired on the Pirate half; the parallel artifact-half is unrepresented. No current pattern catches "an artifact or X card" dig disjunctions.
  - **Suggested fix:** broaden `cares_artifacts` to fire on disjunctive dig/reveal/tutor filters like "an artifact or <X> card".

---

## Sunshot Militia  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Creature — Human Soldier
**Mana cost:** {1}{R}

**Oracle text:**

```
Tap two untapped artifacts and/or creatures you control: This creature deals 1 damage to each opponent. Activate only as a sorcery.
```

**Current tags:** `effect.deals_damage`, `effect.has_activated_ability`

### Issues

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** Activation cost "Tap two untapped artifacts and/or creatures you control" references artifacts as a tap resource. Pattern 3 `\bartifacts? you control\b` fails because "you control" qualifies "creatures" in the disjunction, not "artifacts".
  - **Suggested fix:** broaden `cares_artifacts` to match disjunctive cost forms like `artifacts? (and/or|or) [\w\s]+ you control`.

---

### Cluster: other precision / coverage findings

## Market Gnome  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Artifact Creature — Gnome
**Mana cost:** {W}

**Oracle text:**

```
When this creature dies, you gain 1 life and draw a card.
When this creature is exiled from the battlefield while you're activating a craft ability, you gain 1 life and draw a card.
```

**Current tags:** `effect.draws_or_discards`, `effect.life_changed`, `trigger.creature_dies`

### Issues

- **missing**: `trigger.creature_leaves_battlefield`
  - **What's wrong:** The second sentence is a LTB-exile trigger (Craft mechanic uses "is exiled from the battlefield" RAW). Rule's `LTB_VERB` only covers "leaves the battlefield" / "is put into a graveyard from the battlefield" — misses the exile-route LTB.
  - **Suggested fix:** broaden `LTB_VERB` to also include `is exiled from the battlefield`.

---

## Merfolk Cave-Diver  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Creature — Merfolk Scout
**Mana cost:** {2}{U}

**Oracle text:**

```
Whenever a creature you control explores, this creature gets +1/+0 until end of turn and can't be blocked this turn.
```

**Current tags:** `effect.explore`, `effect.grants_stat_buff`, `trigger.explored`

### Issues

- **false-positive / wrong-axis**: `effect.explore`
  - **What's wrong:** Card does NOT cause exploring; it observes the action via `trigger.explored`. The current `effect.explore.ts` regex `\bexplores?\b` fires on the trigger reference too. The rule's own comment acknowledges the dual-fire pattern, but the tagDef description ("a creature reveals the top...") implies an effect that causes exploring.
  - **Evidence vs reality:** the ONLY occurrence of "explores" on this card is inside the trigger clause "Whenever a creature you control explores".
  - **Suggested fix:** narrow `effect.explore` to require a verb-form imperative ("target creature explores", "it explores", pronoun-anaphora after a target clause); exclude bare `whenever ... explores` trigger frames.

---

## Nicanzil, Current Conductor  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Merfolk Scout
**Mana cost:** {G}{U}

**Oracle text:**

```
Whenever a creature you control explores a land card, you may put a land card from your hand onto the battlefield tapped.
Whenever a creature you control explores a nonland card, put a +1/+1 counter on Nicanzil.
```

**Current tags:** `effect.counter_modified`, `effect.explore`, `effect.plus_one_counter`, `trigger.explored`

### Issues

- **false-positive / wrong-axis**: `effect.explore`
  - **What's wrong:** Same as Merfolk Cave-Diver — only trigger references, no effect that causes exploring.
  - **Suggested fix:** see Merfolk Cave-Diver.
- **missing**: `effect.ramp_nonland` (or `effect.play_extra_land` broadening)
  - **What's wrong:** "you may put a land card from your hand onto the battlefield tapped" is the Plant Beans / Exploration shape — a free land drop, structurally a ramp source. Neither `effect.ramp_nonland` (add-mana + library-search) nor `effect.play_extra_land` (matches `play (?:an? )?additional lands?`) catches "put a land from hand onto battlefield".
  - **Suggested fix:** add a pattern to `effect.ramp_nonland` matching `put (?:a |target )?lands? card from your hand onto the battlefield`; or treat as a dedicated new tag if the family is wide enough.

---

## Molten Collapse  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {B}{R}

**Oracle text:**

```
Choose one. If you descended this turn, you may choose both instead.
• Destroy target creature or planeswalker.
• Destroy target noncreature, nonland permanent with mana value 1 or less.
```

**Current tags:** `condition.cares_low_mana_value`, `condition.descend`, `effect.cast_noncreature_spell`, `effect.destroy_creature`, `effect.destroy_planeswalker`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.destroy_artifact`, `effect.destroy_enchantment`
  - **What's wrong:** "Destroy target noncreature, nonland permanent" covers artifacts AND enchantments. Both rules' PATTERN_BROAD uses `(?:[\w\-]+\s+){0,5}?permanents?` which cannot cross the comma in "noncreature, nonland permanent".
  - **Evidence vs reality:** the post-determiner filler matches words separated by whitespace, but a comma+space gap breaks the match.
  - **Suggested fix:** broaden PATTERN_BROAD's filler to `(?:[\w\-]+[,\s]+){0,5}?` (admit commas — same fix PATTERN_OWN already uses for `destroy_artifact`). The existing negative lookahead for `nonartifact` / `nonenchantment` should still suppress true exclusions.

---

## Ojer Kaslem, Deepest Growth // Temple of Cultivation  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — God // Land
**Mana cost:** (none)

**Oracle text:**

```
Trample
Whenever Ojer Kaslem deals combat damage to a player, reveal that many cards from the top of your library. You may put a creature card and/or a land card from among them onto the battlefield. Put the rest on the bottom in a random order.
...
```

**Current tags:** `effect.add_mana`, `effect.has_activated_ability`, `effect.has_trample`, `effect.reanimate`, `trigger.creature_dies`, `trigger.damage_dealt`

### Issues

- **missing**: `effect.look_at_top_n`
  - **What's wrong:** "reveal that many cards from the top of your library" is the variable-N reveal frame. Rule's PATTERN_PLURAL requires "reveal the top <N> cards of library" — different syntactic order.
  - **Suggested fix:** add a pattern matching `reveal (?:that many|N) cards from the top of [\w\s']+ library`.

---

## Ojer Pakpatiq, Deepest Epoch // Temple of Cyclical Time  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — God // Land
**Mana cost:** (none)

**Oracle text:**

```
Flying
Whenever you cast an instant spell from your hand, it gains rebound. ...
```

**Current tags:** `effect.add_mana`, `effect.counter_modified`, `effect.has_activated_ability`, `effect.has_flying`, `effect.reanimate`, `trigger.creature_dies`, `trigger.spell_cast`

### Issues

- **missing**: `condition.cares_noncreature_spell`
  - **What's wrong:** "Whenever you cast an instant spell" is a noncreature-spell trigger restricted to a single subtype. Patterns 1/2/3 require "noncreature spell" or "instant or sorcery"; they miss instant-only or sorcery-only triggers.
  - **Suggested fix:** add a pattern matching `whenever [\w\s']+? cast(?:s|ed)? (?:a|an|one|another) (?:instant|sorcery) spell\b`.

---

## Ojer Taq, Deepest Foundation // Temple of Civilization  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — God // Land
**Mana cost:** (none)

**Oracle text:**

```
Vigilance
If one or more creature tokens would be created under your control, three times that many of those tokens are created instead.
...
```

**Current tags:** `effect.add_mana`, `effect.has_activated_ability`, `effect.has_vigilance`, `effect.reanimate`, `trigger.creature_dies`

### Issues

- **missing**: `condition.cares_tokens`
  - **What's wrong:** Replacement effect that gates on "creature tokens would be created" — textbook tokens-matter trigger. Current patterns cover "whenever ... create a token", "for each token", "tokens you control", "if you control N tokens"; the replacement-effect frame is unrepresented.
  - **Suggested fix:** add a pattern matching `if (?:a|one or more) [\w\s]+? tokens? would be created\b` to `condition.cares_tokens`.

---

## Palani's Hatcher  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Creature — Dinosaur
**Mana cost:** {3}{R}{G}

**Oracle text:**

```
Other Dinosaurs you control have haste.
When this creature enters, create two 0/1 green Dinosaur Egg creature tokens.
At the beginning of combat on your turn, if you control one or more Eggs, sacrifice an Egg, then create a 3/3 green Dinosaur creature token.
```

**Current tags:** `condition.cares_tribe.dinosaur`, `effect.create_creature_token`, `effect.create_token`, `effect.sacrifice_creature`, `trigger.beginning_of_combat`, `trigger.self_etb`

### Issues

- **missing**: `effect.grants_haste`
  - **What's wrong:** "Other Dinosaurs you control have haste" is a tribal anthem. `effect.grants_haste` exists parametrically but Frame (c) only matches `creatures you control have <kw>`. Tribal subjects ("Dinosaurs", "Pirates", etc.) aren't accepted.
  - **Suggested fix:** broaden Frame (c) to admit tribe nouns in the subject slot: `\b(?:creatures?|[A-Z]\w+s?) you control (?:has|have) <kw>`. (Generalize to the whole `effect.grants_keyword` family.)

---

## Petrify  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Enchantment — Aura
**Mana cost:** {1}{W}

**Oracle text:**

```
Enchant artifact or creature
Enchanted permanent can't attack or block, and its activated abilities can't be activated.
```

**Current tags:** (none)

### Issues

- **missing**: `effect.pacify`
  - **What's wrong:** Aura says "Enchanted permanent can't attack or block" — canonical pacify shape. Pattern requires `(?:enchanted|equipped|target|that|each) creatures` — "permanent" not accepted.
  - **Suggested fix:** broaden the subject alternation to also accept `permanents?` (with the existing "this turn / until end of turn" exclusion still in place).

---

## Ray of Ruin  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {4}{B}

**Oracle text:**

```
Exile target creature, Vehicle, or nonbasic land. Scry 1.
```

**Current tags:** `condition.cares_subtype.vehicle`, `effect.cast_noncreature_spell`, `effect.exile_creature`, `effect.exile_land`, `effect.is_instant_or_sorcery`, `effect.scry`

### Issues

- **missing**: `effect.exile_artifact`
  - **What's wrong:** Vehicle is always an artifact (CR 205.3g). The typed-permanent axis should fire `effect.exile_artifact` alongside `effect.exile_creature` / `effect.exile_land`. Pattern_OWN requires literal "artifact"; PATTERN_BROAD requires "permanent".
  - **Suggested fix:** add a Vehicle-subtype-as-artifact synonym arm to `effect.exile_artifact` (and consider parallel `effect.destroy_artifact` / `effect.bounce_artifact` for consistency).

---

## Spelunking  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Enchantment
**Mana cost:** {2}{G}

**Oracle text:**

```
When this enchantment enters, draw a card, then you may put a land card from your hand onto the battlefield. If you put a Cave onto the battlefield this way, you gain 4 life.
Lands you control enter untapped.
```

**Current tags:** `condition.cares_lands`, `condition.cares_subtype.cave`, `effect.draws_or_discards`, `effect.life_changed`, `trigger.self_etb`

### Issues

- **missing**: `effect.ramp_nonland` (or new "land into play from hand" tag)
  - **What's wrong:** "put a land card from your hand onto the battlefield" is a non-Land permanent ramp source. Current `effect.ramp_nonland` patterns cover add-mana producers and basic-land library tutors only.
  - **Suggested fix:** add a pattern matching `put (?:a |target )?lands? card from your hand onto the battlefield` (same broadening as Nicanzil).

---

## Squirming Emergence  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {1}{B}{G}

**Oracle text:**

```
Fathomless descent — Return to the battlefield target nonland permanent card in your graveyard with mana value less than or equal to the number of permanent cards in your graveyard.
```

**Current tags:** `condition.cares_graveyard`, `condition.descend`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.reanimate`
  - **What's wrong:** Card reanimates a graveyard permanent. Rule's Pattern 1 requires the canonical order `return → card → from graveyard → to battlefield`; this card flips it: `Return to the battlefield target ... card in your graveyard`.
  - **Evidence vs reality:** the regex matches `(?:returns?|puts?) [^.]*?cards?[^.]*?(?:from|that w[ae]s? in)[^.]*?graveyards?[^.]*?(?:to|onto) (?:the )?battlefield` — the "from ... graveyard ... to battlefield" tail requirement fails when the order is "to battlefield ... from graveyard".
  - **Suggested fix:** add an alternate-order pattern: `(?:returns?|puts?) (?:to|onto) (?:the )?battlefield [^.]*?cards? [^.]*?(?:from|in) (?:your |any |an opponent's )?graveyards?`.

---

## Tendril of the Mycotyrant  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Creature — Fungus Wizard
**Mana cost:** {1}{G}

**Oracle text:**

```
{5}{G}{G}: Put seven +1/+1 counters on target noncreature land you control. It becomes a 0/0 Fungus creature with haste. It's still a land.
```

**Current tags:** `condition.cares_lands`, `effect.counter_modified`, `effect.has_activated_ability`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.animate_land`
  - **What's wrong:** Activation turns a target noncreature land into a creature — textbook animate_land. Pattern requires `lands?\s+...becomes`; this card uses anaphoric "It becomes" in a separate sentence.
  - **Suggested fix:** add a pronoun-form alternate: after a "target ... land" anchor in the same effect block, allow `\bit\s+becomes? (?:a |an )?\d+\/\d+ [\w\s]{0,30}?creature\b`.
- **missing**: `effect.grants_haste`
  - **What's wrong:** Animation includes "with haste" — a keyword grant to the now-animated land. `effect.grants_haste` exists but Frame (e) requires the keyword to be preceded by a comma or "and" inside the with-clause; singular `with haste` falls through.
  - **Suggested fix:** broaden Frame (e) to allow the keyword as the SOLE item in the with-clause: `\b(?:is|becomes)\s+(?:a\s+|an\s+)?[\w\-/ ]{1,40}?with\s+${kw}\b`. (Apply to whole grants_keyword family.)

---

## The Ancient One  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Spirit God
**Mana cost:** {U}{B}

**Oracle text:**

```
Descend 8 — The Ancient One can't attack or block unless there are eight or more permanent cards in your graveyard.
{2}{U}{B}: Draw a card, then discard a card. When you discard a card this way, target player mills cards equal to its mana value.
```

**Current tags:** `condition.cares_graveyard`, `condition.descend`, `effect.draws_or_discards`, `effect.has_activated_ability`, `trigger.card_drawn_discarded`

### Issues

- **missing**: `effect.mill`
  - **What's wrong:** "target player mills cards equal to its mana value" — variable-N mill. Current pattern requires `mills? <NUM> cards` (literal number); doesn't accept "cards equal to" / variable-N forms.
  - **Suggested fix:** add `\bmills?\s+(?:a |that many |[NUM] )?cards?\s+equal to\b` (or accept bare `mills cards` followed by an equal-to clause).

---

## The Mycotyrant  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Elder Fungus
**Mana cost:** {1}{B}{G}

**Oracle text:**

```
Trample
The Mycotyrant's power and toughness are each equal to the number of creatures you control that are Fungi and/or Saprolings.
At the beginning of your end step, create X 1/1 black Fungus creature tokens with "This token can't block," where X is the number of times you descended this turn. ...
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.has_trample`, `trigger.beginning_of_end_step`

### Issues

- **missing**: `condition.descend`
  - **What's wrong:** "X is the number of times you descended this turn" is direct descend scaling. Rule's Pattern 2 requires `if you descended this turn`; this card's phrasing is "X is the number of times you descended this turn" — same predicate but with different lead-in.
  - **Suggested fix:** add a pattern matching `(?:number of times|each time) you descended this turn` (descend scaling without the gating "if").

---

## The Skullspore Nexus  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact
**Mana cost:** {6}{G}{G}

**Oracle text:**

```
This spell costs {X} less to cast, where X is the greatest power among creatures you control.
Whenever one or more nontoken creatures you control die, create a green Fungus Dinosaur creature token with base power and toughness each equal to the total power of those creatures.
{2}, {T}: Double target creature's power until end of turn.
```

**Current tags:** `effect.cost_reduction`, `effect.create_creature_token`, `effect.create_token`, `effect.has_activated_ability`

### Issues

- **missing**: `trigger.creature_dies`
  - **What's wrong:** "Whenever one or more nontoken creatures you control die" — plural form. Rule's regex requires `(?:creature|__self__)` singular; "creatures die" not handled.
  - **Suggested fix:** broaden to allow plural: `(?:creatures?|__self__)(?:\s+[\w'+\/\-]+){0,10}\s+(?:dies|die)`.
- **missing**: `condition.cares_high_power`
  - **What's wrong:** "where X is the greatest power among creatures you control" — pattern requires the literal phrase `with the greatest power`. This card says `is the greatest power`.
  - **Suggested fix:** broaden the alternative to also accept `(?:is|the) greatest power\b`.

---

## Thousand Moons Infantry  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Creature — Human Soldier
**Mana cost:** {2}{W}

**Oracle text:**

```
Untap this creature during each other player's untap step.
```

**Current tags:** `effect.untap`

### Issues

- **false-positive (borderline)**: `effect.untap`
  - **What's wrong:** Static self-untap rider (vigilance-adjacent). TagDef says "soft control / removal effect" — self-untap isn't that. The regex's `(?:[\w\-]+ ){0,3}` admits "this " before "creature".
  - **Evidence vs reality:** the rule's self-untap test (Yenna, Redtooth Regent) targets `untap __self__`. "Untap this creature during X" is a different shape — a static modifier on combat untap.
  - **Suggested fix:** either narrow `effect.untap` to exclude `untap this creature during (?:each other player's )?untap step` static frames, OR document that vigilance-style self-untap is in scope and adjust the tagDef.

---

## Tishana's Tidebinder  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Creature — Merfolk Wizard
**Mana cost:** {2}{U}

**Oracle text:**

```
Flash
When this creature enters, counter up to one target activated or triggered ability. If an ability of an artifact, creature, or planeswalker is countered this way, that permanent loses all abilities for as long as this creature remains on the battlefield.
```

**Current tags:** `effect.counterspell`, `effect.has_flash`, `trigger.self_etb`

### Issues

- **false-positive (counter ability vs counter spell)**: `effect.counterspell`
  - **What's wrong:** TagDef says "Counters a target spell on the stack" but the regex accepts `spell|ability`. This card counters abilities (Stifle effect), not spells.
  - **Evidence vs reality:** PATTERN matches `counter up to one target activated or triggered ability`.
  - **Suggested fix:** narrow `effect.counterspell` to require `spell\b`; consider authoring `effect.stifle` as a sibling axis if the family broadens.

---

## Twists and Turns // Mycoid Maze  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Enchantment // Land — Cave
**Mana cost:** (none)

**Oracle text:**

```
If a creature you control would explore, instead you scry 1, then that creature explores.
When this enchantment enters, target creature you control explores.
When a land you control enters, if you control seven or more lands, transform this enchantment.

(Transforms from Twists and Turns.)
...
```

**Current tags:** `condition.cares_lands`, `effect.add_mana`, `effect.explore`, `effect.has_activated_ability`, `effect.look_at_top_n`, `effect.scry`, `trigger.self_etb`

### Issues

- **missing**: `trigger.landfall` / `trigger.another_land_etb` (no land-ETB trigger axis exists)
  - **What's wrong:** "When a land you control enters" is the canonical landfall trigger. Catalog has no such tag.
  - **Suggested fix:** see Recurring patterns.

---

## Unlucky Drop  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {3}{U}

**Oracle text:**

```
Target artifact or creature's owner puts it on their choice of the top or bottom of their library.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.tuck_to_library`
  - **What's wrong:** Rule exists and Frame A specifically targets this shape, but anchors on `owner of target X puts it`. This card flips the possessive: `target X's owner puts it`.
  - **Evidence vs reality:** Frame A regex `\b(?:the )?owner of target [^.]+? puts? ...` doesn't match the possessive form `target ... 's owner puts ...`.
  - **Suggested fix:** add a possessive Frame A2: `\btarget [\w\s,]+?'s owner puts? (?:it|them) on (?:their|its) (?:choice of (?:the )?top or bottom|(?:the )?(?:top|bottom)) of (?:their|its owner's) library\b`.
# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

The bulk of the 2026-05-26 audit batch was resolved in `v0.14.1` (see `SUBAGENT_COMMUNICATION.md` AGREED PLAN items 1–12; resolved entries moved to `CARD_ISSUES_RESOLVED.md`). What remains below is the explicitly-deferred subset (AGREED PLAN items 13–18) — keep these on the radar for v0.14.2 or a future audit round.

---

## Recurring patterns (deferred — items 13–18)

### Coverage gaps (do not relitigate per card)

- **`condition.cares_counters` (non +1/+1) does not exist.** Catalog only covers `condition.cares_plus_one_counter`. The Millennium Calendar gates a trigger on "1,000 or more time counters" — counter-threshold scaling on time/charge/loyalty/age/lore counters has no representation. Family-level coverage gap. (AGREED PLAN item 15.)

- **`effect.has_defender` does not exist.** Shipwreck Sentry is a Wall-shell card. Defender keyword has no representation. Low-priority — defender doesn't pair with many payoffs in Standard. (AGREED PLAN item 15.)

- **`effect.cheat_into_play` / put-card-onto-battlefield-from-exile gap.** Throne of the Grim Captain's "you may put an exiled creature card used to craft The Grim Captain onto the battlefield" is reanimate-from-exile, not graveyard. Already noted in CARD_ISSUES_RESOLVED's Sneak Attack family. (AGREED PLAN item 15.)

- **`condition.cast_from_graveyard` is keyword-only.** Tarrian's Journal grants "you may cast a creature spell from your graveyard this turn" as an effect. Neither `cast_from_graveyard` (keyword-gated) nor `cares_graveyard` (scaling/threshold) fires. Coverage gap for non-keyword cast-from-graveyard effects. (AGREED PLAN item 15.)

- **`effect.clone_in_place` and spell-copy from "becomes a copy of that spell".** The Everflowing Well's back face: "up to one other target permanent you control becomes a copy of that spell until end of turn." Spell-copy belongs to the `effect.copy_spell` family rather than the permanent-copy `clone_in_place` axis. (AGREED PLAN item 18 — intentional exclusion.)

- **`condition.cares_artifacts.pairsWith` wiring to artifact producers.** `create_treasure`, `create_clue`, `create_food`, `create_map`, `trigger.another_artifact_etb` should pair with `cares_artifacts`. The v0.14.1 batch broadened the rule but left the pairings unwired. (AGREED PLAN item 16 — v0.14.2 follow-up.)

- **`condition.cares_exile_pile → effect.exile_from_graveyard` pairings.** Exile-from-graveyard producers feed the exile pile; the pairing edge is missing. (AGREED PLAN item 17 — v0.14.2 follow-up.)

- **`effect.stifle` dedicated tag.** Narrowed `effect.counterspell` to `\bspell\b` in v0.14.1 (item 7) resolves Tishana retag. Author a dedicated `effect.stifle` only if a 2nd ability-counter card surfaces. (AGREED PLAN item 14 — deferred until a 2nd card appears.)

### Precision bugs (existing rules that over-/under-match systemically)

- **`effect.grants_evasion` fires on anaphoric self-pump ("it gains menace").** Pattern[1]'s lookbehind `(?<!\bthis (?:creature|...) )(?<!\b__self__ )` blocks "this creature/artifact/..." and "__self__" but doesn't block bare "it" antecedents. Vito's Inquisitor: "{B}, Sacrifice another...: Put a +1/+1 counter on this creature. **It gains menace until end of turn.**" — the "it" refers to __SELF__ but isn't blocked. (AGREED PLAN item 13 — sentence-scoped anaphor resolution is out of regex scope; accept the 1-card FP and revisit if a 2nd card surfaces.)

### Reminder-text false negatives (deliberately ignored)

Several agents flagged "missing" tags whose evidence comes from Craft reminder text in parentheses (e.g. Oteclan Landmark's "another artifact you control", Throne of the Grim Captain's exile_from_graveyard claim from the Craft cost reminder). Per `normalize.ts` `stripReminderText`, paren content is stripped pre-tag. These are NOT logged as issues. Agents should be reminded that Craft's cost line is real oracle text only on the front face's "Craft with artifact {N}" header; the parenthetical that follows IS reminder text.

---

## Per-card entries (deferred)

### Cluster: manland / animation self-grant false positives (item 13 anaphoric "it" defer)


## Vito's Inquisitor  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Creature — Vampire Knight
**Mana cost:** {3}{B}

**Oracle text:**

```
{B}, Sacrifice another creature or artifact: Put a +1/+1 counter on this creature. It gains menace until end of turn.
```

**Current tags:** `effect.counter_modified`, `effect.grants_evasion`, `effect.has_activated_ability`, `effect.plus_one_counter`, `effect.sacrifice_artifact`, `effect.sacrifice_creature`

### Issues

- **false-positive**: `effect.grants_evasion`
  - **What's wrong:** "It gains menace until end of turn" — anaphoric "it" refers to __SELF__ (this creature). Pattern[1]'s lookbehind only blocks `this <type>` and `__self__` subjects, not "it". Self-pump shouldn't fire an anthem-style grant tag.
  - **Evidence vs reality:** Pattern[1] matches " gains menace" with no preceding `this creature`/`__self__` token.
  - **Suggested fix:** extend the lookbehind to also block " it " when the prior clause established __SELF__ as the referent; OR restrict frame[1] subjects to anthem/token/other-targeting clauses.

---


### Cluster: deferred coverage gaps (item 15)


## Tarrian's Journal // The Tomb of Aclazotz  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact — Book // Legendary Land — Cave
**Mana cost:** (none)

**Oracle text:**

```
{T}, Sacrifice another artifact or creature: Draw a card. Activate only as a sorcery.
{2}, {T}, Discard your hand: Transform Tarrian's Journal.

(Transforms from Tarrian's Journal.)
{T}: Add {B}.
{T}: You may cast a creature spell from your graveyard this turn. If you do, it enters with a finality counter on it and is a Vampire in addition to its other types. ...
```

**Current tags:** `condition.cares_tribe.vampire`, `effect.add_mana`, `effect.counter_modified`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.sacrifice_artifact`, `effect.sacrifice_creature`

### Issues

- **missing**: graveyard-as-resource condition (no exact tag fits)
  - **What's wrong:** Back face's "You may cast a creature spell from your graveyard this turn" is a graveyard-as-casting-source effect. `condition.cast_from_graveyard` is keyword-only (Flashback, Disturb, etc.) and won't fire. `condition.cares_graveyard` is design-scoped to delirium/threshold scaling (per its docstring) and shouldn't fire either.
  - **Suggested fix:** either broaden `condition.cast_from_graveyard` to also match effect-granted casting from graveyard ("you may cast a [\w]+ spell from your graveyard"), or author a sibling tag. Borderline coverage gap.

---


## The Everflowing Well // The Myriad Pools  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact // Legendary Artifact Land
**Mana cost:** (none)

**Oracle text:**

```
When The Everflowing Well enters, mill two cards, then draw two cards.
Descend 8 — At the beginning of your upkeep, if there are eight or more permanent cards in your graveyard, transform The Everflowing Well.

(Transforms from The Everflowing Well.)
{T}: Add {U}.
Whenever you cast a permanent spell using mana produced by The Myriad Pools, up to one other target permanent you control becomes a copy of that spell until end of turn.
```

**Current tags:** `condition.cares_graveyard`, `condition.descend`, `effect.add_mana`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.mill`, `trigger.self_etb`, `trigger.spell_cast`

### Issues

- **missing**: `effect.clone_in_place`
  - **What's wrong:** Back-face static "up to one other target permanent you control becomes a copy of that spell until end of turn" is the canonical clone-in-place phrasing.
  - **Suggested fix:** verify `effect.clone_in_place` (if it exists) anchors on "becomes a copy of" and confirm DFC concatenation isn't filtering it. If the tag does not exist, the resolved-issues note about "becomes a copy" in-place clone already calls out the gap.

---

## The Millennium Calendar  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact
**Mana cost:** {1}

**Oracle text:**

```
Whenever you untap one or more permanents during your untap step, put that many time counters on The Millennium Calendar.
{2}, {T}: Double the number of time counters on The Millennium Calendar.
When there are 1,000 or more time counters on The Millennium Calendar, sacrifice it and each opponent loses 1,000 life.
```

**Current tags:** `effect.counter_modified`, `effect.has_activated_ability`, `effect.untap`

### Issues

- **false-positive**: `effect.untap`
  - **What's wrong:** Card has no untap effect; the only "untap" mention is inside the trigger "Whenever you untap one or more permanents". Pattern's `(?:up to (?:one|...) |all )?(?:target )?(?:[\w\-]+ ){0,3}` admits "one or more " (three word-tokens) before "permanents", so the trigger frame matches the effect regex.
  - **Suggested fix:** narrow `effect.untap` to exclude `whenever you untap` / `whenever (?:[\w\s]+?) untap(s|ped)` trigger-frame contexts.
- **missing**: `trigger.tapped_or_untapped`
  - **What's wrong:** "Whenever you untap one or more permanents during your untap step" is the canonical tapped/untapped trigger.
- **missing**: `effect.life_changed`
  - **What's wrong:** "each opponent loses 1,000 life" — pattern's `\d+ life` doesn't span the comma in "1,000". Fix: relax the digit slot to `[\d,]+`.
- **missing**: `effect.sacrifice_artifact` (self-sac on an artifact card)
  - **What's wrong:** "sacrifice it" with "it" = __SELF__ on an Artifact card. The rule's `matchCard` branch requires the literal `__self__` token, not pronoun "it".
  - **Suggested fix:** broaden the matchCard arm to also match `sacrifice it\b` when `card.types.includes('Artifact')` AND a `__SELF__` referent was established earlier in the text.

---

---

## Warden of the Inner Sky  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Creature — Human Soldier
**Mana cost:** {W}

**Oracle text:**

```
As long as this creature has three or more counters on it, it has flying and vigilance.
Tap three untapped artifacts and/or creatures you control: Put a +1/+1 counter on this creature. Scry 1. Activate only as a sorcery.
```

**Current tags:** `condition.cares_artifacts`, `effect.counter_modified`, `effect.grants_evasion`, `effect.grants_vigilance`, `effect.has_activated_ability`, `effect.plus_one_counter`, `effect.scry`

### Issues

- **false-positive**: `effect.grants_evasion`
  - **What's wrong:** Self-anaphoric leak. The "has flying" predicate refers back to "this creature" via the pronoun "it" — the card grants flying to ITSELF (conditionally), not to other creatures.
  - **Evidence vs reality:** evidence was `"has flying"` but the full clause is "As long as this creature has three or more counters on it, **it has flying** and vigilance." Same family as the manland/self-animation pattern called out in the skill's "Recurring patterns" section (Restless cycle), and adjacent to the anaphoric "it gains <kw>" leak (Pattern[1]) — except here the verb is `has` rather than `gains`.
  - **Suggested fix:** Extend `effect.grants_evasion`'s subject-exclusion lookbehind to block bare anaphoric `it has <kw>` when the antecedent is `__SELF__`/`this creature`. May also need to consider a "while/as long as X, it has Y" template specifically.

- **false-positive**: `effect.grants_vigilance`
  - **What's wrong:** Same self-anaphoric leak as `grants_evasion`. Vigilance here is a conditional self-static ability, not a grant to one or more (other) creatures.
  - **Evidence vs reality:** evidence was `"has flying and vigilance"`. Subject is "it" → "this creature". The tagDef says "Grants the vigilance keyword to one or more creatures (temporary or perpetual)" — the intended use is anthem-grants / target-grants to OTHERS.
  - **Suggested fix:** Mirror whatever lookbehind/subject exclusion lands for `grants_evasion`. If desired, route conditional self-static "has <kw>" cards to `effect.has_<kw>` instead — but those tagDefs currently say "as a printed intrinsic ability," which is a slight semantic stretch for conditional grants. Either broaden `has_*` to include conditional self-grants, or simply do not tag this kind of card under either axis.

- **missing**: `effect.gains_keyword_self_conditional`
  - **What's wrong:** `gains_keyword_self_conditional`'s description ("This creature/permanent gains an evasion keyword (flying, menace, intimidate) under a gating condition") matches Warden's flying clause exactly. Should fire on "As long as this creature has three or more counters on it, it has flying" — but didn't. Likely the rule's pattern requires `gains` rather than `has`, or anchors on a different "while/as long as" template.
  - **Evidence vs reality:** missing — the gating condition is `"as long as this creature has three or more counters on it"` and the keyword is `"flying"` (one of the in-scope keywords).
  - **Suggested fix:** Broaden `effect.gains_keyword_self_conditional`'s pattern to also accept `(it|this creature|__SELF__) has <kw>` inside a "while/as long as/if" frame, not just `gains`. Pairs naturally with narrowing `grants_evasion` for the false-positive above — once gains_keyword_self_conditional captures these cards, grants_evasion can safely exclude them.


---

## Zoyowa Lava-Tongue  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Legendary Creature — Goblin Warlock
**Mana cost:** {B}{R}

**Oracle text:**

```
Deathtouch
At the beginning of your end step, if you descended this turn, each opponent may discard a card or sacrifice a permanent of their choice. Zoyowa deals 3 damage to each opponent who didn't.
```

**Current tags:** `condition.descend`, `effect.draws_or_discards`, `effect.has_deathtouch`, `effect.sacrifice_artifact`, `effect.sacrifice_creature`, `effect.sacrifice_enchantment`, `effect.sacrifice_land`, `effect.sacrifice_permanent`, `effect.sacrifice_planeswalker`, `trigger.beginning_of_end_step`

### Issues

- **false-positive (×6)**: `effect.sacrifice_artifact`, `effect.sacrifice_creature`, `effect.sacrifice_enchantment`, `effect.sacrifice_land`, `effect.sacrifice_permanent`, `effect.sacrifice_planeswalker`
  - **What's wrong:** Classic edict-frame leak (Recurring pattern: "Typed-sacrifice leakage onto edicts and observer triggers"). The card forces opponents to sacrifice — the controller isn't sacrificing anything. All six typed-sacrifice tags + the generic `sacrifice_permanent` fired off the same evidence substring.
  - **Evidence vs reality:** evidence was `"sacrifice a permanent"`, but the full clause is "each opponent may discard a card or **sacrifice a permanent** of their choice." Subject is `each opponent`, not the controller. This is exactly the Vito-pattern leak's Pattern A (edict frame).
  - **Suggested fix:** Add an `each\s+opponent` / `target\s+opponent` subject exclusion to the `_OWN` alternation in the typed-sacrifice rules (and the generic `effect.sacrifice_permanent`). Same fix shape as proposed for prior edict false positives — see existing CARD_ISSUES entries for the Vito-pattern.

- **missing**: `effect.edict`
  - **What's wrong:** This is the textbook edict — "each opponent may discard a card or sacrifice a permanent of their choice." `effect.edict`'s tagDef ("Forces an opponent or each player to sacrifice a creature or permanent — Diabolic Edict / Innocent Blood family. Pairs with opponent-side dies triggers.") matches exactly, but the tag didn't fire.
  - **Evidence vs reality:** missing — clause `"each opponent may ... sacrifice a permanent of their choice"` should be a match. The `may` (optional, as part of a punishing choice) may be what's blocking the rule, since classic edicts are hard ("target opponent sacrifices…").
  - **Suggested fix:** Broaden `effect.edict` to accept "each opponent may <thing> or sacrifice a permanent" (Rack/Wrench-style punisher edicts). Make sure the test fixtures cover the punisher template.

- **missing**: `effect.targeted_discard`
  - **What's wrong:** "Each opponent may discard a card" should fire `effect.targeted_discard` (the description explicitly says "or each opponent"). Currently only `effect.draws_or_discards` fires off this clause, which is the generic self-loot axis.
  - **Evidence vs reality:** missing — clause is `"each opponent may discard a card"`. Likely the `may` qualifier is what's blocking.
  - **Suggested fix:** Broaden `effect.targeted_discard` to accept the punisher-edict frame ("each opponent may discard a card or <else>"). Same broadening shape as the `effect.edict` fix above — they're the two sides of a punisher.

- **missing**: `effect.deals_damage`
  - **What's wrong:** "Zoyowa deals 3 damage to each opponent who didn't" is a straightforward damage-to-players effect. The generic tag is described as "Deals damage to a player, permanent, or planeswalker" — should match.
  - **Evidence vs reality:** missing — clause `"<__SELF__> deals 3 damage to each opponent"` should be a match. Likely the rule anchors on a target syntax and the `each opponent who didn't` qualifier doesn't fit.
  - **Suggested fix:** Broaden `effect.deals_damage` to accept `each opponent` / `each opponent <qualifier>` as a damage destination, alongside `target player`/`target creature`.


---

## Agency Outfitter  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Creature — Sphinx Detective
**Mana cost:** {4}{U}{U}

**Oracle text:**

```
Flying
When this creature enters, you may search your graveyard, hand and/or library for a card named Magnifying Glass and/or a card named Thinking Cap and put them onto the battlefield. If you search your library this way, shuffle.
```

**Current tags:** `effect.has_flying`, `trigger.self_etb`

### Issues

- **missing (narrow / borderline)**: `effect.tutor_any`
  - **What's wrong:** The card searches the **library** for a named card and puts it onto the battlefield. `effect.tutor_any` covers "Searches library for any card (no subtype restriction)" — a named tutor IS a tutor.
  - **Evidence vs reality:** missing — clause includes `"search your ... library for a card named ..."`. Rule likely anchors on `search your library for a creature card` or `for a card` and may not handle the `for a card named X and/or a card named Y` template.
  - **Suggested fix:** Broaden `effect.tutor_any` to accept `search your library for a card named .+(?: and/or a card named .+)?`. Low-priority — name-specific tutors are rare. Consider only if a second case surfaces.


---

## Alley Assailant  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Creature — Vampire Rogue
**Mana cost:** {2}{B}

**Oracle text:**

```
This creature enters tapped.
Disguise {4}{B}{B} (You may cast this card face down for {3} as a 2/2 creature with ward {2}. Turn it face up any time for its disguise cost.)
When this creature is turned face up, target opponent loses 3 life and you gain 3 life.
```

**Current tags:** `effect.life_changed`

### Issues

- **missing**: `effect.has_disguise` (no such tag exists — family-level coverage gap)
  - **What's wrong:** Disguise (MKM keyword) has no catalog representation. It's a face-down/face-up morph variant on 38 Standard cards (Alley Assailant, Aurelia's Vindicator, Basilica Stalker, Bolrac-Clan Basher, Branch of Vitu-Ghazi, Bubble Smuggler, Concealed Weapon, Coveted Falcon, …). Companion mechanic Cloak (5 cards) and the broader "turned face up" trigger frame (35 cards) are also unrepresented.
  - **Evidence vs reality:** missing — keyword line `"Disguise {4}{B}{B}"` and the trigger line `"When this creature is turned face up, ..."` both have no matching tag. Reminder text strips, so `ward` from the reminder doesn't survive.
  - **Suggested fix:** Author the keyword family: `effect.has_disguise`, `effect.has_cloak`, `trigger.turn_face_up`, and (optionally) `condition.cares_face_down`. Pair `trigger.turn_face_up` with effects that gate on flipping face-up — most disguise cards have ETB-on-flip payoffs (here, the drain). Family scope: 38 disguise + 5 cloak + ~35 "turned face up" cards.
  - **Note:** This entry is recorded under Alley Assailant since it's the first audited case. Do NOT relitigate per-card for the remaining disguise/cloak cards — refer back to this entry.

- **missing**: `trigger.turn_face_up` (component of disguise family above)
  - **What's wrong:** "When this creature is turned face up" is the trigger framing that pairs with disguise/cloak. Without it, the drain effect (currently tagged only as `effect.life_changed`) has no trigger context — the graph can't connect the face-up trigger to its payoffs.
  - **Suggested fix:** Part of the disguise family rule batch — author concurrently with `effect.has_disguise`.


---

## Anzrag's Rampage  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Sorcery
**Mana cost:** {3}{R}{R}

**Oracle text:**

```
Destroy all artifacts you don't control, then exile the top X cards of your library, where X is the number of artifacts that were put into graveyards from the battlefield this turn. You may put a creature card exiled this way onto the battlefield. It gains haste. Return it to your hand at the beginning of the next end step.
```

**Current tags:** `effect.board_wipe`, `effect.cast_noncreature_spell`, `effect.destroy_artifact`, `effect.exile_from_library`, `effect.grants_haste`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.bounce_creature`
  - **What's wrong:** "Return it to your hand at the beginning of the next end step" — this is the textbook "blink-back" bounce of the cheated-in creature. `effect.bounce_creature`'s description includes "Returns a creature to hand, or exiles and returns it (re-triggering ETB)." Should fire on the delayed-trigger bounce.
  - **Evidence vs reality:** missing — clause `"return it to your hand at the beginning of the next end step"`. Antecedent of "it" is the creature you put onto the battlefield three sentences earlier (the cheated-in creature). Same anaphoric-removal blind spot as Agrus Kos.
  - **Suggested fix:** Broaden `effect.bounce_creature` to recognize `return it to (your|its owner's) hand` when the "it" antecedent is a creature established earlier in the same paragraph. Conservative variant: also accept the bare `return it to (your|its owner's) hand at the beginning of (the next )?end step` frame (cheat-back pattern).

- **missing**: `trigger.beginning_of_end_step`
  - **What's wrong:** "Return it to your hand at the beginning of the next end step" is a delayed end-step trigger created by the spell's resolution. `trigger.beginning_of_end_step` says "Has an ability that triggers at the beginning of an end step." Delayed triggers count.
  - **Evidence vs reality:** missing — clause `"at the beginning of the next end step"` should be a match. Likely the rule's regex anchors on a printed `at the beginning of (your|each|the) end step` from a permanent's static text and skips the `the next end step` delayed-trigger frame.
  - **Suggested fix:** Broaden `trigger.beginning_of_end_step` to also accept `at the beginning of (the next|the next player's)? end step` (delayed-trigger frame on spells).

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** Card scales X off "the number of artifacts that were put into graveyards from the battlefield this turn." That's clearly artifact-cares for deckbuilding, but `condition.cares_artifacts` is described as "References artifact count, artifact ETBs, or artifacts you control" — the rule likely doesn't recognize an artifact-death-count clause.
  - **Evidence vs reality:** missing — clause `"the number of artifacts that were put into graveyards from the battlefield this turn"`. This is the artifact-aristocrat archetype (sacrifice/death of artifacts as a payoff).
  - **Suggested fix:** Either broaden `condition.cares_artifacts` to also accept `artifacts (that )?(were|have been) put into (your )?graveyards?` / `artifacts (that )?died` (artifact-death framing), OR author a sibling `condition.cares_artifact_dies` analogous to `condition.cares_creatures_died_this_turn`. Sibling-tag approach is probably cleaner since it lines up with the existing creatures-died axis.

- **missing (deferred)**: `effect.cheat_into_play`
  - "You may put a creature card exiled this way onto the battlefield" is the persistent `effect.cheat_into_play` coverage gap already documented in the recurring patterns section. Anzrag's Rampage is another data point for that gap.


---

## Anzrag, the Quake-Mole  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Legendary Creature — Mole God
**Mana cost:** {2}{R}{G}

**Oracle text:**

```
Whenever Anzrag becomes blocked, untap each creature you control. After this phase, there is an additional combat phase.
{3}{R}{R}{G}{G}: Anzrag must be blocked each combat this turn if able.
```

**Current tags:** `effect.has_activated_ability`, `effect.untap`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.extra_combat` (no such tag exists — family-level coverage gap)
  - **What's wrong:** Extra-combat-phase effects have no catalog representation. Appears on ~10 Standard cards (Anzrag the Quake-Mole, Great Train Heist, Fear of Missing Out, Aurelia the Warleader, Full Throttle, All-Out Assault, Balthier and Fran, Genji Glove, …). Distinct mechanic from beginning-of-combat triggers — these grant an additional attack step.
  - **Suggested fix:** Author `effect.extra_combat`. Pair with `trigger.beginning_of_combat` (additional combats also fire begin-of-combat triggers) and with combat-payoff conditions like `condition.cares_attacking` (also a gap below).
  - **Note:** First audited case of this family. Refer back here for the other 9.

- **missing**: `effect.lure` / `effect.must_be_blocked` (no such tag exists — family-level coverage gap)
  - **What's wrong:** "Must be blocked if able" / Lure-style effects have no catalog tag. Appears on 8 Standard cards (Disturbed Slumber, Anzrag the Quake-Mole, Fear of Being Hunted, Joraga Invocation, Magitek Scythe, The Masamune, Vinebred Brawler, Raphael Ninja Destroyer).
  - **Suggested fix:** Author `effect.lure` (covers both "must be blocked" and the related goad). Small family but distinct mechanic from combat triggers and from `effect.pacify`. Low-priority — likely defer to a wider combat-axis batch.

- **borderline**: `trigger.attack_or_block` on "becomes blocked"
  - **What's wrong:** Description is "Triggers when a creature attacks or blocks." Anzrag's clause is "whenever Anzrag becomes blocked" — Anzrag is the attacker BEING BLOCKED, not blocking. Semantic stretch but not strictly wrong, since the trigger does fire during the declare-blockers step.
  - **Suggested fix:** Either broaden the description to "attacks, blocks, or becomes blocked," OR (preferred) author a distinct `trigger.becomes_blocked` for the attacker-side combat trigger and narrow `attack_or_block`. The attacker-blocked frame pairs naturally with `effect.lure` / `effect.must_be_blocked` cards above. Low-priority — leave alone until the combat-axis batch.


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

**Current tags:** `effect.cast_noncreature_spell`, `effect.counter_modified`, `effect.exile_artifact`, `effect.exile_enchantment`, `effect.is_instant_or_sorcery`, `effect.plus_one_counter`, `effect.tutors_creature`

### Issues

- **missing (borderline / coverage gap)**: ramp + tutor framing
  - **What's wrong:** Mode 1 of the charm reads "Search your library for a creature or land card ... Put it onto the battlefield tapped if it's a land card." If you pick a land, this is non-basic ramp (any land, into play tapped). `effect.ramp_nonland`'s description restricts to "fetches a **basic** land directly into play" — so Archdruid's Charm doesn't match cleanly. `effect.tutors_basic_land` similarly basic-restricts. The only tutor tag that fires is `effect.tutors_creature` for the creature half of the choice.
  - **Evidence vs reality:** missing — clause `"search your library for a creature or land card ... put it onto the battlefield tapped if it's a land card"` has no tag that captures the land-ramp half.
  - **Suggested fix:** Either broaden `effect.ramp_nonland` to drop the "basic" restriction (most ramp payoffs care about ANY land entering, not just basic), OR author a sibling `effect.ramp_any_land` for non-basic ramp. The wider broadening probably has more graph value — pairs naturally with `trigger.landfall` and `condition.cares_lands`.


---

## Assemble the Players  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Enchantment
**Mana cost:** {1}{W}

**Oracle text:**

```
You may look at the top card of your library any time.
Once each turn, you may cast a creature spell with power 2 or less from the top of your library.
```

**Current tags:** `condition.cares_low_power`, `effect.look_at_top_n`

### Issues

- **missing**: `effect.cast_from_library_top` (no such tag exists — family-level coverage gap)
  - **What's wrong:** "May cast spells from the top of your library" is a distinct mechanic — Future Sight / Vivien Champion / Garruk's Horde family — and has no catalog representation. Appears on ~8 Standard cards (Johann Apprentice Sorcerer, Case of the Locked Hothouse, Vizier of the Menagerie, Traveling Chocobo, Mm'menon, Madame Web, Hakoda Selfless Commander, Mikey & Don) plus Assemble the Players itself. Distinct from Discover (which exiles first then casts) and from cascade.
  - **Suggested fix:** Author `effect.cast_from_library_top` and pair with `effect.look_at_top_n` (since these cards usually let you see the top card). Companion condition `condition.cares_top_of_library` if it has independent payoffs. 9-card family — worth a dedicated rule.
  - **Note:** First audited case of this family. Refer back here for the others.


---

## Aurelia's Vindicator  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Creature — Angel
**Mana cost:** {2}{W}{W}

**Oracle text:**

```
Flying, lifelink, ward {2}
Disguise {X}{3}{W}
When this creature is turned face up, exile up to X other target creatures from the battlefield and/or creature cards from graveyards.
When this creature leaves the battlefield, return the exiled cards to their owners' hands.
```

**Current tags:** `effect.exile_creature`, `effect.exile_from_graveyard`, `effect.has_flying`, `effect.has_lifelink`, `effect.has_ward`, `trigger.creature_leaves_battlefield`

### Issues

- **missing**: `effect.disguise` / `trigger.turned_face_up` (family-level MKM coverage gap — no such tags exist)
  - **What's wrong:** Disguise keyword and "When this creature is turned face up" trigger have no catalog representation.
  - **Evidence vs reality:** "Disguise {X}{3}{W}" and "When this creature is turned face up, ..." — both are core MKM mechanic surface.
  - **Suggested fix:** Author the disguise/cloak/turn-face-up family per the v0.7 future-work note in the suspect spec. ~38 Standard cards. Same shape as the suspect family we just shipped — likely 2-3 tags (`effect.disguise`, `trigger.turned_face_up`, possibly `effect.cloak`).

---

## Break Out  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Sorcery
**Mana cost:** {R}{G}

**Oracle text:**

```
Look at the top six cards of your library. You may reveal a creature card from among them. If that card has mana value 2 or less, you may put it onto the battlefield and it gains haste until end of turn. If you didn't put the revealed card onto the battlefield this way, put it into your hand. Put the rest on the bottom of your library in a random order.
```

**Current tags:** `condition.cares_low_mana_value`, `effect.cast_noncreature_spell`, `effect.grants_haste`, `effect.is_instant_or_sorcery`, `effect.look_at_top_n`

### Issues

- **missing**: `effect.cheat_into_play` (no such tag exists — known persistent gap)
  - **What's wrong:** "Put it onto the battlefield" from library is the canonical cheat-into-play mechanic — distinct from reanimation (graveyard→battlefield). The mechanic has no catalog representation.
  - **Evidence vs reality:** Card explicitly enters a revealed creature onto the battlefield. This is the same family as Quicken / Mayhem Devil-style cheat effects, Pyre of Heroes, Champions Coliseum, etc.
  - **Suggested fix:** Author `effect.cheat_into_play` per the v0.14 future-work note. Reasonable scope (5-15 Standard cards). Pair with `effect.look_at_top_n` and `effect.tutors_creature`-style payoffs.

---

## Burden of Proof  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Aura
**Mana cost:** {1}{U}

**Oracle text:**

```
Flash
Enchant creature
Enchanted creature gets +2/+2 as long as it's a Detective you control. Otherwise, it has base power and toughness 1/1 and can't block Detectives.
```

**Current tags:** `effect.grants_stat_buff`, `effect.has_flash`

### Issues

- **missing**: `condition.cares_tribe.detective` (no such tag exists — small family-level coverage gap)
  - **What's wrong:** Card gates its anthem on the enchanted creature being a Detective AND restricts blocks vs Detectives. Detective is a MKM tribal theme with no catalog representation in the parametric `condition.cares_tribe.*` set.
  - **Evidence vs reality:** "as long as it's a Detective you control" + "can't block Detectives" — two distinct Detective-cares references in one card.
  - **Suggested fix:** Add `Detective` to `THEME_TRIBES` in `pipeline/themes.ts`. Auto-generates `condition.cares_tribe.detective` via the parametric rule. Small family — likely 5-10 Standard cards.

---

## Case File Auditor  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Creature — Human Detective
**Mana cost:** {2}{W}

**Oracle text:**

```
When this creature enters and whenever you solve a Case, look at the top six cards of your library. You may reveal an enchantment card from among them and put it into your hand. Put the rest on the bottom of your library in a random order.
You may spend mana as though it were mana of any color to cast Case spells.
```

**Current tags:** `effect.look_at_top_n`, `trigger.self_etb`

### Issues

- **missing**: `trigger.case_solved` / `effect.solve_case` (no such tags exist — family-level MKM gap)
  - **What's wrong:** Case is a MKM enchantment subtype with a "solve" mechanic — distinct from suspect, disguise, collect-evidence. Many cards trigger "whenever you solve a Case" or have the "To solve: ..." clause. No catalog representation.
  - **Evidence vs reality:** Oracle text contains "whenever you solve a Case". ~14 Case cards in MKM (Case of the Stashed Skeleton, Case of the Crimson Pulse, etc. — most of which are right around the corner in this worklist).
  - **Suggested fix:** Author the Case family per same shape as suspect/collect-evidence: `effect.solve_case` (producer — text "To solve: X. When solved, Y"), `trigger.case_solved` (carer — "whenever you solve a Case"). Probably also `condition.cares_solved_case` for static modifiers. Right around 14 cards.

---

## Case of the Burning Masks  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {1}{R}{R}

**Oracle text:**

```
When this Case enters, it deals 3 damage to target creature an opponent controls.
To solve — Three or more sources you controlled dealt damage this turn. (If unsolved, solve at the beginning of your end step.)
Solved — Sacrifice this Case: Exile the top three cards of your library. Choose one of them. You may play that card this turn.
```

**Current tags:** `effect.deals_damage`, `effect.exile_from_library`

### Issues

- **missing**: `effect.solve_case` / `trigger.case_solved` (family-level gap — already logged under Case File Auditor)

---

## Case of the Gateway Express  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {1}{W}

**Oracle text:**

```
When this Case enters, choose target creature you don't control. Each creature you control deals 1 damage to that creature.
To solve — Three or more creatures attacked this turn. (If unsolved, solve at the beginning of your end step.)
Solved — Creatures you control get +1/+0.
```

**Current tags:** `effect.grants_stat_buff`

### Issues

- **missing**: Case mechanic family (already logged)

---

## Case of the Gorgon's Kiss  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {B}

**Oracle text:**

```
When this Case enters, destroy up to one target creature that was dealt damage this turn.
To solve — Three or more creature cards were put into graveyards from anywhere this turn. (If unsolved, solve at the beginning of your end step.)
Solved — This Case is a 4/4 Gorgon creature with deathtouch and lifelink in addition to its other types.
```

**Current tags:** `condition.cares_deathtouch`, `effect.destroy_creature`, `effect.grants_deathtouch`, `effect.grants_lifelink`

### Issues

- **false-positive**: `condition.cares_deathtouch`
  - **What's wrong:** Self-animation leak — card becomes a creature WITH deathtouch as a self-buff, not a deathtouch-cares payoff. Same shape as the manland / Restless cycle leak in recurring patterns ("Manland / self-animation leaks `condition.cares_deathtouch`").
  - **Evidence vs reality:** evidence "creature with deathtouch" comes from "This Case is a 4/4 Gorgon creature with deathtouch and lifelink" — self-animation grants own keywords; doesn't reference deathtouch creatures as a payoff group.
  - **Suggested fix:** Add a lookbehind to exclude "becomes a"/"is a" frames preceding "creature with deathtouch" (parallel to how `condition.cares_tribe` already strips `becomes a ... creature` framing). Affects Cases, manlands, future self-animating enchantments.

---

## Case of the Pilfered Proof  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {1}{W}

**Oracle text:**

```
Whenever a Detective you control enters or is turned face up, put a +1/+1 counter on it.
To solve — You control three or more Detectives. (If unsolved, solve at the beginning of your end step.)
Solved — If one or more tokens would be created under your control, those tokens plus a Clue token are created instead. (It's an artifact with "{2}, Sacrifice this token: Draw a card.")
```

**Current tags:** `effect.counter_modified`, `effect.plus_one_counter`

### Issues

- **missing**: `trigger.another_creature_etb`
  - **What's wrong:** "Whenever a Detective you control enters" — a tribal-restricted version of "whenever a creature enters". The trigger.another_creature_etb regex probably anchors on the un-restricted form or accepts only `[\w\-]+` filler, but "Detective" should fall under that filler.
  - **Evidence vs reality:** Detective is a creature type. "A Detective you control enters" = "another creature (typed Detective) you control enters". Should fire if the filler allows tribal restriction.
  - **Suggested fix:** Verify trigger.another_creature_etb matches `whenever a <tribe-or-noun> you control enters`. Likely already does — check why not on this card. May be a Case-subtype-specific filter at the matchCard level.
- **missing**: `effect.create_token` / `effect.create_clue` (replacement-effect frame)
  - **What's wrong:** "If one or more tokens would be created under your control, those tokens plus a Clue token are created instead" — this replacement effect creates Clue tokens but uses a non-standard frame the rules likely miss.
  - **Evidence vs reality:** Solved clause delivers Clue tokens via Anointed-Procession-style replacement. The literal output is more Clues; the rules anchor on "create a/an X token" direct frames.
  - **Suggested fix:** Broaden `effect.create_clue` to also match `... plus a clue token are created` frame. Probably affects a small handful of token-replacement cards.

# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

The bulk of the 2026-05-26 audit batch was resolved in `v0.14.1` (see `SUBAGENT_COMMUNICATION.md` AGREED PLAN items 1–12; resolved entries moved to `CARD_ISSUES_RESOLVED.md`). What remains below is the explicitly-deferred subset (AGREED PLAN items 13–18) — keep these on the radar for v0.14.2 or a future audit round.

---

## Recurring patterns (deferred — items 13–18)

### Coverage gaps (do not relitigate per card)

- **`condition.cares_counters` (non +1/+1) does not exist.** Catalog only covers `condition.cares_plus_one_counter`. The Millennium Calendar gates a trigger on "1,000 or more time counters" — counter-threshold scaling on time/charge/loyalty/age/lore counters has no representation. Family-level coverage gap. (AGREED PLAN item 15.)

- **`effect.has_defender` does not exist.** Shipwreck Sentry is a Wall-shell card. Defender keyword has no representation. Low-priority — defender doesn't pair with many payoffs in Standard. (AGREED PLAN item 15.)

- **`effect.cheat_into_play` / put-card-onto-battlefield-from-exile gap.** Throne of the Grim Captain's "you may put an exiled creature card used to craft The Grim Captain onto the battlefield" is reanimate-from-exile, not graveyard. Already noted in CARD_ISSUES_RESOLVED's Sneak Attack family. (AGREED PLAN item 15.)

- **`condition.cast_from_graveyard` is keyword-only.** Tarrian's Journal grants "you may cast a creature spell from your graveyard this turn" as an effect. Neither `cast_from_graveyard` (keyword-gated) nor `cares_graveyard` (scaling/threshold) fires. Coverage gap for non-keyword cast-from-graveyard effects. (AGREED PLAN item 15.)

- **`effect.clone_in_place` and spell-copy from "becomes a copy of that spell".** The Everflowing Well's back face: "up to one other target permanent you control becomes a copy of that spell until end of turn." Spell-copy belongs to the `effect.copy_spell` family rather than the permanent-copy `clone_in_place` axis. (AGREED PLAN item 18 — intentional exclusion.)

- **`condition.cares_artifacts.pairsWith` wiring to artifact producers.** `create_treasure`, `create_clue`, `create_food`, `create_map`, `trigger.another_artifact_etb` should pair with `cares_artifacts`. The v0.14.1 batch broadened the rule but left the pairings unwired. (AGREED PLAN item 16 — v0.14.2 follow-up.)

- **`condition.cares_exile_pile → effect.exile_from_graveyard` pairings.** Exile-from-graveyard producers feed the exile pile; the pairing edge is missing. (AGREED PLAN item 17 — v0.14.2 follow-up.)

- **`effect.stifle` dedicated tag.** Narrowed `effect.counterspell` to `\bspell\b` in v0.14.1 (item 7) resolves Tishana retag. Author a dedicated `effect.stifle` only if a 2nd ability-counter card surfaces. (AGREED PLAN item 14 — deferred until a 2nd card appears.)

### Precision bugs (existing rules that over-/under-match systemically)

- **`effect.grants_evasion` fires on anaphoric self-pump ("it gains menace").** Pattern[1]'s lookbehind `(?<!\bthis (?:creature|...) )(?<!\b__self__ )` blocks "this creature/artifact/..." and "__self__" but doesn't block bare "it" antecedents. Vito's Inquisitor: "{B}, Sacrifice another...: Put a +1/+1 counter on this creature. **It gains menace until end of turn.**" — the "it" refers to __SELF__ but isn't blocked. (AGREED PLAN item 13 — sentence-scoped anaphor resolution is out of regex scope; accept the 1-card FP and revisit if a 2nd card surfaces.)

### Reminder-text false negatives (deliberately ignored)

Several agents flagged "missing" tags whose evidence comes from Craft reminder text in parentheses (e.g. Oteclan Landmark's "another artifact you control", Throne of the Grim Captain's exile_from_graveyard claim from the Craft cost reminder). Per `normalize.ts` `stripReminderText`, paren content is stripped pre-tag. These are NOT logged as issues. Agents should be reminded that Craft's cost line is real oracle text only on the front face's "Craft with artifact {N}" header; the parenthetical that follows IS reminder text.

---

## Per-card entries (deferred)

### Cluster: manland / animation self-grant false positives (item 13 anaphoric "it" defer)


## Vito's Inquisitor  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Creature — Vampire Knight
**Mana cost:** {3}{B}

**Oracle text:**

```
{B}, Sacrifice another creature or artifact: Put a +1/+1 counter on this creature. It gains menace until end of turn.
```

**Current tags:** `effect.counter_modified`, `effect.grants_evasion`, `effect.has_activated_ability`, `effect.plus_one_counter`, `effect.sacrifice_artifact`, `effect.sacrifice_creature`

### Issues

- **false-positive**: `effect.grants_evasion`
  - **What's wrong:** "It gains menace until end of turn" — anaphoric "it" refers to __SELF__ (this creature). Pattern[1]'s lookbehind only blocks `this <type>` and `__self__` subjects, not "it". Self-pump shouldn't fire an anthem-style grant tag.
  - **Evidence vs reality:** Pattern[1] matches " gains menace" with no preceding `this creature`/`__self__` token.
  - **Suggested fix:** extend the lookbehind to also block " it " when the prior clause established __SELF__ as the referent; OR restrict frame[1] subjects to anthem/token/other-targeting clauses.

---


### Cluster: deferred coverage gaps (item 15)


## Tarrian's Journal // The Tomb of Aclazotz  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact — Book // Legendary Land — Cave
**Mana cost:** (none)

**Oracle text:**

```
{T}, Sacrifice another artifact or creature: Draw a card. Activate only as a sorcery.
{2}, {T}, Discard your hand: Transform Tarrian's Journal.

(Transforms from Tarrian's Journal.)
{T}: Add {B}.
{T}: You may cast a creature spell from your graveyard this turn. If you do, it enters with a finality counter on it and is a Vampire in addition to its other types. ...
```

**Current tags:** `condition.cares_tribe.vampire`, `effect.add_mana`, `effect.counter_modified`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.sacrifice_artifact`, `effect.sacrifice_creature`

### Issues

- **missing**: graveyard-as-resource condition (no exact tag fits)
  - **What's wrong:** Back face's "You may cast a creature spell from your graveyard this turn" is a graveyard-as-casting-source effect. `condition.cast_from_graveyard` is keyword-only (Flashback, Disturb, etc.) and won't fire. `condition.cares_graveyard` is design-scoped to delirium/threshold scaling (per its docstring) and shouldn't fire either.
  - **Suggested fix:** either broaden `condition.cast_from_graveyard` to also match effect-granted casting from graveyard ("you may cast a [\w]+ spell from your graveyard"), or author a sibling tag. Borderline coverage gap.

---


## The Everflowing Well // The Myriad Pools  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact // Legendary Artifact Land
**Mana cost:** (none)

**Oracle text:**

```
When The Everflowing Well enters, mill two cards, then draw two cards.
Descend 8 — At the beginning of your upkeep, if there are eight or more permanent cards in your graveyard, transform The Everflowing Well.

(Transforms from The Everflowing Well.)
{T}: Add {U}.
Whenever you cast a permanent spell using mana produced by The Myriad Pools, up to one other target permanent you control becomes a copy of that spell until end of turn.
```

**Current tags:** `condition.cares_graveyard`, `condition.descend`, `effect.add_mana`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.mill`, `trigger.self_etb`, `trigger.spell_cast`

### Issues

- **missing**: `effect.clone_in_place`
  - **What's wrong:** Back-face static "up to one other target permanent you control becomes a copy of that spell until end of turn" is the canonical clone-in-place phrasing.
  - **Suggested fix:** verify `effect.clone_in_place` (if it exists) anchors on "becomes a copy of" and confirm DFC concatenation isn't filtering it. If the tag does not exist, the resolved-issues note about "becomes a copy" in-place clone already calls out the gap.

---

## The Millennium Calendar  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact
**Mana cost:** {1}

**Oracle text:**

```
Whenever you untap one or more permanents during your untap step, put that many time counters on The Millennium Calendar.
{2}, {T}: Double the number of time counters on The Millennium Calendar.
When there are 1,000 or more time counters on The Millennium Calendar, sacrifice it and each opponent loses 1,000 life.
```

**Current tags:** `effect.counter_modified`, `effect.has_activated_ability`, `effect.untap`

### Issues

- **false-positive**: `effect.untap`
  - **What's wrong:** Card has no untap effect; the only "untap" mention is inside the trigger "Whenever you untap one or more permanents". Pattern's `(?:up to (?:one|...) |all )?(?:target )?(?:[\w\-]+ ){0,3}` admits "one or more " (three word-tokens) before "permanents", so the trigger frame matches the effect regex.
  - **Suggested fix:** narrow `effect.untap` to exclude `whenever you untap` / `whenever (?:[\w\s]+?) untap(s|ped)` trigger-frame contexts.
- **missing**: `trigger.tapped_or_untapped`
  - **What's wrong:** "Whenever you untap one or more permanents during your untap step" is the canonical tapped/untapped trigger.
- **missing**: `effect.life_changed`
  - **What's wrong:** "each opponent loses 1,000 life" — pattern's `\d+ life` doesn't span the comma in "1,000". Fix: relax the digit slot to `[\d,]+`.
- **missing**: `effect.sacrifice_artifact` (self-sac on an artifact card)
  - **What's wrong:** "sacrifice it" with "it" = __SELF__ on an Artifact card. The rule's `matchCard` branch requires the literal `__self__` token, not pronoun "it".
  - **Suggested fix:** broaden the matchCard arm to also match `sacrifice it\b` when `card.types.includes('Artifact')` AND a `__SELF__` referent was established earlier in the text.

---

---

## Warden of the Inner Sky  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Creature — Human Soldier
**Mana cost:** {W}

**Oracle text:**

```
As long as this creature has three or more counters on it, it has flying and vigilance.
Tap three untapped artifacts and/or creatures you control: Put a +1/+1 counter on this creature. Scry 1. Activate only as a sorcery.
```

**Current tags:** `condition.cares_artifacts`, `effect.counter_modified`, `effect.grants_evasion`, `effect.grants_vigilance`, `effect.has_activated_ability`, `effect.plus_one_counter`, `effect.scry`

### Issues

- **false-positive**: `effect.grants_evasion`
  - **What's wrong:** Self-anaphoric leak. The "has flying" predicate refers back to "this creature" via the pronoun "it" — the card grants flying to ITSELF (conditionally), not to other creatures.
  - **Evidence vs reality:** evidence was `"has flying"` but the full clause is "As long as this creature has three or more counters on it, **it has flying** and vigilance." Same family as the manland/self-animation pattern called out in the skill's "Recurring patterns" section (Restless cycle), and adjacent to the anaphoric "it gains <kw>" leak (Pattern[1]) — except here the verb is `has` rather than `gains`.
  - **Suggested fix:** Extend `effect.grants_evasion`'s subject-exclusion lookbehind to block bare anaphoric `it has <kw>` when the antecedent is `__SELF__`/`this creature`. May also need to consider a "while/as long as X, it has Y" template specifically.

- **false-positive**: `effect.grants_vigilance`
  - **What's wrong:** Same self-anaphoric leak as `grants_evasion`. Vigilance here is a conditional self-static ability, not a grant to one or more (other) creatures.
  - **Evidence vs reality:** evidence was `"has flying and vigilance"`. Subject is "it" → "this creature". The tagDef says "Grants the vigilance keyword to one or more creatures (temporary or perpetual)" — the intended use is anthem-grants / target-grants to OTHERS.
  - **Suggested fix:** Mirror whatever lookbehind/subject exclusion lands for `grants_evasion`. If desired, route conditional self-static "has <kw>" cards to `effect.has_<kw>` instead — but those tagDefs currently say "as a printed intrinsic ability," which is a slight semantic stretch for conditional grants. Either broaden `has_*` to include conditional self-grants, or simply do not tag this kind of card under either axis.

- **missing**: `effect.gains_keyword_self_conditional`
  - **What's wrong:** `gains_keyword_self_conditional`'s description ("This creature/permanent gains an evasion keyword (flying, menace, intimidate) under a gating condition") matches Warden's flying clause exactly. Should fire on "As long as this creature has three or more counters on it, it has flying" — but didn't. Likely the rule's pattern requires `gains` rather than `has`, or anchors on a different "while/as long as" template.
  - **Evidence vs reality:** missing — the gating condition is `"as long as this creature has three or more counters on it"` and the keyword is `"flying"` (one of the in-scope keywords).
  - **Suggested fix:** Broaden `effect.gains_keyword_self_conditional`'s pattern to also accept `(it|this creature|__SELF__) has <kw>` inside a "while/as long as/if" frame, not just `gains`. Pairs naturally with narrowing `grants_evasion` for the false-positive above — once gains_keyword_self_conditional captures these cards, grants_evasion can safely exclude them.


---

## Zoyowa Lava-Tongue  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Legendary Creature — Goblin Warlock
**Mana cost:** {B}{R}

**Oracle text:**

```
Deathtouch
At the beginning of your end step, if you descended this turn, each opponent may discard a card or sacrifice a permanent of their choice. Zoyowa deals 3 damage to each opponent who didn't.
```

**Current tags:** `condition.descend`, `effect.draws_or_discards`, `effect.has_deathtouch`, `effect.sacrifice_artifact`, `effect.sacrifice_creature`, `effect.sacrifice_enchantment`, `effect.sacrifice_land`, `effect.sacrifice_permanent`, `effect.sacrifice_planeswalker`, `trigger.beginning_of_end_step`

### Issues

- **false-positive (×6)**: `effect.sacrifice_artifact`, `effect.sacrifice_creature`, `effect.sacrifice_enchantment`, `effect.sacrifice_land`, `effect.sacrifice_permanent`, `effect.sacrifice_planeswalker`
  - **What's wrong:** Classic edict-frame leak (Recurring pattern: "Typed-sacrifice leakage onto edicts and observer triggers"). The card forces opponents to sacrifice — the controller isn't sacrificing anything. All six typed-sacrifice tags + the generic `sacrifice_permanent` fired off the same evidence substring.
  - **Evidence vs reality:** evidence was `"sacrifice a permanent"`, but the full clause is "each opponent may discard a card or **sacrifice a permanent** of their choice." Subject is `each opponent`, not the controller. This is exactly the Vito-pattern leak's Pattern A (edict frame).
  - **Suggested fix:** Add an `each\s+opponent` / `target\s+opponent` subject exclusion to the `_OWN` alternation in the typed-sacrifice rules (and the generic `effect.sacrifice_permanent`). Same fix shape as proposed for prior edict false positives — see existing CARD_ISSUES entries for the Vito-pattern.

- **missing**: `effect.edict`
  - **What's wrong:** This is the textbook edict — "each opponent may discard a card or sacrifice a permanent of their choice." `effect.edict`'s tagDef ("Forces an opponent or each player to sacrifice a creature or permanent — Diabolic Edict / Innocent Blood family. Pairs with opponent-side dies triggers.") matches exactly, but the tag didn't fire.
  - **Evidence vs reality:** missing — clause `"each opponent may ... sacrifice a permanent of their choice"` should be a match. The `may` (optional, as part of a punishing choice) may be what's blocking the rule, since classic edicts are hard ("target opponent sacrifices…").
  - **Suggested fix:** Broaden `effect.edict` to accept "each opponent may <thing> or sacrifice a permanent" (Rack/Wrench-style punisher edicts). Make sure the test fixtures cover the punisher template.

- **missing**: `effect.targeted_discard`
  - **What's wrong:** "Each opponent may discard a card" should fire `effect.targeted_discard` (the description explicitly says "or each opponent"). Currently only `effect.draws_or_discards` fires off this clause, which is the generic self-loot axis.
  - **Evidence vs reality:** missing — clause is `"each opponent may discard a card"`. Likely the `may` qualifier is what's blocking.
  - **Suggested fix:** Broaden `effect.targeted_discard` to accept the punisher-edict frame ("each opponent may discard a card or <else>"). Same broadening shape as the `effect.edict` fix above — they're the two sides of a punisher.

- **missing**: `effect.deals_damage`
  - **What's wrong:** "Zoyowa deals 3 damage to each opponent who didn't" is a straightforward damage-to-players effect. The generic tag is described as "Deals damage to a player, permanent, or planeswalker" — should match.
  - **Evidence vs reality:** missing — clause `"<__SELF__> deals 3 damage to each opponent"` should be a match. Likely the rule anchors on a target syntax and the `each opponent who didn't` qualifier doesn't fit.
  - **Suggested fix:** Broaden `effect.deals_damage` to accept `each opponent` / `each opponent <qualifier>` as a damage destination, alongside `target player`/`target creature`.


---

## Agency Outfitter  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Creature — Sphinx Detective
**Mana cost:** {4}{U}{U}

**Oracle text:**

```
Flying
When this creature enters, you may search your graveyard, hand and/or library for a card named Magnifying Glass and/or a card named Thinking Cap and put them onto the battlefield. If you search your library this way, shuffle.
```

**Current tags:** `effect.has_flying`, `trigger.self_etb`

### Issues

- **missing (narrow / borderline)**: `effect.tutor_any`
  - **What's wrong:** The card searches the **library** for a named card and puts it onto the battlefield. `effect.tutor_any` covers "Searches library for any card (no subtype restriction)" — a named tutor IS a tutor.
  - **Evidence vs reality:** missing — clause includes `"search your ... library for a card named ..."`. Rule likely anchors on `search your library for a creature card` or `for a card` and may not handle the `for a card named X and/or a card named Y` template.
  - **Suggested fix:** Broaden `effect.tutor_any` to accept `search your library for a card named .+(?: and/or a card named .+)?`. Low-priority — name-specific tutors are rare. Consider only if a second case surfaces.


---


## Anzrag's Rampage  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Sorcery
**Mana cost:** {3}{R}{R}

**Oracle text:**

```
Destroy all artifacts you don't control, then exile the top X cards of your library, where X is the number of artifacts that were put into graveyards from the battlefield this turn. You may put a creature card exiled this way onto the battlefield. It gains haste. Return it to your hand at the beginning of the next end step.
```

**Current tags:** `effect.board_wipe`, `effect.cast_noncreature_spell`, `effect.destroy_artifact`, `effect.exile_from_library`, `effect.grants_haste`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.bounce_creature`
  - **What's wrong:** "Return it to your hand at the beginning of the next end step" — this is the textbook "blink-back" bounce of the cheated-in creature. `effect.bounce_creature`'s description includes "Returns a creature to hand, or exiles and returns it (re-triggering ETB)." Should fire on the delayed-trigger bounce.
  - **Evidence vs reality:** missing — clause `"return it to your hand at the beginning of the next end step"`. Antecedent of "it" is the creature you put onto the battlefield three sentences earlier (the cheated-in creature). Same anaphoric-removal blind spot as Agrus Kos.
  - **Suggested fix:** Broaden `effect.bounce_creature` to recognize `return it to (your|its owner's) hand` when the "it" antecedent is a creature established earlier in the same paragraph. Conservative variant: also accept the bare `return it to (your|its owner's) hand at the beginning of (the next )?end step` frame (cheat-back pattern).

- **missing**: `trigger.beginning_of_end_step`
  - **What's wrong:** "Return it to your hand at the beginning of the next end step" is a delayed end-step trigger created by the spell's resolution. `trigger.beginning_of_end_step` says "Has an ability that triggers at the beginning of an end step." Delayed triggers count.
  - **Evidence vs reality:** missing — clause `"at the beginning of the next end step"` should be a match. Likely the rule's regex anchors on a printed `at the beginning of (your|each|the) end step` from a permanent's static text and skips the `the next end step` delayed-trigger frame.
  - **Suggested fix:** Broaden `trigger.beginning_of_end_step` to also accept `at the beginning of (the next|the next player's)? end step` (delayed-trigger frame on spells).

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** Card scales X off "the number of artifacts that were put into graveyards from the battlefield this turn." That's clearly artifact-cares for deckbuilding, but `condition.cares_artifacts` is described as "References artifact count, artifact ETBs, or artifacts you control" — the rule likely doesn't recognize an artifact-death-count clause.
  - **Evidence vs reality:** missing — clause `"the number of artifacts that were put into graveyards from the battlefield this turn"`. This is the artifact-aristocrat archetype (sacrifice/death of artifacts as a payoff).
  - **Suggested fix:** Either broaden `condition.cares_artifacts` to also accept `artifacts (that )?(were|have been) put into (your )?graveyards?` / `artifacts (that )?died` (artifact-death framing), OR author a sibling `condition.cares_artifact_dies` analogous to `condition.cares_creatures_died_this_turn`. Sibling-tag approach is probably cleaner since it lines up with the existing creatures-died axis.

- **missing (deferred)**: `effect.cheat_into_play`
  - "You may put a creature card exiled this way onto the battlefield" is the persistent `effect.cheat_into_play` coverage gap already documented in the recurring patterns section. Anzrag's Rampage is another data point for that gap.


---

## Anzrag, the Quake-Mole  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Legendary Creature — Mole God
**Mana cost:** {2}{R}{G}

**Oracle text:**

```
Whenever Anzrag becomes blocked, untap each creature you control. After this phase, there is an additional combat phase.
{3}{R}{R}{G}{G}: Anzrag must be blocked each combat this turn if able.
```

**Current tags:** `effect.has_activated_ability`, `effect.untap`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.extra_combat` (no such tag exists — family-level coverage gap)
  - **What's wrong:** Extra-combat-phase effects have no catalog representation. Appears on ~10 Standard cards (Anzrag the Quake-Mole, Great Train Heist, Fear of Missing Out, Aurelia the Warleader, Full Throttle, All-Out Assault, Balthier and Fran, Genji Glove, …). Distinct mechanic from beginning-of-combat triggers — these grant an additional attack step.
  - **Suggested fix:** Author `effect.extra_combat`. Pair with `trigger.beginning_of_combat` (additional combats also fire begin-of-combat triggers) and with combat-payoff conditions like `condition.cares_attacking` (also a gap below).
  - **Note:** First audited case of this family. Refer back here for the other 9.

- **missing**: `effect.lure` / `effect.must_be_blocked` (no such tag exists — family-level coverage gap)
  - **What's wrong:** "Must be blocked if able" / Lure-style effects have no catalog tag. Appears on 8 Standard cards (Disturbed Slumber, Anzrag the Quake-Mole, Fear of Being Hunted, Joraga Invocation, Magitek Scythe, The Masamune, Vinebred Brawler, Raphael Ninja Destroyer).
  - **Suggested fix:** Author `effect.lure` (covers both "must be blocked" and the related goad). Small family but distinct mechanic from combat triggers and from `effect.pacify`. Low-priority — likely defer to a wider combat-axis batch.

- **borderline**: `trigger.attack_or_block` on "becomes blocked"
  - **What's wrong:** Description is "Triggers when a creature attacks or blocks." Anzrag's clause is "whenever Anzrag becomes blocked" — Anzrag is the attacker BEING BLOCKED, not blocking. Semantic stretch but not strictly wrong, since the trigger does fire during the declare-blockers step.
  - **Suggested fix:** Either broaden the description to "attacks, blocks, or becomes blocked," OR (preferred) author a distinct `trigger.becomes_blocked` for the attacker-side combat trigger and narrow `attack_or_block`. The attacker-blocked frame pairs naturally with `effect.lure` / `effect.must_be_blocked` cards above. Low-priority — leave alone until the combat-axis batch.


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

**Current tags:** `effect.cast_noncreature_spell`, `effect.counter_modified`, `effect.exile_artifact`, `effect.exile_enchantment`, `effect.is_instant_or_sorcery`, `effect.plus_one_counter`, `effect.tutors_creature`

### Issues

- **missing (borderline / coverage gap)**: ramp + tutor framing
  - **What's wrong:** Mode 1 of the charm reads "Search your library for a creature or land card ... Put it onto the battlefield tapped if it's a land card." If you pick a land, this is non-basic ramp (any land, into play tapped). `effect.ramp_nonland`'s description restricts to "fetches a **basic** land directly into play" — so Archdruid's Charm doesn't match cleanly. `effect.tutors_basic_land` similarly basic-restricts. The only tutor tag that fires is `effect.tutors_creature` for the creature half of the choice.
  - **Evidence vs reality:** missing — clause `"search your library for a creature or land card ... put it onto the battlefield tapped if it's a land card"` has no tag that captures the land-ramp half.
  - **Suggested fix:** Either broaden `effect.ramp_nonland` to drop the "basic" restriction (most ramp payoffs care about ANY land entering, not just basic), OR author a sibling `effect.ramp_any_land` for non-basic ramp. The wider broadening probably has more graph value — pairs naturally with `trigger.landfall` and `condition.cares_lands`.


---

## Assemble the Players  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Enchantment
**Mana cost:** {1}{W}

**Oracle text:**

```
You may look at the top card of your library any time.
Once each turn, you may cast a creature spell with power 2 or less from the top of your library.
```

**Current tags:** `condition.cares_low_power`, `effect.look_at_top_n`

### Issues

- **missing**: `effect.cast_from_library_top` (no such tag exists — family-level coverage gap)
  - **What's wrong:** "May cast spells from the top of your library" is a distinct mechanic — Future Sight / Vivien Champion / Garruk's Horde family — and has no catalog representation. Appears on ~8 Standard cards (Johann Apprentice Sorcerer, Case of the Locked Hothouse, Vizier of the Menagerie, Traveling Chocobo, Mm'menon, Madame Web, Hakoda Selfless Commander, Mikey & Don) plus Assemble the Players itself. Distinct from Discover (which exiles first then casts) and from cascade.
  - **Suggested fix:** Author `effect.cast_from_library_top` and pair with `effect.look_at_top_n` (since these cards usually let you see the top card). Companion condition `condition.cares_top_of_library` if it has independent payoffs. 9-card family — worth a dedicated rule.
  - **Note:** First audited case of this family. Refer back here for the others.


---


## Break Out  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Sorcery
**Mana cost:** {R}{G}

**Oracle text:**

```
Look at the top six cards of your library. You may reveal a creature card from among them. If that card has mana value 2 or less, you may put it onto the battlefield and it gains haste until end of turn. If you didn't put the revealed card onto the battlefield this way, put it into your hand. Put the rest on the bottom of your library in a random order.
```

**Current tags:** `condition.cares_low_mana_value`, `effect.cast_noncreature_spell`, `effect.grants_haste`, `effect.is_instant_or_sorcery`, `effect.look_at_top_n`

### Issues

- **missing**: `effect.cheat_into_play` (no such tag exists — known persistent gap)
  - **What's wrong:** "Put it onto the battlefield" from library is the canonical cheat-into-play mechanic — distinct from reanimation (graveyard→battlefield). The mechanic has no catalog representation.
  - **Evidence vs reality:** Card explicitly enters a revealed creature onto the battlefield. This is the same family as Quicken / Mayhem Devil-style cheat effects, Pyre of Heroes, Champions Coliseum, etc.
  - **Suggested fix:** Author `effect.cheat_into_play` per the v0.14 future-work note. Reasonable scope (5-15 Standard cards). Pair with `effect.look_at_top_n` and `effect.tutors_creature`-style payoffs.

---

## Burden of Proof  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Aura
**Mana cost:** {1}{U}

**Oracle text:**

```
Flash
Enchant creature
Enchanted creature gets +2/+2 as long as it's a Detective you control. Otherwise, it has base power and toughness 1/1 and can't block Detectives.
```

**Current tags:** `effect.grants_stat_buff`, `effect.has_flash`

### Issues

- **missing**: `condition.cares_tribe.detective` (no such tag exists — small family-level coverage gap)
  - **What's wrong:** Card gates its anthem on the enchanted creature being a Detective AND restricts blocks vs Detectives. Detective is a MKM tribal theme with no catalog representation in the parametric `condition.cares_tribe.*` set.
  - **Evidence vs reality:** "as long as it's a Detective you control" + "can't block Detectives" — two distinct Detective-cares references in one card.
  - **Suggested fix:** Add `Detective` to `THEME_TRIBES` in `pipeline/themes.ts`. Auto-generates `condition.cares_tribe.detective` via the parametric rule. Small family — likely 5-10 Standard cards.

---

## Case File Auditor  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Creature — Human Detective
**Mana cost:** {2}{W}

**Oracle text:**

```
When this creature enters and whenever you solve a Case, look at the top six cards of your library. You may reveal an enchantment card from among them and put it into your hand. Put the rest on the bottom of your library in a random order.
You may spend mana as though it were mana of any color to cast Case spells.
```

**Current tags:** `effect.look_at_top_n`, `trigger.self_etb`

### Issues

- **missing**: `trigger.case_solved` / `effect.solve_case` (no such tags exist — family-level MKM gap)
  - **What's wrong:** Case is a MKM enchantment subtype with a "solve" mechanic — distinct from suspect, disguise, collect-evidence. Many cards trigger "whenever you solve a Case" or have the "To solve: ..." clause. No catalog representation.
  - **Evidence vs reality:** Oracle text contains "whenever you solve a Case". ~14 Case cards in MKM (Case of the Stashed Skeleton, Case of the Crimson Pulse, etc. — most of which are right around the corner in this worklist).
  - **Suggested fix:** Author the Case family per same shape as suspect/collect-evidence: `effect.solve_case` (producer — text "To solve: X. When solved, Y"), `trigger.case_solved` (carer — "whenever you solve a Case"). Probably also `condition.cares_solved_case` for static modifiers. Right around 14 cards.

---

## Case of the Burning Masks  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {1}{R}{R}

**Oracle text:**

```
When this Case enters, it deals 3 damage to target creature an opponent controls.
To solve — Three or more sources you controlled dealt damage this turn. (If unsolved, solve at the beginning of your end step.)
Solved — Sacrifice this Case: Exile the top three cards of your library. Choose one of them. You may play that card this turn.
```

**Current tags:** `effect.deals_damage`, `effect.exile_from_library`

### Issues

- **missing**: `effect.solve_case` / `trigger.case_solved` (family-level gap — already logged under Case File Auditor)

---

## Case of the Gateway Express  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {1}{W}

**Oracle text:**

```
When this Case enters, choose target creature you don't control. Each creature you control deals 1 damage to that creature.
To solve — Three or more creatures attacked this turn. (If unsolved, solve at the beginning of your end step.)
Solved — Creatures you control get +1/+0.
```

**Current tags:** `effect.grants_stat_buff`

### Issues

- **missing**: Case mechanic family (already logged)

---

## Case of the Gorgon's Kiss  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {B}

**Oracle text:**

```
When this Case enters, destroy up to one target creature that was dealt damage this turn.
To solve — Three or more creature cards were put into graveyards from anywhere this turn. (If unsolved, solve at the beginning of your end step.)
Solved — This Case is a 4/4 Gorgon creature with deathtouch and lifelink in addition to its other types.
```

**Current tags:** `condition.cares_deathtouch`, `effect.destroy_creature`, `effect.grants_deathtouch`, `effect.grants_lifelink`

### Issues

- **false-positive**: `condition.cares_deathtouch`
  - **What's wrong:** Self-animation leak — card becomes a creature WITH deathtouch as a self-buff, not a deathtouch-cares payoff. Same shape as the manland / Restless cycle leak in recurring patterns ("Manland / self-animation leaks `condition.cares_deathtouch`").
  - **Evidence vs reality:** evidence "creature with deathtouch" comes from "This Case is a 4/4 Gorgon creature with deathtouch and lifelink" — self-animation grants own keywords; doesn't reference deathtouch creatures as a payoff group.
  - **Suggested fix:** Add a lookbehind to exclude "becomes a"/"is a" frames preceding "creature with deathtouch" (parallel to how `condition.cares_tribe` already strips `becomes a ... creature` framing). Affects Cases, manlands, future self-animating enchantments.

---

## Case of the Pilfered Proof  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {1}{W}

**Oracle text:**

```
Whenever a Detective you control enters or is turned face up, put a +1/+1 counter on it.
To solve — You control three or more Detectives. (If unsolved, solve at the beginning of your end step.)
Solved — If one or more tokens would be created under your control, those tokens plus a Clue token are created instead. (It's an artifact with "{2}, Sacrifice this token: Draw a card.")
```

**Current tags:** `effect.counter_modified`, `effect.plus_one_counter`

### Issues

- **missing**: `trigger.another_creature_etb`
  - **What's wrong:** "Whenever a Detective you control enters" — a tribal-restricted version of "whenever a creature enters". The trigger.another_creature_etb regex probably anchors on the un-restricted form or accepts only `[\w\-]+` filler, but "Detective" should fall under that filler.
  - **Evidence vs reality:** Detective is a creature type. "A Detective you control enters" = "another creature (typed Detective) you control enters". Should fire if the filler allows tribal restriction.
  - **Suggested fix:** Verify trigger.another_creature_etb matches `whenever a <tribe-or-noun> you control enters`. Likely already does — check why not on this card. May be a Case-subtype-specific filter at the matchCard level.
- **missing**: `effect.create_token` / `effect.create_clue` (replacement-effect frame)
  - **What's wrong:** "If one or more tokens would be created under your control, those tokens plus a Clue token are created instead" — this replacement effect creates Clue tokens but uses a non-standard frame the rules likely miss.
  - **Evidence vs reality:** Solved clause delivers Clue tokens via Anointed-Procession-style replacement. The literal output is more Clues; the rules anchor on "create a/an X token" direct frames.
  - **Suggested fix:** Broaden `effect.create_clue` to also match `... plus a clue token are created` frame. Probably affects a small handful of token-replacement cards.



---

# Round 4 audit — 2026-05-27 (50 cards, batches 1–5)

50 cards audited: Case of the Trampled Garden → Faerie Snoop (alphabetical, 50 consecutive UNPROCESSED entries). 5 parallel subagents, 10 cards each. RuleVersion v0.14.3 (artifact at v0.14.3 source level — but see Tier 1 stale-artifact note below).

**Counts:** 50 audited · 22 with issues · 28 clean (no entry) · 37 issue bullets logged.

## Commonalities & proposed remedies

Organized by tier of effort. **Tier 1** is a zero-rule-change rebuild that erases ~9 of the 37 bullets immediately. **Tier 2** is regex broadenings on existing rules. **Tier 3** is new rules / coverage gaps. **Tier 4** is deferred / single-card.

### Tier 1 — Stale-artifact rebuild (zero rule change, clears 9+ entries)

- **`effect.create_clue` / `effect.create_token` on bare "investigate" keyword.** The rule was broadened in commit `3c39570` (2026-05-27 15:57) to match `\binvestigates?\b` directly, but `app/public/data/cards-standard.json` was built at 12:55 (`ls -la` mtime), ~3h before the fix. The artifact predates the rule, so the tag silently fails to fire on 9 cards in this batch alone: Chalk Outline, Cold Case Cracker, Deduce, Detective's Satchel, Drag the Canal, Eliminate the Impossible, Evidence Examiner (×2), Ezrim Agency Chief (×2). Rule regex verified by Batch 4 agent (`rule.match` returns `{ evidence: 'investigate' }`).
  - **Remedy:** `npm run build:cards -- --standard` from repo root. Then re-audit those 9 cards to delete the false-positive bullets. **No rule edit required.**
  - **Process improvement:** the skill should recommend a pre-flight check (`stat -c %Y app/public/data/cards-standard.json` vs `git log -1 --format=%at -- pipeline/rules/`) before logging missing-tag entries. Both Batch 3 and Batch 4 independently discovered this — adding it to the skill saves the next 5 subagents the same diagnostic dance. Logged for skill update.

### Tier 2 — Regex broadenings on existing rules (~15 entries clear)

Each item below is a discrete narrow regex fix on an existing rule. Grouped by what they have in common.

**B. Self-ETB / self-trigger phrasings beyond "this creature".** Two distinct shapes:
- `trigger.self_etb` doesn't match non-creature subtypes: "When this Case enters" (Case of the Trampled Garden). Per recurring patterns the rule covers `__SELF__` and "this creature" — need to admit `this (case|saga|class|room|aura|artifact|equipment|vehicle|food|clue|treasure|...)`.
- `trigger.self_etb` doesn't match `as` framing: "As this creature enters or is turned face up" (Crowd-Control Warden). Replacement-effect-on-ETB phrasing reads as a trigger but the rule anchors on `(?:when|whenever)` only.
- **Remedy:** extend the verb group to `(?:when|whenever|as)` AND broaden the subject group to non-creature `this <subtype>` forms. Watch out: "as it enters tapped" replacement-effects must NOT trigger — gate the `as` branch on the presence of a comma-separated effect clause, not just an ETB reference.

**C. Multi-keyword choice grants.** `effect.grants_<kw>` family requires `gains?\s+<kw>` adjacency. Cards templated "gains your choice of <kw1>, <kw2>, or <kw3>" miss ALL the keyword grants. Hits Ezrim Agency Chief (loses `grants_vigilance`, `grants_lifelink`, `grants_hexproof` simultaneously). Pattern extends to Cadric Soul Kindler, Phyrexian Vatmother analogs. **Remedy:** add a frame `gains?\s+your choice of\s+([\w, ]+)\s+(?:or|and)\s+(\w+)` and expand each captured keyword to a separate `effect.grants_<kw>` evidence emission. Modeled on the existing comma-list Frame F2.

**D. `cares_high_power` / `cares_low_power` FP on blocker-restriction.** "Can't be blocked by creatures with power N or greater/less" matches the cares-power regex but is pseudo-evasion, not a high/low-power payoff. Hits Exit Specialist (FP on `cares_high_power`). Delney also pulls both `cares_high_power` and `cares_low_power` from "creatures … with power 2 or less can't be blocked by creatures with power 3 or greater" — the first half is a real low-power care, the second is an evasion gate. **Remedy:** add a negative lookbehind excluding `can't be blocked by\s+(?:creatures with\s+)?power\s+\d+\s+or\s+(greater|more|less)` to both rules. Mirror the fix on both axes.

**E. Self-target subjects in bounce / tuck regexes.** Type-specific bounce and tuck rules use `target X` / `it` / `that card` subject alternations but don't admit Aura/Equipment self-target subjects:
- `effect.bounce_artifact`, `effect.bounce_or_blink` miss "Return this Equipment to its owner's hand" (Cryptic Coat).
- `effect.tuck_to_library` Frame D2 misses "Shuffle enchanted creature into its owner's library" (Dramatic Accusation).
- **Remedy:** extend subject alternations in both rules to include `this (artifact|equipment|vehicle|enchantment|aura)|enchanted creature|attached creature|equipped creature`. Audit all typed-effect tags (destroy/exile/sacrifice/bounce/tuck) for the same shape — these are all candidates for the same Aura/Equipment self-target blind spot.

**F. `trigger.creature_leaves_graveyard` plural form.** "Whenever one or more creature cards leave your graveyard" (Chalk Outline) misses; rule probably anchors on `a creature card leaves`. **Remedy:** add `(?:one or more )?creature cards?` to the noun group.

**G. `effect.untap` anaphoric "untap them".** "creatures you control gain hexproof until end of turn. Untap them." (Essence of Antiquity) misses because the rule wants `untap target X` / `untap all X`. **Remedy:** add `\buntap (?:them|those|these)\b` alternation; verify single-target precision isn't lost.

**H. `effect.mill` dig-N-keep-M frame.** "look at top two cards … put one into your hand and the other into your graveyard" (Faerie Snoop) — the mill rule has "the rest into … graveyard" for dig-N-keep-1 but not "the other into … graveyard" for dig-2-keep-1. **Remedy:** add `\bthe other into (?:your|their|its owner's) graveyard\b` companion frame.

**I. `trigger.damage_dealt` passive-voice phrasing.** "Whenever a creature is dealt damage" (Expedited Inheritance) misses. Rule anchors on active "deals damage". **Remedy:** add `(?:is|are) dealt damage` alternation. Watch: "is dealt combat damage" vs "is dealt damage by a source" — both should fire.

**J. `effect.impulse_draw` third-person controller.** "its controller may exile that many cards from the top of their library. They may play those cards until the end of their next turn." (Expedited Inheritance) — rule likely first-person-controller-locked. **Remedy:** expand subject alternations to admit `(?:you|its controller|they|that player) may (?:exile|play)` framings.

**K. `effect.exile_from_library` tutor-style search-and-exile.** "search its owner's graveyard, hand, and library for any number of cards with that name and exile them" (Deadly Cover-Up) — rule likely anchors on "exile the top N cards" / "exile cards from a library" without the search-anchor variant. **Remedy:** add `search [\w' ]+ library\s+for[^.]+ and exile (?:them|those|that)` alternation.

**L. `trigger.permanent_sacrificed` token-type framing.** "When you sacrifice a Clue, …" (Curious Cadaver) — rule wants `creature|artifact|enchantment|land|permanent|token` in the noun slot but doesn't list specific artifact-token types. **Remedy:** add `(?:clue|treasure|food|map|blood|gold)` to the noun alternation. Family-level (MKM/WOE/LCI/DSK aristocrats payoffs).

**M. `effect.draws_or_discards` count-slot — "your hand".** "Discard your hand" cost on Connecting the Dots misses because the count slot enumerates `a card | N cards | that many cards | cards equal to X` but not `your hand` as an object. **Remedy:** add `your hand` to the count enumeration.

**N. `effect.control_change` Aura "you control enchanted X".** Coerced to Kill: Control-Magic Aura template misses because the rule anchors on "gain control of target". **Remedy:** add an Aura frame `you control (?:enchanted|attached|equipped) (?:creature|permanent)` (static control-grant).

**O. `condition.cares_lifegain` "this turn" cumulative gate.** "You've gained 5 or more life this turn" (Case of the Uneaten Feast). **Remedy:** add `(?:you've|you have) gained\s+\d+\s+or more life (?:this turn)?` alternation.

**P. Enchantment-subtype self-sac.** Case of the Uneaten Feast: "Sacrifice this Case:" should hit `effect.sacrifice_enchantment` AND `effect.has_activated_ability`. The case rule treats Case as a noun without recognizing it's an enchantment subtype. **Remedy:** extend `effect.sacrifice_enchantment` to match `sacrifice this (?:case|saga|class|room|shrine|aura|role)` for the self-sac branch; verify `effect.has_activated_ability` already covers cost:effect bare frames on enchantments.

**Q. `condition.cares_artifacts` per-turn sacrifice gate.** Detective's Satchel: "Activate only if you've sacrificed an artifact this turn" — niche but real. **Remedy:** optional; low priority. Could add `you've sacrificed an artifact (?:this turn)?` alternation.

### Tier 3 — Coverage gaps (new rules to author)

**T. `effect.doubles_triggers` (Panharmonicon family).** Delney, Streetwise Lookout's second ability: "If a triggered ability of a creature you control … triggers, that ability triggers an additional time." Coverage gap with potential to wire many existing trigger.* axes as pairsWith. Other Standard family members: Panharmonicon (if reprinted), ETB-doublers, Strixhaven Stadium triggers, casualty-doublers. **Design decision required:** does `doubles_triggers` pair with every `trigger.*` (broad) or only ETB-family triggers (narrow)? Suggest narrow (ETB + LTB) for v1, broaden later.

**U. `effect.cheat_into_play` / cast-from-graveyard license effect.** Already noted as a persistent gap (Tarrian's Journal deferred entry). Case of the Uneaten Feast surfaces it again: "Creature cards in your graveyard gain 'You may cast this card from your graveyard' until end of turn." Same recurring shape; not a new pattern.

### Tier 4 — Deferred / single-card / possible-FP

- **`effect.draws_or_discards` opponent-draw FP.** Deadly Cover-Up: "that player shuffles, then draws a card for each card exiled from their hand this way" — controller does NOT draw. Could pair incorrectly with spells-matter / prowess via this tag. Single-card today; defer until a 2nd opponent-draw card surfaces.
- **`trigger.another_creature_etb` on tribal-restricted filler "a Detective you control".** Case of the Pilfered Proof — already in the file from the earlier round. Same shape: filler `[\w\-]+` should admit tribe names. Verify if this is already shipped in v0.14.3.
- **`effect.create_token` / `effect.create_clue` replacement-effect frame.** Same Case of the Pilfered Proof entry: "those tokens plus a Clue token are created instead" replacement-effect template. Niche, family of ~3–5 cards (Anointed Procession variants).

## Action plan (in order)

1. **Right now:** `npm run build:cards -- --standard` to rebuild the artifact. Re-run the 9 stale-artifact card lookups; delete those bullets from the Round 4 entries below. (Zero-risk, single command, ~5min.)
2. **Next session:** dispatch `mtg-graph-narrow-tag-rule` on the Tier 2 broadenings. Group by file edited:
   - One PR: `trigger.self_etb.ts` (items B, also Case ETB), `trigger.creature_leaves_graveyard.ts` (F), `trigger.damage_dealt.ts` (I), `trigger.permanent_sacrificed.ts` (L).
   - One PR: `effect.bounce_artifact.ts`, `effect.bounce_or_blink.ts`, `effect.tuck_to_library.ts` (E — shared "Aura/Equipment self-target" theme).
   - One PR: `effect.untap.ts` (G), `effect.mill.ts` (H), `effect.impulse_draw.ts` (J), `effect.exile_from_library.ts` (K), `effect.draws_or_discards.ts` (M).
   - One PR: `effect.grants_keyword.ts` (C), `condition.cares_high_power.ts` + `condition.cares_low_power.ts` (D), `effect.control_change.ts` (N), `condition.cares_lifegain.ts` (O), `effect.sacrifice_enchantment.ts` (P).
3. **Tier 3 design pass first, then rule authoring:** T needs a 1-page design note covering scope (count doubles cards across MKM + DSK + BLB Standard sets), pairsWith wiring, and test fixtures. **Don't author blind.**
4. **Skill update:** add the artifact-staleness pre-flight check to `mtg-graph-card-tag-audit` so the next audit batch catches this in 10s instead of rediscovering it via 5 subagents.

---

## Per-card entries — Round 4

> **Shipped in `v0.14.4` (2026-05-27):** 19 of 22 Round-4 per-card entries fully resolved (commits `49b598d` through `0a3789d`, plus revert `aabe780`). Resolved cards have been deleted from the per-card list below. Remaining: Case of the Uneaten Feast (cast-from-graveyard license — Tier 3), Delney (doubles_triggers — Tier 3), Detective's Satchel (cares_artifacts per-turn-sacrifice gate — low-priority unshipped item Q from the action plan).

---

## Case of the Uneaten Feast  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {W}

**Oracle text:**

```
Whenever a creature you control enters, you gain 1 life.
To solve — You've gained 5 or more life this turn. (If unsolved, solve at the beginning of your end step.)
Solved — Sacrifice this Case: Creature cards in your graveyard gain "You may cast this card from your graveyard" until end of turn.
```

**Current tags:** `condition.cares_graveyard`, `effect.life_changed`, `trigger.another_creature_etb`

### Issues

- **missing**: `condition.cares_lifegain`
  - **What's wrong:** "You've gained 5 or more life this turn" is the canonical lifegain-scaling gate.
  - **Evidence vs reality:** the "To solve" clause explicitly gates on cumulative life gained this turn. That is exactly what `condition.cares_lifegain` describes.
  - **Suggested fix:** broaden `condition.cares_lifegain` to include "gained N or more life this turn" / "you've gained N or more life" phrasing.

- **missing**: `effect.sacrifice_enchantment`
  - **What's wrong:** "Sacrifice this Case:" is a self-sacrifice activated ability on an enchantment.
  - **Evidence vs reality:** the Solved clause activates "Sacrifice this Case:" — the card is an Enchantment subtype Case, so this should tag as sacrificing an enchantment.
  - **Suggested fix:** ensure `effect.sacrifice_enchantment` (or its self-sac branch) catches "Sacrifice this <enchantment-subtype-noun>:" — Case, Saga, Class, Shrine, Aura, Role.

- **missing**: `effect.has_activated_ability`
  - **What's wrong:** Solved adds an activated ability ("Sacrifice this Case: ...").
  - **Evidence vs reality:** the Solved clause is an activated ability (cost: effect) on the enchantment. Per recurring pattern, `effect.has_activated_ability` should match bare-cost activations on non-creatures.
  - **Suggested fix:** ensure the rule captures sac-cost activated abilities on enchantments (not just `{T}:` or mana-cost activations on creatures).

- **missing**: no `effect.cheat_into_play` / "cast from graveyard license" tag exists
  - **What's wrong:** "Creature cards in your graveyard gain 'You may cast this card from your graveyard'" is a temporary cast-from-graveyard license — distinct from any keyword in the existing `condition.cast_from_graveyard` rule. This is the known persistent gap for non-keyword cast-from-graveyard effects.
  - **Suggested fix:** coverage gap — author a rule (`effect.grant_cast_from_graveyard` or extend `condition.cast_from_graveyard` to an effect-axis sibling) for the "you may cast this card from your graveyard" license family.

---

## Delney, Streetwise Lookout  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Legendary Creature — Human Scout
**Mana cost:** {2}{W}

**Oracle text:**

```
Creatures you control with power 2 or less can't be blocked by creatures with power 3 or greater.
If a triggered ability of a creature you control with power 2 or less triggers, that ability triggers an additional time.
```

**Current tags:** `condition.cares_high_power`, `condition.cares_low_power`

### Issues

- **missing: no `effect.doubles_triggers` exists**
  - **What's wrong:** Delney's second ability is a Panharmonicon-family effect ("If a triggered ability of a creature you control with power 2 or less triggers, that ability triggers an additional time"). No tag in the catalog captures the doubling-triggers axis. Other cards in this family in Standard: Panharmonicon, Spirit-Sister's Call, ETB-doublers, Strixhaven Stadium triggers, etc. (worth scoping).
  - **Evidence vs reality:** No evidence currently logged. Oracle text: "that ability triggers an additional time."
  - **Suggested fix:** Author `effect.doubles_triggers` rule. Pairs with the various `trigger.*` axes (could be modelled by pairsWith on every trigger.* tag, or via a graph-level catch-all — design decision).



---

## Detective's Satchel  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Artifact
**Mana cost:** {2}{U}{R}

**Oracle text:**

```
When this artifact enters, investigate twice. (To investigate, create a Clue token. It's an artifact with "{2}, Sacrifice this token: Draw a card.")
{T}: Create a 1/1 colorless Thopter artifact creature token with flying. Activate only if you've sacrificed an artifact this turn.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.grants_evasion`, `effect.has_activated_ability`, `trigger.self_etb`

### Issues

- **missing**: `effect.create_clue`
  - **What's wrong:** Card creates Clue tokens via "investigate twice" (a bare keyword action). Rule has a `\binvestigates?\b` pattern (added in commit 3c39570 on 2026-05-27 15:57) that should match.
  - **Evidence vs reality:** Normalized text is `when __SELF__ enters, investigate twice. ... activate only if you've sacrificed an artifact this turn.` — the bare `investigate` is post-reminder-stripping. Artifact at `app/public/data/cards-standard.json` predates commit 3c39570 (built ~12:55 on 2026-05-27); rebuild is needed before this surfaces.
  - **Suggested fix:** Rebuild artifact (`npm run build:cards -- --standard`). No rule change required — the rule already handles this.

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** "Activate only if you've sacrificed an artifact this turn" is a per-turn artifact-sacrifice gate — caring about artifact sacrifices is a `cares_artifacts` signal.
  - **Evidence vs reality:** No evidence string was emitted; rule presumably doesn't match the "you've sacrificed an artifact this turn" qualifier.
  - **Suggested fix:** Broaden `condition.cares_artifacts` to recognize "(you've )?sacrificed an artifact (this turn)?" gates, or accept that this is a niche frame not worth catching.

# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

The bulk of the 2026-05-26 audit batch was resolved in `v0.14.1` (see `SUBAGENT_COMMUNICATION.md` AGREED PLAN items 1–12; resolved entries moved to `CARD_ISSUES_RESOLVED.md`). What remains below is the explicitly-deferred subset (AGREED PLAN items 13–18) — keep these on the radar for v0.14.2 or a future audit round.

---

## Recurring patterns (deferred — items 13–18)

### Coverage gaps (do not relitigate per card)

- **`condition.cares_counters` (non +1/+1) does not exist.** Catalog only covers `condition.cares_plus_one_counter`. The Millennium Calendar gates a trigger on "1,000 or more time counters" — counter-threshold scaling on time/charge/loyalty/age/lore counters has no representation. Family-level coverage gap. (AGREED PLAN item 15.)

- **`effect.has_defender` does not exist.** Shipwreck Sentry is a Wall-shell card. Defender keyword has no representation. Low-priority — defender doesn't pair with many payoffs in Standard. (AGREED PLAN item 15.)

- **`condition.cast_from_graveyard` is keyword-only.** Tarrian's Journal grants "you may cast a creature spell from your graveyard this turn" as an effect. Neither `cast_from_graveyard` (keyword-gated) nor `cares_graveyard` (scaling/threshold) fires. Coverage gap for non-keyword cast-from-graveyard effects. (AGREED PLAN item 15.)

- **`effect.clone_in_place` and spell-copy from "becomes a copy of that spell".** The Everflowing Well's back face: "up to one other target permanent you control becomes a copy of that spell until end of turn." Spell-copy belongs to the `effect.copy_spell` family rather than the permanent-copy `clone_in_place` axis. (AGREED PLAN item 18 — intentional exclusion.)

- **`condition.cares_artifacts.pairsWith` wiring to artifact producers.** `create_treasure`, `create_clue`, `create_food`, `create_map`, `trigger.another_artifact_etb` should pair with `cares_artifacts`. The v0.14.1 batch broadened the rule but left the pairings unwired. (AGREED PLAN item 16 — v0.14.2 follow-up.)

- **`condition.cares_exile_pile → effect.exile_from_graveyard` pairings.** Exile-from-graveyard producers feed the exile pile; the pairing edge is missing. (AGREED PLAN item 17 — v0.14.2 follow-up.)

- **`effect.stifle` dedicated tag.** Narrowed `effect.counterspell` to `\bspell\b` in v0.14.1 (item 7) resolves Tishana retag. Author a dedicated `effect.stifle` only if a 2nd ability-counter card surfaces. (AGREED PLAN item 14 — deferred until a 2nd card appears.)

### Precision bugs (existing rules that over-/under-match systemically)

- **`effect.grants_evasion` fires on anaphoric self-pump ("it gains menace").** Pattern[1]'s lookbehind `(?<!\bthis (?:creature|...) )(?<!\b__self__ )` blocks "this creature/artifact/..." and "__self__" but doesn't block bare "it" antecedents. Vito's Inquisitor: "{B}, Sacrifice another...: Put a +1/+1 counter on this creature. **It gains menace until end of turn.**" — the "it" refers to __SELF__ but isn't blocked. (AGREED PLAN item 13 — sentence-scoped anaphor resolution is out of regex scope; accept the 1-card FP and revisit if a 2nd card surfaces.)

### Reminder-text false negatives (deliberately ignored)

Several agents flagged "missing" tags whose evidence comes from Craft reminder text in parentheses (e.g. Oteclan Landmark's "another artifact you control", Throne of the Grim Captain's exile_from_graveyard claim from the Craft cost reminder). Per `normalize.ts` `stripReminderText`, paren content is stripped pre-tag. These are NOT logged as issues. Agents should be reminded that Craft's cost line is real oracle text only on the front face's "Craft with artifact {N}" header; the parenthetical that follows IS reminder text.

---

## Per-card entries (deferred)

### Cluster: manland / animation self-grant false positives (item 13 anaphoric "it" defer)


## Vito's Inquisitor  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Creature — Vampire Knight
**Mana cost:** {3}{B}

**Oracle text:**

```
{B}, Sacrifice another creature or artifact: Put a +1/+1 counter on this creature. It gains menace until end of turn.
```

**Current tags:** `effect.counter_modified`, `effect.grants_evasion`, `effect.has_activated_ability`, `effect.plus_one_counter`, `effect.sacrifice_artifact`, `effect.sacrifice_creature`

### Issues

- **false-positive**: `effect.grants_evasion`
  - **What's wrong:** "It gains menace until end of turn" — anaphoric "it" refers to __SELF__ (this creature). Pattern[1]'s lookbehind only blocks `this <type>` and `__self__` subjects, not "it". Self-pump shouldn't fire an anthem-style grant tag.
  - **Evidence vs reality:** Pattern[1] matches " gains menace" with no preceding `this creature`/`__self__` token.
  - **Suggested fix:** extend the lookbehind to also block " it " when the prior clause established __SELF__ as the referent; OR restrict frame[1] subjects to anthem/token/other-targeting clauses.

---


### Cluster: deferred coverage gaps (item 15)


## Tarrian's Journal // The Tomb of Aclazotz  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact — Book // Legendary Land — Cave
**Mana cost:** (none)

**Oracle text:**

```
{T}, Sacrifice another artifact or creature: Draw a card. Activate only as a sorcery.
{2}, {T}, Discard your hand: Transform Tarrian's Journal.

(Transforms from Tarrian's Journal.)
{T}: Add {B}.
{T}: You may cast a creature spell from your graveyard this turn. If you do, it enters with a finality counter on it and is a Vampire in addition to its other types. ...
```

**Current tags:** `condition.cares_tribe.vampire`, `effect.add_mana`, `effect.counter_modified`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.sacrifice_artifact`, `effect.sacrifice_creature`

### Issues

- **missing**: graveyard-as-resource condition (no exact tag fits)
  - **What's wrong:** Back face's "You may cast a creature spell from your graveyard this turn" is a graveyard-as-casting-source effect. `condition.cast_from_graveyard` is keyword-only (Flashback, Disturb, etc.) and won't fire. `condition.cares_graveyard` is design-scoped to delirium/threshold scaling (per its docstring) and shouldn't fire either.
  - **Suggested fix:** either broaden `condition.cast_from_graveyard` to also match effect-granted casting from graveyard ("you may cast a [\w]+ spell from your graveyard"), or author a sibling tag. Borderline coverage gap.

---


## The Everflowing Well // The Myriad Pools  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact // Legendary Artifact Land
**Mana cost:** (none)

**Oracle text:**

```
When The Everflowing Well enters, mill two cards, then draw two cards.
Descend 8 — At the beginning of your upkeep, if there are eight or more permanent cards in your graveyard, transform The Everflowing Well.

(Transforms from The Everflowing Well.)
{T}: Add {U}.
Whenever you cast a permanent spell using mana produced by The Myriad Pools, up to one other target permanent you control becomes a copy of that spell until end of turn.
```

**Current tags:** `condition.cares_graveyard`, `condition.descend`, `effect.add_mana`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.mill`, `trigger.self_etb`, `trigger.spell_cast`

### Issues

- **missing**: `effect.clone_in_place`
  - **What's wrong:** Back-face static "up to one other target permanent you control becomes a copy of that spell until end of turn" is the canonical clone-in-place phrasing.
  - **Suggested fix:** verify `effect.clone_in_place` (if it exists) anchors on "becomes a copy of" and confirm DFC concatenation isn't filtering it. If the tag does not exist, the resolved-issues note about "becomes a copy" in-place clone already calls out the gap.

---

## The Millennium Calendar  <!-- audited 2026-05-26, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact
**Mana cost:** {1}

**Oracle text:**

```
Whenever you untap one or more permanents during your untap step, put that many time counters on The Millennium Calendar.
{2}, {T}: Double the number of time counters on The Millennium Calendar.
When there are 1,000 or more time counters on The Millennium Calendar, sacrifice it and each opponent loses 1,000 life.
```

**Current tags:** `effect.counter_modified`, `effect.has_activated_ability`, `effect.life_changed`

### Issues

- **missing**: `trigger.tapped_or_untapped`
  - **What's wrong:** "Whenever you untap one or more permanents during your untap step" is the canonical tapped/untapped trigger.
- **missing**: `effect.sacrifice_artifact` (self-sac on an artifact card)
  - **What's wrong:** "sacrifice it" with "it" = __SELF__ on an Artifact card. The rule's `matchCard` branch requires the literal `__self__` token, not pronoun "it".
  - **Suggested fix:** broaden the matchCard arm to also match `sacrifice it\b` when `card.types.includes('Artifact')` AND a `__SELF__` referent was established earlier in the text.

---

---

## Warden of the Inner Sky  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Creature — Human Soldier
**Mana cost:** {W}

**Oracle text:**

```
As long as this creature has three or more counters on it, it has flying and vigilance.
Tap three untapped artifacts and/or creatures you control: Put a +1/+1 counter on this creature. Scry 1. Activate only as a sorcery.
```

**Current tags:** `condition.cares_artifacts`, `effect.counter_modified`, `effect.grants_evasion`, `effect.grants_vigilance`, `effect.has_activated_ability`, `effect.plus_one_counter`, `effect.scry`

### Issues

- **false-positive**: `effect.grants_evasion`
  - **What's wrong:** Self-anaphoric leak. The "has flying" predicate refers back to "this creature" via the pronoun "it" — the card grants flying to ITSELF (conditionally), not to other creatures.
  - **Evidence vs reality:** evidence was `"has flying"` but the full clause is "As long as this creature has three or more counters on it, **it has flying** and vigilance." Same family as the manland/self-animation pattern called out in the skill's "Recurring patterns" section (Restless cycle), and adjacent to the anaphoric "it gains <kw>" leak (Pattern[1]) — except here the verb is `has` rather than `gains`.
  - **Suggested fix:** Extend `effect.grants_evasion`'s subject-exclusion lookbehind to block bare anaphoric `it has <kw>` when the antecedent is `__SELF__`/`this creature`. May also need to consider a "while/as long as X, it has Y" template specifically.

- **false-positive**: `effect.grants_vigilance`
  - **What's wrong:** Same self-anaphoric leak as `grants_evasion`. Vigilance here is a conditional self-static ability, not a grant to one or more (other) creatures.
  - **Evidence vs reality:** evidence was `"has flying and vigilance"`. Subject is "it" → "this creature". The tagDef says "Grants the vigilance keyword to one or more creatures (temporary or perpetual)" — the intended use is anthem-grants / target-grants to OTHERS.
  - **Suggested fix:** Mirror whatever lookbehind/subject exclusion lands for `grants_evasion`. If desired, route conditional self-static "has <kw>" cards to `effect.has_<kw>` instead — but those tagDefs currently say "as a printed intrinsic ability," which is a slight semantic stretch for conditional grants. Either broaden `has_*` to include conditional self-grants, or simply do not tag this kind of card under either axis.

- **missing**: `effect.gains_keyword_self_conditional`
  - **What's wrong:** `gains_keyword_self_conditional`'s description ("This creature/permanent gains an evasion keyword (flying, menace, intimidate) under a gating condition") matches Warden's flying clause exactly. Should fire on "As long as this creature has three or more counters on it, it has flying" — but didn't. Likely the rule's pattern requires `gains` rather than `has`, or anchors on a different "while/as long as" template.
  - **Evidence vs reality:** missing — the gating condition is `"as long as this creature has three or more counters on it"` and the keyword is `"flying"` (one of the in-scope keywords).
  - **Suggested fix:** Broaden `effect.gains_keyword_self_conditional`'s pattern to also accept `(it|this creature|__SELF__) has <kw>` inside a "while/as long as/if" frame, not just `gains`. Pairs naturally with narrowing `grants_evasion` for the false-positive above — once gains_keyword_self_conditional captures these cards, grants_evasion can safely exclude them.


---

## Zoyowa Lava-Tongue  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Legendary Creature — Goblin Warlock
**Mana cost:** {B}{R}

**Oracle text:**

```
Deathtouch
At the beginning of your end step, if you descended this turn, each opponent may discard a card or sacrifice a permanent of their choice. Zoyowa deals 3 damage to each opponent who didn't.
```

**Current tags:** `condition.descend`, `effect.draws_or_discards`, `effect.has_deathtouch`, `effect.sacrifice_artifact`, `effect.sacrifice_creature`, `effect.sacrifice_enchantment`, `effect.sacrifice_land`, `effect.sacrifice_permanent`, `effect.sacrifice_planeswalker`, `trigger.beginning_of_end_step`

### Issues

- **false-positive (×6)**: `effect.sacrifice_artifact`, `effect.sacrifice_creature`, `effect.sacrifice_enchantment`, `effect.sacrifice_land`, `effect.sacrifice_permanent`, `effect.sacrifice_planeswalker`
  - **What's wrong:** Classic edict-frame leak (Recurring pattern: "Typed-sacrifice leakage onto edicts and observer triggers"). The card forces opponents to sacrifice — the controller isn't sacrificing anything. All six typed-sacrifice tags + the generic `sacrifice_permanent` fired off the same evidence substring.
  - **Evidence vs reality:** evidence was `"sacrifice a permanent"`, but the full clause is "each opponent may discard a card or **sacrifice a permanent** of their choice." Subject is `each opponent`, not the controller. This is exactly the Vito-pattern leak's Pattern A (edict frame).
  - **Suggested fix:** Add an `each\s+opponent` / `target\s+opponent` subject exclusion to the `_OWN` alternation in the typed-sacrifice rules (and the generic `effect.sacrifice_permanent`). Same fix shape as proposed for prior edict false positives — see existing CARD_ISSUES entries for the Vito-pattern.

- **missing**: `effect.edict`
  - **What's wrong:** This is the textbook edict — "each opponent may discard a card or sacrifice a permanent of their choice." `effect.edict`'s tagDef ("Forces an opponent or each player to sacrifice a creature or permanent — Diabolic Edict / Innocent Blood family. Pairs with opponent-side dies triggers.") matches exactly, but the tag didn't fire.
  - **Evidence vs reality:** missing — clause `"each opponent may ... sacrifice a permanent of their choice"` should be a match. The `may` (optional, as part of a punishing choice) may be what's blocking the rule, since classic edicts are hard ("target opponent sacrifices…").
  - **Suggested fix:** Broaden `effect.edict` to accept "each opponent may <thing> or sacrifice a permanent" (Rack/Wrench-style punisher edicts). Make sure the test fixtures cover the punisher template.

- **missing**: `effect.targeted_discard`
  - **What's wrong:** "Each opponent may discard a card" should fire `effect.targeted_discard` (the description explicitly says "or each opponent"). Currently only `effect.draws_or_discards` fires off this clause, which is the generic self-loot axis.
  - **Evidence vs reality:** missing — clause is `"each opponent may discard a card"`. Likely the `may` qualifier is what's blocking.
  - **Suggested fix:** Broaden `effect.targeted_discard` to accept the punisher-edict frame ("each opponent may discard a card or <else>"). Same broadening shape as the `effect.edict` fix above — they're the two sides of a punisher.

- **missing**: `effect.deals_damage`
  - **What's wrong:** "Zoyowa deals 3 damage to each opponent who didn't" is a straightforward damage-to-players effect. The generic tag is described as "Deals damage to a player, permanent, or planeswalker" — should match.
  - **Evidence vs reality:** missing — clause `"<__SELF__> deals 3 damage to each opponent"` should be a match. Likely the rule anchors on a target syntax and the `each opponent who didn't` qualifier doesn't fit.
  - **Suggested fix:** Broaden `effect.deals_damage` to accept `each opponent` / `each opponent <qualifier>` as a damage destination, alongside `target player`/`target creature`.


---

## Agency Outfitter  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Creature — Sphinx Detective
**Mana cost:** {4}{U}{U}

**Oracle text:**

```
Flying
When this creature enters, you may search your graveyard, hand and/or library for a card named Magnifying Glass and/or a card named Thinking Cap and put them onto the battlefield. If you search your library this way, shuffle.
```

**Current tags:** `effect.has_flying`, `trigger.self_etb`

### Issues

- **missing (narrow / borderline)**: `effect.tutor_any`
  - **What's wrong:** The card searches the **library** for a named card and puts it onto the battlefield. `effect.tutor_any` covers "Searches library for any card (no subtype restriction)" — a named tutor IS a tutor.
  - **Evidence vs reality:** missing — clause includes `"search your ... library for a card named ..."`. Rule likely anchors on `search your library for a creature card` or `for a card` and may not handle the `for a card named X and/or a card named Y` template.
  - **Suggested fix:** Broaden `effect.tutor_any` to accept `search your library for a card named .+(?: and/or a card named .+)?`. Low-priority — name-specific tutors are rare. Consider only if a second case surfaces.


---


## Anzrag's Rampage  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Sorcery
**Mana cost:** {3}{R}{R}

**Oracle text:**

```
Destroy all artifacts you don't control, then exile the top X cards of your library, where X is the number of artifacts that were put into graveyards from the battlefield this turn. You may put a creature card exiled this way onto the battlefield. It gains haste. Return it to your hand at the beginning of the next end step.
```

**Current tags:** `effect.board_wipe`, `effect.cast_noncreature_spell`, `effect.destroy_artifact`, `effect.exile_from_library`, `effect.grants_haste`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.bounce_creature`
  - **What's wrong:** "Return it to your hand at the beginning of the next end step" — this is the textbook "blink-back" bounce of the cheated-in creature. `effect.bounce_creature`'s description includes "Returns a creature to hand, or exiles and returns it (re-triggering ETB)." Should fire on the delayed-trigger bounce.
  - **Evidence vs reality:** missing — clause `"return it to your hand at the beginning of the next end step"`. Antecedent of "it" is the creature you put onto the battlefield three sentences earlier (the cheated-in creature). Same anaphoric-removal blind spot as Agrus Kos.
  - **Suggested fix:** Broaden `effect.bounce_creature` to recognize `return it to (your|its owner's) hand` when the "it" antecedent is a creature established earlier in the same paragraph. Conservative variant: also accept the bare `return it to (your|its owner's) hand at the beginning of (the next )?end step` frame (cheat-back pattern).

- **missing**: `trigger.beginning_of_end_step`
  - **What's wrong:** "Return it to your hand at the beginning of the next end step" is a delayed end-step trigger created by the spell's resolution. `trigger.beginning_of_end_step` says "Has an ability that triggers at the beginning of an end step." Delayed triggers count.
  - **Evidence vs reality:** missing — clause `"at the beginning of the next end step"` should be a match. Likely the rule's regex anchors on a printed `at the beginning of (your|each|the) end step` from a permanent's static text and skips the `the next end step` delayed-trigger frame.
  - **Suggested fix:** Broaden `trigger.beginning_of_end_step` to also accept `at the beginning of (the next|the next player's)? end step` (delayed-trigger frame on spells).

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** Card scales X off "the number of artifacts that were put into graveyards from the battlefield this turn." That's clearly artifact-cares for deckbuilding, but `condition.cares_artifacts` is described as "References artifact count, artifact ETBs, or artifacts you control" — the rule likely doesn't recognize an artifact-death-count clause.
  - **Evidence vs reality:** missing — clause `"the number of artifacts that were put into graveyards from the battlefield this turn"`. This is the artifact-aristocrat archetype (sacrifice/death of artifacts as a payoff).
  - **Suggested fix:** Either broaden `condition.cares_artifacts` to also accept `artifacts (that )?(were|have been) put into (your )?graveyards?` / `artifacts (that )?died` (artifact-death framing), OR author a sibling `condition.cares_artifact_dies` analogous to `condition.cares_creatures_died_this_turn`. Sibling-tag approach is probably cleaner since it lines up with the existing creatures-died axis.


---

## Anzrag, the Quake-Mole  <!-- audited 2026-05-26, ruleVersion v0.14.1 -->

**Type:** Legendary Creature — Mole God
**Mana cost:** {2}{R}{G}

**Oracle text:**

```
Whenever Anzrag becomes blocked, untap each creature you control. After this phase, there is an additional combat phase.
{3}{R}{R}{G}{G}: Anzrag must be blocked each combat this turn if able.
```

**Current tags:** `effect.has_activated_ability`, `effect.untap`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.extra_combat` (no such tag exists — family-level coverage gap)
  - **What's wrong:** Extra-combat-phase effects have no catalog representation. Appears on ~10 Standard cards (Anzrag the Quake-Mole, Great Train Heist, Fear of Missing Out, Aurelia the Warleader, Full Throttle, All-Out Assault, Balthier and Fran, Genji Glove, …). Distinct mechanic from beginning-of-combat triggers — these grant an additional attack step.
  - **Suggested fix:** Author `effect.extra_combat`. Pair with `trigger.beginning_of_combat` (additional combats also fire begin-of-combat triggers) and with combat-payoff conditions like `condition.cares_attacking` (also a gap below).
  - **Note:** First audited case of this family. Refer back here for the other 9.

- **missing**: `effect.lure` / `effect.must_be_blocked` (no such tag exists — family-level coverage gap)
  - **What's wrong:** "Must be blocked if able" / Lure-style effects have no catalog tag. Appears on 8 Standard cards (Disturbed Slumber, Anzrag the Quake-Mole, Fear of Being Hunted, Joraga Invocation, Magitek Scythe, The Masamune, Vinebred Brawler, Raphael Ninja Destroyer).
  - **Suggested fix:** Author `effect.lure` (covers both "must be blocked" and the related goad). Small family but distinct mechanic from combat triggers and from `effect.pacify`. Low-priority — likely defer to a wider combat-axis batch.

- **borderline**: `trigger.attack_or_block` on "becomes blocked"
  - **What's wrong:** Description is "Triggers when a creature attacks or blocks." Anzrag's clause is "whenever Anzrag becomes blocked" — Anzrag is the attacker BEING BLOCKED, not blocking. Semantic stretch but not strictly wrong, since the trigger does fire during the declare-blockers step.
  - **Suggested fix:** Either broaden the description to "attacks, blocks, or becomes blocked," OR (preferred) author a distinct `trigger.becomes_blocked` for the attacker-side combat trigger and narrow `attack_or_block`. The attacker-blocked frame pairs naturally with `effect.lure` / `effect.must_be_blocked` cards above. Low-priority — leave alone until the combat-axis batch.


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

**Current tags:** `effect.cast_noncreature_spell`, `effect.counter_modified`, `effect.exile_artifact`, `effect.exile_enchantment`, `effect.is_instant_or_sorcery`, `effect.plus_one_counter`, `effect.tutors_creature`

### Issues

- **missing (borderline / coverage gap)**: ramp + tutor framing
  - **What's wrong:** Mode 1 of the charm reads "Search your library for a creature or land card ... Put it onto the battlefield tapped if it's a land card." If you pick a land, this is non-basic ramp (any land, into play tapped). `effect.ramp_nonland`'s description restricts to "fetches a **basic** land directly into play" — so Archdruid's Charm doesn't match cleanly. `effect.tutors_basic_land` similarly basic-restricts. The only tutor tag that fires is `effect.tutors_creature` for the creature half of the choice.
  - **Evidence vs reality:** missing — clause `"search your library for a creature or land card ... put it onto the battlefield tapped if it's a land card"` has no tag that captures the land-ramp half.
  - **Suggested fix:** Either broaden `effect.ramp_nonland` to drop the "basic" restriction (most ramp payoffs care about ANY land entering, not just basic), OR author a sibling `effect.ramp_any_land` for non-basic ramp. The wider broadening probably has more graph value — pairs naturally with `trigger.landfall` and `condition.cares_lands`.


---

---

## Burden of Proof  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Aura
**Mana cost:** {1}{U}

**Oracle text:**

```
Flash
Enchant creature
Enchanted creature gets +2/+2 as long as it's a Detective you control. Otherwise, it has base power and toughness 1/1 and can't block Detectives.
```

**Current tags:** `effect.grants_stat_buff`, `effect.has_flash`

### Issues

- **missing**: `condition.cares_tribe.detective` (no such tag exists — small family-level coverage gap)
  - **What's wrong:** Card gates its anthem on the enchanted creature being a Detective AND restricts blocks vs Detectives. Detective is a MKM tribal theme with no catalog representation in the parametric `condition.cares_tribe.*` set.
  - **Evidence vs reality:** "as long as it's a Detective you control" + "can't block Detectives" — two distinct Detective-cares references in one card.
  - **Suggested fix:** Add `Detective` to `THEME_TRIBES` in `pipeline/themes.ts`. Auto-generates `condition.cares_tribe.detective` via the parametric rule. Small family — likely 5-10 Standard cards.

---

## Case File Auditor  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Creature — Human Detective
**Mana cost:** {2}{W}

**Oracle text:**

```
When this creature enters and whenever you solve a Case, look at the top six cards of your library. You may reveal an enchantment card from among them and put it into your hand. Put the rest on the bottom of your library in a random order.
You may spend mana as though it were mana of any color to cast Case spells.
```

**Current tags:** `effect.look_at_top_n`, `trigger.self_etb`

### Issues

- **missing**: `trigger.case_solved` / `effect.solve_case` (no such tags exist — family-level MKM gap)
  - **What's wrong:** Case is a MKM enchantment subtype with a "solve" mechanic — distinct from suspect, disguise, collect-evidence. Many cards trigger "whenever you solve a Case" or have the "To solve: ..." clause. No catalog representation.
  - **Evidence vs reality:** Oracle text contains "whenever you solve a Case". ~14 Case cards in MKM (Case of the Stashed Skeleton, Case of the Crimson Pulse, etc. — most of which are right around the corner in this worklist).
  - **Suggested fix:** Author the Case family per same shape as suspect/collect-evidence: `effect.solve_case` (producer — text "To solve: X. When solved, Y"), `trigger.case_solved` (carer — "whenever you solve a Case"). Probably also `condition.cares_solved_case` for static modifiers. Right around 14 cards.

---

## Case of the Burning Masks  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {1}{R}{R}

**Oracle text:**

```
When this Case enters, it deals 3 damage to target creature an opponent controls.
To solve — Three or more sources you controlled dealt damage this turn. (If unsolved, solve at the beginning of your end step.)
Solved — Sacrifice this Case: Exile the top three cards of your library. Choose one of them. You may play that card this turn.
```

**Current tags:** `effect.deals_damage`, `effect.exile_from_library`

### Issues

- **missing**: `effect.solve_case` / `trigger.case_solved` (family-level gap — already logged under Case File Auditor)

---

## Case of the Gateway Express  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {1}{W}

**Oracle text:**

```
When this Case enters, choose target creature you don't control. Each creature you control deals 1 damage to that creature.
To solve — Three or more creatures attacked this turn. (If unsolved, solve at the beginning of your end step.)
Solved — Creatures you control get +1/+0.
```

**Current tags:** `effect.grants_stat_buff`

### Issues

- **missing**: Case mechanic family (already logged)

---

## Case of the Gorgon's Kiss  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {B}

**Oracle text:**

```
When this Case enters, destroy up to one target creature that was dealt damage this turn.
To solve — Three or more creature cards were put into graveyards from anywhere this turn. (If unsolved, solve at the beginning of your end step.)
Solved — This Case is a 4/4 Gorgon creature with deathtouch and lifelink in addition to its other types.
```

**Current tags:** `condition.cares_deathtouch`, `effect.destroy_creature`, `effect.grants_deathtouch`, `effect.grants_lifelink`

### Issues

- **false-positive**: `condition.cares_deathtouch`
  - **What's wrong:** Self-animation leak — card becomes a creature WITH deathtouch as a self-buff, not a deathtouch-cares payoff. Same shape as the manland / Restless cycle leak in recurring patterns ("Manland / self-animation leaks `condition.cares_deathtouch`").
  - **Evidence vs reality:** evidence "creature with deathtouch" comes from "This Case is a 4/4 Gorgon creature with deathtouch and lifelink" — self-animation grants own keywords; doesn't reference deathtouch creatures as a payoff group.
  - **Suggested fix:** Add a lookbehind to exclude "becomes a"/"is a" frames preceding "creature with deathtouch" (parallel to how `condition.cares_tribe` already strips `becomes a ... creature` framing). Affects Cases, manlands, future self-animating enchantments.

---

## Case of the Pilfered Proof  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {1}{W}

**Oracle text:**

```
Whenever a Detective you control enters or is turned face up, put a +1/+1 counter on it.
To solve — You control three or more Detectives. (If unsolved, solve at the beginning of your end step.)
Solved — If one or more tokens would be created under your control, those tokens plus a Clue token are created instead. (It's an artifact with "{2}, Sacrifice this token: Draw a card.")
```

**Current tags:** `effect.counter_modified`, `effect.plus_one_counter`

### Issues

- **missing**: `trigger.another_creature_etb`
  - **What's wrong:** "Whenever a Detective you control enters" — a tribal-restricted version of "whenever a creature enters". The trigger.another_creature_etb regex probably anchors on the un-restricted form or accepts only `[\w\-]+` filler, but "Detective" should fall under that filler.
  - **Evidence vs reality:** Detective is a creature type. "A Detective you control enters" = "another creature (typed Detective) you control enters". Should fire if the filler allows tribal restriction.
  - **Suggested fix:** Verify trigger.another_creature_etb matches `whenever a <tribe-or-noun> you control enters`. Likely already does — check why not on this card. May be a Case-subtype-specific filter at the matchCard level.
- **missing**: `effect.create_token` / `effect.create_clue` (replacement-effect frame)
  - **What's wrong:** "If one or more tokens would be created under your control, those tokens plus a Clue token are created instead" — this replacement effect creates Clue tokens but uses a non-standard frame the rules likely miss.
  - **Evidence vs reality:** Solved clause delivers Clue tokens via Anointed-Procession-style replacement. The literal output is more Clues; the rules anchor on "create a/an X token" direct frames.
  - **Suggested fix:** Broaden `effect.create_clue` to also match `... plus a clue token are created` frame. Probably affects a small handful of token-replacement cards.



---

# Round 4 audit — 2026-05-27 (50 cards, batches 1–5)

50 cards audited: Case of the Trampled Garden → Faerie Snoop (alphabetical, 50 consecutive UNPROCESSED entries). 5 parallel subagents, 10 cards each. RuleVersion v0.14.3 (artifact at v0.14.3 source level — but see Tier 1 stale-artifact note below).

**Counts:** 50 audited · 22 with issues · 28 clean (no entry) · 37 issue bullets logged.

## Commonalities & proposed remedies

Organized by tier of effort. **Tier 1** is a zero-rule-change rebuild that erases ~9 of the 37 bullets immediately. **Tier 2** is regex broadenings on existing rules. **Tier 3** is new rules / coverage gaps. **Tier 4** is deferred / single-card.

### Tier 1 — Stale-artifact rebuild — RESOLVED 2026-05-28

Artifact rebuilt; `effect.create_clue` / `effect.create_token` now fire on bare `investigate` for all 9 cards (Chalk Outline, Cold Case Cracker, Deduce, Detective's Satchel, Drag the Canal, Eliminate the Impossible, Evidence Examiner ×2, Ezrim Agency Chief ×2). Process improvement (pre-flight artifact-staleness check in `mtg-graph-card-tag-audit`) is still TODO for the skill.

### Tier 2 — Regex broadenings on existing rules (~15 entries clear)

Each item below is a discrete narrow regex fix on an existing rule. Grouped by what they have in common.

**B. Self-ETB / self-trigger phrasings beyond "this creature".** Two distinct shapes:
- `trigger.self_etb` doesn't match non-creature subtypes: "When this Case enters" (Case of the Trampled Garden). Per recurring patterns the rule covers `__SELF__` and "this creature" — need to admit `this (case|saga|class|room|aura|artifact|equipment|vehicle|food|clue|treasure|...)`.
- `trigger.self_etb` doesn't match `as` framing: "As this creature enters or is turned face up" (Crowd-Control Warden). Replacement-effect-on-ETB phrasing reads as a trigger but the rule anchors on `(?:when|whenever)` only.
- **Remedy:** extend the verb group to `(?:when|whenever|as)` AND broaden the subject group to non-creature `this <subtype>` forms. Watch out: "as it enters tapped" replacement-effects must NOT trigger — gate the `as` branch on the presence of a comma-separated effect clause, not just an ETB reference.

**C. Multi-keyword choice grants.** `effect.grants_<kw>` family requires `gains?\s+<kw>` adjacency. Cards templated "gains your choice of <kw1>, <kw2>, or <kw3>" miss ALL the keyword grants. Hits Ezrim Agency Chief (loses `grants_vigilance`, `grants_lifelink`, `grants_hexproof` simultaneously). Pattern extends to Cadric Soul Kindler, Phyrexian Vatmother analogs. **Remedy:** add a frame `gains?\s+your choice of\s+([\w, ]+)\s+(?:or|and)\s+(\w+)` and expand each captured keyword to a separate `effect.grants_<kw>` evidence emission. Modeled on the existing comma-list Frame F2.

**D. `cares_high_power` / `cares_low_power` FP on blocker-restriction.** "Can't be blocked by creatures with power N or greater/less" matches the cares-power regex but is pseudo-evasion, not a high/low-power payoff. Hits Exit Specialist (FP on `cares_high_power`). Delney also pulls both `cares_high_power` and `cares_low_power` from "creatures … with power 2 or less can't be blocked by creatures with power 3 or greater" — the first half is a real low-power care, the second is an evasion gate. **Remedy:** add a negative lookbehind excluding `can't be blocked by\s+(?:creatures with\s+)?power\s+\d+\s+or\s+(greater|more|less)` to both rules. Mirror the fix on both axes.

**E. Self-target subjects in bounce / tuck regexes.** Type-specific bounce and tuck rules use `target X` / `it` / `that card` subject alternations but don't admit Aura/Equipment self-target subjects:
- `effect.bounce_artifact`, `effect.bounce_or_blink` miss "Return this Equipment to its owner's hand" (Cryptic Coat).
- `effect.tuck_to_library` Frame D2 misses "Shuffle enchanted creature into its owner's library" (Dramatic Accusation).
- **Remedy:** extend subject alternations in both rules to include `this (artifact|equipment|vehicle|enchantment|aura)|enchanted creature|attached creature|equipped creature`. Audit all typed-effect tags (destroy/exile/sacrifice/bounce/tuck) for the same shape — these are all candidates for the same Aura/Equipment self-target blind spot.

**F. `trigger.creature_leaves_graveyard` plural form.** "Whenever one or more creature cards leave your graveyard" (Chalk Outline) misses; rule probably anchors on `a creature card leaves`. **Remedy:** add `(?:one or more )?creature cards?` to the noun group.

**G. `effect.untap` anaphoric "untap them".** "creatures you control gain hexproof until end of turn. Untap them." (Essence of Antiquity) misses because the rule wants `untap target X` / `untap all X`. **Remedy:** add `\buntap (?:them|those|these)\b` alternation; verify single-target precision isn't lost.

**H. `effect.mill` dig-N-keep-M frame.** "look at top two cards … put one into your hand and the other into your graveyard" (Faerie Snoop) — the mill rule has "the rest into … graveyard" for dig-N-keep-1 but not "the other into … graveyard" for dig-2-keep-1. **Remedy:** add `\bthe other into (?:your|their|its owner's) graveyard\b` companion frame.

**I. `trigger.damage_dealt` passive-voice phrasing.** "Whenever a creature is dealt damage" (Expedited Inheritance) misses. Rule anchors on active "deals damage". **Remedy:** add `(?:is|are) dealt damage` alternation. Watch: "is dealt combat damage" vs "is dealt damage by a source" — both should fire.

**J. `effect.impulse_draw` third-person controller.** "its controller may exile that many cards from the top of their library. They may play those cards until the end of their next turn." (Expedited Inheritance) — rule likely first-person-controller-locked. **Remedy:** expand subject alternations to admit `(?:you|its controller|they|that player) may (?:exile|play)` framings.

**K. `effect.exile_from_library` tutor-style search-and-exile.** "search its owner's graveyard, hand, and library for any number of cards with that name and exile them" (Deadly Cover-Up) — rule likely anchors on "exile the top N cards" / "exile cards from a library" without the search-anchor variant. **Remedy:** add `search [\w' ]+ library\s+for[^.]+ and exile (?:them|those|that)` alternation.

**L. `trigger.permanent_sacrificed` token-type framing.** "When you sacrifice a Clue, …" (Curious Cadaver) — rule wants `creature|artifact|enchantment|land|permanent|token` in the noun slot but doesn't list specific artifact-token types. **Remedy:** add `(?:clue|treasure|food|map|blood|gold)` to the noun alternation. Family-level (MKM/WOE/LCI/DSK aristocrats payoffs).

**M. `effect.draws_or_discards` count-slot — "your hand".** "Discard your hand" cost on Connecting the Dots misses because the count slot enumerates `a card | N cards | that many cards | cards equal to X` but not `your hand` as an object. **Remedy:** add `your hand` to the count enumeration.

**N. `effect.control_change` Aura "you control enchanted X".** Coerced to Kill: Control-Magic Aura template misses because the rule anchors on "gain control of target". **Remedy:** add an Aura frame `you control (?:enchanted|attached|equipped) (?:creature|permanent)` (static control-grant).

**O. `condition.cares_lifegain` "this turn" cumulative gate.** "You've gained 5 or more life this turn" (Case of the Uneaten Feast). **Remedy:** add `(?:you've|you have) gained\s+\d+\s+or more life (?:this turn)?` alternation.

**P. Enchantment-subtype self-sac.** Case of the Uneaten Feast: "Sacrifice this Case:" should hit `effect.sacrifice_enchantment` AND `effect.has_activated_ability`. The case rule treats Case as a noun without recognizing it's an enchantment subtype. **Remedy:** extend `effect.sacrifice_enchantment` to match `sacrifice this (?:case|saga|class|room|shrine|aura|role)` for the self-sac branch; verify `effect.has_activated_ability` already covers cost:effect bare frames on enchantments.

**Q. `condition.cares_artifacts` per-turn sacrifice gate.** Detective's Satchel: "Activate only if you've sacrificed an artifact this turn" — niche but real. **Remedy:** optional; low priority. Could add `you've sacrificed an artifact (?:this turn)?` alternation.

### Tier 3 — Coverage gaps (new rules to author)

**T. `effect.doubles_triggers` (Panharmonicon family).** Delney, Streetwise Lookout's second ability: "If a triggered ability of a creature you control … triggers, that ability triggers an additional time." Coverage gap with potential to wire many existing trigger.* axes as pairsWith. Other Standard family members: Panharmonicon (if reprinted), ETB-doublers, Strixhaven Stadium triggers, casualty-doublers. **Design decision required:** does `doubles_triggers` pair with every `trigger.*` (broad) or only ETB-family triggers (narrow)? Suggest narrow (ETB + LTB) for v1, broaden later.

**U. Cast-from-graveyard license effect.** Already noted as a persistent gap (Tarrian's Journal deferred entry). Case of the Uneaten Feast surfaces it again: "Creature cards in your graveyard gain 'You may cast this card from your graveyard' until end of turn." Same recurring shape; not a new pattern. (`effect.cheat_into_play` is now shipped; this item tracks only the still-unresolved cast-from-graveyard license tag.)

### Tier 4 — Deferred / single-card / possible-FP

- **`effect.draws_or_discards` opponent-draw FP.** Deadly Cover-Up: "that player shuffles, then draws a card for each card exiled from their hand this way" — controller does NOT draw. Could pair incorrectly with spells-matter / prowess via this tag. Single-card today; defer until a 2nd opponent-draw card surfaces.
- **`trigger.another_creature_etb` on tribal-restricted filler "a Detective you control".** Case of the Pilfered Proof — already in the file from the earlier round. Same shape: filler `[\w\-]+` should admit tribe names. Verify if this is already shipped in v0.14.3.
- **`effect.create_token` / `effect.create_clue` replacement-effect frame.** Same Case of the Pilfered Proof entry: "those tokens plus a Clue token are created instead" replacement-effect template. Niche, family of ~3–5 cards (Anointed Procession variants).

## Action plan (in order)

1. **Right now:** `npm run build:cards -- --standard` to rebuild the artifact. Re-run the 9 stale-artifact card lookups; delete those bullets from the Round 4 entries below. (Zero-risk, single command, ~5min.)
2. **Next session:** dispatch `mtg-graph-narrow-tag-rule` on the Tier 2 broadenings. Group by file edited:
   - One PR: `trigger.self_etb.ts` (items B, also Case ETB), `trigger.creature_leaves_graveyard.ts` (F), `trigger.damage_dealt.ts` (I), `trigger.permanent_sacrificed.ts` (L).
   - One PR: `effect.bounce_artifact.ts`, `effect.bounce_or_blink.ts`, `effect.tuck_to_library.ts` (E — shared "Aura/Equipment self-target" theme).
   - One PR: `effect.untap.ts` (G), `effect.mill.ts` (H), `effect.impulse_draw.ts` (J), `effect.exile_from_library.ts` (K), `effect.draws_or_discards.ts` (M).
   - One PR: `effect.grants_keyword.ts` (C), `condition.cares_high_power.ts` + `condition.cares_low_power.ts` (D), `effect.control_change.ts` (N), `condition.cares_lifegain.ts` (O), `effect.sacrifice_enchantment.ts` (P).
3. **Tier 3 design pass first, then rule authoring:** T needs a 1-page design note covering scope (count doubles cards across MKM + DSK + BLB Standard sets), pairsWith wiring, and test fixtures. **Don't author blind.**
4. **Skill update:** add the artifact-staleness pre-flight check to `mtg-graph-card-tag-audit` so the next audit batch catches this in 10s instead of rediscovering it via 5 subagents.

---

## Per-card entries — Round 4

> **Shipped in `v0.14.4` (2026-05-27):** 19 of 22 Round-4 per-card entries fully resolved (commits `49b598d` through `0a3789d`, plus revert `aabe780`). Resolved cards have been deleted from the per-card list below. Remaining: Case of the Uneaten Feast (cast-from-graveyard license — Tier 3), Delney (doubles_triggers — Tier 3), Detective's Satchel (cares_artifacts per-turn-sacrifice gate — low-priority unshipped item Q from the action plan).

---

## Case of the Uneaten Feast  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Enchantment — Case
**Mana cost:** {W}

**Oracle text:**

```
Whenever a creature you control enters, you gain 1 life.
To solve — You've gained 5 or more life this turn. (If unsolved, solve at the beginning of your end step.)
Solved — Sacrifice this Case: Creature cards in your graveyard gain "You may cast this card from your graveyard" until end of turn.
```

**Current tags:** `condition.cares_graveyard`, `condition.cares_lifegain`, `effect.life_changed`, `effect.sacrifice_enchantment`, `trigger.another_creature_etb`

### Issues

- **missing**: `effect.has_activated_ability`
  - **What's wrong:** Solved adds an activated ability ("Sacrifice this Case: ...").
  - **Evidence vs reality:** the Solved clause is an activated ability (cost: effect) on the enchantment. Per recurring pattern, `effect.has_activated_ability` should match bare-cost activations on non-creatures.
  - **Suggested fix:** ensure the rule captures sac-cost activated abilities on enchantments (not just `{T}:` or mana-cost activations on creatures).

- **missing**: no "cast from graveyard license" tag exists
  - **What's wrong:** "Creature cards in your graveyard gain 'You may cast this card from your graveyard'" is a temporary cast-from-graveyard license — distinct from any keyword in the existing `condition.cast_from_graveyard` rule. This is the known persistent gap for non-keyword cast-from-graveyard effects.
  - **Suggested fix:** coverage gap — author a rule (`effect.grant_cast_from_graveyard` or extend `condition.cast_from_graveyard` to an effect-axis sibling) for the "you may cast this card from your graveyard" license family.

---

## Delney, Streetwise Lookout  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Legendary Creature — Human Scout
**Mana cost:** {2}{W}

**Oracle text:**

```
Creatures you control with power 2 or less can't be blocked by creatures with power 3 or greater.
If a triggered ability of a creature you control with power 2 or less triggers, that ability triggers an additional time.
```

**Current tags:** `condition.cares_low_power`

### Issues

- **missing: no `effect.doubles_triggers` exists**
  - **What's wrong:** Delney's second ability is a Panharmonicon-family effect ("If a triggered ability of a creature you control with power 2 or less triggers, that ability triggers an additional time"). No tag in the catalog captures the doubling-triggers axis. Other cards in this family in Standard: Panharmonicon, Spirit-Sister's Call, ETB-doublers, Strixhaven Stadium triggers, etc. (worth scoping).
  - **Evidence vs reality:** No evidence currently logged. Oracle text: "that ability triggers an additional time."
  - **Suggested fix:** Author `effect.doubles_triggers` rule. Pairs with the various `trigger.*` axes (could be modelled by pairsWith on every trigger.* tag, or via a graph-level catch-all — design decision).



---

## Detective's Satchel  <!-- audited 2026-05-27, ruleVersion v0.14.3 -->

**Type:** Artifact
**Mana cost:** {2}{U}{R}

**Oracle text:**

```
When this artifact enters, investigate twice. (To investigate, create a Clue token. It's an artifact with "{2}, Sacrifice this token: Draw a card.")
{T}: Create a 1/1 colorless Thopter artifact creature token with flying. Activate only if you've sacrificed an artifact this turn.
```

**Current tags:** `effect.create_clue`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_evasion`, `effect.has_activated_ability`, `trigger.self_etb`

### Issues

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** "Activate only if you've sacrificed an artifact this turn" is a per-turn artifact-sacrifice gate — caring about artifact sacrifices is a `cares_artifacts` signal.
  - **Evidence vs reality:** No evidence string was emitted; rule presumably doesn't match the "you've sacrificed an artifact this turn" qualifier.
  - **Suggested fix:** Broaden `condition.cares_artifacts` to recognize "(you've )?sacrificed an artifact (this turn)?" gates, or accept that this is a niche frame not worth catching.



---

# Round 5 audit — 2026-05-28 (25 cards, batches A–E)

25 cards audited: Fanatical Strength → Hard-Hitting Question (alphabetical, 25 consecutive UNPROCESSED entries). 5 parallel subagents, 5 cards each. RuleVersion v0.14.6.

**Counts:** 25 audited · 7 with issues · 18 clean (no entry). Tier breakdown:
- **Tier 2 (regex broadenings on existing rules) — SHIPPED IN v0.14.7:** Fugitive Codebreaker (`effect.cost_reduction` `is reduced by` template), Furtive Courier (`condition.cares_artifacts` per-turn-sacrifice gate — item Q resolved), Flotsam // Jetsam (`effect.cast_for_free` graveyard-source broadening, `condition.cares_graveyard` cast-from-graveyard reference), Flourishing Bloom-Kin (`effect.tutors_basic_land` typed-noun + `effect.ramp_nonland` cross-sentence Cultivate variant), Hard-Hitting Question (`effect.fight` narrowing — exclude one-sided pump-and-poke).
- **Tier 3 (coverage gaps — new rules) — SHIPPED IN v0.14.8:** Galvanize (`condition.cares_cards_drawn_this_turn` — 7 cards in Standard now carry it), Furtive Courier (`effect.unblockable` — 53 cards in Standard now carry it; chose single tag covering intrinsic + conditional + anthem + temporary forms over splitting into `unblockable`/`unblockable_conditional`).
- **Tier 4 (deferred / single-card / family seed):** Goblin Maskmaker (`condition.cares_face_down` — single-card today; defer until 2nd face-down payoff surfaces).

---

## Goblin Maskmaker  <!-- audited 2026-05-28, ruleVersion v0.14.6 -->

**Type:** Creature — Goblin Citizen
**Mana cost:** {R}

**Oracle text:**

```
Whenever this creature attacks, face-down spells you cast this turn cost {1} less to cast.
```

**Current tags:** `effect.cost_reduction`, `trigger.attack_or_block`

### Issues

- **missing (deferred / single-card family seed)**: no `condition.cares_face_down` / `condition.cares_disguise` exists
  - **What's wrong:** Coverage gap. Goblin Maskmaker is a Disguise/Cloak payoff — cost-reduction scales on "face-down spells you cast." Catalog has producer side (`effect.has_disguise`, `effect.cloak`, `trigger.turned_face_up`) but no payoff condition for "cares about face-down spells / Disguise / Manifest / Cloak as a resource."
  - **Evidence vs reality:** `"face-down spells you cast this turn"`. Current tags cover the attack trigger and generic cost reduction but lose the face-down-specific synergy edge — this card should pair with the Disguise/Cloak producer family.
  - **Suggested fix:** Defer until a 2nd face-down payoff card surfaces. Low priority. When authored: `condition.cares_face_down` with pairsWith targeting `effect.has_disguise`, `effect.cloak`, and any Manifest/Morph producers.


# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

> **Active state (2026-05-28):** Per-card entries are now split:
> - **Newly logged issues** stay in this file. Audits append `## <Card Name>` sections here.
> - **Open issues** that couldn't be resolved in their original audit round have moved to `DEFERRED_CARD_ISSUES.md`. Tier 3 family gaps and Tier 4 single-card deferrals live there permanently until they get tackled.
> - **Resolved entries** are deleted from this file once the fix ships. See git log for historical detail.

Round-by-round audit history is preserved below for traceability.

---

# Round 1–3 audit history (2026-05-21 to 2026-05-26)

Aggregated into the `v0.14.1` release ("AGREED PLAN items 1–12"). 18 cards audited; resolved entries moved to `CARD_ISSUES_RESOLVED.md` at that time. Surviving deferrals later promoted to `DEFERRED_CARD_ISSUES.md` (Vito's Inquisitor, Tarrian's Journal, Everflowing Well).

---

# Round 4 audit — 2026-05-27 (50 cards, batches 1–5)

50 cards audited: Case of the Trampled Garden → Faerie Snoop. 5 parallel subagents, 10 cards each. RuleVersion v0.14.3 source level.

**Counts:** 50 audited · 22 with issues · 28 clean · 37 issue bullets logged.

- **Tier 1 (stale-artifact rebuild) — RESOLVED 2026-05-28:** 9 entries cleared by rebuilding the artifact (no rule change needed). Process improvement: the audit skill now recommends a pre-flight check (`stat -c %Y app/public/data/cards-standard.json` vs `git log -1 --format=%at -- pipeline/rules/`) before logging missing-tag entries.
- **Tier 2 (regex broadenings) — SHIPPED IN v0.14.6:** ~15 entries cleared across `trigger.tapped_or_untapped` (active "untap" voice), `effect.sacrifice_artifact` (anaphoric "it" branch), `effect.grants_evasion` + `effect.grants_keyword` (self-anaphor strip), `effect.gains_keyword_self_conditional` (gate-before-subject), typed-sacrifice rules (punisher-edict span), `effect.edict` / `effect.targeted_discard` / `effect.deals_damage` (punisher template + matchCard short-name), `effect.bounce_creature` (delayed-blink-back), `trigger.beginning_of_end_step` ("next end step"), `condition.cares_artifacts` (artifact-death), `condition.cares_deathtouch` ("is a" self-animation), `trigger.another_creature_etb` ("a <tribe>" determiner), `effect.create_clue` (replacement frame), `effect.has_activated_ability` (em-dash anchor), THEME_TRIBES `detective`.
- **Tier 3/4 (still open):** Anzrag the Quake-Mole (extra_combat + lure families), Case File Auditor / Case of the Burning Masks / Case of the Gateway Express (Case mechanic family), Case of the Uneaten Feast (cast-from-graveyard license — overlaps Tarrian's Journal), Delney (doubles_triggers), Vito's Inquisitor (single-card anaphor FP), The Everflowing Well (intentional exclusion), Agency Outfitter (borderline tutor_any), Archdruid's Charm (borderline ramp framing). **All moved to `DEFERRED_CARD_ISSUES.md`.**

---

# Round 5 audit — 2026-05-28 (25 cards, batches A–E)

25 cards audited: Fanatical Strength → Hard-Hitting Question. 5 parallel subagents, 5 cards each. RuleVersion v0.14.6.

**Counts:** 25 audited · 7 with issues · 18 clean.

- **Tier 2 (regex broadenings on existing rules) — SHIPPED IN v0.14.7:** Fugitive Codebreaker (`effect.cost_reduction` `is reduced by` template), Furtive Courier (`condition.cares_artifacts` per-turn-sacrifice gate — item Q resolved), Flotsam // Jetsam (`effect.cast_for_free` graveyard-source broadening + `condition.cares_graveyard` cast-from-graveyard reference), Flourishing Bloom-Kin (`effect.tutors_basic_land` typed-noun + `effect.ramp_nonland` cross-sentence Cultivate variant), Hard-Hitting Question (`effect.fight` narrowing — exclude one-sided pump-and-poke).
- **Tier 3 (new rules) — SHIPPED IN v0.14.8:** Galvanize (`condition.cares_cards_drawn_this_turn` — 7 cards in Standard now carry it), Furtive Courier (`effect.unblockable` — 53 cards in Standard now carry it; single tag covering intrinsic + conditional + anthem + temporary forms).
- **Tier 4 (deferred):** Goblin Maskmaker (`condition.cares_face_down` — single-card today). **Moved to `DEFERRED_CARD_ISSUES.md`.**

---

# Round 6 audit — 2026-05-28 (25 cards, batches A–E)

25 cards audited: Hearth Elemental // Stoke Genius → Kraul Whipcracker. 5 parallel subagents, 5 cards each. RuleVersion v0.14.8.

**Counts:** 25 audited · 15 with issues · 10 clean.

- **Tier 2 (14 items) — SHIPPED IN v0.14.9:** Harried Dronesmith (`trigger.beginning_of_end_step` `your next` determiner), Hedge Whisperer (`effect.untap` negated-rider FP), Hotshot Investigators (`effect.bounce_creature` `up to one other` determiner), Hunted Bonebrute (`effect.create_creature_token` + `effect.create_token` controller-leak narrow — token-axis analog of typed-sacrifice edict leakage), Illicit Masquerade (`effect.exile_creature` `dies, exile it` replacement), Ill-Timed Explosion (`effect.board_wipe` damage-sweeper), Incinerator of the Guilty (`trigger.collected_evidence` reflexive), Innocent Bystander (`trigger.damage_dealt` multi-word quantifier), Izoni (`condition.cares_tokens` "sacrifice N tokens" cost), Jaded Analyst (`condition.cares_cards_drawn_this_turn` ordinal frame), Judith (`effect.grants_keyword` `stripSpellGrants` helper — excludes "that spell gains <kw>"), Kaya (`trigger.creature_leaves_battlefield` + `trigger.creature_leaves_graveyard` "are put into exile" verb, paired commit), Knife (`effect.sacrifice_artifact` "this <subtype>" determiner), Kraul Whipcracker (`effect.destroy_permanent` "target token" wildcard).
- **Infrastructure (v0.14.9):** `pipeline/emit.ts` dropped JSON pretty-printing — artifact was approaching V8's 536MB max-string limit (528MB pretty-printed in v0.14.8). Compact JSON is 412MB.
- **Tier 4 (deferred):** Hustle // Bustle (`effect.turn_face_up`), Jaded Analyst (`effect.has_defender` known persistent gap; not Jaded-specific). **Hustle // Bustle moved to `DEFERRED_CARD_ISSUES.md`.**

---

# Round 7 audit — 2026-05-28 (63 cards, single batch)

63 cards audited: Agatha of the Vile Cauldron → Eriette of the Charmed Apple. Per-card serial audit (no subagent parallelism). RuleVersion v0.14.9.

**Counts:** 63 audited · 4 with issues · 59 clean.

- **Tier 2 (4 items) — SHIPPED IN v0.14.10:**
  - Beseech the Mirror (`condition.cares_low_mana_value` — optional `is\s+` arm between "value" and the number; 4 cards flipped: Beseech the Mirror, Soul Search, Guidelight Pathmaker, Thunderous Velocipede)
  - Bespoke Battlegarb (`effect.has_activated_ability` — keyword short-circuit on `Equip` and `Crew`; ~185 cards flipped: 102 Equipment + ~73 Vehicles previously missing the tag)
  - Bramble Familiar // Fetch Quest (`effect.bounce_creature` — `this\s+` determiner admits self-bounce; 2 cards flipped: Bramble Familiar, Fleeting Effigy)
  - Discerning Financier (`condition.cares_lands` — `(?:more|fewer) lands than (?:you|an opponent|target opponent)` catch-up gate; 4 cards flipped: Discerning Financier, Claim Jumper, Beza the Bounding Spring, Ticket Tortoise)

---

# Active issues

_None pending right now. New audit rounds will append `## <Card Name>` sections below._


---



