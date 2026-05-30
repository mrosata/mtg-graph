// pipeline/rules/effect.has_gift.ts
//
// Gift keyword (Duskmourn) — "Gift a <thing> (you may promise an opponent a
// gift as you cast this spell)." Giving the opponent the gift unlocks a
// bonus effect. Read from Scryfall's `keywords` array. Theme-category filter
// tag.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_gift',
  axis: 'effect',
  label: 'Has gift',
  description: 'Has the Gift keyword — promise an opponent a token gift as part of casting this spell to unlock an additional effect.',
  pairsWith: [],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_gift',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Gift') ? { evidence: 'Gift' } : false),
};
