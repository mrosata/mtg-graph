# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

## Known rejects (don't re-flag in future audits)

- **Rise of the Dark Realms** — `condition.cares_graveyard` "from … graveyards" broadening rejected (v0.29.0). Reanimate effects belong on `effect.reanimate`. See `condition.cares_graveyard.test.ts:70`.
- **Shivan Dragon** — `effect.grants_stat_buff` self-pump narrowing rejected (v0.29.0). Self-buff intentionally admitted per user memory `project_v021_non_evasion_grants.md`.
- **Caelorna, Coral Tyrant** — DEFERRED (data-ingest gap, not a rule fix). Card has empty `oracleText` in artifact; investigate `pipeline/stripScryfallCard` separately.

# Audit batch 2 — 2026-06-01 — 200 cards (48 issues)

# Audit Issues — Batch A (50 cards, 2026-06-01)

ruleVersion: v0.29.0

---

## Dredger's Insight  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Enchantment
**Mana cost:** {1}{G}

**Oracle text:**

```
Whenever one or more artifact and/or creature cards leave your graveyard, you gain 1 life.
When this enchantment enters, mill four cards. You may put an artifact, creature, or land card from among the milled cards into your hand. (To mill four cards, put the top four cards of your library into your graveyard.)
```

**Current tags:** `effect.life_changed`, `effect.mill`, `trigger.self_etb`

### Issues

- **missing**: `trigger.creature_leaves_graveyard`
  - **What's wrong:** Rule did not match the "leave your graveyard" trigger framing.
  - **Evidence vs reality:** oracle says `"whenever one or more artifact and/or creature cards leave your graveyard"` — canonical "leaves graveyard" trigger (plural-cards form).
  - **Suggested fix:** Broaden `trigger.creature_leaves_graveyard` to admit `"one or more <typed> cards leave your graveyard"` plural framing.

- **missing**: `effect.return_from_graveyard_to_hand`
  - **What's wrong:** "from among the milled cards into your hand" recovers from graveyard back to hand (milled cards live in the graveyard).
  - **Evidence vs reality:** the milled cards are in the graveyard at the moment of selection; choosing one to hand is recursion-to-hand. Rule probably keys on literal "from your graveyard" rather than the milled-pile anaphor.
  - **Suggested fix:** Consider broadening to include the "from among the milled cards … into your hand" template (mill-then-pick recursion).

---

## Earthrumbler  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Artifact — Vehicle
**Mana cost:** {4}{G}

**Oracle text:**

```
Vigilance, trample
Exile an artifact or creature card from your graveyard: This Vehicle becomes an artifact creature until end of turn.
Crew 3 (Tap any number of creatures you control with total power 3 or more: This Vehicle becomes an artifact creature until end of turn.)
```

**Current tags:** `condition.cares_artifacts`, `effect.has_activated_ability`, `effect.has_trample`, `effect.has_vigilance`

### Issues

- **missing**: `effect.exile_from_graveyard`
  - **What's wrong:** Activation cost "Exile an artifact or creature card from your graveyard" exiles a non-self card from graveyard; not self-exile, so the Renew-style exclusion doesn't apply.
  - **Evidence vs reality:** cost exiles ANY artifact/creature card from your graveyard (not "this card"), so the self-exile exclusion shouldn't apply.
  - **Suggested fix:** Ensure rule allows graveyard-cost activations that exile cards other than the source itself ("an artifact or creature card from your graveyard").

- **false-positive**: `condition.cares_artifacts`
  - **What's wrong:** Evidence "an artifact or creature card" is the graveyard-cost selector, not an artifact-count/payoff payoff.
  - **Evidence vs reality:** the tagDef scope is "artifact count, artifact ETBs, or artifacts you control" — this card just lets you pay by exiling an artifact OR creature from graveyard. No artifacts-matter payoff.
  - **Suggested fix:** Exclude `"artifact or creature card from your graveyard"` cost-template from `cares_artifacts`.

---

## Explosive Getaway  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Sorcery
**Mana cost:** {3}{R}{W}

**Oracle text:**

```
Exile up to one target artifact or creature. Return it to the battlefield under its owner's control at the beginning of the next end step.
Explosive Getaway deals 4 damage to each creature.
```

**Current tags:** `effect.board_wipe`, `effect.bounce_artifact`, `effect.cast_noncreature_spell`, `effect.deals_damage`, `effect.flicker`, `effect.is_instant_or_sorcery`, `trigger.beginning_of_end_step`

### Issues

- **false-positive**: `effect.bounce_artifact`
  - **What's wrong:** Evidence "exile up to one target artifact or creature. return" is a flicker effect, not bounce-to-hand.
  - **Evidence vs reality:** oracle says "Return it to the **battlefield** under its owner's control" — battlefield return, not hand return. Already correctly tagged `effect.flicker`. The bounce_artifact rule appears to swallow "exile … return" without disambiguating the destination.
  - **Suggested fix:** In `effect.bounce_artifact`, exclude follow-up clauses with "return it to the battlefield" (presumably already handled in bounce_creature; missed for the artifact arm).

---

## Fang-Druid Summoner  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Creature — Ape Druid
**Mana cost:** {3}{G}

**Oracle text:**

```
Reach
When this creature enters, you may search your library and/or graveyard for a creature card with no abilities, reveal it, and put it into your hand. If you search your library this way, shuffle.
```

**Current tags:** `effect.has_reach`, `trigger.self_etb`

### Issues

- **missing**: `effect.tutors_creature`
  - **What's wrong:** "search your library … for a creature card" is canonical creature tutor.
  - **Evidence vs reality:** the disjunctive "search your library **and/or** graveyard for a creature card" may not match a tutor rule expecting "search your library for" with no graveyard alternative.
  - **Suggested fix:** Broaden `effect.tutors_creature` to admit `"search your library and/or graveyard for a creature card"`.

- **missing**: `effect.return_from_graveyard_to_hand`
  - **What's wrong:** The "search graveyard for a creature card … put it into your hand" half is graveyard-to-hand recursion.
  - **Evidence vs reality:** the "and/or graveyard" half does graveyard-to-hand recovery; should fire.
  - **Suggested fix:** Broaden the return-from-graveyard-to-hand rule to admit "search your library and/or graveyard … put it into your hand".

---

## Far Fortune, End Boss  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Legendary Creature — Human Mercenary
**Mana cost:** {2}{B}{R}

**Oracle text:**

```
Start your engines! (If you have no speed, it starts at 1. It increases once on each of your turns when an opponent loses life. Max speed is 4.)
Whenever you attack, Far Fortune deals 1 damage to each opponent.
Max speed — If a source you control would deal damage to an opponent or a permanent an opponent controls, it deals that much damage plus 1 instead.
```

