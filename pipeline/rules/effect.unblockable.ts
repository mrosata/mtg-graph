// pipeline/rules/effect.unblockable.ts
//
// Full unblockability — the Slither Blade / Triton Shorestalker / Ninja of
// the Deep Hours family. Includes:
//   - Intrinsic: "this creature can't be blocked."
//   - Conditional: "this creature can't be blocked as long as / while / if X."
//   - Anthem-style grant: "creatures you control can't be blocked."
//   - Temporary grant: "target creature can't be blocked this turn."
//
// Excludes PARTIAL unblockability — "can't be blocked by X" / "can't be
// blocked except by X" — which is Protection-from-X-shaped pump-evasion.
// Different graph axis: deck queries for "what unblockable creatures can I
// run?" want full unblockability, not partial.
//
// Excludes the Delney pseudo-evasion gate ("creatures with power N or less
// can't be blocked by creatures with power N or greater") — that's a
// blocker-restriction gate, not a grant of unblockability.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.unblockable',
  axis: 'effect',
  label: 'Full unblockability',
  description: 'Has or grants "can\'t be blocked" — Slither Blade family. Includes intrinsic, anthem-style, temporary, and conditional forms. Distinct from partial unblockability (Protection / "can\'t be blocked by X" / "except by X") and from blocker-restriction gates (Delney).',
  pairsWith: ['condition.cares_evasion'],
};

// Negative lookahead for " by" / " except" — those qualifiers turn full
// unblockability into partial.
const PATTERN = /\bcan't be blocked\b(?!\s+(?:by|except))/;

// v0.14.32 — near-unblockable via tautological blocker restriction.
// Pompous Gadabout: "can't be blocked by creatures that don't have a name".
// All non-token creatures have names; the "that don't have <X>" inverse
// phrasing restricts blockers to a near-empty set. Functionally close to
// full unblockability for graph-edge (cares_evasion) purposes. The
// restrictive "that HAVE <X>" form (anti-air partial-evasion) is
// intentionally excluded by `don't`.
const PATTERN_NEAR_UNBLOCKABLE = /\bcan't be blocked by creatures that don't have\b/;

export const rule: Rule = {
  id: 'effect.unblockable',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(PATTERN_NEAR_UNBLOCKABLE);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ["can't be blocked"], proximity: ['creature', 'this', 'creatures'], window: 4 },
};
