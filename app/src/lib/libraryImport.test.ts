import { describe, it, expect } from 'vitest';
import { parseManaboxCsv, resolveLibrary } from './libraryImport';
import type { Card } from '@shared/types';

const HEADER = '"Name","Set code","Set name","Collector number","Foil","Rarity","Quantity"';

describe('parseManaboxCsv', () => {
  it('parses a basic CSV with required columns', () => {
    const csv = [
      HEADER,
      '"Lightning Bolt","dmu","Dominaria United","100","normal","common","4"',
      '"Sol Ring","cmd","Commander","1","normal","uncommon","1"',
    ].join('\n');

    const parsed = parseManaboxCsv(csv);

    expect(parsed.rows).toEqual([
      { name: 'Lightning Bolt', setCode: 'dmu', collectorNumber: '100', quantity: 4 },
      { name: 'Sol Ring',       setCode: 'cmd', collectorNumber: '1',   quantity: 1 },
    ]);
    expect(parsed.unparseableLines).toEqual([]);
  });

  it('handles quoted fields with embedded commas', () => {
    const csv = [
      HEADER,
      '"Borrowing 100,000 Arrows","chk","Champions of Kamigawa","100","normal","common","1"',
    ].join('\n');

    const parsed = parseManaboxCsv(csv);
    expect(parsed.rows[0]?.name).toBe('Borrowing 100,000 Arrows');
  });

  it('handles doubled-quote escaping inside quoted fields', () => {
    const csv = [
      HEADER,
      '"""Ach! Hans, Run!""","ugl","Unglued","1","normal","rare","1"',
    ].join('\n');

    const parsed = parseManaboxCsv(csv);
    expect(parsed.rows[0]?.name).toBe('"Ach! Hans, Run!"');
  });

  it('tolerates CRLF line endings', () => {
    const csv = [HEADER, '"Bolt","dmu","Dominaria","1","normal","common","2"'].join('\r\n');
    const parsed = parseManaboxCsv(csv);
    expect(parsed.rows[0]?.name).toBe('Bolt');
  });

  it('skips blank lines', () => {
    const csv = [HEADER, '', '"Bolt","dmu","Dominaria","1","normal","common","2"', ''].join('\n');
    const parsed = parseManaboxCsv(csv);
    expect(parsed.rows).toHaveLength(1);
  });

  it('locates columns by header name, not position (tolerates Manabox column reorder)', () => {
    const csv = [
      '"Quantity","Name","Set code","Foil","Collector number","Rarity"',
      '"3","Llanowar Elves","dmu","normal","100","common"',
    ].join('\n');
    const parsed = parseManaboxCsv(csv);
    expect(parsed.rows).toEqual([
      { name: 'Llanowar Elves', setCode: 'dmu', collectorNumber: '100', quantity: 3 },
    ]);
  });

  it('puts rows with non-numeric quantity into unparseableLines', () => {
    const csv = [
      HEADER,
      '"Lightning Bolt","dmu","Dominaria","100","normal","common","not-a-number"',
    ].join('\n');
    const parsed = parseManaboxCsv(csv);
    expect(parsed.rows).toEqual([]);
    expect(parsed.unparseableLines).toHaveLength(1);
  });

  it('puts rows with missing name into unparseableLines', () => {
    const csv = [
      HEADER,
      '"","dmu","Dominaria","100","normal","common","4"',
    ].join('\n');
    const parsed = parseManaboxCsv(csv);
    expect(parsed.rows).toEqual([]);
    expect(parsed.unparseableLines).toHaveLength(1);
  });

  it('throws when a required column is missing from the header', () => {
    const csv = [
      '"Name","Set code","Collector number"',  // no Quantity
      '"Bolt","dmu","100"',
    ].join('\n');
    expect(() => parseManaboxCsv(csv)).toThrow(/Quantity/);
  });
});

function makeCard(oracleId: string, name: string, typeLine = ''): Card {
  return {
    oracleId, name, set: 'dmu', printings: ['dmu'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine, types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

const FIXTURE_CARDS = new Map<string, Card>([
  ['bolt-id',  makeCard('bolt-id',  'Lightning Bolt')],
  ['llano-id', makeCard('llano-id', 'Llanowar Elves')],
  ['dfc-id',   makeCard('dfc-id',   'Aquatic Alchemist // Bubble Up')],
  ['mtn-id',   makeCard('mtn-id',   'Mountain', 'Basic Land — Mountain')],
]);

const KNOWN_SETS = new Set(['dmu', 'tdm', 'blb']);

describe('resolveLibrary', () => {
  it('resolves a row whose name and set are both known', () => {
    const parsed = { rows: [
      { name: 'Lightning Bolt', setCode: 'dmu', collectorNumber: '100', quantity: 4 },
    ], unparseableLines: [] };

    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);

    expect(r.owned.get('bolt-id')).toBe(4);
    expect(r.unknownNames).toEqual([]);
    expect(r.unknownSets).toEqual([]);
  });

  it('credits ownership by name even when the set is not Standard', () => {
    const parsed = { rows: [
      { name: 'Lightning Bolt', setCode: 'mh3', collectorNumber: '50', quantity: 2 },
    ], unparseableLines: [] };

    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);

    expect(r.owned.get('bolt-id')).toBe(2);
    expect(r.unknownSets).toEqual([]);
  });

  it('resolves a DFC by front-face name', () => {
    const parsed = { rows: [
      { name: 'Aquatic Alchemist', setCode: 'tdm', collectorNumber: '1', quantity: 1 },
    ], unparseableLines: [] };

    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);
    expect(r.owned.get('dfc-id')).toBe(1);
  });

  it('sums quantities across multiple rows resolving to the same oracleId', () => {
    const parsed = { rows: [
      { name: 'Lightning Bolt', setCode: 'dmu', collectorNumber: '100', quantity: 3 },
      { name: 'Lightning Bolt', setCode: 'mh3', collectorNumber: '50',  quantity: 1 },
    ], unparseableLines: [] };

    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);
    expect(r.owned.get('bolt-id')).toBe(4);
  });

  it('classifies "name miss + known set" as unknownNames', () => {
    const parsed = { rows: [
      { name: 'Frobulator', setCode: 'dmu', collectorNumber: '1', quantity: 1 },
    ], unparseableLines: [] };

    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);
    expect(r.owned.size).toBe(0);
    expect(r.unknownNames).toEqual([{ name: 'Frobulator', setCode: 'dmu', quantity: 1 }]);
    expect(r.unknownSets).toEqual([]);
  });

  it('classifies "name miss + unknown set" as unknownSets', () => {
    const parsed = { rows: [
      { name: 'Tarmogoyf', setCode: 'mh3', collectorNumber: '1', quantity: 1 },
    ], unparseableLines: [] };

    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);
    expect(r.owned.size).toBe(0);
    expect(r.unknownNames).toEqual([]);
    expect(r.unknownSets).toEqual([{ name: 'Tarmogoyf', setCode: 'mh3', quantity: 1 }]);
  });

  it('compares set codes case-insensitively', () => {
    const parsed = { rows: [
      { name: 'Notacard', setCode: 'DMU', collectorNumber: '1', quantity: 1 },
    ], unparseableLines: [] };

    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);
    expect(r.unknownNames).toHaveLength(1);
    expect(r.unknownSets).toHaveLength(0);
  });

  it('passes unparseableLines straight through', () => {
    const parsed = { rows: [], unparseableLines: ['garbage'] };
    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);
    expect(r.unparseableLines).toEqual(['garbage']);
  });
});
