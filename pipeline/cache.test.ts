// pipeline/cache.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCachedSet, writeCachedSet } from './cache';

describe('scryfall cache', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mtg-graph-cache-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns null when the cache file is missing', () => {
    expect(readCachedSet(dir, 'xyz')).toBeNull();
  });

  it('round-trips an array of cards', () => {
    const cards = [{ oracle_id: 'a', name: 'A' }, { oracle_id: 'b', name: 'B' }];
    writeCachedSet(dir, 'tdm', cards);
    expect(existsSync(join(dir, 'tdm.json'))).toBe(true);
    expect(readCachedSet(dir, 'tdm')).toEqual(cards);
  });

  it('creates the cache directory if it does not exist', () => {
    const nested = join(dir, 'nested', 'inner');
    writeCachedSet(nested, 'tdm', []);
    expect(existsSync(join(nested, 'tdm.json'))).toBe(true);
  });

  it('returns null on malformed JSON', () => {
    writeCachedSet(dir, 'tdm', []);
    writeFileSync(join(dir, 'tdm.json'), 'not-json');
    expect(readCachedSet(dir, 'tdm')).toBeNull();
  });
});