**Current tags:** `effect.deals_damage`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.amplifies_damage_or_lifeloss`
  - **What's wrong:** Max-speed clause is a damage-amplification replacement effect ("deals that much damage plus 1 instead") — Bloodletter / Wound Reflection family.
  - **Evidence vs reality:** "deals that much damage plus 1 instead" is the canonical additive replacement-effect phrasing; rule appears to require "twice" / "double" multipliers.
  - **Suggested fix:** Broaden `effect.amplifies_damage_or_lifeloss` to admit "deals that much damage plus N instead" (additive variant).

---

## Fearless Swashbuckler  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Creature — Fish Pirate
**Mana cost:** {1}{U}{R}

**Oracle text:**

```
Haste
Vehicles you control have haste.
Whenever you attack, if a Pirate and a Vehicle attacked this combat, draw three cards, then discard two cards.
```

**Current tags:** `condition.cares_subtype.vehicle`, `condition.cares_tribe.pirate`, `effect.draws_or_discards`, `effect.has_haste`, `trigger.attack_or_block`

### Issues

- **missing**: `effect.grants_haste`
  - **What's wrong:** "Vehicles you control have haste" grants haste to other permanents via static anthem.
  - **Evidence vs reality:** "<Type> you control have haste" is a canonical anthem-style keyword grant.
  - **Suggested fix:** Broaden `effect.grants_haste` to admit "<Type> you control have haste" (anthem-by-type pattern).

---

## Gas Guzzler  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Creature — Vampire Rogue
**Mana cost:** {B}

**Oracle text:**

```
Start your engines! (If you have no speed, it starts at 1. It increases once on each of your turns when an opponent loses life. Max speed is 4.)
This creature enters tapped.
Max speed — {B}, Sacrifice another creature or Vehicle: Draw a card.
```

**Current tags:** `condition.cares_subtype.vehicle`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.sacrifice_creature`

### Issues

- **missing**: `effect.sacrifice_artifact`
  - **What's wrong:** "Sacrifice another creature or Vehicle" cost — Vehicle is an artifact subtype, so the alternative sac covers an artifact.
  - **Evidence vs reality:** Vehicles are artifacts; sacrificing one IS sacrificing an artifact. Rule appears to need an explicit "artifact" lexeme.
  - **Suggested fix:** Broaden `effect.sacrifice_artifact` to admit "creature or Vehicle" multi-type sac costs (Vehicle implies artifact).

---

## Gastal Blockbuster  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Creature — Human Berserker
**Mana cost:** {2}{R}

**Oracle text:**

```
When this creature enters, you may sacrifice a creature or Vehicle. When you do, destroy target artifact an opponent controls.
```

**Current tags:** `condition.cares_subtype.vehicle`, `effect.destroy_artifact`, `effect.sacrifice_creature`, `trigger.self_etb`

### Issues

- **missing**: `effect.sacrifice_artifact`
  - **What's wrong:** Same "creature or Vehicle" pattern as Gas Guzzler — Vehicles are artifacts.
  - **Evidence vs reality:** sac cost covers a Vehicle (artifact). Currently only `sacrifice_creature` fires.
  - **Suggested fix:** Same fix — admit "creature or Vehicle" as artifact-sac trigger.

---

## Gonti, Night Minister  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Legendary Creature — Aetherborn Rogue
**Mana cost:** {2}{B}{B}

**Oracle text:**

```
Whenever a player casts a spell they don't own, that player creates a Treasure token.
Whenever a creature deals combat damage to one of your opponents, its controller looks at the top card of that opponent's library and exiles it face down. They may play that card for as long as it remains exiled. Mana of any type can be spent to cast a spell this way.
```

**Current tags:** `condition.cares_exile_pile`, `effect.cast_from_exile`, `effect.create_token`, `effect.create_treasure`, `trigger.damage_dealt`, `trigger.spell_cast`

### Issues

- **missing**: `effect.exile_from_library`
  - **What's wrong:** "looks at the top card of that opponent's library and exiles it face down" is library-top → exile, which is exactly `effect.exile_from_library`.
  - **Evidence vs reality:** rule probably keys on "exile the top card of your library" and misses the cross-controller framing ("that opponent's library").
  - **Suggested fix:** Broaden `effect.exile_from_library` to admit "top card of <player>'s library and exile(s) it".

---

## Guidelight Optimizer  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Artifact Creature — Robot
**Mana cost:** {1}{U}

**Oracle text:**

```
{T}: Add {U}. Spend this mana only to cast an artifact spell or activate an ability.
```

**Current tags:** `effect.add_mana`, `effect.has_activated_ability`, `effect.ramp_nonland`

### Issues

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** "Spend this mana only to cast an artifact spell" gates the mana's use on artifact spells — an artifact-payoff clause.
  - **Evidence vs reality:** the mana is restricted to artifact-spell casting, a "cares about artifacts" gate (artifact-mana fixing family).
  - **Suggested fix:** Broaden `condition.cares_artifacts` to admit "to cast an artifact spell" restriction template.

---

## Guidelight Pathmaker  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Artifact — Vehicle
**Mana cost:** {4}{W}{U}

**Oracle text:**

```
Vigilance
When this Vehicle enters, you may search your library for an artifact card and reveal it. Put it onto the battlefield if its mana value is 2 or less. Otherwise, put it into your hand. If you search your library this way, shuffle.
Crew 2
```

**Current tags:** `condition.cares_low_mana_value`, `effect.has_activated_ability`, `effect.has_vigilance`, `effect.tutors_artifact`, `trigger.self_etb`

### Issues

- **missing**: `effect.cheat_into_play`
  - **What's wrong:** "Put it onto the battlefield if its mana value is 2 or less" puts a searched card directly onto the battlefield — canonical cheat-into-play (search + battlefield).
  - **Evidence vs reality:** tagDef explicitly cites Guardian Sunmare for this pattern; Guidelight Pathmaker is the same shape with a conditional split (otherwise → hand).
  - **Suggested fix:** Broaden `effect.cheat_into_play` to admit "search your library for an X card … Put it onto the battlefield if <condition>" (conditional-cheat variant).

---

## Haunt the Network  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Sorcery
**Mana cost:** {3}{U}{B}

**Oracle text:**

```
Choose target opponent. Create two 1/1 colorless Thopter artifact creature tokens with flying. Then the chosen player loses X life and you gain X life, where X is the number of artifacts you control.
```

