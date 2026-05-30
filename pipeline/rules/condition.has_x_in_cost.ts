// pipeline/rules/condition.has_x_in_cost.ts
//
// Marks cards with `{X}` in their mana cost — i.e. spells whose effect scales
// with the amount of mana you pour into them (Mathemagics, Doppelgang, Mind
// into Matter, Stonesplitter Bolt, Abuelo's Awakening, etc.). These are the
// canonical "big-mana payoff" cards: ramp them up, dump mana, win the game.
//
// Synthesized from `manaCost` rather than oracle text because the X-cost
// signature is a structured field that's impossible to express in regex over
// oracle text (cards rarely say "this spell has X in its cost" — the cost
// itself IS the signal).
//
// Pairs with ramp and cost-reduction sources so the deck-builder query "what
// pays off my ramp?" surfaces X-spells alongside `condition.cares_high_mana_value`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.has_x_in_cost',
  axis: 'condition',
  label: 'Has X in mana cost',
  description:
    'This card has {X} in its mana cost — its effect scales with the mana paid. The canonical "big-mana payoff" half of ramp archetypes.',
  pairsWith: ['effect.ramp_nonland', 'effect.cost_reduction'],
  category: 'theme',
};

export const rule: Rule = {
  id: 'condition.has_x_in_cost',
  axis: 'condition',
  matchCard: (card) => {
    if (!card.manaCost) return false;
    return card.manaCost.includes('{X}') ? { evidence: '{X}' } : false;
  },
};
