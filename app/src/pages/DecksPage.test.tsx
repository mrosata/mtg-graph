import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useToastStore } from '../stores/toastStore';
import { MemoryRouter } from 'react-router-dom';
import DecksPage from './DecksPage';
import { useDeckStore } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';
import { db } from '../lib/db';
import type { Card } from '@shared/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function makeCard(id: string, identity: Card['colorIdentity']): Card {
  return {
    oracleId: id, name: id, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: identity,
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

async function setup() {
  await db.decks.clear();
  useDeckStore.setState({ decks: [], activeDeckId: null });
  useGraphStore.setState({
    cards: new Map([
      ['a', makeCard('a', ['W', 'U'])],
      ['b', makeCard('b', ['R'])],
    ]),
    edges: new Map(),
    edgesInbound: new Map(),
    tagCatalog: new Map(),
    ruleVersion: 'test',
    status: 'ready',
  });
  mockNavigate.mockReset();
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DecksPage />
    </MemoryRouter>,
  );
}

describe('DecksPage', () => {
  beforeEach(setup);

  it('shows empty state when there are no decks', () => {
    renderPage();
    expect(screen.getByText(/no decks yet/i)).toBeInTheDocument();
  });

  it('creates a deck and navigates to /', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /new deck/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('clicking a deck row activates the deck and navigates', async () => {
    await useDeckStore.getState().createDeck('Deck A');
    await useDeckStore.getState().createDeck('Deck B');
    useDeckStore.setState({ activeDeckId: null });
    renderPage();
    const row = screen.getByText('Deck A').closest('li');
    expect(row).not.toBeNull();
    fireEvent.click(row!);
    await waitFor(() => {
      expect(useDeckStore.getState().activeDeckId).toBe(
        useDeckStore.getState().decks.find((d) => d.name === 'Deck A')!.id,
      );
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('clicking the name text enters edit mode and does not navigate', async () => {
    await useDeckStore.getState().createDeck('Original Name');
    renderPage();
    fireEvent.click(screen.getByText('Original Name'));
    const input = await screen.findByDisplayValue('Original Name');
    expect(input).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renames the deck on blur after editing', async () => {
    await useDeckStore.getState().createDeck('Old');
    renderPage();
    fireEvent.click(screen.getByText('Old'));
    const input = await screen.findByDisplayValue('Old');
    fireEvent.change(input, { target: { value: 'New' } });
    fireEvent.blur(input);
    await waitFor(() =>
      expect(useDeckStore.getState().decks[0]!.name).toBe('New'),
    );
  });

  it('shows an "Active" indicator on the active deck', async () => {
    const id = await useDeckStore.getState().createDeck('Active One');
    await useDeckStore.getState().createDeck('Other');
    useDeckStore.getState().setActiveDeck(id);
    renderPage();
    const row = screen.getByText('Active One').closest('li');
    expect(row).not.toBeNull();
    expect(row!.textContent).toMatch(/active/i);
  });

  it('delete button on a row does not also activate the deck', async () => {
    await useDeckStore.getState().createDeck('To Delete');
    renderPage();
    const buttons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(buttons[0]!);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('DecksPage — dirty indicator', () => {
  beforeEach(setup);

  it('appends "*" to the name of a deck with unsaved working changes', async () => {
    await useDeckStore.getState().createDeck('Dirty Deck');
    await useDeckStore.getState().addCard('a', 1);
    renderPage();
    expect(screen.getByText('Dirty Deck*')).toBeInTheDocument();
  });

  it('does not append "*" when the deck is clean', async () => {
    await useDeckStore.getState().createDeck('Clean Deck');
    renderPage();
    expect(screen.getByText('Clean Deck')).toBeInTheDocument();
    expect(screen.queryByText('Clean Deck*')).not.toBeInTheDocument();
  });
});

describe('DecksPage import/export', () => {
  beforeEach(setup);
  beforeEach(() => {
    useToastStore.getState().dismiss();
  });

  it('opens the import modal when "Import" is clicked', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /import deck/i })).toBeInTheDocument();
  });

  it('row Export button copies Arena-format text to the clipboard and does not open the deck', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true, value: { writeText },
    });
    const id = await useDeckStore.getState().createDeck('Exportable');
    await useDeckStore.getState().setActiveDeck(id);
    await useDeckStore.getState().addCard('a', 4, 'a');

    renderPage();
    const exportButtons = screen.getAllByRole('button', { name: /export/i });
    fireEvent.click(exportButtons[0]!);

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const arg = writeText.mock.calls[0]![0] as string;
    expect(arg).toContain('About\nName Exportable\n\nDeck\n4 a');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(useToastStore.getState().message).toMatch(/copied/i);
  });
});