**Current tags:** `condition.cares_artifacts`, `effect.cast_noncreature_spell`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_evasion`, `effect.is_instant_or_sorcery`, `effect.life_changed`

### Issues

- **missing**: `effect.drain`
  - **What's wrong:** "the chosen player loses X life and you gain X life" is canonical unified drain.
  - **Evidence vs reality:** rule likely requires "each opponent" or tighter proximity; the "Choose target opponent. … the chosen player loses X life and you gain X life" indirection may slip through.
  - **Suggested fix:** Broaden `effect.drain` to admit "the chosen player loses X life and you gain X life" (singled-target-opponent variant).

---

## Intimidation Tactics  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Sorcery
**Mana cost:** {B}

**Oracle text:**

```
Target opponent reveals their hand. You choose an artifact or creature card from it. Exile that card.
Cycling {3} ({3}, Discard this card: Draw a card.)
```

**Current tags:** `condition.cares_artifacts`, `effect.cast_noncreature_spell`, `effect.has_cycling`, `effect.is_instant_or_sorcery`

### Issues

- **false-positive**: `condition.cares_artifacts`
  - **What's wrong:** Evidence "an artifact or creature card" is the hand-attack selector, not an artifact-payoff.
  - **Evidence vs reality:** the tagDef scope is "artifact count, artifact ETBs, or artifacts you control" — Intimidation Tactics exiles an artifact-or-creature card from hand; doesn't scale or trigger off artifact count/ETBs.
  - **Suggested fix:** Exclude the "an artifact or creature card from <hand>" hand-attack selector template from `cares_artifacts`.

---
---

## Kalakscion, Hunger Tyrant  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Legendary Creature — Crocodile
**Mana cost:** {1}{B}{B}

**Oracle text:**

```
When this creature enters, mill three cards, then you may return a land card from your graveyard to your hand.
```

**Current tags:** `effect.mill`, `condition.cares_lands`

### Issues

- **missing**: `trigger.self_etb`
  - **What's wrong:** "When this creature enters" is the modern self-ETB template.
  - **Evidence vs reality:** text literally says "When this creature enters, mill three cards…"
  - **Suggested fix:** confirm rule.self_etb fires on this card; appears to be a miss.

- **missing**: `effect.return_from_graveyard_to_hand`
  - **What's wrong:** Card literally returns a land card from graveyard to hand.
  - **Evidence vs reality:** "return a land card from your graveyard to your hand"
  - **Suggested fix:** confirm rule matches "return … card from your graveyard to your hand" target form.

---

## Ketramose, the New Dawn  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Legendary Creature — God
**Mana cost:** {1}{W}{B}

**Oracle text:**

```
Menace, lifelink, indestructible
Ketramose can't attack or block unless there are seven or more cards in exile.
Whenever one or more cards are put into exile from graveyards and/or the battlefield during your turn, you draw a card and lose 1 life.
```

**Current tags:** `effect.draws_or_discards`, `effect.has_indestructible`, `effect.has_lifelink`, `effect.has_menace`, `effect.life_changed`

### Issues

- **missing**: `condition.cares_exile_pile`
  - **What's wrong:** Gates ability on "seven or more cards in exile" — textbook cares_exile_pile.
  - **Evidence vs reality:** "can't attack or block unless there are seven or more cards in exile"
  - **Suggested fix:** confirm rule matches "N or more cards … in exile" gate.

- **missing**: `trigger.creature_leaves_graveyard`
  - **What's wrong:** Triggers off cards being exiled from graveyards — leaves-graveyard trigger.
  - **Evidence vs reality:** "Whenever one or more cards are put into exile from graveyards and/or the battlefield"
  - **Suggested fix:** confirm rule covers "put into exile from graveyard" template.

---

## Kolodin, Triumph Caster  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Legendary Creature — Human Pilot
**Mana cost:** {R}{W}

**Oracle text:**

```
Mounts and Vehicles you control have haste.
Whenever a Mount you control enters, it becomes saddled until end of turn.
Whenever a Vehicle you control enters, it becomes an artifact creature until end of turn.
```

**Current tags:** `condition.cares_subtype.mount`, `condition.cares_subtype.vehicle`, `trigger.another_creature_etb`

### Issues

- **missing**: `effect.grants_haste`
  - **What's wrong:** Static "Mounts and Vehicles you control have haste" is a haste-grant.
  - **Evidence vs reality:** "Mounts and Vehicles you control have haste."
  - **Suggested fix:** confirm rule covers "<subtypes> you control have haste" static grant.

- **missing**: `trigger.another_artifact_etb`
  - **What's wrong:** "Whenever a Vehicle you control enters" — Vehicles are artifacts, this is an artifact-ETB trigger.
  - **Evidence vs reality:** "Whenever a Vehicle you control enters, it becomes an artifact creature"
  - **Suggested fix:** confirm rule includes "Vehicle" as artifact-subtype trigger anchor.

---

## Lifecraft Engine  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Artifact — Vehicle
**Mana cost:** {3}

**Oracle text:**

```
As this Vehicle enters, choose a creature type.
Vehicle creatures you control are the chosen creature type in addition to their other types.
Each creature you control of the chosen type other than this Vehicle gets +1/+1.
Crew 3
```

**Current tags:** `condition.cares_subtype.vehicle`, `effect.has_activated_ability`, `trigger.self_etb`

### Issues

- **missing**: `effect.grants_stat_buff`
  - **What's wrong:** Static anthem on chosen-type creatures granting +1/+1.
  - **Evidence vs reality:** "Each creature you control of the chosen type other than this Vehicle gets +1/+1."
  - **Suggested fix:** confirm rule covers "Each creature you control … gets +N/+N" anthem template.

---

## Lightwheel Enhancements  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Enchantment — Aura
**Mana cost:** {W}

**Oracle text:**

```
Enchant creature or Vehicle
Start your engines!
Enchanted permanent gets +1/+1 and has vigilance.
Max speed — You may cast this card from your graveyard.
```

**Current tags:** `condition.cares_graveyard`, `condition.cares_subtype.vehicle`, `effect.grants_stat_buff`

### Issues

- **missing**: `effect.grants_vigilance`
  - **What's wrong:** Aura literally grants vigilance to enchanted permanent.
  - **Evidence vs reality:** "Enchanted permanent gets +1/+1 and has vigilance."
  - **Suggested fix:** confirm grants_vigilance covers "enchanted permanent … has vigilance" Aura form.

---

## Memory Guardian  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Artifact Creature — Robot Artificer
**Mana cost:** {4}{U}

**Oracle text:**

```
Affinity for artifacts (This spell costs {1} less to cast for each artifact you control.)
Flying
```

**Current tags:** `condition.cares_artifacts`, `effect.has_flying`

### Issues

- **missing**: `effect.cost_reduction`
  - **What's wrong:** Affinity is a self-cost-reduction mechanic ("costs {1} less to cast for each ...").
  - **Evidence vs reality:** "This spell costs {1} less to cast for each artifact you control."
  - **Suggested fix:** confirm cost_reduction rule covers affinity reminder text or the affinity keyword itself.

---

## Mendicant Core, Guidelight  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Legendary Artifact Creature — Robot
**Mana cost:** {W}{U}

**Oracle text:**

```
Mendicant Core's power is equal to the number of artifacts you control.
Start your engines!
Max speed — Whenever you cast an artifact spell, you may pay {1}. If you do, copy it. (The copy becomes a token.)
```

**Current tags:** `condition.cares_artifacts`, `trigger.spell_cast`

### Issues

- **missing**: `effect.copy_spell`
  - **What's wrong:** Triggered copy of a cast artifact spell.
  - **Evidence vs reality:** "Whenever you cast an artifact spell, you may pay {1}. If you do, copy it."
  - **Suggested fix:** confirm copy_spell rule covers "copy it" anaphoric form following spell-cast trigger.

---

## Mimeoplasm, Revered One  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Legendary Creature — Ooze
**Mana cost:** {X}{B}{G}{U}

**Oracle text:**

```
As Mimeoplasm enters, exile up to X creature cards from your graveyard. It enters with three +1/+1 counters on it for each creature card exiled this way.
{2}: Mimeoplasm becomes a copy of target creature card exiled with it, except it's 0/0 and has this ability.
```

**Current tags:** `condition.cares_exile_pile`, `condition.has_x_in_cost`, `effect.clone_in_place`, `effect.counter_modified`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.plus_one_counter`

