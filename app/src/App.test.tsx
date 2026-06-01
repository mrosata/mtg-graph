import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { useDeckStore } from './stores/deckStore';
import { useGraphStore } from './stores/graphStore';

class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: typeof StubResizeObserver }).ResizeObserver = StubResizeObserver;

const seededDeck = {
  id: 'd1', name: 'BreadcrumbDeck', format: 'standard' as const,
  originalCards: [{ oracleId: 'a', count: 4 }],
  workingCards: [{ oracleId: 'a', count: 4 }],
  createdAt: 0, updatedAt: 0,
};

beforeEach(() => {
  // Stub fetch so the App's hydrate call doesn't actually hit the network.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('stub'))));
  useGraphStore.setState({
    cards: new Map(),
    edges: new Map(),
    edgesInbound: new Map(),
    tagCatalog: new Map(),
    ruleVersion: 't',
    status: 'ready',
  });
  useDeckStore.setState({ decks: [], activeDeckId: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  cleanup();
});

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
}

describe('App - active deck breadcrumb', () => {
  it('does not render the breadcrumb when no deck is active', () => {
    renderApp();
    expect(screen.queryByLabelText(/Active deck:/)).not.toBeInTheDocument();
  });

  it('renders the breadcrumb with the active deck name when activeDeckId is set', () => {
    useDeckStore.setState({ decks: [seededDeck], activeDeckId: 'd1' });
    renderApp();
    const breadcrumb = screen.getByLabelText('Active deck: BreadcrumbDeck');
    expect(breadcrumb).toBeInTheDocument();
    expect(breadcrumb).toHaveTextContent('BreadcrumbDeck');
  });
});
