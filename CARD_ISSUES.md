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

## Tomik, Wielder of Law  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Human Advisor
**Mana cost:** {1}{W}{B}

**Oracle text:**

```
Affinity for planeswalkers (This spell costs {1} less to cast for each planeswalker you control.)
Flying, vigilance
Whenever an opponent attacks with creatures, if two or more of those creatures are attacking you and/or planeswalkers you control, that opponent loses 3 life and you draw a card.
```

**Current tags:** `effect.draws_or_discards`, `effect.has_flying`, `effect.has_vigilance`, `trigger.attack_or_block`

### Issues

- **missing**: `condition.cares_planeswalkers` (coverage gap — no such tag in catalog)
  - **What's wrong:** Card scales cost via Affinity for planeswalkers AND its combat trigger gates on opponents attacking "planeswalkers you control". Catalog has only `effect.<verb>_planeswalker` tags; no condition axis.
  - **Evidence vs reality:** No tag in catalog flags "cares about planeswalkers you control" — would not show up as a planeswalker-deck payoff in filter queries.
  - **Suggested fix:** Author `condition.cares_planeswalkers` rule keyed on `planeswalkers? you control`, `for each planeswalker`, `for each planeswalker`, `attacks?.+planeswalker`. Pair with `effect.create_planeswalker` (if/when authored) and existing `effect.*_planeswalker` family.

---

## Torch the Witness  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {X}{R}

**Oracle text:**

```
Torch the Witness deals twice X damage to target creature. If excess damage was dealt to that creature this way, investigate.
```

**Current tags:** `condition.has_x_in_cost`, `effect.cast_noncreature_spell`, `effect.create_clue`, `effect.create_token`, `effect.is_instant_or_sorcery`

### Issues

- **missing** (coverage gap): `condition.cares_excess_damage` (no such tag in catalog)
  - **What's wrong:** "If excess damage was dealt to that creature this way" is the excess-damage conditional family (Atraxa, Grand Unifier-adjacent; Tribute to the World Tree; this card). Not currently distinguishable from generic deals_damage payoffs.
  - **Evidence vs reality:** No catalog tag matches `excess damage`.
  - **Suggested fix:** Author `condition.cares_excess_damage` only if the family is >5 cards in Standard. Otherwise skip — this single card doesn't warrant a tag.

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

## Unyielding Gatekeeper  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Creature — Elephant Cleric
**Mana cost:** {1}{W}

**Oracle text:**

```
Disguise {1}{W}
When this creature is turned face up, exile another target nonland permanent. If you controlled it, return it to the battlefield tapped. Otherwise, its controller creates a 2/2 white and blue Detective creature token.
```

**Current tags:** `effect.create_creature_token`, `effect.create_token`, `effect.exile_enchantment`, `effect.exile_planeswalker`, `effect.has_disguise`, `trigger.turned_face_up`

### Issues

- **missing**: `effect.exile_creature` and `effect.exile_artifact`
  - **What's wrong:** `exile_enchantment` and `exile_planeswalker` correctly fired on "exile another target nonland permanent", but `exile_creature` and `exile_artifact` were suppressed by their `FLICKER_TAIL` guard checking for `\breturn (?:it|them|...) ... to the battlefield\b` in the trailing 200 chars.
  - **Evidence vs reality:** The trailing text is `If you controlled it, return it to the battlefield tapped. Otherwise, its controller creates a 2/2 ... Detective creature token.` — that's a CONDITIONAL ("If you controlled it") split-mode effect, not a pure flicker. For opponents' permanents the card is removal-with-replacement, not flicker. The FLICKER_TAIL guard fires on the literal `return it to the battlefield` substring without checking for the gating `If you controlled it` preamble.
  - **Suggested fix:** Narrow `FLICKER_TAIL` in `pipeline/rules/effect.exile_creature.ts:44` and `pipeline/rules/effect.exile_artifact.ts:29` to NOT suppress when preceded (within 60 chars) by `if you controlled (?:it|them|that <noun>)` — that preamble signals split-mode punisher, not flicker. Add Unyielding Gatekeeper regression to both rule test files.

---

## Urgent Necropsy  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {2}{B}{G}

**Oracle text:**

