// pipeline/rules/effect.has_kicker.ts
//
// Kicker keyword — optional additional cost paid as you cast a spell to enhance
// its effect. Read from Scryfall's `keywords` array. Theme-category filter tag;
// no current "kicker matters" payoff in Standard.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_kicker',
  axis: 'effect',
  label: 'Has kicker',
  description: 'Has the Kicker keyword — an optional additional cost that enhances the spell when paid.',
  pairsWith: [],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_kicker',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Kicker') ? { evidence: 'Kicker' } : false),
};
