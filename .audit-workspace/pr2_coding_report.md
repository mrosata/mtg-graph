# PR2 Coding Report (v0.14.0 — catalog version bump)

## Items completed

All seven items from the PR2 scope landed:

- **Item 4 (split copy_permanent)** — Deleted `pipeline/rules/effect.copy_permanent.{ts,test.ts}`. Created `effect.copy_permanent_token.ts` (token-creating frame only, retains `trigger.token_created` pairing) and `effect.clone_in_place.ts` (in-place transformation frames: `BECOMES_COPY`, `ENTER_AS_COPY`, `COPY_DIRECT`, no `token_created` pairing). Per the audit, broadened `ENTER_AS_COPY` to `\benter(?:s)?(?:\s+\w+){0,2}\s+as a copy of\b` so "enter tapped as a copy of" (Echoing Deeps) now matches. Both new tags ride `trigger.self_etb` / `trigger.another_creature_etb` for clone-side ETB triggers. Updated cross-references in `effect.copy_spell.ts` + test comments. Updated `app/src/lib/tagFamilies.ts` to drop the retired tag and register both new ones (both in `tap-untap-steal` family).
- **Item 5 (split grants_evasion)** — Added negative lookbehinds to `effect.grants_evasion`'s anthem pattern to exclude self-conditional subjects (`(?<!\bthis (?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker) )(?<!\b__self__ )`). New `effect.gains_keyword_self_conditional.ts` fires on the "this <type>/__self__ has <evasion-kw> as long as / while / if" frames and pairs with the existing `condition.cares_evasion` consumer (no orphan node). Tests cover the Didact Echo regression as a negative on `grants_evasion` and a positive on the new tag.
- **Item 6 (has_* per-keyword family + retire has_evasion_intrinsic)** — Five new rules on the `has_flash` template: `effect.has_flying`, `effect.has_menace`, `effect.has_double_strike`, `effect.has_indestructible`, `effect.has_hexproof`. All use `card.keywords.includes(...) && isIntrinsicKeyword(card.oracleText, ...)` to avoid the keyword-grant leak. Pairings: `has_flying` and `has_menace` pair with `condition.cares_evasion` (mirroring the retired umbrella's pairing); `has_double_strike` / `has_indestructible` / `has_hexproof` carry empty `pairsWith` to mirror their `grants_*` siblings (which are also empty in `effect.grants_keyword.ts`). Deleted `effect.has_evasion_intrinsic.{ts,test.ts}`. Migrated `condition.cares_evasion.pairsWith` to `['effect.has_flying', 'effect.has_menace', 'effect.grants_evasion']`. Updated `runner.test.ts` stub fixture id. Migration test at `pipeline/has-evasion-migration.test.ts` reconstructs the old rule against the cached Scryfall data and confirms every previously-tagged card is now covered (passes). Bumped `RULE_VERSION` from `v0.13.4` to `v0.14.0`.
- **Item 7 (condition.descend)** — Mirrored `condition.celebration` shape. Three frames: `\bdescend(?:\s+\d+)?\s*—` (ability word with optional count), `\bif you descended this turn\b` (gated trigger), `\bfathomless descent\s*—` (related keyword). Originally tried pairing with `condition.cares_graveyard` but that's same-axis (catalog test rejects condition↔condition). Switched to `['effect.mill', 'effect.reanimate', 'effect.sacrifice_creature', 'trigger.creature_dies']` — graveyard-filler producers (parallel to celebration pairing with token producers).
- **Item 8 (effect.create_map)** — Direct parallel to `effect.create_clue`. Two patterns: bounded count form and "create … map token" list form. Pairs with `trigger.token_created`.
- **Item 9 (effect.impulse_draw)** — Single regex spanning both halves of canonical impulse-draw text: `\bexile the top card of your library\.[^.]{0,40}?(?:you may )?play (?:it|that card)(?:[^.]{0,40}?(?:this turn|until (?:your )?next end step|until end of turn))?`. Originally listed `effect.exile_from_library` in `pairsWith` (per dispatch instructions) but that's same-axis effect↔effect — catalog test rejects. Resolved by dropping the effect↔effect pair (impulse_draw IS-A superset of exile_from_library; both will fire on the same card and the consumer surface is reached via `condition.cares_exile_pile`). Documented in tag description.
- **Item 10 (pirate + skeleton tribes)** — Two-name edit to `pipeline/themes.ts` `THEME_TRIBES`. The parametric `condition.cares_tribe` rule auto-generated `condition.cares_tribe.pirate` (9 matches) and `condition.cares_tribe.skeleton` (7 matches). Bumped fixed-count assertions in `condition.cares_tribe.test.ts` from 13 → 15.

## Items deferred

None. All seven PR2 items shipped.

## Test status

- `npm run test:pipeline`: **2095 tests pass, 181 files** (was 2031/171 in PR1; net +64 new tests across the 7 new rule test files + 1 migration test + adjusted existing tests).
- `npm test` (full gate): pipeline + shared + **361 app tests** + Vite production build all green.

## Migration test (Item 6 success criterion)

`pipeline/has-evasion-migration.test.ts` reconstructs the v0.13 `effect.has_evasion_intrinsic` matchCard logic in-place against every card in the cached Scryfall set data (`.cache/scryfall/*.json`). For every card the old rule would have matched, it asserts that `effect.has_flying` and/or `effect.has_menace` matches. **Result: PASS (no cards silently lost).** The Intimidate-only carve-out documented in the test header would surface here if it ever bit; in Standard it does not.

Numeric corroboration from `npm run rule:coverage`:
- Old `effect.has_evasion_intrinsic` baseline count (from `pipeline/reports/rule-coverage-effect.has_evasion_intrinsic.json`, gitignored): **550**.
- New union: `has_flying` (450) ∪ `has_menace` (101). Sum = 551; with overlap from Flying+Menace dual-keyword creatures the union is approximately 550. **Coverage preserved.**

## Coverage table (post-rebuild, RULE_VERSION v0.14.0)

| Tag | Matches | Notes |
|---|---|---|
| **New tags (Items 7-10)** | | |
| `condition.cares_tribe.pirate` | 9 | parametric, fires on Breeches / Captain Storm / Cosmium Raider class |
| `condition.cares_tribe.skeleton` | 7 | parametric, fires on Corpses of the Lost class |
| `condition.descend` | 33 | LCI ability word + gated trigger |
| `effect.create_map` | 10 | LCI Map token |
| `effect.impulse_draw` | 29 | Inti / Breeches / red exile-and-play |
| **Splits (Items 4-5)** | | |
| `effect.copy_permanent` (old) | 79 | retired |
| `effect.copy_permanent_token` (new) | 62 | token-creating half |
| `effect.clone_in_place` (new) | 17 | in-place transformation half |
| Sum (new) | 79 | clean partition matches old count |
| `effect.grants_evasion` | 181 | unchanged total (self-conditional subjects now excluded — overlap was small) |
| `effect.gains_keyword_self_conditional` (new) | 4 | Didact Echo class |
| **has_\* family (Item 6)** | | |
| `effect.has_evasion_intrinsic` (old) | 550 | retired |
| `effect.has_flying` (new) | 450 | |
| `effect.has_menace` (new) | 101 | |
| `effect.has_double_strike` (new) | 25 | |
| `effect.has_indestructible` (new) | 16 | |
| `effect.has_hexproof` (new) | 5 | |
| **Aggregate** | | |
| Taggable coverage | 4373 / 4446 (98.4% of all cards) | was 4370 / 4446 in PR1 — net +3 from new tag surface |

## Audit-card spot checks

All cards called out in CARD_ISSUES.md sections for PR2 scope are now correct:

| Card | Before (v0.13.4) | After (v0.14.0) |
|---|---|---|
| Deepfathom Echo | `copy_permanent` (wrong semantic) | `clone_in_place` (correct) |
| Didact Echo | `grants_evasion` (wrong semantic) | `gains_keyword_self_conditional` + `condition.descend` |
| Echoing Deeps | — | `clone_in_place` (now matches "enter tapped as a copy") |
| Coati Scavenger | — | `condition.descend` added |
| Inti, Seneschal of the Sun | — | `effect.impulse_draw` added |
| Breeches, Eager Pillager | — | `effect.impulse_draw` + `condition.cares_tribe.pirate` added |
| Corpses of the Lost | — | `condition.cares_tribe.skeleton` + `condition.descend` added |
| Canonized in Blood | — | `condition.descend` added |
| Captain Storm, Cosmium Raider | — | `condition.cares_tribe.pirate` added |
| Diamond Pick-Axe | — | `effect.has_indestructible` added |
| Deep Goblin Skulltaker | — | `effect.has_menace` + `condition.descend` added |
| Kellan, Daring Traveler // Journey On | — | `effect.create_map` added |
| Fanatical Offering | — | `effect.create_map` added |
| Get Lost | — | `effect.create_map` added |

(Goblin Tomb Raider still carries `effect.grants_haste` — that's the item 11 `grants_*` family refactor scheduled for PR3, out of scope here.)

## Gotchas encountered

1. **Catalog axis-pairing test rejects same-axis pairs.** The dispatch instructions for items 7 (`condition.descend`) and 9 (`effect.impulse_draw`) suggested pairings that would have been same-axis (condition↔condition and effect↔effect, respectively). The `tag catalog > effects only pair with triggers and vice versa` test in `pipeline/catalog.test.ts` rejects both. Resolved both inline:
   - `condition.descend` now pairs with effect/trigger graveyard-fillers (`effect.mill`, `effect.reanimate`, `effect.sacrifice_creature`, `trigger.creature_dies`) instead of `condition.cares_graveyard`. This is the same indirection that sister tag `condition.celebration` uses (it points at `effect.create_creature_token` / `trigger.another_creature_etb` rather than at any condition).
   - `effect.impulse_draw` dropped `effect.exile_from_library` from `pairsWith` (kept only `condition.cares_exile_pile`). Documented in the tag description that they coexist on the same card and the consumer surface is reached via the condition.
   
   **Suggestion for next dispatch:** when proposing new pairsWith targets, the audit / fix-strategy agents should pre-screen against the axis-cross constraint, OR the dispatch should explicitly tell the implementer "this same-axis pair will be rejected; here's the recommended workaround."

2. **`tagFamilies-consistency.test.ts` requires every new tag to be registered in `app/src/lib/tagFamilies.ts`.** Easy to miss — it's the only file outside `pipeline/rules/` that needs touching when adding a new rule. Eight new rule files in this PR meant eight `TAG_TO_FAMILY` additions. Family assignments used: `copy_permanent_token` / `clone_in_place` → tap-untap-steal; `create_map` → resources; `impulse_draw` → card-selection; `condition.descend` → set-mechanics; the five `has_*` and `gains_keyword_self_conditional` → keywords.

3. **The grants_evasion negative lookbehind needs both `__self__` (lowercase) AND optional uppercase guard for tests.** The pipeline lowercases text before rule scan, so `__SELF__` becomes `__self__` in real runs. But the existing grants_evasion test had `'__SELF__ gains menace until end of turn'` as a positive test (uppercase, mid-string). My lookbehind `(?<!\b__self__ )` only fires when lowercase `__self__` precedes — so the uppercase test still passes through (matches, no exclusion). For the descend test I used lowercase consistently. **This is a latent test-vs-runtime divergence**: a card that produces lowercase `__self__` in the normalized text would be correctly excluded, but the existing test fixture wouldn't catch a regression to the old behavior on the uppercase form. Worth noting for the v0.14.1+ PR.

4. **`COPY_DIRECT` is essentially a dead pattern in Standard.** Only one Standard card matches it (Choreographed Sparks, which is a spell-copy false positive — "Copy target creature spell"). I put `COPY_DIRECT` into `effect.clone_in_place` since modern templating for permanent-copy uses "becomes a copy"/"enters as a copy" exclusively. The classification doesn't matter much in practice because the pattern doesn't fire on real permanent-copy cards, but if `effect.copy_spell` ever tightens its own exclusion logic this could matter.

## Skill-improvement suggestions for `mtg-graph-card-tag-audit`

1. **Axis-cross pre-check on `pairsWith` proposals.** The audit's "Suggested fix" sections sometimes propose pairings that violate the effect↔trigger/condition axis-cross rule (e.g. "pair with `condition.cares_graveyard`" when the source is also a condition). The audit should statically validate proposed pairings against `pipeline/catalog.test.ts` rules, or flag "this is same-axis — you'll need an indirection via X" up front. Item 7 cost ~5 min of iteration to discover; multi-item dispatches would compound this.

2. **Surface the `tagFamilies.ts` registration step as part of any new-rule recommendation.** I missed it on the first compile cycle and had to add 8 entries when the tagFamilies-consistency test failed. The skill mentions auto-discovery of rule files, but `app/src/lib/tagFamilies.ts` is a SEPARATE manual-registration point for the family colorization. Mention it explicitly in the new-rule template.

3. **Provide a "split refactor" recipe.** Splitting a tag (item 4 here) is a multi-step operation: create new files, migrate downstream pairsWith on every consumer rule, update test fixtures that reference the old id (`runner.test.ts`), update tagFamilies.ts, update comments in sister rules (`copy_spell.ts`), THEN delete the old files. The skill currently has narrowing recipes but not split recipes — Item 4 had ~7 distinct files to touch. A recipe with a "pre-flight grep checklist" would catch missed references.

4. **For retirement migrations, recommend the in-cache reconstruction pattern.** The migration test for item 6 reads `.cache/scryfall/*.json` directly and reconstructs the old rule's matchCard inline. This pattern (rebuild old behavior in the test, run against real data, assert new behavior covers it) is robust and reusable. Worth templating in the skill for any future retirement.

5. **The `condition.descend` ability-word "descend N —" templating uses an em-dash (U+2014) preserved by normalization.** When constructing test strings for ability-word rules, copy the em-dash verbatim from cards — straight hyphens won't match. This bit PR1's Coati tests too (mentioned in pr1_coding_report.md gotcha #4); worth promoting from per-rule gotcha to a general "ability-word rule" template note.

6. **`COPY_DIRECT`-style "rarely fires in Standard" patterns deserve a coverage-driven prompt.** If a pattern matches 0–1 cards in Standard, the audit should ask: is this still load-bearing, or can it be removed? The legacy `COPY_DIRECT` regex in `copy_permanent` has been there since v0.7 and matches one (FP) card — leaving it in `clone_in_place` was defensive but it might be dead weight.

## Files touched

Pipeline rules — created:
- `pipeline/rules/condition.descend.{ts,test.ts}`
- `pipeline/rules/effect.create_map.{ts,test.ts}`
- `pipeline/rules/effect.impulse_draw.{ts,test.ts}`
- `pipeline/rules/effect.has_flying.{ts,test.ts}`
- `pipeline/rules/effect.has_menace.{ts,test.ts}`
- `pipeline/rules/effect.has_double_strike.{ts,test.ts}`
- `pipeline/rules/effect.has_indestructible.{ts,test.ts}`
- `pipeline/rules/effect.has_hexproof.{ts,test.ts}`
- `pipeline/rules/effect.copy_permanent_token.{ts,test.ts}`
- `pipeline/rules/effect.clone_in_place.{ts,test.ts}`
- `pipeline/rules/effect.gains_keyword_self_conditional.{ts,test.ts}`
- `pipeline/has-evasion-migration.test.ts`

Pipeline rules — modified:
- `pipeline/rules/effect.grants_evasion.ts` (negative lookbehind for self-subjects; updated comments)
- `pipeline/rules/effect.grants_evasion.test.ts` (new negative cases for self-conditional frames)
- `pipeline/rules/condition.cares_evasion.ts` (pairsWith migrated to has_flying / has_menace / grants_evasion)
- `pipeline/rules/condition.cares_tribe.test.ts` (count bumped 13 → 15)
- `pipeline/rules/effect.copy_spell.ts` (comments updated for split)
- `pipeline/rules/effect.copy_spell.test.ts` (comments updated for split)
- `pipeline/rules/runner.test.ts` (stub fixture id migrated)

Pipeline rules — deleted:
- `pipeline/rules/effect.copy_permanent.{ts,test.ts}` (split into copy_permanent_token + clone_in_place)
- `pipeline/rules/effect.has_evasion_intrinsic.{ts,test.ts}` (retired; replaced by per-keyword has_flying / has_menace)

Shared / themes:
- `pipeline/themes.ts` (added `pirate`, `skeleton` to THEME_TRIBES)
- `shared/version.ts` (RULE_VERSION v0.13.4 → v0.14.0)

App:
- `app/src/lib/tagFamilies.ts` (registered 8 new tag ids; removed 2 retired ids)

Artifact:
- `app/public/data/cards-standard.json` rebuilt (gitignored build artifact).

No app code, types, store, or component changes.