```
As an additional cost to cast this spell, collect evidence X, where X is the total mana value of the permanents this spell targets.
Destroy up to one target artifact, up to one target creature, up to one target enchantment, and up to one target planeswalker.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.collect_evidence`, `effect.destroy_artifact`, `effect.destroy_creature`, `effect.exile_from_graveyard`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.destroy_enchantment` and `effect.destroy_planeswalker`
  - **What's wrong:** Vindicate-style multi-target "destroy up to one target X, up to one target Y, up to one target Z, and up to one target W" exceeds the `{0,6}` filler-word quantifier in `PATTERN_OWN` (`pipeline/rules/effect.destroy_enchantment.ts:14`, `pipeline/rules/effect.destroy_planeswalker.ts:13`). Words between leading `target` and `enchantments?` are `artifact, up to one target creature, up to one target` = 11 word-tokens; rule allows max 6. Artifact and creature appear earlier in the chain (within the 6-word window) so they fire; enchantment and planeswalker fall outside.
  - **Evidence vs reality:** Normalized text contains the exact substrings `target enchantment` and `target planeswalker`. The rule could match each independently if it didn't anchor every match through the lead `destroy` verb.
  - **Suggested fix:** Two options:
    1. Bump `{0,6}` to `{0,14}` in PATTERN_OWN for `destroy_enchantment` and `destroy_planeswalker` (covers Vindicate-style chains; risk: over-match on long flavor sentences — survey corpus first).
    2. Better: add a secondary PATTERN_CHAINED matching `\btarget\s+(?:[\w\-]+\s+){0,3}?enchantments?\b` scoped to be within a `\bdestroy\b ... [.\n]` clause boundary. Same for planeswalker.
  - Add Urgent Necropsy regression to both rule test files. Audit other destroy_<type> rules (artifact/land/permanent) for the same {0,6} limit.

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

## Vein Ripper  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Creature — Vampire Assassin
**Mana cost:** {3}{B}{B}{B}

**Oracle text:**

```
Flying
Ward—Sacrifice a creature.
Whenever a creature dies, target opponent loses 2 life and you gain 2 life.
```

**Current tags:** `effect.has_flying`, `effect.has_ward`, `effect.life_changed`, `effect.sacrifice_creature`, `trigger.creature_dies`

### Issues

- **false-positive**: `effect.sacrifice_creature`
  - **What's wrong:** Only sacrifice phrasing on the card is `Ward—Sacrifice a creature`. Ward cost is paid by the OPPONENT targeting this card, not by the controller — Vein Ripper does not itself cause its controller to sacrifice. Pairing with aristocrats `effect.sacrifice_creature` payoffs is therefore misleading (deckbuilder filter "cards that sac your creatures" would surface this card incorrectly).
  - **Evidence vs reality:** Evidence `sacrifice a creature` is part of a Ward action-cost suffix. The skill's "Typed-sacrifice leakage onto edicts and observer triggers" pattern names this exact failure mode for typed-sac rules; generic `sacrifice_creature` has the same blind spot for Ward—Sacrifice frames.
  - **Suggested fix:** Exclude Ward cost suffix in `effect.sacrifice_creature` (and the typed siblings — `sacrifice_artifact`, `sacrifice_enchantment` etc.) — negative lookbehind for `\bward\s*[—\-]\s*$` before the sacrifice clause, OR scope by sentence boundary and skip sentences starting with `ward[—\-]`. Add Vein Ripper regression as negative.

---

## Vengeful Tracker  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Creature — Human Detective
**Mana cost:** {1}{R}

**Oracle text:**

```
Whenever an opponent sacrifices an artifact, this creature deals 2 damage to them.
```

**Current tags:** `effect.deals_damage`

### Issues

- **missing**: `trigger.artifact_leaves_battlefield`
  - **What's wrong:** Rule's `PATTERN_TEXT` (`pipeline/rules/trigger.artifact_leaves_battlefield.ts:28`) anchors on `leaves the battlefield` / `is put into a graveyard from the battlefield` verbs. It does NOT match the alternative active-voice "Whenever {player} sacrifices a/an artifact" frame, even though sacrifice semantically causes LtB.
  - **Evidence vs reality:** Card text `Whenever an opponent sacrifices an artifact` — no LTB verb. The aristocrats-counterpart rule `trigger.permanent_sacrificed` deliberately only matches "YOU sacrifice", leaving the punisher / anti-sacrifice axis ("opponent sacrifices") uncovered.
  - **Suggested fix:** Broaden `trigger.artifact_leaves_battlefield` PATTERN_TEXT to also match `\bwhen(?:ever)? (?:a|an|each|any|target) (?:opponent|player|each player) sacrifices? (?:a |an |another )?(?:artifact|clue|treasure|food|equipment|vehicle)\b`. Apply the same broadening to the other typed `*_leaves_battlefield` rules. Add Vengeful Tracker regression. Note: graph edges then form between Vengeful Tracker and `effect.sacrifice_artifact` cards via the existing pairsWith.

---

## Voja, Jaws of the Conclave  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Wolf
**Mana cost:** {2}{R}{G}{W}

**Oracle text:**

```
Vigilance, trample, ward {3}
Whenever Voja attacks, put X +1/+1 counters on each creature you control, where X is the number of Elves you control. Draw a card for each Wolf you control.
```

**Current tags:** `condition.cares_tribe.elf`, `effect.counter_modified`, `effect.draws_or_discards`, `effect.has_trample`, `effect.has_vigilance`, `effect.has_ward`, `effect.plus_one_counter`, `trigger.attack_or_block`

### Issues

- **missing**: `condition.cares_tribe.wolf` (same coverage gap as Tolsimir, Midnight's Light)
  - **What's wrong:** "Draw a card for each Wolf you control" is a Wolf-tribal payoff; no `wolf` entry in `pipeline/themes.ts THEME_TRIBES`.
  - **Evidence vs reality:** Voja IS a Wolf and scales card draw on Wolves you control. Cannot be found via Wolf-tribal payoff filter.
  - **Suggested fix:** Add `wolf` to `THEME_TRIBES` (same fix as Tolsimir entry). Voja + Tolsimir + Voja Fenstalker token producers establish the family.

---

## Worldsoul's Rage  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {X}{R}{G}

**Oracle text:**

```
Worldsoul's Rage deals X damage to any target. Put up to X land cards from your hand and/or graveyard onto the battlefield tapped.
```

**Current tags:** `condition.has_x_in_cost`, `effect.cast_noncreature_spell`, `effect.deals_damage`, `effect.is_instant_or_sorcery`, `effect.reanimate`

### Issues

- **missing**: `effect.ramp_nonland`
  - **What's wrong:** Rule pattern 4 (`pipeline/rules/effect.ramp_nonland.ts:40`) `\bput (?:a |target )?lands? cards? from your hand onto the battlefield\b` requires `from your hand` immediately followed by `onto the battlefield`. Worldsoul's variant has `from your hand AND/OR graveyard` inserted between, breaking the match.
  - **Evidence vs reality:** Card puts up to X land cards directly into play from hand OR graveyard — quintessential ramp/finisher. A "ramp options" deckbuilder query would miss this Standard finisher.
  - **Suggested fix:** Broaden pattern 4 to admit the `from your hand (?:and/or graveyard|or graveyard)?` source variants. Specifically: `\bput (?:a |target |up to (?:one|two|three|four|five|x) )?lands? cards? from (?:your|a) (?:hand|graveyard)(?:\s+(?:and/or|or)\s+(?:hand|graveyard))? onto the battlefield\b`. Add Worldsoul's Rage and a hand-only Plant-Beans-style regression both.

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

- **missing**: `trigger.damage_dealt`
  - **What's wrong:** Rule pattern (`pipeline/rules/trigger.damage_dealt.ts:25`) requires the singular verb `deals`. Yarus's plural-subject trigger `one or more face-down creatures you control deal combat damage` uses the plural verb `deal` (no s), which the pattern misses.
  - **Evidence vs reality:** Substring `deal combat damage to a player` is a classic damage-dealt trigger. Plural subjects (`one or more creatures`, `creatures you control`) are common in token go-wide payoffs.
  - **Suggested fix:** Change `deals ` to `deal(?:s)? ` in the pattern. Add Yarus regression + a plural-subject "creatures you control deal combat damage" generic case.
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

## Arid Archway  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Land — Desert
**Mana cost:** (none)

**Oracle text:**

```
This land enters tapped.
When this land enters, return a land you control to its owner's hand. If another Desert was returned this way, surveil 1.
{T}: Add {C}{C}.
```

**Current tags:** `condition.cares_lands`, `effect.add_mana`, `effect.has_activated_ability`, `effect.has_mana_activated_ability`, `effect.surveil`, `trigger.self_etb`

### Issues

- **missing**: `effect.bounce_land`
  - **What's wrong:** `PATTERN_RETURN_OWN` (`pipeline/rules/effect.bounce_land.ts:14`) requires the determiner to be one of `another|target|each|all`. Arid Archway uses `return A land you control` — "a" determiner. Rule misses.
  - **Evidence vs reality:** Normalized substring is `return a land you control to its owner's hand` — quintessential self-bounce land. Lands cycle (OTJ "Archway" cycle, including Arid Archway) all use this template.
  - **Suggested fix:** Add `a|an` to the determiner alternation in PATTERN_RETURN_OWN (and PATTERN_BROAD): `(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+)`. Verify the `(?!\s+card)` guard still excludes the graveyard-recursion form. Add Arid Archway + cycle partners regression to `effect.bounce_land.test.ts`.
