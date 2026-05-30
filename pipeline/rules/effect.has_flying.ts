// pipeline/rules/effect.has_flying.ts
//
// Intrinsic-only — requires the Flying keyword in Scryfall's `keywords` array
// AND on a standalone keyword-block line via `isIntrinsicKeyword`. This avoids
// the recurring "keyword-grant leaking into has_<keyword>" problem (e.g.
// tokens-with-flying / "becomes a Dragon with flying" leaking into the
// printed-keyword axis). Grants-to-others is `effect.grants_evasion`.
//
// Replaces the per-keyword half of the retired `effect.has_evasion_intrinsic`
// umbrella tag.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { isIntrinsicKeyword } from '../normalize';

export const tagDef: TagDef = {
  tagId: 'effect.has_flying',
  axis: 'effect',
  label: 'Has flying',
  description: 'Has the flying keyword as a printed intrinsic ability.',
  pairsWith: ['condition.cares_evasion'],
};

export const rule: Rule = {
  id: 'effect.has_flying',
  axis: 'effect',
  matchCard: (card) =>
    card.keywords.includes('Flying') && isIntrinsicKeyword(card.oracleText, 'Flying')
      ? { evidence: 'Flying' }
      : false,
};
