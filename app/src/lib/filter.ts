import type { Card, Color, Rarity } from '@shared/types';

export type Filter = {
  colors?: Color[];
  cmcMin?: number;
  cmcMax?: number;
  types?: string[];
  subtypes?: string[];
  keywords?: string[];
  rarities?: Rarity[];
  sets?: string[];
  text?: string;
  name?: string;
  tags?: string[];
};

export function applyFilter(cards: Card[], f: Filter): Card[] {
  return cards.filter((c) => {
    if (f.colors?.length) {
      if (c.colors.length === 0) return false;
      if (!c.colors.every((col) => f.colors!.includes(col))) return false;
    }
    if (f.cmcMin != null && c.cmc < f.cmcMin) return false;
    if (f.cmcMax != null && c.cmc > f.cmcMax) return false;
    if (f.types?.length && !c.types.some((t) => f.types!.includes(t))) return false;
    if (f.subtypes?.length && !c.subtypes.some((s) => f.subtypes!.includes(s))) return false;
    if (f.keywords?.length) {
      const lowerKw = c.keywords.map((k) => k.toLowerCase());
      if (!f.keywords.some((k) => lowerKw.includes(k.toLowerCase()))) return false;
    }
    if (f.rarities?.length && !f.rarities.includes(c.rarity)) return false;
    if (f.sets?.length && !c.printings.some((p) => f.sets!.includes(p))) return false;
    if (f.text && !c.oracleText.toLowerCase().includes(f.text.toLowerCase())) return false;
    if (f.name && !c.name.toLowerCase().includes(f.name.toLowerCase())) return false;
    if (f.tags?.length) {
      const cardTagIds = new Set(c.tags.map((t) => t.tagId));
      if (!f.tags.every((id) => cardTagIds.has(id))) return false;
    }
    return true;
  });
}
