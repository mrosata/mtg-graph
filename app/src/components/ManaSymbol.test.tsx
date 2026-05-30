import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ManaSymbol from './ManaSymbol';

describe('ManaSymbol', () => {
  it('renders {R} as red mana with ms-r class', () => {
    const { container } = render(<ManaSymbol token="{R}" />);
    const el = screen.getByLabelText('red');
    expect(el.className).toMatch(/\bms-r\b/);
    expect(el.className).toMatch(/\bms\b/);
    expect(el.className).toMatch(/\bms-cost\b/);
    expect(container.querySelector('i')).toBe(el);
  });

  it('renders {2} as numeric two', () => {
    render(<ManaSymbol token="{2}" />);
    const el = screen.getByLabelText('2');
    expect(el.className).toMatch(/\bms-2\b/);
  });

  it('renders {X} as ms-x', () => {
    render(<ManaSymbol token="{X}" />);
    const el = screen.getByLabelText('X');
    expect(el.className).toMatch(/\bms-x\b/);
  });

  it('renders {T} as ms-tap labelled tap', () => {
    render(<ManaSymbol token="{T}" />);
    const el = screen.getByLabelText('tap');
    expect(el.className).toMatch(/\bms-tap\b/);
  });

  it('renders {Q} as ms-untap labelled untap', () => {
    render(<ManaSymbol token="{Q}" />);
    const el = screen.getByLabelText('untap');
    expect(el.className).toMatch(/\bms-untap\b/);
  });

  it('renders {W/U} as ms-wu labelled "white or blue"', () => {
    render(<ManaSymbol token="{W/U}" />);
    const el = screen.getByLabelText('white or blue');
    expect(el.className).toMatch(/\bms-wu\b/);
  });

  it('renders {W/P} as ms-wp labelled "Phyrexian white"', () => {
    render(<ManaSymbol token="{W/P}" />);
    const el = screen.getByLabelText('Phyrexian white');
    expect(el.className).toMatch(/\bms-wp\b/);
  });

  it('renders {2/G} as ms-2g', () => {
    render(<ManaSymbol token="{2/G}" />);
    const el = screen.getByLabelText('two or green');
    expect(el.className).toMatch(/\bms-2g\b/);
  });

  it('renders {S} as ms-s labelled snow', () => {
    render(<ManaSymbol token="{S}" />);
    const el = screen.getByLabelText('snow');
    expect(el.className).toMatch(/\bms-s\b/);
  });

  it('falls back to a pill for unknown tokens', () => {
    render(<ManaSymbol token="{ZZZ}" />);
    const el = screen.getByLabelText('ZZZ');
    expect(el.textContent).toBe('ZZZ');
    expect(el.className).not.toMatch(/\bms\b/);
  });
});
