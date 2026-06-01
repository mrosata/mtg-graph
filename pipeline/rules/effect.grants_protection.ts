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

export const rule: Rule = {
  id: 'effect.grants_protection',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['protection'], proximity: ['gains', 'has', 'have', 'from'], window: 4 },
};
