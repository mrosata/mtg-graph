import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ImportDeckModal from './ImportDeckModal';
import { useDeckStore } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';
import { useImportSummaryStore } from '../stores/importSummaryStore';
import { db } from '../lib/db';
import type { Card } from '@shared/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function makeCard(id: string, name: string): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

async function setup() {
  await db.decks.clear();
  useDeckStore.setState({ decks: [], activeDeckId: null });
  useImportSummaryStore.getState().clear();
  useGraphStore.setState({
    cards: new Map([
      ['swamp', makeCard('swamp', 'Swamp')],
      ['bolt',  makeCard('bolt',  'Lightning Bolt')],
    ]),
    edges: new Map(), edgesInbound: new Map(), tagCatalog: new Map(),
    ruleVersion: 'test', status: 'ready',
  });
  mockNavigate.mockReset();
}

function renderModal(onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <ImportDeckModal onClose={onClose} />
    </MemoryRouter>,
  );
}

describe('ImportDeckModal', () => {
  beforeEach(setup);

  it('creates a deck from pasted Arena text and navigates to /', async () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'About\nName Pasted\n\nDeck\n4 Swamp\n2 Lightning Bolt' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
    expect(onClose).toHaveBeenCalled();
    const decks = useDeckStore.getState().decks;
    expect(decks).toHaveLength(1);
    expect(decks[0]!.name).toBe('Pasted');
    expect(decks[0]!.workingCards.map((c) => c.oracleId)).toEqual(['swamp', 'bolt']);
  });

  it('writes the summary into importSummaryStore when there are unknown cards', async () => {
    renderModal();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Deck\n4 Swamp\n3 Tarmogoyf' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    const summary = useImportSummaryStore.getState().result;
    expect(summary?.unknown).toEqual([{ count: 3, name: 'Tarmogoyf' }]);
  });

  it('shows an inline error and does not create a deck when no cards are found', async () => {
    renderModal();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    expect(await screen.findByText(/no cards found/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(useDeckStore.getState().decks).toHaveLength(0);
  });

  it('shows the Standard-only error when every card is unknown', async () => {
    renderModal();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Deck\n4 Tarmogoyf\n2 Snapcaster Mage' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    expect(await screen.findByText(/only supports standard/i)).toBeInTheDocument();
    expect(useDeckStore.getState().decks).toHaveLength(0);
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
