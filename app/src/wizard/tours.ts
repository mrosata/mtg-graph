import type { Step } from 'react-joyride';
import { TOUR_IDS, type TourId } from './selectors';

const sel = (id: string): string => `[data-tour-id="${id}"]`;

const global: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Welcome to MTG Graph',
    content:
      'A tag-driven interaction graph over Standard and Commander. Discover cards that play together, then build decks around them.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.navBrowse),
    title: 'Browse',
    content: 'Filter cards by color, type, cost, set and mechanics.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.navDecks),
    title: 'Decks',
    content: 'Save, import, and revisit your decks here.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.libraryStatusBadge),
    title: 'Your library',
    content:
      'Import your collection (Manabox CSV) to filter the pool down to cards you actually own. The badge shows your current library status.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.navHelp),
    title: 'Help',
    content: "Open this anytime to replay the intro or the tour for the page you're on.",
    disableBeacon: true,
  },
];

const browse: Step[] = [
  {
    target: sel(TOUR_IDS.filterPanel),
    title: 'Filter panel',
    content: 'Narrow the pool. Colors, type, cost, and tags are AND-combined.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.librarySection),
    title: 'Import your library',
    content:
      'Drop in a Manabox CSV to load your collection. Flip "Library only" and the grid will only show cards you own.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.tagFilterSection),
    title: 'Tag filters',
    content:
      "Tags are the killer feature. Pick `effect.removal_destroy` and you'll get every card in the pool that destroys a permanent.",
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.cardGrid),
    title: 'Card grid',
    content:
      "Hover for a preview, click for details. The drawer on the right shows the card's tags and the cards it interacts with — pulled from the graph.",
    disableBeacon: true,
  },
];

const decks: Step[] = [
  {
    target: sel(TOUR_IDS.deckList),
    title: 'Deck list',
    content: 'Your saved decks. Click one to make it active and start editing.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.newDeckButton),
    title: 'New deck',
    content: 'Start an empty deck — you can add cards from the workspace.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.importButton),
    title: 'Import a deck',
    content: 'Paste a Moxfield or Arena list to bring an existing deck in.',
    disableBeacon: true,
  },
];

const activeDeck: Step[] = [
  {
    target: sel(TOUR_IDS.deckRail),
    title: 'Deck rail',
    content: 'Cards in this deck, grouped by type. Sits next to the browser so you can build as you browse.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.manaCurve),
    title: 'Curve & legality',
    content: 'Live mana curve and Standard legality at a glance.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.cardGrid),
    title: 'Add cards',
    content: "Click any card in the grid, then hit 'Add to deck' in the detail drawer.",
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.deckActionBar),
    title: 'Test the deck',
    content:
      "Fill Mana auto-populates basic lands by color. Goldfish deals a sample hand so you can feel the opener.",
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.deckGraphLink),
    title: 'Visualize',
    content: 'Switch to the graph view to see your deck as a web of interactions.',
    disableBeacon: true,
  },
];

const deckGraph: Step[] = [
  {
    target: sel(TOUR_IDS.graphCanvas),
    title: 'Graph canvas',
    content: 'Nodes are cards, edges are interactions. Drag to pan, scroll to zoom.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.pillRow),
    title: 'Pill row',
    content: 'Toggle which interaction types appear. Filter to just removal, ramp, etc.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.graphCanvas),
    title: 'Selection drawer',
    content: 'Click any node to see why it\'s connected - the specific tags that pair.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.deckGraphBackLink),
    title: 'Back to deck',
    content: 'Return to the active deck view.',
    disableBeacon: true,
  },
];

export const TOURS: Record<TourId, Step[]> = {
  global,
  browse,
  decks,
  'active-deck': activeDeck,
  'deck-graph': deckGraph,
};
