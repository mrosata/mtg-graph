# Family 7 — Steal/Copy: Implementer Report

## Rules implemented (3)
- effect.copy_spell: 34
- effect.copy_permanent: 79
- effect.control_change: 23

Total: 136 card-tag instances across the three rules.

## Aggregate taggable coverage after Family 7
89.5%  (was 89.2%; lift = +0.3 pp)

The lift came in on the lower end of the brief's projected +0.5-1.5 pp range. Two reasons:

1. The copy mechanics are intrinsically a small slice of Standard — copy_spell appears on ~34 cards and copy_permanent on ~79 cards, vs ~800+ for `trigger.self_etb`.
2. Most copy_permanent cards (the "create a token that's a copy of …" form) already carried `effect.create_token` from Family 11. The marginal coverage lift only counts cards that were previously untagged on every rule — so token-copy cards with prior token tags don't move the needle even though they gained an interaction-relevant tag.

The new tags still add edge connectivity even when they don't lift raw % — that lift will show through in the graph density numbers downstream.

## Pairings verified
- `effect.copy_spell` pairs with `trigger.spell_cast`.
- `effect.copy_permanent` pairs with `trigger.another_creature_etb` and `trigger.token_created`.
- `effect.control_change` has no pairings (intentional, see Per-rule notes).

`npm run rule:coverage -- --pairings` reports "All pairings resolve."

## Per-rule notes

### effect.copy_spell

Three pattern branches:
- **PATTERN**: `\bcopy (target|that|the)? [\w-]+? (spell|instant|sorcery|...)` — the literal "copy target spell" form from the brief.
- **CAST_SPELL_THEN_COPY_IT**: `\bcast(?:s|ing)?\b[^.]{0,60}?\b(instant|sorcery|spell|lesson)s?\b[^.]{0,160}?\bcopy it\b` — pronoun phrasing, requires a "cast … spell" antecedent within a bounded same-sentence window.
- **COPY_IT_FOR_EACH_SPELL**: `\bcopy it (for each|once for each|twice|.{0,40}?(instant|sorcery|spell)s?)` — Thousand-Year-Storm-style storm-count copies.

The brief listed only the literal form (~23 matches). Coverage inspection surfaced Thousand-Year Storm, Jace Reawakened, Spider-Verse, The Clone Saga, Jeong Jeong, and several other Standard cards using the "copy it" pronoun form. Adding the two CAST/COPY-IT branches lifted matches 23 → 34. The 60-char and 160-char `[^.]` windows keep the match scoped to one sentence (period acts as a sentence boundary in normalized text).

### effect.copy_permanent

Four pattern branches:
- **CREATE_COPY_TOKEN**: `\bcreate(?:s)? (a|an|N|x|one..ten|that many)(...){0,4} tokens? that('s|are|is)(...){0,3} cop(y|ies) of` — the canonical "create a token that's a copy of …" form. The `(...){0,4}` and `(...){0,3}` slots admit adjective stacks like "tapped and attacking token" (Calamity, Galloping Inferno) and "another nonlegendary creature" (various).
- **COPY_DIRECT**: `\bcopy (target|that|the)? [\w-]+? (creature|permanent|artifact|enchantment|planeswalker|land)\b` — direct "copy target creature" form. Explicit allowlist of permanent types so we don't overlap effect.copy_spell.
- **BECOMES_COPY**: `\bbecomes? a copy of (...){0,3}(creature|permanent|artifact|enchantment|planeswalker|land|it)\b` — Mimeoplasm, Mirrorform, Naga Fleshcrafter's renew, Likeness Looter.
- **ENTER_AS_COPY**: `\benter(?:s)? as a copy of\b` — Mockingbird, Visage Bandit, Omni-Changeling, Superior Spider-Man.

The brief listed two patterns and projected ~50 matches. Coverage inspection surfaced ~17 additional cards using "becomes a copy" / "enter as a copy" phrasings — all unambiguously permanent-copy effects in Standard. Final count: 79.

### effect.control_change

Two pattern branches:
- **GAIN_CONTROL**: `\b(gain|gains) control of (target |another target |that )? [\w-]+? (creature|permanent|artifact|enchantment|planeswalker|land)` — the canonical Threaten / Mind Control phrasing.
- **EXCHANGE**: `\bexchange control of\b` — Donate / Puca's Mischief swaps.

Empty `pairsWith` is intentional. Control-change interacts with the graph indirectly: stolen creatures are most synergistic when paired with sac outlets, haste-granters, or "untap target creature you control" — but those payoffs are at the ability level (e.g., "haste, then sacrifice"), not the same tag axis. The brief flagged this as "weak pairings — defensive note in catalog". The cleanest pairing would be against a future `effect.grants_haste` tag; deferred to v0.2.

23 matches matches the brief's expectation. No coverage iteration needed.

## Intentional near-miss exclusions

### effect.copy_spell
- **"copy target ability" / "copy that ability" / "copy target triggered ability"** (Ertha Jo, Kirol Attentive First-Year, Aziza Mage Tower) — copying an ability is its own concept and doesn't fire spell-cast triggers. Skipped.
- **"becomes a copy of that spell"** (The Everflowing Well / The Myriad Pools) — a permanent transforms into a copy of the spell; this is effectively permanent-copy semantics, not spell-copy. Already captured by `effect.copy_permanent`'s BECOMES_COPY branch via the related permanent-typed antecedent.

### effect.copy_permanent
- **"copy target spell"** family (Slick Imitator, Spider-Verse, Aziza, etc.) — explicitly excluded by the permanent-types allowlist in COPY_DIRECT. These belong to `effect.copy_spell`.
- **"a copy of a permanent spell becomes a token"** (reminder text on Slick Imitator, Flamehold Grappler) — reminder/rules-text fragment that's a consequence of permanent-spell copying, not its own ability. Not match.
- **"copy that ability"** (Ertha Jo, Kirol) — ability copy, neither permanent nor spell.

### effect.control_change
- **"creatures you control" / "permanents you control" / "this creature you control"** (hundreds of cards) — possessive/cares-about phrasing, not a take-control effect. The `\b(gain|gains) control\b` anchor at the front of the regex excludes all of these.
- **"target opponent controls a creature"** — describes the game state, not a take-control instruction.
- **Exile-and-bring-back effects** (Turncoat Kunoichi, The End) — these temporarily exile but don't take control. Not match.

## Open issues

None. All 3 rules pass tests; full pipeline suite green at 697 tests across 77 files. Pairings resolve. The artifact rebuild added 136 new tag instances across 4446 cards.

This is the **final family in Phase 1** of the v0.7 mechanics expansion. Phase 2 (integration + RULE_VERSION bump from v0.6.0 to v0.7.0) is up next for the orchestrator.
