# Help Menu Cheatsheet Design

**Status:** Draft
**Date:** 2026-05-28
**Owner:** Michael Rosata

## Goal

Add a "Cheatsheet" option to the existing "?" help menu in the nav. Clicking it opens a modal that teaches a new user the vocabulary of the app in one screen: what the 12 tag families are, how to read a card's tags, and what an "interaction" is. The cheatsheet uses real cards as worked examples so the user can immediately connect what they read to what they see elsewhere.

## Non-goals

- First-visit auto-open. The cheatsheet is on-demand only; the existing tour system covers the "first-time visitor" experience.
- Keyboard shortcut to open the cheatsheet. Just the menu entry.
- Deep-link route (`/cheatsheet`). Not addressable outside the menu.
- Persistent "seen" state. The cheatsheet has no notion of being dismissed permanently.
- Internationalization. English only.
- Content for filter/search/deck-building. The user asked specifically for themes/interactions; other areas are out of scope.
- Mobile-specific layout. The modal is responsive enough to be usable on narrow widths, but no special small-screen UX is designed.

## User stories

- As a new visitor browsing cards, I see colored chips labeled "Destruction" or "Spellslinger" and don't know what those mean. I click "?" → "Cheatsheet" and see all 12 families with one-line definitions.
- As a user looking at a card detail and seeing tags like `effect.deals_damage` and `trigger.damage_dealt`, I want to know what the `effect.` / `trigger.` / `condition.` prefixes signify. The cheatsheet's "Reading a card" section explains them using a real card's actual tags.
- As a user who knows the app surfaces "interactions" between cards but isn't sure how the matching works, I see a worked pair (effect card → consumer card) in the cheatsheet. I click either card and the cheatsheet closes, the card detail drawer opens, and I can keep exploring real edges.

## Approach

A new modal component, opened from a new entry in the existing `HelpMenu` popover. The modal renders three scrollable sections: (1) the 12 tag families from `tagFamilies.ts`, (2) one curated example card with its real tags annotated, (3) one curated effect-and-consumer pair with both cards clickable.

Example cards are referenced by `oracleId` and looked up at render time via the graph store — the same path other components use. If a curated card is missing from the current artifact, that one block renders a small "example unavailable" placeholder and the rest of the cheatsheet still works.

The modal follows the existing `ConfirmModal` dismissal pattern (Esc, click outside, explicit close button). Card clicks in section 3 close the modal and set `?card=<oracleId>` via `useSearchParams`, which is the same URL-driven mechanism the rest of the app uses to open the card detail drawer.

## Architecture

```
app/src/components/
  CheatsheetModal.tsx        # New. The modal + its three sections.
  CheatsheetModal.test.tsx   # New. Component tests.

app/src/wizard/
  HelpMenu.tsx               # Modified. Adds "Cheatsheet" menu item + local open state.
  HelpMenu.test.tsx          # Modified. Adds one test for menu → modal open.
```

No new store, no new route, no changes to `wizardStore.ts`. The cheatsheet is not a tour and doesn't share state with the tour system.

## Component shape

```tsx
// CheatsheetModal.tsx
type Props = {
  onClose: () => void;
};

export default function CheatsheetModal({ onClose }: Props) {
  // Esc closes
  // Click on backdrop closes
  // Internal layout: sticky header, three sections, internal scroll
}
```

