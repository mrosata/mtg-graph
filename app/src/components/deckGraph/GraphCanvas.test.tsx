import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GraphCanvas, { shouldHandleZoomEvent } from './GraphCanvas';
import type { GraphOutput } from '../../lib/deckGraph';

function makeCard(id: string, name = id) {
  return {
    oracleId: id, name, set: 'tst', printings: ['tst'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: '',
    types: [], subtypes: [], supertypes: [], oracleText: '', keywords: [],
    power: null, toughness: null, rarity: 'common' as const, imageUrl: '', tags: [],
  };
}

function graph(): GraphOutput {
  return {
    nodes: [
      { id: 'a', cls: 'deck', card: makeCard('a', 'Alpha'), radius: 14, edgeCount: 1 },
      { id: 'b', cls: 'candidate', card: makeCard('b', 'Beta'), radius: 14, edgeCount: 1 },
    ],
    edges: [{
      source: 'a', target: 'b', dominantFamily: 'destruction',
      totalEdgeCount: 1, weight: 1,
      familyBreakdown: [{ familyId: 'destruction', count: 1, score: 1 }],
      kind: 'base',
    }],
  };
}

function graphWithBridge(): GraphOutput {
  return {
    nodes: [
      { id: 'a', cls: 'deck',      card: makeCard('a', 'Alpha'),   radius: 14, edgeCount: 1 },
      { id: 'b', cls: 'candidate', card: makeCard('b', 'Beta'),    radius: 14, edgeCount: 1 },
      { id: 'c', cls: 'bridge',    card: makeCard('c', 'Charlie'), radius: 14, edgeCount: 2 },
    ],
    edges: [
      {
        source: 'a', target: 'b', dominantFamily: 'destruction',
        totalEdgeCount: 1, weight: 1,
        familyBreakdown: [{ familyId: 'destruction', count: 1, score: 1 }],
        kind: 'base',
      },
      {
        source: 'b', target: 'c', dominantFamily: 'destruction',
        totalEdgeCount: 1, weight: 1,
        familyBreakdown: [{ familyId: 'destruction', count: 1, score: 1 }],
        kind: 'bridge',
      },
      {
        source: 'c', target: 'a', dominantFamily: 'destruction',
        totalEdgeCount: 1, weight: 1,
        familyBreakdown: [{ familyId: 'destruction', count: 1, score: 1 }],
        kind: 'bridge',
      },
    ],
  };
}

describe('GraphCanvas', () => {
  it('renders one circle per node with an accessible label', () => {
    render(<GraphCanvas graph={graph()} selectedId={null} hoveredId={null} onSelect={() => {}} onFocus={() => {}} />);
    expect(screen.getByLabelText('Alpha')).toBeInTheDocument();
    expect(screen.getByLabelText('Beta')).toBeInTheDocument();
  });

  it('calls onSelect with the oracleId when a node is clicked', () => {
    const onSelect = vi.fn();
    render(<GraphCanvas graph={graph()} selectedId={null} hoveredId={null} onSelect={onSelect} onFocus={() => {}} />);
    fireEvent.click(screen.getByLabelText('Beta'));
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('calls onFocus with the oracleId when a node is double-clicked', () => {
    const onFocus = vi.fn();
    render(<GraphCanvas graph={graph()} selectedId={null} hoveredId={null} onSelect={() => {}} onFocus={onFocus} />);
    fireEvent.doubleClick(screen.getByLabelText('Beta'));
    expect(onFocus).toHaveBeenCalledWith('b');
  });

  it('renders deck nodes with a distinguishing amber stroke', () => {
    const { container } = render(
      <GraphCanvas graph={graph()} selectedId={null} hoveredId={null} onSelect={() => {}} onFocus={() => {}} />,
    );
    const deckCircle = container.querySelector('[data-node-id="a"] circle:not([data-halo])');
    expect(deckCircle?.getAttribute('stroke')?.toLowerCase()).toBe('#fbbf24');
  });

  it('renders the edge with the dominant-family color', () => {
    const { container } = render(
      <GraphCanvas graph={graph()} selectedId={null} hoveredId={null} onSelect={() => {}} onFocus={() => {}} />,
    );
    const edge = container.querySelector('line[data-edge]');
    expect(edge?.getAttribute('stroke')).toBe('#ef4444');
  });

  it('renders a multi-family marker when an edge has 2+ families', () => {
    const g = graph();
    g.edges[0]!.familyBreakdown.push({ familyId: 'lifegain', count: 1, score: 1 });
    g.edges[0]!.totalEdgeCount = 2;
    const { container } = render(
      <GraphCanvas graph={g} selectedId={null} hoveredId={null} onSelect={() => {}} onFocus={() => {}} />,
    );
    expect(container.querySelector('[data-edge-multimark]')).toBeInTheDocument();
  });

  it('renders a halo circle inside every node (hidden by default)', () => {
    const { container } = render(
      <GraphCanvas graph={graph()} selectedId={null} hoveredId={null} onSelect={() => {}} onFocus={() => {}} />,
    );
    const halos = container.querySelectorAll('[data-node-id] circle[data-halo]');
    expect(halos).toHaveLength(2);
    for (const h of halos) {
      expect(h.getAttribute('stroke')?.toLowerCase()).toBe('#fbbf24');
    }
  });

  it('renders the "no edges match the current filters" message when edges are empty but nodes exist', () => {
    render(<GraphCanvas graph={{ nodes: graph().nodes, edges: [] }} selectedId={null} hoveredId={null} onSelect={() => {}} onFocus={() => {}} />);
    expect(screen.getByText(/no edges match/i)).toBeInTheDocument();
  });

  it('renders bridge nodes with a dashed neutral stroke', () => {
    const { container } = render(
      <GraphCanvas graph={graphWithBridge()} selectedId="b" hoveredId={null} onSelect={() => {}} onFocus={() => {}} />,
    );
    const bridgeCircle = container.querySelector('[data-node-id="c"] circle:not([data-halo])');
    expect(bridgeCircle?.getAttribute('stroke-dasharray')).toBe('3 2');
    expect(bridgeCircle?.getAttribute('stroke')?.toLowerCase()).toBe('#3a3a3a');
  });

  it('renders bridge edges dashed', () => {
    const { container } = render(
      <GraphCanvas graph={graphWithBridge()} selectedId="b" hoveredId={null} onSelect={() => {}} onFocus={() => {}} />,
    );
    // Use data-bridge-edge to distinguish in the assertion (added in the impl step).
    const bridgeEdges = container.querySelectorAll('line[data-bridge-edge]');
    expect(bridgeEdges.length).toBeGreaterThan(0);
    for (const el of bridgeEdges) {
      expect(el.getAttribute('stroke-dasharray')).toBe('4 3');
    }
  });

  it('keeps every bridge edge at opacity ≥ 0.75 (incident: 1, non-incident bridge: 0.75)', () => {
    const { container } = render(
      <GraphCanvas graph={graphWithBridge()} selectedId="b" hoveredId={null} onSelect={() => {}} onFocus={() => {}} />,
    );
    // The b↔c bridge edge is incident to selected (b) → opacity 1.
    // The c↔a bridge edge is NOT incident to selected → should use elevated
    // 0.75, NOT the base-graph dim of 0.25.
    const bridgeEdges = container.querySelectorAll('line[data-bridge-edge]');
    expect(bridgeEdges.length).toBe(2);
    for (const el of bridgeEdges) {
      const op = Number(el.getAttribute('stroke-opacity') ?? '1');
      expect(op).toBeGreaterThanOrEqual(0.75);
    }
  });
});

describe('shouldHandleZoomEvent', () => {
  function nodeTarget() {
    const node = document.createElement('g');
    node.setAttribute('data-node-id', 'a');
    const child = document.createElement('circle');
    node.appendChild(child);
    return child;
  }

  it('accepts wheel events targeting a node so the canvas (not the page) zooms', () => {
    expect(
      shouldHandleZoomEvent({ type: 'wheel', target: nodeTarget(), ctrlKey: false, button: 0 }),
    ).toBe(true);
  });

  it('accepts trackpad pinch (wheel + ctrlKey) over a node', () => {
    expect(
      shouldHandleZoomEvent({ type: 'wheel', target: nodeTarget(), ctrlKey: true, button: 0 }),
    ).toBe(true);
  });

  it('rejects mousedown on a node so drag-from-node never starts a pan', () => {
    expect(
      shouldHandleZoomEvent({ type: 'mousedown', target: nodeTarget(), ctrlKey: false, button: 0 }),
    ).toBe(false);
  });

  it('accepts wheel events over empty canvas', () => {
    const target = document.createElement('svg');
    expect(shouldHandleZoomEvent({ type: 'wheel', target, ctrlKey: false, button: 0 })).toBe(true);
  });

  it('rejects right-button mousedown', () => {
    const target = document.createElement('svg');
    expect(shouldHandleZoomEvent({ type: 'mousedown', target, ctrlKey: false, button: 2 })).toBe(false);
  });
});
