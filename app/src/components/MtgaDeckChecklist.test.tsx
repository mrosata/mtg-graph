import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MtgaDeckChecklist from './MtgaDeckChecklist';
import type { ParsedMtgaDeck } from '../lib/mtgaResolve';

const deckA: ParsedMtgaDeck = {
  mtgaId: 'a', mtgaName: 'Mono-Red', mtgaFormat: 'Standard',
  mainboard: Array(60).fill({ oracleId: 'oid-a', count: 1 }),
  sideboard: [], companion: null,
  unresolvedMain: 0, unresolvedSide: 0, inPoolPercent: 100,
};
const deckB: ParsedMtgaDeck = {
  mtgaId: 'b', mtgaName: 'Historic Brew', mtgaFormat: 'Historic',
  mainboard: [], sideboard: [], companion: null,
  unresolvedMain: 60, unresolvedSide: 0, inPoolPercent: 0,
};
const deckC: ParsedMtgaDeck = {
  mtgaId: 'c', mtgaName: 'Mixed', mtgaFormat: 'Standard',
  mainboard: Array(40).fill({ oracleId: 'oid-a', count: 1 }),
  sideboard: [], companion: null,
  unresolvedMain: 20, unresolvedSide: 0, inPoolPercent: 67,
};

describe('MtgaDeckChecklist', () => {
  it('renders one row per deck with name, format, and in-pool %', () => {
    render(<MtgaDeckChecklist decks={[deckA, deckB, deckC]} selected={new Set()} onChange={() => {}} />);
    expect(screen.getByText('Mono-Red')).toBeInTheDocument();
    expect(screen.getByText('Historic Brew')).toBeInTheDocument();
    expect(screen.getByText('Mixed')).toBeInTheDocument();
    expect(screen.getByText('100% in pool')).toBeInTheDocument();
    expect(screen.getByText('0% in pool')).toBeInTheDocument();
  });

  it('sorts decks by inPoolPercent descending', () => {
    render(<MtgaDeckChecklist decks={[deckB, deckA, deckC]} selected={new Set()} onChange={() => {}} />);
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Mono-Red');
    expect(rows[1]).toHaveTextContent('Mixed');
    expect(rows[2]).toHaveTextContent('Historic Brew');
  });

  it('emits onChange with new Set when a row is toggled', () => {
    let captured: Set<string> | null = null;
    render(
      <MtgaDeckChecklist
        decks={[deckA, deckB]}
        selected={new Set(['a'])}
        onChange={(s) => { captured = s; }}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Historic Brew/i));
    expect(captured).toEqual(new Set(['a', 'b']));
  });

  it('Select all / Select none toggle every row', () => {
    let captured: Set<string> | null = null;
    render(
      <MtgaDeckChecklist
        decks={[deckA, deckB]}
        selected={new Set()}
        onChange={(s) => { captured = s; }}
      />,
    );
    fireEvent.click(screen.getByText(/Select all/i));
    expect(captured).toEqual(new Set(['a', 'b']));
    fireEvent.click(screen.getByText(/Select none/i));
    expect(captured).toEqual(new Set());
  });
});
