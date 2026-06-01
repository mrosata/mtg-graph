// pipeline/rules/effect.has_sneak.ts
//
// Sneak keyword (FIN/EOE) — an alternate-cost cast that returns an unblocked
// attacker to hand and brings this creature in tapped and attacking. Read from
// Scryfall's `keywords` array. Theme-category filter tag.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_sneak',
  axis: 'effect',
  label: 'Has sneak',
  description:
    'Has the Sneak keyword — an alternate cast cost that bounces one of your unblocked attackers and brings this creature in tapped and attacking.',
  pairsWith: [],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_sneak',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Sneak') ? { evidence: 'Sneak' } : false),
};
