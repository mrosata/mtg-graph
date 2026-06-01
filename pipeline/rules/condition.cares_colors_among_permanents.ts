// pipeline/rules/condition.cares_colors_among_permanents.ts
//
// Vivid / 5-color payoff axis. "Colors among permanents you control",
// "multicolored spell" triggers, and "each color of mana spent" gates.
// Squawkroaster, Wildvine Pummeler, Rime Chill (Vivid mechanic), Mage Tower
// Referee (multicolored trigger), Puca's Eye (5-color activation gate).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_colors_among_permanents',
  axis: 'condition',
  label: 'Cares about colors / multicolor count',
  description:
    'Scales with or gates on the number of colors among permanents you control, multicolored spells, or colors of mana spent.',
  pairsWith: [],
  category: 'theme',
};

const PATTERNS = [
  // "N colors among permanents you control" — Vivid scaling
  /\b(?:number of|each|the) colors? (?:among|of) permanents (?:you control|your opponents control)\b/,
  // "for each color among permanents you control"
  /\bfor each color (?:among|of) permanents\b/,
  // Multicolored-spell trigger
  /\bwhenever you cast a multicolored spell\b/,
  // 5-color gate (activation or static)
  /\b(?:there are |if there are )?(?:five|5) colors? among permanents you control\b/,
  // "each color of mana spent to cast it" — sunburst-like scaling
  /\beach color of mana (?:spent to cast|used to cast)\b/,
];

export const rule: Rule = {
  id: 'condition.cares_colors_among_permanents',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['colors', 'multicolored'], proximity: ['permanents', 'spell', 'among'], window: 6 },
};
