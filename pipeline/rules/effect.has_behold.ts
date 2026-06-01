// pipeline/rules/effect.has_behold.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_behold',
  axis: 'effect',
  label: 'Has behold',
  description: 'Has the behold keyword as a printed intrinsic ability (reveal or have on the battlefield a card with a specific type as an additional cost or trigger).',
  category: 'theme',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_behold',
  axis: 'effect',
  matchCard: (card) => card.keywords.includes('Behold') ? { evidence: 'Behold' } : false,
};
