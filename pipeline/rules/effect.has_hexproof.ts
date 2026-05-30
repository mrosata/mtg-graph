// pipeline/rules/effect.has_hexproof.ts
//
// Intrinsic-only — requires the Hexproof keyword in Scryfall's `keywords`
// array AND on a standalone keyword-block line via `isIntrinsicKeyword`.
// Grants-to-others is `effect.grants_hexproof`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { isIntrinsicKeyword } from '../normalize';

export const tagDef: TagDef = {
  tagId: 'effect.has_hexproof',
  axis: 'effect',
  label: 'Has hexproof',
  description: 'Has the hexproof keyword as a printed intrinsic ability.',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_hexproof',
  axis: 'effect',
  matchCard: (card) =>
    card.keywords.includes('Hexproof') && isIntrinsicKeyword(card.oracleText, 'Hexproof')
      ? { evidence: 'Hexproof' }
      : false,
};
