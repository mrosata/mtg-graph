// pipeline/rules/effect.has_double_strike.ts
//
// Intrinsic-only — requires the Double strike keyword in Scryfall's `keywords`
// array AND on a standalone keyword-block line via `isIntrinsicKeyword`.
// Grants-to-others is `effect.grants_double_strike`. Note: `effect.has_first_strike`
// also fires on double-strike creatures (double strike is a superset of first
// strike) — these tags coexist and are not mutually exclusive.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { isIntrinsicKeyword } from '../normalize';

export const tagDef: TagDef = {
  tagId: 'effect.has_double_strike',
  axis: 'effect',
  label: 'Has double strike',
  description: 'Has the double strike keyword as a printed intrinsic ability.',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_double_strike',
  axis: 'effect',
  matchCard: (card) =>
    card.keywords.includes('Double strike') && isIntrinsicKeyword(card.oracleText, 'Double strike')
      ? { evidence: 'Double strike' }
      : false,
};
