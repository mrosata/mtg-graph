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
