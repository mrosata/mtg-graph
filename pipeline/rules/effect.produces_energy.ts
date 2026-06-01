// pipeline/rules/effect.produces_energy.ts
//
// Energy counter production — `you get {E}` (one or more). Energy is a
// Kaladesh/Modern Horizons mechanic that produces a player-side counter
// distinct from +1/+1 / poison / experience. The graph treats production
// and spending as paired axes.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.produces_energy',
  axis: 'effect',
  label: 'Produces energy',
  description: 'Produces one or more {E} (energy counters) for the controller.',
  pairsWith: ['condition.cares_energy'],
};

// `you get {E}` (one), `you get {E}{E}` (multiple), `you get N {E}` /
// `you get six {E}` (numeric quantifier), `you get an amount of {E}` (variable).
// `you get` is the canonical templating; covers static, ETB, attack, cast, and
// landfall triggers without further variation.
const PATTERN =
  /\byou get (?:(?:an additional\s+)?(?:an?|one|two|three|four|five|six|seven|eight|nine|ten|x|that many|an amount of|\d+)\s+)?\{e\}/;

export const rule: Rule = {
  id: 'effect.produces_energy',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['{e}', 'energy'], proximity: ['get', 'you'], window: 6 },
};
