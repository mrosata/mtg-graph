// pipeline/rules/effect.bounce_land.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_land',
  axis: 'effect',
  label: 'Bounces or blinks a land',
  description: 'Returns a land to hand, or exiles and returns it.',
  pairsWith: ['trigger.land_leaves_battlefield'],
};

// v0.14.38 — `a|an` determiner added so the OTJ "Archway" cycle's self-bounce
// template ("return a land you control to its owner's hand") matches. The
// existing `another|target|each|all` allowlist missed the entire cycle (Arid
// Archway and partners). Land/typed-land subject still required, so generic
// "return a creature you control to its owner's hand" stays out.
const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,5}?lands?(?!\s+card)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

const PATTERN_BLINK_OWN =
  /\bexile(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?:[\w\-]+[,\s]+){0,5}?lands?(?!\s+card)[^.]*?(?:,\s+then\s+return|\.\s+return)/;

// `(?!\s+card)` + graveyard guard reject "return target permanent card from
// your graveyard to your hand" (graveyard recursion, e.g. Coati Scavenger).
const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+\s+){0,5}nonland\s+)(?:[\w\-]+\s+){0,5}?permanents?(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owner'?s|their\s+owners'?)\s+hands?\b/;

export const rule: Rule = {
  id: 'effect.bounce_land',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_RETURN_OWN) ?? t.match(PATTERN_BLINK_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return', 'exile'], proximity: ['land', 'permanent', 'hand'], window: 12 },
};
