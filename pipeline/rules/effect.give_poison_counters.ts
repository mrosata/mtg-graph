// pipeline/rules/effect.give_poison_counters.ts
//
// Places poison counters on a player — the poison / infect / toxic damage
// axis. Distinct from `effect.counter_modified` (generic counter placement).
// Pairs with `condition.cares_poison` payoffs.
//
// Standard producers (current artifact): Fynn, the Fangbearer; Persuasive
// Interrogators; Virulent Silencer; Bloodroot Apothecary (Toxic 2);
// Vraska, Betrayal's Sting (-9 ultimate). The toxic-keyword reminder text is
// stripped during normalization, so toxic creatures get this tag via the
// separate `effect.has_toxic` rule rather than via the bare "toxic N"
// keyword line.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.give_poison_counters',
  axis: 'effect',
  label: 'Gives poison counters',
  description:
    'Places poison counters on a player — the poison / infect / toxic damage axis. Distinct from `effect.counter_modified` (generic counter placement).',
  pairsWith: ['condition.cares_poison'],
};

// "<subject> get(s) <amount> poison counter(s)" — the canonical direct-give
// frame. Subject admits the usual player slots (target/each/that player,
// any opponent, you). Amount admits a digit, X, "a", or the English
// number words used on Standard cards (one/two/three plus "a number of"
// for Vraska, Betrayal's Sting's variable form).
//
// Mere mentions like "for each poison counter on that player" must NOT
// match — those are the cares-poison axis, not production. The "gets"
// verb is the disambiguator: production frames put it on the player as
// an effect; the cares-poison frame uses "has/with poison counters".
const NUMBER_WORD = '(?:\\d+|x|a|an|one|two|three|four|five|six|seven|eight|nine|ten|a number of)';
const SUBJECT = '(?:target (?:player|opponent)|each (?:player|opponent)|that (?:player|opponent)|any (?:player|opponent)|they|you)';
const PATTERN = new RegExp(
  `\\b${SUBJECT} (?:gets?|get) ${NUMBER_WORD} poison counters?\\b`,
);

export const rule: Rule = {
  id: 'effect.give_poison_counters',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['poison'], proximity: ['gets', 'get', 'counter', 'counters'], window: 6 },
};
