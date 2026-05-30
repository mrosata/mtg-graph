// pipeline/rules/effect.has_reach.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array. Grant clauses
// ("target creature gains reach") are handled by `effect.grants_reach`.
// This also dodges the "breach"/"reach"-in-card-text false positives.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_reach',
  axis: 'effect',
  label: 'Has reach',
  description: 'Has the reach keyword as a printed intrinsic ability (can block creatures with flying).',
  pairsWith: ['condition.cares_evasion'],
};

export const rule: Rule = {
  id: 'effect.has_reach',
  axis: 'effect',
  matchCard: (card) => card.keywords.includes('Reach') ? { evidence: 'Reach' } : false,
};
