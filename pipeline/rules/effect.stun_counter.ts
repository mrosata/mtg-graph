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
  // v0.35.0 — Batch 13: admit compound count expressions ("twice X",
  // "thrice X", "N times X") in the count slot so Procrastinate
  // ("Put twice X stun counters on it") matches. The MULT prefix is
  // optional so existing positives still work.
  /\bputs? (?:twice |thrice |\d+ times )?\s*(?:a |an |another |\d+ |x |one |two |three |four |target |any number of |up to (?:a |an |\d+ |one |two |three )?)?stun counters? on\b/,
  // Scaling — "for each stun counter on" / "for each stun counter you control".
  /\bfor each stun counter\b/,
  // Anaphoric — "has a stun counter on it" / "with a stun counter on it" — payoff gates.
  /\b(?:has|with) (?:a|an|another|\d+|x|one|two|three)\s+stun counters? on\b/,
  // v0.35.0 — Batch 13: ETB-with-stun-counters frame. Slumbering Trudge
  // ("This creature enters with a number of stun counters on it") uses
  // the static ETB form rather than the active "put" verb. Same axis;
  // counters are being placed at ETB. The count slot admits "a number
  // of" alongside numerics, X, and word-numbers.
  /\benters? with (?:a number of|a|an|another|\d+|x|one|two|three|four|five) (?:[\w\-]+ ){0,3}?stun counters? on\b/,
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
