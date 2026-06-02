// pipeline/rules/effect.bounce_artifact.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_artifact',
  axis: 'effect',
  label: 'Bounces or blinks an artifact',
  description: 'Returns an artifact to hand, or exiles and returns it.',
  pairsWith: ['trigger.artifact_leaves_battlefield'],
};

const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+|this\s+)(?:[\w\-]+[,\s]+){0,5}?(?:artifacts?|equipment|vehicles?)(?!\s+card)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

const PATTERN_BLINK_OWN =
  /\bexile(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+|this\s+)?(?:[\w\-]+[,\s]+){0,5}?(?:artifacts?|equipment|vehicles?)(?!\s+card)[^.]*?(?:,\s+then\s+return|\.\s+return)/;

// `(?!\s+card)` + graveyard guard reject "return target permanent card from
// your graveyard to your hand" (graveyard recursion, e.g. Coati Scavenger).
// v0.20 — admit commas in the qualifier filler so "nonland, nontoken
// permanent" (Season of Weaving) is reached. Both occurrences of the filler
// updated: the negative lookahead's "nonartifact" gate must also span commas
// so it still rejects "nontoken nonartifact permanent" forms.
const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+|this\s+)?(?!(?:[\w\-]+[,\s]+){0,5}nonartifact\s+)(?:[\w\-]+[,\s]+){0,5}?permanents?(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owner'?s|their\s+owners'?)\s+hands?\b/;

export const rule: Rule = {
  id: 'effect.bounce_artifact',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_RETURN_OWN) ?? t.match(PATTERN_BLINK_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return', 'exile'], proximity: ['artifact', 'permanent', 'hand'], window: 12 },
};
