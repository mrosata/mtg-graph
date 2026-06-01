# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

---

## Wickerfolk Thresher  <!-- audited 2026-06-01, ruleVersion v0.25.0 -->

**Type:** Artifact Creature — Scarecrow
**Mana cost:** {3}{G}

**Oracle text:**

```
Delirium — Whenever this creature attacks, if there are four or more card types among cards in your graveyard, look at the top card of your library. If it's a land card, you may put it onto the battlefield. If you don't put the card onto the battlefield, put it into your hand.
```

**Current tags:** `condition.cares_graveyard`, `effect.look_at_top_n`, `trigger.attack_or_block`

### Issues

- **missing**: `condition.delirium`
  - **What's wrong:** Card explicitly carries the Delirium keyword and the "four or more card types in your graveyard" gating clause.
  - **Evidence vs reality:** keyword `Delirium` present in `keywords` and "delirium —" prefix begins the ability; condition tag does not exist.
  - **Suggested fix:** Catalog gap — add `condition.delirium` ability-word/gate tag (covers "four or more card types").

- **missing**: `condition.cares_lands`
  - **What's wrong:** Card branches on whether the revealed top card is a land — a lands-matter check.
  - **Evidence vs reality:** "if it's a land card, you may put it onto the battlefield" — the rule should fire on "land card" referenced from library top, but did not.
  - **Suggested fix:** Broaden `condition.cares_lands` to include "if it's a land card" branches off library/top look.

- **missing**: `effect.cheat_into_play`
  - **What's wrong:** Puts a card from library directly onto the battlefield, skipping the casting process.
  - **Evidence vs reality:** "you may put it onto the battlefield" applied to the top card of library — matches `effect.cheat_into_play` description ("from a zone OTHER than the graveyard directly onto the battlefield").
  - **Suggested fix:** Add a regex branch to `effect.cheat_into_play` for "put it onto the battlefield" following a library-top reveal/look.

**Status (v0.26.0):** BR-4 (cares_lands library-top) and BR-5 (cheat_into_play singular library-top) SHIPPED in v0.26.0. Remaining: `condition.delirium` coverage gap (new tag).

---

## Wildfire Wickerfolk  <!-- audited 2026-06-01, ruleVersion v0.25.0 -->

**Type:** Artifact Creature — Scarecrow
**Mana cost:** {R}{G}

**Oracle text:**

```
Haste
Delirium — This creature gets +1/+1 and has trample as long as there are four or more card types among cards in your graveyard.
```

**Current tags:** `condition.cares_graveyard`, `effect.grants_stat_buff`, `effect.grants_trample`, `effect.has_haste`

### Issues

- **missing**: `condition.delirium`
  - **What's wrong:** Card has Delirium keyword and the "four or more card types in graveyard" gating clause.
  - **Evidence vs reality:** Keyword `Delirium` is in `keywords`; condition tag does not exist in the catalog.
  - **Suggested fix:** Catalog gap — add `condition.delirium` ability-word/gate tag.

**Status (v0.26.0):** coverage gap — deferred for new-rule authoring (see CLAUDE.md tag conventions).

---

## Winter, Misanthropic Guide  <!-- audited 2026-06-01, ruleVersion v0.25.0 -->

**Type:** Legendary Creature — Human Warlock
**Mana cost:** {1}{B}{R}{G}

**Oracle text:**

```
Ward {2}
At the beginning of your upkeep, each player draws two cards.
Delirium — As long as there are four or more card types among cards in your graveyard, each opponent's maximum hand size is equal to seven minus the number of those card types.
```

**Current tags:** `condition.cares_graveyard`, `effect.draws_or_discards`, `effect.has_ward`, `trigger.upkeep`

### Issues

- **missing**: `condition.delirium`
  - **What's wrong:** Card has Delirium keyword and the "four or more card types" gating clause.
  - **Evidence vs reality:** `Delirium` is in `keywords`; condition tag does not exist.
  - **Suggested fix:** Catalog gap — add `condition.delirium`.

**Status (v0.26.0):** coverage gap — deferred for new-rule authoring (see CLAUDE.md tag conventions).

---

## Ajani, Caller of the Pride  <!-- audited 2026-06-01, ruleVersion v0.25.0 -->

**Type:** Legendary Planeswalker — Ajani
**Mana cost:** {1}{W}{W}

**Oracle text:**

```
+1: Put a +1/+1 counter on up to one target creature.
−3: Target creature gains flying and double strike until end of turn.
−8: Create X 2/2 white Cat creature tokens, where X is your life total.
```

**Current tags:** `effect.counter_modified`, `effect.create_creature_token`, `effect.create_token`, `effect.grants_double_strike`, `effect.grants_evasion`, `effect.grants_first_strike`, `effect.plus_one_counter`

### Issues

- **false-positive**: `effect.grants_first_strike`
  - **What's wrong:** Card grants double strike but not first strike. The grants_first_strike tagDef description ("Grants the first strike keyword") does not mention the double-strike-superset convention that `effect.has_first_strike` uses.
  - **Evidence vs reality:** evidence is `"gains flying and double strike"` — no literal "first strike" grant; rule appears to fire on the substring "first strike" embedded inside "double strike".
  - **Suggested fix:** Either (a) add a negative lookbehind to `effect.grants_first_strike` so "double" before "first strike" doesn't match, or (b) update the tagDef description to document the double-strike superset convention (mirror `effect.has_first_strike`).

**Status (v0.26.0):** REJECTED v0.26.0 batch — intentional design (double-strike superset). See effect.grants_keyword.ts:194-213 and existing positive test rows. Optional: update tagDef.description to document the superset convention.

---

## Alesha, Who Laughs at Fate  <!-- audited 2026-06-01, ruleVersion v0.25.0 -->

**Type:** Legendary Creature — Human Warrior
**Mana cost:** {1}{B}{R}

**Oracle text:**

