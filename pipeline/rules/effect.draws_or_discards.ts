// pipeline/rules/effect.draws_or_discards.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.draws_or_discards',
  axis: 'effect',
  label: 'Draws or discards cards',
  description: 'Draws or discards cards.',
  pairsWith: ['trigger.card_drawn_discarded'],
};

export const rule: Rule = {
  id: 'effect.draws_or_discards',
  axis: 'effect',
  match: (t) => {
    // Subject slot expanded: not just "you" but also "each player/opponent",
    // "target player/opponent", and "that player" — for mass-discard frames
    // like Rankle's Prank ("• Each player discards two cards") and Mind Rot-
    // shaped sorceries.
    // Count slot expanded: "an additional card" (Lord Skitter's Blessing's
    // draw-step trigger) and "that many cards" (Malevolent Witchkite — drawn
    // count equals a sacrificed-count count).
    // `—` added to the leadin char class so the FIRST bullet of a modal
    // spell ("Choose one or more — • Each player discards two cards…")
    // reaches the subject slot. Without it the em-dash modal header swallows
    // the clause boundary and the regex falls off.
    const m = t.match(
      /(?:(?:^|[.,:\n—] ?)(?:then |and |may |• )?| and | then )(?:(?:you|each player|each opponent|target player|target opponent|that player)\s+(?:may )?)?(?:draws?|discards?) (?:a card|an additional card|that many cards|cards equal to \S+|\d+ cards?|(?:two|three|four|five|six|seven|eight|nine|ten) cards?|[xn] cards?|(?:your|their) hand)/,
    );
    return m ? { evidence: m[0] } : false;
  },
};
