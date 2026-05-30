# Suspect mechanic family — tag-catalog design

Date: 2026-05-27. Catalog target: RULE_VERSION `v0.14.2`.

## Motivation

The MKM "suspect" mechanic appears on 20 Standard cards (Murders at Karlov Manor + reprints) and has no catalog representation. The 2026-05-26 per-card audit batch flagged this as a family-level coverage gap. Without it, suspect-givers can't be connected to suspect-payoffs in the graph, and players can't discover the archetype through the app's filters.

A suspected creature has menace and can't block; suspect-makers grant the status, carers gate on it, and clearers remove it. The mechanic is a closed loop with clear producer/consumer roles, which makes it well-suited to a dedicated tag axis.

## Tags

Three new files, one per tag, auto-discovered by `pipeline/rules/aggregator.ts`.

### `effect.suspect` (axis: effect)

Targets a creature and gives it the suspect status — menace and can't block — until the next end step.

**Description (tagDef):** "MKM keyword action. Targets a creature and gives it suspect status (menace, can't block). Producer for `condition.cares_suspected` payoffs and acts as a menace-grant feeder for `condition.cares_evasion` (suspected creatures count as menace creatures)."

**Pairings:** `['condition.cares_suspected', 'condition.cares_evasion']`. The evasion bridge is the same modeling pattern used elsewhere where a producer creates a downstream-evasive permanent (token-makers that create fliers pair with `condition.cares_evasion`).

**Regex** (against normalized oracle text — lowercased, reminder-stripped, `__SELF__`-substituted):

```
\b(?:(?:and|then|may) )?suspect (?:it|enchanted creature|one of (?:the )?(?:other )?creatures?|(?:up to (?:one|two|three))?\s*(?:other\s+)?target creatures?)\b
```

The leading `(?:(?:and|then|may) )?` admits chained clauses like Case of the Stashed Skeleton's "create a … token **and** suspect it" and Rubblebelt Braggart's "you **may** suspect it" without separate alternations.

**Expected match count:** 15. (16 producer cards minus Presumed Dead, which is a known false-negative — see Known limitations.)

### `condition.cares_suspected` (axis: condition)

Gates, scales, targets, or statically references suspected creatures.

**Description (tagDef):** "Triggers, scales, gates, or targets based on whether a creature is suspected. Includes anti-suspect statics ('can't become suspected') since they reference the same status."

**Pairings:** `['effect.suspect', 'effect.unsuspect']`. Both producers feed this condition; the unsuspect side feeds it because removing the status is itself an interaction with the resource.

**Regex** (one alternation per frame):

```
\b(?:is|are|was|were|it's|they're)\s+(?:not\s+)?(?!no longer\s+)suspected\b
\btarget suspected (?:creature|\w+)\b
\bsacrifice a suspected (?:creature|\w+)\b
\b(?:no |any )?suspected (?:creature|\w+)s? you control\b
\bcan't become suspected\b
```

The `(?!no longer\s+)` negative lookahead in the first alternation prevents the `unsuspect` "is no longer suspected" frame from also satisfying this rule.

The `\w+` slot in the typed alternations (`target suspected <tribe>`, etc.) is intentionally liberal rather than restricted to `THEME_TRIBES`. Maintenance argument: every new MKM-style set adds tribes; precision argument: "suspected" is a low-traffic word and only carer cards use the "suspected <noun> you control" frame. False-positive risk is minimal.

**Expected match count:** 11.

### `effect.unsuspect` (axis: effect)

Removes suspect status from a creature.

**Description (tagDef):** "Removes the suspect status from a creature ('is/are no longer suspected', 'becomes no longer suspected'). Counter-play and payoff for `condition.cares_suspected`."

**Pairings:** `['condition.cares_suspected']`.

**Regex:**

```
\b(?:is|are|it's|they're|become|becomes) no longer suspected\b
```

**Expected match count:** 5.

## Per-card expected matches

Verified against actual normalized oracle text via the audit skill's lookup tool.

| Card | suspect | cares | unsuspect |
|---|:-:|:-:|:-:|
| Absolving Lammasu | ✓ | | ✓ |
| Agency Coroner | | ✓ | |
| Agrus Kos, Spirit of Justice | ✓ | ✓ | |
| Airtight Alibi | | ✓ | ✓ |
| Barbed Servitor | ✓ | | |
| Case of the Stashed Skeleton | ✓ | ✓ | |
| Caught Red-Handed | ✓ | | |
| Clandestine Meddler | ✓ | ✓ | |
| Convenient Target | ✓ | | |
| Deadly Complication | | ✓ | ✓ |
| Eliminate the Impossible | | ✓ | ✓ |
| Frantic Scapegoat | ✓ | ✓ | ✓ |
| It Doesn't Add Up | ✓ | | |
| Person of Interest | ✓ | | |
| Presumed Dead | (FN) | | |
| Reasonable Doubt | ✓ | | |
| Repeat Offender | ✓ | ✓ | |
| Rubblebelt Braggart | ✓ | ✓ | |
| Rune-Brand Juggler | ✓ | ✓ | |
| J. Jonah Jameson | ✓ | | |

Eliminate the Impossible intentionally fires both `cares_suspected` and `unsuspect` — its "if any of them are suspected" clause is a real gate, and "they're no longer suspected" is a real clearer. Distinct spans, distinct semantics.

## Testing

Per `CLAUDE.md` TDD convention, each rule file has a colocated `.test.ts` with at least 3 positives + 3 negatives via `it.each([...])`.

