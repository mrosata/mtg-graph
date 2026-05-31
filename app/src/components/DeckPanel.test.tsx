import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeckPanel from './DeckPanel';
import { STORAGE_KEY } from '../lib/useDeckPanelCollapsed';
import { useGraphStore } from '../stores/graphStore';
import { useDeckStore } from '../stores/deckStore';
import { useLibraryStore } from '../stores/libraryStore';
import type { Card } from '@shared/types';

function card(id: string, name: string, types: string[], cmc: number): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc, colors: [], colorIdentity: [],
    typeLine: '', types, subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

function basicLand(id: string, name: string): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: 'Basic Land', types: ['Land'], subtypes: [], supertypes: ['Basic'],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

beforeEach(() => {
  useLibraryStore.setState({ owned: null, enabled: false, meta: null });
  useGraphStore.setState({
    cards: new Map([
      ['bolt', card('bolt', 'Lightning Bolt', ['Instant'], 1)],
      ['bear', card('bear', 'Grizzly Bears', ['Creature'], 2)],
    ]),
    edges: new Map(), edgesInbound: new Map(), tagCatalog: new Map(),
    ruleVersion: 't', status: 'ready',
  });
  useDeckStore.setState({
    activeDeckId: 'd1',
    decks: [{
      id: 'd1', name: 'My Deck', format: 'standard',
      originalCards: [{ oracleId: 'bolt', count: 4 }, { oracleId: 'bear', count: 4 }],
      workingCards: [{ oracleId: 'bolt', count: 4 }, { oracleId: 'bear', count: 4 }],
      createdAt: 0, updatedAt: 0,
    }],
  });
});

