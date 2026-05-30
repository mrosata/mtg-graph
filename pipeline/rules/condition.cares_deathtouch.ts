// pipeline/rules/condition.cares_deathtouch.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_deathtouch',
  axis: 'condition',
  label: 'Cares about deathtouch',
  description: 'References deathtouch creatures as a payoff group.',
  pairsWith: ['effect.has_deathtouch'],
};

// Payoff phrasings that scope to a group of deathtouch creatures:
//   "creatures with deathtouch"
//   "creature with deathtouch"
//   "creatures you control with deathtouch"
// The brief allows the bare "with deathtouch" — distinguishable from
// "gains deathtouch" because granting doesn't use "with" as a connector.
const PATTERN = /\b(?:creatures? )?(?:you control )?with deathtouch\b/;

// v0.14.1 — strip "becomes a [...] creature with deathtouch" framings before
// matching so the manland self-animation clause (Restless Reef,
// "this land becomes a 4/4 [...] creature with deathtouch") doesn't fire.
// Mirrors the stripFraming approach in condition.cares_tribe but is narrowed
// to the "with deathtouch" suffix so the strip removes the entire "creature
// with deathtouch" phrase (the PATTERN's bare "with deathtouch" arm would
// otherwise still match what's left).
// v0.14.6 — added "is/are" verbs to also cover Case-style self-animation
// (Case of the Gorgon's Kiss: "This Case is a 4/4 Gorgon creature with
// deathtouch") alongside the manland "becomes a [...]" form.
const BECOMES_CREATURE_WITH_DEATHTOUCH =
  /\b(?:becomes?|is|are)\s+(?:[\w\/]+\s+){1,12}?creature\s+with\s+deathtouch\b/g;
function stripFraming(t: string): string {
  return t.replace(BECOMES_CREATURE_WITH_DEATHTOUCH, '');
}

export const rule: Rule = {
  id: 'condition.cares_deathtouch',
  axis: 'condition',
  match: (t) => {
    const m = stripFraming(t).match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['with'], proximity: ['flying', 'menace', 'deathtouch'], window: 3 },
};
