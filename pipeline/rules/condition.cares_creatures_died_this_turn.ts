// pipeline/rules/condition.cares_creatures_died_this_turn.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_creatures_died_this_turn',
  axis: 'condition',
  label: 'Cares about creatures that died this turn',
  description: 'Scales or gates on the count of creatures that died this turn (morbid / aftermath / aristocrat-bookkeeping payoffs). Distinct from `trigger.creature_dies` which fires at the moment of death.',
  pairsWith: [
    'effect.sacrifice_creature',
    {
      tagId: 'effect.create_creature_token',
      requiresOnSource: ['effect.sacrifice_creature', 'effect.sacrifice_permanent'],
    },
  ],
};

// "creature(s) that died this turn" / "for each creature that died this turn"
// / "the number of creatures that died this turn" — Aftermath-style count
// scaling. The "died this turn" suffix is the discriminator; raw "creature
// dies" without the time scope is `trigger.creature_dies`, not this.
const PATTERN =
  /\b(?:creatures? (?:that |you control )?|number of creatures? )(?:[\w\-\s]{0,40}?)?died (?:under your control )?this turn\b/;

// v0.14.15 — "creature card was/were put into your graveyard (from anywhere)?
// this turn" — Macabre Reconstruction. Functionally broader than "died" (a
// milled / discarded creature card also counts), but the same morbid /
// aristocrats payoff family for graph purposes. Accepts "a creature card"
// singular and "one or more creature cards" plural with the corresponding
// verb agreement.
const PATTERN_PUT_INTO_GRAVEYARD =
  /\b(?:a creature card|(?:one or more )?creature cards?) (?:was|were|have been) put into (?:your|a) graveyards? (?:from anywhere )?this turn\b/;

export const rule: Rule = {
  id: 'condition.cares_creatures_died_this_turn',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(PATTERN_PUT_INTO_GRAVEYARD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['died this turn', 'put into'], proximity: ['creature', 'each', 'number', 'graveyard'], window: 6 },
};