Outer container matches `ConfirmModal`:
- Backdrop: `fixed inset-0 z-50 flex items-center justify-center bg-black/60`
- Inner panel: `max-w-3xl w-full max-h-[80vh] overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-2xl flex flex-col`
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="cheatsheet-title"`

Inner panel structure:
- Sticky header: title "Cheatsheet" + `aria-label="Close cheatsheet"` close button (×).
- Scrollable body: three `<section>` elements separated by `<hr>`.
- No footer.

## The three sections

### Section A: Tag families

A responsive grid (1 column at narrow widths, 2 columns at the typical desktop modal width). Each cell:

- A solid color swatch (`w-3 h-3` square, `background: family.color`).
- `family.label` in bold.
- `family.description` underneath in `text-neutral-400`.

Data source: `FAMILIES` exported from `app/src/lib/tagFamilies.ts`. Render the array in its existing order — that order is editorial and not alphabetic.

No interactivity in this section.

### Section B: Reading a card

A short paragraph: "Every card carries one or more tags. The prefix tells you what kind of thing the tag represents."

Then one curated example card rendered using `CardListRow` (with `onClickName={undefined}` so the row is non-interactive in this context — we use the card visually, not as a launch point). Below the row: three bullets, each formatted like:

- **`effect.<x>`** — *this card's actual `effect.*` tag* — "Things this card does."
- **`trigger.<y>`** — *this card's actual `trigger.*` tag* — "Things that fire when something happens." (If the example card has no `trigger.` tag, omit this bullet and use a different example card.)
- **`condition.<z>`** — *this card's actual `condition.*` tag* — "What this card cares about."

The example card needs all three prefixes present in its tag set so each bullet has a concrete instance. The "Curated examples" section below describes how the specific `oracleId` is chosen at implementation time.

### Section C: What's an interaction?

A short paragraph: "Cards interact when one card's effect matches what another card cares about. The graph builder links every such pair into an edge."

Then two cards side-by-side (stacked on narrow widths):
- Left: effect card.
- Center: a labeled arrow showing the matched tag pair (`effect.deals_damage → trigger.damage_dealt`).
- Right: consumer card.

Both cards are clickable. Clicking sets `?card=<oracleId>` in the URL via `useSearchParams` and then calls `onClose()` to dismiss the modal — order matters so the drawer opens against a clean page.

Below the pair, one short sentence: "Browse any card's detail panel and you'll see all of its interactions listed under Interactions."

## Curated examples

A `CHEATSHEET_EXAMPLES` constant at the top of `CheatsheetModal.tsx`:

```ts
const CHEATSHEET_EXAMPLES = {
  // Section B: card with effect., trigger., and condition. tags all present.
  readingCard: '<oracleId>',
  // Section C: pair where left.effect matches right.trigger/condition.
  interactionPair: {
    effect: '<oracleId>',     // e.g. Lightning Bolt (effect.deals_damage)
    consumer: '<oracleId>',   // e.g. Electrostatic Field (trigger.damage_dealt or similar)
    pairing: {
      effectTag: 'effect.deals_damage',
      consumerTag: 'trigger.damage_dealt',
    },
  },
} as const;
```

Final oracle IDs are picked during implementation by querying the current artifact for cards that have the required tag shape. Constraints:

- `readingCard`: must be a Standard-legal card present in the v0.14.x artifact with at least one each of `effect.`, `trigger.`, and `condition.` prefixed tags. Recognizable name preferred.
- `interactionPair`: both cards in the current Standard artifact; `effect.effectTag` is on the effect card's tag list; `consumer.consumerTag` is on the consumer's; the pair appears as an edge in the graph.

## Data lookup and fallback

In `CheatsheetModal`, read the graph store with the existing hook (whatever `CardDetailDrawer` / `CardListRow` callers use — confirm during implementation). For each curated `oracleId`, call the same lookup the rest of the app uses (e.g. `graph.getCard(oracleId)` or store selector).

If a curated card is missing:
- **Section B miss:** render `<p className="italic text-neutral-500">Example card unavailable in this set.</p>` in place of the card row and bullets.
- **Section C miss (either card):** same placeholder in place of the pair. Section heading and intro paragraph still render.

Section A is data-driven from `FAMILIES` (a static const) and cannot fail to render.

## HelpMenu changes

`HelpMenu.tsx` adds:

- Local state: `const [cheatsheetOpen, setCheatsheetOpen] = useState(false);`
- A new menu item at the top of the popover labeled "Cheatsheet". Clicking sets `cheatsheetOpen=true` and closes the popover (`setOpen(false)`).
- A 1px divider (`<hr className="border-neutral-800" />`) between the cheatsheet item and the tour items.
- Conditional render of `<CheatsheetModal onClose={() => setCheatsheetOpen(false)} />` at the end of the component when `cheatsheetOpen` is true.

Menu ordering after the change:
1. Cheatsheet
2. ─── divider ───
3. Show *global* tour
4. Show *page* tour (if applicable)

## Tests

### `CheatsheetModal.test.tsx`

Setup: a minimal mock graph store seeded with the curated example cards (plus any tags the assertions need to find).

1. **Renders all 12 family labels.** Mount the modal, assert each `FAMILIES[i].label` appears in the document.
2. **Renders the three section headings and the reading-card example.** Mount the modal, assert the three section heading strings appear and the example card's name appears.
3. **Clicking the effect card in section 3 selects the card and closes the modal.** Mount the modal with an `onClose` spy. Click the effect card. Assert the spy was called and `?card=<effectOracleId>` is in the URL.
4. **Esc closes the modal.** Mount, fire `keydown` with `Escape`, assert `onClose` spy called.
5. **Missing example renders the placeholder.** Mount with a graph store that *doesn't* contain `CHEATSHEET_EXAMPLES.readingCard`. Assert "Example card unavailable in this set." is rendered.

### `HelpMenu.test.tsx`

Add one test:
6. **Clicking "Cheatsheet" in the menu opens the modal.** Open the help popover, click "Cheatsheet", assert the modal (`role="dialog"`, name "Cheatsheet") is in the document.

Existing tour-related tests stay green.

## Accessibility

- Modal has `role="dialog"` and `aria-modal="true"`.
- `aria-labelledby` points at the `<h2 id="cheatsheet-title">Cheatsheet</h2>`.
- Close button has `aria-label="Close cheatsheet"`.
- Esc closes (matches `ConfirmModal`).
- Focus is *not* trapped (matches existing modals in the codebase — the app's modals don't currently implement focus traps, and adding one just for the cheatsheet would be inconsistent).
- Section headings use `<h3>` so they appear in the dialog's accessible outline.

## Out of scope (explicit)

- Search within the cheatsheet.
- Embedded videos or animations.
- Per-family expanded views ("show all 23 destruction tags") — the family chips elsewhere already act as that drill-down.
- Tracking which sections the user scrolled through.
- A "next tip" carousel of multiple examples per section.

## Open questions

- The exact `oracleId`s for `CHEATSHEET_EXAMPLES` will be chosen during implementation by querying the current v0.14.x artifact for cards matching the tag-shape constraints described above. If no card satisfies the section-B constraint (`effect.` + `trigger.` + `condition.` all present), fall back to two example cards: one for `effect.` + `trigger.` and a second short paragraph for `condition.`.
- Whether to dim the cheatsheet's background animation on open. Existing modals don't animate; cheatsheet follows suit unless implementation surfaces a reason to change.