```
First strike
Whenever Alesha attacks, put a +1/+1 counter on it.
Raid — At the beginning of your end step, if you attacked this turn, return target creature card with mana value less than or equal to Alesha's power from your graveyard to the battlefield.
```

**Current tags:** `effect.counter_modified`, `effect.has_first_strike`, `effect.plus_one_counter`, `effect.reanimate`, `trigger.attack_or_block`, `trigger.beginning_of_end_step`

### Issues

- **missing**: `condition.raid` (catalog gap)
  - **What's wrong:** Card uses the Raid ability word and the "if you attacked this turn" gating clause; no Raid condition tag exists.
  - **Evidence vs reality:** `Raid` is in `keywords` and the "Raid — ... if you attacked this turn" gate is present, but no `condition.raid` tag exists in the catalog.
  - **Suggested fix:** Catalog gap — add `condition.raid` ability-word/gate tag (matches "raid —" and "if you attacked this turn").

**Status (v0.26.0):** coverage gap — deferred for new-rule authoring (see CLAUDE.md tag conventions).

---

## Courageous Goblin  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Goblin
**Mana cost:** {1}{R}

**Oracle text:**

```
Whenever this creature attacks while you control a creature with power 4 or greater, this creature gets +1/+0 and gains menace until end of turn. (It can't be blocked except by two or more creatures.)
```

**Current tags:** `condition.cares_high_power`, `effect.gains_keyword_self_conditional`, `effect.grants_stat_buff`, `trigger.attack_or_block`

### Issues

- **false-positive**: `effect.grants_stat_buff`
  - **What's wrong:** This is a self-conditional combat trigger buffing only itself (+1/+0 until end of turn), not an anthem-style static "creatures you control get +N/+N". The matching rule for self-conditional gains (`effect.gains_keyword_self_conditional`) already covers the self-frame.
  - **Evidence vs reality:** evidence was `"creature with power 4 or greater, this creature gets +1/+0"`, but the description specifies anthem-style buffs to one or more creatures — this is a temporary self-buff.
  - **Suggested fix:** narrow `grants_stat_buff` to exclude "this creature gets +X/+Y until end of turn" self-targeted attack/combat triggers.

**Status (v0.26.0):** REJECTED v0.26.0 batch (FP-3) — intentional self-buff broadening per audit-skill recurring-pattern documentation. effect.grants_stat_buff tagDef says "anthem-style" but behavior is deliberately broader; existing test rows encode self/single-creature buffs as TRUE positives.

---

## Crackling Cyclops  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Cyclops Wizard
**Mana cost:** {2}{R}

**Oracle text:**

```
Whenever you cast a noncreature spell, this creature gets +3/+0 until end of turn.
```

**Current tags:** `condition.cares_noncreature_spell`, `effect.grants_stat_buff`, `trigger.spell_cast`

### Issues

- **false-positive**: `effect.grants_stat_buff`
  - **What's wrong:** Self-only "this creature gets +3/+0 until end of turn" prowess-style trigger, not an anthem-style buff to one or more creatures.
  - **Evidence vs reality:** evidence was `"creature spell, this creature gets +3/+0"`, but anthem-style buffs are static or apply to multiple creatures, not single-self temporary buffs.
  - **Suggested fix:** narrow `grants_stat_buff` to exclude "this creature gets +X/+Y until end of turn" patterns; rely on prowess-style tags or `condition.cares_spells_cast_this_turn` for these.

**Status (v0.26.0):** REJECTED v0.26.0 batch (FP-3) — same intentional self-buff broadening; see Courageous Goblin note.

---

## Crusader of Odric  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Human Soldier
**Mana cost:** {2}{W}

**Oracle text:**

```
Crusader of Odric's power and toughness are each equal to the number of creatures you control.
```

**Current tags:** (none)

### Issues

- **missing**: no `condition.cares_creature_count` tag exists
  - **What's wrong:** P/T scales on number of creatures you control — a classic creature-count payoff. No existing condition tag in catalog covers this axis (closest is `condition.cares_creatures_died_this_turn`, which is different).
  - **Evidence vs reality:** clause "power and toughness are each equal to the number of creatures you control" describes a creature-count payoff archetype.
  - **Suggested fix:** add new tag `condition.cares_creature_count` (covers Crusader of Odric, Champion of Lambholt, Beastmaster Ascension, etc.).

**Status (v0.26.0):** coverage gap — deferred for new-rule authoring (see CLAUDE.md tag conventions).

---

## Crypt Feaster  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Zombie
**Mana cost:** {3}{B}

**Oracle text:**

```
Menace (This creature can't be blocked except by two or more creatures.)
Threshold — Whenever this creature attacks, if there are seven or more cards in your graveyard, this creature gets +2/+0 until end of turn.
```

**Current tags:** `condition.cares_graveyard`, `condition.threshold`, `effect.grants_stat_buff`, `effect.has_menace`, `trigger.attack_or_block`

### Issues

- **false-positive**: `effect.grants_stat_buff`
  - **What's wrong:** Self-only temporary buff on its own attack trigger, not an anthem-style buff to multiple creatures.
  - **Evidence vs reality:** evidence was `"creature gets +2/+0"`, but anthem-style implies static buff to a group; this is self only / until end of turn.
  - **Suggested fix:** narrow `grants_stat_buff` to exclude "this creature gets +X/+Y until end of turn" self-only patterns.

**Status (v0.26.0):** REJECTED v0.26.0 batch (FP-3) — same intentional self-buff broadening; see Courageous Goblin note.

---

## Doubling Season  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Enchantment
**Mana cost:** {4}{G}

**Oracle text:**

```
If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead.
If an effect would put one or more counters on a permanent you control, it puts twice that many of those counters on that permanent instead.
```

**Current tags:** `effect.create_token`

### Issues

