import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeckPanelCollapsed from './DeckPanelCollapsed';
import { useGraphStore } from '../stores/graphStore';
import { useDeckStore } from '../stores/deckStore';
import type { Card } from '@shared/types';

function card(id: string, name: string, types: string[], cmc: number, manaCost: string | null): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost, cmc, colors: [], colorIdentity: [],
    typeLine: '', types, subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

beforeEach(() => {
  useGraphStore.setState({
    cards: new Map<string, Card>([
      ['bolt', card('bolt', 'Lightning Bolt', ['Instant'], 1, '{R}')],
      ['bear', card('bear', 'Grizzly Bears', ['Creature'], 2, '{1}{G}')],
      ['mountain', card('mountain', 'Mountain', ['Land'], 0, null)],
    ]),
    edges: new Map(), edgesInbound: new Map(), tagCatalog: new Map(),
    ruleVersion: 't', status: 'ready',
  });
  useDeckStore.setState({
    activeDeckId: 'd1',
    decks: [{
      id: 'd1', name: 'My Deck', format: 'standard',
      originalCards: [
        { oracleId: 'bolt', count: 4 },
        { oracleId: 'bear', count: 4 },
        { oracleId: 'mountain', count: 20 },
      ],
      workingCards: [
        { oracleId: 'bolt', count: 4 },
        { oracleId: 'bear', count: 4 },
        { oracleId: 'mountain', count: 20 },
      ],
      createdAt: 0, updatedAt: 0,
    }],
  });
});

describe('DeckPanelCollapsed', () => {
  it('shows total card count with "c" suffix', () => {
    render(<DeckPanelCollapsed onExpand={() => {}} onJumpToType={() => {}} />);
    expect(screen.getByText('28c')).toBeInTheDocument();
  });

  it('renders one pill per type present in the deck', () => {
    render(<DeckPanelCollapsed onExpand={() => {}} onJumpToType={() => {}} />);
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('I')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('4', { selector: '[data-type-count="Creature"]' })).toBeInTheDocument();
    expect(screen.getByText('4', { selector: '[data-type-count="Instant"]' })).toBeInTheDocument();
    expect(screen.getByText('20', { selector: '[data-type-count="Land"]' })).toBeInTheDocument();
  });

  it('calls onExpand when the chevron is clicked', () => {
    const onExpand = vi.fn();
    render(<DeckPanelCollapsed onExpand={onExpand} onJumpToType={() => {}} />);
    fireEvent.click(screen.getByLabelText(/expand deck panel/i));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('calls onJumpToType with the matching type when a pill is clicked', () => {
    const onJumpToType = vi.fn();
    render(<DeckPanelCollapsed onExpand={() => {}} onJumpToType={onJumpToType} />);
    fireEvent.click(screen.getByRole('button', { name: /jump to creatures/i }));
    expect(onJumpToType).toHaveBeenCalledWith('Creature');
  });

  it('renders nothing when there is no active deck', () => {
    useDeckStore.setState({ activeDeckId: null, decks: [] });
    const { container } = render(
      <DeckPanelCollapsed onExpand={() => {}} onJumpToType={() => {}} />,
    );
    expect(screen.getByLabelText(/expand deck panel/i)).toBeInTheDocument();
    expect(container.querySelector('[data-stats]')).toBeNull();
  });
});