- (Same `has_mana_activated_ability` tap-only FP as Tunnel Tipster — already logged.)

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

## Aven Interrupter  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Creature — Bird Rogue
**Mana cost:** {1}{W}{W}

**Oracle text:**

```
Flash
Flying
When this creature enters, exile target spell. It becomes plotted.
Spells your opponents cast from graveyards or from exile cost {2} more to cast.
```

**Current tags:** `effect.exile_from_graveyard`, `effect.has_flash`, `effect.has_flying`, `effect.has_plot`, `trigger.self_etb`

### Issues

- **false-positive**: `effect.exile_from_graveyard`
  - **What's wrong:** Rule's FOREIGN_OR_GENERIC pattern (`pipeline/rules/effect.exile_from_graveyard.ts:26`) uses `.+?` filler that spans sentence boundaries. Normalized text reads `exile target spell. it becomes plotted. spells your opponents cast from graveyards ...`. The lazy `.+?` greedily walks past two sentence terminators to reach `from graveyards` in an unrelated cost-tax clause.
  - **Evidence vs reality:** Evidence string `exile target spell. it becomes plotted. spells your opponents cast from graveyard` clearly crosses two `.` terminators. Card actually exiles a SPELL (stack) and PLOTS it — nothing leaves a graveyard.
  - **Suggested fix:** Replace `.+?` with `[^.]+?` (or `[^.\n]+?`) in FOREIGN_OR_GENERIC, OWN_TARGETED, OWN_QUANTIFIED, IN_GRAVEYARD. Add Aven Interrupter regression as negative.
