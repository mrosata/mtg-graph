# Auditor 5 findings — 25 cards

## Inti, Seneschal of the Sun

**Type:** Legendary Creature — Human Knight
**Mana cost:** {1}{R}

**Oracle text:**

```
Whenever you attack, you may discard a card. When you do, put a +1/+1 counter on target attacking creature. It gains trample until end of turn.
Whenever you discard one or more cards, exile the top card of your library. You may play that card until your next end step.
```

**Current tags:** `effect.counter_modified`, `effect.draws_or_discards`, `effect.exile_from_library`, `effect.grants_trample`, `effect.plus_one_counter`, `trigger.attack_or_block`

### Issues

- **missing:** `trigger.card_drawn_discarded`
  - **What's wrong:** Inti's second ability is "Whenever you discard one or more cards" — canonical card-discarded trigger that should fire.
  - **Evidence vs reality:** The rule regex in `pipeline/rules/trigger.card_drawn_discarded.ts` only allows `(?:draws?|discards?) a (?:<TYPE> )?card|<their> <first|...> card`. It does NOT accept the "one or more cards" quantifier, so this trigger silently misses on every "discard one or more" / "draw one or more" templating.
  - **Suggested fix:** Add a `one or more (?:<TYPE> )?cards?` alternative to the trigger-object pattern.

---

## Intrepid Paleontologist

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

- **missing:** `condition.cares_exile_pile`
  - **What's wrong:** "cards you own exiled with this creature" is the canonical "exile pile as resource" templating (pattern 2 in the rule's own comments — "cards exiled with __self__").
  - **Evidence vs reality:** `pipeline/rules/condition.cares_exile_pile.ts` pattern 2 is `/\bcards? exiled with __self__\b/`. Only the self-name-normalized form is recognized. Cards using "this creature" / "this artifact" instead of repeating the cardname silently miss (normalization does NOT rewrite "this creature" to `__SELF__`).
  - **Suggested fix:** Extend pattern 2 to `cards? exiled with (?:__self__|this (?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker))`.

---

## Inverted Iceberg // Iceberg Titan

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

- **missing:** `effect.mill`
  - **What's wrong:** "mill a card" is canonical modern mill wording. The rule misses it.
  - **Evidence vs reality:** `pipeline/rules/effect.mill.ts` defines `NUM = (?:\d+|one|two|...|twenty)`. The singular article "a" is not in NUM, so `mills? a cards?` never matches. Many recent cards use "mill a card" exclusively.
  - **Suggested fix:** Add `a|an` to the alternation, e.g. `mills? (?:a|an|<NUM>) cards?`.
- **coverage-gap:** no Craft mechanic tag (`effect.has_craft`). Small Standard family.

---

## Itzquinth, Firstborn of Gishath

**Type:** Legendary Creature — Dinosaur
**Mana cost:** {R}{G}

**Oracle text:**

```
Haste
When Itzquinth enters, you may pay {2}. When you do, target Dinosaur you control deals damage equal to its power to another target creature.
```

**Current tags:** `condition.cares_tribe.dinosaur`, `effect.has_haste`, `trigger.self_etb`

### Issues

- **missing:** `effect.fight` and `effect.causes_damage`
  - **What's wrong:** "target Dinosaur you control deals damage equal to its power to another target creature" is fight-shaped removal.
  - **Evidence vs reality:** Both `pipeline/rules/effect.fight.ts` (PATTERN_SHAPED) and `pipeline/rules/effect.causes_damage.ts` (CREATURE_PHRASE) require the subject noun to literally be "creature(s)". A tribe-name subject ("Dinosaur", "Vampire", "Knight") is unrecognized. Same hole applies to any "target <Tribe> you control deals damage..." templating.
  - **Suggested fix:** Allow a single capitalized tribe word as an alternative subject in both rules' subject patterns.

---

## Kaslem's Stonetree // Kaslem's Strider

**Type:** Artifact // Artifact Creature — Golem
**Mana cost:** (none)

**Oracle text:**

