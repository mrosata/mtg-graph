// pipeline/rules/effect.tutors_basic_land.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.tutors_basic_land',
  axis: 'effect',
  label: 'Tutors a basic land',
  description: 'Searches library for a basic land card. Cultivate / Lay of the Land / Brave the Wilds family — distinct from `effect.ramp_nonland` which puts the land directly into play.',
  pairsWith: ['condition.cares_lands'],
};

// "Search your library for a basic land card" / "search your library for up to
// two basic land cards" — the basic-land tutor family. Doesn't distinguish
// to-hand vs to-play; `effect.ramp_nonland` separately handles direct-to-play.
// Accepts "basic land" and the typed forms "basic Plains/Island/Swamp/
// Mountain/Forest" — Clay-Fired Bricks searches for "a basic Plains card".
//
// v0.14.7 — typed nouns no longer require the literal "basic" qualifier
// (Flourishing Bloom-Kin: "search your library for up to two Forest cards").
// Plains/Island/Swamp/Mountain/Forest are basic-land subtypes by Magic
// rules, so the bare typed form is still a basic-land tutor for graph-edge
// purposes.
const TYPED_NOUN = '(?:plains|islands?|swamps?|mountains?|forests?)';
// v0.30 Group 14 — admit comma-separated multi-type lists in the typed
// noun slot ("basic Plains, Swamp, or Forest card" — Abzan Monument). All
// listed nouns must be basic-land subtypes; the trailing "card(s)" is
// shared. Optional Oxford comma before the "or" alternative.
const TYPED_NOUN_LIST = `(?:${TYPED_NOUN}(?:,\\s*${TYPED_NOUN})*(?:,?\\s*or\\s+${TYPED_NOUN})?)`;
const PATTERN = new RegExp(
  `\\bsearch (?:your|their|target player's|that player's|its controller's) library for ` +
  // v0.14.7 — "up to" is now optional; bare counts ("three swamp cards") are
  // also valid tutor frames.
  `(?:(?:up to )?(?:one|two|three|four|five|six|seven|\\d+) )?` +
  `(?:a |an )?` +
  `(?:basic lands?|(?:basic )?${TYPED_NOUN_LIST}) cards?\\b`,
);
// Hybrid "<other-type> or basic land card" form (Huntsman's Redemption II) —
// "or" connector precedes "basic land card", trailing noun shared.
const PATTERN_HYBRID = new RegExp(
  `\\bsearch (?:your|their|target player's|that player's|its controller's) library for (?:a |an )?[\\w\\s\\-]{1,30}? or basic (?:lands?|${TYPED_NOUN}) cards?\\b`,
);
// v0.14.15 — modern templating: "land card with a basic land type" (Nervous
// Gardener). Search-target is a land that has any of the basic land types
// — basic lands themselves qualify, plus shocklands / triomes / any dual
// carrying a basic type. Functionally a basic-land tutor for graph edges
// (yields a colored mana source).
const PATTERN_WITH_BASIC_TYPE = new RegExp(
  `\\bsearch (?:your|their|target player's|that player's|its controller's) library for (?:a |an )?land cards? with (?:a )?basic land types?\\b`,
);

export const rule: Rule = {
  id: 'effect.tutors_basic_land',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(PATTERN_HYBRID) ?? t.match(PATTERN_WITH_BASIC_TYPE);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['basic land'], proximity: ['search', 'library'], window: 4 },
};
