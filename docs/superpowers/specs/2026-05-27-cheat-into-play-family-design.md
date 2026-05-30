# Cheat-into-play family — tag-catalog design

Date: 2026-05-27. Catalog target: RULE_VERSION `v0.14.5`.

## Motivation

The "cheat into play" archetype puts a card directly onto the battlefield from a non-graveyard zone — skipping the casting process. This is a persistent gap in the mtg-graph rule catalog that has been deferred 3+ times across prior audit rounds (Tarrian's Journal note, Throne of the Grim Captain note, Break Out audit, Case of the Uneaten Feast Round 4 note). It's adjacent to but distinct from `effect.reanimate` (which is strictly graveyard → battlefield).

The Round 4 audit also surfaced a related-but-distinct gap: `effect.cast_from_library_top` (Future Sight / Vivien Champion family) — granting permission to cast or play cards from the top of library. Originally logged separately on Assemble the Players, the two gaps pair naturally (both axes operate on the library/top-of-library, both share `effect.look_at_top_n` as an upstream effect).

This spec ships both as a single coherent design.

## Scryfall corpus counts

Quick analysis of the Standard artifact (`app/public/data/cards-standard.json`, post-v0.14.4 rebuild):

| Sub-pattern | Count |
|---|---:|
| A. Search library → battlefield (non-land) | 6 |
| B. Look-at-top → battlefield | 3 |
| C. From exile → battlefield | 5 |
| **`effect.cheat_into_play` total** | **14** |
| **`effect.cast_from_library_top` total** | **11** |

## Tags

Two new files, auto-discovered by `pipeline/rules/aggregator.ts`.

### `effect.cheat_into_play` (axis: effect)

Puts a card from a zone OTHER than the graveyard directly onto the battlefield — skipping the casting process.

**Description (tagDef):** "Puts a card from a zone OTHER than the graveyard directly onto the battlefield — skipping the casting process. Covers three sub-patterns: (1) search library + put onto battlefield (Nature's Rhythm, Guardian Sunmare, Transmutation Font), (2) look at top N + put onto battlefield (Break Out, Loot, Whiskervale Forerunner), (3) exiled card → battlefield (Throne of the Grim Captain, Ghost Vacuum, Anzrag's Rampage). Distinct from `effect.reanimate` which is strictly graveyard → battlefield. Excludes land tutors (covered by `effect.tutors_basic_land`) and face-down creation (covered by `effect.cloak`)."

**Pairings:** `['condition.cares_exile_pile']`. The exile-pile carer specifically benefits from sub-pattern C producers like Throne of the Grim Captain.

**Regex (three alternations):**

```
/\bsearch your library for (?!a basic|a (?:plains|island|swamp|mountain|forest|cave|desert|gate|town|sphere)\s)[^.]{0,150}\bput (?:it|them|that card|those cards) onto the battlefield\b/
```
Sub-pattern A. Negative lookahead excludes basic-land + named-land-type searches (those are handled by `effect.tutors_basic_land` and `effect.ramp_nonland`). The `[^.]{0,150}` filler keeps the search-and-put adjacent within a sentence.

```
/\blook at the top \w+ cards? of your library\b[\s\S]{0,300}\bput (?:it|them|that card|those cards) onto the battlefield\b/
```
Sub-pattern B. `[\s\S]{0,300}` allows up to 300 chars (including sentence boundaries) between the look and the put — Break Out spans 3 sentences. Pre-match negative carve-out at the rule level: the span must NOT contain `face down`, `face-down`, or `manifest dread` (those are `effect.cloak`).

```
/\b(?:exiled cards?|cards? exiled (?:this way|with [\w\s'—]+)|exiled creature cards?)[^.]{0,80}\bonto the battlefield\b/
```
Sub-pattern C. Anchors on `exiled cards` / `cards exiled this way` / `exiled creature cards` — these are post-exile retrieval frames, distinct from reanimate.

**Expected match count:** 14.

### `effect.cast_from_library_top` (axis: effect)

Grants permission to cast or play cards from the top of your library.

**Description (tagDef):** "Grants permission to cast or play cards from the top of your library (Future Sight / Vivien Champion / Garruk's Horde family). Covers cards with `cast/play <thing> from the top of your library` permission frames. Distinct from Cascade and Discover (which exile-then-cast as part of resolution, already covered by their own axes)."

**Pairings:** `[]`. The natural pair would be a `condition.cares_top_of_library` that doesn't exist yet (deferred — see Future work).

**Regex (two alternations):**

```
/\bmay (?:cast|play) (?:[\w\s,]+?) from the top of your library\b/
```
Canonical license frame: "you may cast spells from the top of your library", "you may play lands from the top of your library", "may cast a creature spell with power 2 or less from the top of your library".

```
/\b(?:you|its controller|that player) may (?:look at|play|cast)[\w\s,]+? top of (?:your|their) library\b/
```
More permissive opener for Future Sight–style "you may look at the top card of your library any time" combined with downstream cast/play permission (Case of the Locked Hothouse, Future Sight original).

**Expected match count:** 11.

## Per-card expected matches

Verified against actual normalized text:

| Card | cheat_into_play | cast_from_library_top |
|---|:-:|:-:|
| Nature's Rhythm | ✓ (A) | |
| Transmutation Font | ✓ (A) | |
| Guardian Sunmare | ✓ (A) | |
| Repurposing Bay | ✓ (A) | |
| Magitek Infantry | ✓ (A — recursion-tutor) | |
| Honored Knight-Captain | ✓ (A) | |
| Break Out | ✓ (B) | |
| Loot, Exuberant Explorer | ✓ (B) | |
| Whiskervale Forerunner | ✓ (B) | |
| Throne of the Grim Captain | ✓ (C) | |
| Anzrag's Rampage | ✓ (C) | |
| Ghost Vacuum | ✓ (C) | |
| The Darkness Crystal | ✓ (C) | |
| Sothera, the Supervoid | ✓ (C) | |
| Johann, Apprentice Sorcerer | | ✓ |
| The Belligerent | | ✓ |
| Assemble the Players | | ✓ |
| Case of the Locked Hothouse | | ✓ |
| Glarb, Calamity's Augur | | ✓ |
| Vizier of the Menagerie | | ✓ |
| Traveling Chocobo | | ✓ |
| Mm'menon, the Right Hand | | ✓ |
| Gwenom, Remorseless | | ✓ |
| Madame Web, Clairvoyant | | ✓ |
| Hakoda, Selfless Commander | | ✓ |

## Testing

Per `CLAUDE.md` TDD convention, each rule file has a colocated `.test.ts` with ≥3 positives + ≥3 negatives via `it.each([...])`.

### Positives (drawn from real normalized text)

**`effect.cheat_into_play`:**
- `"search your library for a creature card with mana value x or less, put it onto the battlefield"` (Nature's Rhythm — Pattern A)
- `"search your library for an artifact card, put it onto the battlefield"` (Transmutation Font — Pattern A)
- `"look at the top six cards of your library. you may reveal a creature card from among them. if that card has mana value 2 or less, you may put it onto the battlefield"` (Break Out — Pattern B)
- `"look at the top six cards of your library. you may reveal a creature card with mana value less than or equal to the number of lands you control from among them and put it onto the battlefield"` (Loot — Pattern B)
- `"put any number of exiled cards with that name onto the battlefield"` (Ghost Vacuum — Pattern C)
- `"you may put an exiled creature card used to craft __self__ onto the battlefield"` (Throne of the Grim Captain — Pattern C)

**`effect.cast_from_library_top`:**
- `"you may cast a creature spell with power 2 or less from the top of your library"` (Assemble the Players)
- `"you may play lands and cast creature and enchantment spells from the top of your library"` (Case of the Locked Hothouse)
- `"you may cast spells from the top of your library"` (generic Future Sight frame)

### Negatives

**`effect.cheat_into_play`:**
- `"search your library for a basic forest card, put that card onto the battlefield"` (land ramp — Glimpse the Core)
- `"search your library for a plains card and put it onto the battlefield tapped"` (Claim Jumper-style)
- `"search your library for a cave card, put it onto the battlefield tapped"` (Cosmium Confluence — named land-type)
- `"return target creature card from your graveyard to the battlefield"` (reanimate)
- `"manifest dread"` (cloak family, already shipped)
- `"look at the top three cards of your library. you may cloak that card"` (Hide in Plain Sight — face-down)

**`effect.cast_from_library_top`:**
- `"cast this card from your graveyard"` (different zone, different rule)
- `"reveal the top card of your library. add one mana of any of its colors"` (reveal + mana, not cast)
- `"exile the top three cards of your library. choose one of them. you may play that card this turn"` (impulse draw, not top-of-library license — already covered by `effect.impulse_draw`)

### `rule:coverage` near-miss declarations

Required for v0.7+ rules.

- `effect.cheat_into_play`: `{ anchors: ['onto the battlefield'], proximity: ['search your library', 'look at the top', 'exiled card', 'exiled creature'], window: 6 }`
- `effect.cast_from_library_top`: `{ anchors: ['from the top of your library'], proximity: ['may cast', 'may play'], window: 6 }`

### Catalog consistency test

`pipeline/catalog.test.ts > "tag catalog > effects only pair with triggers and vice versa"` validates the declared pairing satisfies the axis-cross constraint. `effect.cheat_into_play` ↔ `condition.cares_exile_pile` is effect ↔ condition — satisfies.

## tagFamilies.ts registration

Two entries under `themes` (siblings to `effect.reanimate`, which lives in themes as the "reanimator" archetype):

```typescript
'effect.cheat_into_play': 'themes',
'effect.cast_from_library_top': 'themes',
```

The themes family description (`Archetype payoffs: graveyard, artifacts, enchantments, lands, reanimator, ETB triggers`) already calls out reanimator and ETB triggers — both natural relatives of cheat-into-play.

The `pipeline/tagFamilies-consistency.test.ts` test enforces every catalog tag has a family entry.

## RULE_VERSION

Bump `shared/version.ts` `RULE_VERSION` from `v0.14.4` to `v0.14.5`. New tag definitions force IndexedDB cache invalidation on the client per existing convention.

## Known limitations

**"Cast from graveyard" license effects** are NOT covered by this spec. Cards like Tarrian's Journal ("you may cast a creature spell from your graveyard this turn") and Case of the Uneaten Feast ("Creature cards in your graveyard gain 'You may cast this card from your graveyard' until end of turn") are a distinct mechanic. They grant permission to cast (not put-onto-battlefield) from the graveyard (not library/exile). Deferred to a future `effect.cast_from_graveyard_license` tag — see Future work.

**Adventure-style cast-from-exile is also out of scope.** ~80 Adventure cards in Standard let the creature half be cast from exile after the adventure half resolves. That's the Adventure mechanic itself, not a generalized "cast from exile" permission. Already implicitly modeled via the Adventure framing.

**Recursion-tutor cards** (Magitek Infantry searches for "a card named ~") tag as cheat_into_play. The semantic is debatable — they ARE putting a creature onto the battlefield from library, but the use case is assembling card-name-matters synergies. Accepting this — narrow later if FP becomes a concern.

**Bring to Light / mode-bundled cheats.** Some multimodal spells include a "search and put onto battlefield" mode alongside other modes (Cosmium Confluence Cave-search mode, Anzrag's Rampage exile-to-battlefield mode). The rule fires when the cheat clause is present, even if it's just one of multiple modes. This is correct behavior — the tag means "has a cheat-into-play option", not "is always a cheat-into-play card".

## Future work (out of scope for this spec)

- **`effect.cast_from_graveyard_license`** — non-keyword grant of cast-from-graveyard permission. ~3-5 Standard cards (Tarrian's Journal, Case of the Uneaten Feast, Self-Reflection, potentially). Tracked separately when ready.
- **`condition.cares_top_of_library`** — payoffs that scale on top-of-library state (Sensei's Divining Top family — currently no Standard payoffs). Defer until a 3rd card surfaces.
- **`condition.cares_cheat_into_play`** — payoffs that care about cards entering via non-cast paths. Currently no Standard payoffs. Defer.
- **Carve-out for Magitek Infantry recursion-tutor pattern** — if FPs surface, narrow `effect.cheat_into_play` Pattern A to exclude self-name searches.
