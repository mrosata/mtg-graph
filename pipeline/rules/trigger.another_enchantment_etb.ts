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
    // v0.15 — post-noun qualifier slot widened from {0,3} → {0,8} to admit
    // "with <stat-filter>" qualifier tails. Parallel to v0.14.13 widening
    // on trigger.another_creature_etb.
    const m = t.match(
      /whenever (?:a |an |another |one or more )?(?:enchantment|aura|saga|class|curse|role|shrine)s?(?:\s+\w+){0,8}\s+enters?/,
    );
    if (m) return { evidence: m[0] };
    // v0.15 — broad "noncreature, nonland permanents" superset framing
    // (Builder's Talent). Covers artifact + enchantment + planeswalker
    // permanents — fires both this trigger and another_artifact_etb.
    const broad = t.match(
      /whenever (?:a |an |another |one or more )?(?:noncreature, nonland|nonland, noncreature) permanents?(?:\s+\w+){0,8}\s+enters?/,
    );
    return broad ? { evidence: broad[0] } : false;
  },
  nearMiss: { anchors: ['enters'], proximity: ['enchantment', 'enchantments'], window: 6 },
};
