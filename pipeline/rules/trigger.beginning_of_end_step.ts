// pipeline/rules/trigger.beginning_of_end_step.ts
//
// Phase trigger — "At the beginning of (your|each|each opponent's) end
// step". Recurring shape for drain effects (Eriette of the Charmed Apple),
// token generators (Bitterblossom-likes), and conditional payoffs that
// resolve at end of turn rather than during combat. First entry in the
// phase-trigger family (no upkeep / beginning-of-combat tags yet — those
// would be sibling rules).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.beginning_of_end_step',
  axis: 'trigger',
  label: 'Triggers at the beginning of an end step',
  description: 'Has an ability that triggers at the beginning of an end step (yours, each, or an opponent\'s).',
  pairsWith: [
    'effect.life_changed',
    'effect.draws_or_discards',
    'effect.create_creature_token',
    'effect.deals_damage',
  ],
};

// Anchor on the literal phrase. Covers all known scoping variants:
//   - your / your next        (controller's, optionally next end step)
//   - each / each player's / each opponent's
//   - the next / the next player's   (delayed-trigger frames on spells)
// v0.14.9 — added "your next" (Harried Dronesmith: "sacrifice it at the
// beginning of your next end step" — common token-creator delayed sacrifice).
// v0.23 — bare "the end step" admitted alongside "the next end step" /
// "the next player's end step". 10 Standard cards use the lazy templating
// "at the beginning of the end step" (no qualifier) — Ball Lightning,
// Chandra Flameshaper, Electroduplicate, Colfenor's Urn, etc.
const PATTERN = /\bat the beginning of (?:your(?: next)?|each(?: player's| opponent's)?|the(?: next(?: player's)?)?) end step\b/;

export const rule: Rule = {
  id: 'trigger.beginning_of_end_step',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['end step'], proximity: ['beginning', 'your', 'each'], window: 6 },
};