### Positives (drawn from the real normalized text of the 20 audited cards):

- `effect.suspect`:
  - `"suspect up to one target creature an opponent controls"` (Absolving Lammasu)
  - `"suspect it"` (Agrus Kos, after "if it's suspected, exile it. otherwise,")
  - `"and suspect it"` (Case of the Stashed Skeleton, chained-clause shape)
  - `"you may suspect it"` (Rubblebelt Braggart, may-gate)
  - `"suspect enchanted creature"` (Convenient Target, enchanted-creature object)
  - `"suspect one of the other creatures"` (Frantic Scapegoat, transfer frame)
- `condition.cares_suspected`:
  - `"if it's suspected"` (Agrus Kos)
  - `"the sacrificed creature was suspected"` (Agency Coroner)
  - `"target suspected creature you control"` (Deadly Complication)
  - `"sacrifice a suspected creature"` (Rune-Brand Juggler)
  - `"you control no suspected skeletons"` (Case of the Stashed Skeleton)
  - `"can't become suspected"` (Airtight Alibi)
- `effect.unsuspect`:
  - `"all suspected creatures are no longer suspected"` (Absolving Lammasu)
  - `"it's no longer suspected"` (Airtight Alibi)
  - `"they're no longer suspected"` (Eliminate the Impossible)
  - `"become no longer suspected"` (Deadly Complication, may-gate)

### Negatives:

- `effect.suspect`:
  - `"target suspected creature you control"` (carer phrasing, not producer)
  - `"if it's suspected, exile it"` (gate, not producer)
  - `"a suspected creature has menace"` (reminder text — already stripped pre-normalization, but a regression guard)
- `condition.cares_suspected`:
  - `"suspect it"` (producer phrasing, not carer)
  - `"is no longer suspected"` (clearer phrasing — must be blocked by the `(?!no longer)` lookahead)
- `effect.unsuspect`:
  - `"is suspected"` (carer, not clearer)
  - `"if it's suspected, exile it"` (gate then exile, no "no longer" clause)

### Combined regression case

Airtight Alibi-shaped fixture: `"if it's suspected, it's no longer suspected"` must produce exactly one `cares_suspected` hit on `"it's suspected"` and exactly one `unsuspect` hit on `"it's no longer suspected"`. No double-fire on either rule.

### Catalog test

`pipeline/catalog.test.ts > "tag catalog > effects only pair with triggers and vice versa"` will validate that the declared `pairsWith` arrays satisfy the axis-cross constraint. All proposed pairings (effect → condition) satisfy it.

### `rule:coverage` near-miss declarations

Required for v0.7+ rules. These let the audit CLI surface "this rule almost matched these cards."

- `effect.suspect`: `{ anchors: ['suspect'], proximity: ['target creature', 'it', 'enchanted creature', 'creature you control'], window: 8 }`
- `condition.cares_suspected`: `{ anchors: ['suspected'], proximity: ['is', 'are', 'was', 'target', 'sacrifice', 'control', "can't become"], window: 6 }`
- `effect.unsuspect`: `{ anchors: ['no longer suspected'], proximity: ['is', 'are', "it's", "they're", 'become'], window: 4 }`

## Known limitations

**Presumed Dead false-negative.** Its suspect verb lives inside a paired-quote granted-ability clause: `gains "When this creature dies, return it to the battlefield under its owner's control and suspect it."`. The v0.13.4 `normalize.ts` quote-stripping pass removes the entire quoted span before any rule sees the text, leaving the normalized oracle as `"until end of turn, target creature gets +2/+0 and gains"` — no `suspect` verb survives. None of the suspect rules will fire on Presumed Dead.

This is a normalization-layer issue, not a suspect-rule issue. The same shape affects every grants-keyword card whose granted ability contains a keyword we have rules for (≈20 spans in Standard, across mechanics like flying, scry, vigilance, suspect, etc.). It is being tracked as a separate v0.15 design — see "Future work."

For now, Presumed Dead is the only suspect-family card affected (1 of 20, 5%) and the spec accepts this as a known FN. When the granted-ability normalization rework ships in v0.15, this card should auto-tag with no changes to the suspect rules.

**Skeleton subtype precision.** The `\w+` slot in `target suspected <tribe>` will match any subtype-shaped token. The trade-off — liberal vs. constrained to `THEME_TRIBES` — is documented in the `condition.cares_suspected` section above. If a future false-positive surfaces, narrow at that point.

## RULE_VERSION

Bump `pipeline/catalog.ts` `RULE_VERSION` from `v0.14.1` to `v0.14.2`. New tag definitions force IndexedDB cache invalidation on the client per the existing convention.

## Future work (out of scope for this spec)

- **Granted-ability normalization rework** (v0.15). Replace v0.13.4's "strip the quote entirely" approach with a model that strips for `effect.has_<kw>` rules (to prevent the false-positive bug that motivated v0.13.4) but exposes the quote content to a separate matching pass for "grants/produces" rules. Will retag Presumed Dead automatically. The 2026-05-27 impact preview enumerated 77 granted-ability frames in Standard, of which ~20 contain a current-catalog keyword.
- **Token-body extraction** (also v0.15+). 234 cards in Standard create tokens whose abilities are described in paired-quote spans. These have semantically different implications from granted abilities (the token has the ability, not the creator card) and need their own model. Out of scope for the granted-ability rework.
- **Other MKM coverage gaps**: disguise/cloak/turn-face-up (~38 cards), collect-evidence (~22 cards). Each warrants its own family-level spec.
