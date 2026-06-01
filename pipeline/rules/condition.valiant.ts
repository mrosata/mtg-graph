// pipeline/rules/condition.valiant.ts
//
// Bloomburrow ability word. Gates an ability on "this creature becomes the
// target of a spell or ability you control for the first time each turn".
// The cards present this as `Valiant — <trigger>` with the em-dash anchor,
// so the rule keys on the literal "valiant —" header (U+2014) and won't
// fire on the flavor adjective "valiant" elsewhere in oracle text.
//
// Parallel to condition.celebration / condition.descend — same ability-word
// family from the BLB block.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.valiant',
  axis: 'condition',
  label: 'Valiant',
  description:
    'Bloomburrow ability word. Gates an ability on "this creature becomes the target of a spell or ability you control for the first time each turn".',
  // Producers: anything that targets your own creatures and ticks the
  // once-per-turn valiant counter. Pump spells (+N/+N), counter-placement,
  // and blink/bounce are the canonical enablers.
  pairsWith: ['effect.plus_one_counter', 'effect.grants_stat_buff', 'effect.bounce_or_blink'],
};

// Ability-word frame: literal "valiant" followed by an em-dash (Unicode
// U+2014). Mirrors condition.celebration's anchor.
const PATTERN = /\bvaliant\s*—/;

export const rule: Rule = {
  id: 'condition.valiant',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['valiant'], proximity: ['target', 'first time', 'each turn'], window: 12 },
};
