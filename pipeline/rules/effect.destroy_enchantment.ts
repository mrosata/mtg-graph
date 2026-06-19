// pipeline/rules/effect.destroy_enchantment.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.destroy_enchantment',
  axis: 'effect',
  label: 'Destroys an enchantment',
  description: 'Destroys a target enchantment — directly, in an "artifact or enchantment" effect, or via a broad effect like "destroy target permanent".',
  pairsWith: ['trigger.enchantment_leaves_battlefield'],
};

// Pattern A: own type (and common multi-type "artifact or enchantment" phrasing).
const PATTERN_OWN =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?enchantments?\b(?![^.]*\byou own\b)/;

// Pattern B: type-inclusive broad.
// v0.14.1 — filler relaxed to `[\w\-]+[,\s]+` so comma-separated multi-type
// filters like "destroy target noncreature, nonland permanent" (Molten
// Collapse) match. The "nonenchantment" guard still catches explicit
// exclusions.
const PATTERN_BROAD =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+[,\s]+){0,5}nonenchantment\s+)(?:[\w\-]+[,\s]+){0,5}?permanents?\b(?![^.]*\byou own\b)/;

// Pattern C: Vindicate-style chains. "destroy up to one target X, up to one
// target Y, up to one target enchantment, and up to one target Z" exceeds
// PATTERN_OWN's {0,6} filler. Anchor on a leading `destroy` verb plus a later
// `target enchantment[s]` within the same sentence (no intervening `.` or
// `\n`). Intermediate tokens between `target` and `enchantments?` are
// capped at 1 to avoid matching unrelated `target X with enchantments
// attached` phrasings.
const PATTERN_CHAINED =
  /\bdestroy(?:s)?\b[^.\n]*?\btarget\s+(?:[\w\-]+\s+)?enchantments?\b(?![^.]*\byou own\b)/;

// v0.20.0 — enchantment-subtype-named destroys. "Destroy target Room" (and
// Aura / Saga / Class / Curse / Shrine / Background) destroys an
// enchantment because those types are all enchantment subtypes.
const PATTERN_SUBTYPE =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:rooms?|auras?|sagas?|classes|curses?|shrines?|backgrounds?)\b/;

export const rule: Rule = {
  id: 'effect.destroy_enchantment',
  axis: 'effect',
  match: (t) => {
    const m =
      t.match(PATTERN_OWN) ??
      t.match(PATTERN_BROAD) ??
      t.match(PATTERN_CHAINED) ??
      t.match(PATTERN_SUBTYPE);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['destroy'], proximity: ['enchantment', 'permanent'], window: 8 },
};
