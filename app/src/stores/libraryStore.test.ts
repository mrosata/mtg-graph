// app/src/stores/libraryStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { useLibraryStore } from './libraryStore';
import type { LibraryImportResult } from '../lib/libraryImport';

function fakeResult(overrides: Partial<LibraryImportResult> = {}): LibraryImportResult {
  return {
    owned: new Map([['bolt-id', 4], ['mtn-id', 20]]),
    unknownNames: [],
    unknownSets: [],
    unparseableLines: [],
    ...overrides,
  };
}

describe('libraryStore', () => {
  beforeEach(async () => {
    useLibraryStore.setState({ owned: null, enabled: false, meta: null });
    await Promise.all([db.library.clear(), db.prefs.clear()]);
  });

  it('hydrate with no Dexie row leaves state empty', async () => {
    await useLibraryStore.getState().hydrate();
    const s = useLibraryStore.getState();
    expect(s.owned).toBeNull();
    expect(s.meta).toBeNull();
    expect(s.enabled).toBe(false);
  });

  it('importLibrary writes Dexie, populates state, and auto-enables on first import', async () => {
    await useLibraryStore.getState().importLibrary(fakeResult(), 'collection.csv');

    const s = useLibraryStore.getState();
    expect(s.owned?.get('bolt-id')).toBe(4);
    expect(s.enabled).toBe(true);
    expect(s.meta?.sourceFilename).toBe('collection.csv');

    const row = await db.library.get('main');
    expect(row?.owned['bolt-id']).toBe(4);
    expect((await db.prefs.get('main'))?.libraryEnabled).toBe(true);
  });

  it('hydrate loads a previously imported library', async () => {
    await useLibraryStore.getState().importLibrary(fakeResult(), 'col.csv');

    useLibraryStore.setState({ owned: null, enabled: false, meta: null });

    await useLibraryStore.getState().hydrate();
    const s = useLibraryStore.getState();
    expect(s.owned?.get('mtn-id')).toBe(20);
    expect(s.enabled).toBe(true);
    expect(s.meta?.sourceFilename).toBe('col.csv');
  });

  it('clearLibrary deletes Dexie row, clears state, disables', async () => {
    await useLibraryStore.getState().importLibrary(fakeResult(), 'col.csv');

    await useLibraryStore.getState().clearLibrary();

    const s = useLibraryStore.getState();
    expect(s.owned).toBeNull();
    expect(s.meta).toBeNull();
    expect(s.enabled).toBe(false);

    expect(await db.library.get('main')).toBeUndefined();
    expect((await db.prefs.get('main'))?.libraryEnabled).toBe(false);
  });

  it('setEnabled toggles the persisted flag without touching the library', async () => {
    await useLibraryStore.getState().importLibrary(fakeResult(), 'col.csv');

    await useLibraryStore.getState().setEnabled(false);
    expect(useLibraryStore.getState().enabled).toBe(false);
    expect(useLibraryStore.getState().owned?.size).toBe(2);
    expect((await db.prefs.get('main'))?.libraryEnabled).toBe(false);

    await useLibraryStore.getState().setEnabled(true);
    expect((await db.prefs.get('main'))?.libraryEnabled).toBe(true);
  });

  it('importLibrary preserves an existing enabled=false preference on re-import', async () => {
    await useLibraryStore.getState().importLibrary(fakeResult(), 'a.csv');
    await useLibraryStore.getState().setEnabled(false);

    await useLibraryStore.getState().importLibrary(fakeResult(), 'b.csv');
    expect(useLibraryStore.getState().enabled).toBe(false);
  });
});