- **false-positive**: `effect.create_token`
  - **What's wrong:** Doubling Season is a replacement effect that doubles other token-creation effects; it does not itself create any tokens.
  - **Evidence vs reality:** evidence was `"create one or more token"`, but it's inside the conditional "If an effect would create one or more tokens ... it creates twice that many" — the rule needs to exclude this replacement-clause framing.
  - **Suggested fix:** Narrow `effect.create_token` to exclude leading "if an effect would create" replacement clauses.
- **missing**: `effect.counter_modified` / counter-doubling
  - **What's wrong:** The card doubles counter placements ("if an effect would put one or more counters on a permanent... twice that many"). No counter tag fires.
  - **Evidence vs reality:** This is more of a replacement/static effect; arguably the catalog lacks a `effect.doubler` tag for token/counter doublers (Hardened Scales / Doubling Season). Catalog gap.
  - **Suggested fix:** Consider a `effect.doubles_tokens_or_counters` rule (currently missing in catalog).

**Status (v0.26.0):** FP-6 (create_token replacement-clause exclusion) SHIPPED in v0.26.0. Remaining: counter/token-doubler axis coverage gap (proposed `effect.doubler` family).

---

## Dragon Mage  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Dragon Wizard
**Mana cost:** {5}{R}{R}

**Oracle text:**

```
Flying
Whenever this creature deals combat damage to a player, each player discards their hand, then draws seven cards.
```

**Current tags:** `effect.draws_or_discards`, `effect.has_flying`, `effect.targeted_discard`, `trigger.damage_dealt`

### Issues

- **false-positive**: `effect.targeted_discard`
  - **What's wrong:** Targeted-discard tag is described as forcing an opponent (or each opponent) to discard. Dragon Mage makes *each player* (symmetric, includes controller) discard their hand — it's a wheel, not hand-attack disruption.
  - **Evidence vs reality:** evidence was `"each player discards"`, but "each player" includes you, so this is a symmetric wheel effect, not directed disruption.
  - **Suggested fix:** Narrow `effect.targeted_discard` to exclude "each player discards" (only fire on "target opponent", "an opponent", "each opponent").

**Status (v0.26.0):** REJECTED v0.26.0 batch (FP-7) — intentional design. effect.targeted_discard.ts:34-35 documents the Rankle's Prank rationale that symmetric "each player discards" still serves the disruption axis; test row at line 18 encodes it as TRUE positive.

---

## Dryad Militant  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Dryad Soldier
**Mana cost:** {G/W}

**Oracle text:**

```
If an instant or sorcery card would be put into a graveyard from anywhere, exile it instead.
```

**Current tags:** (none)

### Issues

- **missing**: no `effect.graveyard_hate` exists
  - **What's wrong:** Dryad Militant is a replacement-effect graveyard hate piece — pure GY-hate axis. Card is left completely untagged.
  - **Evidence vs reality:** "If an instant or sorcery card would be put into a graveyard from anywhere, exile it instead" is canonical Rest in Peace / Leyline of the Void / Soulless Jailer family disruption — currently unmodeled.
  - **Suggested fix:** Add `effect.graveyard_hate` / `effect.exile_replaces_graveyard` rule; or at minimum extend `effect.exile_from_graveyard` to fire on these replacement clauses; consider also tagging `condition.cares_instant_sorcery_in_graveyard` since the card operates exclusively on instants/sorceries hitting graveyards.

**Status (v0.26.0):** coverage gap — deferred for new-rule authoring (see CLAUDE.md tag conventions).

---

## Expedition Map  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Artifact
**Mana cost:** {1}

**Oracle text:**

```
{2}, {T}, Sacrifice this artifact: Search your library for a land card, reveal it, put it into your hand, then shuffle.
```

**Current tags:** `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.sacrifice_artifact`

### Issues

