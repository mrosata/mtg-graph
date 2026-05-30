// pipeline/rules/condition.cares_high_power.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_high_power',
  axis: 'condition',
  label: 'Cares about high-power creatures',
  description: 'Triggers, scales, or gates on creatures with power N or greater (N >= 3). The Big Score / stompy / Outlaw payoff archetype.',
  pairsWith: ['effect.grants_stat_buff', 'effect.plus_one_counter'],
};

// "power N or greater" / "power N or more" / "with the greatest power" /
// "is the greatest power" / "with power N+" — discrete archetype gate.
// Threshold N >= 3 to avoid matching low-stat tribal effects ("power 1 or
// less" is a different axis).
// v0.14.1: added "is the greatest power" predicate form (Skullspore Nexus).
const PATTERN =
  /\bpower (?:[3-9]|\d{2,}) or (?:greater|more|higher)\b|\b(?:with|is) the greatest power\b|\b(?:[3-9]|\d{2,}) or greater power\b/;

// v0.14.4 Task 4.2: "can't be blocked by creatures with power N or greater"
// is a blocker-restriction (pseudo-evasion), NOT a cares-high-power payoff.
// Reject matches whose preceding context fits this frame. Variable-width
// lookbehind is brittle, so we slice an 80-char window ending at the match
// and probe it with a forward regex.
const BLOCKER_GUARD =
  /can't be blocked by\s+(?:[\w\-]+\s+){0,4}(?:with\s+)?power\s+(?:[3-9]|\d{2,})\s+or\s+(?:greater|more|higher)/;

export const rule: Rule = {
  id: 'condition.cares_high_power',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    if (!m) return false;
    const idx = m.index ?? 0;
    const preceding = t.slice(Math.max(0, idx - 80), idx + m[0].length);
    if (BLOCKER_GUARD.test(preceding)) return false;
    return { evidence: m[0] };
  },
  nearMiss: { anchors: ['power'], proximity: ['or greater', 'or more', 'greatest'], window: 4 },
};
