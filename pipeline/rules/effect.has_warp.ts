// pipeline/rules/effect.has_warp.ts
//
// Warp keyword (Tarkir: Dragonstorm) — alternate cast cost; the card exiles
// itself after resolving and can be cast again later. Read from Scryfall's
// `keywords` array. Theme-category filter tag.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_warp',
  axis: 'effect',
  label: 'Has warp',
  description: 'Has the Warp keyword — an alternate cast cost that exiles the card after resolution and lets it be recast later.',
  pairsWith: [],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_warp',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Warp') ? { evidence: 'Warp' } : false),
};
