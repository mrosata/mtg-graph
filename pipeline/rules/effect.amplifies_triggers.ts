// pipeline/rules/effect.amplifies_triggers.ts
//
// "If a triggered ability of <subject> triggers, that ability triggers an
// additional time." The Strionic Resonator / Roaming Throne / Delney /
// Annie Joins Up family — doubles triggered abilities of a gated subject.
//
// Distinct from `effect.amplifies_damage_or_lifeloss` (Furnace of Rath
// family, replacement on damage values) and from `effect.copy_spell`
// (spell copies, not trigger copies).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.amplifies_triggers',
  axis: 'effect',
  label: 'Amplifies triggered abilities',
  description:
    'Makes triggered abilities of gated subjects trigger an additional time — the Strionic Resonator / Roaming Throne / Delney family. Distinct from effect.copy_spell (spell copies) and effect.amplifies_damage_or_lifeloss (damage replacement).',
  // Pairs with the trigger axes that get amplified — broad set, but the
  // narrowest meaningful axis is ETB amplification (most common producer
  // shape) and damage-dealt amplification.
  pairsWith: [
    'trigger.self_etb',
    'trigger.another_creature_etb',
    'trigger.another_artifact_etb',
    'trigger.another_enchantment_etb',
    'trigger.damage_dealt',
    'trigger.attack_or_block',
  ],
};

// The decisive anchor is "triggers an additional time" — the rest of the
// sentence varies (which trigger, which subject, what condition).
const PATTERN = /\btriggers? an additional time\b/;

export const rule: Rule = {
  id: 'effect.amplifies_triggers',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['triggers', 'triggered'],
    proximity: ['additional time', 'ability', 'one more time'],
    window: 6,
  },
};
