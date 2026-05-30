import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GoldfishModal from './GoldfishModal';
import { useGraphStore } from '../stores/graphStore';
import { useDeckStore } from '../stores/deckStore';
import type { Card } from '@shared/types';

function card(id: string, name: string, opts: Partial<Card> = {}): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: ['Creature'], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: 'https://img/x.png', tags: [],
    ...opts,
  };
}

beforeEach(() => {
  const map = new Map<string, Card>();
  for (let i = 0; i < 30; i++) {
    map.set(`c${i}`, card(`c${i}`, `Card ${i}`));
  }
  useGraphStore.setState({
    cards: map,
    edges: new Map(), edgesInbound: new Map(), tagCatalog: new Map(),
    ruleVersion: 't', status: 'ready',
  });
  useDeckStore.setState({
    activeDeckId: 'd1',
    decks: [{
      id: 'd1', name: 'Test Deck', format: 'standard',
      originalCards: Array.from({ length: 30 }, (_, i) => ({ oracleId: `c${i}`, count: 2 })),
      workingCards: Array.from({ length: 30 }, (_, i) => ({ oracleId: `c${i}`, count: 2 })),
      createdAt: 0, updatedAt: 0,
    }],
  });
});

describe('GoldfishModal', () => {
  it('renders 7 card images on open', () => {
    render(<GoldfishModal onClose={vi.fn()} />);
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBe(7);
  });

  it('shows library count 53 / 60 on open', () => {
    render(<GoldfishModal onClose={vi.fn()} />);
    expect(screen.getByText(/53\s*\/\s*60/)).toBeInTheDocument();
  });

  it('Draw adds one card and decrements library', () => {
    render(<GoldfishModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /draw/i }));
    expect(screen.getAllByRole('img').length).toBe(8);
    expect(screen.getByText(/52\s*\/\s*60/)).toBeInTheDocument();
  });

  it('Draw disabled when library empty', () => {
    // 5-card deck
    useDeckStore.setState({
      ...useDeckStore.getState(),
      decks: [{
        id: 'd1', name: 'Tiny', format: 'standard',
        originalCards: [{ oracleId: 'c0', count: 5 }],
        workingCards: [{ oracleId: 'c0', count: 5 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<GoldfishModal onClose={vi.fn()} />);
    expect(screen.getAllByRole('img').length).toBe(5);
    expect(screen.getByRole('button', { name: /draw/i })).toBeDisabled();
  });

  it('Shuffle resets the hand to 7 fresh cards', () => {
    render(<GoldfishModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /draw/i }));
    fireEvent.click(screen.getByRole('button', { name: /draw/i }));
    expect(screen.getAllByRole('img').length).toBe(9);
    fireEvent.click(screen.getByRole('button', { name: /shuffle/i }));
    expect(screen.getAllByRole('img').length).toBe(7);
    expect(screen.getByText(/53\s*\/\s*60/)).toBeInTheDocument();
  });

  it('ESC calls onClose', () => {
    const onClose = vi.fn();
    render(<GoldfishModal onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking backdrop calls onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<GoldfishModal onClose={onClose} />);
    const backdrop = container.querySelector('[data-testid="goldfish-backdrop"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows empty state when deck has no cards', () => {
    useDeckStore.setState({
      ...useDeckStore.getState(),
      decks: [{
        id: 'd1', name: 'Empty', format: 'standard',
        originalCards: [], workingCards: [], createdAt: 0, updatedAt: 0,
      }],
    });
    render(<GoldfishModal onClose={vi.fn()} />);
    expect(screen.getByText(/deck is empty/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /draw/i })).toBeDisabled();
  });
});
