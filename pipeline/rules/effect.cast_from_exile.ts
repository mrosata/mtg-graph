// pipeline/rules/effect.cast_from_exile.ts
//
// Cards that cast (or play) a spell directly from the exile zone — distinct
// from `effect.cast_for_free` (which is about cost-bypass via "without paying
// its mana cost") and from `effect.cast_from_library_top` (Future Sight,
// Vivien Champion — library-top permission).
//
// SCOPE: this rule deliberately covers the non-keyword cast-from-exile shape.
// The keyword-bearing forms have their own dedicated tags:
//   - Plot → effect.has_plot
//   - Discover → effect.discover
//   - Adventure DFC → effect.adventure_card
//   - Foretell/Suspend/Encore — Scryfall keyword tags
// Cards in those families typically use templating like "cast the creature
// later from exile" or "cast it from exile". Those phrasings are intentionally
// excluded here so we don't double-tag.
//
// PATTERNS:
//   (1) Theft / temporary control of opponent's exiled cards —
//       "for as long as (they|it) remains? exiled" (Outrageous Robbery, Gonti,
//       Cruelclaw's Heist, Decadent Dragon, Extraordinary Journey).
//   (2) Anaphoric "cast a spell this way" — back-reference to an exile clause
//       earlier in the same ability (Intrepid Paleontologist, Osteomancer
//       Adept, Valgavoth, Gonti, Outrageous Robbery).
//   (3) Explicit "cast ... from among (the )?(cards exiled|exiled cards)" —
//       cast from the exile pile rooted to this permanent or the spell's own
//       exile (Voltstrider, Kylox, Visionary Inventor).
//
// PAIRS WITH: condition.cares_exile_pile — these effects produce or fuel the
// exile-as-resource axis. Many of these cards also self-tag cares_exile_pile
// since they reference the pile internally; that's fine — the graph edge
// forms between this card's effect and OTHER cards' cares_exile_pile.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.cast_from_exile',
  axis: 'effect',
  label: 'Casts a spell from exile',
  description:
    'Casts (or plays) a spell directly from the exile zone — theft, anaphoric "cast a spell this way", or from-among-exiled-cards recasting. Distinct from `effect.cast_for_free` (cost-bypass axis) and the keyword-specific tags (effect.has_plot, effect.discover, effect.adventure_card).',
  pairsWith: ['condition.cares_exile_pile'],
};

const PATTERNS = [
  // (1) Theft / opponent's exiled cards remain available
  /\bfor as long as (?:they|it) remains? exiled\b/,
  // (2) Anaphoric "cast a spell this way" — back-reference to a prior exile
  // clause. Bare phrase, no need for the verb to lead.
  /\b(?:you may )?cast (?:a |an )?spells? this way\b/,
  // (3) Explicit cast from the exile pile. Filler accepts up to 12 tokens
  // between "cast" and "from among" (handles "any number of instant and/or
  // sorcery spells" — 7 tokens of qualifier plus headroom).
  /\bcast (?:[\w\-'/]+\s+){0,12}?from among (?:the )?(?:cards exiled|exiled cards)\b/,
  // (4) v0.14.41 — anaphoric "from among those cards" where "those cards"
  // binds to a preceding `exile the top X cards of …` clause in the same
  // effect (Laughing Jasper Flint, Dack Fayden, Knowledge Pool, Etali
  // family). Same cast-from-exile semantic — opponent-library theft is
  // the canonical hit. The phrase is distinctive enough on its own
  // (MTG oracle templating only uses "from among those cards" after an
  // exile clause).
  /\bcast (?:[\w\-'/]+\s+){0,12}?from among those cards\b/,
];

export const rule: Rule = {
  id: 'effect.cast_from_exile',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['exile', 'exiled'], proximity: ['cast', 'play', 'this way', 'remain'], window: 6 },
};
