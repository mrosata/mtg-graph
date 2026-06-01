// pipeline/rules/effect.has_leyline.ts
//
// "Leyline" opening-hand-deploy ability. Distinctive single-frame mechanic
// shared by the Leyline cycle (Leyline of Anticipation, Leyline of the Void,
// Leyline of Sanctity, Leyline Axe, etc.). Tags the "starts in play" axis —
// players hunting for free deploys can filter on this directly.
//
// Oracle text is highly stable across reprints: "If this card is in your
// opening hand, you may begin the game with it on the battlefield." An
// exact-phrase anchor suffices.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_leyline',
  axis: 'effect',
  label: 'Has Leyline',
  description:
    'Has the Leyline opening-hand-deploy ability — "If this card is in your opening hand, you may begin the game with it on the battlefield." Unique starts-in-play axis.',
  pairsWith: [],
  category: 'theme',
};

const PATTERN = /\bif this card is in your opening hand, you may begin the game with it on the battlefield\b/;

export const rule: Rule = {
  id: 'effect.has_leyline',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['opening hand'], proximity: ['begin', 'game', 'battlefield'], window: 12 },
};
