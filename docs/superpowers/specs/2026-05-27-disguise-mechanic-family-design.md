# Disguise mechanic family — tag-catalog design

Date: 2026-05-27. Catalog target: RULE_VERSION `v0.14.4`.

## Motivation

The MKM "Disguise" mechanic and its DSK cousins (Cloak, Manifest Dread) appear on ~70 Standard cards and have no catalog representation. Per-card audits flagged the gap on Aurelia's Vindicator, Basilica Stalker, Bolrac-Clan Basher, Branch of Vitu-Ghazi, Bubble Smuggler, and Alley Assailant. Without these tags, face-down-creation producers can't be connected to face-up-triggered payoffs in the graph, and players can't discover the archetype through the app's filters.

Disguise is a morph-style keyword printed on a card (face-down-castable for {3}, turn face up for the disguise cost). Cloak and Manifest Dread are keyword actions that produce face-down 2/2 creatures with ward {2} from external sources (top of library, opposing cards). All three share the `is turned face up` trigger as the payoff.

## Scryfall corpus counts

Quick analysis of the Standard artifact (`app/public/data/cards-standard.json`):

| Mechanic | Count |
|---|---:|
| `disguise` printed keyword | 38 |
| `manifest dread` keyword | 25 |
| `cloak` keyword | 5 |
| `turned face up` trigger | 35 |
| `as ... is turned face up` (replacement) | 1 (Bubble Smuggler) |

The 38 Disguise + ~30 Cloak/Manifest Dread cards collectively form a ~70-card archetype centered on the `trigger.turned_face_up` payoff.

## Tags

Three new files, one per tag, auto-discovered by `pipeline/rules/aggregator.ts`.

### `effect.has_disguise` (axis: effect)

Card has the printed Disguise keyword.

**Description (tagDef):** "Has the Disguise keyword as a printed intrinsic ability. The card can be cast face-down for {3} as a 2/2 creature with ward {2}, and turned face up any time by paying its disguise cost."

**Pairings:** `['trigger.turned_face_up']`.

**Strategy:** Two-layer match, mirroring the `effect.has_ward` precedent shipped in Round 1 — Scryfall's `card.keywords` array is the authoritative ground truth; regex fallback covers cards where the keyword text is present but Scryfall hasn't parsed it.

**Regex (fallback only):** `/\bdisguise\s*\{/`

The cost-block requirement (`\{`) anchors the rule against the keyword's printed cost syntax (e.g. `disguise {3}{R}`), preventing FP against incidental uses of the word "disguise" in flavor or reminder text.

**Expected match count:** 38.

### `effect.cloak` (axis: effect)

Card produces face-down 2/2 creatures via Cloak or Manifest Dread.

**Description (tagDef):** "MKM/DSK keyword action. Produces a face-down 2/2 creature (with ward {2}) from a specified source — `cloak` (target card on top of library, opponent's card you don't own, etc.) or `manifest dread` (look at top 2, cloak one + mill the other). The face-down creature can be turned face up later by paying its disguise cost."

**Pairings:** `['trigger.turned_face_up']`.

**Regex:**

```
/\b(?:cloak (?:the top card|that card|an?\s+\w+|target [\w\s]+)|manifest dread)\b/
```

Frames covered:
- `cloak the top card (of your library)` — Cryptic Coat, Hide in Plain Sight
- `cloak that card` — anaphoric, after a "look at top N" intro
- `cloak a <noun>` — modal/generic
- `cloak target <perm>` — Etrata cloaks opposing creatures
- `manifest dread` — bare keyword (reminder text strips the embedded "cloak one of those cards" detail)

Negative carve-out: `cloaked creature` (noun form, the result of cloak, not the producer). The regex's verb-anchor list naturally excludes this.

**Expected match count:** ~30 (5 cloak + 25 manifest dread).

### `trigger.turned_face_up` (axis: trigger)

