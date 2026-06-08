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
  // v0.24 — admits a trailing "and a/N <X> counter(s)" tail before "on" so
  // DSK keyword-counter cards ("put a +1/+1 counter and a trample counter on
  // target creature") still match. Champion of Dusan, Kheru Goldkeeper.
  /\bputs? (?:a |an |another |\d+ |that many |x |one |two |three |four |five |six |seven |eight |target |any number of |up to (?:a |an |\d+ |one |two |three )?)?\+1\/\+1 counters?(?:\s+and\s+(?:a |an |\d+ |one |two |three )?\w+ counters?)? on/,
  // variable-count: "put a number of +1/+1 counters equal to … on …" (Gruff Triplets)
  /\bputs? a number of \+1\/\+1 counters? (?:equal to |on )/,
  // multi-target distribute: "distribute N +1/+1 counters among <targets>"
  /\bdistributes? (?:\d+ |x |that many |one |two |three |four |five )?\+1\/\+1 counters? among/,
  // ETB modifier: "enters [the battlefield] with a/N +1/+1 counter(s) on".
  // v0.19 — admits "additional" between the determiner and "+1/+1" (Gev,
  // Scaled Scorch: "enter with an additional +1/+1 counter on them ..."),
  // mirroring the existing "with N additional +1/+1" reanimate arm.
  /enters? (?:the battlefield )?with (?:a |an |another |\d+ |x |one |two |three )?(?:additional )?\+1\/\+1 counters?/,
  // blink/return-with: "return ... with a +1/+1 counter on". v0.12.9: accept
  // "x" and "(N|x) additional" as quantifiers (Abuelo's Awakening — reanimate
  // with X additional +1/+1 counters). Filler window bumped from 80 to 120
  // to admit "from your graveyard to the battlefield" between "return" and
  // "with".
  /\breturns? [^.]{0,120}? with (?:a |an |\d+ |x |one |two |three |four |five )?(?:additional )?\+1\/\+1 counter/,
  // doubling: "double the number of +1/+1 counters on"
  /double the number of \+1\/\+1 counters? on/,
  // 2026-06-01 audit Group 17 — Hardened-Scales / Branching Evolution
  // replacement frame (Caradora, Heart of Alacria): "If one or more +1/+1
  // counters would be put on <subject>, that many plus N +1/+1 counters are
  // put on <subject> instead" — or "twice/three times that many". Both halves
  // describe putting counters; semantically a counter-adder.
  /\bif one or more \+1\/\+1 counters would be put on [^.]{0,120}? \+1\/\+1 counters? are put on [^.]{0,60}? instead\b/,
  // v0.35.0 — Batch 13: move-counter frame. Tester of the Tangential ("move
  // X +1/+1 counters from this creature onto another target creature").
  // Target-side addition implies +1/+1 placement on the destination — fits
  // the plus_one_counter axis. The source-side removal also fits
  // effect.counter_modified.
  /\bmove\s+(?:\d+|x|one|two|three|four|five|any number of)\s+\+1\/\+1 counters?\s+from\s+[^.]{0,40}?\s+onto\b/,
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
