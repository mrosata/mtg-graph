// pipeline/rules/effect.has_exhaust.ts
//
// Exhaust keyword (FIN/EOE) — an activated-ability cost modifier: each `Exhaust`
// ability can be activated only once per game from the activating object. Read
// from Scryfall's `keywords` array. Theme-category filter tag.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_exhaust',
  axis: 'effect',
  label: 'Has exhaust',
  description:
    'Has the Exhaust keyword — a powerful activated ability that can only be activated once from the source.',
  pairsWith: [],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_exhaust',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Exhaust') ? { evidence: 'Exhaust' } : false),
};
