// pipeline/rules/trigger.upkeep.ts
//
// Phase trigger — "At the beginning of (your|each|target player's) upkeep".
// Recurring shape for descend gates (The Everflowing Well, The Mycotyrant),
// life-drain effects (Tithing Blade // Consuming Sepulcher), and upkeep-cost
// ongoing payoffs. Third entry in the phase-trigger family alongside
// trigger.beginning_of_combat and trigger.beginning_of_end_step.
//
// pairsWith — phase triggers are inherently broad, so the list is sparse
// (the most actionable downstream effects only).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.upkeep',
  axis: 'trigger',
  label: 'Triggers at the beginning of upkeep',
  description: "Has an ability that triggers at the beginning of an upkeep (yours, each player's, or a target player's).",
  pairsWith: [
    'effect.life_changed',
    'effect.draws_or_discards',
    'effect.mill',
    'condition.descend',
  ],
};

// Anchor on the literal phrase. Scopes:
//   - "your upkeep" (the dominant form)
//   - "each upkeep" / "each player's upkeep" / "each opponent's upkeep"
//   - "target player's upkeep"
const PATTERN =
  /\bat the beginning of (?:your|each(?:\s+(?:player'?s|opponent'?s))?|target\s+player'?s|the\s+chosen\s+player'?s)\s+upkeep\b/;

export const rule: Rule = {
  id: 'trigger.upkeep',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['upkeep'], proximity: ['beginning', 'your', 'each'], window: 6 },
};
