import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LibrarySection from './LibrarySection';
import { useLibraryStore } from '../stores/libraryStore';

beforeEach(() => useLibraryStore.setState({ owned: null, enabled: false, meta: null }));

describe('LibrarySection', () => {
  it('renders the empty state with an Import button', () => {
    render(<LibrarySection />);
    expect(screen.getByText(/Import a Manabox CSV backup/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import library/i })).toBeInTheDocument();
  });

  it('opens the import modal when Import is clicked', () => {
    render(<LibrarySection />);
    fireEvent.click(screen.getByRole('button', { name: /Import library/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders the loaded state with totals + toggle + actions', () => {
    useLibraryStore.setState({
      owned: new Map([['a', 4], ['b', 1]]),
      enabled: true,
      meta: { importedAt: Date.now(), sourceFilename: 'col.csv',
              unknownNames: [], unknownSets: [], unparseableLines: [] },
    });
    render(<LibrarySection />);
    expect(screen.getByText(/2 cards/)).toBeInTheDocument();
    expect(screen.getByText(/5 copies/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Library only/i)).toBeChecked();
    expect(screen.getByRole('button', { name: /Re-import/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View report/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear/i })).toBeInTheDocument();
  });

  it('toggling "Library only" persists via setEnabled', () => {
    useLibraryStore.setState({
      owned: new Map([['a', 4]]),
      enabled: true,
      meta: { importedAt: Date.now(), sourceFilename: 'col.csv',
              unknownNames: [], unknownSets: [], unparseableLines: [] },
    });
    render(<LibrarySection />);
    fireEvent.click(screen.getByLabelText(/Library only/i));
    expect(useLibraryStore.getState().enabled).toBe(false);
  });
});
