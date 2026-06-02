# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

## Known rejects (don't re-flag in future audits)

- **Rise of the Dark Realms** — `condition.cares_graveyard` "from … graveyards" broadening rejected (v0.29.0). Reanimate effects belong on `effect.reanimate`. See `condition.cares_graveyard.test.ts:70`.
- **Shivan Dragon** — `effect.grants_stat_buff` self-pump narrowing rejected (v0.29.0). Self-buff intentionally admitted per user memory `project_v021_non_evasion_grants.md`.
- **Caelorna, Coral Tyrant** — DEFERRED (data-ingest gap, not a rule fix). Card has empty `oracleText` in artifact; investigate `pipeline/stripScryfallCard` separately.
