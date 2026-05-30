// pipeline/rules/effect.has_trample.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array rather than the oracle
// text. This avoids the recurring "keyword-grant leaking into has_<keyword>"
// problem: cards that grant trample to others ("creatures you control have
// trample") or to themselves conditionally ("this creature gains trample
// until end of turn") are NOT intrinsic and shouldn't fire. The grants case
// is handled by `effect.grants_trample`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

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
  matchCard: (card) => card.keywords.includes('Trample') ? { evidence: 'Trample' } : false,
};
