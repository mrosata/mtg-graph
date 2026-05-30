// pipeline/rules/effect.has_lifelink.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array. Grant clauses
// ("target creature gains lifelink", "other creatures you control have
// lifelink") are handled by `effect.grants_lifelink`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_lifelink',
  axis: 'effect',
  label: 'Has lifelink',
  description: 'Has the lifelink keyword as a printed intrinsic ability.',
  pairsWith: ['condition.cares_lifegain'],
};

export const rule: Rule = {
  id: 'effect.has_lifelink',
  axis: 'effect',
  matchCard: (card) => card.keywords.includes('Lifelink') ? { evidence: 'Lifelink' } : false,
};
