// pipeline/rules/effect.play_extra_land.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.play_extra_land',
  axis: 'effect',
  label: 'Lets you play extra lands',
  description: 'Lets a player play an additional land (or more) on their turn. Exploration / Azusa / Plant Beans family.',
  pairsWith: ['condition.cares_lands'],
};

// "you may play an additional land" / "play an additional land each turn" /
// "play two additional lands this turn" — the extra-land-drop family.
const PATTERN =
  /\bplay (?:an? |one |two |three |\d+ )?additional lands?\b/;

export const rule: Rule = {
  id: 'effect.play_extra_land',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['additional'], proximity: ['land', 'play'], window: 4 },
};
