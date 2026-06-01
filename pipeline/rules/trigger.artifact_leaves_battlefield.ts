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

const LTB_VERB = '(?:leaves? the battlefield|(?:is|are) put into a graveyard from the battlefield)';

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

// Active-voice self-sacrifice: "when you sacrifice it/this/__self__". Carrot
// Cake's "when you sacrifice it" is semantically a self-LtB event but uses the
// active-voice frame with a pronoun antecedent. Scoped via matchCard to
// artifact-typed cards (the caller checks card.types) so it doesn't leak onto
// creatures, where trigger.permanent_sacrificed is the correct home.
// v0.20.0 — extend to admit "this artifact / equipment / vehicle / food /
// clue / treasure" typed forms (Disturbing Mirth family-wide mirror).
const PATTERN_SELF_ACTIVE_SACRIFICE = /\bwhen(?:ever)?\s+you\s+sacrifices?\s+(?:it|this(?:\s+(?:artifact|equipment|vehicle|food|clue|treasure))?|__self__)\b/;

// Active-voice sacrifice frame: "Whenever {opponent|player|each opponent}
// sacrifices a/an {artifact-or-subtype}". Sacrificing IS a LtB event, so
// the punisher axis (Vengeful Tracker, Goblin Bombardment-adjacent) wants
// this trigger to pair with effect.sacrifice_artifact producers. The
// subject is deliberately scoped to "opponent" / "player" / "each opponent"
// / "each player" / "any opponent" / "another player" — controller-self
// sacrifice ("whenever you sacrifice X") belongs to trigger.permanent_sacrificed
// (aristocrats axis) and is excluded here so the two trigger axes stay
// disjoint.
const PATTERN_OPPONENT_SACRIFICE = new RegExp(
  `\\bwhen(?:ever)?\\s+(?:an?\\s+|each\\s+(?:other\\s+)?|any\\s+|another\\s+|target\\s+)?(?:opponent|player)\\s+sacrifices?\\s+(?:a|an|another)\\s+${ARTIFACT_OR_SUBTYPE}\\b`,
);

export const rule: Rule = {
  id: 'trigger.artifact_leaves_battlefield',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN_TEXT) ?? t.match(PATTERN_OPPONENT_SACRIFICE);
    return m ? { evidence: m[0] } : false;
  },
  matchCard: (card: Card, normalizedText: string) => {
    if (!card.types.includes('Artifact')) return false;
    const m =
      normalizedText.match(PATTERN_SELF) ??
      normalizedText.match(PATTERN_SELF_ACTIVE_SACRIFICE);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['leaves the battlefield'], proximity: ['artifact'], window: 6 },
};
