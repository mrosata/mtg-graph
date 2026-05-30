import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImportSummary from './ImportSummary';
import { useImportSummaryStore } from '../stores/importSummaryStore';
import type { ImportResult } from '../lib/deckImport';

function makeResult(overrides: Partial<ImportResult> = {}): ImportResult {
  return {
    resolved: [{ oracleId: 'a', count: 4, name: 'Lightning Bolt' }],
    unknown: [],
    sideboardCount: 0,
    unparseableLines: [],
    ...overrides,
  };
}

beforeEach(() => {
  useImportSummaryStore.getState().clear();
});

describe('ImportSummary', () => {
  it('renders nothing when the store is empty', () => {
    const { container } = render(<ImportSummary />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the imported-count header with M of N', () => {
    useImportSummaryStore.getState().set(makeResult({
      resolved: [{ oracleId: 'a', count: 60, name: 'Lightning Bolt' }],
      unknown: [{ count: 15, name: 'Tarmogoyf' }],
    }));
    render(<ImportSummary />);
    expect(screen.getByText('Imported 60 of 75 cards.')).toBeInTheDocument();
  });

  it('renders the unknown-cards details with each name listed', () => {
    useImportSummaryStore.getState().set(makeResult({
      unknown: [
        { count: 4, name: 'Tarmogoyf' },
        { count: 2, name: 'Snapcaster Mage' },
      ],
    }));
    render(<ImportSummary />);
    expect(screen.getByText(/6 cards skipped — not in Standard/)).toBeInTheDocument();
    expect(screen.getByText('4 Tarmogoyf')).toBeInTheDocument();
    expect(screen.getByText('2 Snapcaster Mage')).toBeInTheDocument();
  });

  it('renders the sideboard message when sideboardCount > 0', () => {
    useImportSummaryStore.getState().set(makeResult({ sideboardCount: 15 }));
    render(<ImportSummary />);
    expect(screen.getByText(/15 sideboard cards skipped/)).toBeInTheDocument();
  });

  it('renders the unparseable-lines details', () => {
    useImportSummaryStore.getState().set(makeResult({
      unparseableLines: ['asdf', 'foo bar baz'],
    }));
    render(<ImportSummary />);
    expect(screen.getByText('2 unparseable lines skipped.')).toBeInTheDocument();
    expect(screen.getByText('asdf')).toBeInTheDocument();
    expect(screen.getByText('foo bar baz')).toBeInTheDocument();
  });

  it('omits sideboard and unparseable sections when their counts are zero', () => {
    useImportSummaryStore.getState().set(makeResult());
    render(<ImportSummary />);
    expect(screen.queryByText(/sideboard cards skipped/)).not.toBeInTheDocument();
    expect(screen.queryByText(/unparseable lines skipped/)).not.toBeInTheDocument();
  });

  it('dismiss button clears the store', () => {
    useImportSummaryStore.getState().set(makeResult({ sideboardCount: 3 }));
    render(<ImportSummary />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss import summary/i }));
    expect(useImportSummaryStore.getState().result).toBeNull();
  });

  it('clears the store on unmount so re-navigating to the workspace does not re-show the panel', () => {
    useImportSummaryStore.getState().set(makeResult());
    const { unmount } = render(<ImportSummary />);
    expect(useImportSummaryStore.getState().result).not.toBeNull();
    unmount();
    expect(useImportSummaryStore.getState().result).toBeNull();
  });
});
