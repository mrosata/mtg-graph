// pipeline/rules/trigger.turned_face_up.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.turned_face_up',
  axis: 'trigger',
  label: 'On turning face up',
  description:
    'Triggers when a face-down permanent is turned face up. Covers both Disguise-printed cards flipping themselves (self-trigger frame) AND payoffs that care about ANY face-down creature being turned face up (Case of the Pilfered Proof). Also matches the rare "as this creature is turned face up" replacement-effect frame (Bubble Smuggler).',
  pairsWith: ['effect.has_disguise', 'effect.cloak'],
};

// Two alternations. The first is the common self-trigger frame:
//   "When/as this <type> (enters or)? is turned face up, ..."
// (Bubble Smuggler is the only "as" replacement; everything else uses "when".)
// Permanent-type alternation mirrors trigger.self_etb (case + class added).
// equipment + vehicle added for Disguise-printed non-creature permanents.
// "enters or" optional group handles cards that combine ETB + face-up into one line.
const SELF_FRAME =
  /\b(?:when|as) this (?:creature|land|permanent|artifact|equipment|enchantment|saga|case|vehicle)(?:\s+enters or)? is turned face up\b/;

// The second is the broader "whenever any X is turned face up" payoff frame
// (Case of the Pilfered Proof). The non-greedy [\w\s]+? filler is bounded by
// the `is turned face up` anchor, so no catastrophic backtracking.
const WHENEVER_ANY =
  /\b(?:when|whenever) (?:a|each|any|another) [\w\s-]+? is turned face up\b/;

// v0.14.20 — compound subject "this <type> or another <subject>" (Pyrotechnic
// Performer). The self-half is a self-flip; the other-half is the
// face-up-of-other axis. Mirrors the trigger.self_etb / another_creature_etb
// compound-subject broadening.
const COMPOUND_SUBJECT =
  /\b(?:when|whenever) this (?:creature|land|permanent|artifact|equipment|enchantment|saga|case|vehicle) or (?:a|another|one or more) [\w\-\s]{1,40}? is turned face up\b/;

// v0.21.0 — active-voice "you turn X face up" (Growing Dread: "whenever you
// turn a permanent face up, put a +1/+1 counter on it"). Same axis as the
// passive "is turned face up" — just framed from the controller's
// perspective. Bound the noun-phrase filler at 3 words to stay tight.
const ACTIVE_VOICE =
  /\bwhen(?:ever)?\s+you\s+turn\s+(?:a|an|another|target)\s+[\w\-]+(?:\s+\w+){0,3}?\s+face up\b/;

export const rule: Rule = {
  id: 'trigger.turned_face_up',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(SELF_FRAME) ?? t.match(WHENEVER_ANY) ?? t.match(COMPOUND_SUBJECT) ?? t.match(ACTIVE_VOICE);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['turned face up'],
    proximity: ['when', 'as', 'whenever', 'this creature', 'this land'],
    window: 4,
  },
};
