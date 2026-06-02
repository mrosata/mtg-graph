// pipeline/rules/effect.destroy_artifact.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.destroy_artifact',
  axis: 'effect',
  label: 'Destroys an artifact',
  description: 'Destroys a target artifact — directly, in a multi-type "artifact or enchantment" effect, or via a broad effect like "destroy target permanent" that covers artifacts.',
  pairsWith: ['trigger.artifact_leaves_battlefield'],
};

// Pattern A: own type (and common multi-type "artifact or enchantment" phrasing).
// 2026-06-01 audit Group 20 — Crash and Burn: "destroy target Vehicle".
// Vehicles are always artifacts (CR 205.3g), so admit `vehicles?` alongside
// `artifacts?` in the noun alternation. Mirrors the PATTERN_VEHICLE arm in
// effect.exile_artifact.
// 2026-06-01 audit batch — Light of Judgment: "destroy up to one Equipment
// attached to that creature". Equipment is an artifact subtype (CR
// 301.5/205.3g); destroying an Equipment is destroying an artifact. Same
// reasoning extends to Treasure / Food / Clue / Map / Powerstone / Blood /
// Junk — all artifact subtypes that produce or scale on artifact-typed
// payoffs.
const PATTERN_OWN =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)?(?:[\w\-]+[,\s]+){0,6}?(?:artifacts?|vehicles?|equipment|treasures?|foods?|clues?|maps?|powerstones?|bloods?|junks?)\b/;

// Pattern B: type-inclusive broad.
// v0.14.1 — filler relaxed to `[\w\-]+[,\s]+` so comma-separated multi-type
// filters like "destroy target noncreature, nonland permanent" (Molten
// Collapse) match. The "nonartifact" guard still catches explicit exclusions.
const PATTERN_BROAD =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+[,\s]+){0,5}nonartifact\s+)(?:[\w\-]+[,\s]+){0,5}?permanents?\b/;

export const rule: Rule = {
  id: 'effect.destroy_artifact',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['destroy'], proximity: ['artifact', 'permanent'], window: 8 },
};
