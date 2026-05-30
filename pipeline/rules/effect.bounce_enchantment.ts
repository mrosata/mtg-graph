// pipeline/rules/effect.bounce_enchantment.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_enchantment',
  axis: 'effect',
  label: 'Bounces or blinks an enchantment',
  description: 'Returns an enchantment to hand, or exiles and returns it.',
  pairsWith: ['trigger.enchantment_leaves_battlefield'],
};

const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,5}?enchantments?(?!\s+card)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

const PATTERN_BLINK_OWN =
  /\bexile(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?:[\w\-]+[,\s]+){0,5}?enchantments?(?!\s+card)[^.]*?(?:,\s+then\s+return|\.\s+return)/;

// `(?!\s+card)` + graveyard guard reject "return target permanent card from
// your graveyard to your hand" (graveyard recursion, e.g. Coati Scavenger).
const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+\s+){0,5}nonenchantment\s+)(?:[\w\-]+\s+){0,5}?permanents?(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

export const rule: Rule = {
  id: 'effect.bounce_enchantment',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_RETURN_OWN) ?? t.match(PATTERN_BLINK_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return', 'exile'], proximity: ['enchantment', 'permanent', 'hand'], window: 12 },
};
