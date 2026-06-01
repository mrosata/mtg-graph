import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import DeckGraphPage from './DeckGraphPage';
import { useDeckStore } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';
import type { Card, InteractionEdge } from '@shared/types';

function makeCard(id: string, name: string): Card {
  return {
    oracleId: id,
    name,
    set: 'tst',
    printings: ['tst'],
    collectorNumber: '1',
    manaCost: '{1}',
    cmc: 1,
    colors: [],
    colorIdentity: [],
    typeLine: 'Creature',
    types: ['Creature'],
    subtypes: [],
    supertypes: [],
    oracleText: '',
    keywords: [],
    power: '1',
    toughness: '1',
    rarity: 'common',
    imageUrl: '',
    tags: [],
  };
}

function makeEdge(source: string, target: string): InteractionEdge {
  return {
    source,
    target,
    // Both tagIds resolve to the `destruction` family via FAMILIES, so
    // edgeFamily(e) returns a defined family id and the edge survives the
    // family filter in buildDeckGraph.
    sourceTagId: 'effect.destroy_creature',
    targetTagId: 'trigger.creature_dies',
  };
}

function seedStores() {
  // Colorless (`colorIdentity: []`) cards require 'C' in the URL colors set.
  // The page seeds 'C' into its default identity, so this works on first mount.
  const cardA = makeCard('a', 'Alpha');
  const cardB = makeCard('b', 'Bravo');
  const cards = new Map<string, Card>([['a', cardA], ['b', cardB]]);
  const edges = new Map<string, InteractionEdge[]>([
    ['a', [makeEdge('a', 'b')]],
  ]);
  const edgesInbound = new Map<string, InteractionEdge[]>([
    ['b', [makeEdge('a', 'b')]],
  ]);

  useGraphStore.setState({
    cards,
    edges,
    edgesInbound,
    tagCatalog: new Map(),
    ruleVersion: 't',
    status: 'ready',
  });

  useDeckStore.setState({
    activeDeckId: 'd1',
    decks: [{
      id: 'd1',
      name: 'Test',
      format: 'standard',
      originalCards: [{ oracleId: 'a', count: 1 }, { oracleId: 'b', count: 1 }],
      workingCards: [{ oracleId: 'a', count: 1 }, { oracleId: 'b', count: 1 }],
      createdAt: 0,
      updatedAt: 0,
    }],
  });
}

function LocationProbe({ onChange }: { onChange: (loc: { pathname: string; search: string }) => void }) {
  const loc = useLocation();
  onChange({ pathname: loc.pathname, search: loc.search });
  return null;
}

function renderPage(initialEntries: string[] = ['/deck/graph']) {
  let currentLocation = { pathname: '', search: '' };
  const utils = render(
    <MemoryRouter initialEntries={initialEntries}>
      <LocationProbe onChange={(loc) => { currentLocation = loc; }} />
      <Routes>
        <Route path="/deck/graph" element={<DeckGraphPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return { ...utils, getLocation: () => currentLocation };
}

beforeEach(() => {
  seedStores();
});

afterEach(() => {
  cleanup();
  useGraphStore.setState({
    cards: new Map(),
    edges: new Map(),
    edgesInbound: new Map(),
    tagCatalog: new Map(),
    ruleVersion: 't',
    status: 'ready',
  });
  useDeckStore.setState({ decks: [], activeDeckId: null });
  vi.restoreAllMocks();
});

describe('DeckGraphPage — URL-driven selection', () => {
  it('cold-loads with ?selected=a and opens the drawer for Alpha', async () => {
    renderPage(['/deck/graph?selected=a']);
    // The drawer renders the selected card's name in an <h3>. Use findByRole
    // so we await the post-mount effect that strips/keeps the param.
    const heading = await screen.findByRole('heading', { name: 'Alpha', level: 3 });
    expect(heading).toBeInTheDocument();
    // The Close drawer button is unique to the SelectionDrawer.
    expect(screen.getByRole('button', { name: 'Close drawer' })).toBeInTheDocument();
  });

  it('cold-loads with ?selected=ghost (not in graph) and strips the param', async () => {
    const { getLocation } = renderPage(['/deck/graph?selected=ghost']);
    // The stale-selected effect runs after mount; wait for it to fire.
    await waitFor(() => {
      expect(getLocation().search).not.toContain('selected=ghost');
    });
    // The drawer must not be open.
    expect(screen.queryByRole('button', { name: 'Close drawer' })).not.toBeInTheDocument();
  });

  it('clicking a node updates the URL to ?selected=<id>', async () => {
    const { getLocation } = renderPage(['/deck/graph']);
    // Wait for d3-force / the graph render to produce node elements.
    const bravoNode = await screen.findByLabelText('Bravo');
    fireEvent.click(bravoNode);
    await waitFor(() => {
      expect(getLocation().search).toContain('selected=b');
    });
  });

  it('clicking the same node twice only updates the URL once', async () => {
    const { getLocation } = renderPage(['/deck/graph']);
    const bravoNode = await screen.findByLabelText('Bravo');
    fireEvent.click(bravoNode);
    await waitFor(() => {
      expect(getLocation().search).toContain('selected=b');
    });
    const searchAfterFirstClick = getLocation().search;
    // Re-resolve the node — the rerender may have replaced the DOM element.
    const bravoNodeAgain = await screen.findByLabelText('Bravo');
    fireEvent.click(bravoNodeAgain);
    // Give any pending effects a tick to flush.
    await new Promise((r) => setTimeout(r, 0));
    expect(getLocation().search).toBe(searchAfterFirstClick);
  });

  it('drawer close (X) removes ?selected from the URL', async () => {
    const { getLocation } = renderPage(['/deck/graph?selected=a']);
    // Wait for the drawer to mount.
    const closeBtn = await screen.findByRole('button', { name: 'Close drawer' });
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(getLocation().search).not.toContain('selected=');
    });
  });
});
