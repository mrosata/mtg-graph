import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterPanel from './FilterPanel';
import type { Card, TagDef } from '@shared/types';

beforeEach(() => {
  window.localStorage.clear();
});

function makeCard(over: Partial<Card> = {}): Card {
  return {
    oracleId: 'x', name: 'X', set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [], ...over,
  };
}

const catalog = new Map<string, TagDef>([
  ['effect.draw', { tagId: 'effect.draw', axis: 'effect', label: 'Draw cards', description: '', pairsWith: [] }],
  ['theme.tokens', { tagId: 'theme.tokens', axis: 'effect', label: 'Tokens matter', description: '', pairsWith: [], category: 'theme' }],
]);

describe('FilterPanel', () => {
  it('emits filter object when color toggled', () => {
    const onChange = vi.fn();
    render(<FilterPanel value={{}} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
    fireEvent.click(screen.getByRole('button', { name: 'R' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ colors: ['R'] }));
  });

  it('emits filter object when text typed', () => {
    const onChange = vi.fn();
    render(<FilterPanel value={{}} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
    fireEvent.change(screen.getByLabelText('Oracle text'), { target: { value: 'creature' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ text: 'creature' }));
  });

  it('renders an Interactions section', () => {
    render(<FilterPanel value={{}} onChange={() => {}} cards={[]} tagCatalog={catalog} />);
    expect(screen.getByText(/interactions/i)).toBeInTheDocument();
  });

  it('renders a Deck themes section', () => {
    render(<FilterPanel value={{}} onChange={() => {}} cards={[]} tagCatalog={catalog} />);
    expect(screen.getByText(/deck themes/i)).toBeInTheDocument();
  });

  it('toggles a tag selection via the Interactions section', () => {
    const onChange = vi.fn();
    render(<FilterPanel value={{}} onChange={onChange} cards={[]} tagCatalog={catalog} />);
    fireEvent.click(screen.getByRole('button', { name: /interactions/i }));
    fireEvent.click(screen.getByLabelText('Draw cards'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tags: ['effect.draw'] }));
  });

  it('emits filter object when card name is typed', () => {
    const onChange = vi.fn();
    render(<FilterPanel value={{}} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
    fireEvent.change(screen.getByLabelText('Card name'), { target: { value: 'bolt' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'bolt' }));
  });

  it('clears the name when the input is emptied', () => {
    const onChange = vi.fn();
    render(<FilterPanel value={{ name: 'bolt' }} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
    fireEvent.change(screen.getByLabelText('Card name'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: undefined }));
  });

  it('emits filter object when a rarity is toggled', () => {
    const onChange = vi.fn();
    render(<FilterPanel value={{}} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
    fireEvent.click(screen.getByRole('button', { name: 'rare' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rarities: ['rare'] }));
  });

  it('removes a rarity from the filter when toggled off', () => {
    const onChange = vi.fn();
    render(<FilterPanel value={{ rarities: ['rare', 'mythic'] }} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
    fireEvent.click(screen.getByRole('button', { name: 'rare' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rarities: ['mythic'] }));
  });

  it('emits filter object when CMC min is set', () => {
    const onChange = vi.fn();
    render(<FilterPanel value={{}} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
    fireEvent.change(screen.getByLabelText('CMC min'), { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cmcMin: 2 }));
  });

  it('emits filter object when CMC max is set', () => {
    const onChange = vi.fn();
    render(<FilterPanel value={{}} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
    fireEvent.change(screen.getByLabelText('CMC max'), { target: { value: '6' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cmcMax: 6 }));
  });

  it('clears CMC min when input is emptied', () => {
    const onChange = vi.fn();
    render(<FilterPanel value={{ cmcMin: 2 }} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
    fireEvent.change(screen.getByLabelText('CMC min'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cmcMin: undefined }));
  });

  it('mutes a theme that would yield zero results given current filters', () => {
    const cards: Card[] = [
      makeCard({ oracleId: 'a', tags: [{ tagId: 'theme.tokens', axis: 'effect', evidence: '' }] }),
    ];
    render(
      <FilterPanel
        value={{ cmcMax: -1 }}
        onChange={() => {}}
        cards={cards}
        tagCatalog={catalog}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /deck themes/i }));
    const tokens = screen.getByLabelText('Tokens matter').closest('label');
    expect(tokens!.getAttribute('aria-disabled')).toBe('true');
  });
});