- **false-positive**: `effect.has_plot`
  - **What's wrong:** Rule (`pipeline/rules/effect.has_plot.ts:22`) trusts `card.keywords.includes('Plot')`. Scryfall's `keywords` array includes "Plot" for ANY card that mentions the plot mechanic in oracle text — including Aven Interrupter, which only causes an OPPONENT'S spell to become plotted. Aven Interrupter cannot itself be plotted (no `Plot {cost}` line on the card).
  - **Evidence vs reality:** Card has no `Plot {N}` cost in its oracle, yet still gets `effect.has_plot`. Conflates "uses the plot keyword as an effect" with "is itself plottable" — Aven is a Plot enabler / payoff, not a Plot card.
  - **Suggested fix:** Strengthen the rule: still require `card.keywords.includes('Plot')` BUT also verify the oracle text contains a literal `\bplot\s*\{` (the cost notation) — that's the unambiguous "Plot {cost}" intrinsic line. Add Aven Interrupter regression as negative + Aloe Alchemist as positive.



---

## Binding Negotiation  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {1}{B}

**Oracle text:**

```
Target opponent reveals their hand. You may choose a nonland card from it. If you do, they discard it. Otherwise, you may put a face-up exiled card they own into their graveyard.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.is_instant_or_sorcery`

### Issues

