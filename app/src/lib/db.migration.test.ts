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
