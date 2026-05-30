// pipeline/rules/effect.has_deathtouch.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array. Grant clauses are
// handled by `effect.grants_deathtouch`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_deathtouch',
  axis: 'effect',
  label: 'Has deathtouch',
  description: 'Has the deathtouch keyword as a printed intrinsic ability.',
  pairsWith: ['condition.cares_deathtouch'],
};

export const rule: Rule = {
  id: 'effect.has_deathtouch',
  axis: 'effect',
  matchCard: (card) => card.keywords.includes('Deathtouch') ? { evidence: 'Deathtouch' } : false,
};
