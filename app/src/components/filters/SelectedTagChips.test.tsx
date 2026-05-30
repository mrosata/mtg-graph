import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SelectedTagChips from './SelectedTagChips';
import type { TagDef } from '@shared/types';

const catalog = new Map<string, TagDef>([
  ['effect.create_token', {
    tagId: 'effect.create_token', axis: 'effect', label: 'Create token',
    description: '', pairsWith: [],
  }],
  ['effect.deals_damage', {
    tagId: 'effect.deals_damage', axis: 'effect', label: 'Deals damage',
    description: '', pairsWith: [],
  }],
]);

describe('SelectedTagChips', () => {
  it('renders nothing when no tags are selected', () => {
    const { container } = render(
      <SelectedTagChips selected={[]} catalog={catalog} onRemove={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a chip per selected tag with the catalog label', () => {
    render(
      <SelectedTagChips
        selected={['effect.create_token', 'effect.deals_damage']}
        catalog={catalog}
        onRemove={() => {}}
      />,
    );
    expect(screen.getByText('Create token')).toBeInTheDocument();
    expect(screen.getByText('Deals damage')).toBeInTheDocument();
  });

  it('falls back to the tag id when the catalog has no entry', () => {
    render(
      <SelectedTagChips
        selected={['unknown.tag']}
        catalog={catalog}
        onRemove={() => {}}
      />,
    );
    expect(screen.getByText('unknown.tag')).toBeInTheDocument();
  });

  it('calls onRemove with the tag id when × is clicked', () => {
    const onRemove = vi.fn();
    render(
      <SelectedTagChips
        selected={['effect.create_token']}
        catalog={catalog}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /remove create token/i }));
    expect(onRemove).toHaveBeenCalledWith('effect.create_token');
  });
});
