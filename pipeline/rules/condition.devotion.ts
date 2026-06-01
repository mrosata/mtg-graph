// pipeline/rules/condition.devotion.ts
//
// Theros devotion — count of colored mana symbols among the mana costs of
// permanents you control toward a specific color. Five tags emitted, one per
// color. Body anchor is `devotion to <color>`; the parenthetical reminder text
// is stripped before tagging but the body reference survives.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

const COLORS = ['white', 'blue', 'black', 'red', 'green'] as const;
type Color = (typeof COLORS)[number];

function makeRule(color: Color): Rule {
  // Allow other color words to precede the target color in multi-color
  // devotion phrasing ("devotion to white and black", "devotion to red and
  // green") — both colors should fire.
  const re = new RegExp(`\\bdevotion to (?:(?:white|blue|black|red|green) and )?${color}\\b`);
  return {
    id: `condition.devotion.${color}`,
    axis: 'condition',
    match: (t) => {
      const m = t.match(re);
      return m ? { evidence: m[0] } : false;
    },
  };
}

export const rules: Rule[] = COLORS.map(makeRule);

export const tagDefs: TagDef[] = COLORS.map((color) => ({
  tagId: `condition.devotion.${color}`,
  axis: 'condition',
  label: `Devotion to ${color}`,
  description: `Scales or gates on devotion to ${color} — the count of {${color[0]!.toUpperCase()}} symbols in mana costs of permanents you control. The mono-color Theros payoff axis.`,
  pairsWith: [],
  category: 'theme',
}));
