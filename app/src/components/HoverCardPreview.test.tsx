import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HoverCardPreview from './HoverCardPreview';

type MqlListener = (e: MediaQueryListEvent) => void;

function installMatchMedia(matchesFor: (q: string) => boolean) {
  const listeners = new Map<string, Set<MqlListener>>();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matchesFor(query),
    media: query,
    onchange: null,
    addEventListener: (_: 'change', cb: MqlListener) => {
      const set = listeners.get(query) ?? new Set();
      set.add(cb);
      listeners.set(query, set);
    },
    removeEventListener: (_: 'change', cb: MqlListener) => {
      listeners.get(query)?.delete(cb);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('HoverCardPreview', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    installMatchMedia(() => true);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renders an anchored preview at the given right offset and width', () => {
    render(<HoverCardPreview mode="anchored" url="/x.png" width={440} anchorRight={16} />);
    const img = screen.getByTestId('hover-card-preview') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/x.png');
    expect(img.style.right).toBe('16px');
    expect(img.style.width).toBe('440px');
  });

  it('renders nothing when viewport is below hideBelowPx', () => {
    installMatchMedia(() => false);
    render(
      <HoverCardPreview mode="anchored" url="/x.png" width={440} anchorRight={440} hideBelowPx={1140} />,
    );
    expect(screen.queryByTestId('hover-card-preview')).not.toBeInTheDocument();
  });

  it('renders cursor preview clamped to the viewport', () => {
    render(<HoverCardPreview mode="cursor" url="/y.png" x={500} y={400} width={240} />);
    const img = screen.getByTestId('hover-card-preview') as HTMLImageElement;
    expect(img.style.width).toBe('240px');
    // x=500 - (240+20) = 240
    expect(img.style.left).toBe('240px');
    // y=400 - 100 = 300, clamped to min 8 if needed
    expect(parseInt(img.style.top, 10)).toBeGreaterThanOrEqual(8);
  });

  it('clamps cursor preview left to 8 when x is too small', () => {
    render(<HoverCardPreview mode="cursor" url="/z.png" x={10} y={400} width={240} />);
    const img = screen.getByTestId('hover-card-preview') as HTMLImageElement;
    expect(img.style.left).toBe('8px');
  });
});
