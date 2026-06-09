import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LibraryImportSummary from './LibraryImportSummary';
import type { LibraryImportResult } from '../lib/libraryImport';
import type { MtgaCollectionSummary } from '../lib/mtgaResolve';

const baseResult = {
  owned: new Map([['a', 1], ['b', 2]]),
  ownedDetail: new Map(),
  unknownNames: [
    { name: 'Frobulator', setCode: 'dmu', quantity: 1 },
  ],
  unknownSets: [
    { name: 'Tarmogoyf', setCode: 'mh3', quantity: 2 },
    { name: 'Sol Ring',  setCode: 'cmd', quantity: 1 },
  ],
  unparseableLines: [],
};

describe('LibraryImportSummary', () => {
  it('shows the totals header (cards + copies)', () => {
    render(<LibraryImportSummary result={baseResult} />);
    expect(screen.getByText(/2 cards/)).toBeInTheDocument();
    expect(screen.getByText(/3 copies/)).toBeInTheDocument();
  });

  it('renders three group headers with their counts', () => {
    render(<LibraryImportSummary result={baseResult} />);
    expect(screen.getByRole('button', { name: /Unknown names \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unknown sets \(2\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unparseable rows \(0\)/ })).toBeInTheDocument();
  });

  it('expands unknown-names by default; collapses unknown-sets by default', () => {
    render(<LibraryImportSummary result={baseResult} />);
    expect(screen.getByText(/Frobulator/)).toBeInTheDocument();
    expect(screen.queryByText(/Tarmogoyf/)).not.toBeInTheDocument();
  });

  it('expands unknown-sets when its header is clicked', () => {
    render(<LibraryImportSummary result={baseResult} />);
    fireEvent.click(screen.getByRole('button', { name: /Unknown sets/ }));
    expect(screen.getByText(/Tarmogoyf/)).toBeInTheDocument();
    expect(screen.getByText(/Sol Ring/)).toBeInTheDocument();
  });
});

const mtgaBaseResult: LibraryImportResult = {
  owned: new Map([['oid-a', 4], ['oid-b', 2]]),
  ownedDetail: new Map(),
  unknownNames: [], unknownSets: [], unparseableLines: [],
};

describe('LibraryImportSummary — mtgaSummary', () => {
  it('shows the out-of-pool line when mtgaSummary is provided and outOfPoolCount > 0', () => {
    const mtgaSummary: MtgaCollectionSummary = {
      totalCardsOwned: 100,
      resolvedCardsOwned: 88,
      outOfPoolCount: 12,
      unresolvedArenaIds: [],
    };
    render(<LibraryImportSummary result={mtgaBaseResult} mtgaSummary={mtgaSummary} />);
    expect(screen.getByText(/12.*aren't in our Standard pool/i)).toBeInTheDocument();
  });

  it('omits the out-of-pool line when outOfPoolCount is zero', () => {
    const mtgaSummary: MtgaCollectionSummary = {
      totalCardsOwned: 50,
      resolvedCardsOwned: 50,
      outOfPoolCount: 0,
      unresolvedArenaIds: [],
    };
    render(<LibraryImportSummary result={mtgaBaseResult} mtgaSummary={mtgaSummary} />);
    expect(screen.queryByText(/aren't in our Standard pool/i)).not.toBeInTheDocument();
  });

  it('hides unknown-names/unknown-sets/unparseable groups in MTGA mode', () => {
    const mtgaSummary: MtgaCollectionSummary = {
      totalCardsOwned: 1, resolvedCardsOwned: 1, outOfPoolCount: 0, unresolvedArenaIds: [],
    };
    render(<LibraryImportSummary result={mtgaBaseResult} mtgaSummary={mtgaSummary} />);
    expect(screen.queryByText(/Unknown names/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unknown sets/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unparseable/i)).not.toBeInTheDocument();
  });
});
