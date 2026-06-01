// pipeline/rules/effect.has_blight.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_blight',
  axis: 'effect',
  label: 'Has blight',
  description: 'Has the blight keyword as a printed intrinsic ability.',
  category: 'theme',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_blight',
  axis: 'effect',
  matchCard: (card) => card.keywords.includes('Blight') ? { evidence: 'Blight' } : false,
};
