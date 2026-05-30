// pipeline/rules/effect.is_instant_or_sorcery.ts
//
// Synthetic "this card is an Instant or Sorcery" tag — fires from `types`
// rather than oracle text. Reciprocal partner for
// condition.cares_instant_sorcery_in_graveyard: every I/S resolves into its
// owner's graveyard after cast, so each I/S contributes to the spell-yard
// engine just by being in the deck.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.is_instant_or_sorcery',
  axis: 'effect',
  label: 'Is an instant or sorcery',
  description:
    'This card has an Instant or Sorcery type line. Resolves into its owner\'s graveyard, contributing to "instant/sorcery in graveyard" payoffs.',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.is_instant_or_sorcery',
  axis: 'effect',
  matchCard: (card) => {
    const isISorc = (card.types || []).some((t) => t === 'Instant' || t === 'Sorcery');
    return isISorc ? { evidence: 'Instant/Sorcery' } : false;
  },
};
