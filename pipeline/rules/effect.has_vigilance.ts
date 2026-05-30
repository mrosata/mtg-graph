// pipeline/rules/effect.has_vigilance.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array. Grant clauses
// ("target creature gains vigilance until end of turn", "other creatures you
// control have vigilance") are handled by `effect.grants_vigilance`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_vigilance',
  axis: 'effect',
  label: 'Has vigilance',
  description: 'Has the vigilance keyword as a printed intrinsic ability.',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_vigilance',
  axis: 'effect',
  matchCard: (card) => card.keywords.includes('Vigilance') ? { evidence: 'Vigilance' } : false,
};
