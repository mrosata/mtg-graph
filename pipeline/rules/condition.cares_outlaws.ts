// pipeline/rules/condition.cares_outlaws.ts
//
// OTJ umbrella creature-type axis. "Outlaw" is shorthand for Assassin,
// Mercenary, Pirate, Rogue, or Warlock — a multi-type lord/anthem target
// the way "Slivers" / "Dragons" works for narrower groups.
//
// The reminder text "(Assassins, Mercenaries, Pirates, Rogues, and Warlocks
// are outlaws.)" is stripped before tagging, so the rule only sees the
// payoff references — "outlaws you control", "an outlaw spell", "another
// outlaw", "Affinity for outlaws", etc.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_outlaws',
  axis: 'condition',
  label: 'Cares about outlaws',
  description:
    'References outlaws — the OTJ umbrella creature-type term for Assassin, Mercenary, Pirate, Rogue, and Warlock. Anthems, scaling, "outlaw spell" cast triggers, and Affinity for outlaws all qualify.',
  // Outlaws is an umbrella over five tribes; the natural producers are
  // creatures of those types. condition.cares_tribe.pirate is the only
  // overlapping existing tribe tag (Rogue is not yet in THEME_TRIBES);
  // explicit pair to give the graph a visible link.
  pairsWith: [],
};

// Word-boundary match — "outlaw" / "outlaws" is OTJ-specific enough that
// no other context anchor is needed. The reminder-strip already removes
// the explanation in parens, so the rule won't double-match on it.
const PATTERN = /\boutlaws?\b/;

export const rule: Rule = {
  id: 'condition.cares_outlaws',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['outlaw', 'outlaws'],
    proximity: ['you control', 'spell', 'each', 'affinity'],
    window: 6,
  },
};
