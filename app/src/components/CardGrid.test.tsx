import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CardGrid from './CardGrid';
import type { Card, CardLayout } from '@shared/types';

function makeCard(oracleId: string, layout: CardLayout): Card {
  return {
    oracleId, name: oracleId, set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: '{1}', cmc: 1, colors: [], colorIdentity: [],
    typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: '1', toughness: '1',
    rarity: 'common', imageUrl: '',
    layout, tags: [],
  };
}

describe('CardGrid multi-face badge', () => {
  it('renders a multi-face badge for transform/modal_dfc/meld; none for normal/split/adventure', () => {
    const cards: Card[] = [
      makeCard('mfc', 'modal_dfc'),
      makeCard('tx', 'transform'),
      makeCard('me', 'meld'),
      makeCard('sp', 'split'),
      makeCard('ad', 'adventure'),
      makeCard('nm', 'normal'),
    ];
    render(<CardGrid cards={cards} onCardClick={vi.fn()} width={2000} height={800} />);
    const badges = screen.getAllByLabelText(/Has two faces/i);
    expect(badges.length).toBe(3); // modal_dfc + transform + meld
  });
});
