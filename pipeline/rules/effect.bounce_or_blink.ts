// pipeline/rules/effect.bounce_or_blink.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_or_blink',
  axis: 'effect',
  label: 'Bounces or blinks any permanent',
  description: 'Returns a permanent to hand without type restriction, or exiles and returns it (re-triggering ETB). Type-specific bouncing is tagged on the typed children.',
  pairsWith: ['trigger.permanent_leaves_battlefield', 'trigger.another_creature_etb'],
  children: [
    'effect.bounce_creature',
    'effect.bounce_artifact',
    'effect.bounce_enchantment',
    'effect.bounce_planeswalker',
    'effect.bounce_land',
  ],
};

// `(?!\s+card)` + graveyard guard reject "return target permanent card from
// your graveyard to your hand" (graveyard recursion, e.g. Coati Scavenger).
// v0.20 — admit commas in the qualifier filler so "nonland, nontoken
// permanent" (Season of Weaving) is reached. The bounce_or_blink umbrella
// rule needs the comma admission so it pairs with the typed children's
// matches.
const PATTERN_RETURN =
  /\breturn(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+[,\s]+){0,5}(?:noncreature|nonartifact|nonenchantment|nonplaneswalker|nonland)\s+)(?:[\w\-]+[,\s]+){0,5}?permanents?(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

const PATTERN_BLINK =
  /\bexile(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+[,\s]+){0,5}(?:noncreature|nonartifact|nonenchantment|nonplaneswalker|nonland)\s+)(?:[\w\-]+[,\s]+){0,5}?permanents?(?!\s+card)[^.]*?(?:,\s+then\s+return|\.\s+return)/;

export const rule: Rule = {
  id: 'effect.bounce_or_blink',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_RETURN) ?? t.match(PATTERN_BLINK);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return', 'exile'], proximity: ['permanent', 'hand'], window: 12 },
};
