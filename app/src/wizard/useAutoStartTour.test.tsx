import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAutoStartTour } from './useAutoStartTour';
import { useWizardStore, _resetForTesting } from './wizardStore';
import { useGraphStore } from '../stores/graphStore';

function Harness({ navigateTo }: { navigateTo?: string }) {
  useAutoStartTour();
  const navigate = useNavigate();
  useEffect(() => {
    if (navigateTo) navigate(navigateTo);
  }, [navigate, navigateTo]);
  return null;
}

const originalInnerWidth = window.innerWidth;

function setViewportWidth(w: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w, writable: true });
}

function setGraphReady() {
  useGraphStore.setState({ status: 'ready' });
}

function setGraphLoading() {
  useGraphStore.setState({ status: 'loading' });
}

describe('useAutoStartTour', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetForTesting();
    setViewportWidth(1280);
    setGraphReady();
  });

  afterEach(() => {
    setViewportWidth(originalInnerWidth);
  });

  it('opens the global tour on first mount when global is unseen', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    expect(useWizardStore.getState().activeTour).toBe('global');
  });

  it('opens the browse tour on / when global is seen and browse is unseen', () => {
    useWizardStore.getState().markSeen('global');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    expect(useWizardStore.getState().activeTour).toBe('browse');
  });

  it('opens nothing when both global and current-page tours are seen', () => {
    useWizardStore.getState().markSeen('global');
    useWizardStore.getState().markSeen('browse');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    expect(useWizardStore.getState().activeTour).toBeNull();
  });

  it('does not double-open when a tour is already active', () => {
    useWizardStore.getState().openTour('decks');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    // No change — the in-flight tour wins.
    expect(useWizardStore.getState().activeTour).toBe('decks');
  });

  it('suppresses tours below 768px viewport width', () => {
    setViewportWidth(500);
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    expect(useWizardStore.getState().activeTour).toBeNull();
  });

  it('does not open page tour while graph is loading (but does open global)', () => {
    setGraphLoading();
    useWizardStore.getState().markSeen('global');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    // browse needs graph data → suppressed
    expect(useWizardStore.getState().activeTour).toBeNull();
  });

  it('opens the global tour even when graph is still loading', () => {
    setGraphLoading();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    // global targets nav elements only, which exist immediately
    expect(useWizardStore.getState().activeTour).toBe('global');
  });

  it('does not re-fire after the tour closes on the same pathname', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    // global opens
    expect(useWizardStore.getState().activeTour).toBe('global');
    // simulate user finishing the tour
    useWizardStore.getState().markSeen('global');
    useWizardStore.getState().closeTour();
    // we're still on /. The hook's effect deps are [pathname, graphStatus] — neither
    // changed, so no re-evaluation; browse tour must not auto-open.
    expect(useWizardStore.getState().activeTour).toBeNull();
  });

  it('opens the page tour after navigating to a different route', () => {
    useWizardStore.getState().markSeen('global');
    const { rerender } = render(
      <MemoryRouter initialEntries={['/decks']}>
        <Harness />
      </MemoryRouter>,
    );
    expect(useWizardStore.getState().activeTour).toBe('decks');

    // Simulate finishing the decks tour, then navigating to /graph.
    useWizardStore.getState().markSeen('decks');
    useWizardStore.getState().closeTour();
    rerender(
      <MemoryRouter initialEntries={['/decks']}>
        <Harness navigateTo="/graph" />
      </MemoryRouter>,
    );
    // New pathname → effect re-fires → deck-graph tour opens.
    expect(useWizardStore.getState().activeTour).toBe('deck-graph');
  });
});
