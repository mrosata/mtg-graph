// pipeline/rules/trigger.another_enchantment_etb.ts
//
// Has an ability that triggers when an enchantment (other than itself)
// enters the battlefield. Symmetric to trigger.another_creature_etb. Self-
// ETB on an enchantment uses "this enchantment" subject and is captured by
// trigger.self_etb instead.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.another_enchantment_etb',
  axis: 'trigger',
  label: 'Triggers when another enchantment enters',
  description: 'Has an ability that triggers when an enchantment (other than itself) enters the battlefield.',
  pairsWith: [
    'effect.create_role',
    'condition.cares_enchantments',
    'condition.cares_subtype.aura',
    'condition.cares_subtype.role',
  ],
};

export const rule: Rule = {
  id: 'trigger.another_enchantment_etb',
  axis: 'trigger',
  match: (t) => {
    // Accepts the literal "enchantment" word and the enchantment subtypes
    // (Aura, Saga, Class, Curse, Role, Shrine) — e.g. Tanglespan Lookout
    // ("whenever an aura you control enters"). Self-ETB on the card itself
    // is handled by trigger.self_etb via "this <type>" subject.
    const m = t.match(
      /whenever (?:a |an |another |one or more )?(?:enchantment|aura|saga|class|curse|role|shrine)s?(?:\s+\w+){0,3}\s+enters?/,
    );
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['enters'], proximity: ['enchantment', 'enchantments'], window: 6 },
};
