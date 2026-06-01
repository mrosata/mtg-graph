// pipeline/rules/effect.has_mobilize.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_mobilize',
  axis: 'effect',
  label: 'Has mobilize',
  description: 'Has the mobilize keyword as a printed intrinsic ability (creates tapped, attacking Warrior tokens that are sacrificed end of combat).',
  category: 'theme',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_mobilize',
  axis: 'effect',
  matchCard: (card) => card.keywords.includes('Mobilize') ? { evidence: 'Mobilize' } : false,
};
