// pipeline/rules/effect.has_waterbend.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_waterbend',
  axis: 'effect',
  label: 'Has waterbend',
  description: 'Has the Waterbend keyword — one of four Avatar bending mechanics.',
  pairsWith: ['condition.cares_bending'],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_waterbend',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Waterbend') ? { evidence: 'Waterbend' } : false),
};
