// pipeline/rules/effect.cloak.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.cloak',
  axis: 'effect',
  label: 'Cloak',
  description:
    'MKM/DSK keyword action. Produces a face-down 2/2 creature (with ward {2}) from a specified source — `cloak` (target card on top of library, opponent\'s card you don\'t own, etc.) or `manifest dread` (look at top 2, cloak one + mill the other). The face-down creature can be turned face up later by paying its disguise cost.',
  pairsWith: ['trigger.turned_face_up'],
};

// Match either:
//   1. `cloak <object>` — verb form with a target or anaphoric object
//      ("cloak the top card", "cloak that card", "cloak target ...",
//       "cloak two of them", "cloak one of those cards")
//   2. `manifest dread` — the DSK keyword action (its reminder text "cloak
//      one of those cards" is stripped pre-rule, so the bare keyword is
//      what survives in normalized text)
//
// The verb-form alternation requires an object slot, so "cloaked creature"
// (the noun result) and a bare "cloak." command cannot match.
const PATTERN =
  /\b(?:cloak (?:the top card|that card|an?\s+\w+|target [\w\s]+|(?:one|two|three|four|five|\d+) of (?:them|those\s+\w+))|manifest dread)\b/;

export const rule: Rule = {
  id: 'effect.cloak',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['cloak', 'manifest dread'],
    proximity: ['top card', 'target', 'that card'],
    window: 6,
  },
};