- **missing**: no `effect.tutors_land` exists (general land tutor — basic or nonbasic, to hand or to play)
  - **What's wrong:** Canonical land tutor goes untagged. `effect.tutors_basic_land` rule is anchored on "basic land card"; Expedition Map searches for any "land card" so it doesn't fire. `effect.ramp_nonland` requires fetching into play. Neither covers Expedition-Map-style any-land-to-hand.
  - **Evidence vs reality:** "Search your library for a land card, reveal it, put it into your hand" is the textbook utility-land tutor family (Expedition Map, Sylvan Scrying, Renegade Map, Crop Rotation, Wayfarer's Bauble). Currently the card looks like a pure sac outlet to the graph.
  - **Suggested fix:** Either (a) add a new `effect.tutors_land` rule covering both "land card" + "to your hand" / "onto the battlefield" forms (recurring family — Expedition Map, Renegade Map, Sylvan Scrying, Crop Rotation, Pyramid of the Pantheon, Wayfarer's Bauble); or (b) broaden `effect.tutors_basic_land` to fire on the unrestricted "land card" wording too (less precise but cheap).

**Status (v0.27.0):** REJECTED v0.27.0 batch — `effect.tutors_basic_land` tagDef is explicitly the basic-tutor family (Cultivate / Lay of the Land); broadening would dilute the axis. Defer to new `effect.tutors_land` parametric tag for unrestricted land tutors (recurring family above).

---

## Exsanguinate  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {X}{B}{B}

**Oracle text:**

```
Each opponent loses X life. You gain life equal to the life lost this way.
```

**Current tags:** `condition.has_x_in_cost`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.life_changed`

### Issues

- **missing**: `effect.drain`
  - **What's wrong:** Exsanguinate is the canonical drain spell (mono-black X-payoff). Currently only flags `effect.life_changed` (which fires on either gain or loss), missing the unified drain axis.
  - **Evidence vs reality:** "Each opponent loses X life. You gain life equal to the life lost this way" matches the `effect.drain` tagDef ("opponent loses N life AND you to gain N life as one ability") exactly.
  - **Suggested fix:** Broaden `effect.drain` regex to fire on the symmetric "loses X life / gain life equal to" phrasing. Currently appears to only match the more compact "each opponent loses N life and you gain N life" form.

**Status (v0.27.0):** SHIPPED in v0.27.0 batch — forward split-sentence drain pattern added to `effect.drain.ts` (`<subject> loses N life. you gain (N life|life equal to the life lost|that much)`).

---

## Fiery Annihilation  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {2}{R}

**Oracle text:**

```
Fiery Annihilation deals 5 damage to target creature. Exile up to one target Equipment attached to that creature. If that creature would die this turn, exile it instead.
```

**Current tags:** `condition.cares_subtype.equipment`, `effect.cast_noncreature_spell`, `effect.deals_damage`, `effect.exile_creature`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.exile_artifact`
  - **What's wrong:** Card explicitly exiles "target Equipment" — Equipment is an Artifact subtype, so `effect.exile_artifact` should fire (per its description: "Exiles a target artifact from the battlefield"). Currently misses the artifact-exile axis.
  - **Evidence vs reality:** "Exile up to one target Equipment attached to that creature" satisfies the artifact-exile axis. The rule likely only matches the literal word "artifact" in the target phrase and doesn't generalize to artifact subtypes (Equipment, Vehicle, Food, Treasure, Clue).
  - **Suggested fix:** Broaden `effect.exile_artifact` regex to fire when the target is an artifact subtype (Equipment/Vehicle/Food/Treasure/Clue) — mirrors how `effect.destroy_artifact` likely already handles this. Worth grepping for the destroy-side rule to crib the pattern.

- **false-positive (evidence accuracy, not tag verdict)**: `effect.exile_creature`
  - **What's wrong:** Tag is correct (the replacement clause "If that creature would die this turn, exile it instead" justifies it), but the evidence string captured `"exile up to one target equipment attached to that creature"` — which is the *equipment*-exile clause, not the creature-exile clause. The rule appears to match "exile ... target ... creature" loosely without respecting the noun being modified.
  - **Evidence vs reality:** Audit-only nitpick — the verdict is correct so this isn't a tag bug. But a reviewer reading the graph might think the regex is broken if they only see the evidence string.
  - **Suggested fix:** Lower priority — tighten the regex to require the target itself to be a creature (not "...attached to that creature"). Even better: have the rule also capture the "exile it instead" replacement clause as its evidence, which is the actual justification.

**Status (v0.27.0):** SHIPPED in v0.27.0 batch — `PATTERN_ARTIFACT_SUBTYPE` added to `effect.exile_artifact.ts` covering Equipment / Food / Treasure / Clue / Map / Powerstone. The evidence-string quirk on `effect.exile_creature` is left as-is since the tag verdict was already correct.

---

## Fleeting Distraction  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {U}

**Oracle text:**

```
Target creature gets -1/-0 until end of turn.
Draw a card.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.debuff_minus_n`, `effect.draws_or_discards`, `effect.is_instant_or_sorcery`

### Issues

- **false-positive**: `effect.debuff_minus_n`
  - **What's wrong:** tagDef description says "(can kill via toughness ≤ 0)" — implying the intent is kill-via-toughness debuffs (-N/-N family). Fleeting Distraction's `-1/-0` only reduces power, never toughness, so it can't kill on its own. It's a combat trick / attack-prevention nudge, not a removal-adjacent debuff.
  - **Evidence vs reality:** evidence was `" -1/-0"`. The `-0` toughness component makes this a power-only debuff. Cards that pair with `effect.debuff_minus_n` as the kill axis (death triggers, sacrifice fodder enablers) would incorrectly link to combat tricks like this one.
  - **Suggested fix:** Narrow `effect.debuff_minus_n` regex to require a nonzero toughness reduction (`-\d+/-[1-9]\d*`), or split off a separate `effect.debuff_power_only` for -N/-0 forms. Mind there are likely other -N/-0 cards in Standard (Fleeting Distraction is small but the family is broader).

**Status (v0.27.0):** REJECTED v0.27.0 batch — intentional design. `effect.debuff_minus_n.ts:16-17` documents the -N/-0 broadening with reference to Cogwork Wrestler; positive test row at `effect.debuff_minus_n.test.ts:13` encodes `-2/-0` as TRUE. The tagDef parenthetical is descriptive, not exclusionary. Better path if needed: separate `effect.debuff_power_only` tag.

---

## Frenzied Goblin  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Goblin Berserker
**Mana cost:** {R}

**Oracle text:**

```
Whenever this creature attacks, you may pay {R}. If you do, target creature can't block this turn.
```

**Current tags:** `trigger.attack_or_block`

### Issues

- **missing**: no `effect.cant_block_until_eot` exists (single-turn block-disable family)
  - **What's wrong:** Card's main mechanical effect ("target creature can't block this turn") is unmodeled. `effect.pacify` deliberately excludes the single-turn block-only frame (per existing audit guidance / skill recurring-patterns note). No alternative tag covers the axis.
  - **Evidence vs reality:** "target creature can't block this turn" is the Falter / Frenzied Goblin / Goblin Cratermaker family — single-turn block-disable, an aggro/red push effect. Currently the goblin reads as just an attack trigger with no payoff.
  - **Suggested fix:** Author a new `effect.cant_block_until_eot` rule (lighter sibling of `effect.pacify`). Family is real but small in current Standard: Frenzied Goblin, Falter (if/when reprinted), various combat tricks. Lower priority than the missing-tag entries above.

**Status (v0.27.0):** coverage gap — deferred for new-rule authoring (see CLAUDE.md tag conventions).

---

## Fynn, the Fangbearer  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Human Warrior
**Mana cost:** {1}{G}

**Oracle text:**

```
Deathtouch (Any amount of damage this deals to a creature is enough to destroy it.)
Whenever a creature you control with deathtouch deals combat damage to a player, that player gets two poison counters. (A player with ten or more poison counters loses the game.)
```

**Current tags:** `condition.cares_deathtouch`, `effect.counter_modified`, `effect.has_deathtouch`, `trigger.damage_dealt`

### Issues

- **missing**: no `effect.give_poison_counters` (or `condition.cares_poison`) exists — poison/toxic axis entirely absent from catalog
  - **What's wrong:** Fynn is the canonical Standard poison-counter producer. No tag covers giving poison counters; `effect.counter_modified` is generic and lumps poison with +1/+1, loyalty, time, etc. Toxic-mechanic creatures (PHYREXIA: ALL WILL BE ONE) face the same gap.
  - **Evidence vs reality:** "that player gets two poison counters" is the unmistakable poison axis. Currently invisible to the graph.
  - **Suggested fix:** Add `effect.give_poison_counters` rule (regex anchored on "poison counter(s)?" / "toxic N" keyword). Companion `condition.cares_poison` for payoffs like Vraska's Fall, Skithiryx etc. Also worth a `effect.has_toxic` printed-keyword tag. Family is small in current Standard but the axis is canonical MTG and the only alt-win con worth supporting at the tag layer.

**Status (v0.27.0):** coverage gap — deferred for new-rule authoring (see CLAUDE.md tag conventions).

---

## Gate Colossus  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Artifact Creature — Construct
**Mana cost:** {8}

**Oracle text:**

```
Affinity for Gates (This spell costs {1} less to cast for each Gate you control.)
This creature can't be blocked by creatures with power 2 or less.
Whenever a Gate you control enters, you may put this card from your graveyard on top of your library.
```

**Current tags:** `condition.cares_lands`, `effect.partial_unblockable`, `trigger.another_creature_etb`

### Issues

- **false-positive**: `trigger.another_creature_etb`
  - **What's wrong:** Tag is for "creature (other than itself) enters" but evidence matches "whenever a Gate you control enters" — Gate is a land subtype, not a creature. Rule fails to anchor on the noun being "creature" specifically.
  - **Evidence vs reality:** evidence was `"whenever a gate you control enters"`. Same recurring shape as the skill's documented "filler slot is `[\w\-]+`" pattern — the regex accepts any noun. Need to tighten to require "creature" (or a recognized creature subtype) as the trigger's entered noun.
  - **Suggested fix:** Narrow `trigger.another_creature_etb` regex to require the entering noun to be "creature(s)?" or a creature-type word; exclude land subtypes (Gate, Island, Plains, Mountain, etc.).

- **missing**: `trigger.landfall`
  - **What's wrong:** Gates ARE lands. "Whenever a Gate you control enters" is a typed-landfall trigger and should fire the landfall axis. Currently invisible.
  - **Evidence vs reality:** "Whenever a Gate you control enters" — Gate is a basic land subtype just like Island/Plains. landfall players would absolutely want this card in their landfall searches.
  - **Suggested fix:** Broaden `trigger.landfall` to fire on "Whenever a (Gate|Cave|Sphere|Plains|Island|...) you control enters" — any recognized land subtype.

- **missing**: no `condition.cares_subtype.gate` exists
  - **What's wrong:** Card has "Affinity for Gates" (cost-reduction-per-Gate) and a Gate-conditional graveyard recursion trigger. Gate is a real land subtype with a real archetype (Maze's End / Gateway Plaza / Gond Gate). Currently the only Gate-care signal is the catch-all `condition.cares_lands`.
  - **Evidence vs reality:** "Affinity for Gates" + "Whenever a Gate you control enters" — explicit Gate-care, but the subtype tag doesn't exist (Cave does, Gate doesn't).
  - **Suggested fix:** Add `condition.cares_subtype.gate` parametric rule (the cares_subtype family already supports Cave, Equipment, Treasure, etc. — same pattern). Family includes Gate Colossus, Gond Gate, Basilica Gate, etc. Likely 5–15 Standard hits.

