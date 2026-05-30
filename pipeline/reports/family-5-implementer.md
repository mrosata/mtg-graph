# Family 5 — Card Selection: Implementer Report

## Rules implemented (4)
- effect.scry: 75
- effect.surveil: 128
- effect.look_at_top_n: 119
- effect.tutor_any: 17

Total: 339 card-tag instances across the four rules.

## Aggregate taggable coverage after Family 5
87.8%  (was 86.2% before; lift = +1.6 pp — middle of the expected +1–2pp band)

## Pairings
Only `effect.surveil` pairs (with `condition.cares_graveyard` from Family 9). All four rules' `pairsWith` arrays resolve via `npm run rule:coverage -- --pairings`.

## Edge count delta
372729 edges total (was 354818 after Family 3 per its report; +17911 from Family 5 alone via the surveil ↔ cares_graveyard pairing). All Family-5 edges are surveil-driven; scry/look_at_top_n/tutor_any have empty `pairsWith` and contribute zero edges.

## Per-rule notes

### effect.scry
Single-keyword regex `\bscry \d+\b`. 75 matches in Standard. No `nearMiss` (degenerate for keyword rules — anchor and proximity collapse to the same word; coverage CLI skips). `pairsWith=[]` — scry is pure library-top selection with no payoff counterpart.

### effect.surveil
Single-keyword regex `\bsurveil \d+\b`. 128 matches. `pairsWith=['condition.cares_graveyard']` — surveil mills the cards put on bottom, so graveyard-payoff cards (Family 9) are natural targets. Produces 17,911 edges.

### effect.look_at_top_n
Two patterns:
- Plural: `look at/reveal (the )?top <N> cards of [whose] library`
- Singular: `look at/reveal the top card of [whose] library`

`<N>` is `\d+|x|one..ten|twelve|fifteen|twenty`. The spelled-out extension to twelve/fifteen/twenty was added after near-miss inspection surfaced "Look at the top twenty cards of your library" on Thunderous Debut. `nearMiss` from the brief verbatim (anchors: look/reveal, proximity: top/library, window: 6). `pairsWith=[]`.

### effect.tutor_any
Strict regex `search [\w\s]+? library for (?:an? |any )card\b` — NO type/subtype word between determiner and "card", and word boundary after "card" to exclude multi-card tutors. 17 matches in Standard.

Low count is the right answer: true "tutor any card" is rare. Near-miss inspection confirms all unmatched "search library" cards are typed/subtype tutors (Aura/Equipment, Bird, Lesson/Noble, Squirrel, basic land, etc.) which already have `effect.tutors_subtype.*` coverage or fall outside the v0.7 theme set. `nearMiss` from the brief verbatim (anchors: search, proximity: library/card, window: 8). `pairsWith=[]`.

## Intentional near-miss exclusions
- **scry / surveil**: keyword anchors are unambiguous; no near-miss inspection needed.
- **look_at_top_n**:
  - "search your library for X card, **reveal it**, ..." — every search-tutor reveals as part of the tutor flow; that's a `effect.tutors_subtype.*` pattern, not a library-top look. Correctly excluded by requiring `top ... card[s] of [whose] library`.
  - Library-top **manipulation** like "put the top card of your library into your graveyard" (mill) and "exile the top card" — those are `effect.mill` / `effect.exile_from_graveyard` respectively, not look-only.
- **tutor_any**:
  - Type-restricted tutors: "search your library for a creature/artifact/instant/basic land/Aura/etc. card" — all covered by `effect.tutors_subtype.*` (where applicable to the v0.7 theme set) or intentionally untagged. Including them under `tutor_any` would collapse the distinction the brief is explicitly drawing.
  - Multi-card tutors: "search your library for up to two basic land cards" (Cycle of Renewal), "search your library for four basic land cards" (Planar Engineering) — these are ramp/typed and fall outside the "any single card" archetype `tutor_any` is meant to capture.

## Judgment calls
- **scry / surveil omit `nearMiss`**: per the brief's note, when a near-miss probe is degenerate (anchor word IS the keyword being matched), the field is omitted rather than written tautologically. Coverage CLI skips rules without `nearMiss`.
- **look_at_top_n spelled-out numbers**: extended from the brief's one..ten to also include twelve/fifteen/twenty after surfacing "look at the top twenty cards" on Thunderous Debut in the near-miss list. Two-line change; +1 match. Did not add every spelled-out number because the long-tail (sixteen, seventeen, etc.) does not occur in Standard.
- **tutor_any "basic land card"**: the brief had a moment of indecision — I followed the final answer (skip it). "Basic land" is essentially a subtype-restricted tutor and is handled separately by ramp-tagging cards via existing rules. Including it would inflate `tutor_any` with what's really ramp.
- **tutor_any multi-card tutors**: excluded by the word boundary after `card` (matches `card\b` not `cards\b`). Intentional — "search for **a card**" and "search for **N cards**" are different archetypes.
- **Pairings for scry/look_at_top_n/tutor_any**: the brief specifies empty `pairsWith` for these three. They are *cause* tags, not *care-about* targets — there is no `condition.cares_about_scrying` in v0.7. Surveil is the exception because its mill-as-side-effect makes it a graveyard enabler.

## Open issues
None. All four rules pass their tests, the full pipeline test suite is green (586 tests, 68 files), pairings resolve, the standard artifact rebuilt cleanly (4446 cards, 372729 edges).
