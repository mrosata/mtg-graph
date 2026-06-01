// pipeline/rules/effect.has_changeling.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_changeling',
  axis: 'effect',
  label: 'Has changeling',
  description: 'Has the changeling keyword as a printed intrinsic ability (this card has every creature type at all times).',
  category: 'theme',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_changeling',
  axis: 'effect',
  matchCard: (card) => card.keywords.includes('Changeling') ? { evidence: 'Changeling' } : false,
};
