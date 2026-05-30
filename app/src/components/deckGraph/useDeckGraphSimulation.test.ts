import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeckGraphSimulation } from './useDeckGraphSimulation';
import type { GraphOutput } from '../../lib/deckGraph';

function makeGraph(nodeIds: string[], edges: { source: string; target: string }[] = []): GraphOutput {
  return {
    nodes: nodeIds.map((id) => ({
      id, cls: 'deck' as const,
      card: {
        oracleId: id, name: id, set: 'tst', printings: ['tst'], collectorNumber: '1',
        manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: '',
        types: [], subtypes: [], supertypes: [], oracleText: '', keywords: [],
        power: null, toughness: null, rarity: 'common', imageUrl: '', tags: [],
      },
      radius: 14, edgeCount: 0,
    })),
    edges: edges.map((e) => ({
      ...e, kind: 'base' as const, dominantFamily: 'destruction' as const, totalEdgeCount: 1, weight: 1,
      familyBreakdown: [{ familyId: 'destruction' as const, count: 1, score: 1 }],
    })),
  };
}

describe('useDeckGraphSimulation', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('initializes node positions on first render', () => {
    const graph = makeGraph(['a', 'b', 'c']);
    const { result } = renderHook(() => useDeckGraphSimulation(graph, { width: 400, height: 300 }));
    for (const id of ['a', 'b', 'c']) {
      const pos = result.current.positions.current.get(id);
      expect(pos).toBeDefined();
      expect(typeof pos!.x).toBe('number');
      expect(typeof pos!.y).toBe('number');
    }
  });

  it('preserves positions of surviving nodes when topology changes', () => {
    const g1 = makeGraph(['a', 'b']);
    const { result, rerender } = renderHook(
      ({ graph }) => useDeckGraphSimulation(graph, { width: 400, height: 300 }),
      { initialProps: { graph: g1 } },
    );
    act(() => { vi.advanceTimersByTime(100); });
    const posA = result.current.positions.current.get('a');
    expect(posA).toBeDefined();
    const snapshotA = { x: posA!.x, y: posA!.y };

    rerender({ graph: makeGraph(['a', 'b', 'c']) });
    act(() => { vi.advanceTimersByTime(10); });

    const newPosA = result.current.positions.current.get('a');
    expect(newPosA).toBeDefined();
    expect(Math.abs(newPosA!.x - snapshotA.x)).toBeLessThan(50);
    expect(Math.abs(newPosA!.y - snapshotA.y)).toBeLessThan(50);
  });

  it('reheats alpha on topology change', () => {
    const g1 = makeGraph(['a']);
    const { result, rerender } = renderHook(
      ({ graph }) => useDeckGraphSimulation(graph, { width: 400, height: 300 }),
      { initialProps: { graph: g1 } },
    );
    // Force the simulation alpha low to simulate a settled state.
    result.current.simulation.current!.alpha(0.001);
    expect(result.current.simulation.current!.alpha()).toBeLessThan(0.01);

    rerender({ graph: makeGraph(['a', 'b']) });
    const reheatedAlpha = result.current.simulation.current!.alpha();
    expect(reheatedAlpha).toBeGreaterThan(0.1);
  });
});
