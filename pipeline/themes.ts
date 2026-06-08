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
  // v0.17 — OTJ Mount subtype. Mounts use the Saddle keyword for combat
  // gating; Mount-cares cards (Miriam, Roxanne, lord-style anthems) need
  // a parametric cares_subtype.mount tag for tribal/care queries.
  'mount',
  // v0.24 — FFI/EOE Town land subtype with "Towns you control" payoffs
  // (PuPu UFO, Treno, Rabanastre, Ishgard, Gohn).
  'town',
  // v0.27.0+ — Gate land subtype with the "Affinity for Gates" / "Whenever a
  // Gate you control enters" / Maze's End "ten or more Gates" archetype.
  // Gate Colossus, Gateway Sneak, Archway Angel, Circuitous Route, Maze's
  // End, plus all the Guildgate cycles in current Standard.
  'gate',
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
  // v0.17 — recurring evergreen tribes surfaced by the pre-batch audit
  // backlog. Spirit (~28 cards) is the largest gap; the rest are mid-size
  // families with regular reprint patterns. Wolf uses the irregular
  // F→ves plural ("wolves").
  'spirit', 'demon', 'angel', 'cat', 'dog', 'wolf',
  // v0.24 — TMNT (Ninja, Mutant), Lorwyn revisit (Kithkin), Avatar (Ally),
  // and FFI (Boar) tribal payoffs surfaced by the 2026-06-01 audit.
  'ninja', 'kithkin', 'ally', 'boar', 'mutant',
  // FIX 20 (PA-1) — v0.26.0 audit batch: Ballyrush Banneret and the many
  // other Soldier-tribal Standard cards.
  'soldier',
  // 2026-06-01 audit Group 10 — Aatchik, Emerald Radian and the broader
  // Insect tribal payoff family (commander reprints + LCI/MKM appearances).
  'insect',
  // v0.32 — Group 12 — Sliver tribal (Thrumming Hivepool, plus the broader
  // Sliver family that recurs in Standard reprints). "Affinity for slivers"
  // + "slivers you control have <kw>" payoff frames.
  'sliver',
  // v0.39.0 — 200-card audit Ship 1 — Turtle tribal payoff family
  // (Ainok Tracker partner, plus the recurring Turtle creatures in current
  // Standard reprints). "Turtles you control" + tribal-care payoffs.
  'turtle',
] as const;

export type ThemeTribe = (typeof THEME_TRIBES)[number];

// Simple noun-plural pattern for tribes; tribes never end in 's' in MTG.
// Special-cased F-pluralization for elf/elves and dwarf/dwarves.
// v0.16 — mouse/mice irregular plural.
// v0.17 — wolf/wolves irregular plural.
export function tribePattern(s: string): string {
  if (s === 'elf') return 'el(?:f|ves)';
  if (s === 'dwarf') return 'dwar(?:f|ves)';
  if (s === 'wolf') return 'wol(?:f|ves)';
  if (s === 'mouse') return '(?:mouse|mice)';
  // v0.24 — ally → allies irregular y→ies plural.
  if (s === 'ally') return 'all(?:y|ies)';
  return `${s}s?`;
}