**Status (v0.27.0):** SHIPPED in v0.27.0 batch — `trigger.another_creature_etb` tribal-arm negative lookahead now excludes land subtypes (Gate, Cave, Sphere, basic-land types, Locus, Lair, Town, Mine, Tower, Power-Plant, Urza); `trigger.landfall` got a third PATTERN handling typed-land subtype triggers. `condition.cares_subtype.gate` coverage gap remains deferred for new-rule authoring.

---

## Gateway Sneak  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Vedalken Rogue
**Mana cost:** {2}{U}

**Oracle text:**

```
Whenever a Gate you control enters, this creature can't be blocked this turn.
Whenever this creature deals combat damage to a player, draw a card.
```

**Current tags:** `condition.cares_lands`, `effect.draws_or_discards`, `effect.unblockable`, `trigger.another_creature_etb`, `trigger.damage_dealt`

### Issues

- Same Gate-related issues as **Gate Colossus** entry above — `trigger.another_creature_etb` FP (Gate isn't a creature), missing `trigger.landfall` (Gate is a land), missing `condition.cares_subtype.gate`. See Gate Colossus for full discussion. Logging here as a second occurrence to confirm this is a recurring family.

**Status (v0.27.0):** SHIPPED in v0.27.0 batch — same fix as Gate Colossus (`trigger.another_creature_etb` narrowing + `trigger.landfall` broadening).

---

## Genesis Wave  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {X}{G}{G}{G}

**Oracle text:**

```
Reveal the top X cards of your library. You may put any number of permanent cards with mana value X or less from among them onto the battlefield. Then put all cards revealed this way that weren't put onto the battlefield into your graveyard.
```

**Current tags:** `condition.has_x_in_cost`, `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.look_at_top_n`

### Issues

- **missing**: `effect.cheat_into_play`
  - **What's wrong:** Genesis Wave is the canonical library-to-battlefield cheat — "put any number of permanent cards ... onto the battlefield" from a reveal-the-top-N reveal. tagDef explicitly covers "card from a zone OTHER than the graveyard directly onto the battlefield". Currently invisible to the graph as a cheat.
  - **Evidence vs reality:** "You may put any number of permanent cards with mana value X or less from among them onto the battlefield." Family includes Genesis Wave, Mind's Desire, Tooth and Nail (cast-style), See the Truth, etc. Rule probably anchors on "from exile" / "from your hand" and misses the "from among them" library-reveal frame.
  - **Suggested fix:** Broaden `effect.cheat_into_play` regex to fire on "(put|put any number of) ... permanent cards ... (from among them|revealed this way) ... onto the battlefield" — the reveal-then-cheat pattern.

- **missing**: `effect.mill`
  - **What's wrong:** Card mills the residue of the reveal ("Then put all cards revealed this way that weren't put onto the battlefield into your graveyard"). This is canonical library-to-graveyard movement and matches tagDef "Puts cards from a library into a graveyard."
  - **Evidence vs reality:** Final clause does self-mill. Rule likely requires "mills N cards" or "puts the top N cards into your graveyard" phrasing — should also match the reveal-residue frame.
  - **Suggested fix:** Broaden `effect.mill` regex to fire on "put ... [cards] ... into your graveyard" when the source is the revealed/looked-at top-N pile.

**Status (v0.27.0):** SHIPPED in v0.27.0 batch — `REVEAL_PUT` pattern added to `effect.cheat_into_play.ts` (sibling of LOOK_PUT for the "reveal the top X cards ... put from among them onto the battlefield" frame); reveal-residue arm added to `effect.mill.ts` ("cards revealed this way that weren't put onto the battlefield into <player>'s graveyard").

---

## Giant Cindermaw  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Dinosaur Beast
**Mana cost:** {2}{R}

**Oracle text:**

```
Trample (This creature can deal excess combat damage to the player or planeswalker it's attacking.)
Players can't gain life.
```

**Current tags:** `effect.has_trample`

### Issues

- **missing**: no `effect.prevent_lifegain` exists (anti-lifegain / lifegain-hate axis)
  - **What's wrong:** Card's main mechanical effect ("Players can't gain life") is unmodeled. Anti-lifegain is a real Standard archetype piece (red aggro vs. lifegain decks) but no tag covers the axis.
  - **Evidence vs reality:** "Players can't gain life" is the canonical Rampaging Ferocidon / Skullcrack / Tainted Remedy effect. Currently the card looks like just a vanilla trample creature.
  - **Suggested fix:** Author `effect.prevent_lifegain` rule (regex: `(players|opponents) can't gain life`, `if .* would gain life, .* loses that much life instead`, etc.). Family includes Giant Cindermaw, Tainted Remedy, Skullcrack — small but real. Should pair with `condition.cares_lifegain` as anti-synergy.

**Status (v0.27.0):** coverage gap — deferred for new-rule authoring (see CLAUDE.md tag conventions).

---

## Goblin Boarders  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Goblin Pirate
**Mana cost:** {2}{R}

**Oracle text:**

```
Raid — This creature enters with a +1/+1 counter on it if you attacked this turn.
```

**Current tags:** `effect.counter_modified`, `effect.plus_one_counter`

### Issues

- **missing**: no `condition.raid` exists (ability-word axis)
  - **What's wrong:** Raid is a real Khans of Tarkir / OTJ ability word that gates effects on "if you attacked this turn". No tag covers the axis; cares_attacking_creatures (if it exists, doesn't show in catalog) wouldn't be the same axis. Currently the raid gate is invisible.
  - **Evidence vs reality:** "Raid — ... if you attacked this turn" is the Outpost Siege / Bloodsoaked Champion / Goblin Boarders family. OTJ added more raid cards. Catalog already has `condition.celebration`, `condition.descend`, `condition.valiant` — raid fits the same ability-word axis pattern.
  - **Suggested fix:** Author `condition.raid` rule (regex anchored on `raid —` (U+2014) and the bare "if you attacked this turn" frame for un-ability-worded raid-style cards). Family is medium-sized in Standard.

