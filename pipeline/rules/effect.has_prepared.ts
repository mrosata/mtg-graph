// pipeline/rules/effect.has_prepared.ts
//
// Strixhaven's Prepared mechanic: a creature with a back-face instant or
// sorcery; while the creature is "prepared," you may cast a copy of the
// back-face spell from the battlefield (which unprepares it).
//
// Synthesized from `keywords` because the parenthetical reminder text gates
// the mechanic but isn't a reliable text-only signal — Scryfall surfaces it
// as an explicit keyword. This is a thematic filter tag (category=theme); the
// back-face spell's own type/effect tags already carry the rules-text edges,
// so this tag is the discovery hook ("show me all Prepared cards") rather
// than an edge source. No "Prepared matters" payoff cards exist in Standard
// yet — when they do, add a `condition.prepared_matters` rule paired here.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_prepared',
  axis: 'effect',
  label: 'Has Prepared',
  description:
    "Strixhaven keyword. This creature enters prepared (or becomes prepared on a trigger). While prepared, you may cast a copy of its back-face instant or sorcery.",
  pairsWith: [],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_prepared',
  axis: 'effect',
  matchCard: (card) => {
    return card.keywords.includes('Prepared') ? { evidence: 'Prepared' } : false;
  },
};
