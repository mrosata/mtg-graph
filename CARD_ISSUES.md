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
