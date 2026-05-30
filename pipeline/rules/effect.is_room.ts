// pipeline/rules/effect.is_room.ts
//
// Room subtype (Duskmourn) — split-card enchantments with two doors that
// unlock independently for separate effects. Detected via typeLine because
// Rooms aren't represented as a Scryfall keyword. Theme-category filter tag.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.is_room',
  axis: 'effect',
  label: 'Is a Room',
  description: 'A Room enchantment — has two independently-unlockable doors, each casting half of the card.',
  pairsWith: [],
  category: 'theme',
};

const ROOM_RE = /\bRoom\b/;

export const rule: Rule = {
  id: 'effect.is_room',
  axis: 'effect',
  matchCard: (card) => (ROOM_RE.test(card.typeLine) ? { evidence: 'Room' } : false),
};
