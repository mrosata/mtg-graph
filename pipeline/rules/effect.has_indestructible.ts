// pipeline/rules/effect.has_indestructible.ts
//
// Intrinsic-only — requires the Indestructible keyword in Scryfall's
// `keywords` array AND on a standalone keyword-block line via
// `isIntrinsicKeyword`. Grants-to-others is `effect.grants_indestructible`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { isIntrinsicKeyword } from '../normalize';

export const tagDef: TagDef = {
  tagId: 'effect.has_indestructible',
  axis: 'effect',
  label: 'Has indestructible',
  description: 'Has the indestructible keyword as a printed intrinsic ability.',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_indestructible',
  axis: 'effect',
  matchCard: (card) =>
    card.keywords.includes('Indestructible') && isIntrinsicKeyword(card.oracleText, 'Indestructible')
      ? { evidence: 'Indestructible' }
      : false,
};