Triggers when a face-down permanent is turned face up.

**Description (tagDef):** "Triggers when a face-down permanent is turned face up. Covers both Disguise-printed cards flipping themselves (self-trigger frame) AND payoffs that care about ANY face-down creature being turned face up (Case of the Pilfered Proof). Also matches the rare 'as this creature is turned face up' replacement-effect frame (Bubble Smuggler)."

**Pairings:** `['effect.has_disguise', 'effect.cloak']`. Bidirectional graph builder produces single edges; declaring on both sides is the convention from suspect / collect-evidence families.

**Regex (two alternations):**

```
/\b(?:when|as) this (?:creature|land|permanent|artifact|enchantment|saga|case) is turned face up\b/
/\b(?:when|whenever) (?:a|each|any|another) [\w\s]+? is turned face up\b/
```

The first frame covers self-triggers (most common — Aurelia's Vindicator, Alley Assailant, Basilica Stalker, Branch of Vitu-Ghazi, Bubble Smuggler, Case of the Burning Masks). The second frame is the broader "whenever any X is turned face up" pattern (Case of the Pilfered Proof's "whenever a Detective you control enters or is turned face up").

The `[\w\s]+?` non-greedy filler is bounded by the `is turned face up` anchor — no catastrophic backtracking risk.

**Expected match count:** ~35 (33 self-trigger Disguise cards + Bubble Smuggler replacement + ~2 "whenever any" payoffs).

## Per-card expected matches

Verified against actual normalized oracle text. Sample:

| Card | has_disguise | cloak | turned_face_up |
|---|:-:|:-:|:-:|
| Alley Assailant | ✓ | | ✓ |
| Aurelia's Vindicator | ✓ | | ✓ |
| Basilica Stalker | ✓ | | |
| Bolrac-Clan Basher | ✓ | | |
| Branch of Vitu-Ghazi | ✓ | | ✓ |
| Bubble Smuggler | ✓ | | ✓ |
| Cryptic Coat | | ✓ | |
| Hide in Plain Sight | | ✓ | |
| Bashful Beastie | | ✓ | |
| Conductive Machete | | ✓ | |
| Case of the Pilfered Proof | | | ✓ (whenever-any frame) |

Basilica Stalker has Disguise but no own face-up trigger (its only trigger is combat-damage). That's correct — Disguise alone doesn't imply the card has a face-up trigger.

## Testing

Per `CLAUDE.md` TDD convention, each rule file has a colocated `.test.ts` with ≥3 positives + ≥3 negatives via `it.each([...])`.

### Positives (drawn from real normalized text):