### Issues

- **missing**: `trigger.self_etb`
  - **What's wrong:** "As Mimeoplasm enters" is a replacement-style self-ETB trigger.
  - **Evidence vs reality:** "As Mimeoplasm enters, exile up to X creature cards from your graveyard."
  - **Suggested fix:** confirm self_etb anchor covers "As <name> enters" template (replacement form).

- **missing**: `effect.exile_from_graveyard`
  - **What's wrong:** Direct exile-from-graveyard effect on ETB.
  - **Evidence vs reality:** "exile up to X creature cards from your graveyard"
  - **Suggested fix:** confirm exile_from_graveyard matches "exile … cards from your graveyard" target form (not a Renew self-exile cost).

- **missing**: `condition.cares_graveyard`
  - **What's wrong:** Both ETB and activated ability key off graveyard contents.
  - **Evidence vs reality:** "creature cards from your graveyard"
  - **Suggested fix:** verify cares_graveyard fires on "cards from your graveyard" target language.

---

## Molt Tender  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Creature — Insect Druid
**Mana cost:** {G}

**Oracle text:**

```
{T}: Mill a card.
{T}, Exile a card from your graveyard: Add one mana of any color.
```

**Current tags:** `effect.add_mana`, `effect.has_activated_ability`, `effect.mill`, `effect.ramp_nonland`

### Issues

- **missing**: `effect.exile_from_graveyard`
  - **What's wrong:** Activation exiles a card from graveyard (not self-exile cost — exile-from-graveyard cost like Krark-Clan Ironworks).
  - **Evidence vs reality:** "{T}, Exile a card from your graveyard: Add one mana"
  - **Suggested fix:** confirm exile_from_graveyard covers "Exile a card from your graveyard" as activation cost (non-self).

---

## Pactdoll Terror  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Artifact Creature — Toy
**Mana cost:** {3}{B}

**Oracle text:**

```
Whenever this creature or another artifact you control enters, each opponent loses 1 life and you gain 1 life.
```

**Current tags:** `condition.cares_artifacts`, `effect.drain`, `effect.life_changed`, `trigger.another_creature_etb`, `trigger.self_etb`

### Issues

- **false-positive**: `trigger.another_creature_etb`
  - **What's wrong:** Trigger fires on "another artifact" entering, not a generic non-self creature. A non-artifact creature ETB would NOT trigger Pactdoll Terror.
  - **Evidence vs reality:** evidence was `"whenever this creature or another artifact you control enters"` — the second disjunct is artifact-typed, not creature-typed.
  - **Suggested fix:** narrow the rule so disjuncts "this creature OR another <non-creature-type>" don't bleed into another_creature_etb.

- **missing**: `trigger.another_artifact_etb`
  - **What's wrong:** The actual non-self trigger is on artifact ETB, not creature ETB.
  - **Evidence vs reality:** "another artifact you control enters"
  - **Suggested fix:** confirm another_artifact_etb fires on this disjunctive form.

---

## Pit Automaton  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Artifact Creature — Construct
**Mana cost:** {2}

**Oracle text:**

```
Defender
{T}: Add {C}{C}. Spend this mana only to activate abilities.
{2}, {T}: When you next activate an exhaust ability that isn't a mana ability this turn, copy it. You may choose new targets for the copy.
```

**Current tags:** `effect.add_mana`, `effect.has_activated_ability`, `effect.has_defender`, `effect.has_mana_activated_ability`, `effect.ramp_nonland`

### Issues

- **missing**: `condition.cares_activated_abilities`
  - **What's wrong:** Triggered ability references when you "activate an exhaust ability" — textbook cares_activated_abilities trigger.
  - **Evidence vs reality:** "When you next activate an exhaust ability that isn't a mana ability this turn, copy it."
  - **Suggested fix:** confirm cares_activated_abilities rule covers "activate an exhaust ability" qualifier form (v0.29.0 broadened qualifiers).

---

## Point the Way  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Enchantment
**Mana cost:** {G}

**Oracle text:**

```
Start your engines!
{3}{G}, Sacrifice this enchantment: Search your library for up to X basic land cards, where X is your speed. Put those cards onto the battlefield tapped, then shuffle.
```

**Current tags:** `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.reanimate`, `effect.sacrifice_enchantment`

### Issues

- **false-positive**: `effect.reanimate`
  - **What's wrong:** "Put those cards onto the battlefield tapped" refers to library-searched basic land cards, NOT graveyard cards. This is land ramp, not reanimation.
  - **Evidence vs reality:** evidence was `"put those cards onto the battlefield tapped"`, but those cards came from "Search your library for up to X basic land cards" — never touched the graveyard.
  - **Suggested fix:** narrow reanimate anchor so "Search your library … Put those cards onto the battlefield" doesn't match.

- **missing**: `effect.tutors_basic_land`
  - **What's wrong:** Searches library for basic lands — textbook tutors_basic_land.
  - **Evidence vs reality:** "Search your library for up to X basic land cards"
  - **Suggested fix:** confirm tutors_basic_land matches "up to X basic land cards" form.

- **missing**: `effect.ramp_nonland`
  - **What's wrong:** Non-land card that puts basic lands directly into play.
  - **Evidence vs reality:** "Put those cards onto the battlefield tapped"
  - **Suggested fix:** confirm ramp_nonland fires on this template.
# Audit C - Card Issues

Audited 2026-06-01, ruleVersion v0.29.0

---

## Pride of the Road  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Creature — Zombie Cat Warrior
**Mana cost:** {3}{W}

**Oracle text:**

