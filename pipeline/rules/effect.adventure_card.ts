// pipeline/rules/effect.adventure_card.ts
//
// Marks cards that have an Adventure back face. Synthesized from `typeLine`
// because the front face is usually a Creature — there is no oracle-text
// signal that reliably identifies the card AS an Adventure (the back-face
// rules text talks about its own effect, not its adventure-ness).
//
// Pairs with `condition.adventure_matters` so that "whenever you cast an
// Adventure" cards edge to the actual Adventure cards.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.adventure_card',
  axis: 'effect',
  label: 'Is an Adventure card',
  description:
    'This card has an Adventure back face. Casting the adventure portion satisfies "Adventure matters" conditions.',
  pairsWith: [],
};

const ADVENTURE_RE = /\bAdventure\b/;

export const rule: Rule = {
  id: 'effect.adventure_card',
  axis: 'effect',
  matchCard: (card) => {
    const m = card.typeLine.match(ADVENTURE_RE);
    return m ? { evidence: m[0] } : false;
  },
};
