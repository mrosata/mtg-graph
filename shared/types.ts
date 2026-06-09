// shared/types.ts
export type Color = 'W' | 'U' | 'B' | 'R' | 'G';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic';

export type TagAxis = 'trigger' | 'effect' | 'condition';

// Per-tag metadata shape. Add an entry here when a rule starts emitting
// structured metadata for its tag — graph builders and other consumers can then
// narrow off `tagId` via `hasTagId(tag, '<id>')` and read the typed metadata
// field without a cast. Tags not listed here fall back to `Record<string, unknown>`.
export interface TagMetadataMap {
  'effect.create_creature_token': { creatureTypes: string[] };
}

export type CardTag<TagId extends string = string> = {
  tagId: TagId;
  axis: TagAxis;
  evidence: string;
  metadata?: TagId extends keyof TagMetadataMap
    ? TagMetadataMap[TagId]
    : Record<string, unknown>;
};

export function hasTagId<T extends keyof TagMetadataMap>(
  tag: CardTag,
  tagId: T,
): tag is CardTag<T> {
  return tag.tagId === tagId;
}

export type Card = {
  oracleId: string;
  name: string;
  set: string;
  printings: string[];
  collectorNumber: string;
  manaCost: string | null;
  cmc: number;
  colors: Color[];
  colorIdentity: Color[];
  typeLine: string;
  types: string[];
  subtypes: string[];
  supertypes: string[];
  oracleText: string;
  keywords: string[];
  power: string | null;
  toughness: string | null;
  rarity: Rarity;
  imageUrl: string;
  // MTGO Catalog ID for the first-seen printing. Null when the printing isn't
  // on MTGO (some preview/promo/Alchemy variants). Used only as fallback metadata
  // for DEK export; not referenced by the graph, rules, or any lookup.
  mtgoId?: number | null;
  // Per-printing identity for cards that exist in multiple Standard sets.
  // Each entry mirrors one Scryfall printing of this oracle. Lets library
  // imports preserve the user's exact printing (set + collectorNumber → mtgoId)
  // so DEK round-trips keep the right CatID per copy.
  printingDetails?: Array<{
    set: string;
    collectorNumber: string;
    mtgoId?: number;
    // Scryfall arena_id when present. Per-printing — multiple arenaIds
    // can map to the same oracleId across reprints / Arena-specific
    // visual variants. Used only by MTGA library/deck import.
    arenaId?: number;
  }>;
  tags: CardTag[];
};

export type InteractionEdge = {
  source: string;
  target: string;
  sourceTagId: string;
  targetTagId: string;
};

export type TagCategory = 'interaction' | 'theme';

export type PairingRequirement = {
  tagId: string;
  // If set, the source card (the effect-bearer) must also carry one of these
  // tags (or all, if requiresMode='all') for the edge to form.
  requiresOnSource?: string[];
  // Same, on the target (the trigger/condition-bearer).
  requiresOnTarget?: string[];
  // Defaults to 'any' — source/target need ONE of the listed tags.
  requiresMode?: 'any' | 'all';
};

export type PairingEntry = string | PairingRequirement;

export type TagDef = {
  tagId: string;
  axis: TagAxis;
  label: string;
  description: string;
  pairsWith: PairingEntry[];
  // Display grouping. 'interaction' = rules-based trigger/effect chain; 'theme' = deck-
  // strategy enabler/payoff (e.g. tutoring a Shrine for a Shrines-matter deck). Defaults
  // to 'interaction' when unset.
  category?: TagCategory;
  // Typed children. When this parent tag is applied, the tag-expansion post-pass
  // also applies each child id with inherited evidence. Children of children are
  // not supported (single-level expansion). See `pipeline/tag-expansion.ts`.
  children?: string[];
};

export type Artifact = {
  cards: Card[];
  tagCatalog: TagDef[];
  generatedAt: string;
  sourceSet: string;
  sourceSets: string[];
  ruleVersion: string;
  // Subset of `sourceSets` that are previewed-but-unreleased. Drives the
  // FilterPanel scope toggle ("Standard" / "Unreleased" / "All"). Absent on
  // legacy single-set artifacts.
  upcomingSets?: string[];
  // Subset of `sourceSets` that are Commander companion products. Drives the
  // FilterPanel "Include Commander cards" toggle (default off — hides cards
  // whose printings are entirely in commander sets). Absent on artifacts that
  // didn't ingest any commander set.
  commanderSets?: string[];
};