- **missing**: `effect.targeted_discard`
  - **What's wrong:** Patterns in `pipeline/rules/effect.targeted_discard.ts:27` cover `target opponent discards`, `each opponent discards`, `that player discards that card`, etc. — none match the modern "they discard it" pronoun form where the discarder is bound to an earlier `target opponent` clause.
  - **Evidence vs reality:** Card says `Target opponent reveals their hand. You may choose a nonland card from it. If you do, they discard it.` This is Coercion/Thoughtseize-family hand attack. Modern oracle templating uses `they` as the bound pronoun.
  - **Suggested fix:** Add a new pattern `\btarget opponent reveals their hand[^.]+?[\s\S]{0,200}?\bthey discards?\s+(?:it|that card|those cards|the chosen card)\b` (span-aware Thoughtseize variant anchored on reveal-then-they-discard chain). Add Binding Negotiation regression as positive.


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
- **missing**: `effect.impulse_draw`
  - **What's wrong:** Rule pattern (`pipeline/rules/effect.impulse_draw.ts:27`) requires the verb `play (?:it|that card|those cards|them)`. Bruse Tarl uses `you may cast it until the end of your next turn` — modern templating that uses `cast` instead of `play` for non-land impulse-draw.
  - **Evidence vs reality:** Substring `exile the top card of your library. ... you may cast it until the end of your next turn` is impulse-draw textbook. Rule misses the `cast` verb variant.
  - **Suggested fix:** Change `play` to `(?:play|cast)` in the rule's PATTERN. Add Bruse Tarl + a `cast it this turn` variant as regressions. Likely 5+ Standard cards affected (many recent impulse-draw effects use `cast`).


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

- **missing**: `condition.cares_lands` (Desert subtype branch — word-order miss)
  - **What's wrong:** `SUBTYPE_PATTERN` (`pipeline/rules/condition.cares_lands.ts`) anchors on `<subtype> you control` and `a <subtype> you control`, but Cactarantula uses the reversed-order phrasing `if you control a Desert`. The "you control X" frame is not in the alternation.
  - **Evidence vs reality:** Cards with Desert-Affinity cost reduction (`costs {N} less to cast if you control a Desert`) is a recurring OTJ shape; multiple cards likely affected. `you control a <subtype>` is a common conditional preamble.
  - **Suggested fix:** Add `you control (?:a|an|the|two or more) ${LAND_SUBTYPE}` as an additional alternation in `SUBTYPE_PATTERN`. Same broadening applies to the literal-"land" PATTERN: `you control (?:a|an|the|two or more) lands?`. Add Cactarantula regression as positive.
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

- **missing**: `condition.cares_lands` ("untapped lands" modifier breaks count pattern)
  - **What's wrong:** Rule pattern (`pipeline/rules/condition.cares_lands.ts`) matches `(?:two|three|four|five|...) or more lands` strictly. Dust Animus reads `five or more UNTAPPED lands` — the `untapped` modifier between `more` and `lands` defeats the pattern.
  - **Evidence vs reality:** "Five or more untapped lands" is a deck-state gate identical in intent to "five or more lands" — just narrower. The rule should fire.
  - **Suggested fix:** Broaden to `(?:two|three|...) or more (?:untapped |tapped |basic |snow )?lands`. Add Dust Animus regression.
- **missing**: `effect.grants_lifelink` (keyword-counter via "enters with" frame)
  - **What's wrong:** `effect.grants_keyword.ts` Frame (i) matches `\bput a ${kw} counter\b`. Dust Animus uses `enters with two +1/+1 counters and a lifelink counter on it` — the keyword-counter is granted via ETB-with replacement, not via active "put a ... counter" verb.
  - **Evidence vs reality:** Lifelink counter on the creature still grants lifelink — same semantic outcome as "put a lifelink counter on it". Rule frame just doesn't cover ETB-with.
  - **Suggested fix:** Add a parallel frame `\b(?:enters with|with) (?:[\w/+]+ )?(?:and )?a ${kw} counter\b` to the GRANTABLE_KEYWORDS pattern builder. Mirror across all 11 grantable keywords. Add Dust Animus regression to `effect.grants_lifelink.test.ts` (or `grants_keyword.test.ts`).


---

## Fleeting Reflection  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {1}{U}

**Oracle text:**

```
Target creature you control gains hexproof until end of turn. Untap that creature. Until end of turn, it becomes a copy of up to one other target creature.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.grants_hexproof`, `effect.is_instant_or_sorcery`, `effect.untap`

### Issues

- **missing**: `effect.clone_in_place`
  - **What's wrong:** `BECOMES_COPY` pattern (`pipeline/rules/effect.clone_in_place.ts:36`) allows at most 3 filler words between `becomes a copy of` and the type noun (`creature|permanent|...`). Fleeting Reflection has `becomes a copy of up to one other target creature` — that's 4-5 filler words (`up to one other target`), exceeding the `{0,3}` quantifier.
  - **Evidence vs reality:** "up to one [other] target creature" is a modern targeting templating (Magnetic Whirlpool, Memory Plunder, Fleeting Reflection). Quintessential clone effect.
  - **Suggested fix:** Either bump the filler quantifier to `{0,5}` (low FP risk — `becomes a copy of` is already a strong anchor) OR add explicit `(?:up to (?:one|two|three) )?` qualifier to the determiner alternation. Add Fleeting Reflection regression.


