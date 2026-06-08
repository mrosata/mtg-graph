import { describe, it, expect } from 'vitest';
import { parseMtgaLogText, parseMtgaLogFile } from './mtgaLogParser';

import healthy from '../../tests/fixtures/mtga/healthy.log?raw';
import collectionOnly from '../../tests/fixtures/mtga/collection-only.log?raw';
import decksOnly from '../../tests/fixtures/mtga/decks-only.log?raw';
import empty from '../../tests/fixtures/mtga/empty.log?raw';
import versioned from '../../tests/fixtures/mtga/versioned.log?raw';
import multiSnapshot from '../../tests/fixtures/mtga/multi-snapshot.log?raw';

describe('parseMtgaLogText', () => {
  it('extracts both collection and decks from a healthy log', () => {
    const r = parseMtgaLogText(healthy);
    expect(r.collection).toEqual({ '70001': 4, '70002': 2, '70003': 1 });
    expect(r.decks).toHaveLength(2);
    expect(r.decks?.[0]).toMatchObject({ id: 'deck-aaa', name: 'Mono-Red Aggro', format: 'Standard' });
    expect(r.decks?.[0]?.mainDeck).toEqual([
      { id: 70001, quantity: 4 }, { id: 70002, quantity: 2 },
    ]);
  });

  it('returns null for the missing event when only collection is present', () => {
    const r = parseMtgaLogText(collectionOnly);
    expect(r.collection).toEqual({ '70001': 4, '70002': 2, '70003': 1 });
    expect(r.decks).toBeNull();
  });

  it('returns null for the missing event when only decks are present', () => {
    const r = parseMtgaLogText(decksOnly);
    expect(r.collection).toBeNull();
    expect(r.decks).toHaveLength(2);
    expect(r.decks?.[0]?.name).toBe('Mono-Red Aggro');
  });

  it('returns both null on a log with no matching events', () => {
    const r = parseMtgaLogText(empty);
    expect(r.collection).toBeNull();
    expect(r.decks).toBeNull();
  });

  it('accepts version-drifted event names (V4)', () => {
    const r = parseMtgaLogText(versioned);
    expect(r.collection).not.toBeNull();
  });

  it('uses the last snapshot when multiple are present', () => {
    const r = parseMtgaLogText(multiSnapshot);
    expect(r.collection).toEqual({ '70001': 4, '70002': 4 });
  });

  it('only matches response (<==) markers, not request (==>)', () => {
    // A request-form marker carries no payload; treat as ignored.
    const txt = '[UnityCrossThreadLogger]==> PlayerInventory.GetPlayerCardsV3(7, "")\n{"id":7,"request":""}\n';
    expect(parseMtgaLogText(txt).collection).toBeNull();
  });
});

function fileFrom(text: string): File {
  return new File([text], 'Player.log', { type: 'text/plain' });
}

describe('parseMtgaLogFile', () => {
  it('streams a small log and returns the same result as parseMtgaLogText', async () => {
    const file = fileFrom(healthy);
    const result = await parseMtgaLogFile(file);
    expect(result).toEqual(parseMtgaLogText(healthy));
  });

  it('reports progress as bytes are consumed', async () => {
    const file = fileFrom(healthy);
    const progress: number[] = [];
    await parseMtgaLogFile(file, (bytesRead, total) => {
      progress.push(bytesRead);
      expect(total).toBe(file.size);
    });
    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1]).toBe(file.size);
  });

  it('recovers when an event payload spans the chunk boundary', async () => {
    const file = fileFrom(healthy);
    // Force a tiny chunk size so the JSON definitely splits.
    const result = await parseMtgaLogFile(file, undefined, { chunkSize: 16 });
    expect(result.collection).toEqual({ '70001': 4, '70002': 2, '70003': 1 });
    expect(result.decks).toHaveLength(2);
  });
});
