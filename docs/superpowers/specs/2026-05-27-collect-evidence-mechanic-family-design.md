# Collect-evidence mechanic family — tag-catalog design

Date: 2026-05-27. Catalog target: RULE_VERSION `v0.14.3`.

## Motivation

The MKM "collect evidence N" mechanic appears on 22 Standard cards (Murders at Karlov Manor + reprints) and has no catalog representation. The 2026-05-26 per-card audit batch flagged this as a family-level coverage gap; the suspect family shipped first (v0.14.2). This spec is the second of the three MKM families.

Collect Evidence is a keyword-action cost: "Collect evidence N" means exile cards from your graveyard with total mana value N or greater. It appears as additional cost, alt cost (`Conspiracy Unraveler`'s "collect evidence 10 rather than pay the mana cost"), activated-ability cost (`{T}, Collect evidence 3:`), and as an optional trigger ("you may collect evidence N"). Some cards then gate further effects on whether evidence was collected ("if evidence was collected, ..."), and two cards have a separate trigger that fires each time you collect evidence ("Whenever you collect evidence, ...").

The mechanic forms a clean producer/consumer loop. The exile-from-graveyard side-effect (in reminder text, stripped pre-tag) is exposed via the `children` mechanism so collect-evidence cards also carry `effect.exile_from_graveyard`.

## Tags

Three new files, one per tag, auto-discovered by `pipeline/rules/aggregator.ts`. Plus a `children` declaration on `effect.collect_evidence` to expand into `effect.exile_from_graveyard` via the tag-expansion post-pass.

### `effect.collect_evidence` (axis: effect)

The producer side. Matches the keyword-action phrase "collect evidence N" where N is a digit or the letter X.

**Description (tagDef):** "MKM keyword action. Exile cards from your graveyard with total mana value N or greater (as additional cost, alt cost, activated-ability cost, or optional triggered cost). Producer for `condition.evidence_collected` and `trigger.collected_evidence`. Also a form of graveyard-exile — applied via `children` expansion to `effect.exile_from_graveyard`."

**Pairings:** `['condition.evidence_collected', 'trigger.collected_evidence', 'condition.cares_graveyard', 'condition.cares_exile_pile']`. The graveyard pairing reflects that the keyword action consumes graveyard cards; the exile-pile pairing reflects that the consumed cards go to the exile zone.

**Children:** `['effect.exile_from_graveyard']`. Tag-expansion post-pass propagates the child tag to every card that carries `effect.collect_evidence`. The keyword action's mechanical effect (exiling from the graveyard) is described only in reminder text, which the normalizer strips — without the children expansion, `effect.exile_from_graveyard` would not fire on collect-evidence cards.

**Regex** (against normalized oracle text — lowercased, reminder-stripped, `__SELF__`-substituted):

```
(?<!ward—)\bcollect evidence (?:\d+|x)\b
```

The `(?<!ward—)` lookbehind excludes Axebane Ferox's `"Ward—Collect evidence 4"` ward-cost frame: in that frame the OPPONENT collects evidence (exiles from their own graveyard) to keep their spell on the stack — the controller is not collecting. This is the same axis-flip pattern as the edict frame the suspect family carved out.

**Expected match count:** 21 (22 producer-shaped cards minus Axebane Ferox).

### `condition.evidence_collected` (axis: condition)

The one-shot modal gate. Fires when "if evidence was collected" appears as a downstream gate on the same spell or ability.

**Description (tagDef):** "One-shot modal/scaling gate. Fires when the collect-evidence cost was paid on this spell or ability ('if evidence was collected, ...'). Consumer for `effect.collect_evidence`."

**Pairings:** `['effect.collect_evidence']`.

**Regex:**

```
\bif evidence was collected\b
```

**Expected match count:** 7. (Analyze the Pollen, Behind the Mask, Bite Down on Crime, Crimestopper Sprite, Deadly Cover-Up, Extract a Confession, Vitu-Ghazi Inspector.)

### `trigger.collected_evidence` (axis: trigger)

The per-collect trigger. Fires each time the controller collects evidence.

**Description (tagDef):** "Triggers each time the controller collects evidence (the keyword action). Distinct from `condition.evidence_collected`, which is the one-shot modal gate."

**Pairings:** `['effect.collect_evidence']`.

**Regex:**

```
\bwhenever you collect evidence\b
```

**Expected match count:** 2. (Evidence Examiner, Surveillance Monitor.)

## Per-card expected matches

Verified against actual normalized oracle text via the audit skill's lookup tool.

| Card | collect_evidence | evidence_collected | collected_evidence |
|---|:-:|:-:|:-:|
| Analyze the Pollen | ✓ | ✓ | |
| Axebane Ferox | (excluded — ward) | | |
| Behind the Mask | ✓ | ✓ | |
| Bite Down on Crime | ✓ | ✓ | |
| Conspiracy Unraveler | ✓ | | |
| Crimestopper Sprite | ✓ | ✓ | |
| Cryptex | ✓ | | |
| Deadly Cover-Up | ✓ | ✓ | |
| Evidence Examiner | ✓ | | ✓ |
| Extract a Confession | ✓ | ✓ | |
| Forensic Researcher | ✓ | | |
| Hedge Whisperer | ✓ | | |
| Incinerator of the Guilty | ✓ | | |
| Izoni, Center of the Web | ✓ | | |
| Kylox's Voltstrider | ✓ | | |
| Lamplight Phoenix | ✓ | | |
| Polygraph Orb | ✓ | | |
| Sample Collector | ✓ | | |
| Surveillance Monitor | ✓ | | ✓ |
| Tenth District Hero | ✓ | | |
| Urgent Necropsy | ✓ | | |
| Vitu-Ghazi Inspector | ✓ | ✓ | |

Totals: **21 / 7 / 2**.

After tag-expansion, every card carrying `effect.collect_evidence` also carries `effect.exile_from_graveyard` (via `children`). That's 21 additional graveyard-exile tag instances surfaced in the graph that previously had no such edge.

## Testing

Per `CLAUDE.md` TDD convention, each rule file has a colocated `.test.ts` with at least 3 positives + 3 negatives via `it.each([...])`.

### Positives (drawn from the real normalized text of the 22 audited cards):

- `effect.collect_evidence`:
  - `"as an additional cost to cast this spell, you may collect evidence 8."` (Analyze the Pollen, additional-cost form)
  - `"{t}, collect evidence 3: add one mana of any color."` (Cryptex, activated cost)
  - `"you may collect evidence 10 rather than pay the mana cost"` (Conspiracy Unraveler, alt cost)
  - `"collect evidence x, where x is the total mana value"` (Urgent Necropsy, variable form)
  - `"may collect evidence 4. if you do, return this card to the battlefield tapped."` (Lamplight Phoenix, optional trigger)
  - `"collect evidence 6: this vehicle becomes an artifact creature until end of turn."` (Kylox's Voltstrider, bare colon-cost)
- `condition.evidence_collected`:
  - `"if evidence was collected, instead search your library for a creature or land card."` (Analyze the Pollen)
  - `"this spell costs {2} less to cast if evidence was collected."` (Bite Down on Crime)
  - `"if evidence was collected, exile a card from an opponent's graveyard."` (Deadly Cover-Up)
- `trigger.collected_evidence`:
  - `"whenever you collect evidence, investigate."` (Evidence Examiner)
  - `"whenever you collect evidence, create a 1/1 colorless thopter artifact creature token with flying."` (Surveillance Monitor)

### Negatives:

- `effect.collect_evidence`:
  - `"ward—collect evidence 4."` (Axebane Ferox — opponent-side; the lookbehind blocks this)
  - `"if evidence was collected, instead search your library for a creature or land card."` (modal gate, not producer)
  - `"whenever you collect evidence, investigate."` (per-collect trigger, not producer — note "collect evidence" is the verb-object of "you collect", not the keyword-action form; would otherwise match if we used a looser regex)
  - `"draw a card."`
- `condition.evidence_collected`:
  - `"you may collect evidence 6."` (producer phrasing, not gate)
  - `"whenever you collect evidence, investigate."` (per-collect trigger, not gate)
  - `"draw a card."`
- `trigger.collected_evidence`:
  - `"if evidence was collected, instead search ..."` (modal gate, not trigger)
  - `"you may collect evidence 4."` (producer, not trigger)
  - `"draw a card."`

### Why the per-collect trigger phrase doesn't false-positive the producer

`effect.collect_evidence`'s regex requires `\d+` or `x` immediately after "collect evidence ". The Evidence Examiner / Surveillance Monitor trigger phrase is "whenever you collect evidence, ..." — no digit suffix, just a comma. The producer regex correctly does NOT fire on the trigger phrase. The negative-test fixture `"whenever you collect evidence, investigate."` confirms this.

### Combined regression case

Evidence Examiner-shaped fixture: a text containing BOTH `"you may collect evidence 4"` (producer) AND `"whenever you collect evidence, investigate"` (trigger). Both rules should fire on their respective frames; neither should double-fire.

### Children expansion check

After Tasks 2–4 land, run `npm run rule:coverage -- effect.exile_from_graveyard` and confirm the match count includes (at least) the 21 collect-evidence cards on top of any pre-existing matches. If the count doesn't go up by 21, the `children` expansion isn't firing — investigate `pipeline/tag-expansion.ts`.

### Catalog test

`pipeline/catalog.test.ts` validates:
- All `pairsWith` references resolve to catalog ids — all proposed pairings reference existing tags (`condition.cares_graveyard`, `condition.cares_exile_pile`, `effect.exile_from_graveyard`).
- Axis-cross constraint: all proposed pairings are effect↔condition or effect↔trigger (no same-axis violations).
- `children` references: `pipeline/catalog.test.ts > TagDef.children consistency > every child id referenced in a parent.children list exists in the catalog` — `effect.exile_from_graveyard` exists.

### `rule:coverage` near-miss declarations

Required for v0.7+ rules.

- `effect.collect_evidence`: `{ anchors: ['collect evidence'], proximity: ['additional cost', 'rather than pay', 'may', '{t}', 'whenever'], window: 8 }`
- `condition.evidence_collected`: `{ anchors: ['evidence was collected'], proximity: ['if', 'instead', 'costs'], window: 4 }`
- `trigger.collected_evidence`: `{ anchors: ['collect evidence'], proximity: ['whenever you'], window: 3 }`

## Known scope notes

**Axebane Ferox is intentionally untagged.** Its "Ward—Collect evidence 4" places the keyword action on the OPPONENT (paying ward exiles from THEIR graveyard). The controller doesn't collect; the card is a defensive Ward shell, not a self-collect synergy piece. Same axis-flip pattern as the suspect family's edict carve-out.

**No "evidence cleared" tag.** Unlike suspect (which has a `effect.unsuspect` clearer), collect-evidence has no semantic counterpart. Each "if evidence was collected" gate is per-spell/per-activation — there's no persistent "evidence" state to clear.

**Card-name normalization gotcha.** The card "Evidence Examiner" contains the literal word "evidence" in its name, but the pipeline replaces a card's own name with `__SELF__` before tagging. So Evidence Examiner's normalized text reads as `"at the beginning of combat on your turn, you may collect evidence 4. whenever you collect evidence, investigate."` — the "Examiner" part is replaced. The producer and trigger regexes both still fire correctly.

## RULE_VERSION

Bump `shared/version.ts` `RULE_VERSION` from `v0.14.2` to `v0.14.3`. New tag definitions force IndexedDB cache invalidation on the client per the existing convention.

## tagFamilies registration

`app/src/lib/tagFamilies.ts` requires every catalog tag to be explicitly registered under a family (enforced by `pipeline/tagFamilies-consistency.test.ts`). The three new tags belong to the `'set-mechanics'` family, matching the convention used for the suspect family (v0.14.2) and other set-specific keyword actions like `effect.discover` and `condition.descend`. Add three entries to the `TAG_TO_FAMILY` map in alphabetical position.

## Future work (out of scope for this spec)

- **Disguise / cloak / turn-face-up family** (~38 Standard cards). The third MKM family flagged in the 2026-05-26 audit. Bigger surface area — likely 4 tags. Separate spec.
- **Granted-ability normalization rework** (v0.15). The known-FN limitation documented in the suspect spec. Not blocking for this family — collect-evidence has no documented FNs from quote-stripping in the current data.
- **Cross-family pairings.** Once disguise lands, there may be value in cross-pairing (e.g., `effect.collect_evidence` with `trigger.turn_face_up` if any disguise card uses collect-evidence as its disguise cost). None observed in current data; revisit when disguise ships.