---

## Hollow Marauder  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Creature — Specter Rogue
**Mana cost:** {6}{B}

**Oracle text:**

```
This spell costs {1} less to cast for each creature card in your graveyard.
Flying
When this creature enters, any number of target opponents each discard a card. For each of those opponents who didn't discard a card with mana value 4 or greater, draw a card.
```

**Current tags:** `condition.cares_graveyard`, `condition.cares_high_mana_value`, `effect.cost_reduction`, `effect.draws_or_discards`, `effect.has_flying`, `trigger.self_etb`

### Issues

- **missing**: `effect.targeted_discard`
  - **What's wrong:** `pipeline/rules/effect.targeted_discard.ts:27` patterns require `target (?:player|opponent) discards` (singular) or `each opponent discards`. Hollow Marauder uses `any number of target opponents each discard a card` — plural subject "target opponents", verb agreement drops the `s`, "each" appears as a distributive between subject and verb. Pattern misses.
  - **Evidence vs reality:** Substring `target opponents each discard a card` is hand-attack disruption. Modern multi-opponent templates increasingly use this form.
  - **Suggested fix:** Add pattern `\b(?:any number of )?target opponents each discards?\b` and `\beach (?:of )?(?:those |target )?opponents? (?:may )?discards?\b`. Add Hollow Marauder regression.

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

## Kellan Joins Up  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Enchantment
**Mana cost:** {G}{W}{U}

**Oracle text:**

```
When Kellan Joins Up enters, you may exile a nonland card with mana value 3 or less from your hand. If you do, it becomes plotted.
Whenever a legendary creature you control enters, put a +1/+1 counter on each creature you control.
```

**Current tags:** `condition.cares_low_mana_value`, `effect.counter_modified`, `effect.has_plot`, `effect.plus_one_counter`, `trigger.another_creature_etb`, `trigger.self_etb`

### Issues

- **false-positive**: `effect.has_plot`
  - **What's wrong:** Card does NOT have the Plot keyword as a printed alternate cast cost. It is an enchantment whose ETB ability *plots another card* ("it becomes plotted"). Scryfall populates the `keywords` array with "Plot" because the card uses the plot action, and the rule almost certainly trusts the keywords array.
  - **Evidence vs reality:** evidence was `"Plot"` (matching keywords array, not oracle text). The tagDef description "may be exiled from hand for an alternate cost and cast as a sorcery on a later turn" describes a printed Plot {cost} line, which Kellan does not have.
  - **Suggested fix:** Narrow `effect.has_plot` rule to require a literal `^plot\b\s*\{` (Plot followed by a mana-cost brace) in the normalized oracle text, instead of (or in addition to) trusting the Scryfall keywords array. The same Scryfall-keywords trap likely affects other plotter cards (search artifact for `becomes plotted` to find peers).

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

- **missing**: `effect.cast_from_exile`
  - **What's wrong:** Rule should fire on "Until end of turn, you may cast spells from among those cards" — canonical opponent-library theft pattern (Dack Fayden / Knowledge Pool / Etali). Currently not firing.
  - **Evidence vs reality:** Substring `you may cast spells from among those cards` is exactly the anaphoric "cast a spell this way" form the tagDef describes ("from-among-exiled-cards").
  - **Suggested fix:** Audit `pipeline/rules/effect.cast_from_exile.ts` patterns. Likely missing `\byou may cast (?:[^.]*?)from among those cards\b` or the `among those cards` variant where "those" refers to a prior `exile the top X cards of …` clause. Add Jasper Flint regression.

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

## Lazav, Familiar Stranger  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Shapeshifter
**Mana cost:** {1}{U}{B}

**Oracle text:**

```
Whenever you commit a crime, put a +1/+1 counter on Lazav. Then you may exile a card from a graveyard. If a creature card was exiled this way, you may have Lazav become a copy of that card until end of turn. This ability triggers only once each turn.
```

**Current tags:** `effect.counter_modified`, `effect.exile_from_graveyard`, `effect.plus_one_counter`

### Issues

