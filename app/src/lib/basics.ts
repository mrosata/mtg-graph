import type { Card } from '@shared/types';

export const BASIC_LAND_NAMES: ReadonlySet<string> = new Set([
  'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes',
]);

export function isBasicLand(card: Card): boolean {
  return card.typeLine.includes('Basic Land') || card.typeLine.includes('Basic Snow Land');
}
