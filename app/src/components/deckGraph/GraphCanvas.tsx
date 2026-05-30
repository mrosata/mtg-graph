import { useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';
import 'd3-transition'; // augments d3-selection with .transition()
import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { useDeckGraphSimulation } from './useDeckGraphSimulation';
import { FAMILIES } from '../../lib/tagFamilies';
import type { GraphOutput } from '../../lib/deckGraph';
import { TOUR_IDS } from '../../wizard/selectors';

const COLOR_BY_FAMILY = new Map(FAMILIES.map((f) => [f.id, f.color]));
const AMBER = '#fbbf24';
const NEUTRAL = '#3a3a3a';
const SELECTED = '#ef4444';

// d3-zoom filter: decides which events trigger pan/zoom. Returning false also
// skips d3-zoom's preventDefault(), so a rejected wheel event falls through to
// the browser — and a wheel-with-ctrlKey (Mac trackpad pinch) then zooms the
// PAGE. The node-target check must therefore apply only to pointer events.
export function shouldHandleZoomEvent(event: {
  type: string;
  button?: number;
  ctrlKey?: boolean;
  target: EventTarget | null;
}): boolean {
  if (event.type === 'mousedown' && event.button !== 0) return false;
  if (event.ctrlKey && event.type !== 'wheel') return false;
  if (event.type !== 'wheel') {
    const target = event.target as Element | null;
    if (target?.closest?.('[data-node-id]')) return false;
  }
  return true;
}

type Props = {
  graph: GraphOutput;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
};

export default function GraphCanvas({ graph, selectedId, hoveredId, onSelect, onFocus }: Props) {
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomTargetRef = useRef<SVGGElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  // Current zoom scale. Updated by the d3-zoom listener; read by the RAF loop
  // to counter-scale node/edge visuals so they stay screen-constant.
  const zoomScaleRef = useRef(1);
  const sim = useDeckGraphSimulation(graph, viewport);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // d3-zoom: wheel to zoom, drag on empty space to pan. Mousedown on a node
  // is filtered out so node clicks/double-clicks still work and dragging *from*
  // a node never accidentally pans.
  useEffect(() => {
    if (!svgRef.current || !zoomTargetRef.current) return;
    const svgEl = svgRef.current;
    const gEl = zoomTargetRef.current;
    const svg = select<SVGSVGElement, unknown>(svgEl);
    const g = select<SVGGElement, unknown>(gEl);

    const behavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3])
      .filter(shouldHandleZoomEvent)
      .on('zoom', (event) => {
        gEl.setAttribute('transform', event.transform.toString());
        zoomScaleRef.current = event.transform.k;
      });

    svg.call(behavior);
    svg.on('dblclick.zoom', null);
    zoomBehaviorRef.current = behavior;

    return () => {
      svg.on('.zoom', null);
      g.attr('transform', null);
      zoomBehaviorRef.current = null;
    };
  }, []);

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select<SVGSVGElement, unknown>(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.transform, zoomIdentity);
  };

  // RAF loop: write positions + counter-scale to SVG attrs directly (no React
  // re-render per tick). Counter-scaling keeps node/text visually constant size
  // as zoom changes — line stroke widths use SVG's `vector-effect` for the
  // same effect on edges (simpler than per-frame width math).
  const nodeOuterRefs = useRef<Map<string, SVGGElement | null>>(new Map());
  const nodeInnerRefs = useRef<Map<string, SVGGElement | null>>(new Map());
  const haloRefs = useRef<Map<string, SVGCircleElement | null>>(new Map());
  const edgeRefs = useRef<Map<string, SVGLineElement | null>>(new Map());
  const markRefs = useRef<Map<string, SVGGElement | null>>(new Map());
  const hoveredIdRef = useRef<string | null>(hoveredId);
  useEffect(() => {
    hoveredIdRef.current = hoveredId;
  }, [hoveredId]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const inv = 1 / zoomScaleRef.current;
      const invScaleStr = `scale(${inv})`;

      for (const [id, el] of nodeOuterRefs.current) {
        if (!el) continue;
        const pos = sim.positions.current.get(id);
        if (!pos) continue;
        el.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
      }
      for (const [, el] of nodeInnerRefs.current) {
        if (!el) continue;
        el.setAttribute('transform', invScaleStr);
      }
      const hov = hoveredIdRef.current;
      for (const [id, el] of haloRefs.current) {
        if (!el) continue;
        el.setAttribute('opacity', id === hov ? '1' : '0');
      }
      for (const edge of graph.edges) {
        const key = `${edge.source}|${edge.target}`;
        const lineEl = edgeRefs.current.get(key);
        const markEl = markRefs.current.get(key);
        const s = sim.positions.current.get(edge.source);
        const t = sim.positions.current.get(edge.target);
        if (!s || !t) continue;
        if (lineEl) {
          lineEl.setAttribute('x1', String(s.x));
          lineEl.setAttribute('y1', String(s.y));
          lineEl.setAttribute('x2', String(t.x));
          lineEl.setAttribute('y2', String(t.y));
        }
        if (markEl) {
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;
          markEl.setAttribute('transform', `translate(${midX}, ${midY}) ${invScaleStr}`);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [graph, sim.positions]);

  if (graph.nodes.length > 0 && graph.edges.length === 0) {
    return (
      <div ref={containerRef} className="relative h-full w-full" data-testid="graph-canvas" data-tour-id={TOUR_IDS.graphCanvas}>
        <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
          No edges match the current filters.
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-neutral-950" data-testid="graph-canvas" data-tour-id={TOUR_IDS.graphCanvas}>
      <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${viewport.width} ${viewport.height}`}>
        <g ref={zoomTargetRef} data-layer="zoom-target">
          <g data-layer="edges">
            {graph.edges.map((e) => {
              const color = COLOR_BY_FAMILY.get(e.dominantFamily) ?? '#666';
              const width = 1 + Math.sqrt(Math.max(0, e.totalEdgeCount - 1));
              const isIncident =
                selectedId !== null && (e.source === selectedId || e.target === selectedId);
              const isBridge = e.kind === 'bridge';
              const opacity = isIncident ? 1 : isBridge ? 0.75 : 0.25;
              const key = `${e.source}|${e.target}`;
              const isMulti = e.familyBreakdown.length >= 2;
              const dashArray = isBridge ? '4 3' : undefined;
              return (
                <g key={key}>
                  <line
                    ref={(el) => { edgeRefs.current.set(key, el); }}
                    stroke={color}
                    strokeWidth={width}
                    strokeOpacity={opacity}
                    strokeDasharray={dashArray}
                    vectorEffect="non-scaling-stroke"
                    data-edge
                    {...(isBridge ? { 'data-bridge-edge': '' } : {})}
                  />
                  {isMulti && (
                    <g
                      ref={(el) => { markRefs.current.set(key, el); }}
                      data-edge-multimark
                    >
                      <circle
                        r={3}
                        fill={color}
                        stroke="#0a0a0a"
                        strokeWidth={1}
                        opacity={opacity}
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  )}
                </g>
              );
            })}
          </g>
          <g data-layer="nodes">
            {graph.nodes.map((n) => {
              const isBridge = n.cls === 'bridge';
              const stroke =
                selectedId === n.id ? SELECTED
                : n.cls === 'deck'  ? AMBER
                : isBridge          ? '#3a3a3a'
                : NEUTRAL;
              const strokeWidth = selectedId === n.id ? 3 : n.cls === 'deck' ? 1.8 : 1;
              const strokeDash = isBridge ? '3 2' : undefined;
              const label =
                n.card.name.length > 14 ? n.card.name.slice(0, 13) + '…' : n.card.name;
              return (
                <g
                  key={n.id}
                  data-node-id={n.id}
                  ref={(el) => { nodeOuterRefs.current.set(n.id, el); }}
                  aria-label={n.card.name}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onClick={(ev) => { ev.stopPropagation(); onSelect(n.id); }}
                  onDoubleClick={(ev) => { ev.stopPropagation(); onFocus(n.id); }}
                >
                  <g ref={(el) => { nodeInnerRefs.current.set(n.id, el); }}>
                    <circle
                      ref={(el) => { haloRefs.current.set(n.id, el); }}
                      r={n.radius + 5}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      strokeDasharray="3 2"
                      opacity={0}
                      vectorEffect="non-scaling-stroke"
                      pointerEvents="none"
                      data-halo
                    />
                    <circle
                      r={n.radius}
                      fill="#161616"
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDash}
                      vectorEffect="non-scaling-stroke"
                    />
                    <text
                      textAnchor="middle"
                      dy="0.35em"
                      fontSize={10}
                      fill={n.cls === 'deck' ? '#f5e0a0' : '#cccccc'}
                      pointerEvents="none"
                    >
                      {label}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
      <button
        type="button"
        onClick={handleResetZoom}
        className="absolute right-3 top-3 rounded border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-[11px] text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
        aria-label="Reset zoom"
        title="Reset zoom · drag empty space to pan · scroll to zoom"
      >
        Reset zoom
      </button>
    </div>
  );
}
