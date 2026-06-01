// pipeline/rules/condition.cares_planeswalkers.ts
//
// Cards that gate or scale on planeswalker presence — the "Superfriends"
// payoff axis. Includes:
//   (1) Anthem-style "planeswalkers you control have/gain X" subject.
//   (2) Attack triggers gated on "attacking you and/or planeswalkers you control".
//   (3) "For each planeswalker" scaling.
//   (4) Affinity for planeswalkers — cost-reduction keyword variant.
//   (5) "Choose a planeswalker you control" targeting subject.
//
// Distinct from `effect.<verb>_planeswalker` family (single-target removal
// or interaction on a planeswalker), which already exists.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_planeswalkers',
  axis: 'condition',
  label: 'Cares about planeswalkers',
  description:
    'References planeswalker count, planeswalkers you control, or "for each planeswalker" scaling — the Superfriends payoff axis.',
  // No natural producer pairings — there's no "create planeswalker" tag
  // and the existing per-planeswalker-verb tags are removal effects, not
  // synergy enablers.
  pairsWith: [],
};

const PATTERNS = [
  // (1) "planeswalker(s) you control" — anthem / scaling subject. The
  // negative lookbehind excludes "this " so a planeswalker self-referring
  // to itself doesn't fire (planeswalker cards aren't a cares_X payoff
  // by virtue of being one).
  /(?<!this\s)\bplaneswalkers?\s+you control\b/,
  // (2) "and/or planeswalkers? you control" — combo-subject in attack
  // triggers (Tomik). Already covered by P1 since P1 doesn't anchor on a
  // preceding word, but explicit alt for documentation.
  // (3) "for each planeswalker"
  /\bfor each planeswalker\b/,
  // (4) "affinity for planeswalkers"
  /\baffinity for planeswalkers\b/,
  // (5) "a planeswalker you control" (e.g. "or a planeswalker you
  // control" in Eriette-style attack triggers, "choose a planeswalker
  // you control" tutoring).
  /\b(?:or|choose|target)\s+a\s+planeswalker\s+you\s+control\b/,
];

export const rule: Rule = {
  id: 'condition.cares_planeswalkers',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: {
    anchors: ['planeswalker', 'planeswalkers'],
    proximity: ['you control', 'for each', 'affinity'],
    window: 6,
  },
};
