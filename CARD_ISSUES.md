# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

---

## Prowcatcher Specialist  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Goblin Warrior
**Mana cost:** {1}{R}

**Oracle text:**

```
Haste
Exhaust — {3}{R}: Put two +1/+1 counters on this creature. (Activate each exhaust ability only once.)
```

**Current tags:** `effect.counter_modified`, `effect.has_activated_ability`, `effect.has_haste`, `effect.has_mana_activated_ability`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.has_exhaust` (no such tag exists)
  - **What's wrong:** Exhaust is a new keyword cost (FIN/EOE) with 38 cards in the artifact using it. No catalog tag covers it — `npm run rule:coverage -- exhaust` returns nothing; no rule file in `pipeline/rules/` mentions exhaust.
  - **Evidence vs reality:** the card opens with `Exhaust — {3}{R}: …` which is the printed keyword frame for the mechanic. There is no current tag flagging this.
  - **Suggested fix:** Author a new rule `pipeline/rules/effect.has_exhaust.ts` matching the `^exhaust\s*—` keyword frame (em-dash, U+2014). Family is large (38 cards: Adrenaline Jockey, Afterburner Expert, Boommobile, Boom Scholar, Camera Launcher, …). Worth considering a companion `condition.cares_exhaust` if any payoff cards reference exhaust by name.

---

## Rancorous Archaic  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Avatar
**Mana cost:** {5}

**Oracle text:**

```
Trample, reach
Converge — This creature enters with a +1/+1 counter on it for each color of mana spent to cast it.
```

**Current tags:** `effect.counter_modified`, `effect.has_reach`, `effect.has_trample`, `effect.plus_one_counter`

### Issues

- **missing**: `condition.converge` (no such tag exists)
  - **What's wrong:** Converge is an ability word with 12 cards in the artifact (the Archaic cycle: Magmablood / Rancorous / Sundering / Transcendent / Wildgrowth, plus Arcane Omens, Archaic's Agony, Snarl Song, Together as One, Painful Truths, Crystalline Crawler, Uncle's Musings). No catalog tag fires on "converge —". The card's scaling (for each color of mana spent to cast it) is invisible to the graph.
  - **Evidence vs reality:** the oracle opens `Converge — …` (em-dash, U+2014). No current tag references converge.
  - **Suggested fix:** Author `pipeline/rules/condition.converge.ts` anchoring on `converge\s*—` (em-dash). Parallel to existing ability-word condition tags like `condition.descend` and `condition.celebration` (v0.14.0+). Consider whether a paired `condition.cares_color_count` is also worth adding — converge isn't the only multicolor-scaling axis (Domain has a similar shape).

---

## Lecturing Scornmage  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Human Warlock
**Mana cost:** {B}

**Oracle text:**

```
Repartee — Whenever you cast an instant or sorcery spell that targets a creature, put a +1/+1 counter on this creature.
```

**Current tags:** `condition.cares_noncreature_spell`, `effect.counter_modified`, `effect.plus_one_counter`, `trigger.spell_cast`

### Issues

- **missing**: `condition.repartee` (no such tag exists)
  - **What's wrong:** Repartee is an ability word (DSK-era) with 12 cards in the artifact: Conciliator's Duelist, Forum Necroscribe, Graduation Day, Informed Inkwright, Inkling Mascot, Inkshape Demonstrator, Lecturing Scornmage, Melancholic Poet, Rehearsed Debater, Scolding Administrator, Snooping Page, Stirring Hopesinger. The generic `trigger.spell_cast` + `condition.cares_noncreature_spell` pair fires here but doesn't capture the Repartee-specific "spell that targets a creature" constraint, so a user filtering for the Repartee mechanic finds nothing.
  - **Evidence vs reality:** the oracle opens `Repartee — …` (em-dash, U+2014). No current tag references repartee.
  - **Suggested fix:** Author `pipeline/rules/condition.repartee.ts` anchoring on `repartee\s*—` (em-dash, U+2014). Parallel to `condition.descend` / `condition.celebration`.

---

## Expressive Firedancer  <!-- audited 2026-06-01, ruleVersion v0.8.0 -->

**Type:** Creature — Human Sorcerer
**Mana cost:** {1}{R}

**Oracle text:**

```
Opus — Whenever you cast an instant or sorcery spell, this creature gets +1/+1 until end of turn. If five or more mana was spent to cast that spell, this creature also gains double strike until end of turn.
```

**Current tags:** `condition.cares_noncreature_spell`, `effect.grants_double_strike`, `effect.grants_first_strike`, `effect.grants_stat_buff`, `trigger.spell_cast`

### Issues

- **missing**: `condition.opus` (no such tag exists)
  - **What's wrong:** Opus is an ability word with 10 cards in the artifact: Colorstorm Stallion, Deluge Virtuoso, Elemental Mascot, Exhibition Tidecaller, Expressive Firedancer, Molten-Core Maestro, Muse Seeker, Spectacular Skywhale, Tackle Artist, Thunderdrum Soloist. The card's "if five or more mana was spent" big-spell scaling is not visible to the graph as a deckbuilding axis.
  - **Evidence vs reality:** the oracle opens `Opus — …` (em-dash, U+2014). No current tag references opus.
  - **Suggested fix:** Author `pipeline/rules/condition.opus.ts` anchoring on `opus\s*—` (em-dash, U+2014). Parallel to `condition.descend` / `condition.celebration`.

---

## Pull from the Grave  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Sorcery
**Mana cost:** {2}{B}

**Oracle text:**

```
Return up to two target creature cards from your graveyard to your hand. You gain 2 life.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.life_changed`

### Issues

- **missing**: `effect.return_from_graveyard_to_hand` (rule exists; not firing due to a normalization bug)
  - **What's wrong:** This is a textbook return-from-graveyard-to-hand card and the rule's regex matches the oracle text in isolation (verified via `npx tsx`). The tag isn't firing because `pipeline/normalize.ts:replaceSelfReferences` splits the card name on ` the ` / ` of `, producing the segment `"Grave"` (legendary-short-name convention), then replaces every case-insensitive occurrence — so `"graveyard"` in the oracle text gets rewritten to `"__SELF__yard"` BEFORE rules run.
  - **Evidence vs reality:** normalize output for this card is `"return up to two target creature cards from your __self__yard to your hand. you gain 2 life."` — the graveyard locator is gone, so the rule can't find `from … graveyard … to … hand`.
  - **Suggested fix:** **Pipeline bug, not a rule fix.** `pipeline/normalize.ts:replaceSelfReferences` (lines 26–44) over-applies the legendary short-name split — the ` the ` / ` of ` split is correct for legendary creatures like "Ajani the Greathearted" / "Sharae of Numbing Depths", but wrong for non-legendary cards. Either (a) gate the short-name split on `typeLine` containing `Legendary`, or (b) drop the split entirely for non-creatures, or (c) require the segment to NOT be a common-noun substring of any English word that also appears in oracle texts (a stoplist of "Grave", "Fae", "Play", "Pawn", "Detective", …).

  Same bug affects 5 other cards (full grep at audit time):
  - **Picklock Prankster // Free the Fae** — `"Fae"` segment eats `"Faerie"` in body.
  - **Detective of the Month** — `"Detective"` segment eats `"Detectives"` reference.
  - **Stolen by the Fae** — `"Fae"` segment eats `"Faerie"`.
  - **Pawn of Ulamog** — `"Pawn"` segment eats `"Spawn"` (drops the Eldrazi Spawn token reference).
  - **Striding Shotcaller // Run the Play** — `"Play"` segment eats `"player"`.

  This is a single fix that should restore tags across all six cards.

---

## Bounty Board  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Artifact
**Mana cost:** {3}

**Oracle text:**

```
{T}: Add one mana of any color.
{1}, {T}: Put a bounty counter on target creature. Activate only as a sorcery.
Whenever a creature with a bounty counter on it dies, each of its controller's opponents draws a card and gains 2 life.
```

**Current tags:** `effect.add_mana`, `effect.counter_modified`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.life_changed`, `effect.ramp_nonland`, `trigger.creature_dies`

