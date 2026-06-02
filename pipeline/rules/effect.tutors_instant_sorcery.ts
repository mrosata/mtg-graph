// pipeline/rules/effect.tutors_instant_sorcery.ts
//
// "Search your library for an instant or sorcery card." Typed-tutor sibling of
// `effect.tutors_creature` / `effect.tutors_artifact`. Covers Mystical Tutor,
// Mystical Teachings, Micromancer, Sanar / Wild Idea, etc. A deck-builder
// archetype-relevant axis: most spellslinger / izzet decks rely on a typed
// I/S tutor as their toolbox glue.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.tutors_instant_sorcery',
  axis: 'effect',
  label: 'Tutors an instant or sorcery',
  description:
    'Searches library for an instant or sorcery card (any I/S — not subtype-restricted).',
  // Effect↔condition pairing: I/S tutors feed graveyard-based spellslinger
  // payoffs (Crackling Drake, Murmuring Mystic-style "cares about instants/
  // sorceries in your graveyard").
  pairsWith: ['condition.cares_instant_sorcery_in_graveyard'],
  category: 'theme',
};

// Two canonical templates:
// (1) "search ... library for an instant or sorcery card" — Micromancer,
//     Mystical Tutor, Sanar.
// (2) "search ... library for an instant card or a card with flash" —
//     Mystical Teachings (the historic mono-print form).
// v0.33+ — admit "searches" third-person template.
const PATTERN = /\bsearch(?:es)?\s+[\w\s']+? library for [\w\s,'-]{0,40}?\b(?:an instant or sorcery|an instant or a sorcery) cards?\b/;
const PATTERN_TEACHINGS = /\bsearch(?:es)?\s+[\w\s']+? library for an instant card or a card with flash\b/;

export const rule: Rule = {
  id: 'effect.tutors_instant_sorcery',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(PATTERN_TEACHINGS);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['search', 'instant'], proximity: ['library', 'card', 'sorcery'], window: 8 },
};
