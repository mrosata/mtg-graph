// pipeline/rules/effect.exile_enchantment.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_enchantment',
  axis: 'effect',
  label: 'Exiles an enchantment',
  description: 'Exiles a target enchantment from the battlefield, including multi-type "artifact or enchantment" effects.',
  pairsWith: ['trigger.enchantment_leaves_battlefield'],
};

// Tempered greedy filler `(?!\buntil\b)` blocks "exile target X ... until this
// enchantment leaves the battlefield" (Banishing-Light pattern: Food Coma,
// Cast Out, Realmbreaker's Grasp). The "enchantment" there is a duration
// anchor referring to {self}, not the target of exile.
const PATTERN_OWN =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:(?!\buntil\b)[\w\-]+[,\s]+){0,6}?enchantments?(?! cards?)\b/;

const PATTERN_BROAD =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonenchantment\s+)(?:(?!\buntil\b)[\w\-]+\s+){0,5}?permanents?(?! cards?)\b/;

export const rule: Rule = {
  id: 'effect.exile_enchantment',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['exile'], proximity: ['enchantment', 'permanent'], window: 8 },
};
