// pipeline/themes.ts
// Subtypes treated as "themes" — enabler (tutor) and payoff (cares) relationships
// surface in the drawer under a separate "Deck themes" section.

export const THEME_SUBTYPES = [
  'shrine',
  'saga',
  'lesson',
  'equipment',
  'vehicle',
  'dragon',
  'aura',
  'role',
  'class',
  'curse',
  // LCI land subtype with a "Cave-matters" payoff cycle (Bat Colony, Spelunking,
  // Hidden Cataract, etc.). The parametric subtype rule handles "<subtype> you
  // control" and "search ... for a <subtype> card" framings without modification.
  'cave',
  // v0.14.19 — token subtypes (Clue, Treasure, Food). Always-artifact token
  // types with their own micro-archetypes — Clue-aristocrats (Persuasive
  // Interrogators, Lazav), Treasure ramp (Magda, Goldspan Dragon), Food
  // lifegain (Greta, Provisions Merchant). The cares_subtype rule's
  // existing token-creation strip prevents create-only cards (Investigate
  // payoffs that just produce a Clue) from being mis-tagged as caring.
  'clue',
  'treasure',
  'food',
] as const;

export type ThemeSubtype = (typeof THEME_SUBTYPES)[number];

export function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

export function pluralize(s: string): string {
  if (s.endsWith('s')) return `${s}es`;
  return `${s}s`;
}

// Crude singular-or-plural regex fragment: "shrine" → "shrines?", "class" → "class(?:es)?"
export function subtypePattern(s: string): string {
  if (s.endsWith('s')) return `${s}(?:es)?`;
  return `${s}s?`;
}

export const THEME_TRIBES = [
  'human', 'elf', 'faerie', 'goblin', 'knight',
  'wizard', 'dwarf', 'zombie', 'vampire', 'merfolk',
  'elemental', 'rat', 'dinosaur', 'pirate', 'skeleton',
  'detective',
  // v0.16 — Bloomburrow animal tribes. Full color-cycle of payoffs across
  // BLB, plus assorted reprints in FDN / later sets. Mouse uses the
  // irregular plural "mice".
  'rabbit', 'raccoon', 'mouse', 'otter', 'squirrel',
  'bat', 'bird', 'lizard', 'frog',
] as const;

export type ThemeTribe = (typeof THEME_TRIBES)[number];

// Simple noun-plural pattern for tribes; tribes never end in 's' in MTG.
// Special-cased F-pluralization for elf/elves and dwarf/dwarves.
// v0.16 — mouse/mice irregular plural.
export function tribePattern(s: string): string {
  if (s === 'elf') return 'el(?:f|ves)';
  if (s === 'dwarf') return 'dwar(?:f|ves)';
  if (s === 'mouse') return '(?:mouse|mice)';
  return `${s}s?`;
}
