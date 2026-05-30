# Family 1 — Removal: Implementer Report

## Rules implemented (5)
- `effect.counterspell`: 53 matches, 1.2% taggable
- `effect.destroy_creature`: 90 matches, 2.0% taggable
- `effect.destroy_permanent`: 113 matches, 2.6% taggable
- `effect.board_wipe`: 31 matches, 0.7% taggable
- `effect.debuff_minus_n`: 87 matches, 2.0% taggable

Total: 374 new tag instances across the 5 rules (a single card may receive several — e.g. "destroy target creature or planeswalker" hits both `effect.destroy_creature` and `effect.destroy_permanent`, which is intentional per the brief).

## Aggregate taggable coverage after Family 1
**80.6%** (3567 / 4426 taggable cards).

Pre-Family-1 baseline (Family 11 report): 77.3%.

**Lift: +3.3 percentage points.**

This is below the +5–7 pp the brief projected. The same dynamic as Family 11 applies: most removal cards already carried at least one prior-family tag (e.g. a creature with an ETB ability that destroys a target was already counted by `trigger.self_etb`). What Family 1 contributes most is **secondary tagging on already-tagged cards**, which expands the interaction graph (more edges) without moving the "any-tag" headline. Raw tag volume (374) is consistent with the brief's "high-coverage-impact" framing; the edge contribution to the graph is large because all five tags pair into the dies/leaves-battlefield triggers.

## Commands run
- `npm run rule:coverage -- effect.counterspell`
- `npm run rule:coverage -- effect.destroy_creature`
- `npm run rule:coverage -- effect.destroy_permanent`
- `npm run rule:coverage -- effect.board_wipe`
- `npm run rule:coverage -- effect.debuff_minus_n`
- `npm run rule:coverage -- --pairings` → All pairings resolve.
- `npm run build:cards -- --standard` → 4446 cards (3567 tagged).
- `npm run rule:coverage -- --all` → 3567/4426 = 80.6%.

## Intentional near-miss exclusions

### effect.counterspell
- "this spell can't be countered" / "spells you control can't be countered" (defensive lines, not counter effects).
- "+1/+1 counter on" / "put a counter on" / "remove a counter from" (noun "counter", not the verb).
- "destroy target creature with a counter on it" (still noun form).

### effect.destroy_creature
- Board wipes ("destroy all creatures", "destroy each creature") — those tag as `effect.board_wipe`.
- Non-creature destruction ("destroy target artifact", "destroy target enchantment").
- Anaphoric forms ("when enchanted creature is dealt damage, destroy it") — too vague to confidently tag as a creature-removal effect.
- Multi-target indirectly-named forms ("for each player, destroy up to one creature that player controls") — not single-target, but also not "all" — these slip between the two rules and were left untagged.

### effect.destroy_permanent
- Single-target destroy on a *creature only* ("destroy target creature").
- Board wipes that hit permanents ("destroy all artifacts", "destroy all nonland permanents") — those tag as `effect.board_wipe`.
- Anaphoric forms ("destroy the chosen permanent" after a separate "choose target" sentence).
- "destroy target creature, enchantment, or planeswalker" *is* matched (regex was widened to allow commas between adjective tokens — this surfaced "Get Lost", which a stricter version had missed).

### effect.board_wipe
- "exile all graveyards" (graveyards aren't permanents — not a board wipe).
- "destroy up to one nonbasic land that player controls" per-player loops (multi-target, not "all/each").
- "all creatures get +1/+1 until end of turn" (anthem) — anchored on the destroy/exile verb so anthems don't match.

### effect.debuff_minus_n
- Symmetric *positive* pumps (`+N/+N`) — wrong sign.
- Asymmetric pump-trades (`+1/-1`) — not a clean debuff per the brief.
- Power-only debuffs (`-3/-0`, `-5/-0`) — can't kill via toughness, per the brief.
- "put a +1/+1 counter on" — that's a different `+`/`-` token, anchored on the `/` slash.

## Pairings
- `effect.counterspell`: `[]` — defensive, no edges (brief).
- `effect.destroy_creature`: `[trigger.creature_dies, trigger.permanent_leaves_battlefield]`.
- `effect.destroy_permanent`: `[trigger.permanent_leaves_battlefield]`.
- `effect.board_wipe`: `[trigger.creature_dies, trigger.permanent_leaves_battlefield]`.
- `effect.debuff_minus_n`: `[trigger.creature_dies]`.

All pairings resolve against existing v0.6 trigger tags.

## Open issues
None blocking. Family 1 lands clean with all 5 rules green, 444 total tests passing, and pairings resolving.
