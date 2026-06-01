import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TagFilterSection from './TagFilterSection';
import type { TagDef } from '@shared/types';

function tag(id: string, label: string, axis: TagDef['axis'] = 'effect'): TagDef {
  return { tagId: id, axis, label, description: '', pairsWith: [] };
}

const interactionTags: TagDef[] = [
  tag('trigger.etb', 'ETB trigger', 'trigger'),
  tag('effect.draw', 'Draw cards', 'effect'),
  tag('effect.deal_damage', 'Deal damage', 'effect'),
  tag('condition.has_creature', 'Has creature', 'condition'),
];

const themeTags: TagDef[] = [
  tag('theme.tokens', 'Tokens matter', 'effect'),
  tag('theme.lifegain', 'Lifegain', 'effect'),
];

describe('TagFilterSection', () => {
  it('renders all tags grouped by axis when groupByAxis is true', () => {
    render(
      <TagFilterSection
        title="Interactions"
        tags={interactionTags}
        groupByAxis
        selected={[]}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByText('Interactions')).toBeInTheDocument();
    expect(screen.getByText(/triggers/i)).toBeInTheDocument();
    expect(screen.getByText(/effects/i)).toBeInTheDocument();
    expect(screen.getByText(/conditions/i)).toBeInTheDocument();
    expect(screen.getByText('ETB trigger')).toBeInTheDocument();
    expect(screen.getByText('Draw cards')).toBeInTheDocument();
    expect(screen.getByText('Deal damage')).toBeInTheDocument();
    expect(screen.getByText('Has creature')).toBeInTheDocument();
  });

  it('filters via search box (case-insensitive, debounced)', async () => {
    vi.useFakeTimers();
    render(
      <TagFilterSection
        title="Interactions"
        tags={interactionTags}
        groupByAxis
        selected={[]}
        onToggle={() => {}}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'damage' } });
    act(() => { vi.advanceTimersByTime(160); });
    expect(screen.queryByText('Draw cards')).not.toBeInTheDocument();
    expect(screen.getByText('Deal damage')).toBeInTheDocument();
    expect(screen.getAllByText(/no matches/i).length).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it('calls onToggle when a row is clicked', () => {
    const onToggle = vi.fn();
    render(
      <TagFilterSection
        title="Interactions"
        tags={interactionTags}
        groupByAxis
        selected={[]}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByLabelText('Draw cards'));
    expect(onToggle).toHaveBeenCalledWith('effect.draw');
  });

  it('renders pinned tags first when pinnedTagIds is provided', () => {
    render(
      <TagFilterSection
        title="Deck themes"
        tags={themeTags}
        pinnedTagIds={['theme.tokens']}
        selected={[]}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByText(/your deck wants/i)).toBeInTheDocument();
    expect(screen.getByText('Tokens matter')).toBeInTheDocument();
    expect(screen.getByText('Lifegain')).toBeInTheDocument();
  });

  it('mutes rows when zeroResultPreview returns true', () => {
    render(
      <TagFilterSection
        title="Deck themes"
        tags={themeTags}
        selected={[]}
        onToggle={() => {}}
        zeroResultPreview={(id) => id === 'theme.lifegain'}
      />,
    );
    const lifegain = screen.getByLabelText('Lifegain').closest('label');
    expect(lifegain).not.toBeNull();
    expect(lifegain!.getAttribute('aria-disabled')).toBe('true');
    const tokens = screen.getByLabelText('Tokens matter').closest('label');
    expect(tokens!.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('shows selected chips above the list', () => {
    render(
      <TagFilterSection
        title="Interactions"
        tags={interactionTags}
        groupByAxis
        selected={['effect.draw']}
        onToggle={() => {}}
      />,
    );
    expect(screen.getAllByText('Draw cards').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: /remove draw cards/i })).toBeInTheDocument();
  });

  describe('mode toggle', () => {
    it('renders AND/OR toggle when 2+ tags are selected and mode/onModeChange are provided', () => {
      render(
        <TagFilterSection
          title="Interactions"
          tags={interactionTags}
          groupByAxis
          selected={['effect.draw', 'effect.deal_damage']}
          onToggle={() => {}}
          mode="and"
          onModeChange={() => {}}
        />,
      );
      expect(screen.getByRole('radio', { name: /^and$/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /^or$/i })).toBeInTheDocument();
    });

    it('does not render the toggle when only 1 tag is selected', () => {
      render(
        <TagFilterSection
          title="Interactions"
          tags={interactionTags}
          groupByAxis
          selected={['effect.draw']}
          onToggle={() => {}}
          mode="and"
          onModeChange={() => {}}
        />,
      );
      expect(screen.queryByRole('radio', { name: /^and$/i })).not.toBeInTheDocument();
    });

    it('does not render the toggle when mode/onModeChange are omitted', () => {
      render(
        <TagFilterSection
          title="Interactions"
          tags={interactionTags}
          groupByAxis
          selected={['effect.draw', 'effect.deal_damage']}
          onToggle={() => {}}
        />,
      );
      expect(screen.queryByRole('radio', { name: /^or$/i })).not.toBeInTheDocument();
    });

    it('marks the active mode with aria-checked', () => {
      render(
        <TagFilterSection
          title="Interactions"
          tags={interactionTags}
          groupByAxis
          selected={['effect.draw', 'effect.deal_damage']}
          onToggle={() => {}}
          mode="or"
          onModeChange={() => {}}
        />,
      );
      expect(screen.getByRole('radio', { name: /^or$/i })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('radio', { name: /^and$/i })).toHaveAttribute('aria-checked', 'false');
    });

    it('calls onModeChange with the clicked mode', () => {
      const onModeChange = vi.fn();
      render(
        <TagFilterSection
          title="Interactions"
          tags={interactionTags}
          groupByAxis
          selected={['effect.draw', 'effect.deal_damage']}
          onToggle={() => {}}
          mode="and"
          onModeChange={onModeChange}
        />,
      );
      fireEvent.click(screen.getByRole('radio', { name: /^or$/i }));
      expect(onModeChange).toHaveBeenCalledWith('or');
    });

    it('does not call onModeChange when the active side is clicked', () => {
      const onModeChange = vi.fn();
      render(
        <TagFilterSection
          title="Interactions"
          tags={interactionTags}
          groupByAxis
          selected={['effect.draw', 'effect.deal_damage']}
          onToggle={() => {}}
          mode="and"
          onModeChange={onModeChange}
        />,
      );
      fireEvent.click(screen.getByRole('radio', { name: /^and$/i }));
      expect(onModeChange).not.toHaveBeenCalled();
    });
  });
});
