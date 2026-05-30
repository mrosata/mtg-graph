// pipeline/rules/condition.cares_instant_sorcery_in_graveyard.ts
//
// "Spells-in-the-yard" sub-axis. The mono/Izzet spells-matter archetype's
// defining condition: instants/sorceries in your graveyard cheapen creatures
// (Eddymurk Crab, Tolarian Terror, The Dawning Archaic), scale stats (Melek,
// Enigma Drake, Ghitu Lavarunner), and feed graveyard recasting (Iroh,
// Festival of Embers, Sphinx of Forgotten Lore, Slickshot Lockpicker,
// Inspiration from Beyond, Wisdom of Ages, Quistis Trepe, etc.). Without it
// the whole engine looks like generic "graveyard matters."
//
// Pairs with: effect.is_instant_or_sorcery (every I/S contributes by being
// cast and resolving into your yard), effect.surveil and effect.mill (deliver
// the cards), effect.draws_or_discards (looters / Faithless Looting-style
// outlets pitch I/S to the yard).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_instant_sorcery_in_graveyard',
  axis: 'condition',
  label: 'Cares about instant/sorcery in graveyard',
  description:
    'Scales, cheapens, or operates on instant and sorcery cards in graveyards. The Izzet/mono-blue spells-matter engine.',
  pairsWith: [
    'effect.is_instant_or_sorcery',
    'effect.surveil',
    'effect.mill',
    'effect.draws_or_discards',
  ],
};

const PATTERNS = [
  // Cost reduction / stat scaling — counting I/S cards in graveyard.
  // "for each instant and sorcery card in your graveyard"
  /\bfor each instant (?:and|or) sorcery cards? in (?:your |an opponent's |all |a )?graveyards?\b/,
  // "number of instant and sorcery cards in your graveyard" (Melek, Enigma Drake, Steal the Show)
  /\bnumber of instant (?:and|or) sorcery cards? in (?:your |an opponent's |all |a )?graveyards?\b/,
  // "two or more instant and/or sorcery cards in your graveyard" (Ghitu Lavarunner)
  /\b(?:\d+ or more )?instant and(?:\/| )?or sorcery cards? in (?:your |an opponent's |all |a )?graveyards?\b/,
  // Targeted recasting / flashback grant — target instant or sorcery card in/from a graveyard
  /\btarget instant or sorcery cards?\s+(?:in|from) (?:your |their |an opponent's |any |a |each player's )?graveyards?\b/,
  // "X target instant and/or sorcery cards from your graveyard" (Divergent Equation)
  /\b(?:up to )?(?:\w+ )?target instant and(?:\/| )?or sorcery cards? from (?:your |their |an opponent's |any |a )?graveyards?\b/,
  // "an instant or sorcery card from your graveyard" / "an instant or sorcery card with mana value..."
  /\b(?:an |any |each )instant or sorcery cards? (?:with [^.]+? )?(?:in|from) (?:your |their |an opponent's |any |a )?graveyards?\b/,
  // Flow State's "if there is an instant card and a sorcery card in your graveyard"
  /\bif there (?:is|are)\s+(?:an?\s+)?instant cards? and (?:an?\s+)?sorcery cards? in (?:your |an opponent's |all |a )?graveyards?\b/,
  // "instant and sorcery cards from your graveyard" (Wisdom of Ages, generic recursion)
  /\binstant and sorcery cards? from (?:your |their |an opponent's |any |a )?graveyards?\b/,
  // "instant and sorcery spells from your graveyard" — Festival of Embers cast-from-yard
  /\binstant and sorcery spells from (?:your |their |an opponent's |any |a )?graveyards?\b/,
  // Iroh-style "each non-Lesson instant and sorcery card in your graveyard has flashback"
  /\binstant and sorcery cards? in (?:your |their |an opponent's |any |a )?graveyards?\b/,
  // "cards in your graveyard that are instant cards, sorcery cards (and/or have an Adventure)"
  // (Frantic Firebolt, Hearth Elemental // Stoke Genius). The "that are
  // <type> cards" framing scopes the graveyard count to instants + sorceries,
  // so this is the Izzet spells-matter engine even though it doesn't use the
  // "instant or sorcery card" shorthand.
  /\bcards? in (?:your |an opponent's |a |their )?graveyards? that are instant cards(?:,| or)? (?:and )?sorcery cards?\b/,
];

export const rule: Rule = {
  id: 'condition.cares_instant_sorcery_in_graveyard',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: {
    anchors: ['graveyard', 'graveyards'],
    proximity: ['instant', 'sorcery'],
    window: 8,
  },
};
