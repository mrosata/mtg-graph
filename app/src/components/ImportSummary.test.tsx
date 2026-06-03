import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImportSummary from './ImportSummary';
import { useImportSummaryStore } from '../stores/importSummaryStore';
import type { ImportResult } from '../lib/deckImport';

function makeResult(overrides: Partial<ImportResult> = {}): ImportResult {
  return {
    resolved: [{ oracleId: 'a', count: 4, name: 'Lightning Bolt' }],
    unknown: [],
    sideboardResolved: [],
    sideboardUnknown: [],
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

  it('rolls sideboard counts (resolved + unknown) into the M-of-N header', () => {
    useImportSummaryStore.getState().set(makeResult({
      resolved: [{ oracleId: 'a', count: 60, name: 'Lightning Bolt' }],
      sideboardResolved: [{ oracleId: 'a', count: 10, name: 'Lightning Bolt' }],
      sideboardUnknown: [{ count: 5, name: 'Tarmogoyf' }],
    }));
    render(<ImportSummary />);
    expect(screen.getByText('Imported 70 of 75 cards.')).toBeInTheDocument();
  });

  it('lists sideboard unknowns alongside main-deck unknowns in the skipped details', () => {
    useImportSummaryStore.getState().set(makeResult({
      unknown: [{ count: 4, name: 'Tarmogoyf' }],
      sideboardUnknown: [{ count: 2, name: 'Force of Will' }],
    }));
    render(<ImportSummary />);
    expect(screen.getByText(/6 cards skipped — not in Standard/)).toBeInTheDocument();
    expect(screen.getByText('4 Tarmogoyf')).toBeInTheDocument();
    expect(screen.getByText('2 Force of Will')).toBeInTheDocument();
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

  it('omits the unparseable section when there are no unparseable lines', () => {
    useImportSummaryStore.getState().set(makeResult());
    render(<ImportSummary />);
    expect(screen.queryByText(/unparseable lines skipped/)).not.toBeInTheDocument();
  });

  it('dismiss button clears the store', () => {
    useImportSummaryStore.getState().set(makeResult({
      sideboardUnknown: [{ count: 3, name: 'Force of Will' }],
    }));
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
