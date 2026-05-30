// pipeline/rules/effect.has_prowess.ts
//
// Intrinsic-only — reads Scryfall's `keywords` array.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_prowess',
  axis: 'effect',
  label: 'Has prowess',
  description: 'Has the prowess keyword as a printed intrinsic ability — triggers off own noncreature spell casts.',
  pairsWith: ['trigger.spell_cast'],
  children: ['condition.cares_noncreature_spell'],
};

export const rule: Rule = {
  id: 'effect.has_prowess',
  axis: 'effect',
  matchCard: (card) => card.keywords.includes('Prowess') ? { evidence: 'Prowess' } : false,
};
