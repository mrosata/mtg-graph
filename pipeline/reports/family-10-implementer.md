# Family 10 — Set mechanics: Implementer Report

## Rules implemented (2)
- condition.bargain: 20
- condition.adventure_matters: 8

Total: 28 card-tag instances across the two rules.

## Pairings verified
- `condition.bargain` pairs with `effect.create_token`, `effect.create_treasure`, `effect.create_food`, `effect.create_clue` — all four exist in the catalog.
- `condition.adventure_matters` pairs with `trigger.spell_cast`.

`npm run rule:coverage -- --pairings` reports "All pairings resolve."

## Per-rule notes

### condition.bargain
Pattern: `\bbargain` — bare word-boundary keyword match.

20 matches. The regex matches both:
- The keyword line ("bargain" on cards like Stonesplitter Bolt, Torch the Tower, etc.).
- In-text cross-references ("if this spell was bargained, …").

The word "bargain" does not appear in unrelated Magic vocabulary, so a bare boundary match is sufficient. No `nearMiss` (degenerate for keyword rules).

`pairsWith` connects bargain enablers to the four token-token-makers per the brief. Bargain cards typically pay off when you have a token to sacrifice as the alternative cost; the pairing routes those edges.

### condition.adventure_matters
Four regex patterns:
- `whenever <subject> cast(s|ed) (an?|one|another) adventure` — explicit triggers.
- `adventure spell(s)` — category references ("Adventure spells you cast cost {1} less").
- `adventure card(s)` — category references ("return target Adventure card").
- `(has|have) an adventure` — the WOE-block category condition ("card that has an Adventure", "permanent spells you cast that have an Adventure").

8 matches. Brief originally projected even fewer (~2) because the WOE adventure block uses the "has an Adventure" phrasing rather than "Adventure spell" — without the fourth pattern we'd miss Edgewall Inn, Frantic Firebolt, Hearth Elemental // Stoke Genius, Beluna Grandsquall // Seek Thrills, and Sentinel of Lost Lore.

`nearMiss` from the brief verbatim (anchors: adventure, proximity: cast/spell/card, window: 6). After the fourth-pattern extension, the near-miss list is empty — the regex now captures every "Adventure"-mentioning card that is a category payoff.

Per the brief: skips the structural typeline check. The brief documented the accepted false-positive risk that an Adventure-having card with its own Adventure side might mention "Adventure" in its own text. In practice: matched WOE cards include adventure-flavored creatures (Storyteller Pixie, Chancellor of Tales) which both reference Adventures as a category in their triggered abilities — there are no observed false positives.

## Intentional near-miss exclusions
- "When this creature dies, you may cast it from your graveyard **as an Adventure**" (recursion modifier) — a card lets you cast itself as an Adventure. Not a payoff for adventure-spell-cast triggers (it casts a non-Adventure creature as an Adventure mode, the reverse direction).
- Adventure-side text on adventure-having creature cards (e.g., the "Stoke Genius" side of Hearth Elemental). After the normalize step concatenates faces, these cards may match if the OTHER face references Adventures as a category. This is acceptable per the brief; happens here on Beluna Grandsquall // Seek Thrills (which legitimately is an Adventure-matters card on the front face). No observed bad matches.

## Judgment calls
- **`condition.bargain` keyword match**: kept the bare `\bbargain` form (no requirement for `s?` morphology). Word boundary handles "bargain", "bargained", "bargains" all with one pattern. Cheap and correct.
- **`condition.bargain` omits `nearMiss`**: degenerate for keyword rules (anchor IS the matched word).
- **`condition.adventure_matters` extended beyond brief**: the brief listed three patterns; I added a fourth (`has/have an adventure`) after `npm run rule:coverage` surfaced 5+ WOE-block payoff cards in the near-miss list. The brief flagged Adventure as a structurally-tricky case and explicitly allowed regex-level fixes; this is one such fix. Total: 2 matches → 8 matches.
- **Did NOT add `cast it as an Adventure` to the patterns**: that phrasing appears on adventure-having creatures' own dies-trigger ("when this creature dies, you may cast it from your graveyard as an Adventure"). It's a self-recursion modifier, not a payoff for casting Adventures as a category. Including it would generate false-positive edges to `trigger.spell_cast`.
- **Bargain pairing breadth**: paired with all four token-maker effects per the brief. Bargain decks lean on Treasure / Food / Clue / generic tokens as the sacrificial fodder — restricting to a single token type would understate the connectivity.

## Open issues
None. Both rules pass tests; full pipeline suite green at 650 tests across 74 files. Pairings resolve. Coverage looks healthy given the small Standard footprint of these mechanics (bargain = WOE-block, Adventure = WOE-block).
