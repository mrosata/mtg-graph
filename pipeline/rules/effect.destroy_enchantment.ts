// pipeline/rules/effect.destroy_enchantment.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.destroy_enchantment',
  axis: 'effect',
  label: 'Destroys an enchantment',
  description: 'Destroys a target enchantment — directly, in an "artifact or enchantment" effect, or via a broad effect like "destroy target permanent".',
  pairsWith: ['trigger.enchantment_leaves_battlefield'],
};

// Pattern A: own type (and common multi-type "artifact or enchantment" phrasing).
const PATTERN_OWN =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?enchantments?\b/;

// Pattern B: type-inclusive broad.
// v0.14.1 — filler relaxed to `[\w\-]+[,\s]+` so comma-separated multi-type
// filters like "destroy target noncreature, nonland permanent" (Molten
// Collapse) match. The "nonenchantment" guard still catches explicit
// exclusions.
const PATTERN_BROAD =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+[,\s]+){0,5}nonenchantment\s+)(?:[\w\-]+[,\s]+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.destroy_enchantment',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['destroy'], proximity: ['enchantment', 'permanent'], window: 8 },
};
