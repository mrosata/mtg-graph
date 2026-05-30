import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import SelectionDrawer from './SelectionDrawer';
import type { GraphNode, GraphEdge } from '../../lib/deckGraph';
import type { Card } from '@shared/types';


function makeCard(id: string, name: string, manaCost: string | null = '{2}{B}{B}'): Card {
  return {
    oracleId: id, name, set: 'tst', printings: ['tst'], collectorNumber: '1',
    manaCost, cmc: 4, colors: ['B'], colorIdentity: ['B'],
    typeLine: 'Creature — Demon', types: ['Creature'], subtypes: ['Demon'], supertypes: [],
    oracleText: 'Flying.', keywords: [], power: '4', toughness: '4',
    rarity: 'rare', imageUrl: 'https://example.com/img.png', tags: [],
  };
}

function makeNode(cls: 'deck' | 'candidate', id = 'bloodgift'): GraphNode {
  return { id, cls, card: makeCard(id, 'Bloodgift Demon'), radius: 14, edgeCount: 2 };
}

function lifegainEdge(source: string, target: string, count = 2): GraphEdge {
  return {
    source, target,
    dominantFamily: 'lifegain', totalEdgeCount: count, weight: count,
    familyBreakdown: [{ familyId: 'lifegain', count, score: 1 + 0.3 * (count - 1) }],
    kind: 'base',
  };
}

function defaultProps(overrides: Partial<React.ComponentProps<typeof SelectionDrawer>> = {}) {
  return {
    node: makeNode('candidate'),
    incidentEdges: [lifegainEdge('sheoldred', 'bloodgift')],
    deckCount: 0,
    cards: new Map<string, Card>([
      ['sheoldred', makeCard('sheoldred', 'Sheoldred, the Apocalypse')],
    ]),
    deckCounts: new Map<string, number>([['sheoldred', 4]]),
    nodesById: new Map<string, GraphNode>(),
    onAdd: vi.fn(),
    onRemoveOne: vi.fn(),
    onRemoveAll: vi.fn(),
    onClose: vi.fn(),
    onAddNeighbor: vi.fn(),
    onRemoveNeighbor: vi.fn(),
    onSelectNeighbor: vi.fn(),
    onHoverNeighbor: vi.fn(),
    onToggleFamily: vi.fn(),
    ...overrides,
  };
}

