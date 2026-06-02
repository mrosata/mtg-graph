# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

## Known rejects (don't re-flag in future audits)

- **Rise of the Dark Realms** — `condition.cares_graveyard` "from … graveyards" broadening rejected (v0.29.0). Reanimate effects belong on `effect.reanimate`. See `condition.cares_graveyard.test.ts:70`.
- **Shivan Dragon** — `effect.grants_stat_buff` self-pump narrowing rejected (v0.29.0). Self-buff intentionally admitted per user memory `project_v021_non_evasion_grants.md`.
- **Caelorna, Coral Tyrant** — DEFERRED (data-ingest gap, not a rule fix). Card has empty `oracleText` in artifact; investigate `pipeline/stripScryfallCard` separately.
- **Pride of the Road, Rover Blades** — `effect.grants_first_strike` exclude double strike rejected (v0.30.0). Double-firing is intentional metadata-tagged design at `effect.grants_keyword.ts:206-220`. Deduplication belongs at UI/graph layer.
- **The Last Ride (Pay 2 life cost)** — `effect.life_changed` exclusion rejected (v0.30.0). v0.15 intentional — Bonecache test row at `effect.life_changed.test.ts:51`.
- **Earthrumbler, Mimeoplasm, Molt Tender, Winter Cursed Rider (graveyard exile cost)** — `effect.exile_from_graveyard` cost-form admission rejected (v0.30.0). Test negatives at `effect.exile_from_graveyard.test.ts:67-68` encode the cost/effect axis separation.
- **Push the Limit, Anzrag's Rampage** — `trigger.beginning_of_end_step` "next end step" exclusion rejected (v0.30.0). Anzrag is encoded positive at `trigger.beginning_of_end_step.test.ts:20-21`.

## Deferred (not rule fixes)

- **Voyage Home** — `effect.draws_or_discards` misses because reminder-strip collapses keyword/newline boundary. Real fix is in `normalize.ts` (preserve boundary token when stripping a parenthesized reminder block).
- **Winter, Cursed Rider** — `effect.grants_ward` impossible until `ward` is added to `GRANTABLE_KEYWORDS` at `effect.grants_keyword.ts:12-23` (requires new tag authoring, not a regex broadening).
- **Roadside Assistance** — `condition.cares_subtype.mount` vs vehicle asymmetry; investigate rule's actual logic (may be a token-text exclusion vehicle escapes).
- **Rover Blades** — `condition.cares_subtype.equipment` and `.vehicle` not firing from type line. Cards-from-type-line tagging is a separate axis.
- **Sab-Sunen, Luxa Embodied** — `condition.cares_plus_one_counter` card-scoped inference (only +1/+1 counter type mentioned).
- **Lifecraft Engine** — typed-anthem on `As ~ enters, choose a creature type` metadata requires data plumbing beyond regex scope.
- **Group 21 (Explosive Getaway)** — `effect.bounce_artifact` PATTERN_BLINK_OWN deletion blocked: would require explicit flip of existing positive test row at `effect.bounce_artifact.test.ts:8`. Future PR.
