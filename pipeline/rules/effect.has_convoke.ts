// pipeline/rules/effect.has_convoke.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_convoke',
  axis: 'effect',
  label: 'Has convoke',
  description: 'Has the convoke keyword as a printed intrinsic ability (your creatures can be tapped to help cast this spell).',
  category: 'theme',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_convoke',
  axis: 'effect',
  matchCard: (card) => card.keywords.includes('Convoke') ? { evidence: 'Convoke' } : false,
};