```
When this artifact enters, look at the top six cards of your library. You may put a land card from among them onto the battlefield tapped. Put the rest on the bottom in a random order.
Craft with Cave {5}{G} ({5}{G}, Exile this artifact, Exile a Cave you control or a Cave card from your graveyard: Return this card transformed under its owner's control. Craft only as a sorcery.)
```

**Current tags:** `condition.cares_subtype.cave`, `effect.look_at_top_n`, `trigger.self_etb`

### Issues

- **coverage-gap:** `effect.ramp_nonland` does not handle the "look at top N, put a land onto the battlefield" frame
  - **What's wrong:** This card puts a land directly into play (true ramp). The rule only recognizes "add {mana}" or "search your library for ... basic land ... onto the battlefield". The reveal/look-then-put-land family (Kaslem, Cultivator Colossus-style reveals) silently misses.
  - **Suggested fix:** Add a pattern matching `put a land card[^.]*?onto the battlefield` within a look/reveal clause.

---

## Kellan, Daring Traveler // Journey On

**Type:** Legendary Creature — Human Faerie Scout // Sorcery — Adventure
**Mana cost:** {1}{W} // {G}

**Oracle text:**

```
Whenever Kellan attacks, reveal the top card of your library. If it's a creature card with mana value 3 or less, put it into your hand. Otherwise, you may put it into your graveyard.

Create X Map tokens, where X is one plus the number of opponents who control an artifact. (Then exile this card. You may cast the creature later from exile.)
```

**Current tags:** `condition.cares_low_mana_value`, `effect.adventure_card`, `effect.cast_noncreature_spell`, `effect.create_token`, `effect.look_at_top_n`, `trigger.attack_or_block`

### Issues

- **coverage-gap:** no `effect.create_map` typed token-creation tag.
  - **What's wrong:** Map tokens are a real LCI mechanic (token sac-to-explore). Treasure/Food/Clue/Role all have typed tags; Map does not. Generic `effect.create_token` fires, but the typed axis is missing. Flagging as a family-level gap.

---

## Kitesail Larcenist

**Type:** Creature — Human Pirate
**Mana cost:** {2}{U}

**Oracle text:**

```
Flying, ward {1}
When this creature enters, for each player, choose up to one other target artifact or creature that player controls. For as long as this creature remains on the battlefield, the chosen permanents become Treasure artifacts with "{T}, Sacrifice this artifact: Add one mana of any color" and lose all other abilities.
```

**Current tags:** `effect.add_mana`, `effect.has_activated_ability`, `effect.has_evasion_intrinsic`, `effect.has_ward`, `effect.ramp_nonland`, `effect.sacrifice_artifact`, `trigger.self_etb`

### Issues

- **false-positive:** `effect.has_activated_ability`
  - **What's wrong:** The colon-frame activated ability lives inside the quoted granted ability that the chosen permanents *become*. Kitesail itself has no activated ability.
  - **Evidence vs reality:** evidence is `"{t}, sacrifice this artifact:"` — but that string is wrapped in the quotes of the "become Treasure artifacts with \"…\"" clause. The rule does not skip text inside paired quotes.
  - **Suggested fix:** Strip (or skip) quoted granted-ability text before scanning for colon-frames. This also fixes the next three false positives below.
- **false-positive:** `effect.add_mana`
  - **What's wrong:** "Add one mana of any color" lives inside the granted Treasure ability quote.
- **false-positive:** `effect.ramp_nonland`
  - **What's wrong:** Same root cause; Kitesail produces no mana on its own.
- **false-positive:** `effect.sacrifice_artifact`
  - **What's wrong:** "sacrifice this artifact" lives inside the granted Treasure ability quote; Kitesail itself does not sacrifice.
