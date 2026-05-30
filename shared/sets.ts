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
export const UPCOMING_SETS: StandardSet[] = [
  { code: 'msh', name: 'Marvel Super Heroes' },
  { code: 'om2', name: 'Through the Omenpaths 2' },
  { code: 'hob', name: 'The Hobbit' },
  { code: 'fra', name: 'Reality Fracture' },
  { code: 'trk', name: 'Star Trek' },
];

export const UPCOMING_SET_CODES: string[] = UPCOMING_SETS.map((s) => s.code);
