// pipeline/rules/effect.has_cycling.ts
//
// Cycling keyword — "{cost}, Discard this card: Draw a card." Includes
// landcycling and typecycling variants (those cards always have Cycling in
// their keyword list too — verified against the Standard pool). Theme-only
// today: no "whenever you cycle" payoff in current Standard, but the slot
// reads as "cycling matters" archetype filter for graveyard/discard decks.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_cycling',
  axis: 'effect',
  label: 'Has cycling',
  description: 'Has the Cycling keyword (including landcycling and typecycling variants) — pay a cost and discard to draw a card.',
  pairsWith: [],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_cycling',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Cycling') ? { evidence: 'Cycling' } : false),
};
