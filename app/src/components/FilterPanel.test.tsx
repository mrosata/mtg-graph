import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterPanel from './FilterPanel';
import type { Card, TagDef } from '@shared/types';
import { useGraphStore } from '../stores/graphStore';
import { useLibraryStore } from '../stores/libraryStore';

beforeEach(() => {
  window.localStorage.clear();
  useLibraryStore.setState({ owned: null, enabled: false, meta: null });
  useGraphStore.setState({ cards: new Map() } as never);
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

  it('renders the Interactions AND/OR toggle when 2+ interaction tags are selected', () => {
    const catalogWithTwo = new Map<string, TagDef>([
      ['effect.draw', { tagId: 'effect.draw', axis: 'effect', label: 'Draw cards', description: '', pairsWith: [] }],
      ['effect.burn', { tagId: 'effect.burn', axis: 'effect', label: 'Burn', description: '', pairsWith: [] }],
    ]);
    render(
      <FilterPanel
        value={{ tags: ['effect.draw', 'effect.burn'] }}
        onChange={() => {}}
        cards={[]}
        tagCatalog={catalogWithTwo}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /interactions/i }));
    expect(screen.getByRole('radiogroup', { name: /interactions match mode/i })).toBeInTheDocument();
  });

  it('does not render the Interactions toggle when only 1 interaction tag is selected', () => {
    const catalogWithOne = new Map<string, TagDef>([
      ['effect.draw', { tagId: 'effect.draw', axis: 'effect', label: 'Draw cards', description: '', pairsWith: [] }],
    ]);
    render(
      <FilterPanel
        value={{ tags: ['effect.draw'] }}
        onChange={() => {}}
        cards={[]}
        tagCatalog={catalogWithOne}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /interactions/i }));
    expect(screen.queryByRole('radiogroup', { name: /interactions match mode/i })).not.toBeInTheDocument();
  });

  it('clicking OR in the Interactions toggle emits interactionTagsMode=or', () => {
    const onChange = vi.fn();
    const catalogWithTwo = new Map<string, TagDef>([
      ['effect.draw', { tagId: 'effect.draw', axis: 'effect', label: 'Draw cards', description: '', pairsWith: [] }],
      ['effect.burn', { tagId: 'effect.burn', axis: 'effect', label: 'Burn', description: '', pairsWith: [] }],
    ]);
    render(
      <FilterPanel
        value={{ tags: ['effect.draw', 'effect.burn'] }}
        onChange={onChange}
        cards={[]}
        tagCatalog={catalogWithTwo}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /interactions/i }));
    const orBtn = screen
      .getAllByRole('radio', { name: /^or$/i })
      .find((el) => el.closest('[aria-label*="Interactions match mode" i]'));
    expect(orBtn).toBeDefined();
    fireEvent.click(orBtn!);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ interactionTagsMode: 'or' }),
    );
  });

  it('clicking AND when OR is active emits interactionTagsMode=undefined (default)', () => {
    const onChange = vi.fn();
    const catalogWithTwo = new Map<string, TagDef>([
      ['effect.draw', { tagId: 'effect.draw', axis: 'effect', label: 'Draw cards', description: '', pairsWith: [] }],
      ['effect.burn', { tagId: 'effect.burn', axis: 'effect', label: 'Burn', description: '', pairsWith: [] }],
    ]);
    render(
      <FilterPanel
        value={{ tags: ['effect.draw', 'effect.burn'], interactionTagsMode: 'or' }}
        onChange={onChange}
        cards={[]}
        tagCatalog={catalogWithTwo}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /interactions/i }));
    const andBtn = screen
      .getAllByRole('radio', { name: /^and$/i })
      .find((el) => el.closest('[aria-label*="Interactions match mode" i]'));
    expect(andBtn).toBeDefined();
    fireEvent.click(andBtn!);
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last).toBeDefined();
    expect(last.interactionTagsMode).toBeUndefined();
  });

  it('toggling the Themes mode does not affect interactionTagsMode', () => {
    const onChange = vi.fn();
    const catalogMixed = new Map<string, TagDef>([
      ['effect.draw', { tagId: 'effect.draw', axis: 'effect', label: 'Draw cards', description: '', pairsWith: [] }],
      ['theme.tokens', { tagId: 'theme.tokens', axis: 'effect', label: 'Tokens', description: '', pairsWith: [], category: 'theme' }],
      ['theme.lifegain', { tagId: 'theme.lifegain', axis: 'effect', label: 'Lifegain', description: '', pairsWith: [], category: 'theme' }],
    ]);
    render(
      <FilterPanel
        value={{
          tags: ['theme.tokens', 'theme.lifegain'],
          interactionTagsMode: 'or',
        }}
        onChange={onChange}
        cards={[]}
        tagCatalog={catalogMixed}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /deck themes/i }));
    const orBtn = screen
      .getAllByRole('radio', { name: /^or$/i })
      .find((el) => el.closest('[aria-label*="Deck themes match mode" i]'));
    expect(orBtn).toBeDefined();
    fireEvent.click(orBtn!);
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last.themeTagsMode).toBe('or');
    expect(last.interactionTagsMode).toBe('or');
  });

  describe('library-aware filter narrowing', () => {
    it('hides interaction tags absent from the library when library is enabled', () => {
      const owned = makeCard({
        oracleId: 'owned-1',
        printings: ['woe'],
        tags: [{ tagId: 'theme.tokens', axis: 'effect', evidence: '' }],
      });
      useGraphStore.setState({ cards: new Map([[owned.oracleId, owned]]) } as never);
      useLibraryStore.setState({ owned: new Map([['owned-1', 1]]), enabled: true, meta: null });

      render(<FilterPanel value={{}} onChange={() => {}} cards={[owned]} tagCatalog={catalog} />);
      fireEvent.click(screen.getByRole('button', { name: /interactions/i }));
      // 'effect.draw' is in the catalog but no owned card has it → should be hidden.
      expect(screen.queryByLabelText('Draw cards')).not.toBeInTheDocument();
    });

    it('hides theme tags absent from the library when library is enabled', () => {
      const owned = makeCard({
        oracleId: 'owned-1',
        printings: ['woe'],
        tags: [{ tagId: 'effect.draw', axis: 'effect', evidence: '' }],
      });
      useGraphStore.setState({ cards: new Map([[owned.oracleId, owned]]) } as never);
      useLibraryStore.setState({ owned: new Map([['owned-1', 1]]), enabled: true, meta: null });

      render(<FilterPanel value={{}} onChange={() => {}} cards={[owned]} tagCatalog={catalog} />);
      fireEvent.click(screen.getByRole('button', { name: /deck themes/i }));
      expect(screen.queryByLabelText('Tokens matter')).not.toBeInTheDocument();
    });

    it('shows all tags again when library is loaded but toggle is off', () => {
      const owned = makeCard({
        oracleId: 'owned-1',
        printings: ['woe'],
        tags: [{ tagId: 'effect.draw', axis: 'effect', evidence: '' }],
      });
      useGraphStore.setState({ cards: new Map([[owned.oracleId, owned]]) } as never);
      useLibraryStore.setState({ owned: new Map([['owned-1', 1]]), enabled: false, meta: null });

      render(<FilterPanel value={{}} onChange={() => {}} cards={[owned]} tagCatalog={catalog} />);
      fireEvent.click(screen.getByRole('button', { name: /deck themes/i }));
      // Toggle off → no narrowing → 'Tokens matter' still shown.
      expect(screen.getByLabelText('Tokens matter')).toBeInTheDocument();
    });
  });
});