**`effect.has_disguise`:**
- `card({ keywords: ['Disguise'] })` — Scryfall guard path
- `"disguise {4}{b}"` (Alley Assailant)
- `"disguise {x}{3}{w}"` (Aurelia's Vindicator)
- `"disguise {3}"` (Branch of Vitu-Ghazi — costless-land form)

**`effect.cloak`:**
- `"cloak the top card of your library"` (Cryptic Coat)
- `"manifest dread"` (Bashful Beastie — bare keyword)
- `"cloak that card"` (anaphoric, after "look at the top three cards of your library")
- `"cloak target creature an opponent controls"` (Etrata, Deadly Fugitive)

**`trigger.turned_face_up`:**
- `"when this creature is turned face up,"` (Aurelia's Vindicator)
- `"when this land is turned face up,"` (Branch of Vitu-Ghazi)
- `"as this creature is turned face up,"` (Bubble Smuggler — replacement form)
- `"whenever a Detective you control enters or is turned face up,"` (Case of the Pilfered Proof — whenever-any frame)

### Negatives:

**`effect.has_disguise`:**
- `card({ keywords: [] })` with text mentioning "disguise" in flavor — should NOT fire
- `"creature has disguise"` (granted-ability quote — already stripped pre-rule, regression guard)
- `"this creature has cloak"` (different keyword)

**`effect.cloak`:**
- `"cloaked creature"` (the resulting permanent, not the verb)
- `"cloak"` standalone without target/object — degenerate frame
- `"manifest"` alone (old-Khans Manifest, not Manifest Dread)

**`trigger.turned_face_up`:**
- `"when this creature enters,"` (ETB trigger, not face-up)
- `"this creature is turned face up"` (no trigger verb prefix — bare state statement)
- `"the cards that were turned face up this turn"` (a condition referencing prior face-up events, not a trigger)

### Combined regression test

Aurelia's Vindicator–shaped fixture: card with `keywords: ['Disguise']` AND text `"disguise {x}{3}{w} when this creature is turned face up, ..."` must produce exactly one `has_disguise` hit (via the keyword guard, NOT both guard + regex) and exactly one `turned_face_up` hit.

### `rule:coverage` near-miss declarations

Required for v0.7+ rules.

- `effect.has_disguise`: `{ anchors: ['disguise'], proximity: ['{'], window: 4 }`
- `effect.cloak`: `{ anchors: ['cloak', 'manifest dread'], proximity: ['top card', 'target', 'that card'], window: 6 }`
- `trigger.turned_face_up`: `{ anchors: ['turned face up'], proximity: ['when', 'as', 'whenever', 'this creature', 'this land'], window: 4 }`

### Catalog consistency test

`pipeline/catalog.test.ts > "tag catalog > effects only pair with triggers and vice versa"` validates that the declared pairings satisfy the axis-cross constraint. All proposed pairings (effect ↔ trigger) satisfy it.

## tagFamilies.ts registration

Three entries under `set-mechanics`:

```typescript
'effect.has_disguise': 'set-mechanics',
'effect.cloak': 'set-mechanics',
'trigger.turned_face_up': 'set-mechanics',
```

The `pipeline/tagFamilies-consistency.test.ts` test enforces every catalog tag has a family entry.

## RULE_VERSION

Bump `shared/version.ts` `RULE_VERSION` from `v0.14.3` to `v0.14.4`. New tag definitions force IndexedDB cache invalidation on the client per existing convention.

## Known limitations

**Older Morph cards are out of scope.** Morph is the Khans-of-Tarkir-era predecessor to Disguise (Disguise = Morph with ward {2}). The only Morph reprints in Standard would arrive via FDN or future reprint sets. If/when this becomes a problem, `effect.has_morph` is the natural follow-up — same shape as `effect.has_disguise` but matching `morph {cost}`. Deferred.

**Manifest (old Manifest) is also out of scope.** Original Manifest from KTK creates face-down 2/2s without disguise cost — it's morph-flavored, not Disguise-flavored. No current Standard cards print it. Deferred.

**Face-down state condition.** There's no `condition.cares_face_down` for cards that scale on face-down creature count. Audit data shows ~13 cards mention "face-down" but most are reminder-text mentions or single-card mechanics. Defer until a concrete payoff family surfaces.

**"Turn it face up" effect tag.** Some cards (Goblin Maskmaker, Lumbering Laundry) can turn face-down creatures face up via an activated ability. This is a separate `effect.turn_face_up` axis that we're NOT authoring in this batch. The `trigger.turned_face_up` carer side captures the payoff; the activator-side producer is rare enough to defer until a 3rd card surfaces.

## Future work (out of scope for this spec)

- **`effect.turn_face_up`** — activator side of the face-up axis (Goblin Maskmaker, Lumbering Laundry). Author when a 3rd card appears.
- **Older Morph reprint coverage** — `effect.has_morph`. Author when a reprint set lands.
- **`condition.cares_face_down`** — payoff scaling on face-down creature count. Defer until ≥5 cards surface.
- **Detective tribe addition** — Case of the Pilfered Proof's "Detective you control" trigger surfaced this as a parallel gap. Tracked separately in CARD_ISSUES.md under Burden of Proof.
