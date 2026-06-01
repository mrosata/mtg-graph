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
  /\b(?:cloak (?:the top card|that card|an?\s+\w+|target [\w\s]+|(?:one|two|three|four|five|\d+) of (?:them|those\s+\w+))|manifests?\s+dread)\b/;

// v0.22.0 — observer-side guard. "Whenever/when/each time you manifest dread"
// (Paranormal Analyst) is a trigger that OBSERVES the keyword action — the
// card itself doesn't cause a cloak. Suppress when the matched keyword is
// preceded by such a trigger leadin within ~25 chars. A runtime guard is
// cleaner than a fixed-width JS lookbehind here.
const OBSERVER_LEADIN = /(?:whenever|when|each time)\s+you\s+$/;

export const rule: Rule = {
  id: 'effect.cloak',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    if (!m) return false;
    if (m.index !== undefined) {
      const before = t.substring(Math.max(0, m.index - 25), m.index);
      if (OBSERVER_LEADIN.test(before)) return false;
    }
    return { evidence: m[0] };
  },
  // v0.21.0 — Manifest Dread (the sorcery card) collides with the keyword
  // action "manifest dread". The case-insensitive name-substitution in
  // pipeline/normalize.ts:42-44 replaces the card's own name with `__SELF__`
  // BEFORE the rule runs, clobbering the keyword. A targeted matchCard gate
  // keyed on `card.name` is the minimal fix. The broader bug (name segments
  // colliding with known keywords) is deferred.
  matchCard: (card) => {
    if (card.name === 'Manifest Dread') {
      return { evidence: 'Manifest Dread (card-name gate)' };
    }
    return false;
  },
  nearMiss: {
    anchors: ['cloak', 'manifest dread'],
    proximity: ['top card', 'target', 'that card'],
    window: 6,
  },
};
