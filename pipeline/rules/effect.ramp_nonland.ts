// pipeline/rules/effect.ramp_nonland.ts
//
// A non-Land card that adds mana — i.e. a "mana dork," ramp creature, ritual,
// mana-producing artifact/enchantment, OR a Rampant Growth–style basic-land
// tutor that puts a basic land directly onto the battlefield. Distinguishes
// ramp sources from the 1000+ lands also tagged with `effect.add_mana`, so the
// deck-builder query "what are my ramp options?" returns useful results.
//
// Two pattern families:
//   1. Direct-mana producers ("add {G}", "add two mana of any color") — same
//      as `effect.add_mana`, sans Lands.
//   2. Basic-land tutors that put the land directly onto the battlefield
//      (Rampant Growth, Cultivate, Shared Roots, Proctor's Gaze mode 2, etc.).
//      Requires "onto the battlefield" to exclude "into your hand" tutoring,
//      which is closer to card selection than ramp.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.ramp_nonland',
  axis: 'effect',
  label: 'Ramp (non-land mana source)',
  description:
    'A non-Land card that adds mana OR fetches a basic land directly into play. Companion to `effect.add_mana` but excludes lands.',
  pairsWith: ['condition.cares_high_mana_value'],
  category: 'theme',
};

const PATTERNS = [
  /\badds?\s+(?:[\w\s]{0,30}?)?\{[wubrgcxs0-9]\}/,
  /\badds?\s+(?:an additional\s+)?(?:\d+|x|one|two|three|four|five|six|seven|eight|nine|ten|that much|that many)\s+mana\s+(?:of\s+(?:any|the|that|the\s+chosen)|in\s+any)\b/,
  // Basic-land tutor → battlefield. The "onto the battlefield" tail is the
  // ramp signature; "into your hand" variants are excluded by absence of that
  // phrase within the local window.
  /\bsearch your library for [^.]{0,40}basic (?:land|plains|island|swamp|mountain|forest)[^.]{0,80}onto the battlefield\b/,
  // v0.14.1 — Plant Beans / Exploration shape: "put a land card from your
  // hand onto the battlefield". A free extra-land effect; structurally a
  // ramp source even though no library tutor is involved.
  // Spelunking, Nicanzil Current Conductor.
  // v0.14.36 — broadened for Worldsoul's Rage: "put up to X land cards from
  // your hand and/or graveyard onto the battlefield tapped". Two extensions:
  // (a) determiner slot admits "up to one/two/three/four/five/x" /
  // "up to \d+" quantifiers, and (b) source clause admits "from your
  // graveyard" alone OR "from your hand (?:and/or|or) graveyard" combined.
  /\bput (?:a |an |target |up to (?:one|two|three|four|five|x|\d+) )?lands? cards? from (?:your|a) (?:hand|graveyard)(?:\s+(?:and\/or|or)\s+(?:hand|graveyard))? onto the battlefield\b/,
  // v0.14.7 — typed-land split-sentence Cultivate variant (Flourishing Bloom-
  // Kin): "search your library for ... Forest cards ... . Put one of them
  // onto the battlefield". Same Cultivate family but split across two
  // sentences with the "put one of them" anaphor. Typed nouns alone don't
  // require "basic" (the type IS basic-restricted by rules).
  /\bsearch your library for [\s\S]{0,60}?(?:plains|islands?|swamps?|mountains?|forests?) cards?[\s\S]{0,80}?\bput\s+(?:one|two|both|that\s+card|(?:one |two |both )?of them|of those|it)\s+[\s\S]{0,40}?onto the battlefield\b/,
  // v0.19 — reveal-until-land Cultivate variant (Clifftop Lookout): "reveal
  // cards from the top of your library until you reveal a (basic )?land card.
  // Put that card onto the battlefield". Functionally identical to library-
  // tutor ramp (a land enters from outside the deck without spending the
  // turn's land drop) but uses the "reveal until" frame rather than "search
  // your library for".
  // v0.30 Group 22 — admit N>1 in the count slot (Skyserpent Seeker:
  // "reveal cards ... until you reveal two land cards. put those land cards
  // onto the battlefield tapped"). Determiner accepts "a"/digit/word counts;
  // anaphor admits singular "it"/"that card" and plural "them"/"those land
  // cards".
  /\breveal cards from the top of your library until you reveal (?:a|\d+|one|two|three|four|five) (?:basic )?land cards?\.\s*put (?:it|that card|them|those (?:basic )?lands? cards?) onto the battlefield\b/,
  // v0.45.0 — Zimone's Experiment: "reveal top N, put all land cards revealed
  // this way onto the battlefield". Library-reveal ramp without explicit search.
  /\bput (?:all|up to (?:one|two|three|four|five|\w+)|one of) land cards? (?:revealed|found) this way onto the battlefield\b/,
];

export const rule: Rule = {
  id: 'effect.ramp_nonland',
  axis: 'effect',
  matchCard: (card, normalizedText) => {
    if (card.types.includes('Land')) return false;
    // Multi-face guard: card.types only reflects the front face. For TDFCs
    // like Aclazotz, Deepest Betrayal // Temple of the Dead (Creature // Land),
    // the "{T}: Add {B}" lives on the Land back face. Skip the card entirely
    // if any face's typeLine includes "Land" — the mana ability is almost
    // certainly on that face, and the Land axis already covers it.
    if (/(^|\s|\/\/\s*)Land\b/i.test(card.typeLine)) return false;
    for (const re of PATTERNS) {
      const m = normalizedText.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
};
