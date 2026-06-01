// pipeline/rules/effect.prevent_lifegain.ts
//
// Anti-lifegain axis — Rampaging Ferocidon / Tainted Remedy / Skullcrack /
// Sunspine Lynx / Everlasting Torment family. Pairs anti-synergistically
// with `condition.cares_lifegain` (the graph builder doesn't distinguish
// polarity; the pairing just makes the cards visible to each other).
//
// Two canonical forms:
//   (1) "<subject> can't gain life [<scope>]" — direct suppression
//       (Giant Cindermaw "Players can't gain life", The Lord of Pain
//       "Your opponents can't gain life", Grievous Wound "Enchanted
//       player can't gain life", Screaming Nemesis "they can't gain life
//       for the rest of the game").
//   (2) "if <subject> would gain life, <X> loses that much life instead"
//       — Tainted Remedy's replacement-substitution form.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.prevent_lifegain',
  axis: 'effect',
  label: 'Prevents lifegain',
  description:
    'Prevents players from gaining life — the Rampaging Ferocidon / Tainted Remedy / Skullcrack anti-lifegain axis.',
  pairsWith: ['condition.cares_lifegain'],
};

// Subject slot covers the common phrasings: bare "players", "opponents"
// (with or without possessive "your"), "target opponent", "each opponent",
// "each player", "enchanted player", and anaphoric "they" (Screaming
// Nemesis: "they can't gain life for the rest of the game").
const SUBJECT = '(?:players|opponents|your opponents?|target opponent|each opponent|each player|enchanted player|they)';
const CANT_GAIN = new RegExp(`\\b${SUBJECT}\\s+can(?:not|'?t)\\s+gain life\\b`);

// Tainted Remedy substitution form: "if <subject> would gain life,
// <object> loses that much life instead". Substitution form is a real
// anti-lifegain mechanic distinct from the "can't gain life" lock.
const TAINTED_REMEDY = /\bif\s+(?:an?\s+)?(?:opponent|player|each\s+\w+)\s+would gain life,\s+(?:that|they|each)\s+(?:player|opponent)\s+loses\s+that much life\s+instead\b/;

const PATTERNS = [CANT_GAIN, TAINTED_REMEDY];

export const rule: Rule = {
  id: 'effect.prevent_lifegain',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ["can't", 'cannot'], proximity: ['gain', 'life'], window: 6 },
};
