# Glossary

Canonical names for UI regions and recurring terms. Use these in code, docs, and discussion so we're not negotiating vocabulary mid-conversation.

## Pages (routes)

| Route | Name | Component |
|---|---|---|
| `/` | **Browser** | `BrowserPage.tsx` |
| `/decks` | **Decks** | `DecksPage.tsx` |
| `/decks/:id` | **Deck** | `DeckPage.tsx` |

## Browser regions

| Region | Name | Component |
|---|---|---|
| Top bar | **Nav bar** | — |
| Left sidebar | **Filter panel** | `FilterPanel.tsx` |
| Center | **Card grid** (umbrella: **Card area**) | `CardGrid.tsx` |
| Right flyout | **Card drawer** | `CardDetailDrawer.tsx` |
| Linked cards inside the drawer | **Interactions panel** | `InteractionsPanel.tsx` |

If a table view ever lands alongside the grid, call them "grid view" and "table view"; the umbrella stays **Card area**.

## Deck surfaces

| Region | Name | Component |
|---|---|---|
| Persistent deck-building UI on Browser | **Deck rail** | `DeckPanel.tsx` |
| Deck page main column | **Decklist** | — |
| Deck page stats (curve + counts) | **Deck stats** | `ManaCurve.tsx` + counts |

"Deck rail" distinguishes the always-on building surface from the Deck *page*. Don't call both "deck panel."

## Terminology

- **Tag** — user-facing label for what a rule produces. "Filter by tag," "tag chip."
- **Mechanic** — real MTG mechanic (flying, scry, etc.) in copy and docs.
- **Axis** — pipeline-only (`effect.*`, `trigger.*`, `condition.*`). Never user-facing.
- **Interaction** — user-facing name for a graph edge between cards. "Interactions panel."
- **Edge** — code/pipeline term (`InteractionEdge`). Not user-facing.
- **Synergy** — reserved. If a ranking feature lands later, "synergy score" reads better than "interaction score."
