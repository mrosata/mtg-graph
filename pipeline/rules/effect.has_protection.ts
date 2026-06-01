// pipeline/rules/effect.has_protection.ts
//
// Intrinsic-only — requires the Protection keyword in Scryfall's `keywords`
// array AND a standalone keyword-block line via `isIntrinsicKeyword`. The
// keyword-block matcher admits `protection from <X>` qualified entries
// (alongside the bare keyword) — same shape as Hexproof's "Hexproof from
// <color>" handling. Grants-to-others is `effect.grants_protection`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { isIntrinsicKeyword } from '../normalize';

export const tagDef: TagDef = {
  tagId: 'effect.has_protection',
  axis: 'effect',
  label: 'Has protection',
  description:
    'Has the protection keyword as a printed intrinsic ability — protection from X (color, type, instance). Companion to `effect.grants_protection` (anthem-style grant).',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_protection',
  axis: 'effect',
  matchCard: (card) =>
    card.keywords.includes('Protection') && isIntrinsicKeyword(card.oracleText, 'Protection')
      ? { evidence: 'Protection' }
      : false,
};
