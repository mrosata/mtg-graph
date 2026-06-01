// pipeline/rules/effect.has_lifelink.ts
//
// Intrinsic-only — requires the Lifelink keyword in Scryfall's `keywords`
// array AND on a standalone keyword-block line via `isIntrinsicKeyword`.
// Mirrors `effect.has_flying`. Without the intrinsic gate, the keyword leaks
// from anthem grants, counter-list grants (Reluctant Role Model: "put a
// flying, lifelink, or +1/+1 counter on it"), and other secondary uses where
// Scryfall populates `keywords` from any oracle-text mention. Grant clauses
// are handled by `effect.grants_lifelink`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { isIntrinsicKeyword } from '../normalize';

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
  matchCard: (card) =>
    card.keywords.includes('Lifelink') && isIntrinsicKeyword(card.oracleText, 'Lifelink')
      ? { evidence: 'Lifelink' }
      : false,
};
