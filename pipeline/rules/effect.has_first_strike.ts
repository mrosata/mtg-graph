// pipeline/rules/effect.has_first_strike.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array. Grant clauses
// ("target creature gains first strike") are handled by
// `effect.grants_first_strike` / `effect.grants_double_strike`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_first_strike',
  axis: 'effect',
  label: 'Has first strike or double strike',
  description:
    'Has first strike (or double strike — double strike is a superset) as a printed intrinsic ability. Carries metadata { doubleStrike: true } when matched on double strike.',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_first_strike',
  axis: 'effect',
  matchCard: (card) => {
    // Double strike first — it's a superset; we want the more-specific match.
    if (card.keywords.includes('Double strike')) {
      return { evidence: 'Double strike', metadata: { doubleStrike: true } };
    }
    if (card.keywords.includes('First strike')) {
      return { evidence: 'First strike' };
    }
    return false;
  },
};
