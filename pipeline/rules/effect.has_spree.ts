// pipeline/rules/effect.has_spree.ts
//
// OTJ keyword. "Spree" lets a spell stack modal additional costs ("+ {N} —
// <effect>") at cast time, paying for any combination of modes. Each
// chosen mode adds to the spell's cost and effect.
//
// Intrinsic-only — requires Scryfall's `keywords` array to include "Spree".
// Mirrors `effect.has_disguise` / `effect.has_plot` / `effect.has_saddle`
// pattern.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { isIntrinsicKeyword } from '../normalize';

export const tagDef: TagDef = {
  tagId: 'effect.has_spree',
  axis: 'effect',
  label: 'Has spree',
  description:
    'Has the Spree keyword as a printed intrinsic ability. Modal additional-cost spell — pay any number of "+ {N} — <effect>" modes when casting.',
  // No natural producer pairings — Spree is a property of the spell, not
  // a synergy enabler with other axes.
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_spree',
  axis: 'effect',
  matchCard: (card, normalized) => {
    if (!card.keywords.includes('Spree')) return false;
    if (isIntrinsicKeyword(card.oracleText, 'Spree')) return { evidence: 'Spree' };
    return { evidence: 'Spree (keyword)' };
  },
};
