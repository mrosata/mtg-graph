// pipeline/rules/effect.cast_noncreature_spell.ts
//
// Synthesized from `typeLine` rather than oracle text. A card "casts a
// noncreature spell" simply by being an Instant or Sorcery — including the
// adventure (back) face of a creature/adventure card, since casting the
// adventure portion is a noncreature spell cast under the game rules.
//
// Pairs with `condition.cares_noncreature_spell` (prowess engines, Storm-like
// payoffs) and `trigger.spell_cast` (any spell-cast reciprocal trigger). This
// closes the gap where the deck's 30+ instants/sorceries had no edge to the
// 3 prowess creatures that wanted them — the whole engine was invisible.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.cast_noncreature_spell',
  axis: 'effect',
  label: 'Can be cast as a noncreature spell',
  description:
    'This card is (or has a face that is) an Instant or Sorcery — including Adventure / Omen / DFC spell modes on creature cards. Casting that side triggers prowess and other "cares about noncreature spells" effects.',
  pairsWith: [],
};

const TYPE_RE = /\b(Instant|Sorcery)\b/;

export const rule: Rule = {
  id: 'effect.cast_noncreature_spell',
  axis: 'effect',
  matchCard: (card) => {
    const m = card.typeLine.match(TYPE_RE);
    return m ? { evidence: m[0] } : false;
  },
};
