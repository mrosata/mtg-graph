// pipeline/rules/effect.has_offspring.ts
//
// Bloomburrow keyword. "Offspring {N}" — pay an additional {N} as you cast
// this creature; if you do, create a 1/1 token copy of it on ETB. The cost
// suffix and the keyword cohabit a single line; the reminder text in
// parens is stripped pre-tagging, leaving "offspring {<cost>}" as the
// only signal.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_offspring',
  axis: 'effect',
  label: 'Has offspring',
  description:
    'Has the Offspring keyword — pay an additional cost as you cast to create a 1/1 token copy of this creature on ETB. Bloomburrow keyword.',
  // Producers: token-payoff axes care that offspring creates a token copy.
  // trigger.token_created fires on the token-creation event.
  pairsWith: ['condition.cares_tokens', 'trigger.token_created'],
};

// Pattern: literal "offspring " followed by a mana-cost symbol expression
// like {2}, {b}, {3}{r}. Required cost suffix excludes flavor / non-keyword
// uses of the word "offspring".
const PATTERN = /\boffspring \{[^}]+\}/;

export const rule: Rule = {
  id: 'effect.has_offspring',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['offspring'], proximity: ['{', 'pay'], window: 4 },
};
