# Family 9 — Archetype Themes: Implementer Report

## Rules implemented (4)
- condition.cares_enchantments: 30
- condition.cares_artifacts: 75
- condition.cares_tokens: 26
- condition.cares_graveyard: 140

## Aggregate taggable coverage after Family 9
86.0%  (was 85.1% before; lift = +0.9 pp)

## Intentional near-miss exclusions
- **cares_enchantments**: "enchantment spells you cast cost less" (2 cards, e.g. Inquisitive Glimmer) — distinct phrasing, low volume; "this enchantment enters" self-ETB (Up the Beanstalk-style) — that's self-referential, not a payoff scoping over a group; "it's an enchantment" descriptive text (Enduring Innocence) — not a payoff.
- **cares_artifacts**: "destroy target artifact" — that's `effect.destroy_permanent`, not a cares-about; "create a treasure token" — Treasures are artifacts but this is an effect, not a payoff; "this artifact enters" self-ETB phrasing — self-referential.
- **cares_tokens**: "create a token …" alone — that's `effect.create_token`, not the *cares-about* condition; "this token has …" — describes the token itself; "sacrifice an artifact, enchantment, or token" as cost — too noisy (226 matches, mostly generic cost templates, not token-archetype payoffs).
- **cares_graveyard**: "exile/return target card from your graveyard" — those are `effect.exile_from_graveyard` / `effect.reanimate`; "mill N cards" — that's `effect.mill`, the act of putting cards in graveyards, not caring about contents; "cards were put into graveyards from anywhere this turn" past-tense Case mechanic phrasing (Case of the Gorgon's Kiss) — single-card occurrence, not worth a dedicated pattern.

## Judgment calls
- Added a fifth pattern to `cares_artifacts` after near-miss inspection: `\byou control (\d+|one|two|...|ten) or more artifacts?\b` to catch the Case mechanic ("To solve — You control three or more artifacts") and "as long as you control N artifacts" scaling (Gaelicat, Brazen Blademaster). Same probe on enchantments returned 0 cards, so it was not added there.
- All four rules use the `nearMiss` spec from the brief verbatim. No volume-tuning needed on the windows.

## Open issues
None. Family 9 lift was +0.9pp (below the 1–3pp target band) because cares-about rules tag cards that often already carry other tags from earlier families (lifegain, removal, mana, keywords) — the *new* taggable cards beyond what was already covered are a smaller delta than raw match counts (271 card-tag instances total) suggest.
