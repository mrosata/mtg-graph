// pipeline/rules/effect.alt_win_condition.ts
//
// Alt-win-condition family — flags cards that produce a non-damage win
// (Maze's End, Approach of the Second Sun, Felidar Sovereign, Test of
// Endurance, Mortal Combat, Triskaidekaphile, Mechanized Production,
// Hellkite Tyrant). Also covers the symmetric alt-loss-imposed direction
// (Door to Nothingness, Lich's Mirror-style payoffs) — both are "this card
// ends the game" effects and read as a single archetype axis.
//
// Distinct from `effect.cant_lose` (lose-condition suppression).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.alt_win_condition',
  axis: 'effect',
  label: 'Alt win/lose condition',
  description:
    'Triggers a "you win the game" or imposed "target opponent/player loses the game" alt-win-con. Approach of the Second Sun / Felidar Sovereign / Maze\'s End / Triskaidekaphile / Door to Nothingness family.',
  pairsWith: [],
  category: 'theme',
};

const PATTERNS = [
  // Self alt-win: "you win the game". This is the canonical alt-win frame
  // and is highly specific — base-rules wording uses "wins" / "loses" against
  // a referenced player, never "you win the game".
  /\byou win the game\b/,
  // Imposed alt-loss: a card-effect verb makes a targeted player lose. The
  // patterns require a "target/that/an opponent or player" subject and the
  // present-tense "loses the game" — base-game prose explaining the loss
  // condition reads differently ("if a player has 0 or less life…").
  /\b(?:target|an?|that|each|chosen) (?:opponent|player) loses? the game\b/,
  /\bopponents? loses? the game\b/,
];

export const rule: Rule = {
  id: 'effect.alt_win_condition',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['win the game', 'loses the game'], proximity: ['you', 'opponent', 'player'], window: 6 },
};