```
Vigilance
Start your engines! (If you have no speed, it starts at 1. It increases once on each of your turns when an opponent loses life. Max speed is 4.)
Max speed — At the beginning of combat on your turn, target creature or Vehicle you control gains double strike until end of turn.
```

**Current tags:** `condition.cares_subtype.vehicle`, `effect.grants_double_strike`, `effect.grants_first_strike`, `effect.has_vigilance`, `trigger.beginning_of_combat`

### Issues

- **false-positive**: `effect.grants_first_strike`
  - **What's wrong:** Card grants "double strike", not first strike. Although double strike includes first strike semantically, the tag is mutually exclusive with grants_double_strike in player intent (different search axis).
  - **Evidence vs reality:** evidence was `"gains double strike"`, but rule fired off matching "double strike" substring inside the double-strike grant phrase. There is no first-strike grant on this card.
  - **Suggested fix:** Add negative lookbehind in `effect.grants_first_strike` regex so it doesn't fire on "double strike" — require `(?<!double )first strike`.

---

## Push the Limit  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Sorcery
**Mana cost:** {5}{R}{R}

**Oracle text:**

```
Return all Mount and Vehicle cards from your graveyard to the battlefield. Sacrifice them at the beginning of the next end step.
Vehicles you control become artifact creatures until end of turn. Creatures you control gain haste until end of turn.
```

**Current tags:** `condition.cares_subtype.mount`, `condition.cares_subtype.vehicle`, `effect.cast_noncreature_spell`, `effect.grants_haste`, `effect.is_instant_or_sorcery`, `effect.reanimate`, `trigger.beginning_of_end_step`

### Issues

- **false-positive**: `trigger.beginning_of_end_step`
  - **What's wrong:** Card creates a delayed/one-shot sacrifice scheduling at next end step from a sorcery effect. It is not a static/triggered ability ON a permanent that fires at end step.
  - **Evidence vs reality:** evidence was `"at the beginning of the next end step"`, but the tag is intended to flag permanents whose abilities trigger at end step (Soul Snuffers, etc.), not sorceries that schedule a delayed sacrifice.
  - **Suggested fix:** Exclude "at the beginning of the next end step" (delayed trigger) from `trigger.beginning_of_end_step`; only match "at the beginning of (your|each|the) end step" without "next".

---

## Pyrewood Gearhulk  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Artifact Creature — Construct
**Mana cost:** {2}{R}{R}{G}{G}

**Oracle text:**

```
Vigilance, menace
When this creature enters, other creatures you control get +2/+2 and gain vigilance and menace until end of turn. Damage can't be prevented this turn.
```

**Current tags:** `effect.grants_stat_buff`, `effect.grants_vigilance`, `effect.has_menace`, `effect.has_vigilance`, `trigger.self_etb`

### Issues

- **missing**: `effect.grants_evasion`
  - **What's wrong:** Card grants menace ("gain vigilance and menace") to other creatures you control. `effect.grants_evasion` covers flying/menace/intimidate grants.
  - **Evidence vs reality:** Oracle has `"gain vigilance and menace until end of turn"`. Rule did not pick up menace inside a conjoined grant clause.
  - **Suggested fix:** Broaden `effect.grants_evasion` regex to capture menace listed in a conjoined "gain X and menace" form.

---

## Quag Feast  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Sorcery
**Mana cost:** {1}{B}

**Oracle text:**

```
Choose target creature, planeswalker, or Vehicle. Mill two cards, then destroy the chosen permanent if its mana value is less than or equal to the number of cards in your graveyard.
```

**Current tags:** `condition.cares_graveyard`, `condition.cares_subtype.vehicle`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.mill`

### Issues

- **missing**: `effect.destroy_creature`, `effect.destroy_planeswalker`, `effect.destroy_artifact`
  - **What's wrong:** Card destroys the chosen permanent which was chosen from creature/planeswalker/Vehicle (Vehicle = artifact).
  - **Evidence vs reality:** Oracle: `"Choose target creature, planeswalker, or Vehicle. ... destroy the chosen permanent"`. The destroy effect is split across two sentences (choose → destroy chosen), so the regex looking for "destroy target creature" doesn't fire.
  - **Suggested fix:** Add a "choose target X..., ... destroy the chosen permanent" pattern to the typed destroy rules.

- **missing**: `condition.cares_low_mana_value`
  - **What's wrong:** Card gates removal on "mana value is less than or equal to the number of cards in your graveyard" — a graveyard-scaled low-MV check.
  - **Evidence vs reality:** Oracle: `"its mana value is less than or equal to the number of cards in your graveyard"`. The condition rule likely requires a fixed N (≤ 4), so the graveyard-count comparator isn't recognized.
  - **Suggested fix:** Broaden `condition.cares_low_mana_value` to accept "mana value less than or equal to <count expression>" forms.

---

## Reckless Velocitaur  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Creature — Minotaur Pilot
**Mana cost:** {3}{R}

**Oracle text:**

```
Whenever this creature saddles a Mount or crews a Vehicle during your main phase, that Mount or Vehicle gets +2/+0 and gains trample until end of turn.
```

**Current tags:** `condition.cares_subtype.mount`, `condition.cares_subtype.vehicle`, `effect.grants_trample`

### Issues

- **missing**: `effect.grants_stat_buff`
  - **What's wrong:** Card grants `"+2/+0"` to a Mount/Vehicle, which is an anthem-style buff.
  - **Evidence vs reality:** Oracle: `"that Mount or Vehicle gets +2/+0 and gains trample"`. Rule may require `+N/+N` symmetric pattern; misses single-axis buffs like +2/+0.
  - **Suggested fix:** Broaden `effect.grants_stat_buff` regex to accept `+N/+M` with either N or M = 0.

---

## Riptide Gearhulk  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Artifact Creature — Construct
**Mana cost:** {1}{W}{W}{U}{U}

**Oracle text:**

```
Double strike
Prowess (Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.)
When this creature enters, for each opponent, put up to one target nonland permanent that player controls into its owner's library third from the top.
```

**Current tags:** `effect.has_double_strike`, `effect.has_first_strike`, `effect.has_prowess`, `trigger.self_etb`, `condition.cares_noncreature_spell`

### Issues

- **missing**: `effect.tuck_to_library`
  - **What's wrong:** Card tucks an opponent's permanent into their library (third from top) — the textbook tuck-to-library effect.
  - **Evidence vs reality:** Oracle: `"put up to one target nonland permanent that player controls into its owner's library third from the top"`. Rule may only match "top" or "bottom" of library, missing "Nth from the top" forms.
  - **Suggested fix:** Broaden `effect.tuck_to_library` to cover "into its owner's library Nth from the top" forms.

---

## Roadside Assistance  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Enchantment — Aura
**Mana cost:** {2}{W}

**Oracle text:**

```
Enchant creature or Vehicle
When this Aura enters, create a 1/1 colorless Pilot creature token with "This token saddles Mounts and crews Vehicles as though its power were 2 greater."
Enchanted permanent gets +1/+1 and has lifelink.
```

**Current tags:** `condition.cares_subtype.vehicle`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_lifelink`, `effect.grants_stat_buff`, `trigger.self_etb`

