// pipeline/fetch.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripScryfallCard, fetchSetFromScryfall } from './fetch';
import { writeCachedSet } from './cache';
import fixture from './fixtures/scryfall-tdm-sample.json' with { type: 'json' };

const FIXTURE_COUNT = fixture.data.length;

describe('stripScryfallCard', () => {
  it('keeps only the fields we care about', () => {
    const raw = fixture.data[0];
    const card = stripScryfallCard(raw);
    expect(card.oracleId).toBe(raw.oracle_id);
    expect(card.name).toBe('Token Maker');
    expect(card.cmc).toBe(3);
    expect(card.colors).toEqual(['W']);
    expect(card.types).toContain('Creature');
    expect(card.subtypes).toEqual(['Human', 'Soldier']);
    expect(card.imageUrl).toBe('https://example.test/token-maker.jpg');
    expect(card.tags).toEqual([]);
  });

  it('handles cards with no power/toughness', () => {
    const raw = fixture.data[2];
    const card = stripScryfallCard(raw);
    expect(card.power).toBeNull();
    expect(card.toughness).toBeNull();
  });

  it('emits a single-element printingDetails carrying set, collectorNumber, mtgoId', () => {
    const raw = {
      oracle_id: '00000000-0000-0000-0000-0000000000B1',
      name: 'Has Details',
      set: 'eoe', collector_number: '6',
      cmc: 3, type_line: 'Enchantment',
      oracle_text: '',
      rarity: 'rare',
      mtgo_id: 142625,
    };
    const card = stripScryfallCard(raw as any);
    expect(card.printingDetails).toEqual([
      { set: 'eoe', collectorNumber: '6', mtgoId: 142625 },
    ]);
  });

  it('omits mtgoId on the printing detail when Scryfall has no mtgo_id', () => {
    const raw = {
      oracle_id: '00000000-0000-0000-0000-0000000000B2',
      name: 'No Detail Id',
      set: 'tle', collector_number: '162',
      cmc: 3, type_line: 'Sorcery',
      oracle_text: '',
      rarity: 'common',
    };
    const card = stripScryfallCard(raw as any);
    expect(card.printingDetails).toEqual([
      { set: 'tle', collectorNumber: '162' },
    ]);
  });

  it('captures mtgo_id when Scryfall provides it', () => {
    const raw = {
      oracle_id: '00000000-0000-0000-0000-0000000000A1',
      name: 'Has MTGO ID',
      set: 'blb', collector_number: '1',
      cmc: 2, type_line: 'Enchantment',
      oracle_text: '',
      rarity: 'rare',
      mtgo_id: 129247,
    };
    const card = stripScryfallCard(raw as any);
    expect(card.mtgoId).toBe(129247);
  });

  it('sets mtgoId to null when Scryfall omits it (paper-only printings)', () => {
    const raw = {
      oracle_id: '00000000-0000-0000-0000-0000000000A2',
      name: 'No MTGO ID',
      set: 'tle', collector_number: '162',
      cmc: 2, type_line: 'Sorcery',
      oracle_text: '',
      rarity: 'common',
    };
    const card = stripScryfallCard(raw as any);
    expect(card.mtgoId).toBeNull();
  });

  it('concatenates oracle text from card_faces when top-level oracle_text is empty', () => {
    const dfc = {
      oracle_id: '00000000-0000-0000-0000-00000000FACE',
      name: 'Flip Card',
      set: 'tdm', collector_number: '99',
      cmc: 3, type_line: 'Creature // Land',
      oracle_text: '',
      rarity: 'rare',
      card_faces: [
        { oracle_text: 'Whenever a creature enters, draw a card.' },
        { oracle_text: 'Create a 1/1 token.' },
      ],
    };
    const card = stripScryfallCard(dfc as any);
    expect(card.oracleText).toContain('Whenever a creature enters');
    expect(card.oracleText).toContain('Create a 1/1 token');
  });
});

describe('fetchSetFromScryfall', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns stripped cards from a single page response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fixture,
    }));
    const cards = await fetchSetFromScryfall('tdm', { cacheDir: null });
    expect(cards).toHaveLength(FIXTURE_COUNT);
    expect(cards[0].name).toBe('Token Maker');
  });

  it('returns empty array on 404 (unreleased set with no spoilers)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    }));
    const cards = await fetchSetFromScryfall('om2', { cacheDir: null });
    expect(cards).toEqual([]);
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    }));
    await expect(fetchSetFromScryfall('tdm', { cacheDir: null })).rejects.toThrow(/503/);
  });
});

describe('fetchSetFromScryfall caching', () => {
  let dir: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    dir = mkdtempSync(join(tmpdir(), 'mtg-graph-fetch-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('skips fetch and uses cached data on subsequent calls', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture });
    vi.stubGlobal('fetch', fetchSpy);
    await fetchSetFromScryfall('tdm', { cacheDir: dir });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(existsSync(join(dir, 'tdm.json'))).toBe(true);

    const cards = await fetchSetFromScryfall('tdm', { cacheDir: dir });
    expect(fetchSpy).toHaveBeenCalledTimes(1); // unchanged — cache hit
    expect(cards).toHaveLength(FIXTURE_COUNT);
    expect(cards[0].name).toBe('Token Maker');
  });

  it('refresh=true bypasses cache read but still writes', async () => {
    writeCachedSet(dir, 'tdm', []); // pretend old cache is empty
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture });
    vi.stubGlobal('fetch', fetchSpy);
    const cards = await fetchSetFromScryfall('tdm', { cacheDir: dir, refresh: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(cards).toHaveLength(FIXTURE_COUNT);
    // verify the file was overwritten with fresh data
    const cards2 = await fetchSetFromScryfall('tdm', { cacheDir: dir });
    expect(cards2).toHaveLength(FIXTURE_COUNT);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
