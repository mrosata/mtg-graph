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



# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

---

## Tolsimir, Midnight's Light  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Elf Scout
**Mana cost:** {2}{G}{W}{W}

**Oracle text:**

```
Lifelink
When Tolsimir enters, create Voja Fenstalker, a legendary 5/5 green and white Wolf creature token with trample.
Whenever a Wolf you control attacks, if Tolsimir attacked this combat, target creature an opponent controls blocks that Wolf this combat if able.
```

**Current tags:** `effect.create_creature_token`, `effect.grants_trample`, `effect.has_lifelink`, `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **missing**: `condition.cares_tribe.wolf` (coverage gap — no such tag in catalog)
  - **What's wrong:** Card both produces a Wolf token and gates a payoff on "Whenever a Wolf you control attacks". No wolf tribe is currently in THEME_TRIBES.
  - **Evidence vs reality:** Oracle text has explicit `Wolf creature token` and `Whenever a Wolf you control attacks`. A deckbuilding query for Wolf tribal payoffs (Werewolves / Pack Mentality archetype) cannot find this card.
  - **Suggested fix:** Add `wolf` to `pipeline/themes.ts THEME_TRIBES` to spin up `condition.cares_tribe.wolf`.
- **missing**: `effect.provoke` / `effect.must_block` (coverage gap — no such tag in catalog)
  - **What's wrong:** "target creature an opponent controls blocks that Wolf this combat if able" is the provoke / forced-block effect family. No catalog tag fires on "blocks ... if able" wording.
  - **Evidence vs reality:** Tolsimir's third clause is a textbook provoke variant; no rule in catalog matches "blocks .* if able".
  - **Suggested fix:** Author `effect.provoke` rule keyed on `blocks (target creature|that <noun>) (this combat |this turn )?if able`. Family includes Provoke keyword (Onslaught/Ravnica), Pack Leader, Tolsimir, Goad-adjacent.
- **missing metadata**: `effect.create_creature_token.metadata.creatureTypes` should include `wolf`
  - **What's wrong:** Token is a "legendary 5/5 green and white Wolf creature token" but `metadata.creatureTypes` is null on the current tag.
  - **Evidence vs reality:** Token-type extractor missed `Wolf` despite explicit creature-type word before `creature token`.
  - **Suggested fix:** Verify the token-type extractor handles compound color modifiers ("green and white Wolf"). Compare against working extractions on simpler "create a 1/1 Wolf creature token" cases.

---

## Tunnel Tipster  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Creature — Mole Scout
**Mana cost:** {1}{G}

**Oracle text:**

```
At the beginning of your end step, if a face-down creature entered the battlefield under your control this turn, put a +1/+1 counter on this creature.
{T}: Add {G}.
```

**Current tags:** `effect.add_mana`, `effect.counter_modified`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.plus_one_counter`, `effect.ramp_nonland`, `trigger.beginning_of_end_step`

### Issues

- **missing** (coverage gap): `condition.cares_face_down` (no such tag in catalog)
  - **What's wrong:** Card's trigger gates on "if a face-down creature entered the battlefield under your control this turn" — a morph/disguise/cloak/manifest payoff.
  - **Evidence vs reality:** No catalog tag matches `face-down creature` / `face down creature entered`. Closest are `effect.cloak`, `effect.has_disguise`, `trigger.turned_face_up`, none of which capture the consumer/payoff axis.
  - **Suggested fix:** Author `condition.cares_face_down` keyed on `face[\- ]down (?:creature|permanent)` and `(?:cast|put) (?:.+) face[\- ]down`. Pair with `effect.cloak`, `effect.has_disguise`, and any future `effect.manifest`. Likely 5-15 cards in modern Standard.

---

## Vannifar, Evolved Enigma  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Elf Ooze Wizard
**Mana cost:** {2}{G}{U}

**Oracle text:**

```
At the beginning of combat on your turn, choose one —
• Cloak a card from your hand.
• Put a +1/+1 counter on each colorless creature you control.
```

**Current tags:** `effect.cloak`, `effect.counter_modified`, `effect.plus_one_counter`, `trigger.beginning_of_combat`

### Issues

- **missing** (coverage gap): `condition.cares_colorless` (no such tag in catalog)
  - **What's wrong:** Second mode gates the +1/+1 counter on "each colorless creature you control" — a colorless / cloak / Eldrazi-matter payoff. Combined with the first mode producing a colorless face-down creature, Vannifar is a payoff for the colorless-matters archetype.
  - **Evidence vs reality:** No catalog tag for "cares about colorless creatures/permanents". Closest is `effect.cloak` (producer side). A deckbuilder cannot query "colorless-matter payoffs" today.
  - **Suggested fix:** Author `condition.cares_colorless` keyed on `colorless (?:creatures?|permanents?|spells?|cards?)`, `for each colorless`, `each colorless creature you control`. Pair with `effect.cloak`, future face-down/manifest effects, and any Eldrazi-spawn producers. Likely a small family — defer if <5 Standard cards.

---

## Yarus, Roar of the Old Gods  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Centaur Druid
**Mana cost:** {2}{R}{G}

**Oracle text:**

```
Other creatures you control have haste.
Whenever one or more face-down creatures you control deal combat damage to a player, draw a card.
Whenever a face-down creature you control dies, return it to the battlefield face down under its owner's control if it's a permanent card, then turn it face up.
```

**Current tags:** `effect.draws_or_discards`, `effect.grants_haste`, `effect.reanimate`, `trigger.creature_dies`

### Issues

- **missing** (coverage gap): `condition.cares_face_down` (same gap as Tunnel Tipster, Vannifar)
  - **What's wrong:** Both triggers explicitly gate on `face-down creature(s) you control`. Yarus is a Cloak/Disguise commander-shape payoff.
  - **Evidence vs reality:** Cannot be queried via "face-down matters" filter; no catalog tag.
  - **Suggested fix:** Author `condition.cares_face_down` per the Tunnel Tipster recommendation. Pair with `effect.cloak`, `effect.has_disguise`, `trigger.turned_face_up`.

---

## Akul the Unrepentant  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Scorpion Dragon Rogue
**Mana cost:** {B}{B}{R}{R}

**Oracle text:**

```
Flying, trample
Sacrifice three other creatures: You may put a creature card from your hand onto the battlefield. Activate only as a sorcery and only once each turn.
```

**Current tags:** `effect.has_flying`, `effect.has_trample`, `effect.sacrifice_creature`

### Issues

- **missing**: `effect.has_activated_ability` (and `effect.reanimate` / `effect.cheat_into_play`)
  - **What's wrong:** Two distinct bugs:
    1. `effect.has_activated_ability`: `PROSE_ACTIVATED_PATTERN` (`pipeline/rules/effect.has_activated_ability.ts:50`) anchors on `(?:^|\.\s|\n|—\s)` before the verb. But normalize.ts:109 **collapses newlines to spaces** (`selfed.toLowerCase().replace(/\s*\n+\s*/g, ' ')`), so the `\n` arm never fires. Keyword lines (`Flying, trample`) end without periods, so when collapsed, "trample sacrifice three other creatures: …" presents the verb after a `\s` boundary the anchor doesn't accept. The rule then silently misses every prose-cost activation that follows a keyword-only line.
    2. No `effect.reanimate` / `effect.cheat_into_play` for "put a creature card from your hand onto the battlefield". This is the Sneak Attack / Show and Tell family — distinct from graveyard reanimate (the existing `effect.reanimate` matches hand-onto-battlefield via "from your hand or graveyard" but NOT pure hand-only).
  - **Evidence vs reality:** Normalized text starts `flying, trample sacrifice three other creatures: you may put a creature card from your hand onto the battlefield.` Verbal sacrifice-cost activation is present and was even recognized by `effect.sacrifice_creature` — but the activated-ability axis missed it.
  - **Suggested fix:** Two fixes:
    1. Either preserve newlines in normalize.ts (riskier — many rules currently depend on collapsed text) OR have normalize.ts emit a `. ` delimiter between original newline-separated lines (insert `— ` or `. ` instead of plain space). Simpler localized fix: relax `PROSE_ACTIVATED_PATTERN` anchor to `(?:^|\.\s|\n|—\s|^\w[\w\s,]+?\s)` — but that risks broadening. Cleanest: in normalize.ts:109, change collapse to `replace(/\s*\n+\s*/g, ' — ')` so the em-dash anchor fires uniformly. Audit existing tests for any rule that depends on the bare-space join.
    2. Catalog gap — `effect.cheat_into_play` for "put a creature card from your hand onto the battlefield" frame (Sneak Attack, Akul). The skill's "Persistent gaps with no current rule" already names this gap; just confirming Akul as another concrete instance.

---

## Aloe Alchemist  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Creature — Plant Warlock
**Mana cost:** {1}{G}

**Oracle text:**

```
Trample
When this card becomes plotted, target creature gets +3/+2 and gains trample until end of turn.
Plot {1}{G}
```

**Current tags:** `effect.grants_stat_buff`, `effect.grants_trample`, `effect.has_plot`, `effect.has_trample`

### Issues

- **missing** (coverage gap): `trigger.becomes_plotted` (no such tag in catalog)
  - **What's wrong:** OTJ "When this card becomes plotted, ..." trigger frame has no catalog tag. Aloe Alchemist is one instance; the family includes Annie Flash, Slickshot Lockpicker, etc. (4-8 cards in OTJ alone).
  - **Evidence vs reality:** No catalog tag matches `becomes plotted`. Plot is currently single-sided (`effect.has_plot`); no consumer/payoff axis.
  - **Suggested fix:** Author `trigger.becomes_plotted` keyed on `\bwhen(?:ever)? (?:__self__|this card|this creature|this spell) becomes plotted\b`. Pair with `effect.has_plot`.

---

## Annie Joins Up  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Enchantment
**Mana cost:** {1}{R}{G}{W}

**Oracle text:**

```
When Annie Joins Up enters, it deals 5 damage to target creature or planeswalker an opponent controls.
If a triggered ability of a legendary creature you control triggers, that ability triggers an additional time.
```

**Current tags:** `effect.deals_damage`, `trigger.self_etb`

### Issues

- **missing** (coverage gap): `effect.amplifies_triggers` (Panharmonicon family) AND `condition.cares_legendary` (no such tags in catalog)
  - **What's wrong:** Two gaps. First, "that ability triggers an additional time" is the Panharmonicon / Strionic Resonator / Yarok family — an ability-doubler. Second, this card scopes the doubler to "a legendary creature you control" — a legendary-matters condition. Both unrecognized.
  - **Evidence vs reality:** No catalog tags match `triggers an additional time` or `legendary creature you control` (as a payoff). Closest is `effect.amplifies_damage_or_lifeloss`, but that's a damage doubler, not an ability doubler.
  - **Suggested fix:**
    1. Author `effect.amplifies_triggers` keyed on `\bthat ability triggers an additional (?:time|number of times)\b` and `\b(?:each|every) triggered ability ... triggers? (?:one|two) additional times?\b`. Pair with all `trigger.*` axes (high-impact pairing — verify edge count first).
    2. Defer `condition.cares_legendary` unless 5+ Standard cards reference it (probably <3 today).
- **missing**: `effect.exile_creature` / `effect.exile_planeswalker` — actually NO, "deals 5 damage to target creature or planeswalker" is damage, not exile. Withdrawing.
- **missing**: should there be a `damage to creature or planeswalker` distinct tag? No — `effect.deals_damage` covers the target-permanent variant generically.

---

## Archangel of Tithes  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Creature — Angel
**Mana cost:** {1}{W}{W}{W}

**Oracle text:**

```
Flying
As long as this creature is untapped, creatures can't attack you or planeswalkers you control unless their controller pays {1} for each of those creatures.
As long as this creature is attacking, creatures can't block unless their controller pays {1} for each of those creatures.
```

**Current tags:** `effect.has_flying`

### Issues

- **missing** (coverage gap): `effect.tax_attackers` (and `effect.tax_blockers`, or a single `effect.combat_tax`) — no such tag in catalog
  - **What's wrong:** Ghostly Prison / Propaganda / Sphere of Safety / Archangel of Tithes family — "creatures can't attack/block unless their controller pays X" — has no representation. Archangel ends up with only the flying keyword tag, despite being a Standard-relevant defensive piece.
  - **Evidence vs reality:** No catalog tag matches `can't attack ... unless their controller pays` or `can't block ... unless their controller pays`. `effect.pacify` is unconditional ("can't attack or block"), not a tax. Pillow-fort / control archetype currently invisible.
  - **Suggested fix:** Author `effect.combat_tax` keyed on:
    - `\bcan(?:'|no)t attack[^.]{0,80}unless (?:that player|their controller|its controller) pays\b`
    - `\bcan(?:'|no)t block[^.]{0,80}unless (?:that player|their controller|its controller) pays\b`
    Pair with `condition.cares_attacking` (verify existence; may need separate authoring). Standard family size estimate: 3-5 cards (Archangel + a few set-specific pillowforts).

---

## Archmage's Newt  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Creature — Salamander Mount
**Mana cost:** {1}{U}

**Oracle text:**

```
Whenever this creature deals combat damage to a player, target instant or sorcery card in your graveyard gains flashback until end of turn. The flashback cost is equal to its mana cost. That card gains flashback {0} until end of turn instead if this creature is saddled.
Saddle 3
```

**Current tags:** `condition.cares_graveyard`, `condition.cares_instant_sorcery_in_graveyard`, `trigger.damage_dealt`

### Issues

- **missing** (coverage gap): OTJ Mount/Saddle family — multiple tags missing
  - **What's wrong:** No catalog representation for:
    1. `effect.has_saddle` — Saddle keyword as printed intrinsic (mount creatures)
    2. `condition.saddled` / `trigger.becomes_saddled` — "if this creature is saddled" gate; "when this creature becomes saddled" trigger
    3. `effect.grants_flashback` — granting flashback as a temporary keyword (this card grants flashback to a graveyard card)
  - **Evidence vs reality:** Oracle has explicit `Saddle 3` keyword line and `if this creature is saddled` gate. Also `target instant or sorcery card in your graveyard gains flashback` — flashback as granted ability. None match a catalog tag.
  - **Suggested fix:**
    1. Author `effect.has_saddle` keyed on `card.keywords.includes('Saddle')` (mirrors `effect.has_disguise`, `effect.has_plot` pattern).
    2. Author `condition.saddled` keyed on `if (?:this|that|__self__) (?:creature|mount) is saddled`. Pair with `effect.has_saddle`.
    3. Author `effect.grants_flashback` keyed on `gains? flashback` outside the printed-keyword line. Pair with `condition.cares_instant_sorcery_in_graveyard`.

---

## At Knifepoint  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Enchantment
**Mana cost:** {1}{B}{R}

**Oracle text:**

```
During your turn, outlaws you control have first strike.
Whenever you commit a crime, create a 1/1 red Mercenary creature token with "{T}: Target creature you control gets +1/+0 until end of turn. Activate only as a sorcery." This ability triggers only once each turn.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.grants_first_strike`

### Issues

- **missing** (coverage gap): OTJ crime / outlaw mechanic family
  - **What's wrong:** Two distinct OTJ keyword axes have no catalog representation:
    1. `trigger.commit_crime` — "Whenever you commit a crime" is the central OTJ trigger frame. Many cards (~10+ in OTJ alone).
    2. `condition.cares_outlaws` — "outlaws you control" is a meta-tribe (Assassin / Mercenary / Pirate / Rogue / Warlock) payoff frame.
  - **Evidence vs reality:** Card has both, neither matched any catalog tag. No "commit a crime payoffs" or "outlaw tribal payoffs" deck filter possible today.
  - **Suggested fix:**
    1. Author `trigger.commit_crime` keyed on `\bwhen(?:ever)? you commit a crime\b`. Pair with whatever the "you cast a removal spell or target an opponent" producer becomes (or just pair with general targeting effects).
    2. Author `condition.cares_outlaws` keyed on `\boutlaws? you control\b` and `\beach outlaw\b`. Pair with no tag yet — outlaws are a supertype, not a creature type with an `effect.create_outlaw_token` axis. The pairsWith axis-cross constraint applies; route via existing tribal-pairing patterns.

---

## Bruse Tarl, Roving Rancher  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Human Warrior
**Mana cost:** {2}{R}{W}

**Oracle text:**

```
Oxen you control have double strike.
Whenever Bruse Tarl enters or attacks, exile the top card of your library. If it's a land card, create a 2/2 white Ox creature token. Otherwise, you may cast it until the end of your next turn.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.exile_from_library`, `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **missing**: `effect.grants_double_strike` (and any `grants_*` tribal-anthem of irregular plurals)
  - **What's wrong:** Frame (c) in `pipeline/rules/effect.grants_keyword.ts:57` requires the tribal subject to end in `s` (plural-s suffix): `[a-z][\w\-]+s\s+you control\s+(?:has|have)\s+${kw}`. Irregular plurals like `Oxen`, `Children`, `Mice`, `Geese`, `People`, `Sheep` don't match.
  - **Evidence vs reality:** Normalized text starts with `oxen you control have double strike.` This is the canonical tribal-anthem grant frame. Wrench-family analysis missed it; existing test suite likely has only regular-plural positives.
  - **Suggested fix:** Either (a) extend the subject pattern to allow specific irregular plurals: `(?:[a-z][\w\-]+s|oxen|children|mice|geese|people|sheep|fish|deer|moose|elk|cattle|tabaxi|naga|kami|samurai|fairie|drakkis)` (curate from observed irregular tribes), or (b) drop the trailing-s requirement and rely on `you control\s+(?:has|have)` for disambiguation (broader, simpler — verify no false-positives on bare singular noun + "you control"). Add Bruse Tarl regression. Same fix applies to all 11 `grants_<keyword>` slugs since they share `buildGrantRegex`.


---

## Cactarantula  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Creature — Plant Spider
**Mana cost:** {4}{G}{G}

**Oracle text:**

```
This spell costs {1} less to cast if you control a Desert.
Reach
Whenever this creature becomes the target of a spell or ability an opponent controls, you may draw a card.
```

**Current tags:** `effect.cost_reduction`, `effect.draws_or_discards`, `effect.has_reach`

### Issues

- **missing** (coverage gap): `trigger.becomes_target` (no such tag)
  - **What's wrong:** "Whenever this creature becomes the target of a spell or ability an opponent controls" is the Spellbomb / Strangleroot-Geist / Cactarantula trigger family. No catalog representation.
  - **Evidence vs reality:** No tag matches `becomes the target`. Closest is `effect.has_ward` (printed-keyword side), but ward is the cost; this is the payoff side.
  - **Suggested fix:** Author `trigger.becomes_target` keyed on `\bwhen(?:ever)? (?:this (?:creature|permanent|artifact|enchantment|land|planeswalker|equipment)|__self__) becomes the target of a spell or ability\b`. Family likely 3-6 cards.


---

## Caught in the Crossfire  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {R}{R}

**Oracle text:**

```
Spree (Choose one or more additional costs.)
+ {1} — Caught in the Crossfire deals 2 damage to each outlaw creature.
+ {1} — Caught in the Crossfire deals 2 damage to each non-outlaw creature.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.deals_damage`, `effect.is_instant_or_sorcery`

### Issues

- **missing** (coverage gap): `effect.has_spree` (no such tag)
  - **What's wrong:** Spree is an OTJ keyword (~15+ cards in OTJ) but has no catalog representation. Cannot query "Spree spells" in deckbuilder filters.
  - **Evidence vs reality:** Card has `Spree` keyword line; no catalog tag matches.
  - **Suggested fix:** Author `effect.has_spree` keyed on `card.keywords.includes('Spree')`. Pair with no consumer tag (Spree currently has no payoffs). Mirror pattern from `effect.has_plot`.
- **missing**: `effect.board_wipe` (damage-based mass removal)
  - **What's wrong:** "Deals 2 damage to each outlaw creature" / "each non-outlaw creature" are categorical damage-wipes. Spree-modal combination is a full board wipe. Rule didn't fire (likely anchors on `destroy all` / `exile all` verbs, not `deals damage to each`).
  - **Evidence vs reality:** No catalog tag for damage-to-each-creature mass removal (Anger of the Gods / Pyroclasm family). The same gap probably affects many Standard sweepers.
  - **Suggested fix:** Broaden `effect.board_wipe` to admit `\bdeals \d+ damage to each (?:creature|outlaw|non[-\s]?outlaw|other|attacking|blocking) (?:creature)?\b` and similar mass-damage frames. Verify against existing positives.


---

## Dust Animus  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Creature — Spirit
**Mana cost:** {1}{W}

**Oracle text:**

```
Flying
If you control five or more untapped lands, this creature enters with two +1/+1 counters and a lifelink counter on it.
Plot {1}{W}
```

**Current tags:** `effect.counter_modified`, `effect.has_flying`, `effect.has_plot`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.grants_lifelink` (keyword-counter via "enters with" frame)
  - **What's wrong:** `effect.grants_keyword.ts` Frame (i) matches `\bput a ${kw} counter\b`. Dust Animus uses `enters with two +1/+1 counters and a lifelink counter on it` — the keyword-counter is granted via ETB-with replacement, not via active "put a ... counter" verb.
  - **Evidence vs reality:** Lifelink counter on the creature still grants lifelink — same semantic outcome as "put a lifelink counter on it". Rule frame just doesn't cover ETB-with.
  - **Suggested fix:** Add a parallel frame `\b(?:enters with|with) (?:[\w/+]+ )?(?:and )?a ${kw} counter\b` to the GRANTABLE_KEYWORDS pattern builder. Mirror across all 11 grantable keywords. Add Dust Animus regression to `effect.grants_lifelink.test.ts` (or `grants_keyword.test.ts`).


---

## Kaervek, the Punisher  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Human Warlock
**Mana cost:** {1}{B}{B}

**Oracle text:**

```
Whenever you commit a crime, exile up to one target black card from your graveyard and copy it. You may cast the copy. If you do, you lose 2 life.
```

**Current tags:** `effect.copy_spell`, `effect.exile_from_graveyard`, `effect.life_changed`

### Issues

- **missing**: no `trigger.commit_a_crime` exists (coverage gap — Crime mechanic family from MKM)
  - **What's wrong:** Card has no trigger-axis tag, despite a "Whenever you commit a crime, …" ability. The MKM Crime mechanic ("targeting opponents, anything they control, and/or cards in their graveyards is a crime") is in Standard and has multiple payoffs (Kaervek, Anzrag's Rampage, Etrata Deadly Fugitive, Kellan the Fae-Blooded among others).
  - **Evidence vs reality:** "whenever you commit a crime" is a standard trigger frame; the catalog has no rule recognizing it.
  - **Suggested fix:** Author `trigger.commit_a_crime` (axis: trigger). Anchor: `whenever you commit a crime`. PairsWith: targeted removal / discard / graveyard-hate / opponent-targeting effects since "crime" = targeting an opponent or their stuff. Cross-reference MKM set list for the producer-effect axis (`effect.commits_crime`?) — likely many crime payoffs scale on the count, may also need `condition.cares_crimes_committed`.

---

## Laughing Jasper Flint  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Lizard Rogue
**Mana cost:** {1}{B}{R}

**Oracle text:**

```
Creatures you control but don't own are Mercenaries in addition to their other types.
At the beginning of your upkeep, exile the top X cards of target opponent's library, where X is the number of outlaws you control. Until end of turn, you may cast spells from among those cards, and mana of any type can be spent to cast those spells.
```

**Current tags:** `effect.exile_from_library`, `trigger.upkeep`

### Issues

- **missing**: no `condition.cares_outlaws` exists (coverage gap — MKM Outlaw type-group)
  - **What's wrong:** "where X is the number of outlaws you control" scales on Outlaws (Assassin/Mercenary/Pirate/Rogue/Warlock per MKM rules text). Multiple MKM cards reference Outlaws as a unit (Jasper Flint, Tinybones Bauble Burglar, Kellan Joins Up's family). No catalog tag captures the axis.
  - **Suggested fix:** Author `condition.cares_outlaws` (axis: condition). Anchor: `\boutlaws? you control\b`, `\bnumber of outlaws\b`, `\bwhenever an outlaw\b`. PairsWith: each of the 5 outlaw tribal tags + tribal payoffs.

