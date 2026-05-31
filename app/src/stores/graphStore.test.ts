// app/src/stores/graphStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGraphStore } from './graphStore';
import { db } from '../lib/db';
import { RULE_VERSION } from '@shared/version';
import type { Artifact } from '@shared/types';
import { buildEdges } from '../../../pipeline/graph';
import type { Card, InteractionEdge, TagDef } from '@shared/types';

class FakeWorker {
  onmessage: ((e: MessageEvent<{ edges: InteractionEdge[] }>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postMessage(data: { cards: Card[]; catalog: TagDef[] }) {
    queueMicrotask(() => {
      const edges = buildEdges(data.cards, data.catalog);
      this.onmessage?.({ data: { edges } } as MessageEvent<{ edges: InteractionEdge[] }>);
    });
  }
  terminate() {}
}

const makeArtifact = (overrides: Partial<Artifact> = {}): Artifact => ({
  cards: [
    {
      oracleId: 'a', name: 'A', set: 't', printings: ['t'], collectorNumber: '1',
      manaCost: null, cmc: 0, colors: [], colorIdentity: [],
      typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
      oracleText: '', keywords: [], power: '1', toughness: '1',
      rarity: 'common', imageUrl: '', tags: [],
    },
  ],
  tagCatalog: [],
  generatedAt: '2026-01-01T00:00:00Z',
  sourceSet: 't',
  sourceSets: ['t'],
  ruleVersion: RULE_VERSION,
  ...overrides,
});

const fixtureArtifact: Artifact = makeArtifact({ ruleVersion: 'test' });

beforeEach(async () => {
  vi.restoreAllMocks();
  await db.artifactCache.clear();
  useGraphStore.setState({
    cards: new Map(), edges: new Map(), edgesInbound: new Map(),
    tagCatalog: new Map(), ruleVersion: '', status: 'loading',
  });
  vi.stubGlobal('Worker', FakeWorker);
});

describe('graphStore.hydrate', () => {
  it('loads artifact from fetch and populates maps', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fixtureArtifact,
    }));
    await useGraphStore.getState().hydrate('/data/cards-t.json');
    expect(useGraphStore.getState().status).toBe('ready');
    expect(useGraphStore.getState().cards.size).toBe(1);
    expect(useGraphStore.getState().cards.get('a')?.name).toBe('A');
  });

  it('sets status to error on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' }));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await useGraphStore.getState().hydrate('/data/cards-t.json');
    expect(useGraphStore.getState().status).toBe('error');
    expect(errSpy).toHaveBeenCalledWith(
      '[graphStore] hydrate failed: response not ok',
      500,
      'Internal Server Error',
    );
  });

  it('loads from artifactCache when ruleVersion and sourceSet match and skips fetch', async () => {
    const cachedArtifact = makeArtifact({ sourceSet: 't', ruleVersion: RULE_VERSION });
    await db.artifactCache.put({
      ruleVersion: RULE_VERSION,
      sourceSet: 't',
      fetchedAt: Date.now(),
      artifact: cachedArtifact,
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await useGraphStore.getState().hydrate('/data/cards-t.json');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(useGraphStore.getState().status).toBe('ready');
    expect(useGraphStore.getState().cards.size).toBe(1);
    expect(useGraphStore.getState().ruleVersion).toBe(RULE_VERSION);
  });

  it('falls back to fetch on cache miss and writes the result to cache', async () => {
    const freshArtifact = makeArtifact({ sourceSet: 't', ruleVersion: RULE_VERSION });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => freshArtifact,
    }));

    await useGraphStore.getState().hydrate('/data/cards-t.json');

    expect(useGraphStore.getState().status).toBe('ready');
    const rows = await db.artifactCache.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ruleVersion).toBe(RULE_VERSION);
    expect(rows[0]?.sourceSet).toBe('t');
  });

  it('deletes stale rows with a different ruleVersion and refetches', async () => {
    const staleArtifact = makeArtifact({ sourceSet: 't', ruleVersion: 'v0.0.0-old' });
    await db.artifactCache.put({
      ruleVersion: 'v0.0.0-old',
      sourceSet: 't',
      fetchedAt: Date.now() - 1000,
      artifact: staleArtifact,
    });
    const freshArtifact = makeArtifact({ sourceSet: 't', ruleVersion: RULE_VERSION });
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => freshArtifact });
    vi.stubGlobal('fetch', fetchSpy);

    await useGraphStore.getState().hydrate('/data/cards-t.json');

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(useGraphStore.getState().status).toBe('ready');
    const rows = await db.artifactCache.toArray();
    expect(rows.map((r) => r.ruleVersion)).toEqual([RULE_VERSION]);
  });

  it('refetches when ruleVersion matches but sourceSet does not', async () => {
    const otherSetArtifact = makeArtifact({ sourceSet: 'other', ruleVersion: RULE_VERSION });
    await db.artifactCache.put({
      ruleVersion: RULE_VERSION,
      sourceSet: 'other',
      fetchedAt: Date.now(),
      artifact: otherSetArtifact,
    });
    const freshArtifact = makeArtifact({ sourceSet: 't', ruleVersion: RULE_VERSION });
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => freshArtifact });
    vi.stubGlobal('fetch', fetchSpy);

    await useGraphStore.getState().hydrate('/data/cards-t.json');

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(useGraphStore.getState().status).toBe('ready');
  });

  it('populates adjacency maps from worker-computed edges', async () => {
    const artifact = makeArtifact({
      sourceSet: 't',
      ruleVersion: RULE_VERSION,
      cards: [
        {
          oracleId: 'a', name: 'A', set: 't', printings: ['t'], collectorNumber: '1',
          manaCost: null, cmc: 0, colors: [], colorIdentity: [],
          typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
          oracleText: '', keywords: [], power: '1', toughness: '1',
          rarity: 'common', imageUrl: '',
          tags: [{ tagId: 'effect.create_token', axis: 'effect' as const, evidence: 'token' }],
        },
        {
          oracleId: 'b', name: 'B', set: 't', printings: ['t'], collectorNumber: '2',
          manaCost: null, cmc: 0, colors: [], colorIdentity: [],
          typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
          oracleText: '', keywords: [], power: '1', toughness: '1',
          rarity: 'common', imageUrl: '',
          tags: [{ tagId: 'trigger.token_created', axis: 'trigger' as const, evidence: 'token created' }],
        },
      ],
      tagCatalog: [
        { tagId: 'effect.create_token', axis: 'effect', label: 'Create token', description: '', pairsWith: ['trigger.token_created'] },
        { tagId: 'trigger.token_created', axis: 'trigger', label: 'Token created', description: '', pairsWith: [] },
      ],
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => artifact }));

    await useGraphStore.getState().hydrate('/data/cards-t.json');

    expect(useGraphStore.getState().status).toBe('ready');
    const outbound = useGraphStore.getState().edges.get('a');
    expect(outbound).toHaveLength(1);
    expect(outbound?.[0]).toEqual({
      source: 'a',
      target: 'b',
      reason: {
        sourceTagId: 'effect.create_token',
        targetTagId: 'trigger.token_created',
        direction: 'source_produces_for_target',
      },
    });
    const inbound = useGraphStore.getState().edgesInbound.get('b');
    expect(inbound).toHaveLength(1);
    expect(inbound?.[0]?.source).toBe('a');
  });
});
