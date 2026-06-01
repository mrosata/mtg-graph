// pipeline/rules/condition.cares_exile_pile.ts
//
// "The exile zone is a deckbuilding resource" — scales or gates an effect off
// cards already in exile. Three core phrasings in modern oracle text:
//   (1) "cards you own in exile" — counts the whole pile (Ashiok −7, Cosmogoyf,
//       Slime Against Humanity).
//   (2) "cards exiled with __self__" — counts the pile rooted to a specific
//       permanent (Agatha's Soul Cauldron, Valgavoth Terror Eater, Maralen).
//   (3) "if a card was put into exile this turn" / "a card was exiled this
//       turn" — turn-scoped trigger gating (Ashiok's Nightmare tokens).
//
// Pairs with `effect.exile_from_library` (and other library / battlefield /
// graveyard exile producers via the bidirectional graph builder).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_exile_pile',
  axis: 'condition',
  label: 'Cares about exile pile',
  description: 'Scales or gates off the exile zone as a resource (cards you own in exile, cards exiled with this permanent, or cards exiled this turn).',
  pairsWith: ['effect.exile_from_library'],
};

const PATTERNS = [
  // (1) "cards you own in exile" / "the cards owned by you in exile"
  /\bcards (?:you own|owned by you) in exile\b/,
  // (2) "cards exiled with __self__" / "cards exiled with this <type>" /
  // "cards exiled with it" (Intrepid Paleontologist, Kylox's Voltstrider,
  // Lazav). Optional "you own" / "owned by you" qualifier between cards and
  // exiled. "it" is the anaphoric pronoun for a permanent referenced earlier
  // in the same ability (v0.14.7 broadening).
  // v0.15 — qualifier slot relaxed to admit short adverbial modifiers
  // ("at random") between the card and "exiled" (Omenpath Journey).
  /\bcards? (?:(?:you own |owned by you |at random )+)?exiled with (?:__self__|it|this (?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker))\b/,
  // (3) Turn-scoped exile gating — "if a card was put into exile this turn",
  // "if a card was exiled this turn". The Nightmare-token frame from Ashiok.
  /\bif a card was (?:put into exile|exiled) this turn\b/,
  // v0.14.1 — (4) Possessive: "the exiled cards' (colors|types|mana values|
  // names)". The exile pile is the scaling/branching resource for the
  // ability. Pit of Offerings.
  /\bthe exiled cards' (?:colors|types|mana values|names)\b/,
  // v0.14.1 — (5) Craft-pile rooted to a specific permanent: "exiled cards
  // used to craft (it|this <type>)". Sunbird Effigy, Locus of Enlightenment.
  /\bexiled cards? used to craft (?:it|this (?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker))\b/,
  // v0.14.1 — (6) Cast-from-exile payoff: "cast a spell from exile". The
  // exile pile is a casting source. Quintorius Kand.
  /\bcast(?:s)? (?:a |an |target |another )?(?:[\w\-]+\s+){0,3}?spells? from exile\b/,
  // v0.14.1 — (7) Anaphoric "each card exiled this way" — back-references a
  // prior exile clause within the same ability. Quintorius Kand -6.
  /\beach card exiled this way\b/,
  // v0.14.7 — (8) "from among (the) exiled cards" — pile-as-recasting-source
  // without an explicit "with X" anchor. The exile pile produced earlier in
  // the same ability is the casting source. Kylox, Visionary Inventor.
  /\bfrom among (?:the )?exiled cards\b/,
  // v0.14.7 — (9) Duration framing — the exile pile is the persistence
  // anchor for a recasting permission. Outrageous Robbery.
  /\bfor as long as (?:they|it) remains? exiled\b/,
];

export const rule: Rule = {
  id: 'condition.cares_exile_pile',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['exile', 'exiled'], proximity: ['cards', 'you', 'own'], window: 6 },
};
