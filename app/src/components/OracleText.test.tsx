import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OracleText from './OracleText';

describe('OracleText', () => {
  it('renders plain text unchanged when there are no tokens', () => {
    render(<OracleText text="Draw a card." />);
    expect(screen.getByText('Draw a card.')).toBeInTheDocument();
  });

  it('renders nothing for empty input', () => {
    const { container } = render(<OracleText text="" />);
    expect(container.textContent).toBe('');
  });

  it('replaces {...} tokens with mana symbols and keeps surrounding text', () => {
    render(<OracleText text="{T}: Add {G}. Draw a card." />);
    expect(screen.getByLabelText('tap')).toBeInTheDocument();
    expect(screen.getByLabelText('green')).toBeInTheDocument();
    const root = screen.getByText(/Draw a card\./).parentElement!;
    expect(root.textContent).not.toMatch(/\{[A-Z]\}/);
    expect(root.textContent).toContain(': Add ');
    expect(root.textContent).toContain('. Draw a card.');
  });

  it('renders multi-symbol activated cost like {4}{R}{G}', () => {
    render(<OracleText text="{4}{R}{G}: Do a thing." />);
    expect(screen.getByLabelText('4')).toBeInTheDocument();
    expect(screen.getByLabelText('red')).toBeInTheDocument();
    expect(screen.getByLabelText('green')).toBeInTheDocument();
  });
});
