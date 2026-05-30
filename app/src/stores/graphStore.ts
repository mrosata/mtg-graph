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

function applyArtifact(
  artifact: Artifact,
  set: (partial: Partial<GraphState>) => void,
): void {
  const cards = new Map(artifact.cards.map((c) => [c.oracleId, c]));
  const edges = new Map<string, InteractionEdge[]>();
  const edgesInbound = new Map<string, InteractionEdge[]>();
  for (const edge of artifact.edges) {
    const out = edges.get(edge.source) ?? [];
    out.push(edge);
    edges.set(edge.source, out);
    const inb = edgesInbound.get(edge.target) ?? [];
    inb.push(edge);
    edgesInbound.set(edge.target, inb);
  }
  const tagCatalog = new Map(artifact.tagCatalog.map((t) => [t.tagId, t]));
  set({
    cards, edges, edgesInbound, tagCatalog,
    ruleVersion: artifact.ruleVersion,
    status: 'ready',
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
        applyArtifact(hit.artifact, set);
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

      applyArtifact(artifact, set);
    } catch (err) {
      console.error('[graphStore] hydrate failed:', err);
      set({ status: 'error' });
    }
  },
}));
