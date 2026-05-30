// pipeline/rules/condition.reduces_activated_mana_cost.ts
//
// Narrow payoff: cards that reduce the mana cost of activated abilities
// (Agatha of the Vile Cauldron, Blossoming Tortoise, Forensic Gadgeteer,
// Mutagen Man, Training Grounds template). The canonical frame is
// "cost {N} less to activate".
//
// Split off from condition.cares_activated_abilities so it can pair with
// effect.has_mana_activated_ability — which excludes Crew because Crew's
// cost contains no mana and is therefore not reducible by these payoffs.
// The broad cares_activated_abilities still pairs with the broad
// effect.has_activated_ability for Pithing-Needle / "whenever you activate"
// style payoffs that DO interact with Crew.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.reduces_activated_mana_cost',
  axis: 'condition',
  label: 'Reduces activated-ability mana cost',
  description:
    'Reduces the mana cost of activated abilities (Training Grounds / Agatha template). Pairs only with mana-cost activations — not Crew.',
  pairsWith: ['effect.has_mana_activated_ability'],
  category: 'theme',
};

const COST_REDUCER_OF_ACTIVATIONS =
  /\bcosts?\s+(?:up to\s+)?\{[\dx]+\}\s+less to activate\b/;

export const rule: Rule = {
  id: 'condition.reduces_activated_mana_cost',
  axis: 'condition',
  match: (t) => {
    const m = t.match(COST_REDUCER_OF_ACTIVATIONS);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['activate'],
    proximity: ['cost', 'costs', 'less'],
    window: 6,
  },
};