describe('SelectionDrawer — card chrome', () => {
  it('renders the card name, image, and type line', () => {
    render(<SelectionDrawer {...defaultProps()} />);
    expect(screen.getByText('Bloodgift Demon')).toBeInTheDocument();
    expect(screen.getByText(/Creature — Demon/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Bloodgift Demon' })).toHaveAttribute('src', 'https://example.com/img.png');
  });

  it('shows "Add to deck" for a candidate and calls onAdd', () => {
    const onAdd = vi.fn();
    render(<SelectionDrawer {...defaultProps({ onAdd })} />);
    fireEvent.click(screen.getByRole('button', { name: /Add to deck/i }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('shows "Remove one copy" for a deck member with count > 0', () => {
    const onRemoveOne = vi.fn();
    render(
      <SelectionDrawer
        {...defaultProps({ node: makeNode('deck'), deckCount: 2, onRemoveOne })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Remove one copy \(2 in deck\)/i }));
    expect(onRemoveOne).toHaveBeenCalled();
  });

  it('requires confirmation for "Remove all copies"', () => {
    const onRemoveAll = vi.fn();
    render(
      <SelectionDrawer
        {...defaultProps({ node: makeNode('deck'), deckCount: 3, onRemoveAll })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Remove all copies/i }));
    expect(onRemoveAll).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Remove$/i }));
    expect(onRemoveAll).toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<SelectionDrawer {...defaultProps({ onClose })} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('SelectionDrawer — connection summary', () => {
  it('reports unique deck cards and total deck copies', () => {
    render(
      <SelectionDrawer
        {...defaultProps({
          incidentEdges: [
            lifegainEdge('a', 'bloodgift'),
            lifegainEdge('b', 'bloodgift'),
          ],
          cards: new Map([
            ['a', makeCard('a', 'Alpha')],
            ['b', makeCard('b', 'Beta')],
          ]),
          deckCounts: new Map([['a', 4], ['b', 2]]),
        })}
      />,
    );
    expect(screen.getByText(/Connects to 2 nodes · 6 cards in your deck/i)).toBeInTheDocument();
  });

  it('singularizes when there is exactly one card / one copy', () => {
    render(
      <SelectionDrawer
        {...defaultProps({
          incidentEdges: [lifegainEdge('a', 'bloodgift')],
          cards: new Map([['a', makeCard('a', 'Alpha')]]),
          deckCounts: new Map([['a', 1]]),
        })}
      />,
    );
    expect(screen.getByText(/Connects to 1 node · 1 card in your deck/i)).toBeInTheDocument();
  });

  it('shows "No connections" when no neighbor is in the deck', () => {
    render(
      <SelectionDrawer
        {...defaultProps({
          incidentEdges: [lifegainEdge('candX', 'bloodgift')],
          cards: new Map([['candX', makeCard('candX', 'CandX')]]),
          deckCounts: new Map(),
        })}
      />,
    );
    expect(screen.getByText(/No connections to cards in your deck/i)).toBeInTheDocument();
  });
});

describe('SelectionDrawer — shared interactions', () => {
  it('lists each family with a count and fires onToggleFamily when clicked', () => {
    const onToggleFamily = vi.fn();
    render(
      <SelectionDrawer
        {...defaultProps({
          incidentEdges: [
            lifegainEdge('sheoldred', 'bloodgift', 2),
            {
              source: 'frantic', target: 'bloodgift',
              dominantFamily: 'card-selection', totalEdgeCount: 1, weight: 1,
              familyBreakdown: [{ familyId: 'card-selection', count: 1, score: 1 }],
              kind: 'base',
            },
          ],
          cards: new Map([
            ['sheoldred', makeCard('sheoldred', 'Sheoldred')],
            ['frantic', makeCard('frantic', 'Frantic Search')],
          ]),
          deckCounts: new Map([['sheoldred', 4], ['frantic', 2]]),
          onToggleFamily,
        })}
      />,
    );
    const lifeBtn = screen.getByRole('button', { name: /Hide Lifegain edges/i });
    fireEvent.click(lifeBtn);
    expect(onToggleFamily).toHaveBeenCalledWith('lifegain');
    expect(screen.getByRole('button', { name: /Hide Card Selection edges/i })).toBeInTheDocument();
  });
});

describe('SelectionDrawer — neighbor list', () => {
  function multiNeighbor(extra: Partial<React.ComponentProps<typeof SelectionDrawer>> = {}) {
    return defaultProps({
      incidentEdges: [
        lifegainEdge('sheoldred', 'bloodgift', 4),  // weight 1+0.3*3 = 1.9
        lifegainEdge('atraxa', 'bloodgift', 1),     // weight 1
        lifegainEdge('beta', 'bloodgift', 2),       // weight 1.3
      ],
      cards: new Map([
        ['sheoldred', makeCard('sheoldred', 'Sheoldred, the Apocalypse')],
        ['atraxa', makeCard('atraxa', 'Atraxa')],
        ['beta', makeCard('beta', 'Beta')],
      ]),
      deckCounts: new Map([['sheoldred', 4], ['atraxa', 2], ['beta', 3]]),
      ...extra,
    });
  }

  it('renders one row per neighbor, sorted by weight descending', () => {
    render(<SelectionDrawer {...multiNeighbor()} />);
    const list = screen.getByText(/Connected cards · 3/i).parentElement!.querySelector('ul')!;
    const items = within(list).getAllByRole('listitem');
    const names = items.map((li) => li.getAttribute('data-oracle-id'));
    expect(names).toEqual(['sheoldred', 'beta', 'atraxa']);
  });

  it('fires onHoverNeighbor on mouse enter and null on mouse leave', () => {
    const onHoverNeighbor = vi.fn();
    render(<SelectionDrawer {...multiNeighbor({ onHoverNeighbor })} />);
    const row = document.querySelector('[data-oracle-id="sheoldred"]')!;
    fireEvent.mouseEnter(row);
    expect(onHoverNeighbor).toHaveBeenCalledWith('sheoldred');
    fireEvent.mouseLeave(row);
    expect(onHoverNeighbor).toHaveBeenLastCalledWith(null);
  });

  it('fires onSelectNeighbor when the neighbor name is clicked', () => {
    const onSelectNeighbor = vi.fn();
    render(<SelectionDrawer {...multiNeighbor({ onSelectNeighbor })} />);
    fireEvent.click(screen.getByRole('button', { name: /Sheoldred, the Apocalypse/i }));
    expect(onSelectNeighbor).toHaveBeenCalledWith('sheoldred');
  });

  it('fires onAddNeighbor/onRemoveNeighbor from the per-row CountControls', () => {
    const onAddNeighbor = vi.fn();
    const onRemoveNeighbor = vi.fn();
    render(<SelectionDrawer {...multiNeighbor({ onAddNeighbor, onRemoveNeighbor })} />);
    const row = document.querySelector('[data-oracle-id="sheoldred"]')!;
    const addBtn = within(row as HTMLElement).getByRole('button', { name: /Add one copy/i });
    const removeBtn = within(row as HTMLElement).getByRole('button', { name: /Remove one copy/i });
    fireEvent.click(addBtn);
    expect(onAddNeighbor).toHaveBeenCalledWith('sheoldred', 1);
    fireEvent.click(removeBtn);
    expect(onRemoveNeighbor).toHaveBeenCalledWith('sheoldred', 1);
  });

  it('shows the per-row ×N weight badge', () => {
    render(<SelectionDrawer {...multiNeighbor()} />);
    const row = document.querySelector('[data-oracle-id="sheoldred"]')!;
    expect(within(row as HTMLElement).getByText('×4')).toBeInTheDocument();
  });
});

describe('SelectionDrawer — bridge node treatment', () => {
  function bridgeNode(): GraphNode {
    return { id: 'br1', cls: 'bridge', card: makeCard('br1', 'Bridge One'), radius: 14, edgeCount: 2 };
  }

  it('labels the selected card as "bridge" in the header', () => {
    render(
      <SelectionDrawer
        {...defaultProps({ node: bridgeNode() })}
      />,
    );
    expect(screen.getByText(/Selected · bridge/i)).toBeInTheDocument();
  });

  it('shows the Add to deck button for a bridge node', () => {
    const onAdd = vi.fn();
    render(
      <SelectionDrawer
        {...defaultProps({ node: bridgeNode(), onAdd })}
      />,
    );
    const btn = screen.getByRole('button', { name: /\+ Add to deck/i });
    fireEvent.click(btn);
    expect(onAdd).toHaveBeenCalled();
  });
});

describe('SelectionDrawer — bridge indicator', () => {
  function bridgeEdge(source: string, target: string): GraphEdge {
    return {
      source, target,
      dominantFamily: 'lifegain', totalEdgeCount: 1, weight: 1,
      familyBreakdown: [{ familyId: 'lifegain', count: 1, score: 1 }],
      kind: 'bridge',
    };
  }

  it('renders a bridge indicator on rows whose neighbor cls === "bridge"', () => {
    const sheoldred = makeCard('sheoldred', 'Sheoldred, the Apocalypse');
    const brCard = makeCard('br1', 'Bridge One');
    const candidateRowEdge = lifegainEdge('sheoldred', 'bloodgift');
    const bridgeRowEdge = bridgeEdge('br1', 'bloodgift');
    render(
      <SelectionDrawer
        {...defaultProps({
          incidentEdges: [candidateRowEdge, bridgeRowEdge],
          cards: new Map([['sheoldred', sheoldred], ['br1', brCard]]),
          deckCounts: new Map([['sheoldred', 4]]),
          nodesById: new Map<string, GraphNode>([
            ['sheoldred', { id: 'sheoldred', cls: 'candidate', card: sheoldred, radius: 14, edgeCount: 1 }],
            ['br1',       { id: 'br1',       cls: 'bridge',    card: brCard,    radius: 14, edgeCount: 2 }],
          ]),
        })}
      />,
    );
    const bridgeRow = document.querySelector('[data-oracle-id="br1"]')!;
    const candRow = document.querySelector('[data-oracle-id="sheoldred"]')!;
    expect(bridgeRow.querySelector('[data-bridge-indicator]')).not.toBeNull();
    expect(candRow.querySelector('[data-bridge-indicator]')).toBeNull();
  });
});
