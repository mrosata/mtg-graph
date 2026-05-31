import { describe, it, expect } from 'vitest';
import { parseManaboxCsv } from './libraryImport';

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
