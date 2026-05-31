import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useLibraryStore } from '../stores/libraryStore';
import OwnedBadge from './OwnedBadge';
import type { Card } from '@shared/types';

function makeCard(over: Partial<Card>): Card {
  return {
    oracleId: 'x', name: 'X', set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
    ...over,
  };
}

beforeEach(() => useLibraryStore.setState({ owned: null, enabled: false, meta: null }));

describe('OwnedBadge', () => {
  it('renders nothing when no library is loaded', () => {
    const { container } = render(<OwnedBadge card={makeCard({ oracleId: 'a' })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the owned count when library is loaded', () => {
    useLibraryStore.setState({ owned: new Map([['a', 3]]), enabled: true, meta: null });
    render(<OwnedBadge card={makeCard({ oracleId: 'a' })} />);
    expect(screen.getByText(/×3/)).toBeInTheDocument();
  });

  it('renders ×0 when library is loaded but card is not owned', () => {
    useLibraryStore.setState({ owned: new Map([['b', 1]]), enabled: true, meta: null });
    render(<OwnedBadge card={makeCard({ oracleId: 'a' })} />);
    expect(screen.getByText(/×0/)).toBeInTheDocument();
  });

  it('renders nothing for a basic land', () => {
    useLibraryStore.setState({ owned: new Map([['a', 24]]), enabled: true, meta: null });
    const { container } = render(
      <OwnedBadge card={makeCard({ oracleId: 'a', name: 'Mountain', typeLine: 'Basic Land — Mountain', types: ['Land'], supertypes: ['Basic'] })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
