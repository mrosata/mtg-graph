// pipeline/rules/condition.cast_from_graveyard.ts
//
// Cast-from-graveyard keywords (Harmonize, Flashback, Disturb, Embalm,
// Eternalize, Encore, Escape, Jump-start, Unearth) tag a card that depends
// on being in its owner's graveyard — that's where the mechanic activates.
// This is the durable home for the pairing with `effect.mill`: mill fills
// the graveyard zone, these cards consume it as a casting zone.
//
// Distinct from `condition.cares_graveyard`, which is reserved for cards
// that SCALE on or are GATED by graveyard contents (delirium, threshold,
// "for each X in your graveyard"). A delirium scaler doesn't care whether
// its graveyard contains castable cards; a Flashback card doesn't care how
// many cards are in its graveyard — only that the right one is there.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

const CAST_FROM_GRAVEYARD_KEYWORDS = new Set([
  'Harmonize',
  'Flashback',
  'Disturb',
  'Embalm',
  'Eternalize',
  'Encore',
  'Escape',
  'Jump-start',
  'Unearth',
]);

export const tagDef: TagDef = {
  tagId: 'condition.cast_from_graveyard',
  axis: 'condition',
  label: 'Castable from graveyard',
  description: 'Has a keyword (Harmonize, Flashback, Disturb, Embalm, Eternalize, Encore, Escape, Jump-start, Unearth) that lets the card be cast or activated from its owner\'s graveyard.',
  pairsWith: ['effect.mill'],
};

export const rule: Rule = {
  id: 'condition.cast_from_graveyard',
  axis: 'condition',
  matchCard: (card) => {
    for (const kw of card.keywords ?? []) {
      if (CAST_FROM_GRAVEYARD_KEYWORDS.has(kw)) return { evidence: kw };
    }
    return false;
  },
};