### Issues

- **missing**: `condition.cares_subtype.mount`
  - **What's wrong:** Oracle text contains `"saddles Mounts"` — Mount subtype mention. But `cares_subtype.vehicle` fires while `cares_subtype.mount` does not, despite both being mentioned in symmetrical contexts.
  - **Evidence vs reality:** Both "Vehicle" and "Mount" appear; only Vehicle was caught.
  - **Suggested fix:** Audit `condition.cares_subtype.mount` rule — appears inconsistent with vehicle in this token-text context.

---

## Roadside Blowout  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Sorcery
**Mana cost:** {2}{U}

**Oracle text:**

```
This spell costs {2} less to cast if it targets a permanent with mana value 1.
Return target creature or Vehicle an opponent controls to its owner's hand.
Draw a card.
```

**Current tags:** `condition.cares_subtype.vehicle`, `effect.bounce_artifact`, `effect.bounce_creature`, `effect.cast_noncreature_spell`, `effect.cost_reduction`, `effect.draws_or_discards`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `condition.cares_low_mana_value`
  - **What's wrong:** Card gates cost reduction on "permanent with mana value 1" — a low-MV check (≤ 4 per tagDef).
  - **Evidence vs reality:** Oracle: `"if it targets a permanent with mana value 1"`. Rule likely requires "less than or equal to N" or "or less" phrasing; misses direct "mana value 1" equality.
  - **Suggested fix:** Broaden `condition.cares_low_mana_value` to admit `"mana value <N>"` for N ≤ 4.

---

## Rover Blades  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Artifact — Equipment Vehicle
**Mana cost:** {3}

**Oracle text:**

```
Double strike
Equipped creature has double strike.
Equip {4}
Crew 2 (Tap any number of creatures you control with total power 2 or more: This Vehicle becomes an artifact creature until end of turn. Creatures can't be attached to other permanents.)
```

**Current tags:** `effect.grants_double_strike`, `effect.grants_first_strike`, `effect.has_activated_ability`, `effect.has_double_strike`, `effect.has_first_strike`, `effect.has_mana_activated_ability`

### Issues

- **false-positive**: `effect.grants_first_strike`
  - **What's wrong:** Same cross-cutting issue as Pride of the Road — granting "double strike" should not fire `effect.grants_first_strike`.
  - **Evidence vs reality:** evidence was `"equipped creature has double strike"`. Tag intent is mutually-exclusive with grants_double_strike for search purposes.
  - **Suggested fix:** (See Pride of the Road) — negative lookbehind in `effect.grants_first_strike` for "double ".

- **missing**: `condition.cares_subtype.equipment`
  - **What's wrong:** Card is an Equipment by type line. The Equipment subtype is a known tag axis (and the card grants via Equip).
  - **Evidence vs reality:** Type line: `"Artifact — Equipment Vehicle"`. Rule may only look at oracle text, missing type-line subtype.
  - **Suggested fix:** Augment `condition.cares_subtype.equipment` to also match on its own type line (or accept "Equip {N}" keyword as a marker).

- **missing**: `condition.cares_subtype.vehicle`
  - **What's wrong:** Card is itself a Vehicle (type line) and uses Crew. Note `cares_subtype.vehicle` fires on many cards that mention vehicles textually; here the type line itself mentions Vehicle.
  - **Evidence vs reality:** Type line includes "Vehicle"; oracle has "This Vehicle becomes an artifact creature".
  - **Suggested fix:** Same as Equipment — accept type-line subtype as a trigger.

---

## Sab-Sunen, Luxa Embodied  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Legendary Creature — God
**Mana cost:** {3}{G}{U}

**Oracle text:**

```
Reach, trample, indestructible
Sab-Sunen can't attack or block unless it has an even number of counters on it. (Zero is even.)
At the beginning of your first main phase, put a +1/+1 counter on Sab-Sunen. Then if it has an odd number of counters on it, draw two cards.
```

**Current tags:** `effect.counter_modified`, `effect.draws_or_discards`, `effect.has_indestructible`, `effect.has_reach`, `effect.has_trample`, `effect.plus_one_counter`

### Issues

- **missing**: `condition.cares_plus_one_counter`
  - **What's wrong:** Card gates a triggered draw on "if it has an odd number of counters" and gates attack/block on "even number of counters". Since the only counters this card uses are +1/+1 counters (puts +1/+1 counter on Sab-Sunen each turn), the "counters" here are +1/+1 counters.
  - **Evidence vs reality:** Oracle: `"if it has an odd number of counters on it"` and `"unless it has an even number of counters on it"`. Rule probably requires explicit "+1/+1 counter" near the check; it doesn't backtrack to the only counter type the card produces.
  - **Suggested fix:** Either narrow the rule to require explicit "+1/+1" mention (then this stays a deferred miss) OR add card-scoped inference when the only counter-type the card mentions is +1/+1.

---

## Salvation Engine  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Artifact — Vehicle
**Mana cost:** {4}{W}

**Oracle text:**

```
Other artifact creatures you control get +2/+2.
Whenever this Vehicle attacks, return up to one target artifact card from your graveyard to the battlefield.
Crew 6
```

**Current tags:** `effect.grants_stat_buff`, `effect.has_activated_ability`, `effect.reanimate`, `trigger.attack_or_block`

### Issues

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** Card refs "other artifact creatures you control" (anthem on a typed group) and reanimates artifact cards — both classic artifact-matters payoffs.
  - **Evidence vs reality:** Oracle: `"Other artifact creatures you control get +2/+2"` and `"return up to one target artifact card from your graveyard"`. Rule missed the typed-group anthem.
  - **Suggested fix:** Broaden `condition.cares_artifacts` to include "<TYPE> creatures you control" where TYPE = artifact.

---

## Shefet Archfiend  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Creature — Demon
**Mana cost:** {5}{B}{B}

**Oracle text:**

```
Flying
When this creature enters, all other creatures get -2/-2 until end of turn.
Cycling {2} ({2}, Discard this card: Draw a card.)
```

**Current tags:** `effect.debuff_minus_n`, `effect.has_cycling`, `effect.has_flying`, `trigger.self_etb`

### Issues

- **missing**: `effect.board_wipe`
  - **What's wrong:** A -2/-2 to "all other creatures" is a classic Damnation-style board wipe (kills anything with toughness ≤ 2).
  - **Evidence vs reality:** Oracle: `"all other creatures get -2/-2 until end of turn"`. `effect.board_wipe` may only match destroy/exile of all creatures, missing mass -N/-N.
  - **Suggested fix:** Broaden `effect.board_wipe` to include "all (other )?creatures get -N/-N" with N >= 2.

