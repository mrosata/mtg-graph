// pipeline/rules/condition.cares_plus_one_counter.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_plus_one_counter',
  axis: 'condition',
  label: 'Cares about +1/+1 counters',
  description: 'Has an effect or trigger that checks whether a creature has a +1/+1 counter.',
  pairsWith: ['effect.plus_one_counter'],
};

const PATTERNS = [
  // noun + "with a +1/+1 counter": "creature(s) you control with a +1/+1 counter on it/them"
  /(?:creature|permanent|attacker|blocker|spell|card)s? (?:you control |an opponent controls |target [a-z]+ |another [a-z]+ |)?with (?:a |an |\d+ |one or more |another )?\+1\/\+1 counters?/,
  // conditional clauses: "if/whenever/when/as long as ... has/had/have a +1/+1 counter"
  /(?:\bif|whenever|\bwhen|as long as)\b[^.]{0,80}?(?:has|had|have) (?:a |an |\d+ |one or more )?\+1\/\+1 counters?/,
  // "for each +1/+1 counter on"
  /for each \+1\/\+1 counter on/,
  // v0.12.9: "X is the number of +1/+1 counters on Y" — scaling-off-counters
  // form (Anim Pakal, Thousandth Moon). Also "equal to the number of +1/+1
  // counters on ..." which is the same axis with a different sentence frame.
  /\b(?:x is|equal to) the number of \+1\/\+1 counters? on\b/,
  // 2026-06-01 audit Group 17 — Hardened-Scales / Branching Evolution
  // replacement frame (Caradora, Heart of Alacria). The "if one or more
  // +1/+1 counters would be put on <subject>" antecedent cares whether a
  // counter is being placed.
  /\bif one or more \+1\/\+1 counters would be put on\b/,
  // 2026-06-01 audit batch — Yathan Tombguard: "whenever a creature you
  // control with a counter on it deals combat damage". The trigger gates
  // on a creature having "a counter on it". Without a separate "+1/+1
  // counter" mention the LOOSE_PATTERN doesn't fire. Stun / charge /
  // loyalty counters don't appear on "a creature you control" in a
  // damage trigger — the gate is +1/+1-territory in practice.
  /\bwhenever\s+a\s+(?:[\w\-]+\s+){0,3}?creature\s+you control\s+with\s+(?:a|an|one or more)\s+counters?\s+on\s+(?:it|them)\b/,
  // v0.35.0 — Batch 29: "whenever one or more +1/+1 counters are put on"
  // trigger frame (Pensive Professor). The trigger gates on +1/+1 counter
  // placement directly — same cares-+1/+1 axis as the other trigger frames.
  /\bwhenever\s+(?:a|an|\d+|one or more)\s+\+1\/\+1 counters? (?:are|is) put on\b/,
];

// Looser phrasings that say "counter" without specifying "+1/+1". Only fire
// when the card mentions "+1/+1 counter" elsewhere — otherwise we'd pick up
// cards talking about charge/loyalty/age/stun counters.
const LOOSE_PATTERNS = [
  /(?:creature|permanent|attacker|blocker)s? (?:you control |an opponent controls |another [a-z]+ |)?with (?:a |\d+ |one or more )?counters? on (?:it|them|that)/,
  /for each counter on/,
];

export const rule: Rule = {
  id: 'condition.cares_plus_one_counter',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    if (t.includes('+1/+1 counter')) {
      for (const re of LOOSE_PATTERNS) {
        const m = t.match(re);
        if (m) return { evidence: m[0] };
      }
    }
    return false;
  },
};
