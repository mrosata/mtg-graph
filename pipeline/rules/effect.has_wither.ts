// pipeline/rules/effect.has_wither.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_wither',
  axis: 'effect',
  label: 'Has wither',
  description: 'Has the wither keyword as a printed intrinsic ability (deals damage to creatures in the form of -1/-1 counters).',
  category: 'theme',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_wither',
  axis: 'effect',
  matchCard: (card) => card.keywords.includes('Wither') ? { evidence: 'Wither' } : false,
};