- **missing**: `effect.clone_in_place`
  - **What's wrong:** Rule should fire on "you may have Lazav become a copy of that card until end of turn" — temporary self-clone, classic Lazav-template. The tagDef explicitly says "Includes 'becomes a copy of'". Currently not firing.
  - **Evidence vs reality:** Substring `__SELF__ become a copy of that card` (post-normalization) is exactly the becomes-a-copy form. Rule probably anchors on `target permanent becomes a copy` and misses `__SELF__ becomes/become a copy of <referent>`.
  - **Suggested fix:** Audit `pipeline/rules/effect.clone_in_place.ts` patterns. Add `\b__SELF__ becomes? a copy of\b` and `\bhave __SELF__ becomes? a copy of\b`. Add Lazav regression.

- **missing**: `trigger.commit_a_crime` — second instance of the MKM Crime mechanic coverage gap. See Kaervek, the Punisher entry above for the rule-authoring proposal.

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

- **false-positive**: `effect.has_plot` — same Scryfall-keywords-array trap as Kellan Joins Up. The card *plots other spells* via a triggered exile-replacement; it does not have a printed Plot {cost} cast cost. See Kellan Joins Up entry above for the proposed regex narrowing.

- **missing**: `trigger.spell_cast`
  - **What's wrong:** Rule fails to fire on "Whenever you cast a multicolored instant or sorcery spell from your hand". The rule fires on simpler "whenever you cast … spell" forms (Kraum matches "second spell"); this card's combination of pre-noun modifier "multicolored instant or sorcery" + post-noun qualifier "from your hand" defeats the anchor.
  - **Evidence vs reality:** Substring `whenever you cast a multicolored instant or sorcery spell from your hand` is unambiguously a spell-cast trigger.
  - **Suggested fix:** Loosen `pipeline/rules/trigger.spell_cast.ts` post-modifier handling. Allow `[^.]*\bspell(?:\s+from your hand)?\b` after the determiner. Add Lilah regression.

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

## Magda, the Hoardmaster  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Dwarf Berserker
**Mana cost:** {1}{R}

**Oracle text:**

```
Whenever you commit a crime, create a tapped Treasure token. This ability triggers only once each turn.
Sacrifice three Treasures: Create a 4/4 red Scorpion Dragon creature token with flying and haste. Activate only as a sorcery.
```

**Current tags (relevant subset):** `effect.has_mana_activated_ability`, `effect.sacrifice_artifact`, plus 7 others

### Issues

- **false-positive**: `effect.has_mana_activated_ability`
  - **What's wrong:** Magda's only activated ability has cost `Sacrifice three Treasures:` — pure sacrifice cost, no mana symbol. The tagDef explicitly scopes to "cost includes mana (… reducible by Training-Grounds-style cost reducers)" and excludes Crew. Sacrifice-as-cost should be excluded for the same reason — Training Grounds does not reduce sacrifice costs.
  - **Evidence vs reality:** evidence was `". sacrifice three treasures:"`. The rule appears to anchor on the colon and a preceding cost segment without verifying the segment actually contains a mana symbol (`\{[WUBRGCXSEP0-9]+\}`).
  - **Suggested fix:** Tighten `pipeline/rules/effect.has_mana_activated_ability.ts` to require a mana-symbol-bearing token in the cost segment. Add Magda regression (`Sacrifice three Treasures: …` as a negative). Likely affects many sacrifice-cost activated abilities — grep cost lines starting with `^sacrifice`, `^discard`, `^pay` in the artifact to estimate scope.

- **missing**: `trigger.commit_a_crime` — third instance of the MKM Crime mechanic coverage gap (see Kaervek entry above for the proposed rule).

---

## Make Your Own Luck  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Sorcery
**Mana cost:** {3}{G}{U}

**Oracle text:**

```
Look at the top three cards of your library. You may exile a nonland card from among them. If you do, it becomes plotted. Put the rest into your hand.
```

**Current tags:** `effect.cast_noncreature_spell`, `effect.has_plot`, `effect.is_instant_or_sorcery`, `effect.look_at_top_n`

### Issues

- **false-positive**: `effect.has_plot` — third Scryfall-keywords-array trap (see Kellan Joins Up entry above). Card plots a card from top of library; does not have a printed Plot {cost}.

