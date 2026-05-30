// pipeline/rules/effect.has_haste.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array. Grant clauses
// ("target creature gains haste") are handled by `effect.grants_haste`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_haste',
  axis: 'effect',
  label: 'Has haste',
  description: 'Has the haste keyword as a printed intrinsic ability.',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_haste',
  axis: 'effect',
  matchCard: (card) => card.keywords.includes('Haste') ? { evidence: 'Haste' } : false,
};
