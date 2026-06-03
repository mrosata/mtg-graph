import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddToDeckButton from './AddToDeckButton';
import { useDeckStore } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';
import { useLibraryStore } from '../stores/libraryStore';
import { db } from '../lib/db';
import type { Card } from '@shared/types';

function makeCard(id: string, name: string): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

beforeEach(async () => {
  await db.decks.clear();
  useLibraryStore.setState({ owned: null, ownedDetail: null, enabled: false, meta: null });
  useGraphStore.setState({
    cards: new Map([['bolt', makeCard('bolt', 'Lightning Bolt')]]),
    edges: new Map(), edgesInbound: new Map(), tagCatalog: new Map(),
    ruleVersion: 't', status: 'ready',
  });
  useDeckStore.setState({ decks: [], activeDeckId: null });
});

describe('AddToDeckButton — sideboard affordance', () => {
  it('does not render the sideboard row when there is no active deck', () => {
    render(<AddToDeckButton oracleId="bolt" />);
    expect(screen.queryByRole('button', { name: /sideboard|add to sb/i })).not.toBeInTheDocument();
  });

  it('renders a "+ SB" affordance when an active deck has zero sideboard copies', async () => {
    await useDeckStore.getState().createDeck('Test');
    render(<AddToDeckButton oracleId="bolt" />);
    expect(screen.getByRole('button', { name: /add one to sideboard/i })).toBeInTheDocument();
  });

  it('clicking "+ SB" calls addCard with target="sideboard"', async () => {
    await useDeckStore.getState().createDeck('Test');
    render(<AddToDeckButton oracleId="bolt" />);

    fireEvent.click(screen.getByRole('button', { name: /add one to sideboard/i }));
    await waitFor(() => {
      const deck = useDeckStore.getState().decks[0]!;
      expect(deck.sideboardCards).toEqual([
        { oracleId: 'bolt', count: 1, name: 'Lightning Bolt' },
      ]);
    });
    // Main deck must remain empty — affordance is sideboard-only.
    expect(useDeckStore.getState().decks[0]!.workingCards).toEqual([]);
  });

  it('shift-click on "+ SB" adds 4 (parity with main "+" shortcut)', async () => {
    await useDeckStore.getState().createDeck('Test');
    render(<AddToDeckButton oracleId="bolt" />);

    fireEvent.click(screen.getByRole('button', { name: /add one to sideboard/i }), { shiftKey: true });
    await waitFor(() => {
      expect(useDeckStore.getState().decks[0]!.sideboardCards).toEqual([
        { oracleId: 'bolt', count: 4, name: 'Lightning Bolt' },
      ]);
    });
  });

  it('shows the current sideboard count when > 0 and lets the user decrement', async () => {
    await useDeckStore.getState().createDeck('Test');
    await useDeckStore.getState().addCard('bolt', 3, 'Lightning Bolt', 'sideboard');
    render(<AddToDeckButton oracleId="bolt" />);

    expect(screen.getByLabelText(/3 in sideboard/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remove one from sideboard/i }));
    await waitFor(() => {
      expect(useDeckStore.getState().decks[0]!.sideboardCards).toEqual([
        { oracleId: 'bolt', count: 2, name: 'Lightning Bolt' },
      ]);
    });
  });
});
