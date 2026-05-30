# Family 2 — Mana / Token Resources: Implementer Report

## Rules implemented (4)
- `effect.create_clue`: 20 matches, 0.5% taggable
- `effect.create_food`: 52 matches, 1.2% taggable
- `effect.create_treasure`: 82 matches, 1.9% taggable
- `effect.add_mana`: 414 matches, 9.4% taggable

Total: 568 new tag instances across the 4 rules. The mana adders dominate by volume — every basic-fixing land + every ramp rock matches, which is most of the lift.

## Aggregate taggable coverage after Family 2
**85.1%** (3767 / 4426 taggable cards).

Pre-Family-2 baseline (Family 1 report): 80.6%.

**Lift: +4.5 percentage points.**

Within the +2–4 pp the brief projected (actually slightly above it). Most of the lift comes from `effect.add_mana` picking up lands and mana rocks that had no prior-family tags. The three token-creator rules are smaller individually but each pairs into `trigger.token_created`, so they contribute graph edges beyond what their taggable-% suggests.

## Commands run
- `npm run rule:coverage -- effect.create_clue`
- `npm run rule:coverage -- effect.create_food`
- `npm run rule:coverage -- effect.create_treasure`
- `npm run rule:coverage -- effect.add_mana`
- `npm run rule:coverage -- --pairings` → All pairings resolve.
- `npm run build:cards -- --standard` → 4446 cards (3768 tagged at build time; 3767 of taggable).
- `npm run rule:coverage -- --all` → 3767/4426 = 85.1%.

## Intentional near-miss exclusions

### effect.create_clue
- Anaphoric token forms ("those tokens plus a clue token are created instead" on *Case of the Pilfered Proof*) — replacement-effect templating that isn't a direct "create a clue token" verb phrase.

### effect.create_food
- Sacrificial Food consumption ("whenever you sacrifice one or more Foods, create a 1/1 Squirrel token" on *Camellia, the Seedmiser*) — Foods are sacrificed, the token created is a creature.

### effect.create_treasure
- No remaining near-misses after the multi-token-list pattern was added.

### effect.add_mana
- "Spend this mana only to cast..." restriction riders (the rule anchors on the verb "add", not on mana symbols).
- "Costs {1} less to cast" cost reductions and alternative-cost lines ("you may pay {2} rather than..."). Neither uses the verb "add".
- "Additional combat phase" / "an additional time" / "in addition to its other types" / "with an additional +1/+1 counter" — `add`-rooted unrelated game vocabulary; correctly skipped because no mana payload follows.
- Saddle / plot / warp / mayhem alt-cost mana symbols on otherwise-non-ramp cards (the regex requires "add(s)" *immediately* before the symbol within a short window, so these don't match).

## Pairings
- `effect.add_mana`: `[]` — adding mana is a resource action; no triggered-ability counterpart.
- `effect.create_clue`: `[trigger.token_created]`.
- `effect.create_food`: `[trigger.token_created]`.
- `effect.create_treasure`: `[trigger.token_created]`.

All pairings resolve against existing v0.6 tags.

## Iteration notes — effect.add_mana

The starter regex from the brief matched 399 cards. Coverage inspection surfaced ~12 obvious misses: choose-a-color lands using "add one mana of the chosen color", devotion payoffs using "add one mana of that color", "−10: add ten mana of any one color" (planeswalker ultimates), and "adds an additional N mana of ..." (anthem-style mana doublers).

Broadening Pattern 2 to accept `of (any|the|that|the chosen)` plus the `an additional` count prefix, plus extending the count vocabulary to "ten", lifted the match count from 399 → 414. The remaining near-misses (Anzrag, Caustic Bronco, Prison Break, Visage Bandit, etc.) are all true negatives: their `add` token comes from "additional", "addition to", or "additional time" in non-mana contexts.

## Open issues

None blocking. Family 2 lands clean with all 4 rules green, 489 total tests passing, and pairings resolving.
