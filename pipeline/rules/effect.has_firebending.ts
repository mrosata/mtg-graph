// pipeline/rules/effect.has_firebending.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_firebending',
  axis: 'effect',
  label: 'Has firebending',
  description: 'Has the Firebending keyword — one of four Avatar bending mechanics.',
  pairsWith: ['condition.cares_bending'],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_firebending',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Firebending') ? { evidence: 'Firebending' } : false),
};
