import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FillManaButton from './FillManaButton';
import { useGraphStore } from '../stores/graphStore';
import { useDeckStore } from '../stores/deckStore';
import type { Card } from '@shared/types';

function card(id: string, name: string, opts: Partial<Card> = {}): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
    ...opts,
  };
}

beforeEach(() => {
  useGraphStore.setState({
    cards: new Map<string, Card>([
      ['bolt', card('bolt', 'Lightning Bolt', { types: ['Instant'], manaCost: '{R}', cmc: 3, colorIdentity: ['R'] })],
      ['mountain', card('mountain', 'Mountain', { types: ['Land'], supertypes: ['Basic'], subtypes: ['Mountain'] })],
    ]),
    edges: new Map(), edgesInbound: new Map(), tagCatalog: new Map(),
    ruleVersion: 't', status: 'ready',
  });
  useDeckStore.setState({
    activeDeckId: 'd1',
    decks: [{
      id: 'd1', name: 'My Deck', format: 'standard',
      originalCards: [{ oracleId: 'bolt', count: 22 }],
      workingCards: [{ oracleId: 'bolt', count: 22 }],
      createdAt: 0, updatedAt: 0,
    }],
  });
});

describe('FillManaButton', () => {
  it('renders the button', () => {
    render(<FillManaButton />);
    expect(screen.getByRole('button', { name: /fill mana/i })).toBeInTheDocument();
  });

  it('opens the popover on click and shows detected spell count', () => {
    render(<FillManaButton />);
    fireEvent.click(screen.getByRole('button', { name: /fill mana/i }));
    expect(screen.getByText(/22 spells/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/limited \(40\)/i)).toBeChecked();
  });

  it('toggling the radio updates the preview', () => {
    render(<FillManaButton />);
    fireEvent.click(screen.getByRole('button', { name: /fill mana/i }));
    fireEvent.click(screen.getByLabelText(/standard \(60\)/i));
    expect(screen.getByLabelText(/standard \(60\)/i)).toBeChecked();
    // Preview should show 24 Mountains for standard target.
    expect(screen.getByText(/24 mountain/i)).toBeInTheDocument();
  });

  it('Cancel closes the popover without mutation', () => {
    const applySpy = vi.fn();
    useDeckStore.setState({ ...useDeckStore.getState(), applyLandFill: applySpy } as never);
    render(<FillManaButton />);
    fireEvent.click(screen.getByRole('button', { name: /fill mana/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(applySpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/22 spells/i)).not.toBeInTheDocument();
  });

  it('Fill triggers applyLandFill and closes the popover', () => {
    const applySpy = vi.fn();
    useDeckStore.setState({ ...useDeckStore.getState(), applyLandFill: applySpy } as never);
    render(<FillManaButton />);
    fireEvent.click(screen.getByRole('button', { name: /fill mana/i }));
    fireEvent.click(screen.getByRole('button', { name: /^fill$/i }));
    expect(applySpy).toHaveBeenCalledTimes(1);
    const callArg = applySpy.mock.calls[0]?.[0] as { add: { oracleId: string; count: number }[] };
    expect(callArg.add).toEqual([{ oracleId: 'mountain', count: 17 }]);
  });

  it('shows "no colored spells" message and disables Fill when deck has none', () => {
    useDeckStore.setState({
      ...useDeckStore.getState(),
      decks: [{
        id: 'd1', name: 'Empty', format: 'standard',
        originalCards: [], workingCards: [], createdAt: 0, updatedAt: 0,
      }],
    });
    render(<FillManaButton />);
    fireEvent.click(screen.getByRole('button', { name: /fill mana/i }));
    expect(screen.getByText(/add some colored spells/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^fill$/i })).toBeDisabled();
  });
});
