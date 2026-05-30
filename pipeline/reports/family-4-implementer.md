# Family 4 — Spellslinger: Implementer Report

## Rules implemented (2)
- effect.has_prowess: 31
- condition.cares_noncreature_spell: 89

Total: 120 card-tag instances across the two rules.

## Pairings verified
Both rules pair with `trigger.spell_cast` (existing v0.6 tag). `npm run rule:coverage -- --pairings` reports "All pairings resolve."

## Per-rule notes

### effect.has_prowess
Single-keyword regex `\bprowess\b`. 31 matches in Standard — matches both the keyword line on prowess creatures and "gains prowess" / "have prowess" cross-references on anthems and equip-likes. `pairsWith=['trigger.spell_cast']` — prowess creatures trigger off their own noncreature spell casts, so the pairing connects prowess-havers to spell-cast triggers. No `nearMiss` (degenerate for single-keyword rules; coverage CLI skips).

### condition.cares_noncreature_spell
Three regex patterns covering the common phrasings:
- `whenever <subject> cast(s|ed) (a|an|one|another) noncreature spell`
- `whenever <subject> cast(s|ed) (a|an|one|another) instant (spell )?or sorcery`
- `whenever <subject> cast(s|ed) (a|an|one|another) sorcery (spell )?or instant`

89 matches. The "whenever <subject> cast(s|ed)" anchor deliberately excludes:
- `search your library for an instant or sorcery card` (looking, not casting)
- `whenever you cast this spell` (self-cast — no noncreature/instant/sorcery descriptor)
- `whenever you cast a creature spell` (opposite — creature spells, not in scope)

The optional `spell` token after "instant " / "sorcery " is to handle both "instant or sorcery" and "instant spell or sorcery" / "sorcery spell or instant" phrasings.

The `<subject>` slot is `[\w\s']+?` (non-greedy) to capture "you", "a player", "an opponent", and variants like "the chosen player".

`nearMiss` from the brief verbatim (anchors: noncreature/instant/sorcery, proximity: cast/spell, window: 6). Near-miss output is reasonable — most are cards that mention "instant" or "sorcery" in other contexts (copy-spell mechanics, cast-from-graveyard, X-cost reductions) and not "whenever cast" payoffs.

## Intentional near-miss exclusions
- "Whenever you cast a creature spell, ..." — opposite of the payoff; no `condition.cares_creature_spell` in v0.7 scope.
- "Whenever you cast this spell, ..." — self-cast trigger; the spell is itself, not "a noncreature spell" in the general sense. Not a spellslinger payoff in the deck-building sense.
- "Search your library for an instant or sorcery card" — tutor pattern, handled (or intentionally skipped per Family 5) by `effect.tutor_any` / `effect.tutors_subtype.*`.
- "Copy target instant or sorcery spell" — a copy effect, not a "cast" trigger. Frequently shows up in the near-miss list; not a spellslinger payoff card.
- "When ~ enters, you may cast it from your graveyard" / "you may cast instant or sorcery spells from your graveyard" — graveyard recursion enabler, not a "whenever you cast" payoff.
- Cards like Pyromancer's Goggles ("copy that spell") and Wishing Well ("look at instants and sorceries") that mention the types but don't trigger off casts.

## Judgment calls
- **`effect.has_prowess` omits `nearMiss`**: single-keyword regex; near-miss probing is tautological (the anchor IS the keyword being matched). Coverage CLI skips rules without `nearMiss`. Consistent with `effect.has_lifelink`, `effect.has_trample`, etc.
- **Subject slot `[\w\s']+?`**: matches up to two or three words (you / a player / an opponent / the chosen player). Could be tightened to a known-token alternation, but the non-greedy `?` plus the required trailing `cast(s|ed)\s+(a|an|one|another)` token sequence already prevents over-broad capture.
- **`another` accepted in determiner slot**: not common, but appears in cards like Ovika-style "whenever you cast another noncreature spell" phrasings (the spell triggering owns its own noncreature-spell cast). Adding `another` to the determiner alternation is cheap and avoids missing this pattern.
- **Did not extend with `instant cards or sorcery cards`-style phrasings**: those are zone-looking ("look at all instant cards in your graveyard"), not cast triggers. Already excluded by the "whenever cast" anchor.

## Open issues
None. Both rules pass tests; full pipeline suite green at 607 tests across 70 files. Pairings resolve.
