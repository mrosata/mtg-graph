import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MtgaImportPanel from './MtgaImportPanel';

import healthy from '../../tests/fixtures/mtga/healthy.log?raw';

const importLibrary = vi.fn().mockResolvedValue(undefined);
const importDeck = vi.fn().mockResolvedValue('new-deck-id');

vi.mock('../stores/libraryStore', () => ({
  useLibraryStore: (sel: any) => sel({ importLibrary, owned: null }),
}));
vi.mock('../stores/deckStore', () => ({
  useDeckStore: (sel: any) => sel({ importDeck }),
}));
vi.mock('../stores/graphStore', () => ({
  useGraphStore: (sel: any) =>
    sel({
      cards: new Map([
        ['oid-a', mkCard('oid-a', 70001)],
        ['oid-b', mkCard('oid-b', 70002)],
        ['oid-c', mkCard('oid-c', 70003)],
      ]),
    }),
}));

function mkCard(oid: string, arenaId: number): any {
  return {
    oracleId: oid,
    name: oid,
    set: 'one',
    printings: ['one'],
    collectorNumber: '1',
    manaCost: null,
    cmc: 0,
    colors: [],
    colorIdentity: [],
    typeLine: 'Creature',
    types: ['Creature'],
    subtypes: [],
    supertypes: [],
    oracleText: '',
    keywords: [],
    power: null,
    toughness: null,
    rarity: 'common',
    imageUrl: '',
    printingDetails: [{ set: 'one', collectorNumber: '1', arenaId }],
    tags: [],
  };
}

function fileFrom(text: string) {
  return new File([text], 'Player.log', { type: 'text/plain' });
}

describe('MtgaImportPanel (full mode)', () => {
  beforeEach(() => {
    importLibrary.mockClear();
    importDeck.mockClear();
  });

  it('library-only path: imports library, no decks', async () => {
    const onClose = vi.fn();
    render(<MtgaImportPanel mode="full" onClose={onClose} />);

    const fileInput = screen.getByLabelText(/Choose Player\.log/i);
    fireEvent.change(fileInput, { target: { files: [fileFrom(healthy)] } });

    await waitFor(() =>
      expect(screen.getByText(/Imported.*cards/i)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Import library/i }));

    await waitFor(() => expect(importLibrary).toHaveBeenCalledTimes(1));
    expect(importDeck).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('library + decks path: opt-in checkbox -> checklist -> imports selected decks', async () => {
    const onClose = vi.fn();
    render(<MtgaImportPanel mode="full" onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/Choose Player\.log/i), {
      target: { files: [fileFrom(healthy)] },
    });
    await waitFor(() => screen.getByText(/Imported.*cards/i));

    fireEvent.click(screen.getByLabelText(/Also import my MTGA decks/i));
    await waitFor(() => screen.getByText('Mono-Red Aggro'));
    fireEvent.click(screen.getByLabelText('Mono-Red Aggro'));
    fireEvent.click(
      screen.getByRole('button', { name: /Import library \+ 1 deck/i }),
    );

    await waitFor(() => expect(importLibrary).toHaveBeenCalled());
    expect(importDeck).toHaveBeenCalledTimes(1);
    expect(importDeck.mock.calls[0]![0]).toBe('Mono-Red Aggro');
  });

  it('shows an error when the file contains neither event', async () => {
    render(<MtgaImportPanel mode="full" onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Choose Player\.log/i), {
      target: { files: [new File(['[Authenticate] hello\n'], 'Player.log')] },
    });
    await waitFor(() =>
      expect(
        screen.getByText(/Neither a collection snapshot nor decks/i),
      ).toBeInTheDocument(),
    );
  });
});

describe('MtgaImportPanel (decks-only mode)', () => {
  beforeEach(() => {
    importLibrary.mockClear();
    importDeck.mockClear();
  });

  it('decks-only path: shows checklist, imports selected decks, does NOT import library', async () => {
    const onClose = vi.fn();
    render(<MtgaImportPanel mode="decks-only" onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Choose Player\.log/i), {
      target: { files: [fileFrom(healthy)] },
    });
    await waitFor(() => screen.getByText('Mono-Red Aggro'));

    fireEvent.click(screen.getByLabelText('Mono-Red Aggro'));
    fireEvent.click(screen.getByRole('button', { name: /Import 1 deck/i }));

    await waitFor(() => expect(importDeck).toHaveBeenCalledTimes(1));
    expect(importLibrary).not.toHaveBeenCalled();
  });

  it('cross-section banner: opting in also calls importLibrary', async () => {
    render(<MtgaImportPanel mode="decks-only" onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Choose Player\.log/i), {
      target: { files: [fileFrom(healthy)] },
    });
    await waitFor(() => screen.getByText('Mono-Red Aggro'));

    fireEvent.click(screen.getByLabelText(/also contains your collection/i));
    fireEvent.click(screen.getByLabelText('Mono-Red Aggro'));
    fireEvent.click(screen.getByRole('button', { name: /Import library \+ 1 deck/i }));

    await waitFor(() => expect(importLibrary).toHaveBeenCalled());
    expect(importDeck).toHaveBeenCalledTimes(1);
  });
});
