// pipeline/rules/effect.has_menace.ts
//
// Intrinsic-only — requires the Menace keyword in Scryfall's `keywords` array
// AND on a standalone keyword-block line via `isIntrinsicKeyword`. Grants-to-
// others is `effect.grants_evasion` (menace is one of its grant keywords).
//
// Replaces the per-keyword half of the retired `effect.has_evasion_intrinsic`
// umbrella tag.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { isIntrinsicKeyword } from '../normalize';

export const tagDef: TagDef = {
  tagId: 'effect.has_menace',
  axis: 'effect',
  label: 'Has menace',
  description: 'Has the menace keyword as a printed intrinsic ability.',
  pairsWith: ['condition.cares_evasion'],
};

export const rule: Rule = {
  id: 'effect.has_menace',
  axis: 'effect',
  matchCard: (card) =>
    card.keywords.includes('Menace') && isIntrinsicKeyword(card.oracleText, 'Menace')
      ? { evidence: 'Menace' }
      : false,
};
