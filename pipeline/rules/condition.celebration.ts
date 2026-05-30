// pipeline/rules/condition.celebration.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.celebration',
  axis: 'condition',
  label: 'Celebration',
  description:
    'Bloomburrow ability word. Gates an ability on "two or more nonland permanents entered the battlefield under your control this turn".',
  // Celebration cards count ETBs of permanents you control as the gate; the
  // natural producers are anything that drops multiple permanents in a turn.
  pairsWith: ['effect.create_creature_token', 'effect.create_token', 'trigger.another_creature_etb'],
};

// Ability-word frame: literal "celebration" followed by an em-dash (Unicode
// U+2014). Oracle normalization preserves the em-dash, so we require it as
// the anchor; the flavor noun "a celebration" won't match.
const PATTERN = /\bcelebration\s*—/;

export const rule: Rule = {
  id: 'condition.celebration',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['celebration'], proximity: ['nonland', 'permanents', 'this turn'], window: 12 },
};
