import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PillRow from './PillRow';
import { type FamilyId } from '../../lib/tagFamilies';
import type { ColorFilter } from '../../lib/deckGraph';

function baseProps() {
  return {
    mode: 'deck' as const,
    onModeChange: vi.fn(),
    focusedCardName: null as string | null,
    onClearFocus: vi.fn(),
    canEnterFocus: true,
    presentFamilies: new Set<FamilyId>(['destruction', 'lifegain', 'resources']),
    offFamilies: new Set<FamilyId>(),
    onToggleFamily: vi.fn(),
    onResetFamilies: vi.fn(),
    onColors: new Set<ColorFilter>(['B', 'G']),
    onToggleColor: vi.fn(),
    pendingMutationCount: 0,
    onRefresh: vi.fn(),
    familyEdgeCounts: new Map<FamilyId, number>([
      ['destruction', 12], ['lifegain', 4], ['resources', 7],
    ]),
  };
}

describe('PillRow', () => {
  it('renders one family pill for each family present in the graph', () => {
    render(<PillRow {...baseProps()} />);
    expect(screen.getByRole('button', { name: /Destruction/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lifegain/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resources/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tribes/ })).toBeNull();
  });

  it('toggles a family on click', () => {
    const props = baseProps();
    render(<PillRow {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Destruction/ }));
    expect(props.onToggleFamily).toHaveBeenCalledWith('destruction');
  });

  it('renders off-state family pills with aria-pressed=false', () => {
    const props = baseProps();
    props.offFamilies = new Set<FamilyId>(['lifegain']);
    render(<PillRow {...props} />);
    expect(screen.getByRole('button', { name: /Destruction/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Lifegain/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles a color on click', () => {
    const props = baseProps();
    render(<PillRow {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /^White$/ }));
    expect(props.onToggleColor).toHaveBeenCalledWith('W');
  });

  it('renders a colorless toggle and emits "C" on click', () => {
    const props = baseProps();
    render(<PillRow {...props} />);
    const btn = screen.getByRole('button', { name: /^Colorless$/ });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(props.onToggleColor).toHaveBeenCalledWith('C');
  });

  it('shows the Refresh button with a badge when pendingMutationCount > 0', () => {
    const props = baseProps();
    props.pendingMutationCount = 3;
    render(<PillRow {...props} />);
    const btn = screen.getByRole('button', { name: /Refresh suggestions/i });
    expect(btn).not.toBeDisabled();
    expect(btn.textContent).toMatch(/\+3/);
  });

  it('disables Refresh when pendingMutationCount = 0', () => {
    render(<PillRow {...baseProps()} />);
    expect(screen.getByRole('button', { name: /Refresh suggestions/i })).toBeDisabled();
  });

  it('switches mode via the segmented control', () => {
    const props = baseProps();
    render(<PillRow {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Card focus/i }));
    expect(props.onModeChange).toHaveBeenCalledWith('focus');
  });

  it('disables the Card focus segment when canEnterFocus is false', () => {
    const props = baseProps();
    props.canEnterFocus = false;
    render(<PillRow {...props} />);
    const btn = screen.getByRole('button', { name: /Card focus/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(props.onModeChange).not.toHaveBeenCalled();
  });

  it('enables the Card focus segment when canEnterFocus is true even with no focused card', () => {
    const props = baseProps();
    props.canEnterFocus = true;
    props.focusedCardName = null;
    render(<PillRow {...props} />);
    expect(screen.getByRole('button', { name: /Card focus/i })).not.toBeDisabled();
  });

  it('shows the focused card chip and calls onClearFocus when the × is clicked', () => {
    const props = baseProps();
    props.focusedCardName = 'Sheoldred';
    render(<PillRow {...props} />);
    expect(screen.getByText('Sheoldred')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear focused card/i }));
    expect(props.onClearFocus).toHaveBeenCalled();
  });

  it('still renders an off family chip when its edges are no longer present in the filtered graph', () => {
    const props = baseProps();
    // Tribes is off, and the filter has removed all of its edges from the
    // filtered graph — so it isn't in presentFamilies. The chip must still
    // render so the user can toggle it back on.
    props.presentFamilies = new Set<FamilyId>(['destruction']);
    props.offFamilies = new Set<FamilyId>(['tribes']);
    render(<PillRow {...props} />);
    const chip = screen.getByRole('button', { name: /Tribes/ });
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(chip);
    expect(props.onToggleFamily).toHaveBeenCalledWith('tribes');
  });

  it('shows a Reset link only when at least one family is off, and calls onResetFamilies', () => {
    const propsOn = baseProps();
    const { rerender } = render(<PillRow {...propsOn} />);
    expect(screen.queryByRole('button', { name: /^Reset$/ })).toBeNull();

    const propsOff = baseProps();
    propsOff.offFamilies = new Set<FamilyId>(['tribes', 'lifegain']);
    rerender(<PillRow {...propsOff} />);
    const reset = screen.getByRole('button', { name: /^Reset$/ });
    fireEvent.click(reset);
    expect(propsOff.onResetFamilies).toHaveBeenCalled();
  });
});
