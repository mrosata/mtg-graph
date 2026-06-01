import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import BrowserShell from './BrowserShell';
import { useGraphStore } from '../stores/graphStore';
import type { Card, TagDef } from '@shared/types';

// jsdom doesn't ship ResizeObserver; BrowserShell's grid wrapper installs one
// on mount. A no-op stub is enough, measureGrid still runs once synchronously
// inside the callback ref, so width/height stay at 0 and CardGrid renders an
// empty react-window container.
class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: typeof StubResizeObserver }).ResizeObserver = StubResizeObserver;

function URLProbe() {
  const [sp] = useSearchParams();
  return <pre data-testid="url-params">{sp.toString()}</pre>;
}

function makeCard(id: string): Card {
  return {
    oracleId: id, name: id, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

function seedStore(overrides: Partial<ReturnType<typeof useGraphStore.getState>> = {}) {
  useGraphStore.setState({
    cards: new Map([['a', makeCard('a')], ['b', makeCard('b')]]),
    edges: new Map(),
    edgesInbound: new Map(),
    tagCatalog: new Map(),
    ruleVersion: 'test',
    status: 'ready',
    ...overrides,
  });
}

function renderShell(
  props: Partial<React.ComponentProps<typeof BrowserShell>> = {},
  initialEntries: string[] = ['/'],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <BrowserShell filter={{}} onFilterChange={() => {}} {...props} />
    </MemoryRouter>,
  );
}

const fooTag: TagDef = {
  tagId: 'effect.foo', axis: 'effect', label: 'Foo Effect',
  description: 'desc', pairsWith: [],
};

describe('BrowserShell', () => {
  beforeEach(() => seedStore());

  it('renders loading state when status is loading', () => {
    seedStore({ status: 'loading' });
    renderShell();
    expect(screen.getByText(/loading card data/i)).toBeInTheDocument();
  });

  it('renders error state when status is error', () => {
    seedStore({ status: 'error' });
    renderShell();
    expect(screen.getByText(/failed to load card data/i)).toBeInTheDocument();
  });

  it('renders the filtered card count in the header bar', () => {
    renderShell();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('cards')).toBeInTheDocument();
  });

  it('renders headerExtra content alongside the count', () => {
    renderShell({ headerExtra: <span>HEADER_EXTRA_CONTENT</span> });
    expect(screen.getByText('HEADER_EXTRA_CONTENT')).toBeInTheDocument();
  });

  it('renders rightRail content when provided', () => {
    renderShell({
      rightRail: ({ onCardClick }) => (
        <button onClick={() => onCardClick('a')}>OPEN_FROM_RAIL</button>
      ),
    });
    expect(screen.getByText('OPEN_FROM_RAIL')).toBeInTheDocument();
  });

  it('renders ActiveTagFilter chips when URL has tag params', () => {
    seedStore({ tagCatalog: new Map([[fooTag.tagId, fooTag]]) });
    renderShell({}, ['/?tag=effect.foo']);
    expect(screen.getByRole('button', { name: /Remove Foo Effect filter/ })).toBeInTheDocument();
  });

  it('clicking the chip × removes the tag from URL (chip disappears)', () => {
    seedStore({ tagCatalog: new Map([[fooTag.tagId, fooTag]]) });
    renderShell({}, ['/?tag=effect.foo']);
    fireEvent.click(screen.getByRole('button', { name: /Remove Foo Effect filter/ }));
    expect(screen.queryByRole('button', { name: /Remove Foo Effect filter/ })).not.toBeInTheDocument();
  });

  it('does not render the chip strip when no tag params are present', () => {
    seedStore({ tagCatalog: new Map([[fooTag.tagId, fooTag]]) });
    renderShell({}, ['/']);
    expect(screen.queryByRole('button', { name: /Remove Foo Effect filter/ })).not.toBeInTheDocument();
  });

  it('rightRail receives a working onCardClick that updates the URL card param', () => {
    let invoked: string | null = null;
    renderShell({
      rightRail: ({ onCardClick }) => (
        <button onClick={() => { invoked = 'clicked'; onCardClick('a'); }}>
          OPEN_A
        </button>
      ),
    });
    fireEvent.click(screen.getByText('OPEN_A'));
    expect(invoked).toBe('clicked');
  });

  describe('tag mode URL persistence', () => {
    function renderWith(initial: string) {
      return render(
        <MemoryRouter initialEntries={[initial]}>
          <BrowserShell filter={{}} onFilterChange={() => {}} />
          <URLProbe />
        </MemoryRouter>,
      );
    }

    it('preserves imode=or from the initial URL', () => {
      const view = renderWith('/?imode=or');
      expect(view.getByTestId('url-params').textContent).toContain('imode=or');
    });

    it('preserves tmode=or from the initial URL', () => {
      const view = renderWith('/?tmode=or');
      expect(view.getByTestId('url-params').textContent).toContain('tmode=or');
    });

    it('preserves imode and tmode independently', () => {
      const view = renderWith('/?imode=or');
      expect(view.getByTestId('url-params').textContent).toContain('imode=or');
      expect(view.getByTestId('url-params').textContent).not.toContain('tmode=');
    });

    it('preserves imode alongside tags', () => {
      const view = renderWith('/?imode=or&tag=x&tag=y');
      const text = view.getByTestId('url-params').textContent ?? '';
      expect(text).toContain('imode=or');
      expect(text).toContain('tag=x');
      expect(text).toContain('tag=y');
    });
  });
});
