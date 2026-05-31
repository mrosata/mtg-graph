import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LibraryImportSummary from './LibraryImportSummary';

const baseResult = {
  owned: new Map([['a', 1], ['b', 2]]),
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
