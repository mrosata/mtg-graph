import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ColorPipBar from './ColorPipBar';

describe('ColorPipBar', () => {
  it('renders one segment per non-zero color', () => {
    const { container } = render(
      <ColorPipBar distribution={{ W: 0, U: 4, B: 0, R: 8, G: 0 }} />,
    );
    const segments = container.querySelectorAll('[data-color]');
    expect(segments).toHaveLength(2);
    expect(segments[0]?.getAttribute('data-color')).toBe('U');
    expect(segments[1]?.getAttribute('data-color')).toBe('R');
  });

  it('segment widths are proportional to pip counts', () => {
    const { container } = render(
      <ColorPipBar distribution={{ W: 0, U: 4, B: 0, R: 8, G: 0 }} />,
    );
    const segments = container.querySelectorAll('[data-color]');
    expect((segments[0] as HTMLElement).style.width).toBe('33.33333333333333%');
    expect((segments[1] as HTMLElement).style.width).toBe('66.66666666666666%');
  });

  it('renders a placeholder when all counts are zero', () => {
    render(<ColorPipBar distribution={{ W: 0, U: 0, B: 0, R: 0, G: 0 }} />);
    expect(screen.getByLabelText(/no colored pips/i)).toBeInTheDocument();
  });

  it('exposes a tooltip per segment via title', () => {
    const { container } = render(
      <ColorPipBar distribution={{ W: 0, U: 4, B: 0, R: 8, G: 0 }} />,
    );
    const segments = container.querySelectorAll('[data-color]');
    expect(segments[0]?.getAttribute('title')).toMatch(/Blue.*4/);
    expect(segments[1]?.getAttribute('title')).toMatch(/Red.*8/);
  });
});
