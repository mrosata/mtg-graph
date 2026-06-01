// pipeline/rules/effect.has_station.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_station',
  axis: 'effect',
  label: 'Has station',
  description: 'Has the station keyword as a printed intrinsic ability (tap a creature to put charge counters on this and unlock leveled abilities).',
  category: 'theme',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_station',
  axis: 'effect',
  matchCard: (card) => card.keywords.includes('Station') ? { evidence: 'Station' } : false,
};
