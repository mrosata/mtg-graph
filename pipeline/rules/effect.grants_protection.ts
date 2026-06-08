// pipeline/rules/effect.grants_protection.ts
//
// "Has protection from X" / "gains protection from X" — keyword-grant axis.
// Standard has 10 cards: Sword of Wealth and Power, Sword of Hearth and
// Home, Spirit Mantle, Flickering Ward, Teferi's Protection, The One Ring,
// Absolute Virtue, Commander's Plate, Perch Protection, Sygg Wanderwine
// transform side.
//
// Protection isn't covered by the parametric effect.grants_<keyword>
// family because the granted ability requires a target ("from <X>") rather
// than being a standalone keyword. Modeled here as a single rule.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.grants_protection',
  axis: 'effect',
  label: 'Grants protection',
  description:
    'Grants the protection-from-X keyword to one or more creatures (or to the player). Distinct from the parametric grants_<keyword> family since protection always takes a target ("from green", "from creatures", "from each color").',
  pairsWith: [],
};

const PATTERN = /\b(?:gains?|has|have)\s+protection from\b/;
// v0.38.0 — Batch 7: chain through conjunction. Akroma's Will: "creatures
// you control gain lifelink, indestructible, and protection from each
// color". Mirrors grants_evasion.ts:34's Group 11c — allow up to three
// intermediate non-protection keywords joined by "and"/", and" before the
// protection grant.
const CHAIN_PATTERN = /\b(?:gains?|has|have) [a-z]+(?:\s+strike)?(?:\s*,\s*[a-z]+(?:\s+strike)?){0,3}\s*,?\s+and\s+protection from\b/;

export const rule: Rule = {
  id: 'effect.grants_protection',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(CHAIN_PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['protection'], proximity: ['gains', 'has', 'have', 'from'], window: 4 },
};
