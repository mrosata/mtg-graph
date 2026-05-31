// app/src/stores/graphStore.ts
import { create } from 'zustand';
import type { Card, InteractionEdge, TagDef, Artifact } from '@shared/types';
import { RULE_VERSION } from '@shared/version';
import { db } from '../lib/db';

type GraphState = {
  cards: Map<string, Card>;
  edges: Map<string, InteractionEdge[]>;
  edgesInbound: Map<string, InteractionEdge[]>;
  tagCatalog: Map<string, TagDef>;
  ruleVersion: string;
  status: 'loading' | 'ready' | 'error';
  hydrate: (url: string) => Promise<void>;
};

async function applyArtifact(
  artifact: Artifact,
  set: (partial: Partial<GraphState>) => void,
): Promise<void> {
  const cards = new Map(artifact.cards.map((c) => [c.oracleId, c]));
  const tagCatalog = new Map(artifact.tagCatalog.map((t) => [t.tagId, t]));

  const edges = await computeEdges(artifact.cards, artifact.tagCatalog);

  const outbound = new Map<string, InteractionEdge[]>();
  const inbound = new Map<string, InteractionEdge[]>();
  for (const edge of edges) {
    const o = outbound.get(edge.source) ?? [];
    o.push(edge);
    outbound.set(edge.source, o);
    const i = inbound.get(edge.target) ?? [];
    i.push(edge);
    inbound.set(edge.target, i);
  }

  set({
    cards,
    edges: outbound,
    edgesInbound: inbound,
    tagCatalog,
    ruleVersion: artifact.ruleVersion,
    status: 'ready',
  });
}

function computeEdges(cards: Card[], catalog: TagDef[]): Promise<InteractionEdge[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/buildEdges.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker.onmessage = (e: MessageEvent<{ edges: InteractionEdge[] }>) => {
      resolve(e.data.edges);
      worker.terminate();
    };
    worker.onerror = (e) => {
      reject(new Error(`buildEdges worker failed: ${e.message}`));
      worker.terminate();
    };
    worker.postMessage({ cards, catalog });
  });
}

// URLs look like `/data/cards-<setCode>.json`. Parsing the set out of the URL
// lets the cache lookup compare against the cached row's sourceSet without
// changing the public hydrate signature.
function setCodeFromUrl(url: string): string | null {
  return url.match(/cards-([^/]+)\.json(?:\?|$)/)?.[1] ?? null;
}

export const useGraphStore = create<GraphState>((set) => ({
  cards: new Map(),
  edges: new Map(),
  edgesInbound: new Map(),
  tagCatalog: new Map(),
  ruleVersion: '',
  status: 'loading',
  hydrate: async (url) => {
    set({ status: 'loading' });
    try {
      const expectedSet = setCodeFromUrl(url);

      const cachedRows = await db.artifactCache.toArray();
      const staleVersions = cachedRows
        .filter((r) => r.ruleVersion !== RULE_VERSION)
        .map((r) => r.ruleVersion);
      if (staleVersions.length > 0) {
        await db.artifactCache.bulkDelete(staleVersions);
      }
      const hit = cachedRows.find(
        (r) => r.ruleVersion === RULE_VERSION && r.sourceSet === expectedSet,
      );
      if (hit) {
        await applyArtifact(hit.artifact, set);
        return;
      }

      const resp = await fetch(url);
      if (!resp.ok) {
        console.error('[graphStore] hydrate failed: response not ok', resp.status, resp.statusText);
        set({ status: 'error' });
        return;
      }
      const artifact = (await resp.json()) as Artifact;

      await db.artifactCache.put({
        ruleVersion: artifact.ruleVersion,
        sourceSet: artifact.sourceSet,
        fetchedAt: Date.now(),
        artifact,
      }).catch(() => undefined);

      await applyArtifact(artifact, set);
    } catch (err) {
      console.error('[graphStore] hydrate failed:', err);
      set({ status: 'error' });
    }
  },
}));
