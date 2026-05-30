# Family 6 — Tap / Untap effects: Implementer Report

## Rules implemented (2)
- effect.tap: 134
- effect.untap: 60

Total: 194 card-tag instances across the two rules.

## Pairings verified
Both rules pair with `trigger.tapped_or_untapped` (existing v0.6 tag). `npm run rule:coverage -- --pairings` reports "All pairings resolve."

## Per-rule notes

### effect.tap
Pattern: `\btap (?:up to N )?(?:target )?(?:[\w\-]+ ){0,3}(?:creature|permanent|artifact|land|enchantment)s?\b`

134 matches in Standard.

Three structural decisions worth calling out:

1. **`\btap ` with a literal trailing space** — this is what excludes the tap symbol `{t}:` (no space between `t` and `:`) and the adjective "tapped" (no space inside the word). Word-boundary alone is insufficient.
2. **Required permanent-typed noun** (`creature|permanent|artifact|land|enchantment`) — anchors to the effect form. "tap" appears in other contexts ("untap", "tapped", "becomes tapped", "{t}:") and without the noun anchor we'd have false positives.
3. **0-3 adjective tokens** before the noun — covers "another target creature", "up to one target creature", "target nonland permanent", "target tapped creature you don't control", etc.

`nearMiss` per brief (anchors: tap, proximity: creature/permanent/target, window: 6). Near-miss output is mostly cards that mention "tap" in non-effect contexts (e.g., "{T}: …" abilities where the tap symbol appears in a cost rather than an effect).

### effect.untap
Pattern: `\buntap (?:up to N |all )?(?:target )?(?:[\w\-]+ ){0,3}(?:creature|permanent|artifact|land|enchantment)s?\b`

60 matches.

Symmetric to `effect.tap`. The `all` alternation in the determiner slot handles "untap all creatures you control" — Family-6 effects frequently appear in board-wide untap effects (combo-payoff style). The "doesn't untap during your untap step" steady-state property is excluded by the verb-noun structure: after `untap`, the next 0-3 tokens are "during your untap step" with no permanent-typed noun in range.

`nearMiss` per brief (anchors: untap, proximity: creature/permanent/target/all, window: 6).

## Intentional near-miss exclusions

### effect.tap
- `{T}: ...` — the tap symbol as a cost on an activated ability. Not an effect. Excluded by requiring a space after `tap`.
- "becomes tapped" / "is tapped" — these are conditions on triggers (`trigger.tapped_or_untapped`), not effects.
- "enters tapped" — ETB modifier, not a one-shot effect. The word "tapped" never matches `\btap ` (no space after `tap` characters).
- "tapped creature" as an adjective phrase ("destroy target tapped creature") — that's not a tap effect; the verb is "destroy". The regex anchors on the verb form.
- Cards like Gas Guzzler / Phoenix Down where "tap" appears as a cost or condition but not as the main effect verb.

### effect.untap
- "doesn't untap during your untap step" — steady-state property. Excluded by the required permanent-typed noun within 0-3 tokens after `untap` (only "during your untap step" follows, no noun match).
- "skip your untap step" — phase modification, not a tap-effect.
- "you untap" / "untap your" without a permanent noun in range — generally not a unit-targeted untap effect.

## Judgment calls
- **0-3 adjective tokens between determiner and noun** — chosen empirically against the corpus. 0 is too tight (misses "target nonland permanent"), 5+ admits false positives where "untap" / "tap" reaches across sentence boundaries. 3 captures common phrasings ("up to one target tapped creature you don't control") without bleed.
- **Included `enchantment` in the noun list**: not common but valid (some cards say "tap target enchantment"). Adding it costs nothing and avoids missing the edge case.
- **Did not add "planeswalker" to the noun list**: planeswalkers are tapped/untapped extremely rarely and only via cards that already mention "permanent" (which catches them). Skipping keeps the regex compact.
- **Did not match bare "tap" / "untap" without a noun**: e.g., "untap." (period-terminated, as the final clause of a chain). Too risky for false positives; the noun requirement is the main false-positive control. Rare enough not to chase.
- **No special handling for "this creature" / "it" as the noun**: "tap it" / "untap it" anaphora — these depend on context (what "it" refers to). Generally these appear in narrowly-scoped activated abilities and don't reflect the broad "tap effect" archetype the tag is meant to surface for spellslinger / wizard-deck-style payoffs. Skipped.

## Open issues
None. Both rules pass tests; full pipeline suite green at 630 tests across 72 files. Pairings resolve.
