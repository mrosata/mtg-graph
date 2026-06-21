import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.teamwork',
  axis: 'condition',
  label: 'Teamwork',
  description:
    'Has the Teamwork keyword (tap creatures with total power N as additional cost to unlock both spell modes).',
  pairsWith: [
    'effect.plus_one_counter',
    'effect.grants_stat_buff',
    'effect.create_creature_token',
    'trigger.tapped_or_untapped',
  ],
};

// Matches the keyword line "teamwork N" and the in-text trigger reference
// "teamwork cost". The word "teamwork" is not MTG vocabulary outside MSH,
// so a bare boundary match is sufficient.
const PATTERN = /\bteamwork\b/;

export const rule: Rule = {
  id: 'condition.teamwork',
  axis: 'condition',
  nearMiss: {
    anchors: ['tap', 'total power', 'additional cost'],
    proximity: ['teamwork', 'cost'],
    window: 20,
  },
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
};
