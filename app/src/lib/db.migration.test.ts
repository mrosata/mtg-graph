import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';
import { makeMtgDb } from './db';

describe('Dexie migration v1 → v2', () => {
  it('copies cards into originalCards and workingCards and removes the cards field', async () => {
    const dbName = `migration-test-${crypto.randomUUID()}`;

    // Set up a v1 database with one deck in the old shape
    const v1 = new Dexie(dbName);
    v1.version(1).stores({ decks: 'id, name, updatedAt', artifactCache: '&ruleVersion' });
    await v1.open();
    await v1.table('decks').put({
      id: 'd1',
      name: 'Legacy',
      format: 'standard',
      cards: [
        { oracleId: 'a', count: 4, name: 'Lightning Bolt' },
        { oracleId: 'b', count: 2 },
      ],
      createdAt: 100,
      updatedAt: 200,
    });
    v1.close();

    // Open the same database via the production factory (declares v1 + v2)
    const v2 = makeMtgDb(dbName);
    await v2.open();
    const row = await v2.decks.get('d1');
    expect(row).toBeDefined();
    expect(row!.originalCards).toEqual([
      { oracleId: 'a', count: 4, name: 'Lightning Bolt' },
      { oracleId: 'b', count: 2 },
    ]);
    expect(row!.workingCards).toEqual([
      { oracleId: 'a', count: 4, name: 'Lightning Bolt' },
      { oracleId: 'b', count: 2 },
    ]);
    expect((row as unknown as { cards?: unknown }).cards).toBeUndefined();
    v2.close();
  });

  it('migrates multiple decks', async () => {
    const dbName = `migration-test-${crypto.randomUUID()}`;
    const v1 = new Dexie(dbName);
    v1.version(1).stores({ decks: 'id, name, updatedAt', artifactCache: '&ruleVersion' });
    await v1.open();
    await v1.table('decks').bulkPut([
      { id: 'd1', name: 'A', format: 'standard', cards: [{ oracleId: 'a', count: 1 }], createdAt: 0, updatedAt: 0 },
      { id: 'd2', name: 'B', format: 'standard', cards: [], createdAt: 0, updatedAt: 0 },
    ]);
    v1.close();

    const v2 = makeMtgDb(dbName);
    await v2.open();
    const rows = await v2.decks.toArray();
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.originalCards).toBeDefined();
      expect(r.workingCards).toBeDefined();
      expect((r as unknown as { cards?: unknown }).cards).toBeUndefined();
      expect(r.originalCards).toEqual(r.workingCards);
    }
    v2.close();
  });

  it('opens cleanly on a brand-new database with no v1 data', async () => {
    const dbName = `migration-test-${crypto.randomUUID()}`;
    const v2 = makeMtgDb(dbName);
    await v2.open();
    expect(await v2.decks.toArray()).toEqual([]);
    v2.close();
  });
});

describe('v2 -> v3 migration', () => {
  it('adds library and prefs tables, preserves existing decks', async () => {
    const dbName = `mig-v2-to-v3-${Date.now()}`;

    // Seed a v2 database with one deck (mirrors v2 schema from db.ts).
    const v2 = new Dexie(dbName);
    v2.version(1).stores({ decks: 'id, name, updatedAt', artifactCache: '&ruleVersion' });
    v2.version(2).stores({ decks: 'id, name, updatedAt', artifactCache: '&ruleVersion' });
    await v2.open();
    await v2.table('decks').put({
      id: 'd1', name: 'Pre-migration', originalCards: [], workingCards: [],
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    v2.close();

    // Open with the current (v3) schema.
    const { makeMtgDb } = await import('./db');
    const v3 = makeMtgDb(dbName);
    await v3.open();

    const decks = await v3.decks.toArray();
    expect(decks).toHaveLength(1);
    expect(decks[0]?.name).toBe('Pre-migration');

    expect(await v3.library.count()).toBe(0);
    expect(await v3.prefs.count()).toBe(0);

    v3.close();
    await Dexie.delete(dbName);
  });
});