- **missing**: `effect.exile_from_library`
  - **What's wrong:** Rule should fire on "You may exile a nonland card from among them" (where "them" = the top three cards of your library). Library → exile movement. Currently not firing.
  - **Evidence vs reality:** "exile a nonland card from among them" with prior anchor "look at the top three cards of your library" is exactly library-to-exile. Rule likely only handles direct frames ("exile the top N cards of your library") and misses the look-then-pick variant.
  - **Suggested fix:** Loosen `pipeline/rules/effect.exile_from_library.ts` to handle the "look ... exile ... from among them" pattern. Add `\bexile (?:a |an |any |up to \w+ )?card[s]? from among them\b` after a `look at the top` anchor. Add Make Your Own Luck regression.

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

## Oko, the Ringleader  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Planeswalker — Oko
**Mana cost:** {2}{G}{U}

**Oracle text:**

```
At the beginning of combat on your turn, Oko becomes a copy of up to one target creature you control until end of turn, except he has hexproof.
+1: Draw two cards. If you've committed a crime this turn, discard a card. Otherwise, discard two cards.
−1: Create a 3/3 green Elk creature token.
−5: For each other nonland permanent you control, create a token that's a copy of that permanent.
```

**Current tags:** `effect.copy_permanent_token`, `effect.create_creature_token`, `effect.create_token`, `effect.draws_or_discards`, `effect.grants_hexproof`, `trigger.beginning_of_combat`

### Issues

- **missing**: `effect.clone_in_place`
  - **What's wrong:** Rule should fire on "Oko becomes a copy of up to one target creature you control" — self-clone trigger. Same shape as Lazav, Familiar Stranger (also logged above). Currently not firing.
  - **Evidence vs reality:** Substring `__SELF__ becomes a copy of up to one target creature you control` is the becomes-a-copy form the tagDef explicitly covers.
  - **Suggested fix:** Same as the Lazav entry — add `\b__SELF__ becomes? a copy of\b` to `pipeline/rules/effect.clone_in_place.ts`. Single rule fix covers both.

- **false-positive (debatable)**: `effect.grants_hexproof`
  - **What's wrong:** The "except he has hexproof" clause grants hexproof to Oko (in his copied form), not to the targeted creature. The rule appears to anchor loosely on "target creature you control" + "has hexproof" without verifying the subject of "has hexproof" is the targeted creature rather than Oko himself.
  - **Evidence vs reality:** evidence was `"target creature you control until end of turn, except he has hexproof"`. Subject of "has hexproof" is pronoun "he" referring to Oko (the becomes-a-copy subject), not the target.
  - **Suggested fix:** This is a narrow becomes-a-copy edge case; one card hit in Standard. Skip unless `pipeline/rules/effect.grants_hexproof.ts` gains a broader audit. Note: in Oko's case the hexproof IS granted (to himself), so the tag has accidental semantic correctness for downstream "find cards that grant hexproof" filters.

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

## Shepherd of the Clouds  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Creature — Pegasus
**Mana cost:** {4}{W}

**Oracle text:**

```
Flying, vigilance
When this creature enters, return target permanent card with mana value 3 or less from your graveyard to your hand. Return that card to the battlefield instead if you control a Mount.
```

**Current tags:** `condition.cares_low_mana_value`, `effect.has_flying`, `effect.has_vigilance`, `effect.return_from_graveyard_to_hand`, `trigger.self_etb`

### Issues

- **missing**: `effect.reanimate`
  - **What's wrong:** Rule should fire on "Return that card to the battlefield instead if you control a Mount" — conditional reanimation upgrade. The previous sentence sets up the "that card" referent as a graveyard card; the second sentence is a graveyard-to-battlefield return. Currently not firing.
  - **Evidence vs reality:** Substring `return that card to the battlefield instead` is a graveyard-to-battlefield return (the antecedent of "that card" is the graveyard card from the prior sentence). Rule probably requires a literal `from your graveyard` adjacent to the `to the battlefield` clause and misses the cross-sentence anaphoric reference.
  - **Suggested fix:** Loosen `pipeline/rules/effect.reanimate.ts` to recognize an anaphoric `return that card to the battlefield` when a preceding clause sets up a `from your graveyard` referent. Or accept the gap — this is a rare modal-graveyard-upgrade pattern (mainly OTJ Mount cards). Add Shepherd regression.

- **missing**: `condition.cares_subtype.mount` — third instance of the Mount coverage gap (see Miriam entry above).

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
