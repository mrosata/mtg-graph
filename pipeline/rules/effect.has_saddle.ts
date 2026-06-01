// pipeline/rules/effect.has_saddle.ts
//
// OTJ keyword. "Saddle N" — tap any number of untapped creatures you control
// with total power N or greater to make this Mount become saddled until end
// of turn. Mounts use saddled status to gate combat triggers.
//
// Intrinsic-only — requires Scryfall's `keywords` array to include "Saddle".
// Mirrors `effect.has_disguise` / `effect.has_plot` / `effect.has_ward`
// pattern. The text-fallback probes the "saddle {N}" cost-block form for an
// informative evidence label.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { isIntrinsicKeyword } from '../normalize';

export const tagDef: TagDef = {
  tagId: 'effect.has_saddle',
  axis: 'effect',
  label: 'Has saddle',
  description:
    'Has the Saddle keyword as a printed intrinsic ability. The card is a Mount; tap creatures with total power N or greater to make it saddled until end of turn, unlocking its attack-while-saddled trigger.',
  // Saddle cards naturally pair with cares-Mounts payoffs once that subtype
  // condition exists (added via THEME_SUBTYPES extension in this same release).
  pairsWith: ['condition.cares_subtype.mount'],
};

const SADDLE_COST = /\bsaddle\s+\d+\b/;

export const rule: Rule = {
  id: 'effect.has_saddle',
  axis: 'effect',
  matchCard: (card, normalized) => {
    if (!card.keywords.includes('Saddle')) return false;
    if (isIntrinsicKeyword(card.oracleText, 'Saddle')) return { evidence: 'Saddle' };
    if (SADDLE_COST.test(normalized)) return { evidence: 'Saddle (cost block)' };
    return { evidence: 'Saddle (keyword)' };
  },
};