- **coverage-gap:** the actual mechanic (turn opponents' permanents into Treasures / strip abilities — a "soft pacify via type-change") has no dedicated tag.

---

## Kutzil, Malamet Exemplar

**Type:** Legendary Creature — Cat Warrior
**Mana cost:** {1}{G}{W}

**Oracle text:**

```
Your opponents can't cast spells during your turn.
Whenever one or more creatures you control each with power greater than its base power deals combat damage to a player, draw a card.
```

**Current tags:** `effect.draws_or_discards`, `trigger.damage_dealt`

### Issues

- **coverage-gap:** no stax-style "can't cast" restriction tag
  - **What's wrong:** "Your opponents can't cast spells during your turn" is a recurring restriction archetype (Defense Grid, Aven Mindcensor variants, Kutzil) with no tag. Family-level gap; would pair naturally as a counter to prowess / spell-cast triggers.

---

## Kutzil's Flanker

**Type:** Creature — Cat Warrior
**Mana cost:** {2}{W}

**Oracle text:**

```
Flash
When this creature enters, choose one —
• Put a +1/+1 counter on this creature for each creature that left the battlefield under your control this turn.
• You gain 2 life and scry 2.
• Exile target player's graveyard.
```

**Current tags:** `effect.counter_modified`, `effect.exile_from_graveyard`, `effect.has_flash`, `effect.life_changed`, `effect.plus_one_counter`, `effect.scry`, `trigger.self_etb`

### Issues

- **coverage-gap:** no `condition.cares_creatures_left_battlefield_this_turn`
  - **What's wrong:** Counts creatures that "left the battlefield under your control this turn" — broader than `cares_creatures_died_this_turn`. The morbid/aftermath axis only covers "died"; the "left battlefield" variant (Kutzil's Flanker, sacrifice-aristocrats payoffs) silently misses. Family-level gap.

---

## Magmatic Galleon

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

- **missing:** `effect.deals_damage`
  - **What's wrong:** "When this Vehicle enters, it deals 5 damage to target creature" is unambiguously a damage effect.
  - **Evidence vs reality:** `pipeline/rules/effect.deals_damage.ts` scopes the pronoun-"it" subject via lookbehind `(?<=: )it` — only matching when "it" follows an activated-ability colon. The ETB-style ", it deals" (comma-after-trigger-clause) never matches. This silently misses every "When this <type> enters, it deals N damage" templating — a common ETB-burn frame.
  - **Suggested fix:** Add an alternation accepting the pronoun "it" after `, ` inside an enter/trigger clause, e.g. a new pattern `\benters, it deals \d+ (?:combat )?damage\b` (and parallel for "equal to" / "X damage").
- **missing:** `trigger.damage_dealt`
  - **What's wrong:** "Whenever one or more creatures your opponents control are dealt excess noncombat damage" is a passive-voice damage trigger.
  - **Evidence vs reality:** `pipeline/rules/trigger.damage_dealt.ts` requires `whenever ... deals damage` (active voice only). Passive "are dealt" is unrecognized.
  - **Suggested fix:** Add `whenever (?:[^,.]*?) (?:is|are) dealt (?:\w+ )?damage` as a second alternative.

---

## Malamet Scythe

**Type:** Artifact — Equipment
**Mana cost:** {2}{G}

**Oracle text:**

```
Flash
When this Equipment enters, attach it to target creature you control.
Equipped creature gets +2/+2.
Equip {4} ({4}: Attach to target creature you control. Equip only as a sorcery.)
```

**Current tags:** `effect.grants_stat_buff`, `effect.has_flash`, `trigger.self_etb`

### Issues

- **coverage-gap:** `effect.has_activated_ability` does not recognize keyword-form Equip
  - **What's wrong:** Equip is rules-text-wise an activated ability ({N}: attach), but the keyword line "Equip {N}" has only reminder text that's stripped pre-tagging, so the colon-frame never appears in normalized text. Same hole applies to Reconfigure, Cycling-without-colon, etc. Family-level gap.

---

## Cards reviewed with no actionable issues

- In the Presence of Ages
- Ironpaw Aspirant
- Ixalli's Lorekeeper
- Jadelight Spelunker
- Jade Seedstones // Jadeheart Attendant
- Join the Dead  (Descend is a known v0.7 coverage gap, not relitigated)
- Kinjalli's Dawnrunner
- Lodestone Needle // Guidestone Compass
- Malamet Battle Glyph
- Malamet Brawler
- Malamet Veteran  (Descend is a known v0.7 coverage gap)
- Malamet War Scribe
- Malcolm, Alluring Scoundrel
- Malicious Eclipse

---

**Summary:**
- Cards audited: 25
- Cards with issues: 11
- Cards clean: 14
