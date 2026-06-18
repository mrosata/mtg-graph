// pipeline/rules/effect.has_trample.ts
//
// Intrinsic-only — requires the Trample keyword in Scryfall's `keywords` array
// AND on a standalone keyword-block line via `isIntrinsicKeyword`. This avoids
// the recurring "keyword-grant leaking into has_<keyword>" problem: token-grants
// ("create a beast with trample"), anthem grants ("creatures you control have
// trample"), and conditional self-grants ("this creature gains trample until end
// of turn") all appear in Scryfall's keyword array but are NOT intrinsic.
// The grants case is handled by `effect.grants_trample`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { isIntrinsicKeyword } from '../normalize';

export const tagDef: TagDef = {
  tagId: 'effect.has_trample',
  axis: 'effect',
  label: 'Has trample',
  description: 'Has the trample keyword as a printed intrinsic ability.',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_trample',
  axis: 'effect',
  // Pass card.oracleText (raw, newlines preserved) — not the matchCard arg
  // which is the normalized text (newlines collapsed). isIntrinsicKeyword
  // splits on \n to find keyword-block lines, so the raw form is required.
  // Mirrors has_flying.ts.
  matchCard: (card) =>
    card.keywords.includes('Trample') && isIntrinsicKeyword(card.oracleText, 'Trample')
      ? { evidence: 'Trample' }
      : false,
};