describe('DeckPanel', () => {
  it('groups cards by type', () => {
    render(<DeckPanel />);
    expect(screen.getByText(/Instants/)).toBeInTheDocument();
    expect(screen.getByText(/Creatures/)).toBeInTheDocument();
  });

  it('shows total card count', () => {
    render(<DeckPanel />);
    expect(screen.getByText(/8 cards/)).toBeInTheDocument();
  });

  it('shows legality warnings', () => {
    render(<DeckPanel />);
    expect(screen.getByText(/at least 60/)).toBeInTheDocument();
  });

  it('renders empty state when no active deck', () => {
    useDeckStore.setState({ activeDeckId: null, decks: [] });
    render(<DeckPanel />);
    expect(screen.getByText(/No active deck/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/collapse deck panel/i)).not.toBeInTheDocument();
  });

  it('renders a readable fallback for unknown cards not in the loaded artifact', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [{ oracleId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', count: 1 }],
        workingCards: [{ oracleId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', count: 1 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    expect(screen.getByText(/Unknown card \(oracleId: aaaaaaaa\)/)).toBeInTheDocument();
    expect(screen.queryByText('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).not.toBeInTheDocument();
  });

  it('renders the persisted name when an unknown card was saved with one', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [{ oracleId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', count: 1, name: 'Rotated Card' }],
        workingCards: [{ oracleId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', count: 1, name: 'Rotated Card' }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    expect(screen.getByText('Rotated Card')).toBeInTheDocument();
    expect(screen.queryByText(/Unknown card \(oracleId:/)).not.toBeInTheDocument();
  });
});

describe('DeckPanel — collapse toggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts expanded by default and shows the collapse chevron', () => {
    render(<DeckPanel />);
    expect(screen.getByLabelText(/collapse deck panel/i)).toBeInTheDocument();
    expect(screen.getByText(/Instants/)).toBeInTheDocument();
  });

  it('collapses when the chevron is clicked', () => {
    render(<DeckPanel />);
    fireEvent.click(screen.getByLabelText(/collapse deck panel/i));
    expect(screen.queryByText(/Instants/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/expand deck panel/i)).toBeInTheDocument();
  });

  it('persists the collapsed state to localStorage', () => {
    render(<DeckPanel />);
    fireEvent.click(screen.getByLabelText(/collapse deck panel/i));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('hydrates collapsed state from localStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    render(<DeckPanel />);
    expect(screen.getByLabelText(/expand deck panel/i)).toBeInTheDocument();
    expect(screen.queryByText(/Instants/)).not.toBeInTheDocument();
  });

  it('clicking a collapsed pill expands and scrolls to that type', () => {
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    window.localStorage.setItem(STORAGE_KEY, 'true');
    render(<DeckPanel />);
    fireEvent.click(screen.getByRole('button', { name: /jump to instants/i }));
    expect(screen.getByLabelText(/collapse deck panel/i)).toBeInTheDocument();
    return Promise.resolve().then(() => {
      expect(scrollSpy).toHaveBeenCalled();
    });
  });
});

describe('DeckPanel — dirty state, Save, Discard', () => {
  it('does not render a "*" in the title when the deck is clean', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [{ oracleId: 'bolt', count: 4 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    const title = screen.getByRole('heading', { name: /my deck/i });
    expect(title.textContent).not.toMatch(/\*/);
  });

  it('renders a "*" suffix in the title when the deck is dirty', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [{ oracleId: 'bolt', count: 2 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    const title = screen.getByRole('heading', { name: /my deck/i });
    expect(title.textContent).toMatch(/\*$/);
  });

  it('Save and Discard buttons are disabled when the deck is clean', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [{ oracleId: 'bolt', count: 4 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^discard$/i })).toBeDisabled();
  });

  it('Save and Discard buttons are enabled when the deck is dirty', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [{ oracleId: 'bolt', count: 2 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    expect(screen.getByRole('button', { name: /^save$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^discard$/i })).toBeEnabled();
  });

  it('clicking Save invokes saveDeck and clears dirty indicators', async () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [{ oracleId: 'bolt', count: 2 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => {
      const title = screen.getByRole('heading', { name: /my deck/i });
      expect(title.textContent).not.toMatch(/\*/);
    });
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
  });

  it('clicking Discard invokes discardChanges and clears dirty indicators', async () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [{ oracleId: 'bolt', count: 2 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    fireEvent.click(screen.getByRole('button', { name: /^discard$/i }));
    await waitFor(() => {
      const title = screen.getByRole('heading', { name: /my deck/i });
      expect(title.textContent).not.toMatch(/\*/);
    });
    expect(useDeckStore.getState().decks[0]!.workingCards).toEqual([{ oracleId: 'bolt', count: 4 }]);
  });
});

describe('DeckPanel — added accent + Removed cards tray', () => {
  it('does not render the "Removed cards" section when nothing was removed', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'D', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [{ oracleId: 'bolt', count: 4 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    expect(screen.queryByText(/removed cards/i)).not.toBeInTheDocument();
  });

  it('renders a "Removed cards" section listing fully-removed cards', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'D', format: 'standard',
        originalCards: [
          { oracleId: 'bolt', count: 4 },
          { oracleId: 'bear', count: 2 },
        ],
        workingCards: [{ oracleId: 'bolt', count: 4 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    expect(screen.getByText(/removed cards/i)).toBeInTheDocument();
    // Grizzly Bears (the test fixture for 'bear') should appear under Removed cards
    const removedHeading = screen.getByText(/removed cards/i);
    const removedSection = removedHeading.parentElement!;
    expect(removedSection.textContent).toMatch(/Grizzly Bears/);
  });

  it('clicking a removed-card row restores it at the original count', async () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'D', format: 'standard',
        originalCards: [
          { oracleId: 'bolt', count: 4 },
          { oracleId: 'bear', count: 2 },
        ],
        workingCards: [{ oracleId: 'bolt', count: 4 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    fireEvent.click(screen.getByRole('button', { name: /restore.*grizzly bears/i }));
    await waitFor(() => {
      expect(useDeckStore.getState().decks[0]!.workingCards).toEqual([
        { oracleId: 'bolt', count: 4 },
        { oracleId: 'bear', count: 2 },
      ]);
    });
    expect(screen.queryByText(/removed cards/i)).not.toBeInTheDocument();
  });

  it('applies the added-card accent class to rows whose oracleId is not in originalCards', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'D', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [
          { oracleId: 'bolt', count: 4 },
          { oracleId: 'bear', count: 1 },
        ],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    const bearRow = screen.getByText('Grizzly Bears').closest('[data-testid="card-row"]') as HTMLElement | null;
    expect(bearRow).not.toBeNull();
    expect(bearRow!.className).toMatch(/border-green-500/);

    const boltRow = screen.getByText('Lightning Bolt').closest('[data-testid="card-row"]') as HTMLElement | null;
    expect(boltRow).not.toBeNull();
    expect(boltRow!.className).not.toMatch(/border-green-500/);
  });
});

describe('DeckPanel — library quantity overlay', () => {
  beforeEach(() => {
    useGraphStore.setState({
      cards: new Map([
        ['bolt', card('bolt', 'Lightning Bolt', ['Instant'], 1)],
        ['bear', card('bear', 'Grizzly Bears', ['Creature'], 2)],
        ['mtn', basicLand('mtn', 'Mountain')],
      ]),
      edges: new Map(), edgesInbound: new Map(), tagCatalog: new Map(),
      ruleVersion: 't', status: 'ready',
    });
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [
          { oracleId: 'bolt', count: 4 },
          { oracleId: 'bear', count: 3 },
          { oracleId: 'mtn', count: 20 },
        ],
        workingCards: [
          { oracleId: 'bolt', count: 4 },
          { oracleId: 'bear', count: 3 },
          { oracleId: 'mtn', count: 20 },
        ],
        createdAt: 0, updatedAt: 0,
      }],
    });
  });

  it('shows current/owned for non-basics when a library is loaded', () => {
    // bolt: 4 in deck, 2 owned → shows "4/2" (short)
    useLibraryStore.setState({
      owned: new Map([['bolt', 2], ['bear', 4]]),
      enabled: true, meta: null,
    });
    render(<DeckPanel />);
    // bolt row: deck=4, owned=2 → "4/2"
    expect(screen.getByText('4/2')).toBeInTheDocument();
    // bear row: deck=3, owned=4 → "3/4"
    expect(screen.getByText('3/4')).toBeInTheDocument();
  });

  it('does not show owned count for basic lands (basic shows just count, not count/owned)', () => {
    useLibraryStore.setState({
      owned: new Map([['bolt', 4], ['bear', 3], ['mtn', 8]]),
      enabled: true, meta: null,
    });
    render(<DeckPanel />);
    // Mountain should NOT show "20/8"
    expect(screen.queryByText('20/8')).not.toBeInTheDocument();
  });

  it('renders NotInLibraryBadge for a deck card not in the library', () => {
    // bolt not in library at all, bear is
    useLibraryStore.setState({
      owned: new Map([['bear', 3]]),
      enabled: true, meta: null,
    });
    render(<DeckPanel />);
    // The NotInLibraryBadge uses aria-label="Not in your library"
    const badges = screen.getAllByLabelText(/not in your library/i);
    // bolt should have a badge (not in library); bear should not
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the Missing: N summary line', () => {
    // bolt: 4 in deck, 2 owned → 2 missing
    // bear: 3 in deck, 3 owned → 0 missing
    // mtn: basic, excluded
    useLibraryStore.setState({
      owned: new Map([['bolt', 2], ['bear', 3]]),
      enabled: true, meta: null,
    });
    render(<DeckPanel />);
    expect(screen.getByText(/Missing: 2 cards/)).toBeInTheDocument();
  });

  it('shows Missing: 0 as a green check with aria-label "Library is fully stocked"', () => {
    // All non-basics fully covered
    useLibraryStore.setState({
      owned: new Map([['bolt', 4], ['bear', 3]]),
      enabled: true, meta: null,
    });
    render(<DeckPanel />);
    expect(screen.getByLabelText('Library is fully stocked')).toBeInTheDocument();
    expect(screen.getByText(/Library covers this deck/)).toBeInTheDocument();
  });
});
