import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CardDetailDrawer from './CardDetailDrawer';
import { useGraphStore } from '../stores/graphStore';
import type { Card } from '@shared/types';

function dfcCard(): Card {
  return {
    oracleId: 'peter', name: 'Peter Parker // Amazing Spider-Man',
    set: 'spm', printings: ['spm'], collectorNumber: '10',
    manaCost: '{1}{W}', cmc: 2, colors: ['W'], colorIdentity: ['G','U','W'],
    typeLine: 'Legendary Creature', types: ['Creature'],
    subtypes: ['Human'], supertypes: ['Legendary'],
    oracleText: 'When Peter Parker enters...\n\nVigilance, reach', keywords: ['Transform'],
    power: '0', toughness: '1', rarity: 'mythic',
    imageUrl: 'http://test/front.jpg',
    layout: 'modal_dfc',
    faces: [
      { name: 'Peter Parker', typeLine: 'Legendary Creature — Human Scientist Hero',
        types: ['Creature'], subtypes: ['Human','Scientist','Hero'], supertypes: ['Legendary'],
        oracleText: 'When Peter Parker enters, create a 2/1 green Spider creature token with reach.',
        manaCost: '{1}{W}', colors: ['W'], power: '0', toughness: '1',
        imageUrl: 'http://test/front.jpg' },
      { name: 'Amazing Spider-Man', typeLine: 'Legendary Creature — Spider Human Hero',
        types: ['Creature'], subtypes: ['Spider','Human','Hero'], supertypes: ['Legendary'],
        oracleText: 'Vigilance, reach. Web-slinging granted.',
        manaCost: '{1}{G}{W}{U}', colors: ['G','U','W'], power: '4', toughness: '4',
        imageUrl: 'http://test/back.jpg' },
    ],
    tags: [
      { tagId: 'effect.create_creature_token', axis: 'effect', evidence: 'spider token', face: 'front' },
      { tagId: 'effect.has_vigilance', axis: 'effect', evidence: 'vigilance', face: 'back' },
    ],
  };
}

beforeEach(() => {
  useGraphStore.setState({
    cards: new Map([['peter', dfcCard()]]),
    edges: new Map(), edgesInbound: new Map(),
    tagCatalog: new Map([
      ['effect.create_creature_token', { tagId: 'effect.create_creature_token', axis: 'effect', label: 'Create token', description: '', pairsWith: [] }],
      ['effect.has_vigilance', { tagId: 'effect.has_vigilance', axis: 'effect', label: 'Has vigilance', description: '', pairsWith: [] }],
    ]) as any,
  });
});

function renderDrawer(card: Card) {
  return render(
    <MemoryRouter>
      <CardDetailDrawer card={card} onFocusCard={vi.fn()} onBack={vi.fn()}
        onForward={vi.fn()} canBack={false} canForward={false} />
    </MemoryRouter>
  );
}

describe('CardDetailDrawer multi-face', () => {
  it('flippable: shows front face initially, flip button is rendered', () => {
    renderDrawer(dfcCard());
    expect(screen.getByRole('heading', { name: /Peter Parker/i })).toBeInTheDocument();
    expect(screen.getByText(/create a 2\/1 green Spider/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Flip to back face/i)).toBeInTheDocument();
  });

  it('flip button swaps to back face: image, name, type line, oracle text', () => {
    renderDrawer(dfcCard());
    fireEvent.click(screen.getByLabelText(/Flip to back face/i));
    expect(screen.getByRole('heading', { name: /Amazing Spider-Man/i })).toBeInTheDocument();
    expect(screen.getByText(/Web-slinging granted/i)).toBeInTheDocument();
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toContain('back.jpg');
  });

  it('keyboard "f" flips the card', () => {
    renderDrawer(dfcCard());
    fireEvent.keyDown(window, { key: 'f' });
    expect(screen.getByRole('heading', { name: /Amazing Spider-Man/i })).toBeInTheDocument();
  });

  it('tag chips filter to the visible face', () => {
    renderDrawer(dfcCard());
    // front: Create-token chip visible, vigilance chip hidden
    expect(screen.getByText(/Create token/i)).toBeInTheDocument();
    expect(screen.queryByText(/Has vigilance/i)).toBeNull();
    fireEvent.click(screen.getByLabelText(/Flip to back face/i));
    expect(screen.queryByText(/Create token/i)).toBeNull();
    expect(screen.getByText(/Has vigilance/i)).toBeInTheDocument();
  });
});
