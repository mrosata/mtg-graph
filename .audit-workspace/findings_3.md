# Auditor 3 findings — 25 cards

## Dire Flail // Dire Blunderbuss

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
  - **What's wrong:** This is a unilateral attack-trigger damage effect (granted via Equipment), not a fight. The target creature does not deal damage back.
  - **Evidence vs reality:** evidence was `"creature deals damage equal to its power to target creature"`. PATTERN_SHAPED regex `\bcreatures?(?:\s+you control)?[^.]{0,140}?…deals damage equal to its power to target creature` accepts "this creature" since `\bcreatures?` only requires a word-boundary before "creature". Real fight semantics need mutual damage (Graceful Takedown frame uses plural creatures dealing damage to each other).
  - **Suggested fix:** Constrain PATTERN_SHAPED subject to require `creatures?` to actually be the head noun (e.g. negative lookbehind for "this " / "the " / "that " / `__self__`), or require a plural-deal frame ("creatures... each deal").

---

## Disturbed Slumber

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
  - **Evidence vs reality:** "becomes a 4/4 Dinosaur creature with reach and haste" — both keywords are granted, but the rule only catches keywords after the connector inside the `with` clause.
  - **Suggested fix:** Extend Frame (e) of `effect.grants_keyword` to also match the first keyword in the with-clause: `with\s+${kw}\b` (with bounded preceding filler) — not only the comma/and-prefixed continuation.

---

## Dowsing Device // Geode Grotto

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
  - **Evidence vs reality:** Oracle has "this artifact … enters" — `trigger.self_etb` semantically applies but the combined "this X or another X" templating is not recognized.
  - **Suggested fix:** Allow `trigger.self_etb` to match the combined form `whenever this <type> or another …<type> … enters`.

- **missing**: `trigger.another_artifact_etb`
  - **What's wrong:** Same combined clause is also an "another artifact ETB" trigger but the rule's regex doesn't cover the "whenever this artifact or another artifact …" templating.
  - **Evidence vs reality:** Pattern `whenever (?:a |an |another |one or more )?artifacts?` requires "another artifact" alone, not embedded after "this artifact or".
  - **Suggested fix:** Broaden `trigger.another_artifact_etb` to also recognize `whenever this artifact or another artifact …enters` (similarly extend for creature/enchantment ETB; this dual-form templating is common in Bloomburrow/OTJ).

---

## Echoing Deeps

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
  - **What's wrong:** The card enters as a copy of any land card in a graveyard. `effect.copy_permanent`'s ENTER_AS_COPY regex `\benter(?:s)? as a copy of\b` fails because oracle text reads "enter **tapped** as a copy of".
  - **Evidence vs reality:** Oracle "enter tapped as a copy of any land card in a graveyard" is squarely the copy-permanent mechanic (Mockingbird/Vesuva family) but the inserted "tapped" breaks the literal regex.
  - **Suggested fix:** Update ENTER_AS_COPY to `\benter(?:s)?(?:\s+\w+){0,2}\s+as a copy of\b` to admit "enter tapped as a copy of" and similar modifier insertions ("enter transformed as a copy").

---

## Explorer's Cache

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
  - **What's wrong:** Oracle has "Whenever a creature you control with a +1/+1 counter on it dies" — a classic creature-dies trigger — but the tag doesn't fire.
  - **Evidence vs reality:** Regex `(?:[\w\- ]{0,30}?\s+)?(?:creature|__self__)(?:\s+[\w']+){0,4}\s+dies` caps post-"creature" filler at 4 word tokens. Here "you control with a +1/+1 counter on it dies" is 8 tokens (and `+1/+1` contains slashes not matched by `\w`).
  - **Suggested fix:** Raise post-creature filler from `{0,4}` to `{0,10}` and allow `+1/+1` style tokens (or strip "+1/+1 counter" pre-match like other rules do for stripping framing).

---

## Fabrication Foundry

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
  - **What's wrong:** The exile cost targets battlefield artifacts ("Exile one or more other artifacts you control"), not graveyard cards. The "from your graveyard" phrase belongs to the unrelated reanimate clause ("Return target artifact card … from your graveyard").
  - **Evidence vs reality:** evidence was `"exile one or more other artifacts you control with total mana value x: return target artifact card with mana value x or less from your graveyard"`. The OWN_QUANTIFIED arm `exile one or more .+? from your graveyard(?!s*\s*[:—])` greedily spans the `: ` activation separator and the entire return clause to reach "from your graveyard" downstream.
  - **Suggested fix:** Constrain OWN_QUANTIFIED to stop at clause boundaries (forbid `:`, `.`, em-dash inside the `.+?` filler) so it cannot span an activation separator into a different effect.

---

## Gishath, Sun's Avatar

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
  - **Evidence vs reality:** PATTERN_PLURAL requires "top <N> cards of [whose] library" — number BEFORE "cards", "of" connector. Gishath uses "<N> cards from the top of … library" (different connector).
  - **Suggested fix:** Add alt pattern `\b(?:reveal|look at) (?:\d+|x|one|...|that many) cards from the top of [\w\s']+? library\b`.

- **coverage-gap**: no `effect.cheat_into_play` exists
  - **What's wrong:** "Put any number of Dinosaur creature cards from among them onto the battlefield" is a library-cheat-into-play effect. The catalog has tutors and reanimate but nothing for "put card from hand/library/exile onto the battlefield" (Sneak Attack, Elvish Piper, Gishath, Ghalta Stampede Tyrant, See the Unwritten, Selvala's Stampede). This is a recurring effect family.
  - **Suggested fix:** Add `effect.cheat_into_play` (or `effect.put_card_onto_battlefield`) covering "put [card description] from your hand/library/exile onto the battlefield" (excluding reanimate which already exists).

---

## Coverage-gap reminders (known systemic, not relitigated per card)

- **Descend N** condition: Echo of Dusk ("Descend 4"), Enterprising Scallywag ("if you descended this turn"), Frilled Cave-Wurm ("Descend 4 —") all lack a `condition.descend` tag — confirmed multiple times in this batch.
- **Map token creation**: Fanatical Offering, Get Lost both create Map tokens. No `effect.create_map` exists though sibling tags `effect.create_clue`, `effect.create_food`, `effect.create_treasure`, `effect.create_role` are all present.

---

## Clean cards (no issues found)

- Disruptor Wanderglyph
- Dreadmaw's Ire
- Dusk Rose Reliquary
- Earthshaker Dreadmaw
- Eaten by Piranhas
- Echo of Dusk (modulo descend coverage gap)
- Enterprising Scallywag (modulo descend coverage gap)
- Envoy of Okinec Ahau
- Etali's Favor
- Family Reunion
- Fanatical Offering (modulo Map coverage gap)
- Forgotten Monument
- Frilled Cave-Wurm (modulo descend coverage gap)
- Fungal Fortitude
- Gargantuan Leech
- Geological Appraiser
- Get Lost (modulo Map coverage gap)
- Ghalta, Stampede Tyrant (modulo cheat-into-play coverage gap)
