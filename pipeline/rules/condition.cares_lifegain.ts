// pipeline/rules/condition.cares_lifegain.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_lifegain',
  axis: 'condition',
  label: 'Cares about lifegain',
  description: 'Triggers or scales off life being gained.',
  pairsWith: ['effect.life_changed'],
};

// "Cares about life being gained" — distinct from effect.life_changed which is
// the *act* of gaining/losing life. Common phrasings:
//   "whenever you gain life..."             (trigger workhorse)
//   "whenever you gain N or more life..."
//   "if you've gained life this turn..."    (apostrophe form — common in 2024+)
//   "as long as you gained life this turn..." (infusion-style scaling)
//   "for each life you gained this turn..."
// Must NOT match "gains lifelink" (keyword-gain, false-positive bait).
const PATTERNS = [
  // "whenever/if/when/as long as ... gain(s|ed) [N|X] [or more] life"
  // Character class includes apostrophes to match contractions ("you've gained").
  /\b(?:whenever|if|when|as long as) [\w\s'’]+? gain(?:ed|s)? (?:\d+ |x )?(?:or more )?life\b/,
  // "for each [N] life ... gained" — quantity-scaling phrasing
  /\bfor each (?:\d+ )?life [\w\s]+? gained\b/,
  // "where X is the amount of life you gained this turn" — Gumdrop Poisoner
  /\b(?:amount of |number of |the )?life [\w\s']+? gained (?:this turn|since)\b/,
  // "X is the [amount of] life you gained this turn" — fallback
  /\blife (?:you|each opponent|each player|target opponent)\s+(?:'ve\s+)?gained this turn\b/,
  // v0.14.4 — Case-solve cumulative-lifegain gate, no trigger-verb prefix.
  // Case of the Uneaten Feast: "To solve — you've gained N or more life this turn."
  // The Case-solve clause has no whenever/if/when/as long as anchor; this
  // pattern catches the bare "you've/you have gained N or more life" frame.
  /\byou(?:'ve| have) gained (?:\d+ |x )?(?:or more )?life(?:\s+this turn)?\b/,
  // v0.20 — "gain or lose life" disjunction (Moonstone Harbinger, Star
  // Charter): "if you gained or lost life", "whenever you gain or lose life".
  // The base "gain ... life" regex requires `gain(ed|s)? life` adjacency,
  // which the "or los[et]" interpolation breaks.
  /\bgain(?:ed|s|ing)?\s+or\s+los(?:e|t|es|ing)?\s+life\b/,
];

export const rule: Rule = {
  id: 'condition.cares_lifegain',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['gain', 'gained', 'gains'], proximity: ['life'], window: 6 },
};
