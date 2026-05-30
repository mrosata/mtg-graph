# Family 8 — Lifegain Payoff: Implementer Report

## Rule implemented
- `condition.cares_lifegain`: 44 matches, 1.0% taggable

## Coverage commands
- `npm run rule:coverage -- condition.cares_lifegain`
- `npm run rule:coverage -- --pairings`

## Intentional near-miss exclusions
- "creature gains lifelink" — keyword-gain, not life-gain (~19 such cards in the corpus; 1 overlap with the match set is a true positive — Resplendent Angel has *both* a lifegain-payoff clause and a separate `gains lifelink` activated ability)
- "you gain N life" as a standalone effect clause — that is the `effect.life_changed` side of the pair, not the *cares-about* side
- "each opponent loses N life" payoffs that *cause* life change rather than *react* to it — correctly excluded
- "gains your choice of vigilance, lifelink…" (Ezrim) — keyword-gain phrasing

## Reviewer-driven fixes (commit after initial review)
- Added apostrophe to the character class: catches "if you've gained N life" (Sanguine Indulgence, Case of the Uneaten Feast, Haliya).
- Added "as long as" to the trigger-word alternation: catches "infusion" cycle (Tenured Concocter, Thornfist Striker, Ulna Alley Shopkeep).
- Added 2 new positive test cases + 1 new negative ("whenever a player loses life") as regression pins.

## Open issues
- 2 cards use "whenever you gain or lose life" (Wax-Wane Witness, Moonstone Harbinger). Could be picked up in a later sweep if a parallel `condition.cares_life_changed` ever lands. Volume too low to justify a third pattern in this rule.
