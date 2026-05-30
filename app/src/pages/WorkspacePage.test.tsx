import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkspacePage from './WorkspacePage';
import { useDeckStore } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';

// jsdom doesn't ship ResizeObserver; BrowserShell installs one on mount.
class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: typeof StubResizeObserver }).ResizeObserver = StubResizeObserver;

const seededDeck = {
  id: 'd1', name: 'TestDeck', format: 'standard' as const,
  originalCards: [{ oracleId: 'a', count: 4 }],
  workingCards: [{ oracleId: 'a', count: 2 }],
  createdAt: 0, updatedAt: 0,
};

beforeEach(() => {
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
  vi.restoreAllMocks();
  cleanup();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkspacePage />
    </MemoryRouter>,
  );
}

function dispatchSave(meta = true) {
  const ev = new KeyboardEvent('keydown', {
    key: 's', metaKey: meta, ctrlKey: !meta,
    bubbles: true, cancelable: true,
  });
  document.dispatchEvent(ev);
  return ev;
}

describe('WorkspacePage — no active deck', () => {
  it('does not render the deck action bar', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /goldfish/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /graph/i })).not.toBeInTheDocument();
  });

  it('does not preventDefault on Cmd-S', () => {
    renderPage();
    const ev = dispatchSave(true);
    expect(ev.defaultPrevented).toBe(false);
  });
});

describe('WorkspacePage — active deck', () => {
  beforeEach(() => {
    useDeckStore.setState({ decks: [seededDeck], activeDeckId: 'd1' });
  });

  it('renders the deck action bar (Goldfish + Graph link)', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /goldfish/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /graph/i })).toBeInTheDocument();
  });

  it('Graph link points to /graph (not /deck/graph)', () => {
    renderPage();
    const graphLink = screen.getByRole('link', { name: /graph/i });
    expect(graphLink.getAttribute('href')).toBe('/graph');
  });

  it('Cmd-S calls saveDeck and preventDefaults when dirty', () => {
    const saveSpy = vi.spyOn(useDeckStore.getState(), 'saveDeck');
    renderPage();
    const ev = dispatchSave(true);
    expect(ev.defaultPrevented).toBe(true);
    expect(saveSpy).toHaveBeenCalledWith('d1');
  });

  it('Ctrl-S also triggers save', () => {
    const saveSpy = vi.spyOn(useDeckStore.getState(), 'saveDeck');
    renderPage();
    const ev = dispatchSave(false);
    expect(ev.defaultPrevented).toBe(true);
    expect(saveSpy).toHaveBeenCalledWith('d1');
  });

  it('removes the Cmd-S listener on unmount', () => {
    const saveSpy = vi.spyOn(useDeckStore.getState(), 'saveDeck');
    const { unmount } = renderPage();
    unmount();
    const ev = dispatchSave(true);
    expect(ev.defaultPrevented).toBe(false);
    expect(saveSpy).not.toHaveBeenCalled();
  });
});

describe('WorkspacePage — transitions', () => {
  it('transitions from no-deck to active-deck: action bar appears and Cmd-S becomes active', async () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /goldfish/i })).not.toBeInTheDocument();
    const ev1 = dispatchSave(true);
    expect(ev1.defaultPrevented).toBe(false);

    await act(async () => {
      useDeckStore.setState({ decks: [seededDeck], activeDeckId: 'd1' });
    });

    expect(screen.getByRole('button', { name: /goldfish/i })).toBeInTheDocument();
    const saveSpy = vi.spyOn(useDeckStore.getState(), 'saveDeck');
    const ev2 = dispatchSave(true);
    expect(ev2.defaultPrevented).toBe(true);
    expect(saveSpy).toHaveBeenCalledWith('d1');
  });
});
