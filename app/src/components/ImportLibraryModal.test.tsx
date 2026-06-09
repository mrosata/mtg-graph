import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportLibraryModal from './ImportLibraryModal';
import { useGraphStore } from '../stores/graphStore';
import { useLibraryStore } from '../stores/libraryStore';
import type { Card } from '@shared/types';
import { STANDARD_SET_CODES } from '@shared/sets';

function makeCard(oracleId: string, name: string, printings: string[]): Card {
  return {
    oracleId, name, set: printings[0]!, printings, collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

const KNOWN_SET = STANDARD_SET_CODES[0]!;

beforeEach(() => {
  useGraphStore.setState({
    cards: new Map([['bolt-id', makeCard('bolt-id', 'Lightning Bolt', [KNOWN_SET])]]),
  } as never);
  useLibraryStore.setState({ owned: null, enabled: false, meta: null });
});

function makeCsvFile(text: string): File {
  return new File([text], 'collection.csv', { type: 'text/csv' });
}

describe('ImportLibraryModal', () => {
  it('shows the file picker initially', () => {
    render(<ImportLibraryModal onClose={() => {}} />);
    expect(screen.getByLabelText(/Choose Manabox CSV/i)).toBeInTheDocument();
  });

  it('parses, resolves, and shows a summary after a valid file is picked', async () => {
    render(<ImportLibraryModal onClose={() => {}} />);
    const csv =
      '"Name","Set code","Set name","Collector number","Foil","Rarity","Quantity"\n' +
      `"Lightning Bolt","${KNOWN_SET}","x","1","normal","common","4"`;
    const input = screen.getByLabelText(/Choose Manabox CSV/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeCsvFile(csv)] } });
    expect(await screen.findByText(/1 cards/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Use this library/i })).toBeEnabled();
  });

  it('disables "Use this library" when nothing resolves and shows a hint', async () => {
    render(<ImportLibraryModal onClose={() => {}} />);
    const csv =
      '"Name","Set code","Set name","Collector number","Foil","Rarity","Quantity"\n' +
      '"Frobulator","mh3","x","1","normal","common","1"';
    const input = screen.getByLabelText(/Choose Manabox CSV/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeCsvFile(csv)] } });
    expect(await screen.findByText(/No matching cards/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Use this library/i })).toBeDisabled();
  });

  it('shows the parse error and keeps the import button disabled when the header is bad', async () => {
    render(<ImportLibraryModal onClose={() => {}} />);
    const csv = '"NotAColumn"\n"x"';
    const input = screen.getByLabelText(/Choose Manabox CSV/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeCsvFile(csv)] } });
    expect(await screen.findByText(/Missing required column/i)).toBeInTheDocument();
  });

  it('Cancel closes without writing a library', async () => {
    const onClose = vi.fn();
    render(<ImportLibraryModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
    expect(useLibraryStore.getState().owned).toBeNull();
  });

  it('"Use this library" writes the library and calls onClose', async () => {
    const onClose = vi.fn();
    render(<ImportLibraryModal onClose={onClose} />);
    const csv =
      '"Name","Set code","Set name","Collector number","Foil","Rarity","Quantity"\n' +
      `"Lightning Bolt","${KNOWN_SET}","x","1","normal","common","4"`;
    const input = screen.getByLabelText(/Choose Manabox CSV/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeCsvFile(csv)] } });
    await screen.findByText(/1 cards/);
    fireEvent.click(screen.getByRole('button', { name: /Use this library/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(useLibraryStore.getState().owned?.get('bolt-id')).toBe(4);
  });

  it('renders both tab headers and defaults to Manabox', () => {
    render(<ImportLibraryModal onClose={() => {}} />);
    expect(screen.getByRole('tab', { name: /Manabox CSV/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /MTG Arena/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Choose Manabox CSV/i)).toBeInTheDocument();
  });

  it('switches to the MTG Arena tab when clicked', () => {
    render(<ImportLibraryModal onClose={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: /MTG Arena/i }));
    expect(screen.getByLabelText(/Choose Player\.log/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Choose Manabox CSV/i)).not.toBeInTheDocument();
  });
});
