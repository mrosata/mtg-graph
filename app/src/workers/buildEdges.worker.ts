import type { Card, InteractionEdge, TagDef } from '@shared/types';
import { buildEdges } from '../../../pipeline/graph';

type Request = { cards: Card[]; catalog: TagDef[] };
type Response = { edges: InteractionEdge[]; done: boolean };

// The full Standard+ artifact yields millions of edges; cloning them in a
// single postMessage throws DataCloneError (out of memory). Stream in chunks.
const CHUNK_SIZE = 100_000;

self.onmessage = (e: MessageEvent<Request>) => {
  const { cards, catalog } = e.data;
  const edges = buildEdges(cards, catalog);
  if (edges.length === 0) {
    postMessage({ edges: [], done: true } satisfies Response);
    return;
  }
  for (let i = 0; i < edges.length; i += CHUNK_SIZE) {
    const chunk = edges.slice(i, i + CHUNK_SIZE);
    postMessage({ edges: chunk, done: i + CHUNK_SIZE >= edges.length } satisfies Response);
  }
};
