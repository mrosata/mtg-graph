# Family 11 — Keyword Properties: Implementer Report

## Rules implemented (7)
- `effect.has_deathtouch`: 118 matches, 2.7% taggable
- `effect.has_lifelink`: 146 matches, 3.3% taggable
- `effect.has_trample`: 255 matches, 5.8% taggable
- `effect.has_first_strike`: 143 matches, 3.2% taggable (carries `metadata.doubleStrike = true` when match was on double strike)
- `effect.has_evasion`: 760 matches, 17.2% taggable
- `condition.cares_evasion`: 36 matches, 0.8% taggable
- `condition.cares_deathtouch`: 3 matches, 0.1% taggable

## Total new tags applied (sum of matches)
1461 tag instances across the 7 rules (some cards receive multiple).

## Aggregate taggable coverage AFTER family 11
77.3% (3421 / 4426 taggable cards).

Pre-family-11 baseline (computed from the same artifact, subtracting only Family-11 tags from each card's `tags` list): 70.5–70.6%.

Lift from Family 11: **+6.7 percentage points** (760-card evasion sweep is the dominant contributor).

Note: this is below the +10 pp the brief projected. Reason: many vanilla-keyword creatures already had other tags (e.g. a flier with an ETB trigger was already tagged); the lift only counts cards that were *previously untagged*. The raw tag volume (1461 new tag instances) is consistent with the brief's high-impact framing.

## Coverage commands
- `npm run rule:coverage -- effect.has_deathtouch`
- `npm run rule:coverage -- effect.has_lifelink`
- `npm run rule:coverage -- effect.has_trample`
- `npm run rule:coverage -- effect.has_first_strike`
- `npm run rule:coverage -- effect.has_evasion`
- `npm run rule:coverage -- condition.cares_evasion`
- `npm run rule:coverage -- condition.cares_deathtouch`
- `npm run rule:coverage -- --pairings` → All pairings resolve.
- `npm run rule:coverage -- --all` → 3421/4426 = 77.3%

## Intentional near-miss exclusions
- `effect.has_evasion` does not match "can't be blocked" / "is unblockable except by" / "shadow" — Slice-3 work per the brief.
- `effect.has_evasion` does not include the **Skulk**, **Horsemanship**, or **Fear** keywords. These are minor / non-Standard so were omitted; can be added if a future Standard rotation surfaces them.
- `condition.cares_evasion` only parses oracle-text mentions; it does NOT look at the typeline (e.g. "creature — bird" creatures with the typeline subtype). Adding typeline-based payoff detection is out of scope.
- `condition.cares_evasion` requires a "creatures with X" / "X creatures you control" payoff form. It will not fire on `cares_subtype` payoffs (e.g. "bird creatures"); evasion-by-subtype is a `condition.cares_subtype` concern.
- `condition.cares_deathtouch` allows a bare `with deathtouch` (no `creature` lead-in) — this picked up 1 extra real card (`Restless Reef`'s "menace as long as you control a creature with deathtouch" was already in the longer form, but the bare form also works). Risk of false positive is low because `with deathtouch` doesn't naturally appear in non-payoff phrasings.
- `effect.has_first_strike` deliberately *does* match "gains first strike" / "gains double strike" payoffs — consistent with the brief: the card expresses something about the keyword.
- Word-boundary matching (`\b`) means substrings like "trampling" (if it ever appears) won't false-match. The corpus uses noun-keyword forms exclusively.

## Metadata semantics
`effect.has_first_strike` populates `metadata.doubleStrike = true` when the regex matched on `double strike`. This propagates to the card's `CardTag.metadata` via the existing `runner.ts` spread logic. UI consumers can distinguish first-strike-only from double-strike-or-more without re-parsing oracle text.

## Pairings
- `effect.has_deathtouch ↔ condition.cares_deathtouch` (new pair, both sides land in this family).
- `effect.has_evasion ↔ condition.cares_evasion` (new pair, both sides land in this family).
- `effect.has_lifelink → condition.cares_lifegain` (Family-8 condition; one-way ref is enough — the graph builder walks `pairsWith` bidirectionally per `93db3c0`).
- `effect.has_first_strike`: `pairsWith: []` — no condition tag in this family. The closest payoff would be a future `condition.cares_first_strike` (no Standard cards observed yet); left empty rather than speculative.
- `effect.has_trample`: `pairsWith: []` — same rationale. Trample payoffs in Standard are extremely rare; deferred.

## Open issues
- None blocking. Family 11 lands clean with all pairings resolving and full test suite green.
