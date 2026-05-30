import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HelpMenu from './HelpMenu';
import { useWizardStore, _resetForTesting } from './wizardStore';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <HelpMenu />
    </MemoryRouter>,
  );
}

describe('HelpMenu', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetForTesting();
  });

  it('renders a help button with aria-label', () => {
    renderAt('/');
    const btn = screen.getByRole('button', { name: /help/i });
    expect(btn).toBeInTheDocument();
  });

  it('opens a popover with two items when clicked on /decks', () => {
    renderAt('/decks');
    fireEvent.click(screen.getByRole('button', { name: /help/i }));
    expect(screen.getByRole('menuitem', { name: /show app intro/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /show decks tour/i })).toBeInTheDocument();
  });

  it('shows only the app intro item on a route with no page tour', () => {
    // No such route today, but contractually the menu should degrade.
    renderAt('/some-unknown-route');
    fireEvent.click(screen.getByRole('button', { name: /help/i }));
    expect(screen.getByRole('menuitem', { name: /show app intro/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /show .* tour/i })).toBeNull();
  });

  it('clicking "Show app intro" opens the global tour and closes the popover', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /help/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /show app intro/i }));
    expect(useWizardStore.getState().activeTour).toBe('global');
    // popover dismissed
    expect(screen.queryByRole('menuitem', { name: /show app intro/i })).toBeNull();
  });

  it('clicking the per-page item opens that tour with the correct id', () => {
    renderAt('/graph');
    fireEvent.click(screen.getByRole('button', { name: /help/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /show deck graph tour/i }));
    expect(useWizardStore.getState().activeTour).toBe('deck-graph');
  });

  it('Escape closes the popover', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /help/i }));
    expect(screen.getByRole('menuitem', { name: /show app intro/i })).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.queryByRole('menuitem', { name: /show app intro/i })).toBeNull();
  });

  it('outside click closes the popover', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /help/i }));
    expect(screen.getByRole('menuitem', { name: /show app intro/i })).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menuitem', { name: /show app intro/i })).toBeNull();
  });

  it('clicking "Cheatsheet" opens the cheatsheet modal', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /help/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /cheatsheet/i }));
    expect(screen.getByRole('dialog', { name: /cheatsheet/i })).toBeInTheDocument();
  });
});
