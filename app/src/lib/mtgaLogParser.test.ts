import { describe, it, expect } from 'vitest';
import { parseMtgaLogText } from './mtgaLogParser';

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
    expect(r.collection).not.toBeNull();
    expect(r.decks).toBeNull();
  });

  it('returns null for the missing event when only decks are present', () => {
    const r = parseMtgaLogText(decksOnly);
    expect(r.collection).toBeNull();
    expect(r.decks).not.toBeNull();
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
