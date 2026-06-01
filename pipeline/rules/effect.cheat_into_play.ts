// pipeline/rules/effect.cheat_into_play.ts
//
// "Cheat into play" — put a card from a zone OTHER than the graveyard
// directly onto the battlefield, skipping the casting process. Three
// sub-patterns: search/library (A), look-at-top (B), exiled card → battlefield
// (C). Distinct from effect.reanimate (graveyard → battlefield).
//
// Pattern A has a negative lookahead carving out basic-land and named-land-type
// searches (those are effect.tutors_basic_land / effect.ramp_nonland).
// Pattern B uses a [\s\S] filler to span sentence boundaries, BUT the rule's
// match() function applies a post-match filter to reject spans containing
// face-down / manifest-dread terms (those are effect.cloak).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.cheat_into_play',
  axis: 'effect',
  label: 'Cheat into play',
  description:
    'Puts a card from a zone OTHER than the graveyard directly onto the battlefield — skipping the casting process. Covers three sub-patterns: search library + put onto battlefield (Nature\'s Rhythm, Guardian Sunmare), look at top N + put onto battlefield (Break Out, Loot, Whiskervale Forerunner), and exiled card → battlefield (Throne of the Grim Captain, Ghost Vacuum, Anzrag\'s Rampage). Distinct from `effect.reanimate` which is strictly graveyard → battlefield.',
  pairsWith: ['condition.cares_exile_pile'],
};

// Pattern A: search library + put onto battlefield.
// Negative lookahead excludes basic-land and named-land-type searches
// (handled by effect.tutors_basic_land / effect.ramp_nonland).
const SEARCH_PUT =
  /\bsearch your library for (?!(?:up to )?(?:a|an|one|two|three|four|five|\d+|that many|as many as) basic\b|(?:up to )?(?:a|an|one|two|three|four|five|\d+|that many|as many as) (?:plains|island|swamp|mountain|forest|cave|desert|gate|town|sphere|locus|lair) cards?\b|(?:a|an|any|up to (?:a|an|one|two|three|\d+)) land cards?\b)[^.]{0,150}\bput (?:it|them|that card|those cards) onto the battlefield\b/;

// Pattern B: look at top + put onto battlefield. [\s\S]{0,300} allows
// spanning sentence boundaries (Break Out is 3 sentences). Face-down /
// cloak spans are rejected by the post-match filter in match().
const LOOK_PUT =
  /\blook at the top \w+ cards? of your library\b[\s\S]{0,300}\bput (?:it|them|that card|those cards) onto the battlefield\b/;

// Pattern C: exiled cards → battlefield. Anchors on the
// "exiled cards"/"cards exiled"/"exiled creature card" reference.
const EXILED_PUT =
  /\b(?:exiled cards?|cards? exiled (?:this way|with [\w\s'—]+)|exiled creature cards?)[^.]{0,80}\bonto the battlefield\b/;

// Pattern D (v0.20.0): hand → battlefield with explicit permanent type. Gates
// on explicit permanent type token (NOT bare "card") to avoid the land-play
// templating "play a land from your hand". A-Kona, Rescue Beastie uses
// "put a permanent card from your hand onto the battlefield".
const HAND_PUT =
  /\bput (?:a |an |one |target )?(?:[\w\-]+ ){0,3}?(?:permanent|creature|artifact|enchantment|planeswalker)\s+cards?\s+from your hand onto the battlefield\b/;

const PATTERNS: ReadonlyArray<RegExp> = [SEARCH_PUT, LOOK_PUT, EXILED_PUT, HAND_PUT];

// Post-match filter: any of these substrings inside the matched span
// indicate this is effect.cloak territory (face-down creation), not
// cheat_into_play.
const FACE_DOWN_SUBSTRINGS = ['face down', 'face-down', 'manifest dread', 'cloak '];

export const rule: Rule = {
  id: 'effect.cheat_into_play',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (!m) continue;
      const span = m[0];
      if (FACE_DOWN_SUBSTRINGS.some((s) => span.includes(s))) continue;
      return { evidence: span };
    }
    return false;
  },
  nearMiss: {
    anchors: ['onto the battlefield'],
    proximity: ['search your library', 'look at the top', 'exiled card', 'exiled creature'],
    window: 6,
  },
};
