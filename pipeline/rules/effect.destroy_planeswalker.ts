// pipeline/rules/effect.destroy_planeswalker.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.destroy_planeswalker',
  axis: 'effect',
  label: 'Destroys a planeswalker',
  description: 'Destroys a target planeswalker — directly, in a "creature or planeswalker" effect, or via a broad effect like "destroy target permanent".',
  pairsWith: ['trigger.planeswalker_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?planeswalkers?\b/;

const PATTERN_BROAD =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonplaneswalker\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.destroy_planeswalker',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['destroy'], proximity: ['planeswalker', 'permanent'], window: 8 },
};
