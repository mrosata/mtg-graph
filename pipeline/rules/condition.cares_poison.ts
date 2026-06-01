// pipeline/rules/condition.cares_poison.ts
//
// Triggers, scales, or gates on poison counters on players. The Vraska's
// Fall / Skithiryx-payoff / Toxic Onslaught axis. Pairs with the producer
// (`effect.give_poison_counters`).
//
// Must NOT fire on bare "<subject> gets N poison counters" — those are the
// PRODUCTION axis (effect.give_poison_counters). The cares-poison frame is
// "for each poison counter on X", "X has/with N or more poison counters",
// "whenever an opponent gets a poison counter" (the post-event payoff),
// and the "lose the game" gate that appears outside reminder text on some
// rules-text cards.
//
// Notes:
//   - Fynn's reminder text "(A player with ten or more poison counters loses
//     the game.)" is stripped during normalization, so Fynn itself does NOT
//     fire condition.cares_poison — that's intentional. Fynn is the producer.
//   - "they get a number of poison counters equal to the difference" (Vraska,
//     Betrayal's Sting) is a HYBRID — the same line both produces and scales.
//     Match here because the gating clause precedes it ("if target player has
//     fewer than nine poison counters").
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_poison',
  axis: 'condition',
  label: 'Cares about poison counters',
  description:
    'Triggers, scales, or gates on poison counters on players. The poison-payoff axis (mirror of `effect.give_poison_counters`).',
  pairsWith: ['effect.give_poison_counters'],
};

// "for each poison counter[s]?" — quantity-scaling frame.
const FOR_EACH = /\bfor each poison counters?\b/;

// "number of poison counters" / "amount of poison counters" — scaling.
const COUNT_OF = /\b(?:number|amount) of poison counters?\b/;

// "<player-subject> has/have/with N or more poison counters" — threshold
// gate. Subject admits target/a/each/that player or opponent (and "they"
// as anaphoric back-reference). Number admits digits and English numerals
// up to ten (the canonical "ten or more poison counters" loss condition).
const NUMBER_WORD = '(?:\\d+|x|a|one|two|three|four|five|six|seven|eight|nine|ten)';
const THRESHOLD = new RegExp(
  `\\b(?:target |a |an |each |that |any )?(?:player|opponent|opponents)\\s+(?:has|have|with|gets?)\\s+(?:fewer than\\s+)?${NUMBER_WORD}\\s+or more poison counters?\\b`,
);

// Also: "if/whenever/as long as <player> ... fewer than N poison counters"
// — the lower-bound gate (Vraska's-Sting -9 ult).
const FEWER_THAN = /\bfewer than (?:\d+|x|one|two|three|four|five|six|seven|eight|nine|ten) poison counters?\b/;

// "whenever <subject> gets a poison counter" — post-event payoff (someone
// who triggers off poison-counter placement). Distinct from the producer
// frame ("that player gets two poison counters") because the trigger verb
// "whenever" anchors it as a condition.
const WHENEVER_GETS = /\bwhenever (?:a |an |each |target |that |any )?(?:player|opponent)s? gets? (?:a |an |one |two |three |\d+ )?poison counters?\b/;

const PATTERNS = [FOR_EACH, COUNT_OF, THRESHOLD, FEWER_THAN, WHENEVER_GETS];

export const rule: Rule = {
  id: 'condition.cares_poison',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['poison'], proximity: ['for', 'each', 'has', 'have', 'with', 'more'], window: 6 },
};
