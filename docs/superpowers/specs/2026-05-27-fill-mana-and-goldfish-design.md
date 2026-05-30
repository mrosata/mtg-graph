# Fill-with-mana and Goldfish — design (2026-05-27)

Two playability tools for the active-deck view: a one-click basic-land filler that infers a 40- or 60-card target from the deck's spell count and distributes basics by color-pip ratio, and a goldfish modal that shows a 7-card random opening hand with draw/shuffle controls and a library counter. Both surface from a new action row on `DeckPage`. A single new step in the `active-deck` tour spotlights them.

## Goals

- Give users a credible "starting point" mana base in one click. The output should be playable, not optimal — a smart default a user can iterate on.
- Let users test the opening hand of a deck they just built, without leaving the app.
- Surface both tools in a discoverable spot (action bar) and introduce them via the existing wizard tour.
- Keep both features fully decoupled from each other and from the rest of the app — pure logic modules + small UI components.

## Non-goals

- Mana rocks, mana dorks, or land-tutoring effects counting toward the land target. Lands count; spells don't.
- Mulligan rules, turn-by-turn play simulation, scry/look-at-top, graveyard tracking — Goldfish is a hand viewer, not a play sim.
- Sideboards, snow basics, taplands, or other special basic-land variants. The tool manages standard Plains/Island/Swamp/Mountain/Forest only; users keep manual control of taplands and duals.
- Persisting goldfish state across modal close/reopen.
- Colorless mana fixing (Wastes is supported only if present in the loaded set, with no special weighting).

## Architecture

Two features, each isolated into one pure-logic module + one or two small UI components. Follows the existing pattern (`deckColors.ts`, `deckStats.ts`, `legality.ts`).

**New files:**
- `app/src/lib/fillMana.ts` — pure: `computeLandFill(deck, cards, opts): FillPlan`. No React, no store, no side effects.
- `app/src/lib/fillMana.test.ts` — unit tests, TDD.
- `app/src/lib/goldfish.ts` — pure: `buildShuffled(deck, rng): string[]`. Seeded RNG accepted as a parameter for deterministic tests.
- `app/src/lib/goldfish.test.ts` — unit tests.
- `app/src/components/FillManaButton.tsx` — button + popover for target-format override + preview.
- `app/src/components/GoldfishButton.tsx` — button that opens the modal.
- `app/src/components/GoldfishModal.tsx` — the modal itself.
- `app/src/components/icons/FishIcon.tsx` — single inline SVG.
- `app/src/components/FillManaButton.test.tsx`, `GoldfishModal.test.tsx` — component tests with RTL.

**Modified files:**
- `app/src/pages/DeckPage.tsx` — add the two buttons to the existing action bar (currently just `List | Graph` at line 31).
- `app/src/stores/deckStore.ts` — add one new action: `applyLandFill(plan): Promise<void>`. Transactionally applies the add/remove plan to `workingCards`. Persists via the existing `persist(deck)` path.
- `app/src/wizard/selectors.ts` — three new `TOUR_IDS`: `deckActionBar`, `fillManaButton`, `goldfishButton`.
- `app/src/wizard/tours.ts` — one new step in the `active-deck` tour, between current step 3 ("Add cards") and step 4 ("Visualize").

