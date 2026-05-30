# Family 3 — Tribes: Implementer Report

## Components shipped
- `THEME_TRIBES` constant in `pipeline/themes.ts` (10 tribes: human, elf, faerie, goblin, knight, wizard, dwarf, zombie, vampire, merfolk).
- `tribePattern(s)` helper with F-pluralization special cases (`elf → el(?:f|ves)`, `dwarf → dwar(?:f|ves)`); other tribes follow the regular `s?` rule.
- 10 parametric `condition.cares_tribe.<tribe>` rules in `pipeline/rules/condition.cares_tribe.ts`, each pairing with `effect.create_creature_token` and categorized as `theme`.
- `effect.create_creature_token` extended to populate `metadata.creatureTypes: string[]` by scanning the matched evidence against `THEME_TRIBES`. Also gained the required v0.7 `nearMiss` spec (`anchors: ['create'], proximity: ['token', 'creature'], window: 8`).
- `pipeline/graph.ts` gates `condition.cares_tribe.X` edges on the source card's `effect.create_creature_token` tag declaring `X` in `metadata.creatureTypes`.

## Per-tribe match counts (rule:coverage)
- condition.cares_tribe.human: 20
- condition.cares_tribe.elf: 26
- condition.cares_tribe.faerie: 20
- condition.cares_tribe.goblin: 30
- condition.cares_tribe.knight: 11
- condition.cares_tribe.wizard: 13
- condition.cares_tribe.dwarf: 1
- condition.cares_tribe.zombie: 24
- condition.cares_tribe.vampire: 10
- condition.cares_tribe.merfolk: 17

Total: 172 condition-side card-tag instances across 10 tribes.

## Aggregate taggable coverage after Family 3
86.2%  (was 86.0%; lift = +0.2 pp)

The headline lift is modest because most tribe-payoff cards already carried at least one Phase-0 / Families-1/2/8/9/11 tag (combat keywords, +1/+1 counters, ETB triggers). The new card-tag instances are mostly *additional* tags on already-taggable cards, not net-new taggable cards.

## Edge count delta
354818 edges (was 353218 pre-Family-3; +1600 edges).

All 1600 new edges originate from tribe pairings; they were emitted because the source card declared a matching creature type in `metadata.creatureTypes`. Distribution:
- condition.cares_tribe.goblin: 406
- condition.cares_tribe.zombie: 391
- condition.cares_tribe.human: 228
- condition.cares_tribe.elf: 200
- condition.cares_tribe.faerie: 133
- condition.cares_tribe.wizard: 72
- condition.cares_tribe.knight: 70
- condition.cares_tribe.merfolk: 64
- condition.cares_tribe.vampire: 36
- condition.cares_tribe.dwarf: 0

dwarf produces zero edges because the single matched payoff card has no token-maker source in the artifact (the metadata gate correctly excludes spurious links).

## Intentional exclusions
- Tribes beyond the canonical 10 (e.g., angel, demon, dragon, spirit, beast, dinosaur). The brief defines the 10-tribe set; adding more is a v0.8+ decision. `dragon` already exists as a `condition.cares_subtype.dragon` payoff (subtype theme) — that is a separate axis (`effect.tutors_subtype.dragon` enabler) and does not collide with this family's pairing target.
- No `condition.cares_tribe.soldier` — soldier is a frequent token type but the brief restricted the set to the 10 listed tribes.

## Judgment calls
- **Elf F-pluralization**: implemented the recommended (a) option — special-cased `tribePattern` for `elf → el(?:f|ves)` and `dwarf → dwar(?:f|ves)` rather than skipping the canonical `elves` form. Two lines of code; correct behavior.
- **`effect.create_creature_token` `nearMiss`**: added the spec from the brief verbatim. The previous v0.6 version of this rule had none — v0.7 requires it.
- **Metadata extraction scope**: limited to `THEME_TRIBES` only. The rule does not extract arbitrary creature types (e.g., "soldier", "spirit", "wolf") because they would not match any cares-tribe consumer; storing them would inflate artifact size without functional benefit. Easy to widen later if v0.8 adds more tribes.
- **Per-tag `nearMiss` on `condition.cares_tribe.*`**: omitted intentionally. The rules are single-keyword regexes against the tribe word with word boundaries; near-miss probing is degenerate (any near-miss would be a literal substring of the anchor). The coverage CLI skips rules without a `nearMiss`.

## Open issues
None. The Family 3 architecture is novel for the pipeline (metadata-gated edges) but the graph-test case verifies the gate fires correctly for both positive and negative inputs (`humans-maker` connects to `humans-payoff`; `zombies-maker` does not).
