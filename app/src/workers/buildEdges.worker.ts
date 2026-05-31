import type { Card, InteractionEdge, TagDef } from '@shared/types';
import { buildEdges } from '../../../pipeline/graph';

type Request = { cards: Card[]; catalog: TagDef[] };
type Response = { edges: InteractionEdge[] };

self.onmessage = (e: MessageEvent<Request>) => {
  const { cards, catalog } = e.data;
  const edges = buildEdges(cards, catalog);
  const response: Response = { edges };
  postMessage(response);
};
