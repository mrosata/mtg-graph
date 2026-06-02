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
// v0.30 Group 28 — admit ONE intermediate sentence between the search
// clause and the "put it onto the battlefield" clause (Guidelight
// Pathmaker: "search your library for an artifact card and reveal it.
// Put it onto the battlefield if its mana value is 2 or less."). The
// trailing arm requires a gate "(if|tapped|,|\.|$)" right after
// battlefield to keep "put it onto the battlefield" tightly bounded;
// `[\s\S]{0,200}?` non-greedy stays as small as possible.
const SEARCH_PUT =
  /\bsearch your library for (?!(?:up to )?(?:a|an|one|two|three|four|five|\d+|that many|as many as) basic\b|(?:up to )?(?:a|an|one|two|three|four|five|\d+|that many|as many as) (?:plains|island|swamp|mountain|forest|cave|desert|gate|town|sphere|locus|lair) cards?\b|(?:a|an|any|up to (?:a|an|one|two|three|\d+)) land cards?\b)[\s\S]{0,200}?\bput (?:it|them|that card|those cards) onto the battlefield\b/;

// Pattern B: look at top + put onto battlefield. [\s\S]{0,300} allows
// spanning sentence boundaries (Break Out is 3 sentences). Face-down /
// cloak spans are rejected by the post-match filter in match().
// v0.22.0 — admit the "put a <type> card [with ...] from among them onto
// the battlefield" templating (Aang, at the Crossroads). The earlier
// pronoun-only form ("put it/them/that card") missed cards that re-name
// the cheated-in card with a typed noun phrase.
// FIX 10 (BR-5) — Wickerfolk Thresher: singular "look at the top card of
// your library ... you may put it onto the battlefield". Relax the
// quantifier before `cards?` to optional `\w+ ` so the singular "top card"
// form reaches the put-onto-battlefield anchor.
// 2026-06-01 audit batch — United Battlefront: admit "up to <count>"
// count slot AND comma-separated typed-restrictor filler ("noncreature,
// nonland permanent cards") before the typed-noun anchor.
const LOOK_PUT =
  /\blook at the top (?:\w+ )?cards? of your library\b[\s\S]{0,300}\bput (?:(?:it|them|that card|those cards)|(?:a |an |one |any number of |up to (?:one|two|three|four|five|\d+) )?(?:[\w\-]+[,\s]+){0,4}?(?:permanent|creature|artifact|enchantment|planeswalker|card)s?\s+(?:with [^.]{0,60}?)?from among them) onto the battlefield\b/;

// v0.27.x — "Reveal the top X cards of your library ... put a <type> card
// from among them onto the battlefield" (Genesis Wave). Parallel to LOOK_PUT
// but anchored on "reveal the top ... cards" instead of "look at the top".
const REVEAL_PUT =
  /\breveal the top (?:\w+ )?cards? of your library\b[\s\S]{0,300}\bput (?:any number of |a |an |one )?(?:[\w\-]+ ){0,3}?(?:permanent|creature|artifact|enchantment|planeswalker)\s+cards?\s+(?:with [^.]{0,60}?)?from among them onto the battlefield\b/;

// Pattern C: exiled cards → battlefield. Anchors on the
// "exiled cards"/"cards exiled"/"exiled creature card" reference.
const EXILED_PUT =
  /\b(?:exiled cards?|cards? exiled (?:this way|with [\w\s'—]+)|exiled creature cards?)[^.]{0,80}\bonto the battlefield\b/;

// v0.33+ — Aurora Awakener: "reveal cards from the top of your library
// until you reveal X permanent cards. Put any number of those permanent
// cards onto the battlefield". Distinct from REVEAL_PUT (which anchors on
// "reveal the top X cards of your library") because the count comes
// AFTER "until you reveal".
const REVEAL_UNTIL_PUT =
  /\breveal cards? from the top of your library until you reveal\s+\S+\s+(?:[\w\-]+ ){0,3}?(?:permanent|creature|nonland|artifact|enchantment|planeswalker|land)\s+cards?\b[\s\S]{0,300}?\bput (?:any number of |a |an |one )?(?:[\w\-]+ ){0,3}?(?:permanent|creature|artifact|enchantment|planeswalker)\s+cards?\s+(?:from among them|of those [\w\-]+ cards)?\s*onto the battlefield\b/;

// Pattern D (v0.20.0): hand → battlefield with explicit permanent type. Gates
// on explicit permanent type token (NOT bare "card") to avoid the land-play
// templating "play a land from your hand". A-Kona, Rescue Beastie uses
// "put a permanent card from your hand onto the battlefield".
// v0.22.0 — admit a "with <restriction>" interpolation between "card" and
// "from your hand" (Kinscaer Sentry: "put a creature card with mana value X
// or less from your hand onto the battlefield tapped and attacking").
const HAND_PUT =
  /\bput (?:a |an |one |target )?(?:[\w\-]+ ){0,3}?(?:permanent|creature|artifact|enchantment|planeswalker)\s+cards?\s+(?:with [^.]{0,60}?)?from your hand onto the battlefield\b/;

const PATTERNS: ReadonlyArray<RegExp> = [SEARCH_PUT, LOOK_PUT, REVEAL_PUT, REVEAL_UNTIL_PUT, EXILED_PUT, HAND_PUT];

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
