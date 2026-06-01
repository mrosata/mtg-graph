// pipeline/rules/effect.has_defender.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array. Defender-payoffs
// (Doran the Siege Tower, Arcades the Strategist, Towering Titan, Assault
// Formation) pair with the printed keyword, not with the rare "gains
// defender" grant clause.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_defender',
  axis: 'effect',
  label: 'Has defender',
  description: 'Has the defender keyword as a printed intrinsic ability (cannot attack).',
  // No `condition.cares_defender` tag exists yet. Theme axis — surfaces in
  // deck-builder filters until a Doran/Arcades-style payoff card lands in
  // Standard and motivates a consumer-side rule.
  pairsWith: [],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_defender',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Defender') ? { evidence: 'Defender' } : false),
};
