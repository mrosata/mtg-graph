// pipeline/rules/condition.cares_cards_drawn_this_turn.ts
//
// The UR / Izzet scaling axis — payoffs that gate or scale on the count of
// cards the controller has drawn this turn. Structural sibling to
// `condition.cares_creatures_died_this_turn` for the death axis. Producer
// side is `effect.draws_or_discards`; the moment-of-draw trigger is
// `trigger.card_drawn_discarded`. This is the payoff side that consumers
// of the draw resource use for graph edges.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_cards_drawn_this_turn',
  axis: 'condition',
  label: 'Cares about cards drawn this turn',
  description: 'Scales or gates on the count of cards drawn this turn (Galvanize / Izzet draw-payoff family). Distinct from `trigger.card_drawn_discarded` which fires at the moment of draw.',
  pairsWith: ['effect.draws_or_discards', 'trigger.card_drawn_discarded'],
};

const PATTERNS = [
  // Cumulative gate: "if you've/you have drawn N or more cards this turn".
  // Galvanize: "If you've drawn two or more cards this turn, Galvanize deals
  // 5 damage to that creature instead."
  /\b(?:if|as long as|while) you(?:'ve| have) drawn (?:\d+|one|two|three|four|five|six|seven|x) or more cards? this turn\b/,
  // Per-card scaling: "for each card you('ve| have) drawn this turn".
  /\bfor each card you(?:'ve| have) drawn this turn\b/,
  // Static count: "the number of cards you('ve| have) drawn this turn"
  // (power/toughness scaling, X-cost scaling).
  /\bnumber of cards you(?:'ve| have) drawn this turn\b/,
  // v0.14.9 — ordinal frame: "your (first|second|...|Nth) card each turn"
  // (Jaded Analyst). Trigger fires when the controller draws the Nth card
  // of the turn — same axis (count of cards drawn this turn) as the
  // cumulative-gate patterns above.
  /\byou draw your (?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+(?:st|nd|rd|th)) card each turn\b/,
];

export const rule: Rule = {
  id: 'condition.cares_cards_drawn_this_turn',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['drawn this turn'], proximity: ['cards', 'each', 'number'], window: 6 },
};
