import { describe, it, expect } from 'vitest';
import { parseMtgaCollectionJson } from './mtgaJsonParser';

describe('parseMtgaCollectionJson', () => {
  it('parses the MTGA-collection-exporter array shape into ParsedLibrary rows', () => {
    const json = JSON.stringify([
      { count: 4, name: 'Abrade', set: 'DMU', cn: '131' },
      { count: 1, name: 'Atraxa, Grand Unifier', set: 'ONE', cn: '196' },
      { count: 2, name: 'Sheoldred, the Apocalypse', set: 'DMU', cn: '107' },
    ]);
    const result = parseMtgaCollectionJson(json);
    expect(result.rows).toEqual([
      { name: 'Abrade', setCode: 'DMU', collectorNumber: '131', quantity: 4 },
      { name: 'Atraxa, Grand Unifier', setCode: 'ONE', collectorNumber: '196', quantity: 1 },
      { name: 'Sheoldred, the Apocalypse', setCode: 'DMU', collectorNumber: '107', quantity: 2 },
    ]);
    expect(result.unparseableLines).toEqual([]);
  });

  it('treats malformed entries as unparseableLines instead of throwing', () => {
    const json = JSON.stringify([
      { count: 4, name: 'Abrade', set: 'DMU', cn: '131' },
      { count: 'four', name: 'Bad Count', set: 'DMU', cn: '1' },
      { name: 'Missing Count', set: 'DMU', cn: '2' },
      'not even an object',
      { count: 0, name: 'Zero Count', set: 'X', cn: '1' },
    ]);
    const result = parseMtgaCollectionJson(json);
    expect(result.rows).toEqual([
      { name: 'Abrade', setCode: 'DMU', collectorNumber: '131', quantity: 4 },
    ]);
    expect(result.unparseableLines).toHaveLength(4);
  });

  it('handles empty arrays', () => {
    expect(parseMtgaCollectionJson('[]')).toEqual({ rows: [], unparseableLines: [] });
  });

  it('throws when the top-level value is not an array', () => {
    expect(() => parseMtgaCollectionJson('{"foo": 1}')).toThrow(/array/i);
    expect(() => parseMtgaCollectionJson('null')).toThrow(/array/i);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseMtgaCollectionJson('not json {')).toThrow(/JSON/i);
  });

  it('tolerates missing set / cn (empty strings)', () => {
    const json = JSON.stringify([
      { count: 1, name: 'Mystery Card', set: '', cn: '' },
    ]);
    const result = parseMtgaCollectionJson(json);
    expect(result.rows).toEqual([
      { name: 'Mystery Card', setCode: '', collectorNumber: '', quantity: 1 },
    ]);
  });
});
