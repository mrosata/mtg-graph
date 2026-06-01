// pipeline/rules/condition.cares_excess_damage.ts
//
// Cards that gate or scale on the count of "excess damage" — damage dealt
// beyond what was needed to mark a creature lethal. A recurring TDM-era and
// later payoff axis: Torch the Witness investigates if excess damage was
// dealt; Hell to Pay / Goblin Negotiation scale on the amount of excess
// damage; Razor Rings / Cramped Vents gain life equal to it.
//
// Distinct from `effect.deals_damage` (the damage event itself) — this tag
// captures the payoff scaling on overkill.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_excess_damage',
  axis: 'condition',
  label: 'Cares about excess damage',
  description:
    'Gates or scales on the count of excess damage — damage dealt beyond what was needed to lethal a creature. The Torch the Witness / Hell to Pay / Goblin Negotiation overkill-payoff axis.',
  // Excess-damage payoffs are typically self-contained (the same card both
  // deals the damage and scales on the excess), so no external producer
  // pairing is meaningful.
  pairsWith: [],
};

// Anchor: "excess damage" anywhere in oracle text. The phrase is specific
// enough that no further qualifiers are needed.
const PATTERN = /\bexcess damage\b/;

export const rule: Rule = {
  id: 'condition.cares_excess_damage',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['excess', 'damage'],
    proximity: ['dealt', 'this way', 'amount', 'equal to'],
    window: 6,
  },
};
