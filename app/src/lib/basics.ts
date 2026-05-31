import type { Card } from '@shared/types';

export function isBasicLand(card: Card): boolean {
  return card.types.includes('Land') && card.supertypes.includes('Basic');
}
