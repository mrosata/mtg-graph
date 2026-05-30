// pipeline/rules/effect.has_plot.ts
//
// Plot keyword — exile the card from hand, cast it later as a sorcery without
// paying the mana cost. Read from Scryfall's `keywords` array. Marked
// `category: 'theme'` because there is currently no "Plot matters" payoff in
// Standard — wire up `pairsWith` when one appears.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_plot',
  axis: 'effect',
  label: 'Has plot',
  description: 'Has the Plot keyword — may be exiled from hand for an alternate cost and cast as a sorcery on a later turn.',
  pairsWith: [],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_plot',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Plot') ? { evidence: 'Plot' } : false),
};
