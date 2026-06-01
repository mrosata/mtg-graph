// pipeline/rules/effect.has_renew.ts
//
// Renew keyword (DSK) — a graveyard-activated ability that exiles the card to
// resolve a one-shot effect. Read from Scryfall's `keywords` array. Theme-
// category filter tag. Distinct from `condition.cast_from_graveyard` (Mayhem /
// Flashback / Disturb / Embalm / Eternalize / Encore / Escape / Jump-start /
// Unearth) — Renew is an activated ability, not a cast, but mechanically
// occupies the same graveyard-recursion axis.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_renew',
  axis: 'effect',
  label: 'Has renew',
  description:
    'Has the Renew keyword — a graveyard-activated ability that exiles the card to repeat its on-board effect.',
  pairsWith: ['condition.cares_graveyard'],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_renew',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Renew') ? { evidence: 'Renew' } : false),
};