**Status (v0.27.0):** coverage gap — deferred for new-rule authoring (see CLAUDE.md tag conventions).

---

## Goblin Smuggler  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Goblin Rogue
**Mana cost:** {2}{R}

**Oracle text:**

```
Haste (This creature can attack and {T} as soon as it comes under your control.)
{T}: Another target creature with power 2 or less can't be blocked this turn.
```

**Current tags:** `condition.cares_low_power`, `effect.has_haste`, `effect.unblockable`

### Issues

- **missing**: `effect.has_activated_ability`
  - **What's wrong:** Card has `{T}: Another target creature ... can't be blocked this turn.` — a clear activated ability — but the tag doesn't fire. Other tap-only activations are tagged correctly (Gilded Lotus, Elvish Archdruid both got `effect.has_activated_ability` for their `{T}:` lines).
  - **Evidence vs reality:** `{T}: Another target creature with power 2 or less can't be blocked this turn.` Rule likely anchors on line-start `{T}:` or `{N}, {T}:` but Goblin Smuggler's `{T}:` ability is on a second line after the haste line. Or the rule excludes haste-having creatures (unlikely). Either way, a real activated ability is being missed.
  - **Suggested fix:** Verify `effect.has_activated_ability` regex anchors aren't tied to line position; widen to multi-line scanning or per-line check. Run `rule:coverage effect.has_activated_ability` after the broadening to spot-check it didn't widen too far.

**Status (v0.27.0):** SHIPPED in v0.27.0 batch — real bug fix in `stripLeadingKeywords`. The cost-suffix `(?:\s*\{[^}]+\})?` is now gated to COST_BEARING_KEYWORDS (Equip, Ward, Cycling, etc.) only. For Goblin Smuggler `keywords=['Haste']`, the stripper was greedily eating `Haste {T}` as Haste's cost, leaving `: another...` with no anchor for SYMBOL_ACTIVATED_PATTERN. Llanowar/Krenko/Imperious Perfect were unaffected because they have no leading keyword.

---

## Harmless Offering  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {2}{R}

**Oracle text:**

