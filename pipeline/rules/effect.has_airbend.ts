// pipeline/rules/effect.has_airbend.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_airbend',
  axis: 'effect',
  label: 'Has airbend',
  description: 'Has the Airbend keyword — one of four Avatar bending mechanics.',
  pairsWith: ['condition.cares_bending'],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_airbend',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Airbend') ? { evidence: 'Airbend' } : false),
};
