export type StandardSet = {
  code: string;
  name: string;
};

export const STANDARD_SETS: StandardSet[] = [
  { code: 'woe', name: 'Wilds of Eldraine' },
  { code: 'lci', name: 'The Lost Caverns of Ixalan' },
  { code: 'mkm', name: 'Murders at Karlov Manor' },
  { code: 'otj', name: 'Outlaws of Thunder Junction' },
  { code: 'big', name: 'Outlaws of Thunder Junction: The Big Score' },
  { code: 'blb', name: 'Bloomburrow' },
  { code: 'dsk', name: 'Duskmourn: House of Horror' },
  { code: 'fdn', name: 'Magic Foundations' },
  { code: 'dft', name: 'Aetherdrift' },
  { code: 'tdm', name: 'Tarkir: Dragonstorm' },
  { code: 'fin', name: 'Final Fantasy' },
  { code: 'eoe', name: 'Edge of Eternities' },
  { code: 'spm', name: "Marvel's Spider-Man" },
  { code: 'tla', name: 'Avatar: The Last Airbender' },
  { code: 'ecl', name: 'Lorwyn Eclipsed' },
  { code: 'tmt', name: 'Teenage Mutant Ninja Turtles' },
  { code: 'sos', name: 'Secrets of Strixhaven' },
  { code: 'om1', name: 'Through the Omenpaths' },
];

export const STANDARD_SET_CODES: string[] = STANDARD_SETS.map((s) => s.code);

// Previewed-but-unreleased sets. Scryfall returns whatever cards are spoiled so
// far for `set:<code>`; 0-card sets are tolerated by fetch (404 → []). Move
// entries into STANDARD_SETS once they release and rotate into Standard.
// Includes the matching Commander companion codes (msc, hoc, trc) so
// scope='unreleased' shows Commander previews alongside their parent set.
export const UPCOMING_SETS: StandardSet[] = [
  { code: 'msh', name: 'Marvel Super Heroes' },
  { code: 'msc', name: 'Marvel Super Heroes Commander' },
  { code: 'om2', name: 'Through the Omenpaths 2' },
  { code: 'hob', name: 'The Hobbit' },
  { code: 'hoc', name: 'The Hobbit Commander' },
  { code: 'fra', name: 'Reality Fracture' },
  { code: 'trk', name: 'Star Trek' },
  { code: 'trc', name: 'Star Trek Commander' },
];

export const UPCOMING_SET_CODES: string[] = UPCOMING_SETS.map((s) => s.code);

// Non-Standard companion products. Orthogonal to STANDARD/UPCOMING — a set
// can be both upcoming AND in this list (e.g. hoc). The FilterPanel "Include
// Commander cards" toggle hides cards whose printings are ALL in this list
// (default off). Reprints into these products still surface via their
// Standard-legal printing.
//
// Two Scryfall set_types live here:
//   - `commander` — true Commander deck companion products (woc, otc, etc.)
//   - `eternal`   — Universes Beyond crossover supplements (spe, tle, tmc).
//     Not strictly Commander products, but they never rotate into Standard
//     and are perpetually Commander-legal, so the same gating applies.
export const COMMANDER_SETS: StandardSet[] = [
  // Linked to STANDARD_SETS — set_type: commander:
  { code: 'woc', name: 'Wilds of Eldraine Commander' },
  { code: 'lcc', name: 'The Lost Caverns of Ixalan Commander' },
  { code: 'mkc', name: 'Murders at Karlov Manor Commander' },
  { code: 'otc', name: 'Outlaws of Thunder Junction Commander' },
  { code: 'blc', name: 'Bloomburrow Commander' },
  { code: 'dsc', name: 'Duskmourn: House of Horror Commander' },
  { code: 'fdc', name: 'Foundations Commander' },
  { code: 'drc', name: 'Aetherdrift Commander' },
  { code: 'tdc', name: 'Tarkir: Dragonstorm Commander' },
  { code: 'fic', name: 'Final Fantasy Commander' },
  { code: 'eoc', name: 'Edge of Eternities Commander' },
  { code: 'ecc', name: 'Lorwyn Eclipsed Commander' },
  { code: 'soc', name: 'Secrets of Strixhaven Commander' },
  // Linked to STANDARD_SETS — set_type: eternal (UB crossover supplements):
  { code: 'spe', name: "Marvel's Spider-Man Eternal" },
  { code: 'tle', name: 'Avatar: The Last Airbender Eternal' },
  { code: 'tmc', name: 'Teenage Mutant Ninja Turtles Eternal' },
  // Linked to UPCOMING_SETS — set_type: commander:
  { code: 'msc', name: 'Marvel Super Heroes Commander' },
  { code: 'hoc', name: 'The Hobbit Commander' },
  { code: 'trc', name: 'Star Trek Commander' },
];

export const COMMANDER_SET_CODES: string[] = COMMANDER_SETS.map((s) => s.code);
