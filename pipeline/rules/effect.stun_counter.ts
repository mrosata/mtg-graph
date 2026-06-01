// pipeline/rules/effect.stun_counter.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.stun_counter',
  axis: 'effect',
  label: 'Puts stun counters',
  description: 'Puts stun counters on a permanent (modern tap-lock — the next untap step is skipped per counter, then the counter is removed). Soft-control / tap-lockdown axis. Distinct from effect.tap (which is the tap action itself) and from effect.plus_one_counter / effect.counter_modified (which are stat-changing counters).',
  pairsWith: [],
  category: 'theme',
};

// Stun counters are a recurring soft-control mechanic across MOM / OTJ / FDN /
// Bloomburrow. The producer half: "put N stun counter(s) on" or "for each
// stun counter on". Removal ("remove a stun counter") is a different axis
// (un-stun / cleanse) but rare enough that callers wanting "stun-counter-
// matters" can treat the put / scaling phrasings as the canonical anchor.
const PATTERNS = [
  // Producer — "put N stun counter(s) on X".
  /\bputs? (?:a |an |another |\d+ |x |one |two |three |four |target |any number of |up to (?:a |an |\d+ |one |two |three )?)?stun counters? on\b/,
  // Scaling — "for each stun counter on" / "for each stun counter you control".
  /\bfor each stun counter\b/,
  // Anaphoric — "has a stun counter on it" / "with a stun counter on it" — payoff gates.
  /\b(?:has|with) (?:a|an|another|\d+|x|one|two|three)\s+stun counters? on\b/,
];

export const rule: Rule = {
  id: 'effect.stun_counter',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['stun'], proximity: ['counter', 'counters'], window: 4 },
};
