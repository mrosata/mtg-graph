// pipeline/rules/effect.has_earthbend.ts
//
// Earthbend keyword (Avatar: The Last Airbender) — one of four bending
// mechanics. Each bending action is an activated ability with a cost; the
// payoff card (Avatar Aang) triggers off any bending. Pairs with
// `condition.cares_bending`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_earthbend',
  axis: 'effect',
  label: 'Has earthbend',
  description: 'Has the Earthbend keyword — one of four Avatar bending mechanics.',
  pairsWith: ['condition.cares_bending'],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_earthbend',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Earthbend') ? { evidence: 'Earthbend' } : false),
};
