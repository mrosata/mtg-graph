// pipeline/rules/trigger.permanent_sacrificed.ts
//
// Aristocrats axis — "Whenever you sacrifice a {permanent}". Triggers on
// the controller's sacrifice action, distinct from `trigger.creature_dies`
// (which fires on death from any source, including combat) and from
// `effect.sacrifice_*` (which IS the sacrifice action, not a response to
// it). Korvold, Cathar Commando, Experimental Confectioner, Mayhem Devil.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.permanent_sacrificed',
  axis: 'trigger',
  label: 'Triggers when you sacrifice a permanent',
  description: 'Has an ability that triggers when you sacrifice a creature, artifact, enchantment, land, token, or permanent (the aristocrats axis).',
  pairsWith: [
    'effect.sacrifice_creature',
    'effect.sacrifice_artifact',
    'effect.sacrifice_enchantment',
    'effect.sacrifice_land',
    'effect.sacrifice_permanent',
    'effect.create_food',
    'effect.create_treasure',
    'effect.create_clue',
  ],
};

// "(when|whenever) you sacrifice (a |an |another )?{noun}" — noun is any
// permanent type or token subtype. Both "whenever" (recurring trigger) and
// "when" (single-fire trigger, e.g. Curious Cadaver) are admitted. The
// "you sacrifice" anchor is precise: it distinguishes the controller's
// sacrifice (this axis) from "whenever {permanent} is sacrificed" (passive)
// or "sacrifice X: do Y" (cost).
const PATTERN = /\b(?:when|whenever) you sacrifice (?:a |an |another )?(?:permanent|creature|artifact|enchantment|land|token|food|treasure|clue|blood|map|powerstone|incubator|role)\b/;

export const rule: Rule = {
  id: 'trigger.permanent_sacrificed',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['whenever', 'you'], window: 6 },
};
