// pipeline/rules/condition.cares_low_power.ts
//
// Symmetric to `condition.cares_high_power` but matches the LOW-power axis
// ("power 2 or less", "with the least power", "with power N-"). Distinct
// archetype gate — weenie tribal, low-CMC removal targets, x/1 token tribal.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_low_power',
  axis: 'condition',
  label: 'Cares about low-power creatures',
  description: 'Triggers, scales, or gates on creatures with power N or less (N <= 2). The weenie / token / soft-removal target archetype.',
  pairsWith: ['effect.grants_stat_buff', 'effect.create_creature_token'],
};

// "power N or less" (N <= 2) and "with the least power" — discrete archetype
// gate. Threshold N <= 2 to avoid matching high-stat tribal effects ("power 3
// or less" still includes high-power outliers; the focused band is 1–2).
// v0.20 — added copula arm "<name>'s/its power is N or less" (Reptilian
// Recruiter: "if that creature's power is 2 or less"). Mirrors the
// cares_high_power copula arm.
// v0.35.0 — Batch 33: admit optional "or toughness" infix in the bare
// "power N or less" arm. Arnyn, Deathbloom Botanist: "with power or
// toughness 1 or less". The disjunction triggers BOTH the low-power
// branch AND the low-toughness branch (handled separately); the power
// branch correctly fires here.
const PATTERN =
  /\bpower (?:or toughness )?(?:[0-2]|one|two) or (?:less|fewer)\b|\bwith the least power\b|\b(?:[\w']+?'s|its)\s+power\s+(?:is|are)\s+(?:[0-2]|one|two) or (?:less|fewer)\b/;

// v0.14.4 Task 4.3: "can't be blocked by creatures with power N or less" is a
// blocker-restriction (pseudo-evasion), NOT a cares-low-power payoff. Mirror
// of the cares_high_power BLOCKER_GUARD fix (commit 3d30e74). Variable-width
// lookbehind is brittle, so we slice an 80-char window ending at the match
// and probe it with a forward regex.
const BLOCKER_GUARD =
  /can't be blocked by\s+(?:[\w\-]+\s+){0,4}(?:with\s+)?power\s+(?:[0-2]|one|two)\s+or\s+(?:less|fewer)/;

export const rule: Rule = {
  id: 'condition.cares_low_power',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    if (!m) return false;
    const idx = m.index ?? 0;
    const preceding = t.slice(Math.max(0, idx - 80), idx + m[0].length);
    if (BLOCKER_GUARD.test(preceding)) return false;
    return { evidence: m[0] };
  },
  nearMiss: { anchors: ['power'], proximity: ['or less', 'or fewer', 'least'], window: 4 },
};