---

## Silken Strength  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Enchantment — Aura
**Mana cost:** {1}{G}

**Oracle text:**

```
Flash
Enchant creature or Vehicle
When this Aura enters, untap enchanted permanent.
Enchanted permanent gets +1/+2 and has reach.
```

**Current tags:** `condition.cares_subtype.vehicle`, `effect.grants_stat_buff`, `effect.has_flash`, `effect.untap`, `trigger.self_etb`

### Issues

- **missing**: `effect.grants_reach`
  - **What's wrong:** Card grants reach to enchanted permanent via "has reach".
  - **Evidence vs reality:** Oracle: `"Enchanted permanent gets +1/+2 and has reach."`. Aura template "enchanted X has KW" should fire grants.
  - **Suggested fix:** Broaden `effect.grants_reach` to admit "enchanted permanent (gets ... and )?has reach" forms.

---

## Skyserpent Seeker  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Creature — Snake
**Mana cost:** {G}{U}

**Oracle text:**

```
Flying, deathtouch
Exhaust — {4}: Reveal cards from the top of your library until you reveal two land cards. Put those land cards onto the battlefield tapped and the rest on the bottom of your library in a random order. Put a +1/+1 counter on this creature. (Activate each exhaust ability only once.)
```

**Current tags:** `effect.counter_modified`, `effect.has_activated_ability`, `effect.has_deathtouch`, `effect.has_exhaust`, `effect.has_flying`, `effect.has_mana_activated_ability`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.ramp_nonland`
  - **What's wrong:** Reveals from top of library, puts two land cards onto the battlefield — a classic non-Land ramp effect.
  - **Evidence vs reality:** Oracle: `"Reveal cards from the top of your library until you reveal two land cards. Put those land cards onto the battlefield tapped"`. Rule may only match "search your library" + "put" or "add mana"; misses reveal-from-top + put.
  - **Suggested fix:** Broaden `effect.ramp_nonland` to include "reveal cards from the top of your library until you reveal N land cards. Put those land cards onto the battlefield".

- **missing**: `condition.cares_lands`
  - **What's wrong:** Card refs "land cards" as a positive selection criterion off the library.
  - **Evidence vs reality:** Oracle: `"until you reveal two land cards"`.
  - **Suggested fix:** Broaden `condition.cares_lands` to include "until you reveal N land cards".
---

## Stock Up  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Sorcery
**Mana cost:** {2}{U}

**Oracle text:**

```
Look at the top five cards of your library. Put two of them into your hand and the rest on the bottom of your library in any order.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.look_at_top_n`

### Issues

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** "Put two of them into your hand" is functionally drawing 2 cards (card-advantage / select-and-draw pattern); rule appears to require the literal word "draw".
  - **Evidence vs reality:** evidence would be `"put two of them into your hand"`, equivalent to drawing 2.
  - **Suggested fix:** Broaden `effect.draws_or_discards` to admit "put [N|the/those/them] into your hand" from a library-top look (Stock Up / See the Truth / Glimpse the Cosmos family).

---

## The Last Ride  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Legendary Artifact — Vehicle
**Mana cost:** {B}

**Oracle text:**

```
The Last Ride gets -X/-X, where X is your life total.
{2}{B}, Pay 2 life: Draw a card.
Crew 2
```

**Current tags:** `effect.debuff_minus_n`, `effect.draws_or_discards`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.life_changed`

### Issues

- **false-positive**: `effect.debuff_minus_n`
  - **What's wrong:** The -X/-X is a self-static (the Vehicle gets -X/-X where X is your life total) — not a removal/debuff effect targeting other creatures.
  - **Evidence vs reality:** evidence was `"-x/-x"`, but it modifies only this card. Cards like Phyrexian Negator / Death's Shadow shouldn't read as creature-debuff removal.
  - **Suggested fix:** Narrow `effect.debuff_minus_n` to exclude self-only static "[__SELF__] gets -N/-N" patterns; require the -N/-N to land on a target or other creatures.

- **false-positive**: `effect.life_changed`
  - **What's wrong:** "Pay 2 life" is an activated ability cost, not an effect that causes life change.
  - **Evidence vs reality:** evidence was `"pay 2 life"`, but cost-payment is typically excluded from this effect axis (similar to the v0.29.0 Ward—Pay exclusion).
  - **Suggested fix:** Extend the v0.29.0 Ward—Pay exclusion to general "Pay N life" activated-ability costs (cost-line before colon).

---

## Thunderous Velocipede  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Artifact — Vehicle
**Mana cost:** {1}{G}{G}

**Oracle text:**

```
Trample
Each other Vehicle and creature you control enters with an additional +1/+1 counter on it if its mana value is 4 or less. Otherwise, it enters with three additional +1/+1 counters on it.
Crew 3
```

