// pipeline/rules/effect.destroy_land.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.destroy_land',
  axis: 'effect',
  label: 'Destroys a land',
  description: 'Destroys a target land — directly, via a basic/nonbasic land destruction effect, or via a broad effect like "destroy target permanent".',
  pairsWith: ['trigger.land_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?lands?\b/;

const PATTERN_BROAD =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonland\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

// v0.14.27 — Krenko's Buzzcrusher: "destroy up to one nonbasic land that
// player controls". The `up to N` quantifier substitutes for the
// determiner slot (target/each/all/another). Pattern below admits the
// bare "up to N <qualifier> land" frame.
const PATTERN_UP_TO_N =
  /\bdestroy(?:s)?\s+up to (?:one|two|three|four|five|\w+)\s+(?:[\w\-]+[,\s]+){0,6}?lands?\b/;

export const rule: Rule = {
  id: 'effect.destroy_land',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD) ?? t.match(PATTERN_UP_TO_N);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['destroy'], proximity: ['land', 'permanent'], window: 8 },
};
