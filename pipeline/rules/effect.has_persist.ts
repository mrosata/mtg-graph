// pipeline/rules/effect.has_persist.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_persist',
  axis: 'effect',
  label: 'Has persist',
  description: 'Has the persist keyword as a printed intrinsic ability (returns from graveyard with a -1/-1 counter if it had no -1/-1 counters when it died).',
  category: 'theme',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_persist',
  axis: 'effect',
  matchCard: (card) => card.keywords.includes('Persist') ? { evidence: 'Persist' } : false,
};
