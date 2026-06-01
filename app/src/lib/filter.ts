import type { Card, Color, Rarity, TagDef } from '@shared/types';
import { STANDARD_SET_CODES, UPCOMING_SET_CODES, COMMANDER_SET_CODES } from '@shared/sets';

// Standard ∪ Upcoming artifacts carry both; scope decides which the user sees.
// 'standard' (default) hides cards whose printings are all in upcoming sets.
// 'unreleased' shows only cards with at least one upcoming printing.
// 'all' applies no scope-level filtering.
export type Scope = 'standard' | 'unreleased' | 'all';

export type Filter = {
  colors?: Color[];
  cmcMin?: number;
  cmcMax?: number;
  types?: string[];
  subtypes?: string[];
  keywords?: string[];
  rarities?: Rarity[];
  sets?: string[];
  scope?: Scope;
  // When false/undefined (default), hide cards whose printings are entirely
  // in Commander companion products. Reprints (any non-commander printing)
  // are unaffected. Orthogonal to `scope`.
  includeCommander?: boolean;
  text?: string;
  name?: string;
  tags?: string[];
  // Per-group tag matching mode. Default 'and'. Only consulted when applyFilter
  // is called with a tagCatalog so it can partition tags by category.
  interactionTagsMode?: 'and' | 'or';
  themeTagsMode?: 'and' | 'or';
};

const STANDARD_SET_SET = new Set(STANDARD_SET_CODES);
const UPCOMING_SET_SET = new Set(UPCOMING_SET_CODES);
const COMMANDER_SET_SET = new Set(COMMANDER_SET_CODES);

export function applyFilter(
  cards: Card[],
  f: Filter,
  libraryFilter?: ReadonlySet<string>,
  tagCatalog?: Map<string, TagDef>,
): Card[] {
  let interactionIds: string[] | undefined;
  let themeIds: string[] | undefined;
  if (f.tags?.length && tagCatalog) {
    interactionIds = [];
    themeIds = [];
    for (const id of f.tags) {
      if (tagCatalog.get(id)?.category === 'theme') themeIds.push(id);
      else interactionIds.push(id);
    }
  }

  return cards.filter((c) => {
    if (libraryFilter && !libraryFilter.has(c.oracleId)) return false;
    if (f.scope === 'standard' && !c.printings.some((p) => STANDARD_SET_SET.has(p))) return false;
    if (f.scope === 'unreleased') {
      if (!c.printings.some((p) => UPCOMING_SET_SET.has(p))) return false;
      if (c.supertypes.includes('Basic')) return false;
    }
    if (!f.includeCommander && c.printings.every((p) => COMMANDER_SET_SET.has(p))) return false;
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
      if (!tagCatalog) {
        if (!f.tags.every((id) => cardTagIds.has(id))) return false;
      } else {
        if (interactionIds!.length) {
          const mode = f.interactionTagsMode ?? 'and';
          const ok = mode === 'or'
            ? interactionIds!.some((id) => cardTagIds.has(id))
            : interactionIds!.every((id) => cardTagIds.has(id));
          if (!ok) return false;
        }
        if (themeIds!.length) {
          const mode = f.themeTagsMode ?? 'and';
          const ok = mode === 'or'
            ? themeIds!.some((id) => cardTagIds.has(id))
            : themeIds!.every((id) => cardTagIds.has(id));
          if (!ok) return false;
        }
      }
    }
    return true;
  });
}
