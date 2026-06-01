// pipeline/rules/condition.cares_lifeloss.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_lifeloss',
  axis: 'condition',
  label: 'Cares about life loss',
  description: 'Triggers or scales off a player losing life. The vampire / aristocrat / OTJ outlaw payoff axis (mirror of condition.cares_lifegain).',
  pairsWith: ['effect.life_changed'],
};

// "Cares about life being lost" — mirror of condition.cares_lifegain. Common
// phrasings:
//   "whenever a player loses life..."          (trigger workhorse)
//   "whenever an opponent loses N or more life..."
//   "if an opponent lost life this turn..."    (Cindering Cutthroat — gating ETB)
//   "as long as an opponent has lost life this turn..."
//   "for each life lost this turn..."
// Must NOT fire on effect.life_changed (the *act* of losing life) — this axis
// is about PAYOFFS that gate or scale on the event having occurred.
const PATTERNS = [
  // "whenever/if/when/as long as <subject> lose(s|t) [N] [or more] life"
  // Subject slot admits player/opponent/target opponent/each opponent/you.
  /\b(?:whenever|if|when|as long as) [\w\s'’]+? los(?:e|t|es|ing) (?:\d+ |x )?(?:or more )?life\b/,
  // "for each [N] life ... lost" — quantity scaling.
  /\bfor each (?:\d+ )?life [\w\s]+? lost\b/,
  // "where X is the amount of life ... lost this turn" — X-scaling.
  /\b(?:amount of |number of |the )?life [\w\s']+? lost (?:this turn|since)\b/,
  // "X is the [amount of] life <player> lost this turn".
  /\blife (?:you|each opponent|each player|target opponent)\s+(?:'ve\s+|has\s+|have\s+)?lost this turn\b/,
  // Bare "an opponent / each opponent / you / target opponent lost life this
  // turn" frame — Cindering Cutthroat's ETB gate ("This creature enters with
  // a +1/+1 counter on it if an opponent lost life this turn"). The subject
  // is anchored to "opponent/player/you" so generic "lost life" prose
  // (battlefield trivia) doesn't leak.
  /\b(?:an? |any |each |target |another )?(?:opponent|player|you) (?:has |have )?lost life this turn\b/,
  // v0.21.0 — Kaito, Bane of Nightmares: "for each opponent who lost life
  // this turn" — relative-clause frame ("opponent(s) WHO (has|have)? lost
  // life this turn") gates a per-opponent count. Same axis as the bare
  // subject-lost-life frame above.
  /\b(?:opponent|player)s?\s+who\s+(?:has\s+|have\s+)?lost life this turn\b/,
];

export const rule: Rule = {
  id: 'condition.cares_lifeloss',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['lost', 'loses', 'lose'], proximity: ['life'], window: 6 },
};
