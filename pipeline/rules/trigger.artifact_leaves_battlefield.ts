// pipeline/rules/trigger.artifact_leaves_battlefield.ts
import type { Rule } from './types';
import type { Card, TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.artifact_leaves_battlefield',
  axis: 'trigger',
  label: 'Triggers when an artifact leaves the battlefield',
  description: 'Triggers when an artifact leaves the battlefield (covers destroy, exile, bounce, sacrifice).',
  pairsWith: [
    'effect.destroy_artifact',
    'effect.exile_artifact',
    'effect.sacrifice_artifact',
    'effect.bounce_artifact',
  ],
};

const LTB_VERB = '(?:leaves the battlefield|is put into a graveyard from the battlefield)';

// v0.14.21 — `artifact` broadened to also match always-artifact subtype tokens
// (Clue, Treasure, Food, Equipment, Vehicle). Teysa Opulent Oligarch's
// "whenever a Clue you control is put into a graveyard from the battlefield"
// and Ygra Eater of All's "whenever a Food is put into a graveyard from the
// battlefield" are semantically artifact-LtB events for graph purposes.
// Mirrors the v0.14.19 THEME_SUBTYPES additions to condition.cares_subtype.
const ARTIFACT_OR_SUBTYPE = '(?:artifact|clue|treasure|food|equipment|vehicle)';

const PATTERN_TEXT = new RegExp(
  `\\bwhen(?:ever)?\\s+(?:a\\s+|an\\s+|another\\s+|the\\s+|each\\s+|each\\s+other\\s+|an?\\s+equipped\\s+)?(?:[\\w\\-]+\\s+){0,3}?${ARTIFACT_OR_SUBTYPE}(?:\\s+[\\w\\-]+){0,4}?\\s+${LTB_VERB}\\b`,
);

const PATTERN_SELF = new RegExp(
  `\\bwhen(?:ever)?\\s+(?:this\\s+\\w+\\s+|__self__\\s+)${LTB_VERB}\\b`,
);

export const rule: Rule = {
  id: 'trigger.artifact_leaves_battlefield',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN_TEXT);
    return m ? { evidence: m[0] } : false;
  },
  matchCard: (card: Card, normalizedText: string) => {
    if (!card.types.includes('Artifact')) return false;
    const m = normalizedText.match(PATTERN_SELF);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['leaves the battlefield'], proximity: ['artifact'], window: 6 },
};