### Issues

- **missing**: `effect.draws_or_discards` (rule subject slot doesn't recognize "each of its controller's opponents")
  - **What's wrong:** Card causes opponents to draw a card. The third clause matches "X draws a card" but the rule's subject slot only admits `you|each player|each opponent|target player|target opponent|that player`. The actual subject here is `each of its controller's opponents` — a possessive-modified plural form that's not in any of the rule's alternations.
  - **Evidence vs reality:** normalized text is `...each of its controller's opponents draws a card and gains 2 life`. `effect.life_changed` already fires from `and gains 2 life`, but the `draws a card` slips through.
  - **Suggested fix:** Broaden the primary subject slot in `pipeline/rules/effect.draws_or_discards.ts` to admit `each of <NP>'s opponents` and `each of <NP>'s controllers` (single-card scope today but the "each of X's opponents/controllers" frame is a recurring death-trigger templating shape). One option: add `each of [\w' ]+? opponents?|each of [\w' ]+? controllers?` to the alternation. Add a test case for the Bounty Board line.

---

## Humble Defector  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Creature — Human Rogue
**Mana cost:** {1}{R}

**Oracle text:**

```
{T}: Draw two cards. Target opponent gains control of this creature. Activate only during your turn.
```

**Current tags:** `effect.control_change`, `effect.draws_or_discards`, `effect.has_activated_ability`

### Issues

- **false-positive**: `effect.control_change`
  - **What's wrong:** The tagDef says *"Gains control of an opponent's permanent."* — the controller steals an opponent's stuff. Humble Defector is the inverse: the opponent gains control of YOUR creature (a donation effect). The rule's `GAIN_CONTROL` regex (`pipeline/rules/effect.control_change.ts:17`) doesn't constrain the subject, so it matches both "you gain control of target creature" AND "target opponent gains control of this creature".
  - **Evidence vs reality:** evidence is `"gains control of this creature"` but the full sentence is `"target opponent gains control of this creature"` — the controller is *giving away* the permanent, not stealing one.
  - **Suggested fix:** Tighten `GAIN_CONTROL` to exclude opponent-subject phrasings. Either (a) add a negative lookbehind for `target opponent|an opponent|each opponent|that opponent` before `gains control`, or (b) span-based negative span scrubbing similar to `effect.sacrifice_permanent`'s `NEGATIVE_EDICT`.

  Broader scope: same FP shape on 4 additional donation cards in the artifact:
  - **Harmless Offering** — pure donation, no steal effect at all.
  - **Wishclaw Talisman** — pure donation as part of an alt-cost tutor.
  - **Stiltzkin, Moogle Merchant** — pure donation engine.
  - **Iroh, Tea Master** — donation triggers Ally token creation.

  Two additional cards have BOTH legitimate steal AND donation clauses — the rule should still fire for them on the steal half, just not on the donation half:
  - **Coveted Falcon** — "gain control of target permanent you own but don't control" (legit steal) + Disguise donation.
  - **Zidane, Tantalus Thief** — "gain control of target creature an opponent controls" (legit steal) + observes opponent gaining control of yours.

  A regression test should cover both: the 5 pure donations as negatives, the 2 mixed cards as positives.

---

## Cryoshatter  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Enchantment — Aura
**Mana cost:** {U}

**Oracle text:**

```
Enchant creature
Enchanted creature gets -5/-0.
When enchanted creature becomes tapped or is dealt damage, destroy it.
```

**Current tags:** `effect.debuff_minus_n`, `trigger.damage_dealt`

### Issues

- **missing**: `effect.destroy_creature` (PATTERN_ENCHANTED too narrow)
  - **What's wrong:** This is a Pacify-shape removal aura that destroys the enchanted creature on either tap or damage. Sibling cards Cracked Skull and Sporogenic Infection get tagged because they use the exact `enchanted creature is dealt damage[...], destroy it` frame that `PATTERN_ENCHANTED` (line 28 of `effect.destroy_creature.ts`) expects. Cryoshatter's trigger admits an additional clause `becomes tapped or` BEFORE the `is dealt damage` anchor, which breaks the regex.
  - **Evidence vs reality:** the relevant clause is `when enchanted creature becomes tapped or is dealt damage, destroy it`. The current regex requires `enchanted creature is dealt damage[^.]*?, destroy it` — Cryoshatter has `enchanted creature becomes tapped or is dealt damage, destroy it`, and `becomes tapped or` is in front of `is dealt damage`, so the pattern can't anchor.
  - **Suggested fix:** Broaden `PATTERN_ENCHANTED` in `pipeline/rules/effect.destroy_creature.ts` to `\benchanted creature [^.]*?(?:is dealt damage|becomes tapped|attacks|blocks)[^.]*?,\s*destroy it\b`, OR simpler: `\benchanted creature [^.]{0,80}?, destroy it\b` and accept the broader match (the antecedent `enchanted creature` is the load-bearing constraint). Confirm with the 3 affected Standard cards: Cracked Skull + Sporogenic Infection should still match, Cryoshatter should now match.

---

## Turncoat Kunoichi  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Creature — Mutant Ninja Fox
**Mana cost:** {2}{W}

**Oracle text:**

```
Sneak {2}{W}{B} (You may cast this spell for {2}{W}{B} if you also return an unblocked attacker you control to hand during the declare blockers step. It enters tapped and attacking.)
When this creature enters, choose target creature an opponent controls. Exile that creature until this creature leaves the battlefield. If this creature's sneak cost was paid, instead exile the chosen creature.
```

**Current tags:** `trigger.self_etb`

### Issues

- **missing**: `effect.exile_creature` (anaphoric `exile that creature` not covered)
  - **What's wrong:** Standard ETB removal frame: pick a `target creature`, then `exile that creature` (with a return-when-source-leaves clause for the cheap mode, permanent exile for the Sneak mode). The rule's anaphoric patterns (`PATTERN_ANAPHORIC` / `PATTERN_ANAPHORIC_SAME_SENTENCE` in `effect.exile_creature.ts:34–38`) require literal `exile it` and do not accept `exile that creature`. The dies-exile pattern (line 28) correctly admits `(?:it|that creature|them)` — the anaphoric arms should be made consistent.
  - **Evidence vs reality:** normalized text is `... choose target creature an opponent controls. exile that creature until this creature leaves the battlefield. ...` — the antecedent "target creature" is there, then `exile that creature` follows. The current regex's `\bexile it\b` requirement misses this.
  - **Suggested fix:** Broaden the anaphoric pronoun group in BOTH `PATTERN_ANAPHORIC` and `PATTERN_ANAPHORIC_SAME_SENTENCE` from `\bexile it(?!…)` to `\bexile (?:it|that creature|them)(?!…)`, mirroring `PATTERN_DIES_EXILE`. Re-verify the `FLICKER_TAIL` suppression still triggers properly for both pronoun forms.
- **missing**: `effect.has_sneak` (no such tag exists)
  - **What's wrong:** Sneak is a new alt-cost keyword (FIN/EOE-era). The keyword frame `Sneak {cost}` is intact after normalization but no rule tags it.
  - **Suggested fix:** Author `pipeline/rules/effect.has_sneak.ts`. Need to count standard-set Sneak cards first to confirm family size — at least Turncoat Kunoichi here, presumably part of a cycle.

---

## Dragoon's Lance  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Artifact — Equipment
**Mana cost:** {1}{W}

**Oracle text:**

```
Job select (When this Equipment enters, create a 1/1 colorless Hero creature token, then attach this to it.)
Equipped creature gets +1/+0 and is a Knight in addition to its other types.
During your turn, equipped creature has flying.
Gae Bolg — Equip {4}
```

**Current tags:** `condition.cares_tribe.knight`, `effect.grants_evasion`, `effect.grants_stat_buff`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`

### Issues

- **missing**: `effect.has_job_select` (no such tag exists; 19-card family)
  - **What's wrong:** Job select is a FIN Equipment keyword on 19 Standard cards (Astrologian's Planisphere, Bard's Bow, Black Mage's Rod, Dark Knight's Greatsword, Dragoon's Lance, Machinist's Arsenal, Monk's Fist, Ninja's Blades, Paladin's Arms, Red Mage's Rapier, Sage's Nouliths, Samurai's Katana, Summoner's Grimoire, Thief's Knife, Warrior's Sword, …). Each prints `Job select` as a top-line keyword with the ETB "create a Hero token and attach this" definition in reminder text — so the token-creation semantics are stripped before tagging. Equipment archetype + Hero-tribal deckbuilders cannot filter this family.
  - **Evidence vs reality:** the bare keyword `job select` survives normalization (it's on its own line, not in parens), so a keyword-line rule can catch it. Token-creation tag won't fire because of the reminder-text strip — `effect.has_job_select` would compensate, and a `pairsWith: ['condition.cares_tribe.hero', 'condition.cares_artifacts']` bridge would restore the missing graph edges.
  - **Suggested fix:** Author `pipeline/rules/effect.has_job_select.ts` anchoring on `^job select\b` (start-of-line) or the standalone-keyword-line shape used by other `has_<kw>` rules. Optionally, also author `condition.cares_tribe.hero` if not already present — Hero tokens become a tribal axis with this mechanic.

---

## Archmage of Echoes  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Creature — Faerie Wizard
**Mana cost:** {4}{U}

**Oracle text:**

```
Flying, ward {2}
Whenever you cast a Faerie or Wizard permanent spell, copy it. (The copy becomes a token.)
```

**Current tags:** `condition.cares_tribe.faerie`, `condition.cares_tribe.wizard`, `effect.copy_spell`, `effect.has_flying`, `effect.has_ward`

### Issues

- **missing**: `trigger.spell_cast` (regex qualifier slot doesn't admit `tribe-or-tribe + permanent + spell`)
  - **What's wrong:** Sibling cards Brass's Tunnel-Grinder, The Everflowing Well, and Unbound Flourishing all get `trigger.spell_cast` from `whenever you cast a permanent spell`. Archmage of Echoes has the same trigger frame plus a tribal qualifier — `whenever you cast a Faerie or Wizard permanent spell`. The current regex's qualifier group (`pipeline/rules/trigger.spell_cast.ts:33`) is `(?:[\w-]+(?: or [\w-]+)? )?` which matches `faerie or wizard ` then needs the next token to be `spell` — but the actual next token is `permanent`. There's no slot for both a tribal alternation AND a `permanent`/`creature` type qualifier before `spell`.
  - **Evidence vs reality:** normalized text is `whenever you cast a faerie or wizard permanent spell, copy it.`. The regex consumes `a faerie or wizard ` then expects `spell` but sees `permanent`.
  - **Suggested fix:** Extend the regex to allow an additional `[\w-]+ ` slot AFTER the qualifier group: change the trailing group to `(?:[\w-]+(?: or [\w-]+)? )?(?:[\w-]+ )?spell\b`. Single-card scope today (only Archmage matches this exact frame) but the fix is small and unlocks the trigger for a templated archetype shape (tribal-permanent triggers) likely to recur.

---

## Tale of Katara and Toph  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Enchantment
**Mana cost:** {2}{G}

**Oracle text:**

```
Creatures you control have "Whenever this creature becomes tapped for the first time during each of your turns, put a +1/+1 counter on it."
```

**Current tags:** `(none — card is currently UNTAGGED)`

### Issues

- **missing-all**: card has zero tags due to anthem-style grant-quote strip
  - **What's wrong:** The v0.13.4 normalization strips paired `"…"` granted-ability quotes before rules run, so the entire mechanical body of this card disappears. After strip the rule machinery sees only `creatures you control have .` — nothing to match. The card produces a +1/+1 counter payoff (tap-trigger gated, one trigger per turn per creature) that's totally invisible to graph queries.
  - **Evidence vs reality:** the granted ability is real and substantive — it's a board-wide tap-counter engine. Players filtering for "+1/+1 counter producers" or "counter payoff" archetypes would not find this card.
  - **Suggested fix:** **Pipeline-level enhancement, not a single-rule fix.** Detect the anthem-grant frame `<subject> (?:has|have) "<inner>"` BEFORE the quote-strip step and copy/forward applicable tag matches from the inner span to the source card with an explicit "granted via anthem" marker (perhaps `evidence: 'granted: …'`). Same family-impact: Citanul Hierophants is the other Standard card with zero tags due to this same shape — it grants every creature `"{T}: Add {G}"`, missing every mana-production tag.

  Single-fix candidate (alternative): if the inner grant contains a known keyword frame (mana ability `{T}: Add {X}`, counter trigger, ETB, etc.), forward that one tag onto the source. Won't catch every grant, but cuts the zero-tag artifact down to single digits.

---

## Colfenor's Urn  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Artifact
**Mana cost:** {3}

**Oracle text:**

```
Whenever a creature with toughness 4 or greater is put into your graveyard from the battlefield, you may exile it.
At the beginning of the end step, if three or more cards have been exiled with this artifact, sacrifice it. If you do, return those cards to the battlefield under their owner's control.
```

**Current tags:** `(none — card is currently UNTAGGED)`

### Issues

Card has zero tags despite four distinct mechanical effects. Three regex-level misses plus one true coverage gap.

- **missing**: `trigger.creature_dies` / `trigger.creature_leaves_battlefield` (RAW "put into graveyard from the battlefield" phrasing)
  - **What's wrong:** Known recurring pattern (per skill notes): the `<type>_leaves_battlefield` and dies-trigger rules anchor on `dies` / `leaves the battlefield` and miss the equivalent RAW rules-speak `is put into your graveyard from the battlefield`. Colfenor's Urn uses exactly this phrasing.
  - **Suggested fix:** Add a sibling pattern to both `trigger.creature_dies` and `trigger.creature_leaves_battlefield` rules: `whenever (?:a |an |another )?(?:creature|permanent)[^.]*?is put into [\w' ]+ graveyard from the battlefield`. Same edit unblocks the typed `_leaves_battlefield` family for any card using this template.

- **missing**: `trigger.beginning_of_end_step` (regex requires `your|each|each player's|each opponent's|the next` qualifier; rejects bare `the end step`)
  - **What's wrong:** 10 Standard cards use the lazy templating `at the beginning of the end step` (no qualifier) and NONE get tagged: Ball Lightning, Chandra Flameshaper, Electroduplicate, Kav Landseeker, Grub Storied Matriarch, Kindle the Inner Flame, Choreographed Sparks, Rite of the Raging Storm, Colfenor's Urn, Strago and Relm.
  - **Suggested fix:** Extend `PATTERN` in `pipeline/rules/trigger.beginning_of_end_step.ts:31` to admit `the end step` directly: `at the beginning of (?:your(?: next)?|each(?: player's| opponent's)?|the(?: next(?: player's)?)?) end step`. The `the` arm covers the bare lazy frame.

- **missing**: `effect.exile_from_graveyard` (anaphoric `exile it` where antecedent is a dying-creature trigger)
  - **What's wrong:** The first ability triggers on a creature being put into graveyard and then `you may exile it`. The `effect.exile_from_graveyard` rule presumably wants a direct `exile X from your graveyard` phrasing — the anaphoric `it` referring to a freshly-graveyarded creature isn't captured.
  - **Suggested fix:** Worth checking the rule for whether it handles the `is put into graveyard, ... exile it` chain. If not, add a pattern parallel to `effect.exile_creature`'s `PATTERN_DIES_EXILE`: `\bis put into (?:your\s+)?graveyards?[^.]*?,\s*(?:you may\s+)?exile (?:it|that creature|them)\b`.

- **missing**: `effect.sacrifice_artifact` (anaphoric self-sacrifice `sacrifice it` where antecedent is the source artifact)
  - **What's wrong:** Second ability says `sacrifice it` where `it` refers to Colfenor's Urn itself (the source artifact). The typed-sac rule likely wants `sacrifice <determiner> artifact` rather than the bare pronoun. Self-sacrifice via `sacrifice it` / `sacrifice ~` / `sacrifice this artifact` is common on artifacts with conditional sac.
  - **Suggested fix:** Check whether `effect.sacrifice_artifact` already handles `sacrifice this artifact` (likely yes via `__SELF__`-targeted form). If yes, the anaphoric `sacrifice it` for source-typed self-references is the gap. Add an anaphoric arm: when the source card type is Artifact and the text says `sacrifice it`, fire the tag. This needs `matchCard` rather than `match` since type is required.

- **coverage gap**: `effect.cheat_into_play` (no such tag exists; explicit known gap per skill notes)
  - **What's wrong:** The third clause returns the exiled cards directly to the battlefield — reanimator-style but from exile rather than graveyard. Per skill notes this is a deferred gap: `effect.cheat_into_play (exile-to-battlefield reanimator-style; distinct from effect.reanimate's graveyard-to-battlefield)`. Re-flagging since this is a clear instance of the family.

---

## Gray Merchant of Asphodel  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Creature — Zombie
**Mana cost:** {3}{B}{B}

**Oracle text:**

```
When this creature enters, each opponent loses X life, where X is your devotion to black. You gain life equal to the life lost this way. (Each {B} in the mana costs of permanents you control counts toward your devotion to black.)
```

**Current tags:** `effect.life_changed`, `trigger.self_etb`

### Issues

- **missing**: `condition.devotion` (no such tag exists; 7-card family)
  - **What's wrong:** Devotion is a defining Theros mechanic (counts colored pips on your permanents) on 7 Standard cards: Clive/Ifrit, March of the Canonized, Thassa God of the Sea, Xenagos God of Revels, Athreos Shroud-Veiled, Gray Merchant of Asphodel, Mogis God of Slaughter. None of these have a `condition.devotion` tag — the mono-color "stack pips for payoff" archetype is invisible to the graph.
  - **Evidence vs reality:** the body text `where X is your devotion to black` is intact post-normalization (the parenthetical definition is stripped, the body survives).
  - **Suggested fix:** Author a parametric rule `pipeline/rules/condition.devotion.ts` covering all five colors: `condition.devotion.white|blue|black|red|green` (anchored on `devotion to (?:white|blue|black|red|green)`). Mirrors the structure of `condition.cares_tribe.<X>` and `condition.cares_subtype.<X>` (see `pipeline/rules/condition.cares_tribe.ts`). Pair each with anthem-typed payoffs in the mono-color archetype.

---

## Containment Construct  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Artifact Creature — Construct
**Mana cost:** {2}

**Oracle text:**

```
Whenever you discard a card, you may exile that card from your graveyard. If you do, you may play that card this turn.
```

**Current tags:** `trigger.card_drawn_discarded`

### Issues

- **missing**: `effect.exile_from_graveyard` (anaphoric `exile that card from your graveyard`)
  - **What's wrong:** The card discards then exiles the discarded card from its own graveyard, then lets it be cast — the impulse-from-discard family. None of the rule's six arms (`FOREIGN_OR_GENERIC`, `OWN_TARGETED`, `OWN_QUANTIFIED`, `MASS_WIPE`, `IN_GRAVEYARD`, `OWN_NUMBER_QUANTIFIED` in `effect.exile_from_graveyard.ts`) admits the anaphoric object `that card` — they want `target X`, `one or more X`, or a specific quantifier slot. `Currency Converter` has the same shape and is also untagged.
  - **Evidence vs reality:** normalized text is `whenever you discard a card, you may exile that card from your graveyard. if you do, you may play that card this turn.` The phrase `exile that card from your graveyard` is the canonical anaphoric self-exile, identical to how `effect.exile_creature`'s `PATTERN_DIES_EXILE` handles the anaphoric battlefield case.
  - **Suggested fix:** Add a fourth/seventh anaphoric arm requiring a same-or-prior-sentence antecedent. Simpler interim: add `OWN_ANAPHORIC = /\bexile (?:that card|that creature|it|them) from your graveyard\b/` with the caveat that "it/them" alone is broad — gate on the prior clause containing a referent (discard, mill, dies). Test against both Containment Construct AND Currency Converter as positives.
- **missing**: `effect.impulse_draw` (license-to-cast frame `you may play that card this turn`)
  - **What's wrong:** Tag exists in catalog (`effect.impulse_draw`). The pattern likely anchors on the more-canonical `you may play it/this card until end of turn` frame and misses the `play that card this turn` variant from anaphoric exile-then-cast cards. Both Containment Construct and Currency Converter use this exact shape.
  - **Suggested fix:** Check the existing `effect.impulse_draw` regex and broaden the object slot to include `that card`. Single-card scope per Containment Construct (just it + Currency Converter), but the impulse-from-discard archetype is a known graveyard interaction the graph should expose.

---

## Bosco, Just a Bear  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Legendary Creature — Bear
**Mana cost:** {4}{G}

**Oracle text:**

```
When Bosco enters, create a Food token for each legendary creature you control. (It's an artifact with "{2}, {T}, Sacrifice this token: You gain 3 life.")
{2}{G}, Sacrifice a Food: Put two +1/+1 counters on Bosco. He gains trample until end of turn.
```

**Current tags:** `condition.cares_subtype.food`, `effect.counter_modified`, `effect.create_food`, `effect.create_token`, `effect.grants_trample`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.plus_one_counter`, `effect.sacrifice_artifact`, `trigger.self_etb`

### Issues

- **missing**: `condition.cares_legendary` (no such tag exists; 27-card family)
  - **What's wrong:** Legendary-matters is a real Standard archetype with 27 cards in the artifact. Examples: The Irencrag, the "Joins Up" cycle (Annie / Kellan / Rakdos / Tinybones / Vraska), Nashi Searcher in the Dark, Zimone All-Questioning, The Seriema, Ardbert Warrior of Darkness, Price of Fame, Leyline Dowser, Hero's Blade, … None of these have a `cares_legendary` tag, so the legendary-tribal archetype is invisible to the graph (filter "what pairs with Atraxa or other legendaries" returns nothing).
  - **Evidence vs reality:** Bosco's ETB scales token creation `for each legendary creature you control` — payoff scaling on legendary count. Same scope as `condition.cares_tribe.<X>` parametric tags.
  - **Suggested fix:** Author `pipeline/rules/condition.cares_legendary.ts` anchoring on phrases like `for each legendary (?:creature|permanent)`, `legendary (?:creatures?|permanents?) you control`, `another legendary`, `two or more legendary`, `legendary spells`. Pair with `effect.create_creature_token` (legendary-token producers), removal effects scoped to legendaries, and tribal payoffs. Mirrors `condition.cares_subtype.<X>` structure.

---

## Hymn of the Faller  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Sorcery
**Mana cost:** {1}{B}

**Oracle text:**

```
Surveil 1, then you draw a card and lose 1 life. (To surveil 1, look at the top card of your library. You may put it into your graveyard.)
Void — If a nonland permanent left the battlefield this turn or a spell was warped this turn, draw another card.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.draws_or_discards`, `effect.is_instant_or_sorcery`, `effect.life_changed`, `effect.surveil`

### Issues

- **missing**: `condition.void` (no such tag exists; 14-card family)
  - **What's wrong:** Void is an ability word (EOE-era) with 14 cards: Alpharael Stonechosen, Chorale of the Void, Decode Transmissions, Elegy Acolyte, Hylderblade, Hymn of the Faller, Insatiable Skittermaw, Interceptor Mechan, … None tagged. The Void condition is satisfied by "a nonland permanent left the battlefield this turn or a spell was warped this turn" — leaves-battlefield + warp payoff axis.
  - **Suggested fix:** Author `pipeline/rules/condition.void.ts` anchoring on `void\s*—` (em-dash, U+2014). Parallel to `condition.descend` / `condition.celebration` / the other ability-word condition tags. Pair with `trigger.permanent_leaves_battlefield` and (future) `effect.has_warp`.

- **missing**: `condition.cares_warped` (`effect.has_warp` DOES exist — the gap is the cares-side payoff)
  - **What's wrong:** Correction to the original audit: `effect.has_warp` is in the catalog (51-card warp family already tagged). The actual gap surfaced by Hymn of the Faller's Void clause is the *cares* axis: `if a spell was warped this turn` is a payoff that scales on warped-spell count, with no corresponding `condition.cares_warped` tag.
  - **Suggested fix:** Author `pipeline/rules/condition.cares_warped.ts` anchoring on phrases like `a spell was warped`, `spells warped`, `cards warped`. Pair bidirectionally with `effect.has_warp`. Small expected scope — likely the Void cycle (~14 cards) plus a handful of dedicated warp payoffs.

---

## Requiem Monolith  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Artifact
**Mana cost:** {2}{B}

**Oracle text:**

```
{T}: Until end of turn, target creature gains "Whenever this creature is dealt damage, you draw that many cards and lose that much life." That creature's controller may have this artifact deal 1 damage to it. Activate only as a sorcery.
```

**Current tags:** `effect.has_activated_ability`

### Issues

- **missing**: `effect.deals_damage` (subjunctive `deal` after `may have`)
  - **What's wrong:** Sentence is `That creature's controller may have this artifact deal 1 damage to it` — subjunctive verb form after `may have`. The deals_damage `PATTERNS` slots (`pipeline/rules/effect.deals_damage.ts`) all require `deals` (with `-s`). The `may have <X> deal …` frame is a damage source — the artifact deals damage, just gated on a triggered choice.
  - **Evidence vs reality:** normalized text retains `may have this artifact deal 1 damage to it` (the granted-quote-strip removed the contained trigger but left this clause intact). Sibling card Kederekt Parasite has the same frame and is also missing the tag.
  - **Suggested fix:** Add a subjunctive arm to PATTERNS: `new RegExp(\`\\bmay have \${SUBJ} deal \${MULT}\\d+ (?:combat )?damage\\b\`)`. 2-card scope but the `may have <X> deal` template is common in MTG (older red removal often uses it). Add Requiem Monolith and Kederekt Parasite as regression positives.

---

## Constrictor Sage  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Creature — Snake Wizard
**Mana cost:** {4}{U}

**Oracle text:**

```
When this creature enters, tap target creature an opponent controls and put a stun counter on it. (If a permanent with a stun counter would become untapped, remove one from it instead.)
Renew — {2}{U}, Exile this card from your graveyard: Tap target creature an opponent controls and put a stun counter on it. Activate only as a sorcery.
```

**Current tags:** `effect.counter_modified`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.stun_counter`, `effect.tap`, `trigger.self_etb`

### Issues

- **missing**: `effect.has_renew` (no such tag exists; 12-card family)
  - **What's wrong:** Renew is a DSK keyword on 12 Standard cards (Adorned Crocodile, Agent of Kotis, Alchemist's Assistant, Champion of Dusan, Constrictor Sage, …). The keyword grants a graveyard-activated ability that exiles the card to do its ETB-style effect again — a graveyard recursion axis. `condition.cast_from_graveyard` lists Harmonize / Flashback / Disturb / Embalm / Eternalize / Encore / Escape / Jump-start / Unearth but NOT Renew. Renew is technically an activated ability (not a cast) so cast_from_graveyard is the wrong shape — needs its own tag.
  - **Evidence vs reality:** the body text retains `renew — {cost}, exile this card from your graveyard: …` after normalization (the parens explanation is reminder text, but the cost+effect line survives).
  - **Suggested fix:** Author `pipeline/rules/effect.has_renew.ts` anchoring on `^renew\s*—`. Pair with `condition.cares_graveyard`. Optionally retire-and-broaden by extending `condition.cast_from_graveyard` to also tag Renew, but the strict interpretation (cast vs activated ability) suggests a distinct tag is cleaner.

---

## Inspirited Vanguard  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Creature — Human Soldier
**Mana cost:** {4}{G}

**Oracle text:**

```
Whenever this creature enters or attacks, it endures 2. (Put two +1/+1 counters on it or create a 2/2 white Spirit creature token.)
```

**Current tags:** `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **missing**: `effect.endure` (no such tag exists; 10-card family — losing all mechanical tagging)
  - **What's wrong:** Endure is a DSK keyword action with 10 Standard cards: Anafenza Unyielding Lineage, Descendant of Storms, Dusyut Earthcarver, Fortress Kin-Guard, Inspirited Vanguard, Kin-Tree Nurturer, Krumar Initiate, Sandskitter Outrider, Sinkhole Surveyor, Warden of the Grove. The keyword's effect (put N +1/+1 counters OR create a 2/2 Spirit) lives entirely in reminder text and gets stripped before tagging — so on a card like Inspirited Vanguard where the entire trigger payload IS `endures 2`, the card ends up with only the trigger framing tagged (no effect at all).
  - **Evidence vs reality:** body text retains `it endures 2` (verb survives the reminder strip) but the rule machinery has no `endure` tag to fire. Players filtering for +1/+1-counter producers OR Spirit-token producers would miss every endure card.
  - **Suggested fix:** Author `pipeline/rules/effect.endure.ts` anchoring on `endures? \d+` (number variants). Pair bidirectionally with both `condition.cares_plus_one_counter` and `condition.cares_tribe.spirit` (endure produces BOTH archetypes' resources). This is the cleanest fix; the alternative of leaving reminder-text expansion to a future LLM verification pass means 9 cards stay zero-effect-tagged in the meantime.

---

## Poisoner's Apprentice  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Creature — Orc Warlock
**Mana cost:** {2}{B}

**Oracle text:**

```
Infusion — When this creature enters, target creature an opponent controls gets -4/-4 until end of turn if you gained life this turn.
```

**Current tags:** `condition.cares_lifegain`, `effect.debuff_minus_n`, `trigger.self_etb`

### Issues

- **missing**: `condition.infusion` (no such tag exists; 12-card family)
  - **What's wrong:** Infusion is an ability word with 12 Standard cards: Efflorescence, Follow the Lumarets, Foolish Fate, Lumaret's Favor, Moseo Vein's New Dean, Old-Growth Educator, Poisoner's Apprentice, Tenured Concocter, … Same ability-word shape as Opus/Repartee/Converge — generic condition tags like `condition.cares_lifegain` fire on the body but the Infusion-named axis is invisible to graph filters.
  - **Suggested fix:** Author `pipeline/rules/condition.infusion.ts` anchoring on `infusion\s*—` (em-dash, U+2014). Parallel to the existing ability-word `condition.descend` / `condition.celebration`.

---

## Eye of Duskmantle  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Creature — Eye
**Mana cost:** {5}{B}{B}

**Oracle text:**

```
Flying, lifelink
You may play lands and cast spells from among cards in your graveyard you've surveilled this turn. If you cast a spell this way, you pay life equal to its mana value rather than paying its mana cost.
```

**Current tags:** `condition.cares_graveyard`, `effect.has_flying`, `effect.has_lifelink`

### Issues

- **missing**: `effect.life_changed` (PAY pattern requires literal `\d+|x` — misses `pay life equal to`)
  - **What's wrong:** 8 Standard cards use `pay life equal to <X>` as an alt-cost frame: Valgavoth Terror Eater, Raubahn Bull of Ala Mhigo, Gwenom Remorseless, Madame Null Power Broker, Eye of Duskmantle, War Room, Marshland Bloodcaster, Nashi Moon Sage's Scion. None get `effect.life_changed`. The rule's `PAY = /\bpay (?:[\d,]+|x) life\b/` (`effect.life_changed.ts`) requires a digit/x slot — the variable-bound form `pay life equal to <expr>` slips through.
  - **Suggested fix:** Add a `PAY_VARIABLE` arm to `effect.life_changed`: `/\bpay life equal to /`. Mirror `VARIABLE` (which handles `gains?|loses? life equal to`). 8-card family across multiple sets — this is a recurring alt-cost shape, not a one-off.

---

## Aetherwind Basker  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Creature — Lizard
**Mana cost:** {4}{G}{G}{G}

**Oracle text:**

```
Trample
Whenever this creature enters or attacks, you get {E} (an energy counter) for each creature you control.
Pay {E}: This creature gets +1/+1 until end of turn.
```

**Current tags:** `effect.grants_stat_buff`, `effect.has_activated_ability`, `effect.has_trample`, `trigger.attack_or_block`, `trigger.self_etb`

### Issues

- **missing**: `effect.energy` / `condition.cares_energy` (no such tags; 25-card family)
  - **What's wrong:** Energy (`{E}` counters) is a major Standard mechanic with 25 cards in the artifact: Aetherflux Conduit, Aether Hub, Aethersquall Ancient, Aethertide Whale, Aetherwind Basker, Aetherworks Marvel, Architect of the Untamed, Attune with Aether, Bespoke Battlewagon, Confiscation Coup, … No catalog tag covers either the production side (`you get {E}`) or the spend side (`pay {E}`). The energy-counter archetype is invisible to graph queries.
  - **Suggested fix:** Author two paired rules: `effect.produces_energy` anchoring on `you get \{e\}` / `you get .* \{e\}` patterns, and `effect.spends_energy` anchoring on `pay\s+(?:[\d,x]+\s+)?\{e\}`. Bidirectional `pairsWith` so producers and spenders link in the graph. Mirrors the existing typed-counter tag structure (`effect.plus_one_counter` / `condition.cares_plus_one_counter`).

---

## Gempalm Polluter  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Creature — Zombie
**Mana cost:** {5}{B}

**Oracle text:**

```
Cycling {B}{B} ({B}{B}, Discard this card: Draw a card.)
When you cycle this card, you may have target player lose life equal to the number of Zombies on the battlefield.
```

**Current tags:** `condition.cares_tribe.zombie`, `effect.has_cycling`

### Issues

- **missing**: `effect.life_changed` (no causative arm for `have X lose/gain life`)
  - **What's wrong:** Sibling rule `effect.draws_or_discards` has a `causative` arm covering `have <target> draw/discard …` (Alania, Divergent Storm shape). `effect.life_changed` does NOT. The subject slot in the existing `QUANT` / `VARIABLE` patterns requires the subject to be IMMEDIATELY before `gains?|loses?`, so the `have <subject> lose life` frame slips through. Affects 4 Standard cards: Blood Seeker, Gempalm Polluter, Ob Nixilis the Fallen, plus Bloodchief Ascension (which tags via a different clause).
  - **Suggested fix:** Add a causative arm to `effect.life_changed`: `/\bhave (?:target opponent|target player|each opponent|each player|that player|that opponent|them)\s+(?:gains?|loses?)\s+(?:[\d,]+|x)?\s*life(?:\s+equal\s+to)?/`. Mirror the `causative` arm in `effect.draws_or_discards.ts:43`.

---

## Prison Break  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Sorcery
**Mana cost:** {4}{B}

**Oracle text:**

```
Return target creature card from your graveyard to the battlefield with an additional +1/+1 counter on it.
Mayhem {3}{B} (You may cast this card from your graveyard for {3}{B} if you discarded it this turn. Timing rules still apply.)
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`, `effect.plus_one_counter`, `effect.reanimate`

### Issues

- **missing**: `condition.cast_from_graveyard` (Mayhem keyword missing from rule's keyword set)
  - **What's wrong:** Mayhem is a Marvel-set keyword that lets you cast a card from your graveyard if you discarded it this turn (alt-cost graveyard-cast). The `condition.cast_from_graveyard` rule (`pipeline/rules/condition.cast_from_graveyard.ts:17`) maintains a keyword set: `{Harmonize, Flashback, Disturb, Embalm, Eternalize, Encore, Escape, Jump-start, Unearth}`. Mayhem belongs in this set semantically — it's the same archetype (graveyard as a casting zone), just a different keyword name. 12 Standard cards have the Mayhem keyword: Carnage Crimson Chaos, Chameleon Master of Disguise, Electro's Bolt, Oscorp Industries, Prison Break, Raging Goblinoids, Rocket-Powered Goblin Glider, Sandman's Quicksand, Scarlet Spider Kaine, Spider-Islanders, …
  - **Suggested fix:** Add `'Mayhem'` to `CAST_FROM_GRAVEYARD_KEYWORDS`. Update the tagDef description to include Mayhem. Update the tagDef's `pairsWith: ['effect.mill']` rationale to mention discard payoffs as another upstream — Mayhem specifically gates on having been discarded this turn, so pairing with `trigger.card_drawn_discarded` may also be worth adding.

---

## Curtains' Call  <!-- audited 2026-06-01, ruleVersion v0.22.0 -->

**Type:** Instant
**Mana cost:** {5}{B}

**Oracle text:**

```
Undaunted (This spell costs {1} less to cast for each opponent.)
Destroy two target creatures.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.destroy_creature` (regex doesn't admit bare number determiner — only `up to N`)
  - **What's wrong:** A two-target removal spell that has no destroy tag. `PATTERN_OWN` in `effect.destroy_creature.ts:16-17` admits `(?:up to (?:one|two|...) )?(?:another|target|each|all|that)` — the bare number form `destroy two target creatures` (no "up to" preceding) doesn't match because `two` isn't in the determiner alternation. Both Standard cards using this phrasing are untagged: Curtains' Call AND Hex.
  - **Evidence vs reality:** normalized text is `undaunted destroy two target creatures.`. The current regex requires either `up to two` (with the `up to` particle) or a non-numeric determiner.
  - **Suggested fix:** Broaden the optional number-quantifier slot to admit bare numbers WITHOUT `up to`: change `(?:up to (?:one|two|three|four|five|\w+)\s+)?` to `(?:(?:up to\s+)?(?:one|two|three|four|five|\w+)\s+)?`. Verify Hex (which has the same exact phrasing) also picks up the tag after the fix. The same broadening should be considered for the parallel `PATTERN_BROAD` (permanents) since "destroy two target permanents" is the symmetric shape.