- **missing**: no `condition.cares_tribe.mercenary` exists (coverage gap — MKM Mercenary tribal)
  - **What's wrong:** Card converts opponents' creatures into Mercenaries and is itself a Mercenary tribal payoff. Mercenary tribal exists in MKM (Jolene, Lassoed by the Law's token, others). No tag for it.
  - **Suggested fix:** Add `mercenary` to `THEME_TRIBES` in `pipeline/themes.ts`, which will auto-generate `condition.cares_tribe.mercenary` via the parametric rule.

- **missing**: `effect.changes_type` / `effect.grants_type` (coverage gap — type-change axis, hits multiple cards)
  - **What's wrong:** "Creatures you control but don't own are Mercenaries in addition to their other types" is a static type-grant. Other Standard examples: Conspiracy-style tribal anthems, Maskwood Nexus, etc. No tag captures granting a creature type.
  - **Suggested fix:** Defer if scope < ~5 Standard cards; check first via `grep -i "in addition to" app/public/data/cards-standard.json | wc -l`.

---

## Lavaspur Boots  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Artifact — Equipment
**Mana cost:** {1}

**Oracle text:**

```
Equipped creature gets +1/+0 and has haste and ward {1}.
Equip {1}
```

**Current tags:** `effect.grants_haste`, `effect.grants_stat_buff`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`

### Issues

- **missing**: no `effect.grants_ward` exists (coverage gap — keyword-grant axis for Ward)
  - **What's wrong:** Card grants Ward {1} to the equipped creature ("equipped creature gets … and has … ward {1}"). The catalog has `effect.has_ward` (printed intrinsic) and `effect.grants_<keyword>` for haste/lifelink/etc., but no `grants_ward`. Recurring grant-axis coverage gap.
  - **Suggested fix:** Author `effect.grants_ward` (axis: effect) mirroring `effect.grants_haste` shape. Anchors: `\b(?:gain|have|has|gets?)\b[^.]*\bward(?:\s+\{)`, `\b(?:equipped|enchanted) creature[^.]*\bward\b`. Also scan for peers via `grep "and ward {" app/public/data/cards-standard.json`.

---

## Lilah, Undefeated Slickshot  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Human Rogue
**Mana cost:** {1}{U}{R}

**Oracle text:**

```
Prowess
Whenever you cast a multicolored instant or sorcery spell from your hand, exile that spell instead of putting it into your graveyard as it resolves. If you do, it becomes plotted.
```

**Current tags:** `effect.has_plot`, `effect.has_prowess`, `condition.cares_noncreature_spell`

### Issues

- **missing**: no `condition.cares_multicolored` exists (coverage gap)
  - **What's wrong:** "Multicolored instant or sorcery spell" is a key qualifier; Spelltable Wizard, Riveteers Charm, and other multicolor-matters cards reference it. No catalog tag.
  - **Suggested fix:** Defer if Standard scope < ~5 cards; check via `grep -ic "multicolored" app/public/data/cards-standard.json`.

---

## Lively Dirge  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {1}{B}

**Oracle text:**

```
Spree
+ {1} — Search your library for a card, put it into your graveyard, then shuffle.
+ {2} — Return up to two creature cards with total mana value 4 or less from your graveyard to the battlefield.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.reanimate`, `effect.tutor_any`

### Issues

- **missing**: `condition.cares_low_mana_value`
  - **What's wrong:** Rule should fire on "with total mana value 4 or less" — the Spree mode gates reanimation on a low-MV threshold. The tagDef explicitly covers "mana value N or less (N <= 4)". Currently not firing.
  - **Evidence vs reality:** Substring `total mana value 4 or less` is the cumulative-MV variant of the low-MV gate. Rule probably anchors on `mana value (\d+) or less` for individual spells/permanents but misses the `total mana value N or less` cumulative form (Lively Dirge, multi-target reanimator pattern, also Smuggler's Surprise).
  - **Suggested fix:** Add pattern `\btotal mana value (\d+) or less\b` to `pipeline/rules/condition.cares_low_mana_value.ts`. Add Lively Dirge regression.

- **false-positive (debatable)**: `effect.tutor_any`
  - **What's wrong:** "Search your library for a card, put it into your graveyard" is Entomb-style — fetches a specific library card into the GRAVEYARD, not to hand or battlefield. The colloquial sense of "tutor" implies access (hand/play), not graveyard-loading. Lumping Entomb effects under `tutor_any` will cause deckbuilder confusion: searching for "tutor any" filters in Buried Alive / Entomb / Lively Dirge as if they're Demonic Tutor analogues.
  - **Suggested fix:** Either (a) accept current behavior as a deliberate broad reading; or (b) narrow `tutor_any` to exclude `\bput it into your graveyard\b` and author a separate `effect.entomb` tag. Defer the decision to user — likely few Standard hits today.

---

## Miriam, Herd Whisperer  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Human Druid
**Mana cost:** {G}{W}

**Oracle text:**

```
During your turn, Mounts and Vehicles you control have hexproof.
Whenever a Mount or Vehicle you control attacks, put a +1/+1 counter on it.
```

**Current tags:** `condition.cares_subtype.vehicle`, `effect.counter_modified`, `effect.plus_one_counter`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.grants_hexproof`
  - **What's wrong:** Rule should fire on "Mounts and Vehicles you control have hexproof" — canonical grant frame ("X you control have Y"). Currently not firing. The "During your turn," temporal qualifier is what differs from the simpler "Creatures you control have hexproof" form.
  - **Evidence vs reality:** Substring `mounts and vehicles you control have hexproof` is exactly the grant frame. Rule pattern probably anchors on `(?:other )?creatures you control have` and misses the typed subject "Mounts and Vehicles".
  - **Suggested fix:** Loosen `pipeline/rules/effect.grants_hexproof.ts` subject-noun allowlist to admit subtype-named subjects (`mounts?`, `vehicles?`, `mounts? and vehicles?`, etc.). Also drop or move past the optional `during your turn,` prefix. Add Miriam regression.

- **missing**: no `condition.cares_subtype.mount` exists (coverage gap — OTJ Mount subtype with Saddle mechanic)
  - **What's wrong:** Mount is an artifact-like creature subtype from OTJ with the Saddle keyword. Several Standard cards reference Mounts as a tribal/care axis (Miriam, Roxanne, the cycle of Saddle creatures). No catalog tag captures the axis.
  - **Suggested fix:** Author `condition.cares_subtype.mount` and likely `effect.has_saddle` (parallel to has_crew). Add `mount` to `THEME_SUBTYPES` in `pipeline/themes.ts` for parametric generation.

---

## Nurturing Pixie  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Creature — Faerie Rogue
**Mana cost:** {W}

**Oracle text:**

```
Flying
When this creature enters, return up to one target non-Faerie, nonland permanent you control to its owner's hand. If a permanent was returned this way, put a +1/+1 counter on this creature.
```

**Current tags:** `condition.cares_tribe.faerie`, `effect.counter_modified`, `effect.has_flying`, `effect.plus_one_counter`, `trigger.self_etb`

### Issues

- **missing**: `effect.bounce_or_blink` (and likely typed children `effect.bounce_creature` / `effect.bounce_artifact` / `effect.bounce_enchantment`)
  - **What's wrong:** Rule should fire on "return up to one target non-Faerie, nonland permanent you control to its owner's hand" — self-bounce / blink-style ETB-resetter. Currently NO bounce tag is firing despite this being the card's core function.
  - **Evidence vs reality:** Substring `return up to one target … nonland permanent you control to its owner's hand` is canonical permanent-bounce template. The exclusionary prefix `non-Faerie,` and the prefix modifier `up to one target` combined with self-ownership ("you control … to its owner's hand") likely defeats the regex anchor (which probably expects `target permanent` or `target creature` without intervening exclusions).
  - **Suggested fix:** Loosen `pipeline/rules/effect.bounce_or_blink.ts` (and the typed-children rules) to admit:
    - exclusionary prefixes (`non-<type>,?\s*nonland`)
    - `up to one` / `up to two` quantifier prefixes
    - self-bounce ownership phrasing (`you control [^.]* to its owner's hand`)
  - Add Nurturing Pixie regression.

- **false-positive (debatable)**: `condition.cares_tribe.faerie`
  - **What's wrong:** Card mentions Faerie only as a negative target restriction ("non-Faerie"). A Faerie tribal deckbuilder filter searching for "cares about Faerie" gets this card as a hit, but the card doesn't reward, count, or interact positively with Faeries — it excludes them. Same shape as the `non-Human` family.
  - **Suggested fix:** Defer (low-priority). If pursuing, add an exclusion for `non-<tribe>\b` to `condition.cares_tribe.*` regexes, or accept that mentioning a tribe (positive or negative) is enough to flag the axis.

---

## Overzealous Muscle  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Creature — Ogre Mercenary
**Mana cost:** {4}{B}

**Oracle text:**

```
Whenever you commit a crime during your turn, this creature gains indestructible until end of turn.
```

**Current tags:** (none — card is completely untagged)

### Issues

- **missing**: `effect.grants_indestructible`
  - **What's wrong:** Rule should fire on "this creature gains indestructible until end of turn" — canonical self-grant of indestructible. Card has ZERO tags currently.
  - **Evidence vs reality:** Substring `this creature gains indestructible until end of turn` is exactly the temporary-grant form. Rule likely either misses self-grant subject ("this creature") or requires a different anchor.
  - **Suggested fix:** Audit `pipeline/rules/effect.grants_indestructible.ts`. Verify it admits `this creature gains? indestructible` (self-grant). Add Overzealous Muscle regression. This is a high-severity miss — zero-tag cards leave deckbuilders with no way to find the card via filters.

- **missing**: `trigger.commit_a_crime` — fifth instance of the MKM Crime mechanic coverage gap (see Kaervek entry above). Combined with the grants_indestructible miss, this card produces a zero-tag result — a strong signal that the Crime mechanic family needs catalog coverage.

---

## Quilled Charger  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Creature — Porcupine Mount
**Mana cost:** {3}{R}

**Oracle text:**

```
Whenever this creature attacks while saddled, it gets +1/+2 and gains menace until end of turn.
Saddle 2
```

**Current tags:** `effect.grants_stat_buff`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.grants_evasion`
  - **What's wrong:** Rule should fire on "it gains menace until end of turn" — anaphoric self-grant of menace. The tagDef explicitly covers "flying, menace, or intimidate" grants. Currently not firing.
  - **Evidence vs reality:** Substring `it gains menace until end of turn` is the anaphoric grant frame. Recurring patterns note already calls out the bare-pronoun "it" leak for grants_evasion (Pattern[1] / Vito's Inquisitor); Quilled Charger is a fresh instance worth adding to the regression set when that pattern is addressed.
  - **Suggested fix:** Either accept the deferred single-card scope of the bare-pronoun "it" gap, or include `\bit gains? (?:menace|flying|intimidate)\b` in `effect.grants_evasion`. Add Quilled Charger regression.

---

## Rakdos, the Muscle  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Demon Mercenary
**Mana cost:** {2}{B}{B}{R}

**Oracle text:**

```
Flying, trample
Whenever you sacrifice another creature, exile cards equal to its mana value from the top of target player's library. Until your next end step, you may play those cards, and mana of any type can be spent to cast those spells.
Sacrifice another creature: Rakdos gains indestructible until end of turn. Tap it. Activate only once each turn.
```

**Current tags (relevant):** `effect.grants_indestructible`, `effect.has_activated_ability`, `effect.has_flying`, `effect.has_mana_activated_ability`, `effect.has_trample`, `effect.sacrifice_creature`, `trigger.permanent_sacrificed`

### Issues

- **missing**: `effect.exile_from_library`
  - **What's wrong:** Rule should fire on "exile cards equal to its mana value from the top of target player's library". Currently not firing — same shape as Laughing Jasper Flint (also logged above) where opponent-library theft variants miss.
  - **Evidence vs reality:** Substring `exile cards equal to its mana value from the top of target player's library` is the canonical library-to-exile form with a variable count. Rule probably anchors on fixed-count `exile the top N cards of target player's library` and misses the `equal to its mana value` quantifier.
  - **Suggested fix:** Loosen `pipeline/rules/effect.exile_from_library.ts` count slot to admit `equal to (?:its|that creature's|that spell's) mana value` and similar variable quantifiers. Add Rakdos regression.

- **missing**: `effect.cast_from_exile`
  - **What's wrong:** Rule should fire on "Until your next end step, you may play those cards, and mana of any type can be spent to cast those spells" — same theft pattern as Laughing Jasper Flint (also logged). The fix proposed there (admit `you may cast (?:[^.]*?)from among those cards` and `play those cards`) should cover Rakdos too.
  - **Suggested fix:** See Jasper Flint entry; add a `\byou may (?:play|cast) those cards\b` variant. Add Rakdos regression.

- **false-positive**: `effect.has_mana_activated_ability`
  - Second instance of the recurring sacrifice-as-cost FP (see Magda, the Hoardmaster entry above). Cost `Sacrifice another creature:` has no mana symbol. Same fix.

- **note**: `effect.grants_indestructible` DID fire here on "Rakdos gains indestructible" (__SELF__ name reference), but did NOT fire on Overzealous Muscle's "this creature gains indestructible" (anaphoric self-reference). Confirms the diagnosis: the rule's self-grant pattern handles `__SELF__` but not `this creature`. Same single-rule fix.

---

## Rakish Crew  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Enchantment
**Mana cost:** {2}{B}

**Oracle text:**

```
When this enchantment enters, create a 1/1 red Mercenary creature token with "..."
Whenever an outlaw you control dies, each opponent loses 1 life and you gain 1 life.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.life_changed`, `trigger.self_etb`

### Issues

- **missing**: `trigger.creature_dies`
  - **What's wrong:** Rule should fire on "Whenever an outlaw you control dies". Outlaws ARE creatures (per the MKM rules text "Assassins, Mercenaries, Pirates, Rogues, and Warlocks are outlaws"), so a creature-dies trigger gated on a creature-type group should still tag the axis. Currently not firing.
  - **Evidence vs reality:** Substring `whenever an outlaw you control dies` is a typed-creature-dies trigger. Rule probably anchors on `whenever (?:a |another |any )?creature` and misses subject nouns that are creature-type groups (outlaw, dragon, knight, etc.).
  - **Suggested fix:** Loosen `pipeline/rules/trigger.creature_dies.ts` subject-noun allowlist to admit `outlaw`, common tribal nouns from THEME_TRIBES, and the `outlaw` type-group. This recurring pattern affects every typed-creature-dies trigger on tribal cards (likely 10+ Standard cards). Add Rakish Crew regression.

- **missing**: `condition.cares_outlaws` — second instance of the MKM Outlaws coverage gap (see Jasper Flint entry above).

---

## Rattleback Apothecary  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Creature — Gorgon Warlock
**Mana cost:** {2}{B}

**Oracle text:**

```
Deathtouch
Whenever you commit a crime, target creature you control gains your choice of menace or lifelink until end of turn.
```

**Current tags:** `effect.grants_lifelink`, `effect.has_deathtouch`

### Issues

- **missing**: `effect.grants_evasion`
  - **What's wrong:** Rule should fire on "gains your choice of menace or lifelink" — modal grant where menace is one of two options. `effect.grants_lifelink` correctly fires; the parallel menace grant is missed.
  - **Evidence vs reality:** Substring `gains your choice of menace or lifelink` has menace as a grant target. Rule probably anchors on `gains? (?:flying|menace|intimidate)` directly and is defeated by the intervening `your choice of` modal frame.
  - **Suggested fix:** Add a modal-grant pattern to `pipeline/rules/effect.grants_evasion.ts` that admits `gains? your choice of [^.]*?(?:menace|flying|intimidate)\b`. The parallel issue likely affects `effect.grants_lifelink`-adjacent modal grants too (a single regex add covers both axes). Add Rattleback regression.

- **missing**: `trigger.commit_a_crime` — 6th instance of the Crime mechanic coverage gap.

---

## Resilient Roadrunner  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Creature — Bird
**Mana cost:** {1}{R}

**Oracle text:**

```
Haste, protection from Coyotes
{3}: This creature can't be blocked this turn except by creatures with haste.
```

**Current tags:** `effect.has_activated_ability`, `effect.has_haste`, `effect.has_mana_activated_ability`, `effect.unblockable`

### Issues

- **false-positive**: `effect.unblockable`
  - **What's wrong:** Card text is `"can't be blocked this turn except by creatures with haste"` — partial unblockability ("except by X"). The tagDef explicitly excludes this: "Distinct from partial unblockability (Protection / "can't be blocked by X" / "except by X") and from blocker-restriction gates (Delney)." Yet the rule fires anyway.
  - **Evidence vs reality:** evidence was `"can't be blocked"`. The rule probably anchors on the bare `can't be blocked` substring without checking for a following `except by` / `by` partial-block clause.
  - **Suggested fix:** Add a negative-lookahead exclusion to `pipeline/rules/effect.unblockable.ts` matching `can't be blocked\b(?![^.]*\b(?:except\s+by|by)\b)`. Note: Resilient Roadrunner's clause restricts blockers to haste creatures (so by extension it's USUALLY unblockable in practice), but per the tagDef's explicit guidance, partial-block clauses fall outside the tag's scope. Add Resilient Roadrunner regression.

---

## Rush of Dread  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {1}{B}{B}

**Oracle text:**

```
Spree (Choose one or more additional costs.)
+ {1} — Target opponent sacrifices half the creatures they control of their choice, rounded up.
+ {2} — Target opponent discards half the cards in their hand, rounded up.
+ {2} — Target opponent loses half their life, rounded up.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.edict`, `effect.is_instant_or_sorcery`, `effect.targeted_discard`

### Issues

- **missing**: `effect.life_changed`
  - **What's wrong:** Rule should fire on "Target opponent loses half their life, rounded up". Currently not firing. The rule fires on simple numeric forms ("loses N life"); this card uses fractional/proportional life-loss ("loses half their life").
  - **Evidence vs reality:** Substring `target opponent loses half their life` is a life-loss effect. Rule likely anchors on `loses? \d+ life` and misses the fractional `loses half their life` / `loses X life` forms.
  - **Suggested fix:** Loosen `pipeline/rules/effect.life_changed.ts` life-loss pattern to admit `loses? (?:half|a third of|x|all) (?:of )?(?:their|its|your) life` and similar variable quantifiers. Add Rush of Dread regression.

---

## Satoru, the Infiltrator  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Human Ninja Rogue
**Mana cost:** {U}{B}

**Oracle text:**

```
Menace
Whenever Satoru and/or one or more other nontoken creatures you control enter, if none of them were cast or no mana was spent to cast them, draw a card.
```

**Current tags:** `effect.draws_or_discards`, `effect.has_menace`

### Issues

- **missing**: `trigger.self_etb` AND `trigger.another_creature_etb`
  - **What's wrong:** Card has a compound trigger ("Whenever __SELF__ and/or one or more other nontoken creatures you control enter") that fires on BOTH self-ETB and other-creature-ETB. Neither trigger axis is currently tagged. The compound "and/or" subject is what defeats both rules.
  - **Evidence vs reality:** Substring `whenever __SELF__ and/or one or more other nontoken creatures you control enter` — Satoru itself is one of the subjects, AND "other nontoken creatures you control" is the another-creature subject.
  - **Suggested fix:** Either:
    1. Loosen both `pipeline/rules/trigger.self_etb.ts` and `trigger.another_creature_etb.ts` to admit compound `and/or` subjects where one branch is the canonical anchor; OR
    2. Add a `trigger.creatures_etb_batch` umbrella tag for cards with this Ninjutsu-batch-trigger shape (Satoru, Yuriko-pattern, ETB-batch triggers from Bloomburrow).
  - Add Satoru regression to whichever rule(s) get the fix.

- **missing**: Ninjutsu / cheat-into-play axis — "no mana was spent to cast them" is a condition gate on Ninjutsu-style alternate-cost casting (cards put into play without being cast). Coverage gap; cards with this gate are likely few in Standard. Defer.

---

## Smuggler's Surprise  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {G}

**Oracle text:**

```
Spree (Choose one or more additional costs.)
+ {2} — Mill four cards. You may put up to two creature and/or land cards from among the milled cards into your hand.
+ {4}{G} — You may put up to two creature cards from your hand onto the battlefield.
+ {1} — Creatures you control with power 4 or greater gain hexproof and indestructible until end of turn.
```

**Current tags:** `condition.cares_high_power`, `effect.cast_noncreature_spell`, `effect.grants_hexproof`, `effect.grants_indestructible`, `effect.is_instant_or_sorcery`, `effect.mill`

### Issues

- **missing**: `effect.cheat_into_play`
  - **What's wrong:** Rule should fire on "You may put up to two creature cards from your hand onto the battlefield" — canonical Show-and-Tell / Elvish Piper hand-to-battlefield cheat. The tagDef explicitly covers "Puts a card from a zone OTHER than the graveyard directly onto the battlefield — skipping the casting process." Currently not firing.
  - **Evidence vs reality:** Substring `put up to two creature cards from your hand onto the battlefield` is exactly the hand-cheat form. Rule likely anchors on a tighter "put target creature card from your hand onto the battlefield" template and misses the multi-target / "up to N" quantifier.
  - **Suggested fix:** Loosen `pipeline/rules/effect.cheat_into_play.ts` to admit `put (?:up to \w+ |a |an )?(?:target )?(?:creature|permanent|nonland) cards? from your hand onto the battlefield`. Add Smuggler's Surprise regression.

---

## Steer Clear  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {W}

**Oracle text:**

```
Steer Clear deals 2 damage to target attacking or blocking creature. Steer Clear deals 4 damage to that creature instead if you controlled a Mount as you cast this spell.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.deals_damage`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `condition.cares_tribe.mount`
  - **What's wrong:** Mount tribe isn't in `THEME_TRIBES`, so no `condition.cares_tribe.mount` tag exists. Card explicitly scales on "if you controlled a Mount as you cast this spell".
  - **Evidence vs reality:** oracle clause `"if you controlled a Mount as you cast this spell"` is the canonical tribal-care frame, but the parametric tribe rule has no Mount entry to fire.
  - **Suggested fix:** add `"mount"` to `pipeline/themes.ts` `THEME_TRIBES`. Mount is an OTJ family with multiple Mount-payoff cards (Slick Sequence, Stagecoach Security's Plot eve, Bandit's Talent, etc.) — a real coverage family, not one-off.

---

## Step Between Worlds  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {3}{U}{U}

**Oracle text:**

```
Each player may shuffle their hand and graveyard into their library. Each player who does draws seven cards. Exile Step Between Worlds.
Plot {4}{U}{U} (You may pay {4}{U}{U} and exile this card from your hand. Cast it as a sorcery on a later turn without paying its mana cost. Plot only as a sorcery.)
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.has_plot`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** Wheel effect ("Each player who does draws seven cards") not flagged. The rule likely requires `draw[s]? \d+` and misses the spelled numeral "seven".
  - **Evidence vs reality:** oracle clause `"Each player who does draws seven cards"` is a mass-draw — controller draws 7 — but the regex probably only matches digit forms (`draws 7 cards`).
  - **Suggested fix:** broaden `effect.draws_or_discards` to accept spelled cardinals (`one|two|three|four|five|six|seven|eight|nine|ten`) alongside digits. Affects wheel family (Day of Judgment-shaped wheels) and old-template draws.

---

## Stoic Sphinx  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Creature — Sphinx
**Mana cost:** {2}{U}{U}

**Oracle text:**

```
Flash
Flying
This creature has hexproof as long as you haven't cast a spell this turn.
```

**Current tags:** `effect.grants_hexproof`, `effect.has_flash`, `effect.has_flying`

### Issues

- **false-positive**: `effect.grants_hexproof`
  - **What's wrong:** Recurring pattern — `effect.grants_<kw>` fires on self-conditional intrinsic phrasing ("this creature has hexproof"). The tagDef explicitly distinguishes itself from `effect.has_hexproof`, but the regex matches the `this creature has hexproof` self-reference.
  - **Evidence vs reality:** evidence `"this creature has hexproof"` is the card describing its own conditional intrinsic, not granting hexproof to another creature.
  - **Suggested fix:** narrow `effect.grants_hexproof` to exclude `this creature has <kw>` / `__SELF__ has <kw>` self-references (mirror the lookbehind already used by other grants_ rules per the patterns doc).
- **missing**: `effect.has_hexproof`
  - **What's wrong:** Card has hexproof as a (conditional) intrinsic ability, which is exactly what `effect.has_hexproof` flags. Currently absent.
  - **Evidence vs reality:** oracle clause `"this creature has hexproof as long as you haven't cast a spell this turn"` describes a printed intrinsic conditional hexproof. The companion `grants_` tag is mis-firing instead.
  - **Suggested fix:** broaden `effect.has_hexproof` to include `this creature has hexproof` / `__SELF__ has hexproof` (including `as long as` conditional gates). Currently likely scopes to bare-keyword/printed-only.

---

## Take for a Ride  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {2}{R}

**Oracle text:**

```
Take for a Ride has flash as long as you've committed a crime this turn. (Targeting opponents, anything they control, and/or cards in their graveyards is a crime.)
Gain control of target creature until end of turn. Untap that creature. It gains haste until end of turn.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.control_change`, `effect.grants_haste`, `effect.is_instant_or_sorcery`, `effect.untap`

### Issues

- **missing**: `effect.has_flash`
  - **What's wrong:** Card has conditional intrinsic flash ("Take for a Ride has flash as long as you've committed a crime this turn"). Same pattern as Stoic Sphinx (logged above) — self-conditional intrinsic keyword fails to register on `effect.has_<kw>`.
  - **Evidence vs reality:** oracle `"Take for a Ride has flash as long as ..."` — anchored to card name (which normalizes to __SELF__), so `__SELF__ has flash` should match.
  - **Suggested fix:** broaden `effect.has_flash` to include `__SELF__ has flash` (and `as long as` conditional gates). Probably mirrors the fix for `effect.has_hexproof` flagged on Stoic Sphinx — same family of fix across all `effect.has_<kw>` rules.
- **missing**: `condition.committed_a_crime` / `condition.cares_crime` (no such tag exists — coverage gap)
  - **What's wrong:** MKM keyword action "commit a crime" has no catalog tag. Real family — Take for a Ride, Lassoed by the Law, Detective's Phoenix, dozens of MKM cards trigger off or scale on crimes committed.
  - **Evidence vs reality:** oracle clause `"as long as you've committed a crime this turn"` is the canonical crime-payoff condition.
  - **Suggested fix:** add `condition.cares_crime` (or `condition.committed_a_crime`). Mirrors `condition.cares_suspected` shape. Anchors: `committed a crime`, `commit a crime`, `crime this turn`.

---

## Take the Fall  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {U}

**Oracle text:**

```
Target creature gets -1/-0 until end of turn. It gets -4/-0 until end of turn instead if you control an outlaw. (Assassins, Mercenaries, Pirates, Rogues, and Warlocks are outlaws.)
Draw a card.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.debuff_minus_n`, `effect.draws_or_discards`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `condition.cares_outlaw` (no such tag exists — coverage gap)
  - **What's wrong:** Outlaw is an OTJ keyword that unifies Assassins, Mercenaries, Pirates, Rogues, and Warlocks under one umbrella. No catalog tag for outlaw-cares despite being a real family (Take the Fall, Slick Sequence, Tinybones, Bounding Felidar's adventure half, etc.).
  - **Evidence vs reality:** oracle clause `"if you control an outlaw"` is the canonical outlaw payoff condition.
  - **Suggested fix:** add `condition.cares_outlaw` (matches `condition.cares_tribe.*` shape but as a meta-tribe). Pair with effects that create outlaw-type creatures.

---

## The Key to the Vault  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Legendary Artifact — Equipment
**Mana cost:** {1}{U}

**Oracle text:**

```
Whenever equipped creature deals combat damage to a player, look at that many cards from the top of your library. You may exile a nonland card from among them. Put the rest on the bottom of your library in a random order. You may cast the exiled card without paying its mana cost.
Equip {2}{U}
```

**Current tags:** `effect.cast_for_free`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.look_at_top_n`, `trigger.damage_dealt`

### Issues

- **missing**: `effect.has_equip` (no such tag exists — coverage gap)
  - **What's wrong:** Equipment cards uniformly have Equip {N} but no catalog tag flags the Equip keyword. Common deckbuilding filter ("equipment-matters" decks want every Equip-keyword card).
  - **Evidence vs reality:** oracle `"Equip {2}{U}"` is the canonical Equip keyword line.
  - **Suggested fix:** add `effect.has_equip` mirroring `effect.has_crew` / `effect.has_cycling` shape. Pair with `condition.cares_subtype.equipment`.
- **missing**: `effect.exile_from_library`
  - **What's wrong:** Card does the canonical impulse-shape (look-N, exile-one, may-cast) — but rule likely scopes to `exile the top N cards of your library` rather than `look ... You may exile ... from among them`.
  - **Evidence vs reality:** oracle clauses `"look at that many cards from the top of your library"` then `"You may exile a nonland card from among them"` chain into a net library→exile zone move.
  - **Suggested fix:** broaden `effect.exile_from_library` to recognize the look-then-exile-from-among shape. Same family as Outpost Siege / Robber of the Rich. Not impulse_draw (cast is unbounded, not "this turn").

---

## Throw from the Saddle  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {1}{G}

**Oracle text:**

```
Target creature you control gets +1/+1 until end of turn. Put a +1/+1 counter on it instead if it's a Mount. Then it deals damage equal to its power to target creature you don't control.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.counter_modified`, `effect.grants_stat_buff`, `effect.is_instant_or_sorcery`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.causes_damage`
  - **What's wrong:** "Then it deals damage equal to its power to target creature you don't control" is the textbook `effect.causes_damage` shape (one-sided fight via power-equal damage). Anaphoric "it" refers back to "target creature you control" from the prior sentence — rule probably scopes to literal `target creature you control deals damage equal to its power` and misses the pronoun.
  - **Evidence vs reality:** semantic chain is `target creature you control gets +1/+1. ... Then **it** [= target creature you control] deals damage equal to its power to target creature you don't control` — the canonical Hunt-the-Hunter / Savage Smash one-way fight.
  - **Suggested fix:** broaden `effect.causes_damage` to recognize the `Then it deals damage equal to its power` anaphoric form when an earlier clause established `target creature you control` as the subject. Or add the bare-pronoun shape with a "previous sentence references your creature" pre-check.

---

## Thunder Salvo  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {1}{R}

**Oracle text:**

```
Thunder Salvo deals X damage to target creature, where X is 2 plus the number of other spells you've cast this turn.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.deals_damage`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `condition.cares_spells_cast_this_turn` (no such tag exists — coverage gap)
  - **What's wrong:** Spell-count-this-turn payoffs (Storm-lite / spellslinger scaling) have no catalog tag. Real family includes Thunder Salvo, Galvanic Iteration, Witty Roastmaster, Improvise/Magecraft adjacent cards.
  - **Evidence vs reality:** oracle `"X is 2 plus the number of other spells you've cast this turn"` is the canonical spell-count scaling clause.
  - **Suggested fix:** add `condition.cares_spells_cast_this_turn` mirroring `condition.cares_cards_drawn_this_turn`. Anchors: `spells you've cast this turn`, `spells cast this turn`, `for each other spell you've cast`. Pair with `trigger.spell_cast` and `effect.cast_noncreature_spell`.

---

## Tinybones Joins Up  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Legendary Enchantment
**Mana cost:** {B}

**Oracle text:**

```
When Tinybones Joins Up enters, any number of target players each discard a card.
Whenever a legendary creature you control enters, any number of target players each mill a card and lose 1 life.
```

**Current tags:** `effect.life_changed`, `effect.mill`, `trigger.another_creature_etb`, `trigger.self_etb`

### Issues

- **missing**: `effect.targeted_discard`
  - **What's wrong:** "Any number of target players each discard a card" is targeted discard. Likely the rule scopes to `target opponent` / `each opponent` and misses `any number of target players`.
  - **Evidence vs reality:** oracle `"any number of target players each discard a card"` — disjunctive-quantifier-over-players framing for the same discard-attack family as Mind Rot.
  - **Suggested fix:** broaden `effect.targeted_discard` to include `any number of target players each discard` (and `target player ... discards` generally).
- **missing**: `condition.cares_legendary` (no such tag exists — coverage gap)
  - **What's wrong:** "Whenever a legendary creature you control enters" is a legendary-tribal ETB trigger. Real family — Tinybones Joins Up, Plargg and Nassari, Captain Sisay-style, every "legendary matters" payoff. No catalog tag flags it.
  - **Evidence vs reality:** oracle clause `"a legendary creature you control"` is the canonical legendary-care signal.
  - **Suggested fix:** add `condition.cares_legendary` parallel to `condition.cares_tribe.*` (legendary is a supertype, not a tribe — separate tag). Anchors: `legendary creature you control`, `legendary spell`, `for each legendary`.

---

## Tinybones, the Pickpocket  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Skeleton Rogue
**Mana cost:** {B}

**Oracle text:**

```
Deathtouch
Whenever Tinybones deals combat damage to a player, you may cast target nonland permanent card from that player's graveyard, and mana of any type can be spent to cast that spell.
```

**Current tags:** `effect.has_deathtouch`, `trigger.damage_dealt`

### Issues

- **missing**: `effect.cast_from_graveyard` (no such tag exists — coverage gap)
  - **What's wrong:** Card grants permission to cast a card from a graveyard — the graveyard parallel to `effect.cast_from_exile` (which exists) and `effect.cast_from_library_top` (which exists). Family includes Tinybones (opponent's GY), Anje Falkenrath, Sevinne's Reclamation. Distinct from `condition.cast_from_graveyard` (which flags Flashback/Embalm/Escape/etc. *keywords* on the card itself).
  - **Evidence vs reality:** oracle `"you may cast target nonland permanent card from that player's graveyard"` is the grant-permission shape, not a keyword.
  - **Suggested fix:** add `effect.cast_from_graveyard` matching `effect.cast_from_exile`/`effect.cast_from_library_top` shape. Pair with `condition.cares_graveyard` and possibly with `effect.reanimate` (alternative shape for putting GY cards into play).
- **missing**: `effect.targeted_discard` may be relevant via "and mana of any type can be spent" semantics — no, that's not discard. Skipping.

---

## Trained Arynx  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Creature — Cat Beast Mount
**Mana cost:** {1}{W}

**Oracle text:**

```
Whenever this creature attacks while saddled, it gains first strike until end of turn. Scry 1.
Saddle 2 (Tap any number of other creatures you control with total power 2 or more: This Mount becomes saddled until end of turn. Saddle only as a sorcery.)
```

**Current tags:** `effect.scry`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.grants_first_strike`
  - **What's wrong:** "It gains first strike until end of turn" is a conditional self-grant of first strike. Rule likely scopes to `target creature gains` / `<noun> gains` patterns and misses the bare-pronoun `it gains` form.
  - **Evidence vs reality:** oracle `"Whenever this creature attacks while saddled, it gains first strike until end of turn"` — "it" anaphorically refers to "this creature".
  - **Suggested fix:** broaden `effect.grants_first_strike` to recognize bare-pronoun `it gains first strike` when the preceding clause established a creature subject. Same shape as the `it gains menace` leak noted under recurring patterns (Vito's Inquisitor) — but for the inverse direction (granting, not failing-to-grant).

---

## Vadmir, New Blood  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Vampire Rogue
**Mana cost:** {1}{B}

**Oracle text:**

```
Whenever you commit a crime, put a +1/+1 counter on Vadmir. This ability triggers only once each turn.
As long as Vadmir has four or more +1/+1 counters on it, it has menace and lifelink.
```

**Current tags:** `effect.counter_modified`, `effect.gains_keyword_self_conditional`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.has_lifelink` (conditional-intrinsic form)
  - **What's wrong:** `effect.gains_keyword_self_conditional` covers conditional menace/flying/intimidate but explicitly scopes to evasion. Vadmir's conditional ability is `it has menace AND lifelink` — lifelink isn't flagged anywhere.
  - **Evidence vs reality:** oracle `"As long as __SELF__ has four or more +1/+1 counters on it, it has menace and lifelink"` — `it has lifelink` is a conditional-intrinsic shape that should populate `effect.has_lifelink`.
  - **Suggested fix:** broaden `effect.has_lifelink` to accept `it has lifelink` / `__SELF__ has lifelink` (and `as long as` conditional gates). Same fix shape as Stoic Sphinx hexproof and Take for a Ride flash — looks like the conditional-intrinsic axis is a cross-cutting gap across `has_<kw>` rules.
- **missing**: `condition.cares_plus_one_counter`
  - **What's wrong:** "As long as Vadmir has four or more +1/+1 counters on it" is the canonical +1/+1 counter gate (the modal-style payoff). Rule should fire.
  - **Evidence vs reality:** oracle clause `"four or more +1/+1 counters on it"` — direct count-gating on +1/+1 counters. The tagDef description says "Has an effect or trigger that checks whether a creature has a +1/+1 counter" — matches exactly.
  - **Suggested fix:** broaden `condition.cares_plus_one_counter` to recognize `N or more +1/+1 counters on it` (and `four or more`, `three or more`, etc., spelled forms). If the rule already handles digit forms (`4 or more`), the gap is spelled-cardinal matching.
- **missing**: `condition.cares_crime` (no such tag — coverage gap, already logged under Take for a Ride)

---

## Vraska, the Silencer  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Gorgon Assassin
**Mana cost:** {1}{B}{G}

**Oracle text:**

```
Deathtouch
Whenever a nontoken creature an opponent controls dies, you may pay {1}. If you do, return that card to the battlefield tapped under your control. It's a Treasure artifact with "{T}, Sacrifice this artifact: Add one mana of any color," and it loses all other card types.
```

**Current tags:** `condition.cares_subtype.treasure`, `effect.has_deathtouch`, `trigger.creature_dies`

### Issues

