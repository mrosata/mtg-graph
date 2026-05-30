import { useEffect, useRef, type MutableRefObject } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
  type ForceLink,
} from 'd3-force';
import type { GraphOutput } from '../../lib/deckGraph';

type SimNode = SimulationNodeDatum & {
  id: string;
  radius: number;
};
type SimLink = SimulationLinkDatum<SimNode> & {
  weight: number;
};

export type Viewport = { width: number; height: number };

export type SimulationApi = {
  positions: MutableRefObject<Map<string, { x: number; y: number }>>;
  simulation: MutableRefObject<Simulation<SimNode, SimLink> | null>;
  pin: (id: string, pos: { x: number; y: number } | null) => void;
};

export function useDeckGraphSimulation(graph: GraphOutput, viewport: Viewport): SimulationApi {
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const nodeMapRef = useRef<Map<string, SimNode>>(new Map());
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  // Tracks the previous base-topology hash so a bridge-only change can use a
  // gentler alpha kick — base nodes stay visually still while only bridges settle.
  const lastBaseTopologyKeyRef = useRef<string | null>(null);

  // Topology key: change to set of node ids or edge pairs forces re-init.
  const topologyKey =
    JSON.stringify(graph.nodes.map((n) => n.id).sort()) +
    '||' +
    JSON.stringify(graph.edges.map((e) => [e.source, e.target].sort()).sort());

  // Base-only topology key — excludes bridge nodes and bridge edges. When this
  // is unchanged across a re-init, the alpha kick is reduced so deck + candidate
  // nodes don't visibly jump when the user is just clicking between selections.
  const baseTopologyKey =
    JSON.stringify(graph.nodes.filter((n) => n.cls !== 'bridge').map((n) => n.id).sort()) +
    '||' +
    JSON.stringify(graph.edges.filter((e) => e.kind !== 'bridge').map((e) => [e.source, e.target].sort()).sort());

  useEffect(() => {
    const existing = nodeMapRef.current;
    const next = new Map<string, SimNode>();

    for (const n of graph.nodes) {
      const prev = existing.get(n.id);
      if (prev) {
        prev.radius = n.radius;
        next.set(n.id, prev);
      } else {
        // Spawn new node at centroid of already-positioned neighbors, jittered.
        const incidentIds = graph.edges
          .filter((e) => e.source === n.id || e.target === n.id)
          .map((e) => (e.source === n.id ? e.target : e.source));
        const positioned = incidentIds
          .map((id) => existing.get(id))
          .filter((s): s is SimNode => !!s && typeof s.x === 'number');
        let cx = viewport.width / 2;
        let cy = viewport.height / 2;
        if (positioned.length) {
          cx = positioned.reduce((s, p) => s + (p.x ?? 0), 0) / positioned.length;
          cy = positioned.reduce((s, p) => s + (p.y ?? 0), 0) / positioned.length;
        }
        next.set(n.id, {
          id: n.id,
          radius: n.radius,
          x: cx + (Math.random() - 0.5) * 20,
          y: cy + (Math.random() - 0.5) * 20,
        });
      }
    }
    nodeMapRef.current = next;

    const simNodes = Array.from(next.values());
    const simLinks: SimLink[] = graph.edges.map((e) => ({
      source: e.source, target: e.target, weight: e.weight,
    }));

    const baseChanged = lastBaseTopologyKeyRef.current !== baseTopologyKey;
    lastBaseTopologyKeyRef.current = baseTopologyKey;

    if (!simRef.current) {
      simRef.current = forceSimulation<SimNode, SimLink>(simNodes)
        .force('link', forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((d) => 80 / Math.sqrt(Math.max(0.001, d.weight))))
        .force('charge', forceManyBody<SimNode>().strength(-180))
        .force('center', forceCenter(viewport.width / 2, viewport.height / 2))
        .force('collide', forceCollide<SimNode>((d) => d.radius + 4))
        .alphaDecay(0.05);
    } else {
      simRef.current.nodes(simNodes);
      const linkForce = simRef.current.force('link') as ForceLink<SimNode, SimLink> | null;
      if (linkForce) linkForce.links(simLinks);
      // Bridges in/out only → light nudge so settled base nodes stay put.
      simRef.current.alpha(baseChanged ? 0.3 : 0.05).restart();
    }

    const onTick = () => {
      for (const n of simNodes) {
        if (typeof n.x === 'number' && typeof n.y === 'number') {
          positionsRef.current.set(n.id, { x: n.x, y: n.y });
        }
      }
    };
    simRef.current.on('tick', onTick);
    onTick();

    return () => {
      simRef.current?.on('tick', null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topologyKey, baseTopologyKey, viewport.width, viewport.height]);

  useEffect(() => {
    return () => { simRef.current?.stop(); };
  }, []);

  const pin = (id: string, pos: { x: number; y: number } | null) => {
    const node = nodeMapRef.current.get(id);
    if (!node) return;
    if (pos) { node.fx = pos.x; node.fy = pos.y; }
    else     { node.fx = null;  node.fy = null;  }
    simRef.current?.alpha(0.1).restart();
  };

  return { positions: positionsRef, simulation: simRef, pin };
}
