// pipeline/rules/effect.plus_one_counter.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.plus_one_counter',
  axis: 'effect',
  label: 'Puts +1/+1 counters',
  description: 'Puts +1/+1 counters on creatures (direct, ETB-with, blink-with, or doubling).',
  pairsWith: ['condition.cares_plus_one_counter'],
};

const PATTERNS = [
  // direct put: "put a/N +1/+1 counter(s) on ..."
  /\bputs? (?:a |an |another |\d+ |that many |x |one |two |three |four |five |six |seven |eight |target |any number of |up to (?:a |an |\d+ |one |two |three )?)?\+1\/\+1 counters? on/,
  // variable-count: "put a number of +1/+1 counters equal to … on …" (Gruff Triplets)
  /\bputs? a number of \+1\/\+1 counters? (?:equal to |on )/,
  // multi-target distribute: "distribute N +1/+1 counters among <targets>"
  /\bdistributes? (?:\d+ |x |that many |one |two |three |four |five )?\+1\/\+1 counters? among/,
  // ETB modifier: "enters [the battlefield] with a/N +1/+1 counter(s) on"
  /enters? (?:the battlefield )?with (?:a |an |another |\d+ |x |one |two |three )?\+1\/\+1 counters?/,
  // blink/return-with: "return ... with a +1/+1 counter on". v0.12.9: accept
  // "x" and "(N|x) additional" as quantifiers (Abuelo's Awakening — reanimate
  // with X additional +1/+1 counters). Filler window bumped from 80 to 120
  // to admit "from your graveyard to the battlefield" between "return" and
  // "with".
  /\breturns? [^.]{0,120}? with (?:a |an |\d+ |x |one |two |three |four |five )?(?:additional )?\+1\/\+1 counter/,
  // doubling: "double the number of +1/+1 counters on"
  /double the number of \+1\/\+1 counters? on/,
];

export const rule: Rule = {
  id: 'effect.plus_one_counter',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
};
