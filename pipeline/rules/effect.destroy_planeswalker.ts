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
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-\/]+[,\s]+){0,6}?planeswalkers?\b(?![^.]*\byou own\b)/;

const PATTERN_BROAD =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonplaneswalker\s+)(?:[\w\-]+\s+){0,5}?permanents?\b(?![^.]*\byou own\b)/;

// Pattern C: Vindicate-style chains. "destroy up to one target X, up to one
// target Y, up to one target enchantment, and up to one target planeswalker"
// exceeds PATTERN_OWN's {0,6} filler. Anchor on a leading `destroy` verb
// plus a later `target planeswalker[s]` within the same sentence (no
// intervening `.` or `\n`). Intermediate tokens between `target` and
// `planeswalkers?` are capped at 1.
const PATTERN_CHAINED =
  /\bdestroy(?:s)?\b[^.\n]*?\btarget\s+(?:[\w\-]+\s+)?planeswalkers?\b(?![^.]*\byou own\b)/;

export const rule: Rule = {
  id: 'effect.destroy_planeswalker',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD) ?? t.match(PATTERN_CHAINED);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['destroy'], proximity: ['planeswalker', 'permanent'], window: 8 },
};
