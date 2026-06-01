// pipeline/rules/effect.cant_lose.ts
//
// Alt-win-condition locks ("You can't lose the game" / "Your opponents can't
// win the game"). Platinum Angel, Herald of Eternal Dawn, Phyrexian Unlife,
// Felidar Sovereign-style life-gain payoff cards. Distinct from gain-life
// effects — this is the binary "lose condition suppressed" axis.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.cant_lose',
  axis: 'effect',
  label: "Can't lose the game",
  description:
    "Suppresses a loss condition (\"you can't lose the game\", \"your opponents can't win\", \"you don't lose the game for having 0 or less life\").",
  pairsWith: [],
  category: 'theme',
};

const PATTERNS = [
  // Direct lock: "you can't lose the game" / "your opponents can't win"
  /\byou can(?:not|'?t) lose the game\b/,
  /\byour opponents? can(?:not|'?t) win the game\b/,
  // Conditional lock: "you don't lose the game for having 0 or less life",
  // "you don't lose the game for having too many poison counters"
  /\byou don'?t lose the game (?:for|because|due to)\b/,
];

export const rule: Rule = {
  id: 'effect.cant_lose',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ["can't", 'cannot'], proximity: ['lose', 'game', 'win'], window: 6 },
};
