// pipeline/rules/trigger.gift_promised.ts
//
// Gift-promised trigger — the payoff half of the Duskmourn Gift axis. Cards
// that fire an ability when you give a gift (Jolly Gerbils: "Whenever you
// give a gift, draw a card.") or when a gift is promised. Pairs with
// effect.has_gift (the producer half — cards WITH Gift in their cost).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.gift_promised',
  axis: 'trigger',
  label: 'Triggers when you give a gift',
  description: 'Has an ability that triggers when you give a gift or when a gift is promised. The payoff half of the Duskmourn Gift axis.',
  pairsWith: ['effect.has_gift'],
};

const PATTERNS = [
  // "whenever you give a gift" — Jolly Gerbils.
  /\bwhenever you give a gift\b/,
  // "whenever a gift is promised" — passive form.
  /\bwhenever (?:a|the) gift is promised\b/,
  // "whenever an opponent receives a gift" — opponent-side framing.
  /\bwhenever (?:an? |the |target |each )?(?:opponent|player) receives a gift\b/,
];

export const rule: Rule = {
  id: 'trigger.gift_promised',
  axis: 'trigger',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['gift'], proximity: ['give', 'promised', 'receives'], window: 4 },
};
