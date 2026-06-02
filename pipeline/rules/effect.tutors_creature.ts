// pipeline/rules/effect.tutors_creature.ts
//
// "Search your library for a creature card." The middle ground between
// `effect.tutor_any` (any card) and `effect.tutors_subtype.*` (specific
// tribe/Class/etc.). Nature's Rhythm-style win conditions live here.
//
// Marked `category: 'theme'` because right now we have no consumer tag for
// "creatures matter" to pair with — it's a filter axis for deck-builders
// scanning toolbox / reanimator / creature-toolbox archetypes. Wire up
// pairsWith when a payoff tag appears.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.tutors_creature',
  axis: 'effect',
  label: 'Tutors a creature card',
  description:
    'Searches library for a creature card (any creature — not subtype-restricted).',
  pairsWith: [],
  category: 'theme',
};

// "search [you|your|target opponent's]? library for [optional clause]? creature card"
// Allow up to ~60 chars between "library for" and "creature card" to handle
// "a basic plains card or a creature card" style chained tutors and
// "a legendary creature card" qualifiers.
// v0.30 Group 15 — admit "library and/or graveyard" as the source-zone
// (Fang-Druid Summoner). The graveyard half is a creature-tutor source by
// extension; the structural anchor is still "search ... for ... creature
// card". Adding `\/` to the filler and an `(?:\s+and(?:\/|\s)?or\s+graveyard)?`
// segment after `library`.
// v0.33+ — admit "searches" third-person template.
const PATTERN = /search(?:es)?\s+[\w\s']+? library(?:\s+and(?:\/|\s)?or\s+graveyard)? for [\w\s,'\-\/]{0,60}?\bcreature cards?\b/;
// Hybrid "A or B card" form sharing a trailing noun — "a creature or basic
// land card" (Huntsman's Redemption II). Allow a short alternative clause
// between "creature" and "card".
const PATTERN_HYBRID = /search(?:es)?\s+[\w\s']+? library(?:\s+and(?:\/|\s)?or\s+graveyard)? for [\w\s,'-]{0,40}?\bcreature or [\w\s\-]{1,30}? cards?\b/;
// 2026-06-01 audit Group 16 — Brightglass Gearhulk: multi-type tutor chains
// joined by commas and "and/or" — "artifact, creature, and/or enchantment
// cards". Admit `/` and longer filler so the `creature` noun in the middle
// of the list is reached and `cards?` plural is honored.
const PATTERN_MULTI = /search(?:es)?\s+[\w\s']+? library(?:\s+and(?:\/|\s)?or\s+graveyard)? for [\w\s,'\-\/]{0,80}?\bcreature[\w\s,'\-\/]{0,60}?cards?\b/;

export const rule: Rule = {
  id: 'effect.tutors_creature',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(PATTERN_HYBRID) ?? t.match(PATTERN_MULTI);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['search', 'creature'], proximity: ['library', 'card'], window: 8 },
};