- **missing**: `effect.reanimate`
  - **What's wrong:** "return that card to the battlefield tapped under your control" is the canonical reanimation shape — graveyard → battlefield. The transformation-to-Treasure side effect doesn't change the underlying zone move.
  - **Evidence vs reality:** oracle `"return that card to the battlefield"` after a `creature ... dies` trigger — every component of the reanimate shape.
  - **Suggested fix:** broaden `effect.reanimate` if it requires `from your graveyard` (Vraska doesn't include this — the graveyard zone is implicit from the death trigger). Anchor on `return that card to the battlefield` when chained from a death/graveyard antecedent.
- **missing**: `effect.control_change`
  - **What's wrong:** "under your control" applied to an opponent's card is a control change. Steals the dead creature card from opponent's graveyard.
  - **Evidence vs reality:** oracle `"return that card to the battlefield tapped under your control"` (preceded by `nontoken creature an opponent controls dies`) — same shape as Animate Dead-style steal.
  - **Suggested fix:** broaden `effect.control_change` to recognize the cross-zone shape ("under your control" applied to a card from opponent's graveyard or other zone). Currently likely scopes to "gain control of target" on the battlefield.
- **false-positive** (weak): `condition.cares_subtype.treasure`
  - **What's wrong:** Card outputs a Treasure as the dead creature's new identity; it doesn't *care about* (scale on / trigger off / payoff for) treasures. Semantic test: a Treasure-matters deck wouldn't include Vraska *because of* the treasure clause — they'd include it for the steal/reanimate.
  - **Evidence vs reality:** evidence `"treasure"` matches the literal type word, but the rule signal is "card references Treasure as a payoff axis", which Vraska doesn't (it produces, transformatively).
  - **Suggested fix:** narrow `condition.cares_subtype.<X>` to exclude `it's a <X> [artifact|creature]` transformation clauses (the producer form). Borderline; the producer/consumer distinction is fuzzy here.

---

## Ancient Cornucopia  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Artifact
**Mana cost:** {2}{G}

**Oracle text:**

```
Whenever you cast a spell that's one or more colors, you may gain 1 life for each of that spell's colors. Do this only once each turn.
{T}: Add one mana of any color.
```

**Current tags:** `effect.add_mana`, `effect.has_activated_ability`, `effect.life_changed`, `effect.ramp_nonland`, `trigger.spell_cast`

### Issues

- **missing**: `condition.cares_colors` / `condition.cares_spell_colors` (no such tag exists — coverage gap)
  - **What's wrong:** Color-count scaling payoffs ("for each of that spell's colors", "for each color among permanents you control") have no catalog tag. Real family: domain decks, Painter's Servant interactions, Bring to Light scaling, Coalition Victory shape. Standard-rotating but recurring.
  - **Evidence vs reality:** oracle `"for each of that spell's colors"` is a per-color scaling clause; no condition tag flags it.
  - **Suggested fix:** add `condition.cares_colors` (or split into `condition.cares_color_count` for scaling and `condition.cares_multicolor` for binary "is multicolor" payoffs). Anchors: `for each color`, `multicolored spell`, `colored mana symbols`, `domain`.
- **missing**: `effect.has_mana_activated_ability`
  - **What's wrong:** `{T}: Add one mana of any color.` is a tap-activated mana ability — qualifies as a mana-cost activated ability per the tagDef. Currently absent.
  - **Evidence vs reality:** evidence-equivalent to `{t}:` for the activated ability — but cost is just a tap, not a mana cost. Wait — tap-only cost might not qualify for "mana-cost" per the tagDef ("activated ability whose cost includes mana"). A tap symbol is not mana. So this is NOT a mana-activated ability. Self-correcting; skip.

---

## Collector's Cage  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Artifact
**Mana cost:** {1}{W}

**Oracle text:**

```
Hideaway 5 (When this artifact enters, look at the top five cards of your library, exile one face down, then put the rest on the bottom in a random order.)
{1}, {T}: Put a +1/+1 counter on target creature you control. Then if you control three or more creatures with different powers, you may play the exiled card without paying its mana cost.
```

**Current tags:** `effect.counter_modified`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.look_at_top_n`
  - **What's wrong:** Reminder text for Hideaway includes "look at the top five cards of your library" — but reminder text is in `(...)` and stripped pre-tag. So actually this miss is correct behavior. **Self-correcting** — skip. (Verifying the Hideaway keyword's printed line `Hideaway 5` does NOT itself reference looking-at-top; that lives in reminder text only.)
- **missing**: `effect.exile_from_library`
  - **What's wrong:** Same — the "exile one face down" lives in Hideaway reminder text, stripped pre-tag. Skip.
- **missing**: `effect.cast_for_free`
  - **What's wrong:** "you may play the exiled card without paying its mana cost" is the canonical cast-for-free shape. NOT in reminder text — lives on the activated ability's body.
  - **Evidence vs reality:** oracle `"you may play the exiled card without paying its mana cost"` — direct cast-for-free.
  - **Suggested fix:** broaden `effect.cast_for_free` to accept `you may play the exiled card without paying its mana cost` (currently likely scopes to `cast` not `play`).
- **missing**: `effect.cast_from_exile`
  - **What's wrong:** Same — plays the exiled card. Lives on activated ability body, not reminder text.
  - **Evidence vs reality:** oracle `"you may play the exiled card"` references an exile-zone card. Should fire.
  - **Suggested fix:** broaden `effect.cast_from_exile` to accept `you may play the exiled card` (and the `the exiled card` anaphor referring to an earlier exile).
- **missing**: `effect.has_hideaway` (no such tag exists — coverage gap)
  - **What's wrong:** Hideaway is a small but real keyword family (MOM/OTJ Collector's Cage, Cradle of Safety, etc.). No tag.
  - **Suggested fix:** add `effect.has_hideaway` mirroring `effect.has_plot` / `effect.has_warp` shape.
- **missing**: `condition.cares_different_powers` (no such tag exists — narrow coverage gap)
  - **What's wrong:** "Three or more creatures with different powers" is a specific power-variance payoff. Probably not its own family (only 2-3 cards), but could fit under a broader "cares about creature stats" axis.
  - **Suggested fix:** skip standalone tag; consider whether `condition.cares_high_power` semantics could be broadened to "cares about creature power stats" generally. Borderline.

---

## Esoteric Duplicator  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Artifact — Clue
**Mana cost:** {2}{U}

**Oracle text:**

```
Whenever you sacrifice this artifact or another artifact, you may pay {2}. If you do, at the beginning of the next end step, create a token that's a copy of that artifact.
{2}, Sacrifice this artifact: Draw a card.
```

**Current tags:** `effect.copy_permanent_token`, `effect.create_token`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.sacrifice_artifact`, `trigger.beginning_of_end_step`

### Issues

- **missing**: `trigger.permanent_sacrificed`
  - **What's wrong:** "Whenever you sacrifice this artifact or another artifact" is a sacrifice-observation trigger (artifact-aristocrats). The tagDef explicitly includes artifacts: "Has an ability that triggers when you sacrifice a creature, artifact, enchantment, land, token, or permanent (the aristocrats axis)". Rule may scope to `creature` and miss `artifact`.
  - **Evidence vs reality:** oracle `"Whenever you sacrifice this artifact or another artifact, you may pay {2}"` — direct artifact-sac trigger.
  - **Suggested fix:** broaden `trigger.permanent_sacrificed` to include `artifact or another <type>` and `this artifact or another artifact` shapes. Aristocrats-payoff axis.

---

## Generous Plunderer  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Creature — Human Rogue
**Mana cost:** {1}{R}

**Oracle text:**

```
Menace
At the beginning of your upkeep, you may create a Treasure token. When you do, target opponent creates a tapped Treasure token.
Whenever this creature attacks, it deals damage to defending player equal to the number of artifacts they control.
```

**Current tags:** `effect.create_token`, `effect.create_treasure`, `effect.deals_damage`, `effect.has_menace`, `trigger.attack_or_block`, `trigger.upkeep`

### Issues

- **missing** (partial): `condition.cares_artifacts`
  - **What's wrong:** "Equal to the number of artifacts they control" is artifact-count scaling — but the rule likely scopes to "artifacts you control" (the standard payoff frame). Generous Plunderer scales on OPPONENT's artifact count (an anti-artifact-deck punisher). Real but edge family (Manic Vandal-style + artifacts-they-control payoffs).
  - **Evidence vs reality:** oracle `"equal to the number of artifacts they control"` — same scaling structure as `artifacts you control`, just other-player-scoped.
  - **Suggested fix:** broaden `condition.cares_artifacts` to include `artifacts they control` and `artifacts your opponents control`. Pair-wise this is mostly with other artifact-producers/destroyers; semantically belongs in the same payoff category.


---

## Remaining from 2026-05-31 audit batch (v0.16.0 catchup)

The bulk of the 2026-05-31 audit batch was shipped under v0.15.1 (narrowings +
broadenings across 16 rules) and v0.16.0 (9 new rules: BLB tribes extension,
`condition.expend`, `condition.valiant`, `effect.has_offspring`,
`effect.forage`, `effect.silence_opponents`, `condition.cares_hand_size`,
`effect.loses_abilities`, `effect.partial_unblockable`). The items below were
deliberately deferred — small families or niche structures that don't justify
new rules yet.

### Torpor Orb (ETB-shutoff hate-piece) — 2-card family

Standard only has Torpor Orb + Doorkeeper Thrull with the
"creatures entering don't cause abilities to trigger" replacement effect.
Too narrow to author a dedicated `effect.replace_etb_trigger` rule. Revisit if
a future set adds Hushbringer-style cards.

### Rest in Peace's graveyard-hate replacement — small family

The "if a card or token would be put into a graveyard from anywhere, exile it
instead" replacement effect is iconic but the family in Standard is essentially
Rest in Peace + Leyline of the Void variants. The ETB clause ("exile all
graveyards") IS now tagged via the broadened `effect.exile_from_graveyard`.

### Alania, Divergent Storm — ordinal qualifier with separate spell types

"If it's the first instant spell, the first sorcery spell, or the first Otter
spell" — the rule's existing ordinal slot accepts "first instant or sorcery
spell" (conjunction) but not the comma-separated form. Single-card scope in
Standard; deferred until a second example appears.

### Bandit's Talent — beginning-of-draw-step trigger

`trigger.beginning_of_draw_step` would mirror the upkeep / combat / end-step
phase-trigger family but Standard has very few draw-step triggers. Bandit's
Talent's level-3 ability is the canonical example.

### Builder's Talent — class-level-up trigger

"When this Class becomes level N" is a real trigger frame across the Class
enchantment cycle, but the per-Class payoff variance and small total card
count make a dedicated `trigger.class_levels_up` rule low-value today.

## Camellia, the Seedmiser  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Squirrel Warlock
**Mana cost:** {1}{B}{G}

**Oracle text:**

```
Menace
Other Squirrels you control have menace.
Whenever you sacrifice one or more Foods, create a 1/1 green Squirrel creature token.
{2}, Forage: Put a +1/+1 counter on each other Squirrel you control.
```

**Current tags:** `condition.cares_subtype.food`, `condition.cares_tribe.squirrel`, `effect.counter_modified`, `effect.create_creature_token`, `effect.create_token`, `effect.forage`, `effect.grants_evasion`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.has_menace`, `effect.plus_one_counter`

### Issues

- **missing**: `trigger.permanent_sacrificed`
  - **What's wrong:** "Whenever you sacrifice one or more Foods" is a textbook aristocrats sacrifice trigger but the rule's regex doesn't fire.
  - **Evidence vs reality:** Rule pattern `\b(?:when|whenever) you sacrifice (?:a |an |another )?(?:permanent|creature|artifact|enchantment|land|token|food|treasure|...)` requires "(a|an|another)" or nothing between "sacrifice" and the noun, and "food" not "foods". Text is "sacrifice one or more Foods" — the determiner slot "one or more" is unaccounted for, and the plural "Foods" doesn't match "food\b".
  - **Suggested fix:** Broaden the determiner alternation to include `one or more |\d+ |X ` and pluralize the noun list (`foods?`, `treasures?`, `clues?`, `bloods?`, etc.). Add Camellia's "whenever you sacrifice one or more foods" to `.test.ts` positives.

---

## Carrot Cake  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Artifact — Food
**Mana cost:** {1}{W}

**Oracle text:**

```
When this artifact enters and when you sacrifice it, create a 1/1 white Rabbit creature token and scry 1.
{2}, {T}, Sacrifice this artifact: You gain 3 life.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.life_changed`, `effect.sacrifice_artifact`, `effect.scry`, `trigger.self_etb`

### Issues

- **missing**: `trigger.artifact_leaves_battlefield` (self-LtB via "when you sacrifice it" framing)
  - **What's wrong:** "When you sacrifice it" is a self-sacrifice trigger that semantically equals "when this artifact leaves the battlefield". The rule's `PATTERN_SELF` expects `when(ever) this <type> <ltb_verb>` or `__SELF__ <verb>` — it doesn't match the active-voice `you sacrifice it/this` frame.
  - **Evidence vs reality:** Normalized text contains "and when you sacrifice it" — "it" is the pronoun referent for `__SELF__`, but neither `PATTERN_SELF` nor `trigger.permanent_sacrificed` accept the "you sacrifice it/this" form (the latter requires a typed noun like food/creature/artifact, not a pronoun).
  - **Suggested fix:** Add a third self-pattern to `trigger.artifact_leaves_battlefield` matching `when(ever) you sacrifice (it|this|__self__)\b` (scoped via `matchCard` to artifact-typed cards so it doesn't leak onto creatures). Carrot Cake's "when you sacrifice it" is the canonical fixture; check Food/Treasure self-sac cards for sibling cases.

---

## Cindering Cutthroat  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Lizard Assassin
**Mana cost:** {2}{B/R}

**Oracle text:**

```
This creature enters with a +1/+1 counter on it if an opponent lost life this turn.
{1}{B/R}: This creature gains menace until end of turn.
```

**Current tags:** `effect.counter_modified`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.plus_one_counter`

### Issues

- **missing**: no `condition.cares_lifeloss` (or `condition.cares_life_changed`) exists
  - **What's wrong:** "If an opponent lost life this turn" is a textbook life-loss gating condition. The catalog has `condition.cares_lifegain` (the mirror axis) but no life-loss counterpart, so vampire/aristocrat/burn payoffs that gate on opponent-life-loss are silently missed.
  - **Evidence vs reality:** No catalog tag plausibly matches. `condition.cares_lifegain` is gain-only. `trigger.life_changed` exists as a trigger (Whenever a player gains or loses life) but not as a condition (if/since life was lost this turn).
  - **Suggested fix:** Author `condition.cares_lifeloss` covering "an opponent lost life this turn", "you lost life this turn", "if a player lost N or more life", etc. Family includes Vito's Inquisitor-style gates, OTJ outlaws-care-about-life-loss, and "morbid for life-loss" payoffs. (Coverage gap, not a per-card narrowing.)

---

## Clement, the Worrywort  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Frog Druid
**Mana cost:** {1}{G}{U}

**Oracle text:**

```
Vigilance
Whenever Clement or another creature you control enters, return up to one target creature you control with lesser mana value to its owner's hand.
Frogs you control have "{T}: Add {G} or {U}. Spend this mana only to cast a creature spell."
```

**Current tags:** `condition.cares_tribe.frog`, `effect.bounce_creature`, `effect.has_vigilance`, `trigger.self_etb`

### Issues

- **missing**: `trigger.another_creature_etb`
  - **What's wrong:** Compound subject "Whenever __SELF__ or another creature you control enters" fires both self and another-creature halves, but only `trigger.self_etb` is tagged. The rule's compound arm is scoped to `"this <type>"` only — `__SELF__` isn't in the alternation.
  - **Evidence vs reality:** Normalized text: `whenever __self__ or another creature you control enters, return up to one target creature you control with lesser mana value to its owner's hand.` Rule's compound pattern: `whenever this (creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker) or (a|another|one or more) [\w\-\s]{1,80}?(enters?|enters or is turned face up)`. The `this <type>` slot doesn't admit `__self__`, so the legendary-name compound frame is silently missed.
  - **Suggested fix:** Broaden the compound arm's leading subject to also accept `__self__` (and possibly `this card`): `whenever (?:__self__|this (?:creature|artifact|...)) or (?:a|another|one or more) ...`. Add Clement to `.test.ts` positives.

---

## Clifftop Lookout  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Frog Scout
**Mana cost:** {2}{G}

**Oracle text:**

```
Reach
When this creature enters, reveal cards from the top of your library until you reveal a land card. Put that card onto the battlefield tapped and the rest on the bottom of your library in a random order.
```

**Current tags:** `effect.has_reach`, `trigger.self_etb`

### Issues

- **missing**: `effect.ramp_nonland` (or coverage gap for `reveal-until-land + put into play`)
  - **What's wrong:** Reveal-until-land into play is functionally identical to a Cultivate-style ramp (non-land card puts a land into play). The rule anchors on "search your library" patterns only and misses the "reveal cards from the top of your library until you reveal a land card. Put that card onto the battlefield" templating.
  - **Evidence vs reality:** Oracle text: "reveal cards from the top of your library until you reveal a land card. Put that card onto the battlefield tapped". `effect.ramp_nonland` PATTERNS all require `search your library for ...` or `put lands? cards? from your hand/graveyard onto the battlefield`. `effect.cheat_into_play`'s "look at top N" arm also requires "look at" not "reveal until". Reveal-until-land is uncovered.
  - **Suggested fix:** Add a fourth pattern to `effect.ramp_nonland` matching `\breveal cards from the top of your library until you reveal a (basic )?land card. put (it|that card) onto the battlefield\b`. Family includes Clifftop Lookout and any reveal-until-land variant. (Mirror Recommission-style reveal-until-creature would fall to `effect.cheat_into_play` if extended in parallel.)

---

## Daring Waverider  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Otter Wizard
**Mana cost:** {4}{U}{U}

**Oracle text:**

```
When this creature enters, you may cast target instant or sorcery card with mana value 4 or less from your graveyard without paying its mana cost. If that spell would be put into your graveyard, exile it instead.
```

**Current tags:** `condition.cares_graveyard`, `condition.cares_low_mana_value`, `trigger.self_etb`

### Issues

- **missing**: `condition.cares_instant_sorcery_in_graveyard`
  - **What's wrong:** "Cast target instant or sorcery card ... from your graveyard" is the textbook Izzet spells-matter / instant-sorcery-in-graveyard payoff frame, but the rule didn't fire.
  - **Evidence vs reality:** Text: "cast target instant or sorcery card with mana value 4 or less from your graveyard". Check the rule's regex — likely requires "for each instant or sorcery card in your graveyard" or "instant/sorcery card in your graveyard" without intervening qualifiers like "with mana value N or less".
  - **Suggested fix:** Broaden the rule to admit "instant or sorcery card[s]? with [qualifier] in your graveyard" / "from your graveyard". Confirm against existing test fixtures.

- **missing**: `effect.cast_for_free`
  - **What's wrong:** "Cast ... without paying its mana cost" is the canonical free-cast frame. Not tagged.
  - **Evidence vs reality:** Text: "cast target instant or sorcery card with mana value 4 or less from your graveyard without paying its mana cost". Should match `effect.cast_for_free`.
  - **Suggested fix:** Verify the rule's pattern — if it requires "exiled card" anchoring, broaden to also accept "from your graveyard without paying its mana cost".

---

## Darkstar Augur  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Bat Warlock
**Mana cost:** {2}{B}

**Oracle text:**

```
Offspring {B}
Flying
At the beginning of your upkeep, reveal the top card of your library and put that card into your hand. You lose life equal to its mana value.
```

**Current tags:** `effect.has_flying`, `effect.has_offspring`, `effect.life_changed`, `effect.look_at_top_n`, `trigger.upkeep`

### Issues

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** "Reveal the top card of your library and put that card into your hand" is the Dark Confidant frame — functionally drawing a card. The rule anchors on the verb `draw`/`discard` and misses the "reveal + put into hand" templating.
  - **Evidence vs reality:** Text contains no literal `draw`/`discards` token. Rule's PATTERN expects `draws? a card` / `draws? N cards` / `your hand` after `draws?`. Reveal-then-put-to-hand is uncovered.
  - **Suggested fix:** Add a fourth alternation to `effect.draws_or_discards` matching `reveal the top (?:\w+ )?card of your library (?:and|. )?\s*put (?:that card|it) into your hand`. Family: Darkstar Augur, Dark Confidant analogues. Verify it doesn't double-match with cards that already trigger `draw a card` afterward.

---

## Dour Port-Mage  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Frog Wizard
**Mana cost:** {1}{U}

**Oracle text:**

```
Whenever one or more other creatures you control leave the battlefield without dying, draw a card.
{1}{U}, {T}: Return another target creature you control to its owner's hand.
```

**Current tags:** `effect.bounce_creature`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`

### Issues

- **missing**: `trigger.creature_leaves_battlefield`
  - **What's wrong:** "Whenever one or more other creatures you control leave the battlefield" is a textbook flicker-payoff trigger but plural verb form ("leave" not "leaves") prevents the rule from firing.
  - **Evidence vs reality:** Rule's `LTB_VERB` constant is `(?:leaves the battlefield|is put into a graveyard from the battlefield|is exiled from the battlefield|(?:is|are) put into exile)`. The first alternative is singular "leaves" only; with "one or more creatures" subject, the verb agreement gives "leave the battlefield" which doesn't match. Card text: "whenever one or more other creatures you control leave the battlefield without dying".
  - **Suggested fix:** Broaden `LTB_VERB` to allow `leaves?` (`leave[s]?\\s+the\\s+battlefield`). Mirror the change in any sibling trigger.*_leaves_battlefield rules that reuse the LTB_VERB shape (`artifact`, `enchantment`, `land`, `planeswalker`, `permanent`) if they share the constant. Add Dour Port-Mage to `.test.ts` positives.

---

## Dragonhawk, Fate's Tempest  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Bird Dragon
**Mana cost:** {3}{R}{R}

**Oracle text:**

```
Flying
Whenever Dragonhawk enters or attacks, exile the top X cards of your library, where X is the number of creatures you control with power 4 or greater. You may play those cards until your next end step. At the beginning of your next end step, Dragonhawk deals 2 damage to each opponent for each of those cards that are still exiled.
```

**Current tags:** `condition.cares_high_power`, `effect.deals_damage`, `effect.exile_from_library`, `effect.has_flying`, `effect.impulse_draw`, `trigger.attack_or_block`, `trigger.beginning_of_end_step`, `trigger.self_etb`

### Issues

- **missing**: `condition.cares_exile_pile`
  - **What's wrong:** "Dragonhawk deals 2 damage to each opponent for each of those cards that are still exiled" scales damage off the exile pile (the impulse-draw pile this card created earlier). The rule has 9 patterns but none match the "for each of those cards that are still exiled" phrasing.
  - **Evidence vs reality:** Card text: "for each of those cards that are still exiled". Closest existing patterns: (7) "each card exiled this way" — different anaphor; (9) "for as long as (they|it) remains exiled" — different verb form. The "still exiled" predicate frame is uncovered.
  - **Suggested fix:** Add a 10th pattern to `condition.cares_exile_pile`: `\bfor each (?:of those |those )?cards? that (?:are|is) still exiled\b`. Mirror "Dragonhawk-style" exile-then-scale impulse cards (likely a small family with Possibility Storm-adjacent designs).

---

## Dreamdew Entrancer  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Frog Wizard
**Mana cost:** {2}{G}{U}

**Oracle text:**

```
Reach
When this creature enters, tap up to one target creature and put three stun counters on it. If you control that creature, draw two cards.
```

**Current tags:** `effect.counter_modified`, `effect.draws_or_discards`, `effect.has_reach`, `effect.tap`, `trigger.self_etb`

### Issues

- **missing**: no `effect.stun_counter` exists (coverage gap)
  - **What's wrong:** Stun counters are a recurring tap-lock mechanic across MOM / OTJ / FDN / Bloomburrow (Dreamdew Entrancer, Drag to the Bottom, Sterling Hound, Pawpatch Recruit, multiple others). The catalog has `effect.counter_modified` (generic) but no specific tag for stun counters — so deckbuilders filtering for "soft removal" / "tap lockdown" can't surface this family as a coherent group. Also semantically distinct from +1/+1 / loyalty / -1/-1 counters: stun counters are the modern replacement for "doesn't untap during its controller's untap step" auras (Charmed Sleep).
  - **Evidence vs reality:** Card text: "put three stun counters on it". No tag in the catalog plausibly describes the stun-counter mechanic specifically. The closest semantic kin would be the (also-missing) `effect.prevents_untap` / `effect.tap_lock` axis.
  - **Suggested fix:** Author `effect.stun_counter` covering "put N stun counter[s]? on" / "for each stun counter on" / "remove a stun counter" — small but coherent family. Pairs with `effect.tap` (soft-control axis) and potentially with a future `condition.cares_counters` for non-+1/+1 counters.

---

## Druid of the Spade  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Rabbit Druid
**Mana cost:** {2}{G}

**Oracle text:**

```
As long as you control a token, this creature gets +2/+0 and has trample.
```

**Current tags:** `effect.grants_stat_buff`, `effect.grants_trample`

### Issues

- **missing**: `condition.cares_tokens`
  - **What's wrong:** "As long as you control a token" is a tokens-matter gating condition (token-anthem axis). The rule's gating-form patterns require "if you control" or "tokens you control" (plural-after-determiner), so the singular "control a token" predicate slips through.
  - **Evidence vs reality:** Card text: "as long as you control a token". Rule patterns: `if you control (?:[\d]+ or more |[\w\s\-]+ )?tokens?` (requires "if"), `tokens? you control` (requires noun-before-verb order), `for each ... tokens`, etc. None accept "as long as you control a/the/N tokens?".
  - **Suggested fix:** Add a new pattern: `\b(?:as long as|while|whenever) you control (?:a|an|one|two|three|four|five|six|seven|\d+) (?:[\w\-]+ ){0,2}tokens?\b`. The "as long as" / "while" framing is common for token-anthem conditional gains (Druid of the Spade, Mardu Outrider-style, various FDN cards).

---

## Early Winter  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {4}{B}

**Oracle text:**

```
Choose one —
• Exile target creature.
• Target opponent exiles an enchantment they control.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.exile_creature`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.exile_enchantment`
  - **What's wrong:** "Target opponent exiles an enchantment they control" is enchantment removal via the edict-exile frame (you don't target the enchantment; the opponent chooses one to exile). The rule's two patterns are scoped to your-side exile ("you exile target enchantment") and don't admit the opponent-chooses frame.
  - **Evidence vs reality:** Card text: "target opponent exiles an enchantment they control". `PATTERN_OWN` requires the determiner `(another|target|each|all)` before "enchantments?" — but "an" is not in the alternation. `PATTERN_BROAD` similarly anchors on "exile target permanent" style. The opponent-edict-exile frame is uncovered.
  - **Suggested fix:** Add a third pattern: `\btarget (?:opponent|player) exiles? (?:a|an|one|two|three|\d+)\s+(?:[\w\-]+\s+){0,3}?enchantments?\b`. Mirror the same shape for `effect.exile_creature` / `effect.exile_artifact` if they have the same gap (likely). Family: Early Winter and any "target opponent exiles X they control" cards across modern sets.

---

## Eluge, the Shoreless Sea  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Elemental Fish
**Mana cost:** {1}{U}{U}{U}

**Oracle text:**

```
Eluge's power and toughness are each equal to the number of Islands you control.
Whenever Eluge enters or attacks, put a flood counter on target land. It's an Island in addition to its other types for as long as it has a flood counter on it.
The first instant or sorcery spell you cast each turn costs {U} (or {1}) less to cast for each land you control with a flood counter on it.
```

**Current tags:** `condition.cares_islands`, `condition.cares_lands`, `condition.cares_noncreature_spell`, `effect.counter_modified`, `effect.land_becomes_island`, `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **missing**: `effect.cost_reduction`
  - **What's wrong:** "Costs {U} (or {1}) less to cast for each land you control with a flood counter on it" is cost reduction, but the rule's two patterns only accept numeric mana costs `{[\dx]+}` — colored mana symbols (`{U}`, `{R}`, `{W/B}`) aren't admitted.
  - **Evidence vs reality:** Card text: "costs {U} (or {1}) less to cast". Rule PATTERN: `costs?\s+\{[\dx]+\}\s+less\b`. `{U}` is not in `[\dx]+`. The parenthetical fallback `(or {1})` is reminder text that gets stripped pre-normalization, so the rule never sees the `{1}` form.
  - **Suggested fix:** Broaden the first pattern to also accept single colored mana symbols: `\bcosts?\s+\{(?:[\dx]+|[wubrg]|[wubrg]/[wubrg]|[\dx]/[wubrg])\}\s+less\b`. Verify no leak into Phyrexian-mana cost wording. Eluge and any colored-mana-cost-reduction printing (Beseech the Mirror-adjacent designs) are positives.

---

## Flowerfoot Swordmaster  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Mouse Soldier
**Mana cost:** {W}

**Oracle text:**

```
Offspring {2}
Valiant — Whenever this creature becomes the target of a spell or ability you control for the first time each turn, Mice you control get +1/+0 until end of turn.
```

**Current tags:** `condition.cares_tribe.mouse`, `condition.valiant`, `effect.has_offspring`

### Issues

- **missing**: `effect.grants_stat_buff`
  - **What's wrong:** "Mice you control get +1/+0 until end of turn" is a tribal anthem grant but the rule's tribal pattern doesn't match irregular plurals like "Mice" (no -s / -en suffix).
  - **Evidence vs reality:** Card text: "Mice you control get +1/+0". `TRIBAL_PATTERN`: `\b(?:[a-z]+(?:s|en)|merfolk)\s+you\s+control[^.]{0,40}? gets? \+(?:\d+|x)\/\+(?:\d+|x)`. "Mice" lacks -s / -en. Only "merfolk" is hard-coded as an irregular plural; "mice" / "geese" / "dwarves" / "rats" (rats matches, fine) and other tribal forms aren't.
  - **Suggested fix:** Add the irregular plurals to the alternation: `\b(?:[a-z]+(?:s|en)|merfolk|mice|geese|dwarves|elves|wolves|knaves|axolotls?)\s+you\s+control...`. Mice and Geese are the Bloomburrow-relevant ones; mirror across any sibling rules using the same TRIBAL_PATTERN convention.

---

## Gev, Scaled Scorch  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Lizard Mercenary
**Mana cost:** {B}{R}

**Oracle text:**

```
Ward—Pay 2 life.
Other creatures you control enter with an additional +1/+1 counter on them for each opponent who lost life this turn.
Whenever you cast a Lizard spell, Gev deals 1 damage to target opponent.
```

**Current tags:** `condition.cares_tribe.lizard`, `effect.deals_damage`, `effect.has_ward`, `effect.life_changed`, `trigger.spell_cast`

### Issues

- **missing**: `effect.plus_one_counter` and `effect.counter_modified`
  - **What's wrong:** "Other creatures you control enter with an additional +1/+1 counter on them" is a Hardened Scales-style replacement that should fire plus_one_counter. The ETB-modifier pattern's quantifier slot doesn't admit "additional" between the determiner and "+1/+1".
  - **Evidence vs reality:** Card text: "other creatures you control enter with an additional +1/+1 counter on them". Pattern 21: `enters? (?:the battlefield )?with (?:a |an |another |\d+ |x |one |two |three )?\+1\/\+1 counters?` — the quantifier slot ends right before `+1/+1`; no `(?:additional )?` modifier is allowed. The reanimate pattern (27) DOES allow "additional" but only inside the `return ... with` frame.
  - **Suggested fix:** Insert `(?:additional )?` immediately before `\+1\/\+1` in the ETB pattern: `enters? (?:the battlefield )?with (?:a |an |another |\d+ |x |one |two |three )?(?:additional )?\+1\/\+1 counters?`. Family: Gev, Hardened Scales-style modifiers, Conclave Mentor-adjacent designs.

---

## Gossip's Talent  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment — Class
**Mana cost:** {1}{U}

**Oracle text:**

```
Whenever a creature you control enters, surveil 1.
{1}{U}: Level 2
Whenever you attack, target attacking creature with power 3 or less can't be blocked this turn.
{3}{U}: Level 3
Whenever a creature you control deals combat damage to a player, you may exile it, then return it to the battlefield under its owner's control.
```

**Current tags:** `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.surveil`, `effect.unblockable`, `trigger.another_creature_etb`, `trigger.attack_or_block`, `trigger.damage_dealt`

### Issues

- **missing**: `effect.bounce_creature` (flicker via anaphoric "it")
  - **What's wrong:** "You may exile it, then return it to the battlefield" is a canonical flicker effect, but the rule's BLINK_OWN pattern requires the noun "creature" before "exile". With combat-damage trigger antecedents resolved into the pronoun "it", the flicker frame slips through.
  - **Evidence vs reality:** Card text level 3: "whenever a creature you control deals combat damage to a player, you may exile it, then return it to the battlefield under its owner's control". `PATTERN_BLINK_OWN`: `\bexile(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?:[\w\-]+[,\s]+){0,5}?creatures?[^.]*?(?:,\s*then\s+return|\.\s*return)` — needs "creatures?" token between exile and return. "it" doesn't match.
  - **Suggested fix:** Add a fourth pattern for pronoun-anchored flicker: `\bexile (?:it|them)[,\s]+(?:then\s+)?returns? (?:it|them) to the battlefield\b`. Gate on the surrounding clause containing a creature antecedent if false positives appear (Gossip's Talent's antecedent is "a creature you control" two clauses earlier).

---

## Harnesser of Storms  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Otter Wizard
**Mana cost:** {2}{R}

**Oracle text:**

```
Whenever you cast a noncreature or Otter spell, you may exile the top card of your library. Until end of turn, you may play that card. This ability triggers only once each turn.
```

**Current tags:** `condition.cares_tribe.otter`, `effect.exile_from_library`, `effect.impulse_draw`, `trigger.spell_cast`

### Issues

- **missing**: `condition.cares_noncreature_spell`
  - **What's wrong:** "Whenever you cast a noncreature or Otter spell" is a textbook noncreature-spell trigger but the disjunctive "noncreature or <tribe>" frame breaks the rule's `noncreature\s+spell` anchor.
  - **Evidence vs reality:** Card text: "whenever you cast a noncreature or Otter spell". Pattern 31: `\bwhenever [\w\s']+? cast(?:s|ed)?\s+(?:a|an|one|another|<ord>)\s*noncreature\s+spell\b` — requires "noncreature" immediately followed by "spell". The intercalated "or Otter" prevents the match.
  - **Suggested fix:** Broaden the determiner+descriptor slot to tolerate "noncreature or <tribe>" intercalation: `noncreature(?:\s+(?:or|and)\s+\w+)?\s+spell`. Other Bloomburrow tribal-mage hybrids likely hit the same frame (Heartfire Hero-adjacent designs). Verify against existing tests.

---

## Honored Dreyleader  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Squirrel Warrior
**Mana cost:** {2}{G}

**Oracle text:**

```
Trample
When this creature enters, put a +1/+1 counter on it for each other Squirrel and/or Food you control.
Whenever another Squirrel or Food you control enters, put a +1/+1 counter on this creature.
```

**Current tags:** `condition.cares_subtype.food`, `condition.cares_tribe.squirrel`, `effect.counter_modified`, `effect.has_trample`, `effect.plus_one_counter`, `trigger.self_etb`

### Issues

- **missing**: `trigger.another_creature_etb`
  - **What's wrong:** "Whenever another Squirrel or Food you control enters" is a tribal ETB trigger that fires on the Squirrel half, but the tribal pattern doesn't tolerate the disjunctive "<tribe> or <subtype>" subject form.
  - **Evidence vs reality:** Card text: "whenever another squirrel or food you control enters". Tribal arm: `whenever (?:a|another)\s+(?!(?:artifact|enchantment|...|creature)\b)[\w\-]+\s+(?:you control\s+)?(?:enters?|enters or is turned face up)`. After matching "another squirrel", the next required token is `you control` or `enters` — but the text inserts " or food" before "you control". The disjunction breaks the match.
  - **Suggested fix:** Broaden the tribal arm's subject slot to accept disjunctive subtype+tribe (or tribe+tribe): `(?:a|another)\s+[\w\-]+(?:\s+(?:or|and)\s+[\w\-]+)?\s+(?:you control\s+)?(?:enters?|enters or is turned face up)`. Mirror the change in the compound arm if it shares the same constraint. Also verify pairing edges propagate correctly given Food is a subtype (not a creature type).

---

## Huskburster Swarm  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Elemental Insect
**Mana cost:** {7}{B}

**Oracle text:**

```
This spell costs {1} less to cast for each creature card you own in exile and in your graveyard.
Menace, deathtouch
```

**Current tags:** `effect.cost_reduction`, `effect.has_deathtouch`, `effect.has_menace`

### Issues

- **missing**: `condition.cares_graveyard` AND `condition.cares_exile_pile`
  - **What's wrong:** "For each creature card you own in exile and in your graveyard" is a graveyard-AND-exile-pile scaling — both axes should fire. Two compounding regex misses: (a) `cares_graveyard` pattern 15 (`for each ... cards? in ... graveyards?`) requires `cards? in` adjacent — the intervening possessive "you own" breaks the match; (b) `cares_exile_pile` pattern 1 (`cards (you own|owned by you) in exile`) requires plural `cards` — singular "card" misses.
  - **Evidence vs reality:** Card text: "for each creature card you own in exile and in your graveyard". Neither pattern fires. The Cosmogoyf / Slime Against Humanity templating uses this same "card you own in [exile/graveyard]" frame across modern sets.
  - **Suggested fix:** For `cares_graveyard` p15: insert an optional possessive slot — `\bfor each (?:[\w\s\-]+? )?cards? (?:you own |you control |owned by you )?in [\w\s]+?graveyards?\b`. For `cares_exile_pile` p1: pluralize — `\bcards? (?:you own|owned by you) in exile\b`. Both are minimal broadenings and should be safe.

---

## Jolly Gerbils  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Hamster Citizen
**Mana cost:** {1}{W}

**Oracle text:**

```
Whenever you give a gift, draw a card.
```

**Current tags:** `effect.draws_or_discards`

### Issues

- **missing**: no `trigger.gift_promised` or `condition.gift_promised` exists (coverage gap)
  - **What's wrong:** Gift is a multi-card mechanic across Bloomburrow. The catalog has `effect.has_gift` (the producer half — cards WITH Gift in their cost) but no trigger or condition counterpart for the payoff half ("whenever you give a gift", "if the gift was promised"). Cards like Jolly Gerbils that explicitly care about gift-giving lose their primary semantic axis — there's no edge from Jolly Gerbils to any of the ~10+ Bloomburrow Gift cards.
  - **Evidence vs reality:** Card text: "whenever you give a gift, draw a card". No catalog tag's description plausibly matches the "gift-given" trigger / "gift-promised" gating condition. effect.has_gift has empty pairsWith.
  - **Suggested fix:** Author `trigger.gift_promised` ("Whenever you give a gift / Whenever a gift is promised / Whenever an opponent receives a gift you gave") — small but coherent Bloomburrow family. Pair it with `effect.has_gift` so the producer-payoff graph edge forms. Also consider `condition.gift_promised` for cards that have an "if the gift was promised" gate inside another ability (Crumb and Get It, Coiling Rebirth, Cruelclaw's Heist, Dewdrop Cure, Dawn's Truce — all currently audited as having `effect.has_gift` but missing the condition that distinguishes the gift-promised payoff from the baseline effect).

---

## Kitsa, Otterball Elite  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Otter Wizard
**Mana cost:** {1}{U}

**Oracle text:**

```
Vigilance
Prowess
{T}: Draw a card, then discard a card.
{2}, {T}: Copy target instant or sorcery spell you control. You may choose new targets for the copy. Activate only if Kitsa's power is 3 or greater.
```

**Current tags:** `effect.copy_spell`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.has_prowess`, `effect.has_vigilance`, `condition.cares_noncreature_spell`

### Issues

- **missing**: `condition.cares_high_power`
  - **What's wrong:** "Kitsa's power is 3 or greater" is a self-power gate on the activation cost — a textbook high-power-mattering predicate. The rule's three arms all require the noun "power" adjacent to the numeric phrase or the literal "greatest power" idiom.
  - **Evidence vs reality:** Card text: "activate only if __self__'s power is 3 or greater". Pattern: `\bpower (?:[3-9]|\d{2,}) or (?:greater|more|higher)\b|\b(?:with|is) the greatest power\b|\b(?:[3-9]|\d{2,}) or greater power\b`. The "is N or greater" frame (with copula between "power" and the number) is uncovered. The "is the greatest power" arm requires the literal idiom, not a numeric.
  - **Suggested fix:** Add an arm for the possessive copula frame: `\b(?:[\w']+?'s|its)\s+power (?:is|are)\s+(?:[3-9]|\d{2,}) or (?:greater|more|higher)\b`. Family: Kitsa, possibly other self-gated activated-ability cards. Verify no leak from "its power is 1" toughness-style designs.

---

## Knightfisher  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Bird Knight
**Mana cost:** {3}{U}{U}

**Oracle text:**

```
Flying
Whenever another nontoken Bird you control enters, create a 1/1 blue Fish creature token.
```

**Current tags:** `condition.cares_tribe.bird`, `effect.create_creature_token`, `effect.create_token`, `effect.has_flying`

### Issues

- **missing**: `trigger.another_creature_etb`
  - **What's wrong:** "Whenever another nontoken Bird you control enters" is a tribal ETB trigger gated on nontoken status. The tribal arm's tribe slot accepts only a single `[\w\-]+` token; the "nontoken Bird" two-word adjective+tribe sequence overflows it.
  - **Evidence vs reality:** Card text: "whenever another nontoken bird you control enters". Tribal arm: `whenever (?:a|another)\s+(?!(?:artifact|enchantment|land|planeswalker|battle|permanent|token|creature)\b)[\w\-]+\s+(?:you control\s+)?(?:enters?|enters or is turned face up)`. After "another", `[\w\-]+` consumes "nontoken" but then "Bird" still stands between it and "you control" / "enters".
  - **Suggested fix:** Allow an optional pre-tribe adjective: `whenever (?:a|another)\s+(?!(?:artifact|...|creature)\b)(?:nontoken\s+)?[\w\-]+\s+(?:you control\s+)?(?:enters?|enters or is turned face up)`. The "nontoken" qualifier is the most common in Bloomburrow tribal-payoff designs; also consider "another colorless", "another red", etc. as future broadenings.

---

## Mabel, Heir to Cragflame  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Mouse Soldier
**Mana cost:** {1}{R}{W}

**Oracle text:**

```
Other Mice you control get +1/+1.
When Mabel enters, create Cragflame, a legendary colorless Equipment artifact token with "Equipped creature gets +1/+1 and has vigilance, trample, and haste" and equip {2}.
```

**Current tags:** `condition.cares_subtype.equipment`, `condition.cares_tribe.mouse`, `trigger.self_etb`

### Issues

- **missing**: `effect.create_token`
  - **What's wrong:** "Create Cragflame, a legendary colorless Equipment artifact token" creates a token, but the rule's filler class `[a-z0-9\/+\- ]+?` doesn't admit commas — and the named-token frame ("create Foo, a legendary X token") always introduces a comma between the name and the descriptor.
  - **Evidence vs reality:** Card text: "create cragflame, a legendary colorless equipment artifact token". Pattern: `creates? (?:a |an |\d+ )?(?:[a-z0-9\/+\- ]+? )?token` — the optional filler class lacks `,` so it can't consume "cragflame," and the alternative paths don't reach `token`. Family: Mabel/Cragflame, recent LOTR named legendaries, Quintorius Kand-style sources, any Bloomburrow card that creates a named legendary token.
  - **Suggested fix:** Either (a) add `,` to the filler character class — `[a-z0-9\/+\-, ]+?` — accepting commas as a non-greedy bridge; or (b) add a parallel pattern for the named-token frame: `\bcreates? (?:[\w]+(?:'s)?)?[,\s]+(?:a|an|the)\s+(?:[\w\-\/]+\s+){1,8}token\b`. Mirror to `effect.create_creature_token` if the named-token frame applies to creature tokens too.

- **missing**: `effect.grants_stat_buff` (Mice tribal anthem)
  - **What's wrong:** "Other Mice you control get +1/+1" — same irregular-plural miss as Flowerfoot Swordmaster (already logged). `Mice` doesn't match `[a-z]+(?:s|en)|merfolk`.
  - **Suggested fix:** See Flowerfoot Swordmaster entry — add irregular plurals (mice, geese, dwarves) to `TRIBAL_PATTERN`.

---

## Might of the Meek  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {R}

**Oracle text:**

```
Target creature gains trample until end of turn. It also gets +1/+0 until end of turn if you control a Mouse.
Draw a card.
```

**Current tags:** `condition.cares_tribe.mouse`, `effect.cast_noncreature_spell`, `effect.draws_or_discards`, `effect.grants_trample`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.grants_stat_buff`
  - **What's wrong:** "It also gets +1/+0 until end of turn" is a +N/+N grant whose antecedent ("target creature") is in the previous sentence. The rule's subject slot enumerates `creatures?|permanents?|attackers?|blockers?|target [a-z]+...` — the anaphoric pronoun "it" isn't admitted.
  - **Evidence vs reality:** Card text: "target creature gains trample until end of turn. it also gets +1/+0 until end of turn if you control a mouse". Sentence-break between subject and grant. Pattern: `(?:creatures?|permanents?|attackers?|blockers?|target [a-z]+(?: [a-z]+)?)[^.]{0,40}? gets? \+(?:\d+|x)\/\+(?:\d+|x)` — period in `[^.]` filler prevents bridging across sentences anyway. Even within-sentence "it" subject isn't matched.
  - **Suggested fix:** Add `\bit\b` to the subject alternation: `(?:creatures?|permanents?|attackers?|blockers?|target [a-z]+(?: [a-z]+)?|it)[^.]{0,40}? gets? \+(?:\d+|x)\/\+(?:\d+|x)`. Gate on context if "it" causes leaks (likely safe — the "+N/+N" predicate is highly specific).

---

# v0.20.0 batch — card-tag-audit punch list (shipped 2026-05-31)

23 fixes shipped after dual-reviewer + tiebreaker process. Test count: 3130 pass (+30 regression rows). Coverage: 99.2% unchanged. See `mtg-graph-narrow-tag-rule` "Batch mode" for the multi-agent flow.

**Shipped:**
- `effect.draws_or_discards` — third-party-subject (`target player draws`, `its controller draws`) + alt-cost discard (`by discarding a card`) arms
- `effect.grants_evasion` — clone-frame self-anaphor strip (`enter as a copy of ... it has X`)
- `condition.cares_lifegain` + `trigger.life_changed` — `gain or lose life` disjunctive frame
- `condition.gift_promised` — negative polarity (`wasn't promised`)
- `effect.cast_from_exile` — Pattern 2 ("cast a spell this way") gated by 200-char backward exile-token check
- `effect.counter_modified` — return-to-battlefield-with-counter (ETB-with-counter via blink/reanimate)
- `effect.exile_from_library` — reveal-verb + count-less frame ("exile cards from the top of your library until ...")
- `effect.causes_damage` — anaphoric "then it deals damage" filler
- `condition.cares_high_power` — "power or toughness N" disjunction
- `effect.untap` — narrow "gain control + untap it" Threaten-shape arm
- `condition.cares_low_power` — "<name>'s/its power is N or less" copula arm
- `effect.edict` — "unless that player sacrifices" punisher frame
- `effect.bounce_creature` — "return those creatures" with antecedent gate
- `trigger.counter_changed` — counter-type slot before bare `counters?`
- `effect.loses_abilities` — "loses all (other) card types and abilities" Aura-transform
- `effect.grants_keyword` (Frame f) — `{0,4}?` pre-item filler (benefits all keyword grants in 4-item lists)
- `effect.cast_for_free` — "rather than paying" alt-cost frame
- `effect.reanimate` — "put into <X>'s graveyard this way" wipe-then-recur frame
- `effect.look_at_top_n` — compound quantifier (`twice X`, `three times that many`)
- `effect.has_mana_activated_ability` — keyword-cost prefix strip (Offspring/Kicker/Equip/Ward etc.) before scanning
- `effect.bounce_*` — comma-filler for mass-bounce frame ("return each nonland, nontoken permanent")
- `pipeline/tag-expansion.ts` — typed-suppression: when parent evidence has `non<type>`, skip the `_<type>` child (fixes Season-of-the-Burrow `exile_land` FP and resolves the Rottenmouth Viper / Scavenger's Talent sacrifice_permanent issue)

**Rejected (kept here for reference — these are intentional prior narrowings):**
- `condition.cares_low_power` blocker-restriction frame (Rust-Shield Rampager) — explicit BLOCKER_GUARD added in v0.14.4; "can't be blocked by creatures with power N or less" is pseudo-evasion, not a low-power payoff.
- `effect.exile_creature` flicker-tail (Salvation Swan, Skyskipper Duo) — FLICKER_TAIL guard is intentional; flicker tags as `bounce_creature` only, double-counting as exile_creature would distort removal counts.
- `condition.cares_plus_one_counter` placement-trigger (Stocking the Pantry) — tag is a STATE predicate ("has a counter"), not a placement trigger; placement axis is `trigger.counter_changed` (shipped).
- `effect.pacify` becomes-noncreature-via-Aura (Sugar Coat) — semantic coverage gap; needs a new tag (`effect.becomes_inert_permanent`) for the Sugar Coat / Witness Protection / Song of the Dryads family. Deferred to v0.8+ LLM verification phase.
- `effect.create_creature_token` modal-antecedent guard (Season of Weaving) — token IS a creature in 50% of branches; suppressing creates worse FN. Tribal-edge metadata path (`creatureTypes: []`) is already safe.

**Deferred (need infrastructure, not just regex):**
- Modal "Choose <type> or <type>. Destroy all permanents of the chosen type." typed-expansion narrowing (Season of Gathering) — only 1-2 cards in current Standard hit this; revisit when a third "chosen type" card ships. `effect.board_wipe` + `effect.destroy_artifact` + `effect.destroy_enchantment` still fire correctly; the FPs are on `destroy_creature` / `_planeswalker` / `_land`.

---

## Mind Spiral  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {4}{U}

**Oracle text:**

```
Gift a tapped Fish (You may promise an opponent a gift as you cast this spell. If you do, they create a tapped 1/1 blue Fish creature token before its other effects.)
Target player draws three cards. If the gift was promised, tap target creature an opponent controls and put a stun counter on it. (If a permanent with a stun counter would become untapped, remove one from it instead.)
```

**Current tags:** `condition.gift_promised`, `effect.cast_noncreature_spell`, `effect.counter_modified`, `effect.has_gift`, `effect.is_instant_or_sorcery`, `effect.stun_counter`, `effect.tap`

### Issues

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** Card has "target player draws three cards" but no draw-axis tag fires.
  - **Evidence vs reality:** The clause "target player draws three cards" is a draw effect by any reasonable reading; tagDef says "Draws or discards cards" with no controller scope.
  - **Suggested fix:** Broaden `effect.draws_or_discards` regex to admit `target\s+player\s+draws` in addition to "you draw" / "target opponent draws".
---

## Mockingbird  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Bird Bard
**Mana cost:** {X}{U}

**Oracle text:**

```
Flying
You may have this creature enter as a copy of any creature on the battlefield with mana value less than or equal to the amount of mana spent to cast this creature, except it's a Bird in addition to its other types and it has flying.
```

**Current tags:** `condition.cares_tribe.bird`, `condition.has_x_in_cost`, `effect.clone_in_place`, `effect.grants_evasion`, `effect.has_flying`

### Issues

- **false-positive**: `effect.grants_evasion`
  - **What's wrong:** This is self-clone framing, not a grant to other creatures or tokens. Same shape as the manland / self-animation leak in the recurring-patterns list.
  - **Evidence vs reality:** Evidence is "has flying" inside "it's a Bird in addition to its other types and it has flying" — the antecedent of "it" is this creature itself entering as a copy, not another creature. The tagDef description is "Gives flying, menace, or intimidate to *other* creatures or to *tokens it creates*."
  - **Suggested fix:** Add `enter[s]? as a copy of .* it has` to the existing self-animation exclusion in `effect.grants_evasion`'s regex, so the clone-with-extra-keyword family doesn't false-positive.
---

## Moonstone Harbinger  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Bat Warrior
**Mana cost:** {2}{B}

**Oracle text:**

```
Flying, deathtouch
Whenever you gain or lose life during your turn, Bats you control get +1/+0 and gain deathtouch until end of turn. This ability triggers only once each turn.
```

**Current tags:** `condition.cares_lifeloss`, `condition.cares_tribe.bat`, `effect.grants_deathtouch`, `effect.grants_stat_buff`, `effect.has_deathtouch`, `effect.has_flying`

### Issues

- **missing**: `condition.cares_lifegain`
  - **What's wrong:** Card triggers on "gain or lose life" but only the lifeloss half is tagged.
  - **Evidence vs reality:** The clause "whenever you gain or lose life" is a disjunction; the lifeloss rule matched but the lifegain rule did not.
  - **Suggested fix:** Broaden `condition.cares_lifegain` to admit `gain\s+or\s+lose\s+life` (and the symmetric `lose\s+or\s+gain\s+life`). Mirror change likely already exists for cares_lifeloss; align the two.
- **missing**: `trigger.life_changed`
  - **What's wrong:** Lifegain/lifeloss trigger frame is exactly what this tagDef describes, but it didn't fire.
  - **Evidence vs reality:** "Whenever you gain or lose life" matches description verbatim. Likely the rule only matches one half of the disjunction.
  - **Suggested fix:** Broaden trigger.life_changed regex to admit the joint `gain\s+or\s+lose\s+life` frame.
---

## Nocturnal Hunger  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {2}{B}

**Oracle text:**

```
Gift a Food (You may promise an opponent a gift as you cast this spell. If you do, they create a Food token before its other effects. It's an artifact with "{2}, {T}, Sacrifice this token: You gain 3 life.")
Destroy target creature. If the gift wasn't promised, you lose 2 life.
```

**Current tags:** `condition.cares_subtype.food`, `effect.cast_noncreature_spell`, `effect.destroy_creature`, `effect.has_gift`, `effect.is_instant_or_sorcery`, `effect.life_changed`

### Issues

- **missing**: `condition.gift_promised`
  - **What's wrong:** Card has a Gift-promise gate ("if the gift wasn't promised") but the tag fires only on the positive form.
  - **Evidence vs reality:** Existing rule matches "if the gift was promised"; this card uses the negation "if the gift wasn't promised", which is the same conditional axis (still gating an effect on whether Gift was paid).
  - **Suggested fix:** Broaden `condition.gift_promised` regex to admit `if the gift was(?:n't| not)? promised` (and update tagDef description to mention both forms). Mention in test file that both polarities should match.
---

## Osteomancer Adept  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Squirrel Warlock
**Mana cost:** {1}{B}

**Oracle text:**

```
Deathtouch
{T}: Until end of turn, you may cast creature spells from your graveyard by foraging in addition to paying their other costs. If you cast a spell this way, that creature enters with a finality counter on it. (To forage, exile three cards from your graveyard or sacrifice a Food. If a creature with a finality counter on it would die, exile it instead.)
```

**Current tags:** `condition.cares_graveyard`, `effect.cast_from_exile`, `effect.counter_modified`, `effect.forage`, `effect.has_activated_ability`, `effect.has_deathtouch`

### Issues

- **false-positive**: `effect.cast_from_exile`
  - **What's wrong:** "Cast a spell this way" refers to casting from the GRAVEYARD via forage, not from exile.
  - **Evidence vs reality:** Evidence is the anaphoric "cast a spell this way", but "this way" resolves to the preceding clause "cast creature spells from your graveyard". The tagDef explicitly scopes to the exile zone. The exile-from-graveyard part is the forage cost and lives in stripped reminder text.
  - **Suggested fix:** Tighten `effect.cast_from_exile` to require a referent token (e.g. "from exile" / "exiled" / "exiled with") within proximity of the "cast" verb, OR explicitly anchor "this way" matches to a preceding "from exile" frame.
---

## Parting Gust  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {W}{W}

**Oracle text:**

```
Gift a tapped Fish (You may promise an opponent a gift as you cast this spell. If you do, they create a tapped 1/1 blue Fish creature token before its other effects.)
Exile target nontoken creature. If the gift wasn't promised, return that card to the battlefield under its owner's control with a +1/+1 counter on it at the beginning of the next end step.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.exile_creature`, `effect.has_gift`, `effect.is_instant_or_sorcery`, `effect.plus_one_counter`, `trigger.beginning_of_end_step`

### Issues

- **missing**: `effect.counter_modified`
  - **What's wrong:** Card returns a creature "with a +1/+1 counter on it" (ETB-with frame) — plus_one_counter fires but counter_modified doesn't. On most cards that put +1/+1 counters both fire; this one doesn't because the rule probably anchors on "put a … counter" verb, missing the ETB-with frame.
  - **Evidence vs reality:** plus_one_counter has evidence "return that card to the battlefield under its owner's control with a +1/+1 counter"; counter_modified is unfiring even though a counter is being placed.
  - **Suggested fix:** Broaden `effect.counter_modified` to admit the ETB-with frame `enters? .{0,40} with a .* counter` / `return[s]? .* with a .* counter` already covered by plus_one_counter.
- **missing**: `condition.gift_promised` (same as Nocturnal Hunger)
  - **What's wrong:** Negative form "if the gift wasn't promised" not matched.
  - **Suggested fix:** Broaden regex to admit `wasn't promised` polarity — same fix as Nocturnal Hunger above.
---

## Portent of Calamity  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {X}{U}

**Oracle text:**

```
Reveal the top X cards of your library. For each card type, you may exile a card of that type from among them. Put the rest into your graveyard. You may cast a spell from among the exiled cards without paying its mana cost if you exiled four or more cards this way. Then put the rest of the exiled cards into your hand.
```

**Current tags:** `condition.cares_exile_pile`, `condition.has_x_in_cost`, `effect.cast_for_free`, `effect.cast_from_exile`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.look_at_top_n`, `effect.mill`

### Issues

- **missing**: `effect.exile_from_library`
  - **What's wrong:** Card reveals top X cards of library and exiles selected ones, but no exile_from_library tag fires.
  - **Evidence vs reality:** "Reveal the top X cards of your library. For each card type, you may exile a card of that type from among them." — this is paradigm-case exile-from-library (cards move library → exile). The tagDef describes "Moves cards from a library to the exile zone".
  - **Suggested fix:** Broaden `effect.exile_from_library` regex to admit the "reveal top N … exile … from among them" frame in addition to the canonical "exile the top N cards" form.
---

## Rabid Gnaw  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {1}{R}

**Oracle text:**

```
Target creature you control gets +1/+0 until end of turn. Then it deals damage equal to its power to target creature you don't control.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.grants_stat_buff`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.causes_damage`
  - **What's wrong:** Card causes damage equal to power via the buffed creature, exact same Bite/Polliwallop family — but the anaphoric "it" instead of "target creature you control" blocks the rule.
  - **Evidence vs reality:** Rabid Bite (already tagged) has "target creature you control deals damage equal to its power to target creature you don't control"; Rabid Gnaw says "Then it deals damage equal to its power to target creature you don't control" where "it" refers back to "Target creature you control" in the previous sentence. Semantically identical, only the pronoun differs.
  - **Suggested fix:** Broaden `effect.causes_damage` regex to admit anaphoric `(?:it|that creature)\s+deals\s+damage\s+equal\s+to\s+its\s+power` in addition to the canonical "target creature you control deals damage…" frame. Also add a regression-test row using Rabid Gnaw's full text.
---

## Repel Calamity  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {1}{W}

**Oracle text:**

```
Destroy target creature with power or toughness 4 or greater.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.destroy_creature`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `condition.cares_high_power`
  - **What's wrong:** Card destroys creatures with power or toughness 4 or greater — quintessential high-power-caring text — but no cares_high_power tag fires.
  - **Evidence vs reality:** The clause "power or toughness 4 or greater" satisfies the tagDef "Triggers, scales, or gates on creatures with power N or greater (N >= 3)" because 4 >= 3. The "or toughness" alternative likely blocks the rule, which probably anchors only on `power\s+\d`.
  - **Suggested fix:** Broaden `condition.cares_high_power` regex to admit `power\s+(?:or\s+toughness\s+)?(\d)\s+or\s+greater` (a frequent removal-spell frame: Doom Blade variants, Repel Calamity, etc.). Add Repel Calamity as a regression-test row.
---

## Reptilian Recruiter  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Lizard Warrior
**Mana cost:** {3}{R}{R}

**Oracle text:**

```
Trample
When this creature enters, choose target creature. If that creature's power is 2 or less or if you control another Lizard, gain control of that creature until end of turn, untap it, and it gains haste until end of turn.
```

**Current tags:** `condition.cares_tribe.lizard`, `effect.control_change`, `effect.grants_haste`, `effect.has_trample`, `trigger.self_etb`

### Issues

- **missing**: `effect.untap`
  - **What's wrong:** Card explicitly untaps the stolen creature ("…, untap it, …") but no untap tag fires.
  - **Evidence vs reality:** The phrase "untap it" inside a chained list satisfies the tagDef "Untaps a target permanent." The anaphoric "it" probably blocks a rule that requires `untap\s+target` form.
  - **Suggested fix:** Broaden `effect.untap` to admit `untap\s+(?:it|that\s+creature|each\s+of\s+them)` in addition to `untap\s+target`.
- **missing**: `condition.cares_low_power`
  - **What's wrong:** Card gates an effect on "that creature's power is 2 or less" — quintessential cares_low_power frame.
  - **Evidence vs reality:** "power is 2 or less" matches tagDef "Triggers, scales, or gates on creatures with power N or less (N <= 2)". Rule probably requires `power\s+\d\s+or\s+less` form without the intervening "is".
  - **Suggested fix:** Broaden `condition.cares_low_power` regex to admit `power\s+is\s+\d\s+or\s+less` frame.
---

## Rottenmouth Viper  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Elemental Snake
**Mana cost:** {5}{B}

**Oracle text:**

```
As an additional cost to cast this spell, you may sacrifice any number of nonland permanents. This spell costs {1} less to cast for each permanent sacrificed this way.
Whenever this creature enters or attacks, put a blight counter on it. Then for each blight counter on it, each opponent loses 4 life unless that player sacrifices a nonland permanent of their choice or discards a card.
```

**Current tags:** `effect.cost_reduction`, `effect.counter_modified`, `effect.life_changed`, `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **missing**: `effect.sacrifice_permanent`
  - **What's wrong:** Card explicitly has "you may sacrifice any number of nonland permanents" as additional cost.
  - **Evidence vs reality:** "you may sacrifice any number of nonland permanents" matches the tagDef "Sacrifices a permanent without type restriction." Rule likely requires `sacrifice\s+a\s+permanent` and misses the `nonland\s+permanents` and `any\s+number\s+of\s+permanents` frames.
  - **Suggested fix:** Broaden `effect.sacrifice_permanent` to admit `sacrifice\s+(?:any\s+number\s+of\s+)?(?:nonland\s+)?permanents?`.
- **missing**: `effect.edict`
  - **What's wrong:** "Each opponent loses 4 life unless that player sacrifices a nonland permanent of their choice" forces opponent sacrifice — classic edict frame.
  - **Evidence vs reality:** "unless that player sacrifices a nonland permanent" satisfies tagDef "Forces an opponent (or each player) to sacrifice a creature or permanent". The "unless" / "or" construction (lose-or-sac) probably blocks the rule.
  - **Suggested fix:** Broaden `effect.edict` to admit the `unless that player sacrifices` frame in addition to the canonical `target opponent sacrifices` / `each opponent sacrifices` forms.
---

## Run Away Together  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {1}{U}

**Oracle text:**

```
Choose two target creatures controlled by different players. Return those creatures to their owners' hands.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.bounce_creature`
  - **What's wrong:** Card bounces two creatures to hand, but no bounce_creature tag fires.
  - **Evidence vs reality:** "Return those creatures to their owners' hands" — anaphoric "those creatures" frame. tagDef: "Returns a creature to hand". The rule probably anchors on "return target creature" / "return target nonland permanent" but misses the bulk plural variant "Choose N target creatures … Return those creatures to their owners' hands."
  - **Suggested fix:** Broaden `effect.bounce_creature` to admit the `Choose .* target creatures\b .* Return those creatures` two-clause frame, or the simpler post-target anaphoric `Return those creatures to (?:their owners'|its owner's) hand` form.
---

## Rust-Shield Rampager  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Raccoon Warrior
**Mana cost:** {3}{G}

**Oracle text:**

```
Offspring {2} (You may pay an additional {2} as you cast this spell. If you do, when this creature enters, create a 1/1 token copy of it.)
This creature can't be blocked by creatures with power 2 or less.
```

**Current tags:** `effect.has_offspring`, `effect.partial_unblockable`

### Issues

- **missing**: `condition.cares_low_power`
  - **What's wrong:** Card references creatures with "power 2 or less" — exact low-power gate frame — but no cares_low_power tag fires.
  - **Evidence vs reality:** "power 2 or less" satisfies the tagDef "creatures with power N or less (N <= 2)". Likely the rule scopes only to "you control" / "target" power-gates and doesn't recognize "can't be blocked by creatures with power N or less" as an axis reference.
  - **Suggested fix:** Broaden `condition.cares_low_power` to admit the `creatures with power \d or less` bare frame regardless of "you control" vs blocker-restriction context. Add Rust-Shield Rampager as a regression-test row.
---

## Salvation Swan  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Bird Cleric
**Mana cost:** {3}{W}

**Oracle text:**

```
Flash
Flying
Whenever this creature or another Bird you control enters, exile up to one target creature you control without flying. Return it to the battlefield under its owner's control with a flying counter on it at the beginning of the next end step.
```

**Current tags:** `condition.cares_tribe.bird`, `effect.bounce_creature`, `effect.has_flash`, `effect.has_flying`, `trigger.another_creature_etb`, `trigger.beginning_of_end_step`, `trigger.self_etb`

### Issues

- **missing**: `effect.exile_creature`
  - **What's wrong:** Card exiles a creature (then returns it). The bounce_creature tag fires on the combined exile-and-return frame, but the standalone exile_creature is also a valid axis (this is exile from battlefield, even if temporary).
  - **Evidence vs reality:** "exile up to one target creature you control without flying" matches tagDef "Exiles a target creature from the battlefield, including replacement effects that exile instead of die." The "up to one" determiner probably blocks a rule that requires `exile\s+target\s+creature`.
  - **Suggested fix:** Broaden `effect.exile_creature` to admit `exile\s+(?:up\s+to\s+(?:one|N|\d+|X)\s+)?target\s+creature` so flicker effects with the "up to one" variant still tag.
- **missing**: `effect.counter_modified`
  - **What's wrong:** Card returns a creature "with a flying counter on it" but no counter_modified tag fires (this is the same ETB-with-counter frame as Parting Gust above).
  - **Suggested fix:** Same fix as Parting Gust — broaden counter_modified to admit ETB-with-counter frame.
---

## Scavenger's Talent  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment — Class
**Mana cost:** {B}

**Oracle text:**

```
(Gain the next level as a sorcery to add its ability.)
Whenever one or more creatures you control die, create a Food token. This ability triggers only once each turn.
{1}{B}: Level 2
Whenever you sacrifice a permanent, target player mills two cards.
{2}{B}: Level 3
At the beginning of your end step, you may sacrifice three other nonland permanents. If you do, return a creature card from your graveyard to the battlefield with a finality counter on it.
```

**Current tags:** `effect.create_food`, `effect.create_token`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.mill`, `effect.reanimate`, `trigger.beginning_of_end_step`, `trigger.creature_dies`, `trigger.permanent_sacrificed`

### Issues

- **missing**: `effect.sacrifice_permanent`
  - **What's wrong:** Level 3 explicitly has "you may sacrifice three other nonland permanents" as cost. Same family as Rottenmouth Viper above.
  - **Suggested fix:** Same fix as Rottenmouth Viper — broaden `effect.sacrifice_permanent` to admit the `sacrifice\s+N\s+(?:other\s+)?(?:nonland\s+)?permanents?` frame.
- **missing**: `effect.counter_modified`
  - **What's wrong:** "Return a creature card from your graveyard to the battlefield with a finality counter on it" — ETB-with-counter frame, same as Parting Gust / Salvation Swan above.
  - **Suggested fix:** Same broadening as Parting Gust.
---

## Season of Gathering  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {4}{G}{G}

**Oracle text:**

```
Choose up to five {P} worth of modes. You may choose the same mode more than once.
{P} — Put a +1/+1 counter on a creature you control. It gains vigilance and trample until end of turn.
{P}{P} — Choose artifact or enchantment. Destroy all permanents of the chosen type.
{P}{P}{P} — Draw cards equal to the greatest power among creatures you control.
```

**Current tags:** `effect.board_wipe`, `effect.cast_noncreature_spell`, `effect.counter_modified`, `effect.destroy_artifact`, `effect.destroy_creature`, `effect.destroy_enchantment`, `effect.destroy_land`, `effect.destroy_permanent`, `effect.destroy_planeswalker`, `effect.draws_or_discards`, `effect.grants_trample`, `effect.grants_vigilance`, `effect.is_instant_or_sorcery`, `effect.plus_one_counter`

### Issues

- **false-positive**: `effect.destroy_creature`, `effect.destroy_planeswalker`, `effect.destroy_land`, `effect.destroy_permanent`
  - **What's wrong:** The mode says "Choose artifact or enchantment. Destroy all permanents of the chosen type." — the type-choice is restricted to {artifact, enchantment}; the spell can never destroy a creature, planeswalker, or land. Only `destroy_artifact` + `destroy_enchantment` should fire.
  - **Evidence vs reality:** All four false-positive tags cite evidence "destroy all permanents" — but the rule strips the qualifier "of the chosen type" without checking the adjacent "Choose <type-list>" gate. This is a generic "destroy all permanents" → typed expansion failure.
  - **Suggested fix:** When `effect.destroy_permanent` / `effect.board_wipe` matches "destroy all permanents of the chosen type" in proximity to "Choose <type-or-type>" (the modal-choice frame), restrict the typed-expansion to the actual chosen types, not the full {artifact, creature, enchantment, land, planeswalker} set. Practically: detect the `Choose (?:artifact|creature|enchantment|land|planeswalker)(?:\s+or\s+(?:artifact|creature|enchantment|land|planeswalker))*` antecedent and only emit those typed-destroy tags. Same problem will hit any future "destroy permanents of the chosen type" cards.
---

## Season of the Burrow  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {3}{W}{W}

**Oracle text:**

```
Choose up to five {P} worth of modes. You may choose the same mode more than once.
{P} — Create a 1/1 white Rabbit creature token.
{P}{P} — Exile target nonland permanent. Its controller draws a card.
{P}{P}{P} — Return target permanent card with mana value 3 or less from your graveyard to the battlefield with an indestructible counter on it.
```

**Current tags:** `condition.cares_low_mana_value`, `effect.cast_noncreature_spell`, `effect.create_creature_token`, `effect.create_token`, `effect.exile_artifact`, `effect.exile_creature`, `effect.exile_enchantment`, `effect.exile_from_battlefield`, `effect.exile_planeswalker`, `effect.is_instant_or_sorcery`, `effect.reanimate`, `effect.exile_land`

### Issues

- **false-positive**: `effect.exile_land`
  - **What's wrong:** Card explicitly says "exile target **nonland** permanent" — the typed-expansion incorrectly includes land. Other typed exile tags (creature, artifact, enchantment, planeswalker) are correct.
  - **Evidence vs reality:** Evidence is "exile target nonland permanent". The tagDef "Exiles a target land from the battlefield" is contradicted by the "nonland" qualifier.
  - **Suggested fix:** In the typed-expansion / nonland-handling logic, when "exile target nonland permanent" matches, emit all typed-exile children EXCEPT `effect.exile_land`. Mirror the existing `destroy target nonland permanent` handling if one exists; otherwise add this case. Same bug shape may exist for destroy_land on similar "nonland" frames — worth a sweep.
- **missing**: `effect.draws_or_discards`
  - **What's wrong:** "Its controller draws a card" — third-party-draw frame; same Mind Spiral issue.
  - **Suggested fix:** Same as Mind Spiral — broaden draws_or_discards to admit `(?:its\s+controller|target\s+player|that\s+player)\s+draws`.
- **missing**: `effect.counter_modified`
  - **What's wrong:** "with an indestructible counter on it" — ETB-with-counter frame, same as Parting Gust.
  - **Suggested fix:** Same broadening as Parting Gust.
---

## Season of Weaving  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {4}{U}{U}

**Oracle text:**

```
Choose up to five {P} worth of modes. You may choose the same mode more than once.
{P} — Draw a card.
{P}{P} — Choose an artifact or creature you control. Create a token that's a copy of it.
{P}{P}{P} — Return each nonland, nontoken permanent to its owner's hand.
```

**Current tags:** `condition.cares_artifacts`, `effect.cast_noncreature_spell`, `effect.copy_permanent_token`, `effect.create_creature_token`, `effect.create_token`, `effect.draws_or_discards`, `effect.is_instant_or_sorcery`

### Issues

- **false-positive**: `effect.create_creature_token`
  - **What's wrong:** Token copies an "artifact or creature you control" — if the player chooses an artifact, the copy is not a creature token. The tag fires unconditionally.
  - **Evidence vs reality:** Evidence is "create a token that's a copy of it" but the antecedent is artifact OR creature (modal); copy_permanent_token correctly captures the polymorphism. The create_creature_token tag overcommits to creature semantics.
  - **Suggested fix:** When the copied-permanent antecedent is "<type1> or <type2> you control" where neither is necessarily a creature, suppress create_creature_token unless one of the antecedent types is creature-only. (For modal "artifact or creature", the token IS sometimes a creature — so this is fuzzy. A safer suggestion: don't fire create_creature_token on `create a token that's a copy of` when the antecedent isn't strictly "creature".)
- **missing**: `effect.bounce_creature`, `effect.bounce_artifact`, `effect.bounce_enchantment`, `effect.bounce_planeswalker`
  - **What's wrong:** Mode 3 is mass bounce: "Return each nonland, nontoken permanent to its owner's hand." No bounce-axis tags fire.
  - **Evidence vs reality:** "Return each nonland, nontoken permanent" matches "Returns a {type} to hand" for all non-land permanent types. The "each" determiner and the "nonland, nontoken" qualifier probably block rules that expect `target <type>`.
  - **Suggested fix:** Broaden `effect.bounce_*` typed rules to admit the mass form `return each (?:nonland,?\s*)?(?:nontoken,?\s*)?permanent to its owner's hand` and expand to all permanent types (excluding land when "nonland" is present). Mirror Season-of-the-Burrow's nonland-aware typed-exile suggestion.
---

## Skyskipper Duo  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Bird Frog
**Mana cost:** {4}{U}

**Oracle text:**

```
Flying
When this creature enters, exile up to one other target creature you control. Return it to the battlefield under its owner's control at the beginning of the next end step.
```

**Current tags:** `effect.bounce_creature`, `effect.has_flying`, `trigger.beginning_of_end_step`, `trigger.self_etb`

### Issues

- **missing**: `effect.exile_creature`
  - **What's wrong:** Same as Salvation Swan — "exile up to one other target creature" is exile-from-battlefield, but the "up to one" determiner blocks the rule.
  - **Suggested fix:** Same broadening as Salvation Swan.
---

## Star Charter  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Bat Cleric
**Mana cost:** {3}{W}

**Oracle text:**

```
Flying
At the beginning of your end step, if you gained or lost life this turn, look at the top four cards of your library. You may reveal a creature card with power 3 or less from among them and put it into your hand. Put the rest on the bottom of your library in a random order.
```

**Current tags:** `condition.cares_lifeloss`, `effect.has_flying`, `effect.look_at_top_n`, `trigger.beginning_of_end_step`

### Issues

- **missing**: `condition.cares_lifegain` (same as Moonstone Harbinger above)
  - **What's wrong:** Gate is "if you gained or lost life this turn" — the lifegain half doesn't match.
  - **Suggested fix:** Same fix as Moonstone Harbinger — broaden cares_lifegain to admit the disjunctive `gain(?:ed)?\s+or\s+los(?:t|e)\s+life` form.
---

## Starfall Invocation  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {3}{W}{W}

**Oracle text:**

```
Gift a card (You may promise an opponent a gift as you cast this spell. If you do, they draw a card before its other effects.)
Destroy all creatures. If the gift was promised, return a creature card put into your graveyard this way to the battlefield under your control.
```

**Current tags:** `condition.gift_promised`, `effect.board_wipe`, `effect.cast_noncreature_spell`, `effect.destroy_creature`, `effect.has_gift`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.reanimate`
  - **What's wrong:** Card returns a creature card from graveyard to the battlefield (under your control), but reanimate doesn't fire.
  - **Evidence vs reality:** "Return a creature card put into your graveyard this way to the battlefield under your control" — exactly reanimate. The "put into your graveyard this way" qualifier (referring to the cards killed by the wipe) probably blocks a rule that requires `return\s+(?:target\s+)?creature\s+card\s+from\s+your\s+graveyard`.
  - **Suggested fix:** Broaden `effect.reanimate` to admit `return\s+a?\s*creature card\s+put into (?:your|a)\s+graveyard this way` (wipe-then-recur frame). Add Starfall Invocation as a regression-test row.
---

## Stargaze  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {X}{B}{B}

**Oracle text:**

```
Look at twice X cards from the top of your library. Put X cards from among them into your hand and the rest into your graveyard. You lose X life.
```

**Current tags:** `condition.has_x_in_cost`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.life_changed`, `effect.mill`

### Issues

- **missing**: `effect.look_at_top_n`
  - **What's wrong:** Card explicitly says "Look at twice X cards from the top of your library" — exact look-at frame, but no tag fires.
  - **Evidence vs reality:** The phrase "Look at twice X cards from the top of your library" matches the tagDef "Reveals or looks at the top N cards of a library." The "twice X" arithmetic determiner probably blocks a rule that requires `top\s+(?:\d+|N|X|a)\s+cards?`.
  - **Suggested fix:** Broaden `effect.look_at_top_n` to admit multi-token quantifiers like `twice\s+X`, `two times X`, etc. The simplest fix: match `Look at .{0,30} cards? from the top of` rather than anchoring on the specific count.
---

## Stocking the Pantry  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment
**Mana cost:** {G}

**Oracle text:**

```
Whenever you put one or more +1/+1 counters on a creature you control, put a supply counter on this enchantment.
{2}, Remove a supply counter from this enchantment: Draw a card.
```

**Current tags:** `effect.counter_modified`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`

### Issues

- **missing**: `trigger.counter_changed`
  - **What's wrong:** Trigger fires on placing +1/+1 counters — quintessential counter-changed trigger frame.
  - **Evidence vs reality:** "Whenever you put one or more +1/+1 counters on a creature you control" matches tagDef "Triggers when counters are placed on or removed from a permanent." Rule probably scopes to a different frame (e.g. "whenever a counter is placed" / "whenever ~ gets a counter") and misses the controller-active "whenever you put" form.
  - **Suggested fix:** Broaden `trigger.counter_changed` to admit `whenever you put (?:one or more )?\+?\d?/\+?\d?\s+counters?\s+on` frame.
- **missing**: `condition.cares_plus_one_counter`
  - **What's wrong:** Trigger condition is the +1/+1-counter-placement axis — Stocking the Pantry is a +1/+1-counter payoff card.
  - **Evidence vs reality:** The card's whole engine cares about you putting +1/+1 counters on your creatures. tagDef "Has an effect or trigger that checks whether a creature has a +1/+1 counter" — the rule probably anchors on "with a +1/+1 counter" presence-check phrasing and misses the "whenever you put +1/+1 counter" placement-trigger.
  - **Suggested fix:** Broaden `condition.cares_plus_one_counter` to also fire on the "whenever you put +1/+1 counter" placement frame, or alternatively introduce a separate `condition.cares_counter_placement` tag and link the two via pairsWith.
---

## Sugar Coat  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment — Aura
**Mana cost:** {2}{U}

**Oracle text:**

```
Flash
Enchant creature or Food
Enchanted permanent is a colorless Food artifact with "{2}, {T}, Sacrifice this artifact: You gain 3 life" and loses all other card types and abilities.
```

**Current tags:** `condition.cares_subtype.food`, `effect.has_flash`

### Issues

- **missing**: `effect.loses_abilities`
  - **What's wrong:** Aura makes the enchanted permanent "lose all other card types and abilities" — exact loses_abilities frame.
  - **Evidence vs reality:** "Loses all other card types and abilities" matches tagDef "Causes a permanent (or all of a category) to lose all abilities — silencer removal that neutralizes activated/triggered". The "and types" addendum and the "other" qualifier probably block the rule.
  - **Suggested fix:** Broaden `effect.loses_abilities` to admit `loses?\s+all\s+(?:other\s+)?(?:card\s+types\s+and\s+)?abilities` (the Aura-transform / soulshift template).
- **missing**: `effect.pacify`
  - **What's wrong:** By losing all card types (including creature) and abilities, the enchanted permanent can no longer attack or block — functionally a pacify effect.
  - **Evidence vs reality:** tagDef says "Prevents a creature from attacking/blocking" — Sugar Coat achieves this by removing creature-type, but the rule looks for literal "can't attack or block" phrasing. This is a deeper semantic miss; logging for awareness, not necessarily an easy regex fix.
  - **Suggested fix:** Either explicitly list the "becomes [non-creature] / loses all abilities" Aura-removal frame in `effect.pacify`'s regex (it's a narrow set: Sugar Coat, Song of the Dryads, Witness Protection, etc.), or accept it as a coverage gap and add a sibling tag `effect.becomes_inert_permanent` for this family.
---

## Sword of Vengeance  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Artifact — Equipment
**Mana cost:** {3}

**Oracle text:**

```
Equipped creature gets +2/+0 and has first strike, vigilance, trample, and haste.
Equip {3}
```

**Current tags:** `effect.grants_first_strike`, `effect.grants_stat_buff`, `effect.grants_trample`, `effect.grants_vigilance`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`

### Issues

- **missing**: `effect.grants_haste`
  - **What's wrong:** Granted keyword list includes haste — "and has first strike, vigilance, trample, and haste" — but only the first three grants fire.
  - **Evidence vs reality:** The other three grant tags (first strike, vigilance, trample) all matched on this same line; only the tail keyword "haste" was missed. Almost certainly the grants_haste rule anchors on `has\s+haste` only and doesn't admit position-N-in-a-list "..., and haste" form.
  - **Suggested fix:** Broaden `effect.grants_haste` to match haste anywhere inside a `has\s+(?:[\w'-]+(?:,\s+|,?\s+and\s+))*haste` keyword-list frame, matching how the sibling grants_* tags handled vigilance/trample at non-first positions. Verify the same fix isn't needed on the other grants_* rules.
---

## Tender Wildguide  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Possum Druid
**Mana cost:** {1}{G}

**Oracle text:**

```
Offspring {2} (You may pay an additional {2} as you cast this spell. If you do, when this creature enters, create a 1/1 token copy of it.)
{T}: Add one mana of any color.
{T}: Put a +1/+1 counter on this creature.
```

**Current tags:** `effect.add_mana`, `effect.counter_modified`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.has_offspring`, `effect.plus_one_counter`, `effect.ramp_nonland`

### Issues

- **false-positive**: `effect.has_mana_activated_ability`
  - **What's wrong:** Both activated abilities are `{T}:` only — no mana cost. The tag fires only because the Offspring keyword's "{2}" cost is adjacent to the next line's `{T}:`, and the regex matches "{2} {t}:" across the line boundary.
  - **Evidence vs reality:** Evidence is "{2} {t}:" — but the "{2}" belongs to "Offspring {2}", which is an alternative-cast keyword cost, NOT an activated-ability cost. The card's two activated abilities are both `{T}:` (tap-only); neither is reducible by Training-Grounds-style effects.
  - **Suggested fix:** Add a line-boundary anchor or exclusion to `effect.has_mana_activated_ability` so it does not match across newline / sentence-boundary. Or better: only match when the preceding mana symbols are immediately followed by `,? \{T\}:` on the same logical ability line. Same risk applies to any keyword with a numeric cost (Bargain, Multikicker, Buyback) adjacent to a `{T}:` activation.
---

## The Infamous Cruelclaw  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Weasel Mercenary
**Mana cost:** {1}{B}{R}

**Oracle text:**

```
Menace
Whenever The Infamous Cruelclaw deals combat damage to a player, exile cards from the top of your library until you exile a nonland card. You may cast that card by discarding a card rather than paying its mana cost.
```

**Current tags:** `effect.has_menace`, `trigger.damage_dealt`

### Issues

- **missing**: `effect.exile_from_library`
  - **What's wrong:** "exile cards from the top of your library" matches the canonical exile-from-library frame.
  - **Suggested fix:** Likely the "until you exile a nonland card" qualifier is breaking match. Broaden to admit `exile\s+cards?\s+from\s+the\s+top\s+of\s+your\s+library` even when followed by an `until` clause.
- **missing**: `effect.cast_from_exile`
  - **What's wrong:** "You may cast that card" where "that card" is the just-exiled card.
  - **Suggested fix:** Same anaphoric "this/that card" cast frame discussed under Osteomancer Adept — but in the inverse direction. Here the anaphor IS pointing to an exiled card, so the tag SHOULD fire. Ensure the rule handles the form `exile cards … until you exile a … card. You may cast that card`.
- **missing**: `effect.cast_for_free`
  - **What's wrong:** "by discarding a card rather than paying its mana cost" — alternative-cost cast that bypasses the printed mana cost.
  - **Evidence vs reality:** Description: "Casts an exiled or revealed card without paying its mana cost." The "by discarding a card" addendum is the substitute cost; the rule probably anchors on the bare `without paying its mana cost` frame and misses the `by\s+\w+ing\s+.* rather than paying its mana cost` variant.
  - **Suggested fix:** Broaden `effect.cast_for_free` to admit `by\s+(?:\w+ing|\w+ing\s+\w+\s+)?(?:.{0,40})\s+rather\s+than\s+paying\s+its\s+mana\s+cost`.
- **missing**: `effect.draws_or_discards`
  - **What's wrong:** "by discarding a card" — discard is part of the alternative cost; draws_or_discards should fire.
  - **Suggested fix:** Broaden to admit `by discarding (?:a|N|X|one or more) cards?` as alternative-cost frame (also seen on flashback-from-graveyard / madness / etc.).
# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

The v0.20.0 batch (27 cards, 23 ships + 5 rejects + 1 defer) cleared the previous queue. See `CARD_ISSUES_RESOLVED.md` § "v0.20.0 batch" for the shipped fixes and the rejected-with-reason list.


---

# v0.20.0 audit batch (audited 2026-05-31)

Processed 100 cards; 45 issues logged. 22 fixes shipped (G2-G5, G7-G16, G21 partial, G23, G24, G26-G28, G30-G32). 4 no-op verifications (G6, G11, G29, G33). Deferred: G1 (needs new parametric `effect.tutors_tribe.*`), G17-G20 (anaphoric self-buff strip needs structural rewrite), G22/G25 (granted-quote scope reversal — Kitesail precedent). Coverage gaps (separate new-rule batch): condition.delirium, condition.survival + trigger.second_main_phase, condition.eerie + trigger.door_unlocked, effect.alternate_win_condition, effect.tutors_subtype.room, condition.cares_subtype.room, effect.has_changeling, effect.has_convoke.

---

## Thornvault Forager  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Creature — Squirrel Ranger
**Mana cost:** {1}{G}

**Oracle text:**

```
{T}: Add {G}.
{T}, Forage: Add two mana in any combination of colors. (To forage, exile three cards from your graveyard or sacrifice a Food.)
{3}{G}, {T}: Search your library for a Squirrel card, reveal it, put it into your hand, then shuffle.
```

**Current tags:** `condition.cares_tribe.squirrel`, `effect.add_mana`, `effect.forage`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.ramp_nonland`

### Issues

- **missing**: `effect.tutors_creature`
  - **What's wrong:** Card searches library for a Squirrel card (a creature type), which is a creature tutor, but the tag isn't applied.
  - **Evidence vs reality:** Oracle says "Search your library for a Squirrel card, reveal it, put it into your hand" — Squirrel is a creature subtype, so this satisfies "Searches library for a creature card (any creature — not subtype-restricted)".
  - **Suggested fix:** Broaden `effect.tutors_creature` regex to match "search your library for a <tribe-name> card" patterns where the tribe is a creature type (or add a generic creature-tutor handler that recognizes tribal tutor patterns).

---

## Thought-Stalker Warlock  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Creature — Lizard Warlock
**Mana cost:** {2}{B}

**Oracle text:**

```
Menace (This creature can't be blocked except by two or more creatures.)
When this creature enters, choose target opponent. If they lost life this turn, they reveal their hand, you choose a nonland card from it, and they discard that card. Otherwise, they discard a card.
```

**Current tags:** `condition.cares_lifeloss`, `effect.has_menace`, `trigger.self_etb`

### Issues

- **missing**: `effect.targeted_discard`
  - **What's wrong:** Card forces a target opponent to discard a card (both branches of the if/otherwise resolve to opponent discarding), which is the canonical targeted-discard / hand-attack pattern.
  - **Evidence vs reality:** "choose target opponent. If they lost life this turn, ... they discard that card. Otherwise, they discard a card." Both branches force a chosen opponent to discard.
  - **Suggested fix:** Ensure `effect.targeted_discard` matches "target opponent ... they discard" templating (without requiring "discards a card of their choice" or explicit ".../they discard a card" adjacency).

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** "they discard a card" is a discard effect; the broader draws-or-discards tag is missing.
  - **Evidence vs reality:** Oracle text contains "discard that card" and "discard a card" — clean matches for the discard half of the axis.
  - **Suggested fix:** Confirm `effect.draws_or_discards` regex includes opponent-discard frames (not just self-loot).

---

## Thundertrap Trainer  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Creature — Otter Wizard
**Mana cost:** {1}{U}

**Oracle text:**

```
Offspring {4} (You may pay an additional {4} as you cast this spell. If you do, when this creature enters, create a 1/1 token copy of it.)
When this creature enters, look at the top four cards of your library. You may reveal a noncreature, nonland card from among them and put it into your hand. Put the rest on the bottom of your library in a random order.
```

**Current tags:** `effect.has_offspring`, `effect.look_at_top_n`, `trigger.self_etb`

### Issues

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** Card puts a revealed card from the top of library into hand — that's card advantage / card selection, equivalent to drawing. While not literally "draw a card", the impulse-card-selection family is currently mapped to `effect.draws_or_discards` for similar cards in the catalog.
  - **Evidence vs reality:** "You may reveal a noncreature, nonland card from among them and put it into your hand." This is functionally a conditional draw.
  - **Suggested fix:** Verify how similar look-at-top-N-and-put-into-hand cards are tagged across the catalog; if they get `effect.draws_or_discards`, broaden this rule, otherwise this is a coverage gap and a new tag (e.g. `effect.card_selection` or `effect.impulse_to_hand`) may be appropriate. Low priority — flag only.

---

## Three Tree Mascot  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Artifact Creature — Shapeshifter
**Mana cost:** {2}

**Oracle text:**

```
Changeling (This card is every creature type.)
{1}: Add one mana of any color. Activate only once each turn.
```

**Current tags:** `effect.add_mana`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.ramp_nonland`

### Issues

- **missing: no `effect.has_changeling` exists**
  - **What's wrong:** Changeling is a printed evergreen keyword that makes the card every creature type — relevant for tribal synergies. No catalog tag covers it.
  - **Evidence vs reality:** Oracle text starts with "Changeling" — clear keyword grant on the card itself.
  - **Suggested fix:** Add `effect.has_changeling` (sibling to the `effect.has_<kw>` family) so tribal decks can detect this card as a member of any tribe via the graph.

---

## Valley Flamecaller  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Creature — Lizard Warlock
**Mana cost:** {2}{R}

**Oracle text:**

```
If a Lizard, Mouse, Otter, or Raccoon you control would deal damage to a permanent or player, it deals that much damage plus 1 instead.
```

**Current tags:** `condition.cares_tribe.lizard`, `condition.cares_tribe.mouse`, `condition.cares_tribe.otter`, `condition.cares_tribe.raccoon`, `effect.deals_damage`

### Issues

- **false-positive**: `effect.deals_damage`
  - **What's wrong:** Valley Flamecaller does not itself deal damage — it is a replacement effect that increments the damage dealt by OTHER creatures (Lizard/Mouse/Otter/Raccoon you control). The "it deals that much damage plus 1" clause is the result of the replacement applied to a different source.
  - **Evidence vs reality:** evidence was `"it deals that much damage"`, but the antecedent of "it" is "a Lizard, Mouse, Otter, or Raccoon you control" — a third party, not the card itself. The tagDef should reserve "deals damage" for cards that are the damage source.
  - **Suggested fix:** Narrow `effect.deals_damage` to exclude "would deal damage... it deals that much damage plus N instead" replacement frames; route those to `effect.amplifies_damage_or_lifeloss` instead (and broaden that tag's regex to cover "+N" increments, not just doubling).

- **missing: no clean tag for damage-incrementing replacement (+N, not double)**
  - **What's wrong:** `effect.amplifies_damage_or_lifeloss` description specifies "doubles damage" — but Valley Flamecaller adds +1 instead of doubling. There's no catalog tag that matches Torbran-style "+N damage" replacements.
  - **Suggested fix:** Broaden `effect.amplifies_damage_or_lifeloss` description and regex to cover the "+N instead" Torbran/Furnace-of-Rath family (not just outright doubling), OR add a separate `effect.increments_damage` tag.

---

## Valley Floodcaller  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Creature — Otter Wizard
**Mana cost:** {1}{U}{B}

**Oracle text:**

```
Flash
You may cast noncreature spells as though they had flash.
Whenever you cast a noncreature spell, Birds, Frogs, Otters, and Rats you control get +1/+1 until end of turn. Untap them.
```

**Current tags:** `condition.cares_noncreature_spell`, `condition.cares_tribe.bird`, `condition.cares_tribe.frog`, `condition.cares_tribe.otter`, `condition.cares_tribe.rat`, `effect.grants_stat_buff`, `effect.has_flash`, `trigger.spell_cast`

### Issues

- **missing**: `effect.untap`
  - **What's wrong:** Card explicitly untaps a group of creatures as part of the trigger payoff — "Untap them" — but `effect.untap` is not applied.
  - **Evidence vs reality:** Oracle text contains the literal verb "Untap them." referring to the tribal creatures buffed above.
  - **Suggested fix:** Broaden `effect.untap` regex to match "untap them" / "untap <group>" frames, not only "untap target <permanent>".

---

## Valley Mightcaller  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Creature — Frog Warrior
**Mana cost:** {G}

**Oracle text:**

```
Trample
Whenever another Frog, Rabbit, Raccoon, or Squirrel you control enters, put a +1/+1 counter on this creature.
```

**Current tags:** `condition.cares_tribe.frog`, `condition.cares_tribe.rabbit`, `condition.cares_tribe.raccoon`, `condition.cares_tribe.squirrel`, `effect.counter_modified`, `effect.has_trample`, `effect.plus_one_counter`

### Issues

- **missing**: `trigger.another_creature_etb`
  - **What's wrong:** Card has an ETB-of-other-creature trigger ("Whenever another Frog, Rabbit, Raccoon, or Squirrel you control enters") that gives this creature a +1/+1 counter — exactly the another-creature-ETB pattern, with a tribal filter.
  - **Evidence vs reality:** "Whenever another Frog, Rabbit, Raccoon, or Squirrel you control enters" — explicit "another ... enters" templating.
  - **Suggested fix:** Broaden `trigger.another_creature_etb` regex to match "whenever another <tribe-list> you control enters" patterns (tribal-filtered another-ETB triggers).

---

## Valley Questcaller  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Creature — Rabbit Warrior
**Mana cost:** {1}{W}

**Oracle text:**

```
Whenever one or more other Rabbits, Bats, Birds, and/or Mice you control enter, scry 1.
Other Rabbits, Bats, Birds, and Mice you control get +1/+1.
```

**Current tags:** `condition.cares_tribe.bat`, `condition.cares_tribe.bird`, `condition.cares_tribe.mouse`, `condition.cares_tribe.rabbit`, `effect.grants_stat_buff`, `effect.scry`

### Issues

- **missing**: `trigger.another_creature_etb`
  - **What's wrong:** Card has an ETB-of-other-creature trigger ("Whenever one or more other Rabbits, Bats, Birds, and/or Mice you control enter, scry 1") gated on tribal types — a clear another-creature-ETB trigger.
  - **Evidence vs reality:** "Whenever one or more other Rabbits, Bats, Birds, and/or Mice you control enter" — explicit "one or more other ... enter" templating.
  - **Suggested fix:** Broaden `trigger.another_creature_etb` regex to match "whenever one or more other <tribe-list> you control enter" patterns.

---

## Valley Rally  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Instant
**Mana cost:** {2}{R}

**Oracle text:**

```
Gift a Food (You may promise an opponent a gift as you cast this spell. If you do, they create a Food token before its other effects. It's an artifact with "{2}, {T}, Sacrifice this token: You gain 3 life.")
Creatures you control get +2/+0 until end of turn. If the gift was promised, target creature you control gains first strike until end of turn.
```

**Current tags:** `condition.cares_subtype.food`, `condition.gift_promised`, `effect.cast_noncreature_spell`, `effect.grants_first_strike`, `effect.grants_stat_buff`, `effect.has_gift`, `effect.is_instant_or_sorcery`

### Issues

- **false-positive**: `condition.cares_subtype.food`
  - **What's wrong:** The "Food" token-name appears only as the Gift token-type given to the opponent — this card does not synergize with Food-matters payoffs (it doesn't care about Food cards you control or trigger off Foods existing). Tagging it as Food-caring will mislead deck-builders looking for Food synergies.
  - **Evidence vs reality:** evidence was `"food"`, but the only Food reference is the Gift-token type ("Gift a Food") given to the opponent; the card itself does not consume or interact with Food as a payoff.
  - **Suggested fix:** Narrow `condition.cares_subtype.food` to exclude "Gift a Food" Gift-keyword token-grants (and similar token-creation contexts where the subtype is just the created token's type, not a payoff reference).

---

## Veteran Guardmouse  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Creature — Mouse Soldier
**Mana cost:** {3}{R/W}

**Oracle text:**

```
Valiant — Whenever this creature becomes the target of a spell or ability you control for the first time each turn, it gets +1/+0 and gains first strike until end of turn. Scry 1. (Look at the top card of your library. You may put that card on the bottom.)
```

**Current tags:** `condition.valiant`, `effect.grants_stat_buff`, `effect.scry`

### Issues

- **missing**: `effect.grants_first_strike`
  - **What's wrong:** Card grants first strike to itself on the Valiant trigger but the keyword-grant tag is not applied.
  - **Evidence vs reality:** "it gets +1/+0 and gains first strike until end of turn" — explicit "gains first strike" keyword-grant frame.
  - **Suggested fix:** Broaden `effect.grants_first_strike` to match "it gains first strike" anaphoric (self-target) grants under Valiant / similar trigger frames. (Per the recurring "anaphoric 'it gains <kw>'" note in the audit playbook, this is a known fix family.)

---

## Vren, the Relentless  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Legendary Creature — Rat Rogue
**Mana cost:** {2}{U}{B}

**Oracle text:**

```
Ward {2}
If a creature an opponent controls would die, exile it instead.
At the beginning of each end step, create X 1/1 black Rat creature tokens with "This token gets +1/+1 for each other Rat you control," where X is the number of creatures that were exiled under your opponents' control this turn.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.exile_creature`, `effect.has_ward`, `trigger.beginning_of_end_step`

### Issues

- **missing**: `condition.cares_tribe.rat`
  - **What's wrong:** Token's printed ability references "each other Rat you control" — a tribal scaling reference on Rats — but no cares_tribe.rat fires.
  - **Evidence vs reality:** oracle text contains `"This token gets +1/+1 for each other Rat you control"`; cares_tribe.rat description is "References the Rat creature type." The rule did not pick up the quoted-token-text reference.
  - **Suggested fix:** broaden cares_tribe.rat to match the "for each other Rat you control" frame inside quoted token text, or set effect.create_creature_token metadata.creatureTypes to ["Rat"] so the tribal pairing is auto-gated.

---

## Wax-Wane Witness  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Creature — Bat Cleric
**Mana cost:** {3}{W}

**Oracle text:**

```
Flying, vigilance
Whenever you gain or lose life during your turn, this creature gets +1/+0 until end of turn.
```

**Current tags:** `condition.cares_lifeloss`, `effect.grants_stat_buff`, `effect.has_flying`, `effect.has_vigilance`

### Issues

- **missing**: `condition.cares_lifegain`
  - **What's wrong:** Card triggers on "gain or lose life" but only the lifeloss half fires; lifegain side is unmatched.
  - **Evidence vs reality:** oracle text says "Whenever you gain or lose life during your turn"; description of cares_lifegain is "Triggers or scales off life being gained." The disjunction matches both halves.
  - **Suggested fix:** broaden cares_lifegain regex to catch "gain or lose life" disjunctive frame.

- **missing**: `trigger.life_changed`
  - **What's wrong:** Card has a unified gain-or-lose-life trigger; the dedicated trigger.life_changed tag (described as "Triggers when a player gains or loses life") should fire.
  - **Evidence vs reality:** "Whenever you gain or lose life during your turn" matches trigger.life_changed's exact description, but the rule did not pick it up.
  - **Suggested fix:** broaden trigger.life_changed regex to match the "gain or lose life" disjunctive form.

---

## Wishing Well  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Artifact
**Mana cost:** {3}{U}

**Oracle text:**

```
{T}: Put a coin counter on this artifact. When you do, you may cast target instant or sorcery card with mana value equal to the number of coin counters on this artifact from your graveyard without paying its mana cost. If that spell would be put into your graveyard, exile it instead. Activate only as a sorcery.
```

**Current tags:** `condition.cares_graveyard`, `condition.cares_instant_sorcery_in_graveyard`, `effect.counter_modified`, `effect.has_activated_ability`

### Issues

- **missing**: `effect.cast_for_free`
  - **What's wrong:** Card explicitly casts a card "without paying its mana cost" — the canonical cast-for-free phrasing — but the tag did not fire.
  - **Evidence vs reality:** oracle text contains "cast target instant or sorcery card ... without paying its mana cost"; effect.cast_for_free is described as "Casts an exiled or revealed card without paying its mana cost." (Cast-from-graveyard variant should also count toward this axis.)
  - **Suggested fix:** broaden cast_for_free regex to include the "from your graveyard ... without paying its mana cost" frame (not just exile/library casts).

---

## Ygra, Eater of All  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Legendary Creature — Elemental Cat
**Mana cost:** {3}{B}{G}

**Oracle text:**

```
Ward—Sacrifice a Food.
Other creatures are Food artifacts in addition to their other types and have "{2}, {T}, Sacrifice this permanent: You gain 3 life."
Whenever a Food is put into a graveyard from the battlefield, put two +1/+1 counters on Ygra.
```

**Current tags:** `condition.cares_subtype.food`, `effect.counter_modified`, `effect.has_ward`, `effect.plus_one_counter`, `trigger.artifact_leaves_battlefield`

### Issues

- **missing**: `effect.life_changed`
  - **What's wrong:** Granted activated ability "you gain 3 life" is a clear life-gain effect (delivered through the granted ability on every other creature), but life_changed doesn't fire.
  - **Evidence vs reality:** oracle text says `you gain 3 life`; effect.life_changed description is "Causes a player to gain or lose life." Grant-frame quoted abilities should still count as the card emitting that effect.
  - **Suggested fix:** include "you gain N life" inside quoted granted-ability text when matching life_changed.

- **missing**: `effect.sacrifice_creature` (and/or `effect.sacrifice_artifact`)
  - **What's wrong:** The granted ability has "Sacrifice this permanent" as a cost on creatures-that-are-also-Food-artifacts; the typed sacrifice tags should fire as a consequence (the activated ability appears on every other creature you control).
  - **Evidence vs reality:** oracle has `Sacrifice this permanent`; the ward cost also includes `Sacrifice a Food` (artifact sacrifice). Neither sacrifice tag fires.
  - **Suggested fix:** broaden sacrifice_creature/sacrifice_artifact regexes to match the "Sacrifice a Food" Ward cost and the "Sacrifice this permanent" granted-ability cost. (Note: per the typed-sacrifice failure-pattern, granted-ability scope inside quoted text is currently unhandled.)

---

## Abhorrent Oculus  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Creature — Eye
**Mana cost:** {2}{U}

**Oracle text:**

```
As an additional cost to cast this spell, exile six cards from your graveyard.
Flying
At the beginning of each opponent's upkeep, manifest dread.
```

**Current tags:** `effect.cloak`, `effect.has_flying`, `trigger.upkeep`

### Issues

- **missing**: `effect.exile_from_graveyard`
  - **What's wrong:** "Exile six cards from your graveyard" is a clear graveyard-exile effect (here paid as an additional cost), but the tag did not fire.
  - **Evidence vs reality:** oracle text contains `exile six cards from your graveyard`; effect.exile_from_graveyard description is "Produces an effect that removes cards from a graveyard by exiling them. Excludes self-exile activation costs (Renew-style)." This is NOT self-exile — it exiles OTHER graveyard cards.
  - **Suggested fix:** broaden exile_from_graveyard regex to match the "exile N cards from your graveyard" additional/alternate cost frame (similar to how collect_evidence cost-form is matched).

---

## Acrobatic Cheerleader  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Creature — Human Survivor
**Mana cost:** {1}{W}

**Oracle text:**

```
Survival — At the beginning of your second main phase, if this creature is tapped, put a flying counter on it. This ability triggers only once.
```

**Current tags:** `effect.counter_modified`, `effect.grants_evasion`

### Issues

- **false-positive**: `effect.grants_evasion`
  - **What's wrong:** "Put a flying counter on it" gives flying to the card itself; grants_evasion is described as "Gives flying, menace, or intimidate to OTHER creatures or to tokens it creates." This is a self-keyword via counter, not anthem-style grants.
  - **Evidence vs reality:** evidence was `"put a flying counter"`; the antecedent of "it" is this creature itself. Self-evasion-via-counter should map to a `gains_flying_self`-style tag (or `has_flying` if treated as conditional intrinsic), not the "grants" axis.
  - **Suggested fix:** narrow grants_evasion to exclude "put a <evasion-kw> counter on it/this creature/self" frames; route those to a new self-evasion-via-counter tag.

- **missing**: `condition.survival` (coverage gap)
  - **What's wrong:** Card uses the Survival ability word (gates a second-main-phase ability on whether this creature is tapped); no catalog tag captures this Bloomburrow ability-word family.
  - **Evidence vs reality:** oracle text starts with `Survival —`; no condition.survival exists in the catalog (verified against the 273-tag dump).
  - **Suggested fix:** add a new `condition.survival` rule matching `^survival —` ability-word triggers (gated on this creature being tapped at the start of your second main phase). New rule.

- **missing**: trigger for "beginning of your second main phase" (coverage gap)
  - **What's wrong:** No trigger.* tag in the catalog covers "beginning of your second main phase." trigger.upkeep / beginning_of_combat / beginning_of_end_step exist but second-main-phase is a distinct timing.
  - **Evidence vs reality:** oracle text says `At the beginning of your second main phase`; no main-phase-trigger tag exists in the catalog (verified).
  - **Suggested fix:** consider adding `trigger.beginning_of_second_main` (or generalize the Bloomburrow Survival ability word into a single tag that subsumes it).

---

## A-Kona, Rescue Beastie  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Legendary Creature — Beast Survivor
**Mana cost:** {4}{G}

**Oracle text:**

```
Survival — At the beginning of your second main phase, if Kona is tapped, you may put a permanent card from your hand onto the battlefield.
```

**Current tags:** `(none)`

### Issues

- **missing**: `effect.cheat_into_play`
  - **What's wrong:** Card puts a permanent card from hand directly onto the battlefield without casting — the canonical cheat-into-play frame — but the tag did not fire.
  - **Evidence vs reality:** oracle text says `put a permanent card from your hand onto the battlefield`; cheat_into_play description covers library/top-N/exile sub-patterns but appears to miss "from your hand". The tagDef description's "from a zone OTHER than the graveyard" clause should include hand.
  - **Suggested fix:** broaden cheat_into_play regex to include the "from your hand ... onto the battlefield" frame (Birthing Ritual / Through the Breach family).

- **missing**: `condition.survival` (coverage gap, same family as Acrobatic Cheerleader)
  - **What's wrong:** Survival ability word — gates an ability on this creature being tapped at the start of your second main phase. No catalog tag covers this.
  - **Evidence vs reality:** oracle text starts with `Survival —`; no condition.survival exists in the catalog.
  - **Suggested fix:** add new `condition.survival` rule.

- **missing**: trigger for "beginning of your second main phase" (coverage gap, same as Acrobatic Cheerleader)
  - **What's wrong:** No main-phase trigger tag exists.
  - **Evidence vs reality:** `At the beginning of your second main phase` — not covered by trigger.upkeep / beginning_of_combat / beginning_of_end_step.
  - **Suggested fix:** add `trigger.beginning_of_second_main` (or fold into a Survival ability-word tag).


---

## Anthropede  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Insect
**Mana cost:** {3}{G}

**Oracle text:**

```
Reach
When this creature enters, you may discard a card or pay {2}. When you do, destroy target Room.
```

**Current tags:** `effect.draws_or_discards`, `effect.has_reach`, `trigger.self_etb`

### Issues

- **missing**: `effect.destroy_enchantment`
  - **What's wrong:** Card destroys target Room. Rooms are Enchantments (subtype), so `effect.destroy_enchantment` should fire.
  - **Evidence vs reality:** Oracle text "destroy target Room" is a destroy-enchantment effect — Room is a printed Enchantment subtype.
  - **Suggested fix:** Broaden `effect.destroy_enchantment` regex to recognize "destroy target Room" (Room is always an enchantment).
- **missing**: no `condition.cares_subtype.room` exists
  - **What's wrong:** No Room subtype condition exists, but a destroy-Room targeting effect exists in the set.
  - **Evidence vs reality:** Anthropede explicitly destroys a Room, but catalog only has subtype tags for aura/cave/class/clue/curse/dragon/equipment/food/lesson/mount/role/saga/shrine/treasure/vehicle.
  - **Suggested fix:** Add a `condition.cares_subtype.room` rule and ensure parametric coverage of Room.

---

## Balemurk Leech  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Leech
**Mana cost:** {1}{B}

**Oracle text:**

```
Eerie — Whenever an enchantment you control enters and whenever you fully unlock a Room, each opponent loses 1 life.
```

**Current tags:** `condition.cares_enchantments`, `effect.life_changed`, `trigger.another_enchantment_etb`

### Issues

- **missing**: no `condition.eerie` or `trigger.room_unlocked` exists
  - **What's wrong:** "Eerie —" is an ability word (DSK) gating a trigger on enchantment ETB or fully unlocking a Room. The second trigger half ("whenever you fully unlock a Room") has no catalog tag.
  - **Evidence vs reality:** Oracle text "whenever you fully unlock a Room" is a distinct trigger that the catalog doesn't recognize — currently no eerie ability word tag nor room-unlock trigger tag.
  - **Suggested fix:** Add `condition.eerie` (ability word, like `condition.celebration`/`descend`) and/or a `trigger.room_unlocked` rule.

---

## Balustrade Wurm  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Wurm
**Mana cost:** {3}{G}{G}

**Oracle text:**

```
This spell can't be countered.
Trample, haste
Delirium — {2}{G}{G}: Return this card from your graveyard to the battlefield with a finality counter on it. Activate only if there are four or more card types among cards in your graveyard and only as a sorcery.
```

**Current tags:** `condition.cares_graveyard`, `effect.has_activated_ability`, `effect.has_haste`, `effect.has_mana_activated_ability`, `effect.has_trample`, `effect.reanimate`

### Issues

- **missing**: `effect.counter_modified`
  - **What's wrong:** Card places a finality counter on itself when returned, but `effect.counter_modified` doesn't fire.
  - **Evidence vs reality:** Oracle "return this card from your graveyard to the battlefield with a finality counter on it" is a counter placement.
  - **Suggested fix:** Broaden `effect.counter_modified` regex to match "with a X counter on it" reanimation phrasing.
- **missing**: no `condition.delirium` exists (known catalog gap)
  - **What's wrong:** "Delirium —" is an ability word gating this card's activation; no catalog tag exists for delirium.
  - **Evidence vs reality:** Oracle "Delirium —" and "if there are four or more card types among cards in your graveyard" is the canonical delirium gate.
  - **Suggested fix:** Add `condition.delirium` rule (parallel to existing `condition.descend`, `condition.celebration`).

---

## Beastie Beatdown  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {R}{G}

**Oracle text:**

```
Choose target creature you control and target creature an opponent controls.
Delirium — If there are four or more card types among cards in your graveyard, put two +1/+1 counters on the creature you control.
The creature you control deals damage equal to its power to the creature an opponent controls.
```

**Current tags:** `condition.cares_graveyard`, `effect.cast_noncreature_spell`, `effect.counter_modified`, `effect.is_instant_or_sorcery`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.causes_damage`
  - **What's wrong:** Card has a Soul's Fire-style "creature you control deals damage equal to its power" clause but the tag doesn't fire.
  - **Evidence vs reality:** Oracle "The creature you control deals damage equal to its power to the creature an opponent controls" is the canonical causes_damage pattern.
  - **Suggested fix:** Broaden `effect.causes_damage` regex; current rule likely keys on "target creature you control deals damage" — Beastie uses "the creature you control deals damage" (anaphoric "the" because target was chosen above).
- **missing**: no `condition.delirium` exists (known catalog gap)
  - **What's wrong:** "Delirium —" ability word gating the counter clause has no catalog tag.
  - **Evidence vs reality:** Oracle "Delirium — If there are four or more card types among cards in your graveyard" is canonical delirium.
  - **Suggested fix:** Add `condition.delirium` rule.

---

## Bottomless Pool // Locker Room  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment — Room // Enchantment — Room
**Mana cost:** {U} // {4}{U}

**Oracle text:**

```
When you unlock this door, return up to one target creature to its owner's hand.
(You may cast either half. That door unlocks on the battlefield. As a sorcery, you may pay the mana cost of a locked door to unlock it.)

Whenever one or more creatures you control deal combat damage to a player, draw a card.
(You may cast either half. That door unlocks on the battlefield. As a sorcery, you may pay the mana cost of a locked door to unlock it.)
```

**Current tags:** `effect.bounce_creature`, `effect.draws_or_discards`, `effect.is_room`, `trigger.damage_dealt`

### Issues

- **missing**: no `trigger.door_unlocked` exists
  - **What's wrong:** "When you unlock this door" is a one-shot trigger on a Room half being unlocked; no catalog tag exists for it.
  - **Evidence vs reality:** Oracle "When you unlock this door, return up to one target creature to its owner's hand" is the canonical Room-unlock trigger; same family as Balemurk Leech's eerie "whenever you fully unlock a Room."
  - **Suggested fix:** Add `trigger.door_unlocked` for "when you unlock this door" / "whenever you fully unlock a Room" phrasings.


---

## Cautious Survivor  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Creature — Elf Survivor
**Mana cost:** {3}{G}

**Oracle text:**

```
Survival — At the beginning of your second main phase, if this creature is tapped, you gain 2 life.
```

**Current tags:** `effect.life_changed`

### Issues

- **missing**: no `condition.survival` exists
  - **What's wrong:** Survival is a BLB ability word gating an ability on "at the beginning of your second main phase, if this creature is tapped". No catalog tag exists for it (parallel coverage gap to delirium/threshold).
  - **Evidence vs reality:** oracle text contains `Survival —` ability-word prefix and tapped-self condition; no catalog tag matches.
  - **Suggested fix:** add `condition.survival` ability-word rule (anchor: "Survival —" or "if this creature is tapped" within a second-main-phase trigger).

- **missing**: no `trigger.second_main_phase` exists
  - **What's wrong:** "At the beginning of your second main phase" is a phase trigger not covered by `trigger.upkeep` / `trigger.beginning_of_combat` / `trigger.beginning_of_end_step`.
  - **Evidence vs reality:** Survival cards all share this phase trigger; nothing fires here.
  - **Suggested fix:** add `trigger.second_main_phase` (or fold under a broader trigger.phase_step rule).

---

## Central Elevator // Promising Stairs  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Enchantment — Room // Enchantment — Room
**Mana cost:** {3}{U} // {2}{U}

**Oracle text:**

```
When you unlock this door, search your library for a Room card that doesn't have the same name as a Room you control, reveal it, put it into your hand, then shuffle.

At the beginning of your upkeep, surveil 1. You win the game if there are eight or more different names among unlocked doors of Rooms you control.
```

**Current tags:** `effect.is_room`, `effect.surveil`, `trigger.upkeep`

### Issues

- **missing**: no `effect.tutors_subtype.room` exists
  - **What's wrong:** Card searches library for a Room card (a subtype tutor). The parametric `effect.tutors_subtype.*` family does not include Room.
  - **Evidence vs reality:** oracle text "search your library for a Room card" — exact shape of a subtype tutor.
  - **Suggested fix:** add `room` to the THEME_SUBTYPES driving `effect.tutors_subtype.*` (and matching `condition.cares_subtype.room`).

- **missing**: no `trigger.door_unlocked` (or similar) exists
  - **What's wrong:** "When you unlock this door" is a Room-specific trigger word with no catalog representation.
  - **Evidence vs reality:** oracle text "When you unlock this door, search your library..." is the canonical Room unlock-trigger frame.
  - **Suggested fix:** add `trigger.door_unlocked` rule (anchor: "when you unlock" / "when this door is unlocked").

- **missing**: no `effect.alternate_win_condition` exists
  - **What's wrong:** "You win the game if..." is an alternate win condition (Approach of the Second Sun / Mechanized Production family). No tag covers it.
  - **Evidence vs reality:** oracle text "You win the game if there are eight or more different names among unlocked doors..."
  - **Suggested fix:** add `effect.alternate_win_condition` rule (anchor: "you win the game").

---

## Charred Foyer // Warped Space  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Enchantment — Room // Enchantment — Room
**Mana cost:** {3}{R} // {4}{R}{R}

**Oracle text:**

```
At the beginning of your upkeep, exile the top card of your library. You may play it this turn.

Once each turn, you may pay {0} rather than pay the mana cost for a spell you cast from exile.
```

**Current tags:** `effect.exile_from_library`, `effect.impulse_draw`, `effect.is_room`, `trigger.upkeep`

### Issues

- **missing**: `effect.cast_for_free`
  - **What's wrong:** "you may pay {0} rather than pay the mana cost for a spell you cast from exile" is the canonical pay-zero / cast-for-free frame applied to spells from exile.
  - **Evidence vs reality:** oracle text on Warped Space half — `pay {0} rather than pay the mana cost` should trigger this rule.
  - **Suggested fix:** broaden `effect.cast_for_free` regex to match "pay {0} rather than pay the mana cost".

- **missing**: `effect.cast_from_exile`
  - **What's wrong:** Card explicitly says "a spell you cast from exile" — that's the canonical anchor for the cast-from-exile tag.
  - **Evidence vs reality:** oracle text "for a spell you cast from exile" — direct match for the tagDef.
  - **Suggested fix:** broaden `effect.cast_from_exile` regex to match "you cast from exile" as a static-permission anchor.

- **missing**: `condition.cares_exile_pile`
  - **What's wrong:** Warped Space provides a static discount keyed on "a spell you cast from exile" — it's literally an exile-pile-as-resource payoff.
  - **Evidence vs reality:** oracle text references cards in exile as the trigger for a cost reduction.
  - **Suggested fix:** broaden `condition.cares_exile_pile` to include "for a spell you cast from exile" static frames.

---

## Come Back Wrong  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Sorcery
**Mana cost:** {2}{B}

**Oracle text:**

```
Destroy target creature. If a creature card is put into a graveyard this way, return it to the battlefield under your control. Sacrifice it at the beginning of your next end step.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.destroy_creature`, `effect.is_instant_or_sorcery`, `effect.sacrifice_creature`, `trigger.beginning_of_end_step`

### Issues

- **missing**: `effect.reanimate`
  - **What's wrong:** Card destroys creature, then "return it to the battlefield under your control" — that's a graveyard-to-battlefield return (a reanimate, applied to the just-killed creature).
  - **Evidence vs reality:** oracle text "If a creature card is put into a graveyard this way, return it to the battlefield under your control" — exact reanimate shape.
  - **Suggested fix:** broaden `effect.reanimate` to match "return it to the battlefield" anaphoric reanimate frames where the graveyard zone is established by an earlier "put into a graveyard" clause.

- **missing**: `trigger.creature_leaves_battlefield` (or `creature_dies`)
  - **What's wrong:** "If a creature card is put into a graveyard this way" is the "put into a graveyard from the battlefield" phrasing flagged in the recurring patterns. This is a creature-dies/LTB conditional.
  - **Evidence vs reality:** oracle text "If a creature card is put into a graveyard this way" — recurring LTB-via-graveyard-phrasing miss.
  - **Suggested fix:** broaden `trigger.creature_dies` (or add typed LTB rule) to catch "if a creature card is put into a graveyard this way" conditional frame.

- **missing**: `effect.control_change`
  - **What's wrong:** "return it to the battlefield under your control" — when the target was an opponent's creature, this is effectively a control change via reanimate.
  - **Evidence vs reality:** oracle text "return it to the battlefield under your control" applied to a creature you destroyed (often an opponent's).
  - **Suggested fix:** consider broadening `effect.control_change` to match "return ... under your control" reanimate-steal frame. (Marginal — flagging for review.)

---

## Coordinated Clobbering  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Sorcery
**Mana cost:** {G}

**Oracle text:**

```
Tap one or two target untapped creatures you control. They each deal damage equal to their power to target creature an opponent controls.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.tap`

### Issues

- **missing**: `effect.causes_damage`
  - **What's wrong:** Card is the canonical "your creature deals damage equal to its power" frame — tagDef description even quotes this exact pattern.
  - **Evidence vs reality:** oracle text "They each deal damage equal to their power to target creature an opponent controls" — direct match. The plural "they" form may be evading a singular regex.
  - **Suggested fix:** broaden `effect.causes_damage` regex to accept plural subjects ("they each deal damage equal to their power") in addition to the singular ("target creature you control deals damage equal to its power") form.

- **missing**: `effect.deals_damage`
  - **What's wrong:** Even ignoring causes_damage, this card unambiguously causes damage to be dealt to a creature, satisfying `effect.deals_damage`.
  - **Evidence vs reality:** oracle text "deal damage equal to their power to target creature" — should match a deals_damage regex.
  - **Suggested fix:** broaden `effect.deals_damage` to match "deal damage equal to ... power" plural-subject frames.

---

## Cracked Skull  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Enchantment — Aura
**Mana cost:** {2}{B}

**Oracle text:**

```
Enchant creature
When this Aura enters, look at target player's hand. You may choose a nonland card from it. That player discards that card.
When enchanted creature is dealt damage, destroy it.
```

**Current tags:** `effect.targeted_discard`, `trigger.self_etb`

### Issues

- **missing**: `effect.destroy_creature`
  - **What's wrong:** "destroy it" with antecedent "enchanted creature" is unambiguous creature destruction.
  - **Evidence vs reality:** oracle text "When enchanted creature is dealt damage, destroy it." — the pronoun resolves to the creature; tag should fire.
  - **Suggested fix:** broaden `effect.destroy_creature` to match "destroy it" frames where the prior clause establishes a creature antecedent (or specifically "enchanted creature" frames on Auras).

- **missing**: `trigger.damage_dealt`
  - **What's wrong:** "When enchanted creature is dealt damage" is the canonical damage-dealt trigger.
  - **Evidence vs reality:** oracle text "When enchanted creature is dealt damage, ..." — direct match for the tagDef.
  - **Suggested fix:** broaden `trigger.damage_dealt` to match "when enchanted creature is dealt damage" Aura-scope frames.

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** "That player discards that card" is an explicit discard, satisfying the draws-OR-discards umbrella.
  - **Evidence vs reality:** oracle text "That player discards that card." — should hit a discard regex (currently only `effect.targeted_discard` is firing).
  - **Suggested fix:** ensure `effect.draws_or_discards` matches "<player> discards" frames (or treat targeted_discard as implying it).

---

## Cult Healer  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Creature — Human Doctor
**Mana cost:** {2}{W}

**Oracle text:**

```
Eerie — Whenever an enchantment you control enters and whenever you fully unlock a Room, this creature gains lifelink until end of turn.
```

**Current tags:** `condition.cares_enchantments`, `trigger.another_enchantment_etb`

### Issues

- **missing**: `effect.grants_lifelink`
  - **What's wrong:** "this creature gains lifelink until end of turn" is the textbook temporary-lifelink-grant phrase.
  - **Evidence vs reality:** oracle text "this creature gains lifelink until end of turn" — direct match for the tagDef.
  - **Suggested fix:** broaden `effect.grants_lifelink` to match "this creature gains lifelink until end of turn" (self-grant frame).

- **missing**: no `condition.eerie` exists
  - **What's wrong:** Eerie is a DSK ability word triggered on "an enchantment enters OR you fully unlock a Room". Parallel coverage gap to delirium/threshold/survival.
  - **Evidence vs reality:** oracle text leads with `Eerie —` ability-word prefix.
  - **Suggested fix:** add `condition.eerie` ability-word rule (anchor: "Eerie —").

- **missing**: no `trigger.door_unlocked` exists
  - **What's wrong:** "whenever you fully unlock a Room" is a Room-mechanic trigger — same coverage gap noted on Central Elevator.
  - **Evidence vs reality:** oracle text "whenever you fully unlock a Room, ..." has no catalog tag.
  - **Suggested fix:** see Central Elevator entry — add `trigger.door_unlocked` / `trigger.room_fully_unlocked`.

---

## Cursed Recording  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Artifact
**Mana cost:** {2}{R}{R}

**Oracle text:**

```
Whenever you cast an instant or sorcery spell, put a time counter on this artifact. Then if there are seven or more time counters on it, remove those counters and it deals 20 damage to you.
{T}: When you next cast an instant or sorcery spell this turn, copy that spell. You may choose new targets for the copy.
```

**Current tags:** `condition.cares_noncreature_spell`, `effect.copy_spell`, `effect.counter_modified`, `effect.has_activated_ability`, `trigger.spell_cast`

### Issues

- **missing**: `effect.deals_damage`
  - **What's wrong:** "it deals 20 damage to you" is unambiguous damage dealing.
  - **Evidence vs reality:** oracle text "it deals 20 damage to you" — direct match for the tagDef.
  - **Suggested fix:** broaden `effect.deals_damage` to match "it deals N damage to you" frames (self-damage / pinger-with-anaphor).

---

## Cynical Loner  <!-- audited 2026-05-31, ruleVersion v0.19.0 -->

**Type:** Creature — Human Survivor
**Mana cost:** {1}{B}

**Oracle text:**

```
This creature can't be blocked by Glimmers.
Survival — At the beginning of your second main phase, if this creature is tapped, you may search your library for a card, put it into your graveyard, then shuffle.
```

**Current tags:** `effect.partial_unblockable`, `effect.tutor_any`

### Issues

- **missing**: `effect.mill`
  - **What's wrong:** "search your library for a card, put it into your graveyard" puts a library card directly into a graveyard — that's targeted self-mill (tutor-to-graveyard pattern).
  - **Evidence vs reality:** oracle text "put it into your graveyard" applied after a library search.
  - **Suggested fix:** broaden `effect.mill` to match "search ... for a card, put it into your graveyard" tutor-mill frames, or add a `effect.tutor_to_graveyard` rule.

- **missing**: no `condition.survival` exists (same as Cautious Survivor)
  - **What's wrong:** Survival ability word coverage gap; see Cautious Survivor entry.
  - **Evidence vs reality:** oracle text `Survival —` ability-word prefix.
  - **Suggested fix:** see Cautious Survivor — add `condition.survival`.

- **missing**: no `trigger.second_main_phase` (same as Cautious Survivor)
  - **What's wrong:** "At the beginning of your second main phase" phase trigger; see Cautious Survivor.
  - **Evidence vs reality:** oracle text triggers second main phase.
  - **Suggested fix:** see Cautious Survivor.

---

## Dashing Bloodsucker  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Vampire Warrior
**Mana cost:** {3}{B}

**Oracle text:**

```
Eerie — Whenever an enchantment you control enters and whenever you fully unlock a Room, this creature gets +2/+0 and gains lifelink until end of turn.
```

**Current tags:** `condition.cares_enchantments`, `effect.grants_stat_buff`, `trigger.another_enchantment_etb`

### Issues

- **missing**: `effect.grants_lifelink`
  - **What's wrong:** Card grants lifelink temporarily ("gains lifelink until end of turn") to itself, but the grants_lifelink tag did not fire.
  - **Evidence vs reality:** Oracle text contains "gains lifelink until end of turn" — a clear lifelink grant frame; the rule's anchors should cover self-grant via "this creature gains lifelink".
  - **Suggested fix:** broaden `effect.grants_lifelink` regex to catch self-targeted "this creature gains lifelink".

- **missing**: no `condition.eerie` / `condition.cares_rooms` exists
  - **What's wrong:** Card has an Eerie ability word triggering on enchantment-ETBs and Room unlocks, but neither the Eerie ability word nor the "fully unlock a Room" trigger has a catalog tag (catalog grep shows only `effect.is_room`).
  - **Evidence vs reality:** Oracle: "whenever you fully unlock a Room" — distinct trigger family not covered by `trigger.another_enchantment_etb`.
  - **Suggested fix:** coverage gap — add `condition.cares_rooms` / `trigger.room_unlocked` family.

---

## Dazzling Theater // Prop Room  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment — Room // Enchantment — Room
**Mana cost:** {3}{W} // {2}{W}

**Oracle text:**

```
Creature spells you cast have convoke.

Untap each creature you control during each other player's untap step.
```

**Current tags:** `effect.is_room`, `effect.untap`

### Issues

- **missing**: no `effect.has_convoke` / `effect.grants_convoke` exists
  - **What's wrong:** Front face grants convoke to all creature spells you cast — a cost-reduction-flavored mechanic with no catalog tag.
  - **Evidence vs reality:** Oracle: "Creature spells you cast have convoke." Catalog grep finds zero convoke entries; closest is `effect.cost_reduction` (which arguably applies).
  - **Suggested fix:** coverage gap — add `effect.has_convoke` / `effect.grants_convoke`, OR broaden `effect.cost_reduction` to capture convoke grants.

---

## Defiant Survivor  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Human Survivor
**Mana cost:** {2}{G}

**Oracle text:**

```
Survival — At the beginning of your second main phase, if this creature is tapped, manifest dread.
```

**Current tags:** `effect.cloak`

### Issues

- **missing**: no `trigger.second_main_phase` / `condition.survival` exists
  - **What's wrong:** Survival ability word triggers at the beginning of your second main phase if the creature is tapped — neither the phase trigger nor the Survival ability word has a catalog tag.
  - **Evidence vs reality:** Oracle: "Survival — At the beginning of your second main phase, if this creature is tapped, ..." Catalog grep finds no phase or survival entries.
  - **Suggested fix:** coverage gap — add `trigger.second_main_phase` (phase-step family parallels existing `trigger.beginning_of_combat` / `trigger.upkeep`), and optionally a `condition.survival` ability word.

---

## Demonic Counsel  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {1}{B}

**Oracle text:**

```
Search your library for a Demon card, reveal it, put it into your hand, then shuffle.
Delirium — If there are four or more card types among cards in your graveyard, instead search your library for any card, put it into your hand, then shuffle.
```

**Current tags:** `condition.cares_graveyard`, `condition.cares_tribe.demon`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.tutor_any`

### Issues

- **missing**: `effect.tutors_creature`
  - **What's wrong:** Card searches for a Demon card (Demons are creatures), which is a tribal-tutor flavor of creature tutor; `effect.tutors_creature` did not fire.
  - **Evidence vs reality:** Oracle: "Search your library for a Demon card" — Demon is a creature subtype; this is a creature tutor. Catalog's `effect.tutors_creature` tagDef matches.
  - **Suggested fix:** broaden `effect.tutors_creature` to capture "search ... for a <CreatureType> card" frames where the type is a creature type.

- **missing**: no `condition.delirium` exists
  - **What's wrong:** Card has the Delirium ability word with the canonical "four or more card types in your graveyard" gate, but no catalog tag for this ability word.
  - **Evidence vs reality:** Oracle: "Delirium — If there are four or more card types among cards in your graveyard..." Catalog grep finds zero `delirium` entries.
  - **Suggested fix:** coverage gap (already-known) — add `condition.delirium` parallel to existing `condition.descend` / `condition.celebration`.

---

## Derelict Attic // Widow's Walk  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment — Room // Enchantment — Room
**Mana cost:** {2}{B} // {3}{B}

**Oracle text:**

```
When you unlock this door, you draw two cards and you lose 2 life.

Whenever a creature you control attacks alone, it gets +1/+0 and gains deathtouch until end of turn.
```

**Current tags:** `effect.draws_or_discards`, `effect.grants_stat_buff`, `effect.is_room`, `effect.life_changed`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.grants_deathtouch`
  - **What's wrong:** Card grants deathtouch to an attacking creature, but `effect.grants_deathtouch` did not fire.
  - **Evidence vs reality:** Oracle: "Whenever a creature you control attacks alone, it gets +1/+0 and gains deathtouch until end of turn" — clear keyword-grant frame. Anaphoric "it gains deathtouch" may be the regex blocker.
  - **Suggested fix:** broaden `effect.grants_deathtouch` to anchor on "it gains deathtouch" after an attack/condition antecedent (Restless cycle anaphor caveat aside, here the subject is genuinely a creature).

---

## Dissection Tools  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Artifact — Equipment
**Mana cost:** {5}

**Oracle text:**

```
When this Equipment enters, manifest dread, then attach this Equipment to that creature.
Equipped creature gets +2/+2 and has deathtouch and lifelink.
Equip—Sacrifice a creature.
```

**Current tags:** `effect.cloak`, `effect.grants_deathtouch`, `effect.grants_lifelink`, `effect.grants_stat_buff`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.sacrifice_creature`, `trigger.self_etb`

### Issues

- **false-positive**: `effect.has_mana_activated_ability`
  - **What's wrong:** The only activated ability here is the equip cost, and that equip cost is "Sacrifice a creature" — NOT a mana cost. This tag should be reserved for activated abilities reducible by Training-Grounds-style cost reducers.
  - **Evidence vs reality:** evidence was `"equip"`, but the equip cost is em-dash–introduced sacrifice ("Equip—Sacrifice a creature"). No mana is in the activation cost.
  - **Suggested fix:** narrow `effect.has_mana_activated_ability` regex so that an "Equip—<non-mana>" line does NOT match; gate Equip matches on a following mana-cost token like `{N}` or `{X}`.

---

## Disturbing Mirth  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment
**Mana cost:** {B}{R}

**Oracle text:**

```
When this enchantment enters, you may sacrifice another enchantment or creature. If you do, draw two cards.
When you sacrifice this enchantment, manifest dread.
```

**Current tags:** `effect.cloak`, `effect.draws_or_discards`, `effect.sacrifice_creature`, `effect.sacrifice_enchantment`, `trigger.self_etb`

### Issues

- **missing**: `trigger.enchantment_leaves_battlefield` (and/or `trigger.permanent_sacrificed`)
  - **What's wrong:** Second ability triggers "When you sacrifice this enchantment" — a self-leave trigger on an enchantment, but no leaves-battlefield or sacrificed trigger is tagged.
  - **Evidence vs reality:** Oracle: "When you sacrifice this enchantment, manifest dread." `trigger.enchantment_leaves_battlefield` tagDef explicitly says it covers sacrifice.
  - **Suggested fix:** broaden `trigger.enchantment_leaves_battlefield` (and the parallel typed triggers) to capture self-sacrifice templating "When you sacrifice this <type>".

---

## Doomsday Excruciator  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Demon
**Mana cost:** {B}{B}{B}{B}{B}{B}

**Oracle text:**

```
Flying
When this creature enters, if it was cast, each player exiles all but the bottom six cards of their library face down.
At the beginning of your upkeep, draw a card.
```

**Current tags:** `effect.draws_or_discards`, `effect.has_flying`, `trigger.self_etb`, `trigger.upkeep`

### Issues

- **missing**: `effect.exile_from_library`
  - **What's wrong:** ETB exiles cards from libraries en masse, but the exile-from-library tag did not fire.
  - **Evidence vs reality:** Oracle: "each player exiles all but the bottom six cards of their library face down" — direct library-to-exile movement that matches the tagDef.
  - **Suggested fix:** broaden `effect.exile_from_library` regex to capture "exile all but the bottom N cards of [poss] library" templating.

---

## Drag to the Roots  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {2}{B}{G}

**Oracle text:**

```
Delirium — This spell costs {2} less to cast as long as there are four or more card types among cards in your graveyard.
Destroy target nonland permanent.
```

**Current tags:** `condition.cares_graveyard`, `effect.cast_noncreature_spell`, `effect.cost_reduction`, `effect.destroy_artifact`, `effect.destroy_creature`, `effect.destroy_enchantment`, `effect.destroy_permanent`, `effect.destroy_planeswalker`, `effect.is_instant_or_sorcery`, `effect.destroy_land`

### Issues

- **false-positive**: `effect.destroy_land`
  - **What's wrong:** "Destroy target NONLAND permanent" explicitly excludes lands; this tag must not fire on a nonland-restricted destroy.
  - **Evidence vs reality:** evidence was `"destroy target nonland permanent"`, but the word "nonland" is the exclusion clause — the effect cannot destroy any land.
  - **Suggested fix:** narrow `effect.destroy_land` (and the tag-expansion logic that propagates `effect.destroy_permanent` to typed children) so that the "nonland" qualifier on "destroy target ___ permanent" suppresses the `_land` child expansion.

- **missing**: no `condition.delirium` exists
  - **What's wrong:** Delirium ability word gates the cost-reduction; no `condition.delirium` catalog tag.
  - **Evidence vs reality:** Oracle: "Delirium — This spell costs {2} less to cast as long as there are four or more card types among cards in your graveyard."
  - **Suggested fix:** coverage gap (already-known) — add `condition.delirium`.

---

## Enduring Courage  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment Creature — Dog Glimmer
**Mana cost:** {2}{R}{R}

**Oracle text:**

```
Whenever another creature you control enters, it gets +2/+0 and gains haste until end of turn.
When Enduring Courage dies, if it was a creature, return it to the battlefield under its owner's control. It's an enchantment.
```

**Current tags:** `effect.grants_stat_buff`, `trigger.another_creature_etb`, `trigger.creature_dies`

### Issues

- **missing**: `effect.grants_haste`
  - **What's wrong:** Card grants haste to another-creature-ETBs, but `effect.grants_haste` did not fire.
  - **Evidence vs reality:** Oracle: "it gets +2/+0 and gains haste until end of turn" — clear keyword grant frame. Likely blocked by anaphoric "it gains haste" subject.
  - **Suggested fix:** broaden `effect.grants_haste` to accept "it gains haste" after a "Whenever <creature> enters" antecedent (Restless-cycle caveat: ensure the antecedent is a creature noun, not a land becoming a creature).

- **missing**: `effect.reanimate` (self-reanimation as the Enduring cycle effect)
  - **What's wrong:** Card returns itself from graveyard to the battlefield on death (the cycle's identifying mechanic), but no reanimation tag fires.
  - **Evidence vs reality:** Oracle: "When __SELF__ dies, ..., return it to the battlefield under its owner's control." Matches `effect.reanimate` tagDef ("Returns a card from a graveyard to the battlefield").
  - **Suggested fix:** broaden `effect.reanimate` to cover self-revive frames ("return it to the battlefield" with antecedent referring to the card itself). Note this is a recurring miss across the Enduring cycle (Courage, Curiosity, Innocence, Tenacity, Vitality).

---

## Enduring Curiosity  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment Creature — Cat Glimmer
**Mana cost:** {2}{U}{U}

**Oracle text:**

```
Flash
Whenever a creature you control deals combat damage to a player, draw a card.
When Enduring Curiosity dies, if it was a creature, return it to the battlefield under its owner's control. It's an enchantment.
```

**Current tags:** `effect.draws_or_discards`, `effect.has_flash`, `trigger.creature_dies`, `trigger.damage_dealt`

### Issues

- **missing**: `effect.reanimate` (Enduring cycle self-revive)
  - **What's wrong:** Same self-revive miss as Enduring Courage — the cycle's identifying mechanic isn't tagged.
  - **Evidence vs reality:** Oracle: "When __SELF__ dies, ..., return it to the battlefield under its owner's control."
  - **Suggested fix:** see Enduring Courage entry — broaden `effect.reanimate` for self-revive on the Enduring cycle.

---

## Enduring Innocence  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment Creature — Sheep Glimmer
**Mana cost:** {1}{W}{W}

**Oracle text:**

```
Lifelink
Whenever one or more other creatures you control with power 2 or less enter, draw a card. This ability triggers only once each turn.
When Enduring Innocence dies, if it was a creature, return it to the battlefield under its owner's control. It's an enchantment.
```

**Current tags:** `condition.cares_low_power`, `effect.draws_or_discards`, `effect.has_lifelink`, `trigger.another_creature_etb`, `trigger.creature_dies`

### Issues

- **missing**: `effect.reanimate` (Enduring cycle self-revive)
  - **What's wrong:** Same self-revive miss as the rest of the Enduring cycle.
  - **Evidence vs reality:** Oracle: "When __SELF__ dies, ..., return it to the battlefield under its owner's control."
  - **Suggested fix:** see Enduring Courage entry — broaden `effect.reanimate` for self-revive.

---

## Enduring Tenacity  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment Creature — Snake Glimmer
**Mana cost:** {2}{B}{B}

**Oracle text:**

```
Whenever you gain life, target opponent loses that much life.
When Enduring Tenacity dies, if it was a creature, return it to the battlefield under its owner's control. It's an enchantment.
```

**Current tags:** `condition.cares_lifegain`, `trigger.creature_dies`, `trigger.life_changed`

### Issues

- **missing**: `effect.life_changed`
  - **What's wrong:** Card causes a target opponent to lose life as the trigger's effect, but `effect.life_changed` did not fire.
  - **Evidence vs reality:** Oracle: "target opponent loses that much life" — directly matches the tagDef "Causes a player to gain or lose life."
  - **Suggested fix:** broaden `effect.life_changed` to capture "loses that much life" (anaphoric quantity referencing prior life gain).

- **missing**: `effect.reanimate` (Enduring cycle self-revive — same pattern as the rest of the cycle)

---

## Enduring Vitality  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment Creature — Elk Glimmer
**Mana cost:** {1}{G}{G}

**Oracle text:**

```
Vigilance
Creatures you control have "{T}: Add one mana of any color."
When Enduring Vitality dies, if it was a creature, return it to the battlefield under its owner's control. It's an enchantment.
```

**Current tags:** `effect.has_vigilance`, `trigger.creature_dies`

### Issues

- **missing**: `effect.add_mana` (and/or `effect.ramp_nonland`)
  - **What's wrong:** Card grants creatures a tap-for-mana ability ("{T}: Add one mana of any color") — a Cryptolith Rite anthem-style mana-producer effect. Neither `effect.add_mana` nor `effect.ramp_nonland` fires.
  - **Evidence vs reality:** Oracle: `Creatures you control have "{T}: Add one mana of any color."` Matches `effect.add_mana` tagDef.
  - **Suggested fix:** broaden `effect.add_mana` to include granted activated abilities ("creatures you control have ... add ... mana").

- **missing**: `effect.reanimate` (Enduring cycle self-revive — same pattern as the rest of the cycle)


---

# v0.21.0 audit batch (audited 2026-05-31)

Processed 100 cards (cards 101-200); 30 issues logged. 18 fixes shipped (H3, H4, H5, H6, H7, H8, H10, H11, H12, H13, H15, H17, H19, H20, H21, H22, H23, H24). Deferred regex broadenings: H1 (each-player-discards is intentional v0.14 Rankle precedent), H2 (typed-LTB is intentionally both-cover by design), H9 (granted-quote scope — Kitesail precedent), H14 (`effect.ramp_nonland` excludes tutor-to-hand by tagDef), H16 (granted-quote scope), H18 (`effect.cost_reduction` excludes alternate-cost by header design). Coverage gaps for new-rule batch: condition.eerie + trigger.door_unlocked, condition.delirium, condition.survival + trigger.second_main_phase, effect.extra_combat, effect.graveyard_hate, effect.has_ninjutsu, trigger.self_ltb, effect.tutors_land, effect.alternate_cost.

---

## Entity Tracker  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Human Scout
**Mana cost:** {2}{U}

**Oracle text:**

```
Flash
Eerie — Whenever an enchantment you control enters and whenever you fully unlock a Room, draw a card.
```

**Current tags:** `condition.cares_enchantments`, `effect.draws_or_discards`, `effect.has_flash`, `trigger.another_enchantment_etb`

### Issues

- **missing**: `condition.eerie`
  - **What's wrong:** Coverage gap — no `condition.eerie` rule exists in catalog despite the card carrying the Eerie ability word.
  - **Evidence vs reality:** oracle text starts the second line with "Eerie —" but no rule matches; this card is a textbook Eerie payoff.
  - **Suggested fix:** add a `condition.eerie` rule keyed on the "Eerie —" ability word.
- **missing**: `trigger.door_unlocked`
  - **What's wrong:** Coverage gap — no rule matches "whenever you fully unlock a Room".
  - **Evidence vs reality:** oracle has "whenever you fully unlock a Room, draw a card" — a Room-unlock trigger that goes untagged.
  - **Suggested fix:** add a `trigger.door_unlocked` (or `trigger.room_unlocked`) rule.
---

## Erratic Apparition  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Spirit
**Mana cost:** {2}{U}

**Oracle text:**

```
Flying, vigilance
Eerie — Whenever an enchantment you control enters and whenever you fully unlock a Room, this creature gets +1/+1 until end of turn.
```

**Current tags:** `condition.cares_enchantments`, `effect.grants_stat_buff`, `effect.has_flying`, `effect.has_vigilance`, `trigger.another_enchantment_etb`

### Issues

- **missing**: `condition.eerie`
  - **What's wrong:** Coverage gap — no `condition.eerie` rule exists despite the explicit "Eerie —" ability word.
  - **Evidence vs reality:** "Eerie — Whenever an enchantment you control enters..." is the canonical Eerie clause.
  - **Suggested fix:** add a `condition.eerie` rule.
- **missing**: `trigger.door_unlocked`
  - **What's wrong:** Coverage gap — "whenever you fully unlock a Room" goes untagged.
  - **Evidence vs reality:** oracle says "whenever you fully unlock a Room, this creature gets +1/+1".
  - **Suggested fix:** add a `trigger.door_unlocked` rule.
---

## Fanatic of the Harrowing  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Human Cleric
**Mana cost:** {3}{B}

**Oracle text:**

```
When this creature enters, each player discards a card. If you discarded a card this way, draw a card.
```

**Current tags:** `effect.draws_or_discards`, `effect.targeted_discard`, `trigger.self_etb`

### Issues

- **false-positive**: `effect.targeted_discard`
  - **What's wrong:** Symmetric "each player discards" includes the controller; the tagDef explicitly says "targeted opponent (or each opponent)" — hand-attack disruption.
  - **Evidence vs reality:** evidence was `"each player discards"`, but "each player" includes you (and the card even references "If you discarded a card this way"), so this isn't a one-sided hand-attack effect.
  - **Suggested fix:** narrow regex to require "opponent" / "target player" rather than "each player".
---

## Fear of Abduction  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment Creature — Nightmare
**Mana cost:** {4}{W}{W}

**Oracle text:**

```
As an additional cost to cast this spell, exile a creature you control.
Flying
When this creature enters, exile target creature an opponent controls.
When this creature leaves the battlefield, put each card exiled with it into its owner's hand.
```

**Current tags:** `condition.cares_exile_pile`, `effect.exile_creature`, `effect.has_flying`, `trigger.creature_leaves_battlefield`, `trigger.enchantment_leaves_battlefield`, `trigger.self_etb`

### Issues

- **false-positive (self-leak)**: `trigger.creature_leaves_battlefield`
  - **What's wrong:** Self-LTB phrasing ("when this creature leaves the battlefield") is leaking into the "another creature LTB" trigger, similar to the `self_etb` vs `another_creature_etb` split.
  - **Evidence vs reality:** evidence was `"when this creature leaves the battlefield"`, but the trigger references THIS card's own LTB, not "a creature" (i.e. some other creature). No `trigger.self_ltb` exists yet — this is a missing partition.
  - **Suggested fix:** narrow regex to exclude "this creature" / "this permanent" self-LTB phrasings, and add a new `trigger.self_ltb` rule.
- **false-positive (self-leak)**: `trigger.enchantment_leaves_battlefield`
  - **What's wrong:** Same self-LTB leak — the card's own LTB clause is being read as "an enchantment LTB" trigger.
  - **Evidence vs reality:** evidence was `"when this creature leaves the battlefield"`; even though the card is an Enchantment Creature, this is its own LTB, not "an enchantment".
  - **Suggested fix:** exclude "this creature/permanent" self-LTB phrasings from the typed-LTB rule.
- **missing**: `effect.bounce_creature`
  - **What's wrong:** The LTB clause puts exiled cards into their owners' hands — for the opponent's creature that was exiled by the ETB trigger, this functions as a bounce.
  - **Evidence vs reality:** oracle has "put each card exiled with it into its owner's hand"; combined with the ETB exile of an opponent's creature, the net effect is bouncing that creature when this card leaves. Not strongly required given the indirection — judgment call.
  - **Suggested fix:** consider whether "blink-and-return-on-LTB" patterns should pick up bounce edges; alternately leave as-is.
---

## Fear of Burning Alive  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment Creature — Nightmare
**Mana cost:** {4}{R}{R}

**Oracle text:**

```
When this creature enters, it deals 4 damage to each opponent.
Delirium — Whenever a source you control deals noncombat damage to an opponent, if there are four or more card types among cards in your graveyard, this creature deals that amount of damage to target creature that player controls.
```

**Current tags:** `condition.cares_graveyard`, `effect.deals_damage`, `trigger.damage_dealt`, `trigger.self_etb`

### Issues

- **missing**: `condition.delirium`
  - **What's wrong:** Coverage gap — no `condition.delirium` rule exists.
  - **Evidence vs reality:** oracle has "Delirium — Whenever a source you control deals noncombat damage... if there are four or more card types among cards in your graveyard" — canonical Delirium ability word.
  - **Suggested fix:** add a `condition.delirium` rule keyed on "Delirium —" / "four or more card types".
---

## Fear of Exposure  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment Creature — Nightmare
**Mana cost:** {2}{G}

**Oracle text:**

```
As an additional cost to cast this spell, tap two untapped creatures and/or lands you control.
Trample
```

**Current tags:** `condition.cares_lands`, `effect.has_trample`

### Issues

- **false-positive**: `condition.cares_lands`
  - **What's wrong:** The "lands you control" appears only in the additional-cost clause (convoke-like tap), not as a scaling or payoff reference.
  - **Evidence vs reality:** evidence was `"lands you control"`, but the full phrase is "tap two untapped creatures and/or lands you control" — that's a cost, not a "cares about land count" payoff. The tagDef targets ramp / landfall / land-scaling synergies.
  - **Suggested fix:** narrow regex to exclude "tap N ... lands you control" additional-cost phrasing, or require quantifier/scaling context.
---

## Fear of Infinity  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment Creature — Nightmare
**Mana cost:** {1}{U}{B}

**Oracle text:**

```
Flying, lifelink
This creature can't block.
Eerie — Whenever an enchantment you control enters and whenever you fully unlock a Room, you may return this card from your graveyard to your hand.
```

**Current tags:** `condition.cares_enchantments`, `effect.has_flying`, `effect.has_lifelink`, `effect.return_from_graveyard_to_hand`, `trigger.another_enchantment_etb`

### Issues

- **missing**: `condition.eerie`
  - **What's wrong:** Coverage gap — no `condition.eerie` rule exists.
  - **Evidence vs reality:** "Eerie — Whenever an enchantment you control enters..." canonical Eerie clause.
  - **Suggested fix:** add a `condition.eerie` rule.
- **missing**: `trigger.door_unlocked`
  - **What's wrong:** Coverage gap — "whenever you fully unlock a Room" goes untagged.
  - **Evidence vs reality:** oracle contains "whenever you fully unlock a Room, you may return this card...".
  - **Suggested fix:** add a `trigger.door_unlocked` rule.
---

## Fear of Missing Out  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment Creature — Nightmare
**Mana cost:** {1}{R}

**Oracle text:**

```
When this creature enters, discard a card, then draw a card.
Delirium — Whenever this creature attacks for the first time each turn, if there are four or more card types among cards in your graveyard, untap target creature. After this phase, there is an additional combat phase.
```

**Current tags:** `condition.cares_graveyard`, `effect.draws_or_discards`, `effect.untap`, `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **missing**: `condition.delirium`
  - **What's wrong:** Coverage gap — no `condition.delirium` rule exists.
  - **Evidence vs reality:** oracle has "Delirium — Whenever this creature attacks for the first time each turn, if there are four or more card types among cards in your graveyard" — Delirium ability word + threshold check.
  - **Suggested fix:** add a `condition.delirium` rule.
- **missing**: `effect.extra_combat` (or similar)
  - **What's wrong:** Coverage gap — "an additional combat phase" goes untagged. This is the Combat Celebrant / Aggravated Assault payoff axis.
  - **Evidence vs reality:** oracle has "After this phase, there is an additional combat phase."
  - **Suggested fix:** add an `effect.extra_combat` rule.

---

## Fear of the Dark  <!-- audited 2026-05-31, ruleVersion v0.20.0 -->

**Type:** Enchantment Creature — Nightmare
**Mana cost:** {4}{B}

**Oracle text:**

```
Whenever this creature attacks, if defending player controls no Glimmer creatures, it gains menace and deathtouch until end of turn.
```

**Current tags:** `effect.gains_keyword_self_conditional`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.grants_deathtouch`
  - **What's wrong:** Card grants deathtouch to itself but no deathtouch-grant tag fires. The conditional keyword tag covers menace (an evasion keyword) but deathtouch is a separate axis.
  - **Evidence vs reality:** Oracle says "it gains menace and deathtouch until end of turn" — explicit deathtouch grant. The `effect.gains_keyword_self_conditional` tagDef is scoped to evasion keywords (flying/menace/intimidate); deathtouch falls outside.
  - **Suggested fix:** Broaden the "gains <keyword> until end of turn" producer so it also fires `effect.grants_deathtouch` when deathtouch appears in the gained keyword list.

---

## Floodpits Drowner  <!-- audited 2026-05-31, ruleVersion v0.20.0 -->

**Type:** Creature — Merfolk
**Mana cost:** {1}{U}

**Oracle text:**

```
Flash
Vigilance
When this creature enters, tap target creature an opponent controls and put a stun counter on it.
{1}{U}, {T}: Shuffle this creature and target creature with a stun counter on it into their owners' libraries.
```

**Current tags:** `effect.counter_modified`, `effect.has_activated_ability`, `effect.has_flash`, `effect.has_mana_activated_ability`, `effect.has_vigilance`, `effect.stun_counter`, `effect.tap`, `trigger.self_etb`

### Issues

- **missing**: `effect.tuck_to_library`
  - **What's wrong:** Activated ability shuffles a creature into its owner's library — the canonical tuck-to-library shape — but no tuck tag fires.
  - **Evidence vs reality:** Oracle has "Shuffle this creature and target creature with a stun counter on it into their owners' libraries." The tagDef describes "Puts a card from the battlefield or graveyard onto the top or bottom of a library — soft-bounce removal". "Shuffle into library" is the same removal axis.
  - **Suggested fix:** Broaden `effect.tuck_to_library` regex to also catch "shuffle ... into (its owner's|their owners') library/libraries" battlefield-source phrasing.

---

## Get Out  <!-- audited 2026-05-31, ruleVersion v0.20.0 -->

**Type:** Instant
**Mana cost:** {U}{U}

**Oracle text:**

```
Choose one —
• Counter target creature or enchantment spell.
• Return one or two target creatures and/or enchantments you own to your hand.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.counterspell`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.bounce_creature`
  - **What's wrong:** The second mode self-bounces creatures, but the bounce-creature tag does not fire.
  - **Evidence vs reality:** Oracle says "Return one or two target creatures and/or enchantments you own to your hand." `effect.bounce_creature` tagDef is "Returns a creature to hand". The fact that the target is "you own" doesn't exclude it from bounce — self-bounce is still creature bounce (and is itself a relevant synergy axis with ETB payoffs).
  - **Suggested fix:** Ensure `effect.bounce_creature` regex matches "return ... target creature(s) ... to your/its owner's hand" including the self-target "you own" variant and the "creatures and/or enchantments" coordinated form.

- **missing**: `effect.bounce_enchantment`
  - **What's wrong:** Same mode also returns enchantments to hand; the enchantment-bounce tag does not fire.
  - **Evidence vs reality:** Oracle: "Return one or two target creatures and/or enchantments you own to your hand." `effect.bounce_enchantment` tagDef is "Returns an enchantment to hand". The coordinated "creatures and/or enchantments" form is the canonical multi-type bounce phrasing.
  - **Suggested fix:** Broaden `effect.bounce_enchantment` to recognize "and/or enchantments" within a coordinated multi-type return-to-hand clause.

---

## Ghost Vacuum  <!-- audited 2026-05-31, ruleVersion v0.20.0 -->

**Type:** Artifact
**Mana cost:** {1}

**Oracle text:**

```
{T}: Exile target card from a graveyard.
{6}, {T}, Sacrifice this artifact: Put each creature card exiled with this artifact onto the battlefield under your control with a flying counter on it. Each of them is a 1/1 Spirit in addition to its other types. Activate only as a sorcery.
```

**Current tags:** `condition.cares_exile_pile`, `condition.cares_tribe.spirit`, `effect.cheat_into_play`, `effect.exile_from_graveyard`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.sacrifice_artifact`

### Issues

- **missing**: `effect.counter_modified`
  - **What's wrong:** Activated ability places a flying counter on a creature, which is a counter-placement effect; no counter-modified tag fires.
  - **Evidence vs reality:** Oracle: "Put each creature card exiled with this artifact onto the battlefield under your control with a flying counter on it." The `effect.counter_modified` tagDef is "Places or removes counters." A flying counter qualifies.
  - **Suggested fix:** Broaden `effect.counter_modified` regex to catch "with a <keyword> counter on it" non-+1/+1 counter placement clauses.

---

## Greenhouse // Rickety Gazebo  <!-- audited 2026-05-31, ruleVersion v0.20.0 -->

**Type:** Enchantment — Room // Enchantment — Room
**Mana cost:** {2}{G} // {3}{G}

**Oracle text:**

```
Lands you control have "{T}: Add one mana of any color."
(You may cast either half. That door unlocks on the battlefield. As a sorcery, you may pay the mana cost of a locked door to unlock it.)

When you unlock this door, mill four cards, then return up to two permanent cards from among them to your hand.
(You may cast either half. That door unlocks on the battlefield. As a sorcery, you may pay the mana cost of a locked door to unlock it.)
```

**Current tags:** `condition.cares_lands`, `effect.is_room`, `effect.mill`

### Issues

- **missing**: `effect.return_from_graveyard_to_hand`
  - **What's wrong:** Mills four then returns up to two permanent cards "from among them" — those are in the graveyard at the moment of return.
  - **Evidence vs reality:** oracle text says "mill four cards, then return up to two permanent cards from among them to your hand" — recursion from graveyard to hand.
  - **Suggested fix:** Broaden `effect.return_from_graveyard_to_hand` regex to match the "mill … then return … from among them to your hand" frame.
- **missing**: `effect.add_mana`
  - **What's wrong:** Grants every land "{T}: Add one mana of any color" — that's a global mana-add ability.
  - **Evidence vs reality:** oracle text grants lands a tap-add mana clause, classic ramp / fixing payoff.
  - **Suggested fix:** Allow `effect.add_mana` to match when "Add … mana" appears inside a granted ability template (lands have "{T}: Add …").

---

## Grievous Wound  <!-- audited 2026-05-31, ruleVersion v0.20.0 -->

**Type:** Enchantment — Aura
**Mana cost:** {3}{B}{B}

**Oracle text:**

```
Enchant player
Enchanted player can't gain life.
Whenever enchanted player is dealt damage, they lose half their life, rounded up.
```

**Current tags:** `trigger.damage_dealt`

### Issues

- **missing**: `effect.life_changed`
  - **What's wrong:** Card causes a player to lose life ("they lose half their life, rounded up") — clear life_changed effect.
  - **Evidence vs reality:** oracle text "they lose half their life, rounded up" — direct life-loss effect.
  - **Suggested fix:** Broaden `effect.life_changed` to match "lose ... their life" / "lose half their life" phrasings.

---

## Growing Dread  <!-- audited 2026-05-31, ruleVersion v0.20.0 -->

**Type:** Enchantment
**Mana cost:** {G}{U}

**Oracle text:**

```
Flash
When this enchantment enters, manifest dread. (Look at the top two cards of your library. Put one onto the battlefield face down as a 2/2 creature and the other into your graveyard. Turn it face up any time for its mana cost if it's a creature card.)
Whenever you turn a permanent face up, put a +1/+1 counter on it.
```

**Current tags:** `effect.cloak`, `effect.counter_modified`, `effect.has_flash`, `effect.plus_one_counter`, `trigger.self_etb`

### Issues

- **missing**: `trigger.turned_face_up`
  - **What's wrong:** Has the canonical "Whenever you turn a permanent face up" trigger frame but no `trigger.turned_face_up` tag fired.
  - **Evidence vs reality:** oracle text says "Whenever you turn a permanent face up, put a +1/+1 counter on it." — payoff trigger for Disguise/Manifest unflip.
  - **Suggested fix:** Add "whenever you turn a permanent face up" to `trigger.turned_face_up` anchors.

---

## Hand That Feeds  <!-- audited 2026-05-31, ruleVersion v0.20.0 -->

**Type:** Creature — Mutant
**Mana cost:** {1}{R}

**Oracle text:**

```
Delirium — Whenever this creature attacks while there are four or more card types among cards in your graveyard, it gets +2/+0 and gains menace until end of turn. (It can't be blocked except by two or more creatures.)
```

**Current tags:** `condition.cares_graveyard`, `effect.grants_stat_buff`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.gains_keyword_self_conditional`
  - **What's wrong:** Conditionally gains menace ("gains menace until end of turn" gated by delirium count).
  - **Evidence vs reality:** oracle text "it ... gains menace until end of turn" under the four-card-types-in-graveyard gate — classic conditional self-gain frame.
  - **Suggested fix:** Add the attack-trigger conditional frame ("while there are ... gains <keyword>") to `effect.gains_keyword_self_conditional`.

---

## Hedge Shredder  <!-- audited 2026-05-31, ruleVersion v0.20.0 -->

**Type:** Artifact — Vehicle
**Mana cost:** {2}{G}{G}

**Oracle text:**

```
Whenever this Vehicle attacks, you may mill two cards.
Whenever one or more land cards are put into your graveyard from your library, put them onto the battlefield tapped.
Crew 1 (Tap any number of creatures you control with total power 1 or more: This Vehicle becomes an artifact creature until end of turn.)
```

**Current tags:** `effect.has_activated_ability`, `effect.mill`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.reanimate`
  - **What's wrong:** "Put them onto the battlefield tapped" — lands moving from graveyard (via the mill-into-graveyard step) onto the battlefield is a reanimation effect.
  - **Evidence vs reality:** oracle text "Whenever one or more land cards are put into your graveyard from your library, put them onto the battlefield tapped" — graveyard-to-battlefield motion.
  - **Suggested fix:** Consider broadening `effect.reanimate` to cover the mill-trigger "put them onto the battlefield" frame (lands moving via this side-effect path).
- **missing**: `condition.cares_lands`
  - **What's wrong:** Card explicitly cares about "land cards" being milled and treats them specially.
  - **Evidence vs reality:** oracle text "Whenever one or more land cards are put into your graveyard from your library" — direct reference to land cards as a payoff group.
  - **Suggested fix:** Broaden `condition.cares_lands` to match "land cards are put into your graveyard" frame.

---

## House Cartographer  <!-- audited 2026-05-31, ruleVersion v0.20.0 -->

**Type:** Creature — Human Scout Survivor
**Mana cost:** {1}{G}

**Oracle text:**

```
Survival — At the beginning of your second main phase, if this creature is tapped, reveal cards from the top of your library until you reveal a land card. Put that card into your hand and the rest on the bottom of your library in a random order.
```

**Current tags:** `(none)`

### Issues

- **missing**: `condition.cares_lands`
  - **What's wrong:** Card explicitly searches for "a land card" — references land cards as the payoff.
  - **Evidence vs reality:** oracle text "until you reveal a land card. Put that card into your hand" — direct land-card payoff frame.
  - **Suggested fix:** Broaden `condition.cares_lands` to match "reveal a land card" phrasings.
- **missing**: `effect.ramp_nonland` (or new `effect.tutors_land`)
  - **What's wrong:** Nonland card that searches library for a land card and puts it in hand — classic land-tutor / ramp adjacent. Currently no catalog tag fires.
  - **Evidence vs reality:** oracle text "reveal cards from the top of your library until you reveal a land card. Put that card into your hand" — Cultivate-style land tutor (to hand, not battlefield).
  - **Suggested fix:** Either broaden `effect.ramp_nonland` to include "until you reveal a land card. Put that card into your hand" or add a `effect.tutors_land` axis.
- **missing**: trigger covering "beginning of your second main phase" (catalog gap)
  - **What's wrong:** No trigger tag fires for the "at the beginning of your second main phase" trigger frame.
  - **Evidence vs reality:** oracle text "At the beginning of your second main phase, if this creature is tapped, ..." — clearly a triggered ability.
  - **Suggested fix:** Add `trigger.second_main_phase` (catalog gap per v0.20.0 known state).

---

## Inquisitive Glimmer  <!-- audited 2026-05-31, ruleVersion v0.20.0 -->

**Type:** Enchantment Creature — Fox Glimmer
**Mana cost:** {W}{U}

**Oracle text:**

```
Enchantment spells you cast cost {1} less to cast.
Unlock costs you pay cost {1} less.
```

**Current tags:** `effect.cost_reduction`

### Issues

- **missing**: `condition.cares_enchantments`
  - **What's wrong:** "Enchantment spells you cast cost {1} less to cast" gates the cost reduction on enchantment-type spells — direct enchantments-matter payoff.
  - **Evidence vs reality:** oracle text "Enchantment spells you cast cost {1} less to cast" — references enchantment spells as a group.
  - **Suggested fix:** Broaden `condition.cares_enchantments` to match "Enchantment spells you cast" frame.

---

## Kaito, Bane of Nightmares  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Legendary Planeswalker — Kaito
**Mana cost:** {2}{U}{B}

**Oracle text:**

```
Ninjutsu {1}{U}{B} ({1}{U}{B}, Return an unblocked attacker you control to hand: Put this card onto the battlefield from your hand tapped and attacking.)
During your turn, as long as Kaito has one or more loyalty counters on him, he's a 3/4 Ninja creature and has hexproof.
+1: You get an emblem with "Ninjas you control get +1/+1."
0: Surveil 2. Then draw a card for each opponent who lost life this turn.
−2: Tap target creature. Put two stun counters on it.
```

**Current tags:** `effect.counter_modified`, `effect.draws_or_discards`, `effect.stun_counter`, `effect.surveil`, `effect.tap`

### Issues

- **missing**: `effect.grants_stat_buff`
  - **What's wrong:** The emblem grants Ninjas +1/+1, an anthem-style buff.
  - **Evidence vs reality:** card creates an emblem with `"Ninjas you control get +1/+1."`, which is an anthem.
  - **Suggested fix:** Broaden `effect.grants_stat_buff` rule to detect emblem-granted anthems (`emblem with "... get +N/+N"`).

- **missing**: `effect.bounce_creature`
  - **What's wrong:** Ninjutsu activation cost includes "Return an unblocked attacker you control to hand"; the reminder text is stripped, but the keyword itself implies bounce. (NOTE: reminder text is stripped before tagging, so this may be unfixable absent a dedicated `effect.has_ninjutsu` rule.)
  - **Evidence vs reality:** reminder text gone; only "Ninjutsu {1}{U}{B}" survives. No `effect.has_ninjutsu` tag exists.
  - **Suggested fix:** Consider adding `effect.has_ninjutsu` and `effect.bounce_creature` should fire on the bounce-as-cost printed text if reminder-text isn't stripped early.

- **missing**: `condition.cares_lifeloss`
  - **What's wrong:** "draw a card for each opponent who lost life this turn" scales on opponents losing life.
  - **Evidence vs reality:** text explicitly says `"each opponent who lost life this turn"`.
  - **Suggested fix:** Broaden `condition.cares_lifeloss` to detect "opponent who lost life this turn" / "lost life this turn" phrasing.

---

## Leyline of Hope  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment
**Mana cost:** {2}{W}{W}

**Oracle text:**

```
If this card is in your opening hand, you may begin the game with it on the battlefield.
If you would gain life, you gain that much life plus 1 instead.
As long as you have at least 7 life more than your starting life total, creatures you control get +2/+2.
```

**Current tags:** `condition.cares_lifegain`, `effect.grants_stat_buff`

### Issues

- **missing**: `effect.life_changed`
  - **What's wrong:** "you gain that much life plus 1 instead" — replacement effect that causes additional life gain.
  - **Evidence vs reality:** text says `"you gain that much life plus 1 instead"`. Causes a player to gain life. No tag flagged.
  - **Suggested fix:** Broaden `effect.life_changed` to detect replacement-effect lifegain phrasings ("gain that much life plus N instead").

---

## Leyline of Mutation  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment
**Mana cost:** {2}{G}{G}

**Oracle text:**

```
If this card is in your opening hand, you may begin the game with it on the battlefield.
You may pay {W}{U}{B}{R}{G} rather than pay the mana cost for spells you cast.
```

**Current tags:** `(none)`

### Issues

- **missing**: `effect.cost_reduction`
  - **What's wrong:** Card grants an alternate-cost casting option (pay {W}{U}{B}{R}{G} instead of mana cost), which functions as a cost modification for any spell.
  - **Evidence vs reality:** text says `"You may pay {W}{U}{B}{R}{G} rather than pay the mana cost for spells you cast"`. No tags fired at all (card is fully untagged).
  - **Suggested fix:** Broaden `effect.cost_reduction` (or add an `effect.alternate_cost` family) to detect "pay X rather than pay the mana cost" phrasing.

---

## Leyline of the Void  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Enchantment
**Mana cost:** {2}{B}{B}

**Oracle text:**

```
If this card is in your opening hand, you may begin the game with it on the battlefield.
If a card would be put into an opponent's graveyard from anywhere, exile it instead.
```

**Current tags:** `(none)`

### Issues

- **missing**: graveyard-hate coverage gap
  - **What's wrong:** Card is a canonical graveyard-hate replacement effect ("exile instead of going to opponent's graveyard"), but no `effect.graveyard_hate` tag exists in the catalog.
  - **Evidence vs reality:** card fully untagged. Replacement-effect graveyard hate is a real archetype (Leyline of the Void, Rest in Peace, Soul-Guide Lantern style passives) with no representation.
  - **Suggested fix:** Add a new `effect.graveyard_hate` tag for "if a card would be put into [a/an opponent's] graveyard … exile it instead" phrasing.

---

## Manifest Dread  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {1}{G}

**Oracle text:**

```
Manifest dread. (Look at the top two cards of your library. Put one onto the battlefield face down as a 2/2 creature and the other into your graveyard. Turn it face up any time for its mana cost if it's a creature card.)
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.cloak`
  - **What's wrong:** This card IS the canonical "manifest dread" keyword action — the tagDef explicitly names "manifest dread" as a producer pattern. After reminder stripping the only oracle text is "manifest dread." but no tag fires.
  - **Evidence vs reality:** normalized text is `"manifest dread."`; `effect.cloak` description names this exact keyword. Likely the rule requires more context than just the bare keyword + period.
  - **Suggested fix:** Broaden `effect.cloak` rule to match the bare keyword "manifest dread" or "cloak N" at start of a sentence/line.

- **missing**: `effect.look_at_top_n` / `effect.mill` (reminder text)
  - **What's wrong:** Reminder text "look at the top two cards... put one... into your graveyard" is stripped, so dependent tags don't fire. Acceptable side effect of reminder stripping; flagging for awareness.
  - **Evidence vs reality:** N/A — reminder text gone.
  - **Suggested fix:** No action; ensure `effect.cloak` (which captures the underlying mechanic) fires correctly.

---

## Marina Vendrell  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Human Warlock
**Mana cost:** {W}{U}{B}{R}{G}

**Oracle text:**

```
When Marina Vendrell enters, reveal the top seven cards of your library. Put all enchantment cards from among them into your hand and the rest on the bottom of your library in a random order.
{T}: Lock or unlock a door of target Room you control. Activate only as a sorcery.
```

**Current tags:** `effect.has_activated_ability`, `effect.look_at_top_n`, `trigger.self_etb`

### Issues

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** "Put all enchantment cards from among them into your hand" — net card-advantage equivalent to multi-card draw.
  - **Evidence vs reality:** text says `"Put all enchantment cards from among them into your hand"`. Acts as a draws-style card-advantage effect.
  - **Suggested fix:** Broaden `effect.draws_or_discards` to detect "put [matching cards] into your hand" from a reveal-top-N pattern (Marina's pattern).

- **missing**: Room-care coverage gap
  - **What's wrong:** "Lock or unlock a door of target Room you control" is a Room-axis activated effect, but no `condition.cares_subtype.room` (known gap) or `effect.unlock_door` tag exists.
  - **Evidence vs reality:** card explicitly references Room subtype interaction.
  - **Suggested fix:** Add `effect.unlock_door` / `condition.cares_subtype.room` to the catalog (known coverage gap).


---

## Meathook Massacre II  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Legendary Enchantment
**Mana cost:** {X}{X}{B}{B}{B}{B}

**Oracle text:**

```
When Meathook Massacre II enters, each player sacrifices X creatures of their choice.
Whenever a creature you control dies, you may pay 3 life. If you do, return that card under your control with a finality counter on it.
Whenever a creature an opponent controls dies, they may pay 3 life. If they don't, return that card under your control with a finality counter on it.
```

**Current tags:** `condition.has_x_in_cost`, `effect.edict`, `effect.life_changed`, `effect.sacrifice_creature`, `trigger.creature_dies`, `trigger.self_etb`

### Issues

- **missing**: `effect.reanimate`
  - **What's wrong:** Both dies-triggered abilities return that card to the battlefield under your control — textbook reanimation from graveyard.
  - **Evidence vs reality:** oracle has "return that card under your control with a finality counter on it" twice; reanimate rule should catch "return that card" out of a dies trigger's graveyard context.
  - **Suggested fix:** Broaden `effect.reanimate` to match the "return that card [...] with a finality counter" reanimation pattern off a death trigger.

- **missing**: `effect.counter_modified`
  - **What's wrong:** Both dies-triggered returns place a finality counter on the returned creature.
  - **Evidence vs reality:** oracle has "with a finality counter on it" twice — clear counter placement.
  - **Suggested fix:** Broaden `effect.counter_modified` to catch finality counter placement phrasing.

---

## Miasma Demon  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Creature — Demon
**Mana cost:** {4}{B}{B}

**Oracle text:**

```
Flying
When this creature enters, you may discard any number of cards. When you do, up to that many target creatures each get -2/-2 until end of turn.
```

**Current tags:** `effect.debuff_minus_n`, `effect.has_flying`, `trigger.self_etb`

### Issues

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** ETB ability has the controller discard any number of cards — clear self-discard effect.
  - **Evidence vs reality:** oracle has "you may discard any number of cards"; the discard half of `effect.draws_or_discards` should match.
  - **Suggested fix:** Broaden `effect.draws_or_discards` to catch "discard any number of cards" phrasing.

- **missing**: `trigger.card_drawn_discarded`
  - **What's wrong:** The "When you do" reflexive trigger fires off the discard action.
  - **Evidence vs reality:** oracle has "When you do, up to that many target creatures..."; reflexive triggers off discards are a card-drawn/discarded event.
  - **Suggested fix:** Consider whether reflexive "When you do" off a discard should fire `trigger.card_drawn_discarded`.

---

## Nashi, Searcher in the Dark  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Rat Ninja Wizard
**Mana cost:** {U}{B}

**Oracle text:**

```
Menace
Whenever Nashi deals combat damage to a player, you mill that many cards. You may put any number of legendary and/or enchantment cards from among them into your hand. If you put no cards into your hand this way, put a +1/+1 counter on Nashi.
```

**Current tags:** `effect.counter_modified`, `effect.has_menace`, `effect.plus_one_counter`, `trigger.damage_dealt`

### Issues

- **missing**: `effect.mill`
  - **What's wrong:** Combat-damage trigger explicitly mills cards equal to the damage dealt.
  - **Evidence vs reality:** oracle has "you mill that many cards"; the canonical mill phrasing.
  - **Suggested fix:** Broaden `effect.mill` to catch "mill that many cards" (variable-quantity mill phrased as "that many").

---

## Niko, Light of Hope  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Human Wizard
**Mana cost:** {2}{W}{U}

**Oracle text:**

```
When Niko enters, create two Shard tokens. (They're enchantments with "{2}, Sacrifice this token: Scry 1, then draw a card.")
{2}, {T}: Exile target nonlegendary creature you control. Shards you control become copies of it until the next end step. Return it to the battlefield under its owner's control at the beginning of the next end step.
```

**Current tags:** `effect.create_token`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `trigger.beginning_of_end_step`, `trigger.self_etb`

### Issues

- **missing**: `effect.bounce_creature`
  - **What's wrong:** The activated ability exiles a target creature you control and returns it at the next end step — textbook blink (exile + return = re-ETB).
  - **Evidence vs reality:** oracle has "Exile target nonlegendary creature you control...Return it to the battlefield...at the beginning of the next end step"; bounce_creature description explicitly covers "exiles and returns it (re-triggering ETB)".
  - **Suggested fix:** Broaden `effect.bounce_creature` to catch "Exile target creature ... Return it ... at the beginning of the next end step" blink phrasing.

---

## Norin, Swift Survivalist  <!-- audited 2026-05-31, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Human Coward
**Mana cost:** {R}

**Oracle text:**

```
Norin can't block.
Whenever a creature you control becomes blocked, you may exile it. You may play that card from exile this turn.
```

**Current tags:** `trigger.attack_or_block`

### Issues

- **missing**: `effect.cast_from_exile`
  - **What's wrong:** Triggered ability explicitly grants "play that card from exile this turn".
  - **Evidence vs reality:** oracle has "You may play that card from exile this turn"; canonical cast-from-exile phrasing.
  - **Suggested fix:** Ensure `effect.cast_from_exile` matches the "play that card from exile" idiom.

- **missing**: `effect.exile_creature`
  - **What's wrong:** The trigger exiles the blocked creature you control from the battlefield.
  - **Evidence vs reality:** oracle has "you may exile it" referring to "a creature you control" — exiles a creature from the battlefield.
  - **Suggested fix:** Broaden `effect.exile_creature` to catch "you may exile it" anaphoric references where the antecedent is a creature.


---

# v0.22.0 audit batch (audited 2026-05-31)

Processed 100 cards (cards 201-300); 43 issues logged. 15 fixes shipped (J1, J2, J3, J4, J6, J10, J11, J12, J14, J15, J16, J17, J18, J19, J20). Deferred regex broadenings: J5 (cheat_into_play multi-zone — reanimate already covers Say Its Name), J7 (typecycling reminder text stripped — needs matchCard keyword gate), J8 (Tale of Tamiyo saga IV — multi-rule coordination), J9 (multi-tribe anthem deathtouch — interacts with v0.21 H4 strip), J13 (cares_graveyard producer/consumer trap), J21 (no-op). Coverage gaps now include cumulative list from v0.20+v0.21+v0.22 (eerie, delirium, survival, door_unlocked, has_convoke, has_ward, create_land_token, etc.).

---

## Overlord of the Hauntwoods  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Enchantment Creature — Avatar Horror
**Mana cost:** {3}{G}{G}

**Oracle text:**

```
Impending 4—{1}{G}{G} (If you cast this spell for its impending cost, it enters with four time counters and isn't a creature until the last is removed. At the beginning of your end step, remove a time counter from it.)
Whenever this permanent enters or attacks, create a tapped colorless land token named Everywhere that is every basic land type.
```

**Current tags:** `effect.create_token`, `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **missing**: `effect.ramp_nonland`
  - **What's wrong:** Creates a tapped land token "every basic land type" — that's a non-land card putting a land directly into play (textbook ramp via token).
  - **Evidence vs reality:** rule probably looks for "search your library for a basic land" or "add mana"; creating a basic-type land token is functionally identical.
  - **Suggested fix:** broaden `effect.ramp_nonland` to match "create a … land token (named …)" patterns, or add a dedicated `effect.create_land_token` tag.
---

## Painter's Studio // Defaced Gallery  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Enchantment — Room // Enchantment — Room
**Mana cost:** {2}{R} // {1}{R}

**Oracle text:**

```
When you unlock this door, exile the top two cards of your library. You may play them until the end of your next turn.

Whenever you attack, attacking creatures you control get +1/+0 until end of turn.
```

**Current tags:** `effect.exile_from_library`, `effect.grants_stat_buff`, `effect.impulse_draw`, `effect.is_room`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.cast_from_exile`
  - **What's wrong:** "You may play them until the end of your next turn" — anaphoric play-from-exile of just-exiled cards. v0.21.0 broadened cast_from_exile for "play that card from exile" — same shape with plural "them".
  - **Evidence vs reality:** rule may require singular "that card" or explicit "from exile"; here antecedent is "the top two cards … exile" plus "play them".
  - **Suggested fix:** broaden `effect.cast_from_exile` to match anaphoric plural ("play them") following an exile-from-library clause within a window.
---

## Paranormal Analyst  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Creature — Human Detective
**Mana cost:** {1}{U}

**Oracle text:**

```
Whenever you manifest dread, put a card you put into your graveyard this way into your hand.
```

**Current tags:** `effect.cloak`

### Issues

- **false-positive**: `effect.cloak`
  - **What's wrong:** This card does NOT perform manifest dread — it *triggers off* you manifesting dread. The phrase is a trigger condition, not an action this card takes.
  - **Evidence vs reality:** evidence was `"manifest dread"`, but the surrounding "Whenever you manifest dread" makes it an observer/payoff, not a producer of cloak/manifest tokens.
  - **Suggested fix:** require `effect.cloak` to match an imperative/action form ("manifest dread.", "cloak the next…") and exclude `whenever you (manifest dread|cloak)` trigger clauses.
- **missing**: `effect.return_from_graveyard_to_hand`
  - **What's wrong:** "put a card you put into your graveyard this way into your hand" — anaphoric recursion of just-milled card to hand.
  - **Evidence vs reality:** rule may want "return … from your graveyard"; here phrasing is "put a card you put into your graveyard … into your hand".
  - **Suggested fix:** broaden `effect.return_from_graveyard_to_hand` to match "put a card … into your graveyard … into your hand" anaphoric pattern (post-manifest-dread / post-mill).
- **missing**: `trigger.card_drawn_discarded` or new manifest-dread trigger
  - **What's wrong:** "Whenever you manifest dread" — there's no `trigger.cloak`/`trigger.manifest_dread` in the catalog; known coverage gap for these payoff cards.
  - **Evidence vs reality:** payoff has no trigger anchor; effect-axis cloak should not double as the trigger.
  - **Suggested fix:** consider `trigger.manifest_dread`/`trigger.cloak` (or generic "you cloak"/"you manifest") as a new tag.
---

## Patched Plaything  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Artifact Creature — Toy
**Mana cost:** {2}{W}

**Oracle text:**

```
Double strike
This creature enters with two -1/-1 counters on it if you cast it from your hand.
```

**Current tags:** `effect.counter_modified`, `effect.debuff_minus_n`, `effect.has_double_strike`, `effect.has_first_strike`

### Issues

- **false-positive**: `effect.debuff_minus_n`
  - **What's wrong:** TagDef is "Gives a creature -N/-N until end of turn"; this card just enters with -1/-1 counters on itself as a downside, not a debuff effect on other creatures.
  - **Evidence vs reality:** evidence was `" -1/-1"`, but the construction is "enters with two -1/-1 counters on it" — a self-applied permanent counter, not an "until end of turn" -N/-N grant.
  - **Suggested fix:** require `effect.debuff_minus_n` to have "gets -N/-N" or "target … gets -N/-N" pattern; exclude bare "-N/-N counters" appearing in "enters with".
---

## Possessed Goat  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Creature — Goat
**Mana cost:** {W}

**Oracle text:**

```
{3}, Discard a card: Put three +1/+1 counters on this creature and it becomes a black Demon in addition to its other colors and types. Activate only once.
```

**Current tags:** `condition.cares_tribe.demon`, `effect.counter_modified`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.plus_one_counter`

### Issues

- **false-positive**: `condition.cares_tribe.demon`
  - **What's wrong:** The card mentions "Demon" only as a type-change clause for itself; it doesn't gate, count, or scale off other Demons. This is the type-change-leak pattern (similar to manland self-anim leaks).
  - **Evidence vs reality:** evidence was `"demon"`, but the surrounding "becomes a black Demon" is a self-typing modification, not a Demon-tribal payoff/anchor.
  - **Suggested fix:** require `condition.cares_tribe.<X>` to exclude "becomes a … <X>" / "is also a <X>" self-typing clauses; need a non-self anchor like "Demon you control" / "other Demons" / "for each Demon".

---

## Reluctant Role Model  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Creature — Human Survivor
**Mana cost:** {1}{W}

**Oracle text:**

```
Survival — At the beginning of your second main phase, if this creature is tapped, put a flying, lifelink, or +1/+1 counter on it.
Whenever this creature or another creature you control dies, if it had counters on it, put those counters on up to one target creature.
```

**Current tags:** `effect.counter_modified`, `effect.has_lifelink`, `trigger.creature_dies`

### Issues

- **false-positive**: `effect.has_lifelink`
  - **What's wrong:** Card does not have lifelink as a printed intrinsic ability — "lifelink" only appears as a counter-type choice ("a flying, lifelink, or +1/+1 counter").
  - **Evidence vs reality:** evidence was `"Lifelink"`, but the word appears inside a list of counter types, not as an intrinsic keyword on this creature.
  - **Suggested fix:** `effect.has_lifelink` should exclude matches where "lifelink" appears within a counter-naming list (e.g. preceded by `flying,` or followed by `, or +1/+1 counter`). Mirror existing guard used for `effect.has_flying`.
- **missing**: `effect.plus_one_counter`
  - **What's wrong:** Card can place a +1/+1 counter on the creature ("put a flying, lifelink, or +1/+1 counter on it").
  - **Evidence vs reality:** rule likely requires unambiguous "put a +1/+1 counter on" anchor without an intervening list.
  - **Suggested fix:** broaden `effect.plus_one_counter` to fire when "+1/+1 counter" appears as an element of a counter-type-choice list ("put a [list], or +1/+1 counter on").
---

## Rip, Spawn Hunter  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Legendary Creature — Human Survivor
**Mana cost:** {2}{G}{W}

**Oracle text:**

```
Survival — At the beginning of your second main phase, if Rip is tapped, reveal the top X cards of your library, where X is its power. Put any number of creature and/or Vehicle cards with different powers from among them into your hand. Put the rest on the bottom of your library in a random order.
```

**Current tags:** `condition.cares_subtype.vehicle`, `effect.look_at_top_n`

### Issues

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** Card reveals the top X cards and puts any number of qualifying cards into hand — equivalent to drawing them (matches v0.21.0 "reveal-to-hand" broadening pattern).
  - **Evidence vs reality:** anchors "reveal the top X cards" + "put ... into your hand" should match the broadened draws_or_discards rule.
  - **Suggested fix:** broaden `effect.draws_or_discards` to fire on "reveal the top N ... put ... into your hand" with a subset-selection clause (any number of, all, target).
---

## Say Its Name  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Sorcery
**Mana cost:** {1}{G}

**Oracle text:**

```
Mill three cards. Then you may return a creature or land card from your graveyard to your hand.
Exile this card and two other cards named Say Its Name from your graveyard: Search your graveyard, hand, and/or library for a card named Altanak, the Thrice-Called and put it onto the battlefield. If you search your library this way, shuffle. Activate only as a sorcery.
```

**Current tags:** `condition.cares_lands`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.mill`, `effect.reanimate`, `effect.return_from_graveyard_to_hand`

### Issues

- **missing**: `effect.cheat_into_play`
  - **What's wrong:** The activated ability searches `your graveyard, hand, and/or library` for Altanak and puts it onto the battlefield without paying its cost — that's cheat-into-play when the find is in hand or library.
  - **Evidence vs reality:** anchor "search your ... hand, and/or library for a card named ... and put it onto the battlefield" matches the cheat-from-non-graveyard-zone family.
  - **Suggested fix:** broaden `effect.cheat_into_play` to fire on "search your ... hand ... and put it onto the battlefield" / "search your library for ... and put it onto the battlefield".

---

## Sheltered by Ghosts  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Enchantment — Aura
**Mana cost:** {1}{W}

**Oracle text:**

```
Enchant creature you control
When this Aura enters, exile target nonland permanent an opponent controls until this Aura leaves the battlefield.
Enchanted creature gets +1/+0 and has lifelink and ward {2}.
```

**Current tags:** `effect.exile_artifact`, `effect.exile_creature`, `effect.exile_enchantment`, `effect.exile_from_battlefield`, `effect.exile_planeswalker`, `effect.grants_lifelink`, `effect.grants_stat_buff`, `trigger.self_etb`

### Issues

- **missing**: `effect.grants_ward` (does not exist in catalog)
  - **What's wrong:** Card grants ward {2} to the enchanted creature via aura — no `effect.grants_ward` analog in catalog.
  - **Evidence vs reality:** oracle text contains "has lifelink and ward {2}"; only the lifelink half is captured.
  - **Suggested fix:** Add `effect.grants_ward` rule (and tagDef) mirroring `effect.grants_lifelink` shape.
---

## Shepherding Spirits  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Creature — Spirit
**Mana cost:** {4}{W}{W}

**Oracle text:**

```
Flying
Plainscycling {2} ({2}, Discard this card: Search your library for a Plains card, reveal it, put it into your hand, then shuffle.)
```

**Current tags:** `effect.has_cycling`, `effect.has_flying`

### Issues

- **missing**: `effect.tutors_basic_land`
  - **What's wrong:** Plainscycling tutors a Plains (basic land) from library to hand; `effect.tutors_basic_land` should fire.
  - **Evidence vs reality:** evidence would be "search your library for a plains card", but rule likely requires "basic" or "basic land" wording and skips typecycling reminder.
  - **Suggested fix:** Broaden `effect.tutors_basic_land` to match typecycling reminder ("search your library for a (plains|island|swamp|mountain|forest) card") or add a typecycling pattern.
---

## Shrewd Storyteller  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Creature — Human Survivor
**Mana cost:** {1}{G}{W}

**Oracle text:**

```
Survival — At the beginning of your second main phase, if this creature is tapped, put a +1/+1 counter on target creature.
```

**Current tags:** `effect.counter_modified`, `effect.plus_one_counter`

### Issues

- **missing**: `condition.survival`, `trigger.second_main_phase` (do not exist in catalog — known gaps)
  - **What's wrong:** Card's only trigger ("Survival — At the beginning of your second main phase, if this creature is tapped") is uncaptured by any trigger/condition tag.
  - **Evidence vs reality:** evidence is "Survival —" + "second main phase" + "if this creature is tapped"; no `trigger.second_main_phase`, no `condition.survival`, no `condition.tapped_self` either.
  - **Suggested fix:** Add `condition.survival` and `trigger.second_main_phase` per known v0.21.0 gaps.
---

## Skullsnap Nuisance  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Creature — Insect Skeleton
**Mana cost:** {U}{B}

**Oracle text:**

```
Flying
Eerie — Whenever an enchantment you control enters and whenever you fully unlock a Room, surveil 1. (Look at the top card of your library. You may put it into your graveyard.)
```

**Current tags:** `condition.cares_enchantments`, `effect.has_flying`, `effect.surveil`, `trigger.another_enchantment_etb`

### Issues

- **missing**: `condition.eerie`, `trigger.door_unlocked` (do not exist in catalog — known gaps)
  - **What's wrong:** "Eerie —" mechanic + Room "fully unlock" trigger are uncaptured.
  - **Evidence vs reality:** evidence is "Eerie —" and "whenever you fully unlock a Room"; neither maps to a catalog tag.
  - **Suggested fix:** Add `condition.eerie` and `trigger.door_unlocked` per known v0.21.0 gaps.
---

## Slavering Branchsnapper  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Creature — Lizard
**Mana cost:** {4}{G}{G}

**Oracle text:**

```
Trample
Forestcycling {2} ({2}, Discard this card: Search your library for a Forest card, reveal it, put it into your hand, then shuffle.)
```

**Current tags:** `effect.has_cycling`, `effect.has_trample`

### Issues

- **missing**: `effect.tutors_basic_land`
  - **What's wrong:** Forestcycling tutors a Forest (basic land) from library to hand; rule doesn't fire on typecycling reminder text.
  - **Evidence vs reality:** evidence would be "search your library for a forest card"; same pattern as Shepherding Spirits.
  - **Suggested fix:** Broaden `effect.tutors_basic_land` to catch typecycling reminder (or add typecycling-specific pattern).
---

## Smoky Lounge // Misty Salon  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Enchantment — Room // Enchantment — Room
**Mana cost:** {2}{R} // {3}{U}

**Oracle text:**

```
At the beginning of your first main phase, add {R}{R}. Spend this mana only to cast Room spells and unlock doors.

When you unlock this door, create an X/X blue Spirit creature token with flying, where X is the number of unlocked doors among Rooms you control.
```

**Current tags:** `effect.add_mana`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_evasion`, `effect.is_room`, `effect.ramp_nonland`

### Issues

- **missing**: `trigger.door_unlocked`, `trigger.beginning_of_main_phase` (do not exist in catalog — known gaps)
  - **What's wrong:** Both triggers — "At the beginning of your first main phase" and "When you unlock this door" — are uncaptured.
  - **Evidence vs reality:** evidence is "at the beginning of your first main phase" and "when you unlock this door"; no catalog match.
  - **Suggested fix:** Add `trigger.door_unlocked` per known gap; consider adding `trigger.beginning_of_main_phase`.
---

## Spectral Snatcher  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Creature — Spirit
**Mana cost:** {4}{B}{B}

**Oracle text:**

```
Ward—Discard a card.
Swampcycling {2} ({2}, Discard this card: Search your library for a Swamp card, reveal it, put it into your hand, then shuffle.)
```

**Current tags:** `effect.draws_or_discards`, `effect.has_cycling`, `effect.has_ward`

### Issues

- **false-positive**: `effect.draws_or_discards`
  - **What's wrong:** The "discard a card" match is the Ward em-dash cost (opponent pays to counter ward), not a card effect this permanent produces.
  - **Evidence vs reality:** evidence was "—discard a card", but this is a Ward cost suffix paid by the casting opponent, not the card's own discard effect.
  - **Suggested fix:** Narrow rule to exclude "ward[—-]discard a card" prefix (and other ward-cost patterns).
- **missing**: `effect.tutors_basic_land`
  - **What's wrong:** Swampcycling tutors a Swamp; same typecycling gap as Shepherding Spirits / Slavering Branchsnapper.
  - **Evidence vs reality:** "search your library for a swamp card" not matched.
  - **Suggested fix:** Broaden `effect.tutors_basic_land` for typecycling reminder text.
---

## Spineseeker Centipede  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Creature — Insect
**Mana cost:** {2}{G}

**Oracle text:**

```
When this creature enters, search your library for a basic land card, reveal it, put it into your hand, then shuffle.
Delirium — This creature gets +1/+2 and has vigilance as long as there are four or more card types among cards in your graveyard.
```

**Current tags:** `condition.cares_graveyard`, `effect.grants_stat_buff`, `effect.grants_vigilance`, `effect.tutors_basic_land`, `trigger.self_etb`

### Issues

- **missing**: `condition.delirium` (does not exist in catalog — known gap)
  - **What's wrong:** "Delirium —" mechanic uncaptured beyond `condition.cares_graveyard`.
  - **Evidence vs reality:** evidence "Delirium —" and "four or more card types among cards in your graveyard"; only the generic graveyard-care fires.
  - **Suggested fix:** Add `condition.delirium` per known v0.21.0 gap.
---

## Sporogenic Infection  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Enchantment — Aura
**Mana cost:** {1}{B}

**Oracle text:**

```
Enchant creature
When this Aura enters, target player sacrifices a creature of their choice other than enchanted creature.
When enchanted creature is dealt damage, destroy it.
```

**Current tags:** `effect.destroy_creature`, `effect.edict`, `effect.sacrifice_creature`, `trigger.damage_dealt`, `trigger.self_etb`

### Issues

- **false-positive**: `effect.sacrifice_creature`
  - **What's wrong:** Card is an edict ("target player sacrifices"), not a self-sacrifice cost/effect. Listed recurring failure: typed-sacrifice leaks on edict / observer triggers.
  - **Evidence vs reality:** evidence was "sacrifices a creature" matched on "target player sacrifices a creature of their choice"; the controller of the sacrifice is "target player", not the card's controller.
  - **Suggested fix:** Narrow `effect.sacrifice_creature` to exclude "target player sacrifices" / "each player sacrifices" / "an opponent sacrifices".
---

## Stalked Researcher  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Creature — Human Wizard
**Mana cost:** {1}{U}

**Oracle text:**

```
Defender
Eerie — Whenever an enchantment you control enters and whenever you fully unlock a Room, this creature can attack this turn as though it didn't have defender.
```

**Current tags:** `condition.cares_enchantments`, `trigger.another_enchantment_etb`, `trigger.attack_or_block`

### Issues

- **false-positive**: `trigger.attack_or_block`
  - **What's wrong:** Card has no attacks/blocks trigger; "this creature can attack this turn" is a static permission, not a trigger that fires on attacks.
  - **Evidence vs reality:** evidence was "whenever an enchantment you control enters... this creature can attack"; the "whenever" only scopes the enchantment-ETB trigger, and the consequent "can attack" is a static permission clause, not its own trigger.
  - **Suggested fix:** Narrow `trigger.attack_or_block` regex to not match "can attack" / "this creature can attack" — require an actual "whenever <X> attacks/blocks" head clause.
- **missing**: `condition.eerie`, `trigger.door_unlocked` (known catalog gaps)
  - **What's wrong:** Eerie mechanic + Room unlock trigger uncaptured.
  - **Suggested fix:** Add per known v0.21.0 gaps.
---

## Surgical Suite // Hospital Room  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Enchantment — Room // Enchantment — Room
**Mana cost:** {1}{W} // {3}{W}

**Oracle text:**

```
When you unlock this door, return target creature card with mana value 3 or less from your graveyard to the battlefield.

Whenever you attack, put a +1/+1 counter on target attacking creature.
```

**Current tags:** `condition.cares_low_mana_value`, `effect.counter_modified`, `effect.is_room`, `effect.plus_one_counter`, `effect.reanimate`, `trigger.attack_or_block`

### Issues

- **missing**: `trigger.door_unlocked` (does not exist in catalog — known gap)
  - **What's wrong:** "When you unlock this door" trigger uncaptured.
  - **Evidence vs reality:** "When you unlock this door"; no tag.
  - **Suggested fix:** Add `trigger.door_unlocked` per known v0.21.0 gap.

---

## The Mindskinner  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Legendary Enchantment Creature — Nightmare
**Mana cost:** {U}{U}{U}

**Oracle text:**

```
The Mindskinner can't be blocked.
If a source you control would deal damage to an opponent, prevent that damage and each opponent mills that many cards.
```

**Current tags:** `effect.mill`, `effect.unblockable`

### Issues

- **missing**: `effect.prevent_damage`
  - **What's wrong:** Card has a replacement effect that prevents damage ("prevent that damage and each opponent mills that many cards") but is not tagged as a damage-preventer.
  - **Evidence vs reality:** text contains `"prevent that damage"`, which is the canonical Fog/Healing-Salve language the tag is meant to cover.
  - **Suggested fix:** Broaden `effect.prevent_damage` regex to match "prevent that damage" inside a replacement-effect clause (would deal damage … prevent that damage).

---

## The Rollercrusher Ride  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Legendary Enchantment
**Mana cost:** {X}{2}{R}

**Oracle text:**

```
Delirium — If a source you control would deal noncombat damage to a permanent or player while there are four or more card types among cards in your graveyard, it deals double that damage instead.
When The Rollercrusher Ride enters, it deals X damage to each of up to X target creatures.
```

**Current tags:** `condition.cares_graveyard`, `condition.has_x_in_cost`, `effect.deals_damage`, `trigger.self_etb`

### Issues

- **missing**: `effect.amplifies_damage_or_lifeloss`
  - **What's wrong:** Card has a Furnace-of-Rath-style damage-doubling replacement effect that isn't tagged.
  - **Evidence vs reality:** text contains `"it deals double that damage instead"`, the canonical amplifier phrasing.
  - **Suggested fix:** Broaden `effect.amplifies_damage_or_lifeloss` to catch "deal[s] double that damage … instead" replacement-effect form.
- **missing**: `condition.delirium` (known coverage gap — Delirium kicker not yet tagged).

---

## The Swarmweaver  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Legendary Artifact Creature — Scarecrow
**Mana cost:** {2}{B}{G}

**Oracle text:**

```
When The Swarmweaver enters, create two 1/1 black and green Insect creature tokens with flying.
Delirium — As long as there are four or more card types among cards in your graveyard, Insects and Spiders you control get +1/+1 and have deathtouch.
```

**Current tags:** `condition.cares_graveyard`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_evasion`, `effect.grants_stat_buff`, `trigger.self_etb`

### Issues

- **missing**: `effect.grants_deathtouch`
  - **What's wrong:** Anthem grants deathtouch to a tribal subset but the deathtouch-grant tag never fires.
  - **Evidence vs reality:** text contains `"Insects and Spiders you control get +1/+1 and have deathtouch"`, a conditional anthem granting deathtouch.
  - **Suggested fix:** Broaden `effect.grants_deathtouch` to catch tribal anthem "<tribe>s you control … have deathtouch" pattern.
- **missing**: `condition.cares_tribe.insect`, `condition.cares_tribe.spider` (coverage gap — no Insect/Spider tribe in catalog).
- **missing**: `condition.delirium` (known coverage gap).

---

## The Tale of Tamiyo  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Legendary Enchantment — Saga
**Mana cost:** {2}{U}

**Oracle text:**

```
(As this Saga enters and after your draw step, add a lore counter. Sacrifice after IV.)
I, II, III — Mill two cards. If two cards that share a card type were milled this way, draw a card and repeat this process.
IV — Exile any number of target instant, sorcery, and/or Tamiyo planeswalker cards from your graveyard. Copy them. You may cast any number of the copies.
```

**Current tags:** `effect.draws_or_discards`, `effect.exile_from_graveyard`, `effect.mill`

### Issues

- **missing**: `effect.copy_spell`
  - **What's wrong:** IV chapter copies exiled instant/sorcery/planeswalker cards but no copy-spell tag fires.
  - **Evidence vs reality:** text contains `"Copy them. You may cast any number of the copies."` — verbatim copy-spell pattern.
  - **Suggested fix:** Broaden `effect.copy_spell` to catch graveyard-exile-then-copy form ("Exile … Copy them. You may cast any number of the copies").
- **missing**: `effect.cast_from_exile`
  - **What's wrong:** The cards are exiled from graveyard, then copies are cast — canonical cast-from-exile pattern.
  - **Evidence vs reality:** text contains `"Exile any number of target … cards from your graveyard. Copy them. You may cast any number of the copies."`
  - **Suggested fix:** Treat exile-then-copy-then-cast as cast-from-exile.
- **missing**: `effect.cast_for_free`
  - **What's wrong:** Copies have no mana cost; "you may cast any number of the copies" is a free-cast.
  - **Evidence vs reality:** copies are cast without paying mana.
  - **Suggested fix:** Detect "you may cast … the copies" as a free-cast trigger.
- **missing**: `condition.cares_graveyard`
  - **What's wrong:** IV chapter references "from your graveyard".
  - **Evidence vs reality:** text contains `"target … cards from your graveyard"`.
  - **Suggested fix:** Ensure `condition.cares_graveyard` matches "from your graveyard" in target clauses.

---

## The Wandering Rescuer  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Legendary Creature — Human Samurai Noble
**Mana cost:** {3}{W}{W}

**Oracle text:**

```
Flash
Convoke (Your creatures can help cast this spell. Each creature you tap while casting this spell pays for {1} or one mana of that creature's color.)
Double strike
Other tapped creatures you control have hexproof.
```

**Current tags:** `effect.grants_hexproof`, `effect.has_double_strike`, `effect.has_first_strike`, `effect.has_flash`

### Issues

- **missing**: `effect.has_convoke` (known coverage gap — Convoke not yet in catalog).

---

## Thornspire Verge  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

No issues — tags accurate (`condition.cares_lands`, `effect.add_mana`, `effect.has_activated_ability`).

---

## Threats Around Every Corner  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

No issues — tags accurate. No "face-down permanent enters" trigger exists in catalog; mild coverage gap for cloak/disguise payoffs but no defined tag to flag.

---

## Ticket Booth // Tunnel of Hate  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Enchantment — Room // Enchantment — Room
**Mana cost:** {2}{R} // {4}{R}{R}

**Oracle text:**

```
When you unlock this door, manifest dread.

Whenever you attack, target attacking creature gains double strike until end of turn.
```

**Current tags:** `effect.cloak`, `effect.grants_double_strike`, `effect.grants_first_strike`, `effect.is_room`, `trigger.attack_or_block`

### Issues

- **missing**: `trigger.door_unlocked` (known coverage gap).

---

## Toby, Beastie Befriender  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Legendary Creature — Human Wizard
**Mana cost:** {2}{W}

**Oracle text:**

```
When Toby enters, create a 4/4 white Beast creature token with "This token can't attack or block alone."
As long as you control four or more creature tokens, creature tokens you control have flying.
```

**Current tags:** `condition.cares_tokens`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_evasion`, `trigger.self_etb`

### Issues

- **missing**: `condition.cares_tribe.beast` (coverage gap — no Beast tribe in catalog).

---

## Trapped in the Screen  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

No issues — tags accurate.

---

## Trial of Agony  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

No issues — tags accurate. "Can't block this turn" is one-direction temporary, doesn't match `effect.pacify`'s "can't attack or block" canonical form.

---

## Tunnel Surveyor  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

No issues — tags accurate.

---

## Turn Inside Out  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Instant
**Mana cost:** {R}

**Oracle text:**

```
Target creature gets +3/+0 until end of turn. When it dies this turn, manifest dread.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.cloak`, `effect.grants_stat_buff`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `trigger.creature_dies`
  - **What's wrong:** Delayed-trigger "when it dies this turn" is a dies-trigger but the tag never fires.
  - **Evidence vs reality:** text contains `"When it dies this turn, manifest dread"`, an anaphoric delayed-dies trigger.
  - **Suggested fix:** Broaden `trigger.creature_dies` to match "when it dies" / "when it dies this turn" anaphoric delayed triggers.

---

## Twist Reality  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

No issues — tags accurate.

---

## Twitching Doll  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Artifact Creature — Spider Toy
**Mana cost:** {1}{G}

**Oracle text:**

```
{T}: Add one mana of any color. Put a nest counter on this creature.
{T}, Sacrifice this creature: Create a 2/2 green Spider creature token with reach for each counter on this creature. Activate only as a sorcery.
```

**Current tags:** `effect.add_mana`, `effect.counter_modified`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_reach`, `effect.has_activated_ability`, `effect.ramp_nonland`, `effect.sacrifice_creature`

### Issues

- **missing**: `effect.has_mana_activated_ability`
  - **What's wrong:** Card has a `{T}: Add one mana of any color` activated mana ability — canonical mana-cost-includes form per the tagDef ("cost includes mana"). The tap-and-sacrifice ability also has mana implied via the activation cost line being mana-free, so this is at minimum the first ability.
  - **Evidence vs reality:** text contains `"{T}: Add one mana of any color"`, an activated ability — but per tagDef this tag fires when the cost includes mana, which {T} does not. Re-read confirms tag scope; this may be a near-miss not a gap. Flag for reviewer.
  - **Suggested fix:** Confirm whether there is a producer-side companion tag; if not, no fix needed.
- **missing**: `condition.cares_tribe.spider` (coverage gap — no Spider tribe in catalog).

NOTE: After re-reading the `effect.has_mana_activated_ability` description ("cost includes mana"), the first {T}: activation has no mana cost, so the tag is correctly NOT firing. Demote this finding.

---

## Tyvar, the Pummeler  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

No issues — tags accurate. `effect.has_mana_activated_ability` correctly fires on the `{3}{G}{G}:` activated ability (cost includes mana).

---

## Unable to Scream  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

No issues — `effect.loses_abilities` is correct. No `is_aura` tag exists in catalog; the type-change-to-Toy effect has no dedicated tag.

---

## Undead Sprinter  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

No issues — tags accurate. `condition.cast_from_graveyard` is keyword-scoped per its description (Flashback/Disturb/etc.); Undead Sprinter uses an ad-hoc conditional cast-from-graveyard, so the tag is correctly NOT firing.

---

## Under the Skin  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Sorcery
**Mana cost:** {2}{G}

**Oracle text:**

```
Manifest dread.
You may return a permanent card from your graveyard to your hand.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.cloak`, `effect.is_instant_or_sorcery`, `effect.return_from_graveyard_to_hand`

### Issues

- **missing**: `condition.cares_graveyard`
  - **What's wrong:** Card references "from your graveyard" as effect source but does not fire the cares_graveyard condition.
  - **Evidence vs reality:** text contains `"return a permanent card from your graveyard to your hand"`.
  - **Suggested fix:** Ensure `condition.cares_graveyard` matches "from your graveyard" in return-target clauses.

---

## Underwater Tunnel // Slimy Aquarium  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Enchantment — Room // Enchantment — Room
**Mana cost:** {U} // {3}{U}

**Oracle text:**

```
When you unlock this door, surveil 2.

When you unlock this door, manifest dread, then put a +1/+1 counter on that creature.
```

**Current tags:** `effect.cloak`, `effect.counter_modified`, `effect.is_room`, `effect.plus_one_counter`, `effect.surveil`

### Issues

- **missing**: `trigger.door_unlocked` (known coverage gap).

---

## Unidentified Hovership  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Artifact — Vehicle
**Mana cost:** {1}{W}{W}

**Oracle text:**

```
Flying
When this Vehicle enters, exile up to one target creature with toughness 5 or less.
When this Vehicle leaves the battlefield, the exiled card's owner manifests dread.
Crew 1
```

**Current tags:** `effect.exile_creature`, `effect.has_activated_ability`, `effect.has_flying`, `trigger.artifact_leaves_battlefield`, `trigger.self_etb`

### Issues

- **missing**: `effect.cloak`
  - **What's wrong:** "manifests dread" is the manifest-dread keyword action which falls under the `effect.cloak` rule per its tagDef description, but it did not fire.
  - **Evidence vs reality:** normalized text contains `"manifests dread"`, but rule likely matches only the bare-verb `"manifest dread"` not the conjugated third-person form.
  - **Suggested fix:** broaden `effect.cloak` anchor to allow `manifests? dread`.
---

## Unstoppable Slasher  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Creature — Zombie Assassin
**Mana cost:** {2}{B}

**Oracle text:**

```
Deathtouch
Whenever this creature deals combat damage to a player, they lose half their life, rounded up.
When this creature dies, if it had no counters on it, return it to the battlefield tapped under its owner's control with two stun counters on it.
```

**Current tags:** `effect.counter_modified`, `effect.has_deathtouch`, `effect.life_changed`, `effect.stun_counter`, `trigger.creature_dies`, `trigger.damage_dealt`

### Issues

- **missing**: `effect.reanimate`
  - **What's wrong:** "when this creature dies, ... return it to the battlefield" is the dies-return anaphoric self-reanimation pattern the v0.21.0 release notes call out as newly handled.
  - **Evidence vs reality:** normalized text contains `"when this creature dies, ... return it to the battlefield"`, but `effect.reanimate` did not fire.
  - **Suggested fix:** extend `effect.reanimate` anaphoric template to cover dies-trigger self-return (similar to Enduring).
---

## Unwanted Remake  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Instant
**Mana cost:** {W}

**Oracle text:**

```
Destroy target creature. Its controller manifests dread.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.destroy_creature`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.cloak`
  - **What's wrong:** "manifests dread" is the manifest-dread keyword action (third-person conjugation) which the cloak rule should recognize.
  - **Evidence vs reality:** normalized text contains `"manifests dread"`, but `effect.cloak` did not fire (likely matches only bare `"manifest dread"`).
  - **Suggested fix:** broaden `effect.cloak` anchor to allow `manifests? dread`.
---

## Vile Mutilator  <!-- audited 2026-05-31, ruleVersion v0.21.0 -->

**Type:** Creature — Demon
**Mana cost:** {5}{B}{B}

**Oracle text:**

```
As an additional cost to cast this spell, sacrifice a creature or enchantment.
Flying, trample
When this creature enters, each opponent sacrifices a nontoken enchantment of their choice, then sacrifices a nontoken creature of their choice.
```

**Current tags:** `effect.has_flying`, `effect.has_trample`, `effect.sacrifice_creature`, `effect.sacrifice_enchantment`, `trigger.self_etb`

### Issues

- **missing**: `effect.edict`
  - **What's wrong:** The ETB makes each opponent sacrifice a creature AND an enchantment — canonical edict effect that should fire.
  - **Evidence vs reality:** normalized text contains `"each opponent sacrifices a nontoken enchantment ... sacrifices a nontoken creature"`, but `effect.edict` did not fire.
  - **Suggested fix:** ensure `effect.edict` regex covers "each opponent sacrifices a <type>" (currently may require just "sacrifice"/"target opponent sacrifices").
