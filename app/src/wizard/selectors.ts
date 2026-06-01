// data-tour-id values. Used by:
//   - components that render with `data-tour-id={TOUR_IDS.foo}`
//   - tour step definitions in tours.ts that target `[data-tour-id="foo"]`
//
// If you rename a key here without updating callers, the `error:target_not_found`
// path in WizardProvider will log a console warning and the affected step will
// be skipped.
export const TOUR_IDS = {
  // Global (in nav)
  navBrowse: 'nav-browse',
  navDecks: 'nav-decks',
  navActiveDeck: 'nav-active-deck',
  navHelp: 'nav-help',
  libraryStatusBadge: 'library-status-badge',

  // Browse page
  filterPanel: 'filter-panel',
  librarySection: 'library-section',
  tagFilterSection: 'tag-filter-section',
  cardGrid: 'card-grid',

  // Decks page
  deckList: 'deck-list',
  newDeckButton: 'new-deck-button',
  importButton: 'import-button',

  // Active deck page
  deckRail: 'deck-rail',
  manaCurve: 'mana-curve',
  deckActionBar: 'deck-action-bar',
  fillManaButton: 'fill-mana-button',
  goldfishButton: 'goldfish-button',
  deckGraphLink: 'deck-graph-link',

  // Deck graph page
  graphCanvas: 'graph-canvas',
  pillRow: 'pill-row',
  deckGraphBackLink: 'deck-graph-back-link',
  deckGraphNavBack: 'deck-graph-nav-back',
  deckGraphNavForward: 'deck-graph-nav-forward',
} as const;

export type TourId = 'global' | 'browse' | 'decks' | 'active-deck' | 'deck-graph';

export const ALL_TOUR_IDS: TourId[] = ['global', 'browse', 'decks', 'active-deck', 'deck-graph'];

// Route → tour mapping used by useAutoStartTour and HelpMenu.
export function tourForPathname(pathname: string): TourId | null {
  if (pathname === '/') return 'browse';
  if (pathname === '/decks') return 'decks';
  if (pathname === '/graph') return 'deck-graph';
  return null;
}

// Human-readable label for the per-page Help menu item.
export function tourLabel(id: TourId): string {
  switch (id) {
    case 'global': return 'app intro';
    case 'browse': return 'Browse tour';
    case 'decks': return 'Decks tour';
    case 'active-deck': return 'Active Deck tour';
    case 'deck-graph': return 'Deck Graph tour';
  }
}