**Unchanged:** `DeckPanel.tsx`, `legality.ts`, `deckStats.ts` (the algorithm consumes `colorPipDistribution` but doesn't modify it), the pipeline, the artifact schema.

## Fill-with-mana

### Algorithm

`computeLandFill(deck, cards, opts?)` returns:

```ts
type FillPlan = {
  add: { oracleId: string; count: number }[];      // basics to add
  remove: { oracleId: string; count: number }[];   // basics to remove (current → new diff)
  inferredTarget: 40 | 60;                          // for the popover's auto-detect
  basicsByColor: Partial<Record<Color, number>>;   // computed final counts, for preview UI
  reason?: 'empty' | 'no_colored_spells';           // for friendly error states
};

type FillOpts = {
  targetOverride?: 40 | 60;  // user can flip from the popover
};
```

Pseudocode:

```
1. spellCount = sum of working entries where !card.types.includes('Land')

2. inferredTarget = opts.targetOverride ?? (spellCount <= 23 ? 40 : 60)
   baseLandCount = inferredTarget === 40 ? 17 : 24

3. Curve adjustment:
   avgCmc = mean cmc of non-land cards (weighted by count)
   if avgCmc > 3.5: baseLandCount += 1
   if avgCmc < 2.5: baseLandCount -= 1

4. pips = colorPipDistribution(deck, cards)  // already exists, weighted floats
   totalPips = sum of pips

5. If totalPips === 0: return { add: [], remove: [], reason: 'no_colored_spells', ... }

6. Splash threshold: for each color where pips[c] / totalPips < 0.15, set pips[c] = 0.
   Recompute totalPips after the drop.

7. Existing land contribution:
   nonBasicLandCount = 0
   For each working entry where card.types.includes('Land') AND !card.supertypes.includes('Basic'):
     nonBasicLandCount += entry.count
     For each c in card.colorIdentity:
       existingLandContrib[c] += entry.count

   basicsNeeded = max(0, baseLandCount - nonBasicLandCount)
   (Basic lands are owned by the algorithm — they get rewritten — so we only protect non-basic land slots.)

8. Desired pip share, minus what existing non-basics already provide:
   for c in active colors:
     desiredPips[c] = (pips[c] / totalPips) * baseLandCount - existingLandContrib[c]
     desiredPips[c] = max(0, desiredPips[c])

9. Largest-remainder rounding distributes basicsNeeded across active colors using desiredPips
   as the proportions. Result: basicsByColor[c] = integer count.

10. Resolve basic-land oracleIds:
    For each color, look up the first card in `cards` Map where:
      card.supertypes.includes('Basic') AND card.subtypes.includes(SUBTYPE_FOR_COLOR[c])
    Cache the lookup as a module-level Map<Color, string> on first call.

11. Diff against current basics:
    currentBasicsByColor[c] = count of basic lands of subtype matching c in workingCards
    add[c] = max(0, basicsByColor[c] - currentBasicsByColor[c])
    remove[c] = max(0, currentBasicsByColor[c] - basicsByColor[c])

    Return as { add: [{oracleId, count}], remove: [{oracleId, count}] } lists.
```

`SUBTYPE_FOR_COLOR = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' }`.

**Idempotency:** rerunning `computeLandFill` on the result of applying its own plan produces an empty `add`/`remove`, because step 11 diffs against current basics.

**Empty / colorless edge cases:**
- Empty deck → `reason: 'empty'`, empty plan.
- Has lands but no colored spells → `reason: 'no_colored_spells'`, empty plan. (Colorless decks need Wastes, which we don't reliably have a Standard reprint of — punt explicitly.)
- DFCs/MDFCs whose back face is a land but front face is a spell → counted as the front (spell). Consistent with the rest of the app.

### UI: button + popover

Sits in the DeckPage action bar at line 31, to the left of the existing `List | Graph` toggle. Visual treatment matches the existing inline-flex rounded-border toggle: small, secondary, amber accents.

```
                           [Fill mana ▾]  [(fish) Goldfish]   List | Graph

(The "(fish)" placeholder represents the inline SVG icon — see "Fish icon" subsection below.)
```

The `▾` chevron signals the popover. Clicking opens an anchored popover (~240px wide, positioned off the button's right edge using absolute positioning — no portal):

```
┌──────────────────────────────────┐
│  Detected: 22 spells             │
│                                  │
│  ●  Limited (40)  — 17 lands     │
│  ○  Standard (60) — 24 lands     │
│                                  │
│  Adding: 11 Plains, 6 Forest     │
│  Replacing: 0 existing basics    │
│                                  │
│       [Cancel]    [Fill]         │
└──────────────────────────────────┘
```

Behavior:
- Default radio selection follows the algorithm's `inferredTarget`.
- Toggling the radio recomputes the plan with `targetOverride` and updates the preview text below.
- "Adding" lists each color where `add[c] > 0`. "Replacing" sums `remove[c]`.
- If `reason === 'no_colored_spells'`, the body shows "Add some colored spells first" with the Fill button disabled.
- Cancel closes the popover. Click-outside also closes (capture-phase listener on document).
- Fill closes the popover and calls `useDeckStore.applyLandFill(plan)`.

### Store integration

```ts
applyLandFill: async (plan: FillPlan) => {
  const id = get().activeDeckId;
  if (!id) throw new Error('No active deck');
  const decks = get().decks.map((d) => {
    if (d.id !== id) return d;
    // Remove first, then add — using maps for fewer passes.
    let working = d.workingCards.slice();
    for (const r of plan.remove) {
      working = working
        .map((c) => (c.oracleId === r.oracleId ? { ...c, count: c.count - r.count } : c))
        .filter((c) => c.count > 0);
    }
    for (const a of plan.add) {
      const existing = working.find((c) => c.oracleId === a.oracleId);
      if (existing) {
        working = working.map((c) =>
          c.oracleId === a.oracleId ? { ...c, count: c.count + a.count } : c,
        );
      } else {
        working = [...working, { oracleId: a.oracleId, count: a.count }];
      }
    }
    return { ...d, workingCards: working };
  });
  const updated = decks.find((d) => d.id === id);
  if (updated) await persist(updated);
  set({ decks });
}
```

Result: added basics appear in the Lands section of `DeckPanel` with the existing green-left-border treatment (because they're in `workingCards` but not `originalCards` — the diff logic handles this for free). Save commits, Discard reverts. No new diff machinery needed.

## Goldfish

### Logic

`buildShuffled(deck, rng): string[]`:
```
For each entry in deck.workingCards: push entry.oracleId × entry.count times.
Fisher-Yates shuffle in place using rng (a () => number in [0, 1)).
Return the shuffled array.
```

The component supplies its own RNG; tests inject a seeded one.

### State model

Modal-local React state:

```ts
const [shuffled, setShuffled] = useState<string[]>(() => buildShuffled(deck, Math.random));
const [drawn, setDrawn] = useState<string[]>(() => shuffled.slice(0, 7));
const [drawIndex, setDrawIndex] = useState<number>(7);

function onDraw() {
  if (drawIndex >= shuffled.length) return;
  setDrawn([...drawn, shuffled[drawIndex]]);
  setDrawIndex(drawIndex + 1);
}

function onShuffle() {
  const next = buildShuffled(deck, Math.random);
  setShuffled(next);
  setDrawn(next.slice(0, 7));
  setDrawIndex(7);
}
```

Library counter: `shuffled.length - drawIndex` / `shuffled.length`.

### UI: modal

Centered fixed-position modal, ~720×260px. Dark backdrop (matches the existing `ConfirmModal` style). Dismiss on ESC and on backdrop click.

```
┌──────────────────────────────────────────────────────────────────┐
│   Goldfish — "UW Control"                       Library: 53/60  ×│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                │
│  │card│ │card│ │card│ │card│ │card│ │card│ │card│  →            │
│  │ 1  │ │ 2  │ │ 3  │ │ 4  │ │ 5  │ │ 6  │ │ 7  │                │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                       [↻ Shuffle]  [+ Draw]      │
└──────────────────────────────────────────────────────────────────┘
```

Layout details:
- Title shows the deck name. Library counter is right-aligned in the header.
- Card row: `display: flex; flex-wrap: nowrap; overflow-x: auto; gap: 8px;`. Each card image is ~88×123 (Magic's 5:7 ratio approximated).
- On `Draw`, the row auto-scrolls right (`scrollLeft = scrollWidth`) so the latest card is visible.
- Action bar at the bottom: `Shuffle` (secondary) and `Draw` (primary amber).
- Draw is disabled when `drawIndex >= shuffled.length`. Shuffle is always enabled (when deck has cards).
- Hover on a card shows the existing `HoverCardPreview` at cursor for a larger view.
- Click on a card does nothing in v1 (no detail-drawer wiring — would require modal stacking, deferred).

Empty / small decks:
- Deck has 0 cards → modal renders with body "This deck is empty." Draw and Shuffle disabled.
- Deck has 1–6 cards → shows all of them, drawIndex starts at `shuffled.length`, Draw disabled.

### Fish icon

`FishIcon.tsx` — single inline SVG, ~14×14 viewBox. Stylized: oval body with a triangular tail wedge and a small eye dot. Stroked in `currentColor` so it picks up button text color. Used inside the `GoldfishButton` next to "Goldfish" text.

## Wizard tour

**New `TOUR_IDS` entries** in `selectors.ts`:
- `deckActionBar` — the container wrapping the two new buttons + the existing List/Graph toggle.
- `fillManaButton` — on the Fill button (available for future targeting).
- `goldfishButton` — on the Goldfish button (available for future targeting).

**New step** inserted into the `active-deck` tour, between current step 3 ("Add cards") and step 4 ("Visualize"):

```ts
{
  target: sel(TOUR_IDS.deckActionBar),
  title: 'Test the deck',
  content:
    "Fill mana auto-populates basic lands based on your deck's colors. " +
    "Goldfish opens a 7-card sample hand to see if the opener feels right.",
  disableBeacon: true,
}
```

Total `active-deck` tour grows from 4 steps to 5.

## Testing

**Unit (vitest) — `fillMana.test.ts`:**
1. Empty deck → empty plan, `reason: 'empty'`.
2. 22 mono-R spells, avg CMC 3 → 17 Mountains (limited inferred).
3. 36 mono-R spells, avg CMC 3 → 24 Mountains (standard inferred).
4. 22 spells, 50/50 W/G pips → 9 Plains + 8 Forest (largest-remainder rounding).
5. 30 spells, W:U:B pips = 80:15:5 → splash threshold drops black; only W and U basics added.
6. Deck with 4 W/G dual lands already → fewer Plains/Forest added, distribution shifts.
7. Avg CMC 4.0 → +1 land. Avg CMC 2.0 → -1 land.
8. Idempotency — running `computeLandFill` on the result of step 4 yields empty add/remove.

**Unit (vitest) — `goldfish.test.ts`:**
1. `buildShuffled` produces every oracleId at the correct multiplicity.
2. Seeded RNG → deterministic output (snapshot of order).
3. Drawing past `shuffled.length` is a no-op.
4. Shuffle resets drawIndex.

**Component (RTL) — `FillManaButton.test.tsx`:**
1. Popover opens on click, shows detected target.
2. Toggling the radio updates the preview text.
3. Cancel closes without calling `applyLandFill`.
4. Fill calls `applyLandFill` with the right plan and closes the popover.
5. Empty deck → button still renders; popover shows the "add colored spells" message; Fill disabled.

**Component (RTL) — `GoldfishModal.test.tsx`:**
1. Renders 7 card images on open.
2. Draw appends one card; library count decrements.
3. Draw disabled when library empty.
4. Shuffle resets the displayed cards.
5. ESC closes the modal.
6. Deck with 5 cards renders 5 cards; Draw disabled.

**E2E (Playwright):** the existing smoke run gets one assertion — both buttons are present and clickable on the deck page. No full goldfish/fill E2E (component tests cover the behavior).

**Type checking:** all new code respects `noUncheckedIndexedAccess`. Array index access through explicit checks; basic-land oracleId lookup cache returns `string | undefined` and the algorithm skips colors with missing oracleIds (defensive against synthetic fixture data).

## Edge cases summary

| Case | Behavior |
|---|---|
| Empty deck | Both buttons render; Fill popover shows "Add some colored spells first"; Goldfish modal shows "This deck is empty" |
| Colorless / artifact-only deck | Fill returns `reason: 'no_colored_spells'`, no lands added |
| User has 4 dual lands already | Existing duals contribute to color distribution; fewer basics added per color |
| User has 30 Plains as a gag | Fill replaces them with the computed set; popover preview shows "Replacing: N existing basics" |
| User added Snow Plains manually | Treated as basic (subtypes.includes('Plains')) and counts toward Plains target. May get partially removed if target drops. Documented limitation. |
| Deck > 60 spells | Standard target (60) detected; if `baseLandCount - nonBasicLands <= 0`, just removes excess basics |
| Splash color < 15% of pips | Dropped — those basics not added. Other colors absorb the proportions. |
| Avg CMC > 3.5 | +1 land. Avg CMC < 2.5 → -1 land. |
| Click Fill twice in a row | Idempotent — second call's plan is empty. |
| Goldfish on deck with < 7 cards | Shows all available cards; Draw disabled. |

## Open / deferred

- Mana rocks counting toward the target (e.g. 4 Llanowar Elves substituting for 2 lands) — deferred until users ask.
- Wastes / colorless mana fixing for true-colorless decks.
- Goldfish turn tracking, mulligan flow, scry, play-from-hand.
- Sideboard-aware goldfish.
- Custom-ratio basic land splits (e.g. user wants 12 Plains forced, distribute the rest).
- Persisting goldfish RNG seed across reopens.

## Acceptance criteria

1. From a saved deck with colored non-land spells, clicking "Fill mana" → "Fill" results in a working deck whose total card count equals (basicsNeeded + existing non-basic lands + spells), with basics distributed across the deck's active colors.
2. The action bar shows both buttons on every `/deck` page load (provided the active deck resolves).
3. Goldfish modal opens, shows 7 random cards, increments library counter on Draw, resets on Shuffle.
4. Active-deck tour, when replayed, includes the new "Test the deck" step targeting the action bar.
5. All new unit and component tests pass; `npm test` from repo root succeeds.
