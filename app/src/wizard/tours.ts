import type { Step } from 'react-joyride';
import { TOUR_IDS, type TourId } from './selectors';

const sel = (id: string): string => `[data-tour-id="${id}"]`;

const global: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Welcome to MTG Graph',
    content:
      'A tag-driven interaction graph over Standard. ~4,400 cards tagged across ~91 mechanics, ~340K interactions. Use it to discover cards that play together and build decks around them.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.navBrowse),
    title: 'Browse',
    content:
      'Filter the card pool by color, type, mana cost, set, and - most powerfully - by mechanic tags.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.navDecks),
    title: 'Decks',
    content: 'Your saved decks live here. Create, import, or delete decks.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.navHelp),
    title: 'Help',
    content: 'Click here anytime to replay this intro or the tour for the page you\'re on.',
    disableBeacon: true,
  },
];

const browse: Step[] = [
  {
    target: sel(TOUR_IDS.filterPanel),
    title: 'Filter panel',
    content: 'Narrow down ~4,400 cards. Each section (colors, type, tags) is AND-combined.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.tagFilterSection),
    title: 'Tag filters',
    content:
      'Tags are the killer feature. Pick `effect.removal_destroy` and you\'ll get every Standard card that destroys a permanent.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.cardGrid),
    title: 'Card grid',
    content:
      'Hover for a quick preview, click for full details. The detail drawer opens on the right and shows oracle text, every tag this card has, and a list of cards in Standard it interacts with - pulled from the graph.',
    disableBeacon: true,
  },
];

const decks: Step[] = [
  {
    target: sel(TOUR_IDS.deckList),
    title: 'Deck list',
    content: 'Your saved decks. Click one to make it active.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.newDeckButton),
    title: 'New deck',
    content: 'Start an empty deck, then build it from the Browse page.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.importButton),
    title: 'Import',
    content: 'Paste a Moxfield/Arena-format list to bring a deck in.',
    disableBeacon: true,
  },
];

const activeDeck: Step[] = [
  {
    target: sel(TOUR_IDS.deckRail),
    title: 'Deck rail',
    content: 'Cards currently in this deck, grouped by type.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.manaCurve),
    title: 'Mana curve & legality',
    content: 'Live mana curve + Standard legality flag at a glance.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.deckRail),
    title: 'Add cards',
    content:
      "Switch to Browse, click any card, then use the 'Add to deck' button on its detail drawer.",
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.deckActionBar),
    title: 'Test the deck',
    content:
      "Fill mana auto-populates basic lands based on your deck's colors. Goldfish opens a 7-card sample hand to see if the opener feels right.",
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.deckGraphLink),
    title: 'Visualize',
    content: 'Click here to see your deck as an interaction graph.',
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
