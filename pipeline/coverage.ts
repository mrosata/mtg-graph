import type { Card } from '../shared/types';
import { normalizeOracleText } from './normalize';

export function isBasicLand(card: Card): boolean {
  return card.types.includes('Land') && card.supertypes.includes('Basic');
}

const MANA_TAP_ONLY = /^(\s*\{t\}\s*:\s*add[^.]+\.?\s*)+$/;

export function isPlainManaTapLand(card: Card, normalized: string): boolean {
  if (!card.types.includes('Land')) return false;
  return MANA_TAP_ONLY.test(normalized);
}

export function isTaggable(card: Card): boolean {
  const normalized = normalizeOracleText(card.oracleText, card.name);
  if (normalized.length === 0) return false;
  if (isBasicLand(card)) return false;
  if (isPlainManaTapLand(card, normalized)) return false;
  return true;
}
