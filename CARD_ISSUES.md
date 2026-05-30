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

## Lazav, Familiar Stranger  <!-- audited 2026-05-29, ruleVersion v0.8.0 -->

**Type:** Legendary Creature — Shapeshifter
**Mana cost:** {1}{U}{B}

**Oracle text:**

```
Whenever you commit a crime, put a +1/+1 counter on Lazav. Then you may exile a card from a graveyard. If a creature card was exiled this way, you may have Lazav become a copy of that card until end of turn. This ability triggers only once each turn.
```

**Current tags:** `effect.counter_modified`, `effect.exile_from_graveyard`, `effect.plus_one_counter`

### Issues

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

## Stingerback Terror  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Creature — Scorpion Dragon
**Mana cost:** {2}{R}{R}

**Oracle text:**

```
Flying, trample
This creature gets -1/-1 for each card in your hand.
Plot {2}{R} (You may pay {2}{R} and exile this card from your hand. Cast it as a sorcery on a later turn without paying its mana cost. Plot only as a sorcery.)
```

**Current tags:** `effect.debuff_minus_n`, `effect.has_flying`, `effect.has_plot`, `effect.has_trample`

### Issues

- **missing**: `condition.cares_hand_size` (no such tag exists — coverage gap)
  - **What's wrong:** No catalog tag for "for each card in your hand" scaling. This is a real family — empty-hand / full-hand payoffs (Stingerback Terror, Library of Alexandria-style, Madness-feeders, Reckless Wurm). Plot-cast version of this card is the payoff: empty-hand 4/4 flying trample for {2}{R}.
  - **Evidence vs reality:** oracle `"gets -1/-1 for each card in your hand"` is a hand-size scaling clause; no condition tag flags it.
  - **Suggested fix:** add `condition.cares_hand_size` rule — anchors `for each card in your hand`, `cards in your hand`, `your hand is empty`, `no cards in hand`, etc. Pair with `effect.draws_or_discards`, `effect.targeted_discard`. Coverage family also includes hellbent payoffs and Mind Carver-style hand-attack.

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

## Stubborn Burrowfiend  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Creature — Badger Beast Mount
**Mana cost:** {1}{G}

**Oracle text:**

```
Whenever this creature becomes saddled for the first time each turn, mill two cards, then this creature gets +X/+X until end of turn, where X is the number of creature cards in your graveyard.
Saddle 2 (Tap any number of other creatures you control with total power 2 or more: This Mount becomes saddled until end of turn. Saddle only as a sorcery.)
```

**Current tags:** `condition.cares_graveyard`, `effect.grants_stat_buff`, `effect.mill`

### Issues

- **missing**: `effect.has_saddle` (no such tag exists — coverage gap)
  - **What's wrong:** Saddle is an OTJ keyword (multi-card family — Stubborn Burrowfiend, Bovine Intervention, Slick Sequence's Mount partner, Aven Interrupter–partner Mounts, etc.). No tag flags the keyword or the saddle-payoff axis.
  - **Evidence vs reality:** oracle `"Saddle 2"` (keyword line) and `"becomes saddled for the first time each turn"` (saddle trigger) — both unflagged.
  - **Suggested fix:** add `effect.has_saddle` (mirrors `effect.has_crew`) and `trigger.becomes_saddled` (mirrors `trigger.becomes_crewed`-style triggers; verify whether the crew-equivalent trigger tag exists). Pair with the Mount-tribe coverage gap (already logged under Steer Clear).

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

## Three Steps Ahead  <!-- audited 2026-05-30, ruleVersion v0.8.0 -->

**Type:** Instant
**Mana cost:** {U}

**Oracle text:**

```
Spree (Choose one or more additional costs.)
+ {1}{U} — Counter target spell.
+ {3} — Create a token that's a copy of target artifact or creature you control.
+ {2} — Draw two cards, then discard a card.
```

**Current tags:** `condition.cares_artifacts`, `effect.cast_noncreature_spell`, `effect.copy_permanent_token`, `effect.counterspell`, `effect.create_token`, `effect.draws_or_discards`, `effect.is_instant_or_sorcery`

### Issues

- **false-positive**: `condition.cares_artifacts`
  - **What's wrong:** Evidence is `"artifact or creature you control"` — the disjunctive target restriction in a copy-effect ("copy target artifact OR creature you control"). The rule treats this as artifact-cares, but it's not a payoff for artifact-matters decks; the card targets EITHER. Recurring shape across copy spells (Sakashima's Will, Saheeli copy effects).
  - **Evidence vs reality:** "artifact or creature you control" in a target clause = disjunctive target restriction, not artifact-care. The semantic test: would an artifact-deck deckbuilder want this card *because* of the artifact mention? No — they'd want it because it's a copy spell.
  - **Suggested fix:** narrow `condition.cares_artifacts` to exclude `artifact or creature you control` (and `artifact or creature` generally) in target clauses — the disjunction signals "any one of these types", not artifact-specific care. Same shape applies to `condition.cares_enchantments` (cards mentioning "creature or enchantment").
- **missing**: `effect.has_spree` (no such tag exists — coverage gap)
  - **What's wrong:** Spree is an OTJ keyword. Multi-card family (Three Steps Ahead, Bovine Intervention, Skullcap Snail, Final Showdown). No tag flags either the keyword or the modal-additional-costs shape.
  - **Evidence vs reality:** oracle `"Spree (Choose one or more additional costs.)"` is the keyword line.
  - **Suggested fix:** add `effect.has_spree` (mirrors `effect.has_kicker`).

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