```
Target opponent gains control of target permanent you control.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: no `effect.donate` (or extended `effect.control_change`) exists
  - **What's wrong:** Card's entire mechanical effect (giving away a permanent to an opponent) is unmodeled. `effect.control_change` exists but its description is "Gains control of an opponent's permanent" — that's the *steal* direction (Mind Control / Threats Undetected), not the *donate* direction.
  - **Evidence vs reality:** "Target opponent gains control of target permanent you control" is the Donate / Harmless Offering / Bazaar Trader axis. Niche but real combo enabler in eternal formats. Currently the card looks like just an instant/sorcery shell to the graph.
  - **Suggested fix:** Either (a) broaden `effect.control_change` to also fire on opponent-gains-control phrasing, splitting via metadata (`direction: "give" | "take"`); or (b) author separate `effect.donate` tag. Family is small (~3-5 Standard hits) but combo-relevant.

**Status (v0.27.0):** REJECTED v0.27.0 batch — `DONATION_SCRUB` at `effect.control_change.ts:26-31` is intentional v0.23 design; Harmless Offering is an EXPLICIT negative test row at `effect.control_change.test.ts:39` with 4 sibling negatives (Humble Defector, Wishclaw Talisman, Stiltzkin, Iroh). Defer to a new `effect.donate` tag for the give-direction axis.

---

## High Fae Trickster  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Faerie Wizard
**Mana cost:** {3}{U}

**Oracle text:**

```
Flash (You may cast this spell any time you could cast an instant.)
Flying
You may cast spells as though they had flash.
```

**Current tags:** `effect.has_flash`, `effect.has_flying`

### Issues

- **missing**: no `effect.grants_flash` / `effect.instant_speed_anything` exists
  - **What's wrong:** Card's key static ability ("You may cast spells as though they had flash") is unmodeled. This is the Vedalken Orrery / Leyline of Anticipation / Emergence Zone axis — a major archetype enabler for flash decks. Currently invisible.
  - **Evidence vs reality:** "You may cast spells as though they had flash" is a global flash-grant. Family is small (Vedalken Orrery, Leyline of Anticipation, Emergence Zone, High Fae Trickster, Vivien on the Hunt's –4) but high-impact for combo.
  - **Suggested fix:** Author `effect.grants_flash` rule (regex: `you may cast (.+? spells|spells) as though (it|they) had flash`, `(creatures|spells) you control have flash`). Family small but distinct enough to warrant its own tag.

**Status (v0.27.0):** coverage gap — deferred for new-rule authoring (see CLAUDE.md tag conventions).

---

## Leyline Axe  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Artifact — Equipment
**Mana cost:** {4}

**Oracle text:**

```
If this card is in your opening hand, you may begin the game with it on the battlefield.
Equipped creature gets +1/+1 and has double strike and trample.
Equip {3} ({3}: Attach to target creature you control. Equip only as a sorcery.)
```

**Current tags:** `effect.grants_double_strike`, `effect.grants_first_strike`, `effect.grants_stat_buff`, `effect.grants_trample`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`

### Issues

- **missing**: no `effect.has_leyline` (or `effect.starts_in_play`) exists
  - **What's wrong:** Card's defining ability (the Leyline opening-hand-deploy clause) is unmodeled. This is a unique mechanic shared by the entire Leyline cycle (Leyline Axe, Leyline of Anticipation, Leyline of the Void, etc.) — a real "starts on battlefield" axis.
  - **Evidence vs reality:** "If this card is in your opening hand, you may begin the game with it on the battlefield" is the canonical Leyline ability. Currently invisible to the graph; players searching for free-deploy cards won't find them.
  - **Suggested fix:** Author `effect.has_leyline` rule (regex: `if this card is in your opening hand, you may begin the game with it on the battlefield`). Family is ~7-10 Leyline cards across Standard + reprints. Worth a tag for the unique starts-in-play axis.

**Status (v0.27.0):** coverage gap — deferred for new-rule authoring (see CLAUDE.md tag conventions).

---

## Maze's End  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Land
**Mana cost:** (none)

**Oracle text:**

```
This land enters tapped.
{T}: Add {C}.
{3}, {T}, Return this land to its owner's hand: Search your library for a Gate card, put it onto the battlefield, then shuffle. If you control ten or more Gates with different names, you win the game.
```