**Current tags:** `condition.cares_low_mana_value`, `condition.cares_subtype.vehicle`, `effect.has_activated_ability`, `effect.has_trample`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.counter_modified`
  - **What's wrong:** `effect.plus_one_counter` matched but parent `effect.counter_modified` did not — the ETB arm of the rule lacks an `(?:additional |another )?` modifier between the quantifier and counter-type slots.
  - **Evidence vs reality:** evidence would be `"enters with an additional +1/+1 counter"`, but the ETB regex is `enters\s+with\s+(?:a |an |\d+ ...)?(?:\+1\/\+1 |-1\/-1 |[a-z][a-z'\-]+ )?counters?` — no allowance for `additional` between `an ` and `+1/+1 counter`. The "puts/places" arm already has `(?:additional |another )?`.
  - **Suggested fix:** Add `(?:additional |another )?` after the quantifier slot in the `ettb` regex inside `effect.counter_modified.ts`, parallel to the main `put`/`place`/`distribute` arm.

---

## Trade the Helm  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Sorcery
**Mana cost:** {4}{U}

**Oracle text:**

```
Exchange control of target artifact or creature you control and target artifact or creature an opponent controls.
Cycling {2} ({2}, Discard this card: Draw a card.)
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.control_change`, `effect.has_cycling`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.donate`
  - **What's wrong:** Exchange-of-control hands a permanent you control to an opponent — same family as Donate / Harmless Offering — but the current rule probably only matches one-way "gain control + give" idioms, not "exchange control".
  - **Evidence vs reality:** evidence would be `"exchange control of target artifact or creature you control and target artifact or creature an opponent controls"`, which functionally donates your permanent.
  - **Suggested fix:** Broaden `effect.donate` to admit "exchange control of [thing] you control and [thing] (an) opponent controls" — the exchange family transfers ownership-style control just like donate.

---

## Voyage Home  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Sorcery
**Mana cost:** {5}{W}{U}

**Oracle text:**

```
Affinity for artifacts (This spell costs {1} less to cast for each artifact you control.)
You draw three cards and gain 3 life.
```

**Current tags:** `condition.cares_artifacts`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.life_changed`

### Issues

- **missing**: `effect.draws_or_discards`
  - **What's wrong:** Card clearly draws three cards but `effect.draws_or_discards` doesn't fire.
  - **Evidence vs reality:** evidence should be `"you draw three cards"`. After reminder-strip the normalized text becomes `"affinity for artifacts you draw three cards and gain 3 life."` — no punctuation/newline before `you`, so the rule's leadin `(?:^|[.,:\n—] ?)` fails. The keyword + parenthesized reminder collapse to a single space, losing the line break.
  - **Suggested fix:** Either (a) preserve a punctuation/newline boundary when stripping a parenthesized reminder block that follows a keyword line, or (b) loosen the `draws_or_discards` leadin to admit a keyword-cost-bracket boundary (e.g., allow `\b` after closing `)` or after a recognized keyword name).

---

## Voyager Quickwelder  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Artifact Creature — Robot Artificer
**Mana cost:** {2}{W}

**Oracle text:**

```
Artifact spells you cast cost {1} less to cast.
```

**Current tags:** `effect.cost_reduction`

### Issues

- **missing**: `condition.cares_artifacts`
  - **What's wrong:** "Artifact spells you cast cost {1} less" is the canonical artifact-payoff cost-reducer (Foundry Inspector / Etherium Sculptor family) and clearly references artifact-spell count, but no `cares_artifacts` PATTERN admits "artifact spells you cast".
  - **Evidence vs reality:** evidence would be `"artifact spells you cast cost {1} less to cast"`. Closest existing pattern is `\bwhenever [\w\s]+? cast(?:s)?\s+(?:an?\s+)?artifact\b` — requires a "whenever … cast" trigger frame, but this card uses a static cost-reduction.
  - **Suggested fix:** Add a PATTERN to `condition.cares_artifacts` like `\bartifact (?:spells?|cards?) you cast\b` (Foundry Inspector / Etherium Sculptor / Sai, Master Thopterist cost-reducer frame).

---

## Waxen Shapethief  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Creature — Shapeshifter
**Mana cost:** {3}{U}

**Oracle text:**

```
Flash
You may have this creature enter as a copy of an artifact or creature you control.
Cycling {2} ({2}, Discard this card: Draw a card.)
```

**Current tags:** `condition.cares_artifacts`, `effect.clone_in_place`, `effect.has_cycling`, `effect.has_flash`

### Issues

- **false-positive**: `condition.cares_artifacts`
  - **What's wrong:** The "artifact or creature you control" phrase is a one-time clone-target filter (Cackling Counterpart / Clone family), not an artifact-payoff resource frame. Same shape as Molten Duplication, which the rule comment says to exclude — but the existing lookbehind only excludes `target ` / `enchant `, not the `as a copy of an ` prefix.
  - **Evidence vs reality:** evidence was `"artifact or creature you control"`, matching `\b(?<!target\s)(?<!enchant\s)artifacts?\s+(?:and\/or|or)\s+\w+\s+you control\b`. The intent is to flag artifact-payoff scaling, but clone-copy of an artifact-or-creature doesn't make the card an artifact archetype.
  - **Suggested fix:** Add `(?<!copy of an\s)` to the lookbehind set, or more broadly require a payoff-verb context (cast/control-count/enter-trigger) — copy-target filters and other single-permanent target filters shouldn't fire `cares_artifacts`.

---

## Winter, Cursed Rider  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Legendary Creature — Human Warlock
**Mana cost:** {U}{B}

**Oracle text:**

```
Ward—Pay 2 life.
Artifacts you control have "Ward—Pay 2 life."
Exhaust — {2}{U}{B}, {T}, Exile X artifact cards from your graveyard: Each other nonartifact creature gets -X/-X until end of turn. (Activate each exhaust ability only once.)
```

**Current tags:** `condition.cares_artifacts`, `effect.debuff_minus_n`, `effect.has_activated_ability`, `effect.has_exhaust`, `effect.has_mana_activated_ability`, `effect.has_ward`

### Issues

- **missing**: `effect.grants_ward`
  - **What's wrong:** "Artifacts you control have 'Ward—Pay 2 life.'" grants ward to other permanents, not just to self. `effect.has_ward` covers self only.
  - **Evidence vs reality:** evidence would be `"artifacts you control have \"ward—pay 2 life.\""`, a granted ability quoted to other permanents.
  - **Suggested fix:** Make sure `effect.grants_ward` admits the "<type> you control have \"Ward—...\"" quoted-static-ability grant idiom.

- **missing**: `effect.exile_from_graveyard`
  - **What's wrong:** "Exile X artifact cards from your graveyard" is exactly the exile-from-graveyard action (cost paid out of own graveyard, also covers third-party graveyard interaction).
  - **Evidence vs reality:** evidence would be `"exile x artifact cards from your graveyard"`. Counts as the exile-from-graveyard family (Soulflayer / Pull from Tomorrow's-graveyard archetype).
  - **Suggested fix:** Ensure `effect.exile_from_graveyard` admits "exile X [type] cards from your graveyard" as part of an activation cost (not just as a spell's main effect).

---

## Abzan Monument  <!-- audited 2026-06-01, ruleVersion v0.29.0 -->

**Type:** Artifact
**Mana cost:** {2}

**Oracle text:**

```
When this artifact enters, search your library for a basic Plains, Swamp, or Forest card, reveal it, put it into your hand, then shuffle.
{1}{W}{B}{G}, {T}, Sacrifice this artifact: Create an X/X white Spirit creature token, where X is the greatest toughness among creatures you control. Activate only as a sorcery.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.sacrifice_artifact`, `trigger.self_etb`

### Issues

- **missing**: `effect.tutors_basic_land`
  - **What's wrong:** "search your library for a basic Plains, Swamp, or Forest card" is a multi-type basic-land tutor (KTK/DTK monument cycle); the rule's PATTERN handles single types ("a basic Plains card") but not comma-separated multi-type lists.
  - **Evidence vs reality:** evidence would be `"search your library for a basic plains, swamp, or forest card"`. Current PATTERN `(?:basic )?${TYPED_NOUN}) cards?` only admits one TYPED_NOUN token, so it bails on the comma.
  - **Suggested fix:** Add a PATTERN admitting `basic ${TYPED_NOUN}(?:,\\s+${TYPED_NOUN})*(?:,?\\s+or\\s+${TYPED_NOUN})?\\s+cards?` — the comma-separated multi-basic search idiom from monument-cycle / Khans-style mana fixers.