**Current tags:** `condition.cares_lands`, `effect.add_mana`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`

### Issues

- **missing**: no `effect.alt_win_condition` exists
  - **What's wrong:** Card's defining alt-win clause ("you win the game") is unmodeled. Alt-win-cons are a real archetype piece (Maze's End, Approach of the Second Sun, Felidar Sovereign, Test of Endurance, Mortal Combat). Currently no tag covers this axis.
  - **Evidence vs reality:** "If you control ten or more Gates with different names, you win the game" — alt-win-con. Family is small (~5-10 cards across formats) but high-impact for jank decks and deck-defining for some archetypes.
  - **Suggested fix:** Author `effect.alt_win_condition` rule (regex: `you win the game`). Cheap and high-signal. Mirror sibling `effect.alt_lose_condition` for things like "that player loses the game" / poison-counter rule (which would pair with the missing poison axis logged on Fynn).

- **missing**: `effect.tutors_land` (already logged on Expedition Map — applies to Gate-specific tutor here too) and `condition.cares_subtype.gate` (already logged on Gate Colossus).

**Status (v0.27.0):** coverage gap — deferred for new-rule authoring (see CLAUDE.md tag conventions). `effect.alt_win_condition`, `effect.tutors_land`, and `condition.cares_subtype.gate` all belong to the next coverage-gap dispatch.

---

## Micromancer  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Human Wizard
**Mana cost:** {3}{U}

**Oracle text:**

```
When this creature enters, you may search your library for an instant or sorcery card with mana value 1, reveal it, put it into your hand, then shuffle.
```

**Current tags:** `trigger.self_etb`

### Issues

- **missing**: `condition.cares_low_mana_value`
  - **What's wrong:** Card explicitly gates the tutor on "mana value 1". `condition.cares_low_mana_value` description is "Triggers, scales, or gates on a spell or permanent with mana value N or less (N <= 4)" — should fire.
  - **Evidence vs reality:** "an instant or sorcery card with mana value 1". Rule likely requires "mana value N or less" phrasing and doesn't match the exact-equality "mana value 1" form. Worth broadening to include `mana value (N|N or less)` for low values.
  - **Suggested fix:** Broaden `condition.cares_low_mana_value` regex to also match `mana value (1|2|3|4)` (without "or less").

- **missing**: no `effect.tutors_instant_sorcery` exists (typed-tutor for instants/sorceries)
  - **What's wrong:** The tutor family has dedicated tags for creature, artifact, basic land, equipment, vehicle, etc. — but no instant-or-sorcery tutor tag. Cards like Mystical Tutor, Vampiric Tutor, Demonic Tutor lookalikes, Micromancer, Treasure Mage (artifact tutor) all reflect a typed-tutor archetype. Currently this hits only the generic effect.tutor_any (which doesn't fire — see below) or nothing.
  - **Evidence vs reality:** "search your library for an instant or sorcery card" is structurally identical to `effect.tutors_creature`'s "search your library for a creature card". Just no rule for the I/S type.
  - **Suggested fix:** Author `effect.tutors_instant_sorcery` (mirror existing tutors_creature/artifact). Family includes Mystical Tutor, Burning-Tree Vandal-ish cards, Pull from Tomorrow ish. Small-to-medium family, high deckbuilding value.

- **missing**: `effect.tutor_any`
  - **What's wrong:** tutor_any's description is "Searches library for any card (no subtype restriction)" — but Micromancer DOES search for a typed card (instant/sorcery), so tutor_any probably shouldn't fire here. Skipping this as a non-issue, included only to note the catch-all also didn't pick it up.

**Status (v0.27.0):** REJECTED v0.27.0 batch — broadening `condition.cares_low_mana_value` to bare "mana value N" would flip the existing negative test row at `condition.cares_low_mana_value.test.ts:32` ("this creature has mana value 2"). Better path: author dedicated `effect.tutors_instant_sorcery` rule, or a new `condition.cares_exact_mana_value` axis if cards repeatedly gate on exact mana value. Both deferred for coverage-gap authoring.

---

## Muldrotha, the Gravetide  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Elemental Avatar
**Mana cost:** {3}{B}{G}{U}

**Oracle text:**

```
During each of your turns, you may play a land and cast a permanent spell of each permanent type from your graveyard. (If a card has multiple permanent types, choose one as you play it.)
```

**Current tags:** `condition.cares_graveyard`

### Issues

- **missing**: no `effect.grants_cast_from_graveyard` exists (non-keyword license-style, not flashback/escape)
  - **What's wrong:** Card's ENTIRE defining ability — letting you cast permanent spells from your graveyard — is unmodeled. Skill's recurring-patterns explicitly flags this as a persistent gap ("`condition.cast_from_graveyard` for non-keyword cast-from-graveyard ('you may cast X from your graveyard' license effects, not flashback/disturb/escape)").
  - **Evidence vs reality:** "cast a permanent spell of each permanent type from your graveyard". Family includes Muldrotha, Karador, The Gitrog Monster, Yawgmoth's Will, Past in Flames, Sun Titan-like, Bolas's Citadel-like. Real archetype-defining axis.
  - **Suggested fix:** Author `effect.grants_cast_from_graveyard` (or similar) — covers permission frames distinct from the keyword family already captured in `condition.cast_from_graveyard`. Mid-size family with strong combo and deckbuilding-filter relevance.

**Status (v0.27.0):** coverage gap — deferred for new-rule authoring (see CLAUDE.md tag conventions).

---

## Progenitus  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Hydra Avatar
**Mana cost:** {W}{W}{U}{U}{B}{B}{R}{R}{G}{G}

**Oracle text:**

```
Protection from everything
If Progenitus would be put into a graveyard from anywhere, reveal Progenitus and shuffle it into its owner's library instead.
```

**Current tags:** (none)

### Issues

- **missing**: no `effect.has_protection` exists (printed protection keyword)
  - **What's wrong:** "Protection from everything" / "Protection from <X>" is a major printed keyword family — yet there's no `effect.has_protection` tag. The catalog has `effect.grants_protection` (for granting protection) but no printed-side companion. This means every creature with printed protection (True-Name Nemesis, Mother of Runes-style creatures, Progenitus, Akroma, etc.) is invisible to the protection axis.
  - **Evidence vs reality:** Pattern matches every other `effect.has_<keyword>` rule (has_flying, has_first_strike, has_trample, has_lifelink, has_vigilance, has_ward, etc.). The printed/granted split is consistent everywhere except protection.
  - **Suggested fix:** Author `effect.has_protection` rule (regex: `^protection from`, plus the `protection from .* and from .*` chains). Mirrors the rest of the `has_<kw>` family. Family is small in current Standard but the axis is canonical.

- **missing**: no `effect.shuffles_self_into_library` (anti-graveyard self-recursion / Progenitus / Emrakul style)
  - **What's wrong:** Second clause ("If Progenitus would be put into a graveyard from anywhere, reveal Progenitus and shuffle it into its owner's library instead") is the Eldrazi titan / Progenitus anti-mill, anti-discard, anti-removal-via-graveyard replacement. Niche but distinctive.
  - **Evidence vs reality:** Single-card-ish family in current Standard (Progenitus, possibly some legacy printings of Emrakul). Probably not worth a dedicated tag.
  - **Suggested fix:** Defer / skip — narrow family.

**Status (v0.27.0):** coverage gap — deferred for new-rule authoring (see CLAUDE.md tag conventions). `effect.has_protection` is the load-bearing miss; the self-shuffle clause is genuinely single-card.
