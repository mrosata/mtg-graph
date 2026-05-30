// app/src/components/InteractionsPanel.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InteractionsPanel from './InteractionsPanel';
import { useGraphStore } from '../stores/graphStore';
import type { Card, InteractionEdge, TagDef } from '@shared/types';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function card(
  id: string,
  name: string,
  colors: any[] = [],
  opts: { cmc?: number; rarity?: 'common' | 'uncommon' | 'rare' | 'mythic' } = {},
): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: opts.cmc ?? 0, colors, colorIdentity: colors,
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: opts.rarity ?? 'common', imageUrl: '', tags: [],
  };
}

const edge: InteractionEdge = {
  source: 'A', target: 'B',
  reason: { sourceTagId: 'effect.create_token', targetTagId: 'trigger.creature_etb', direction: 'source_produces_for_target' },
};
const edge2: InteractionEdge = {
  source: 'A', target: 'C',
  reason: { sourceTagId: 'effect.life_changed', targetTagId: 'trigger.life_changed', direction: 'source_produces_for_target' },
};
const themeEdge: InteractionEdge = {
  source: 'A', target: 'D',
  reason: { sourceTagId: 'effect.tutors_subtype.shrine', targetTagId: 'condition.cares_subtype.shrine', direction: 'source_produces_for_target' },
};
const tagDefs: TagDef[] = [
  { tagId: 'effect.create_token', axis: 'effect', label: 'Creates tokens', description: '', pairsWith: [] },
  { tagId: 'trigger.creature_etb', axis: 'trigger', label: 'Triggers on ETB', description: '', pairsWith: [] },
  { tagId: 'effect.life_changed', axis: 'effect', label: 'Changes life total', description: '', pairsWith: [] },
  { tagId: 'trigger.life_changed', axis: 'trigger', label: 'Triggers on life change', description: '', pairsWith: [] },
  { tagId: 'effect.tutors_subtype.shrine', axis: 'effect', label: 'Tutors a Shrine', description: '', pairsWith: [], category: 'theme' },
  { tagId: 'condition.cares_subtype.shrine', axis: 'condition', label: 'Cares about Shrines', description: '', pairsWith: [], category: 'theme' },
];

function renderPanel(props: {
  oracleId?: string;
  onFocusCard?: (id: string) => void;
  initialEntries?: string[];
} = {}) {
  return render(
    <MemoryRouter initialEntries={props.initialEntries ?? ['/']}>
      <InteractionsPanel oracleId={props.oracleId ?? 'A'} onFocusCard={props.onFocusCard ?? (() => {})} />
    </MemoryRouter>,
  );
}

describe('InteractionsPanel', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    useGraphStore.setState({
      cards: new Map([
        ['A', card('A', 'AlphaCard')],
        ['B', card('B', 'BetaCard', ['R'], { cmc: 2, rarity: 'rare' })],
        ['C', card('C', 'GammaCard', ['W'], { cmc: 5, rarity: 'common' })],
        ['D', card('D', 'DeltaShrine')],
      ]),
      edges: new Map([['A', [edge, edge2, themeEdge]]]),
      edgesInbound: new Map([
        ['B', [edge]],
        ['C', [edge2]],
        ['D', [themeEdge]],
      ]),
      tagCatalog: new Map(tagDefs.map((t) => [t.tagId, t])),
      ruleVersion: 't', status: 'ready',
    });
  });

  it('renders interaction neighbors on the Interactions tab', () => {
    renderPanel();
    expect(screen.getByText('BetaCard')).toBeInTheDocument();
    expect(screen.getByText('GammaCard')).toBeInTheDocument();
    // Themes are on the other tab — not visible by default.
    expect(screen.queryByText('DeltaShrine')).not.toBeInTheDocument();
  });

  it('calls onFocusCard when a neighbor row is clicked', () => {
    const onFocus = vi.fn();
    renderPanel({ onFocusCard: onFocus });
    fireEvent.click(screen.getByRole('button', { name: /BetaCard/ }));
    expect(onFocus).toHaveBeenCalledWith('B');
  });

  it('shows interaction-type chips with counts', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /Show all cards tagged Triggers on ETB/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show all cards tagged Triggers on life change/ })).toBeInTheDocument();
  });

  it('navigates with the tag filter while staying on the current pathname (/)', () => {
    renderPanel({ oracleId: 'A' });
    fireEvent.click(screen.getByRole('button', { name: /Show all cards tagged Triggers on ETB/ }));
    expect(navigateMock).toHaveBeenCalledTimes(1);
    const target = navigateMock.mock.calls[0]?.[0] as string;
    expect(target).toMatch(/^\/\?/);
    expect(target).toContain('tag=trigger.creature_etb');
    expect(target).toContain('card=A');
  });

  it('preserves the current pathname (/graph) when a tag chip is clicked', () => {
    renderPanel({ oracleId: 'A', initialEntries: ['/graph'] });
    fireEvent.click(screen.getByRole('button', { name: /Show all cards tagged Triggers on ETB/ }));
    expect(navigateMock).toHaveBeenCalledTimes(1);
    const target = navigateMock.mock.calls[0]?.[0] as string;
    expect(target).toMatch(/^\/graph\?/);
    expect(target).toContain('tag=trigger.creature_etb');
    expect(target).toContain('card=A');
  });

  it('switches to the Deck themes tab and shows theme neighbors', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /^Deck themes/ }));
    expect(screen.getByText('DeltaShrine')).toBeInTheDocument();
    // Interactions list is no longer rendered.
    expect(screen.queryByText('BetaCard')).not.toBeInTheDocument();
  });

  it('filters neighbors by rarity', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'rare' }));
    // Only BetaCard (rare) remains; GammaCard (common) is filtered out.
    expect(screen.getByText('BetaCard')).toBeInTheDocument();
    expect(screen.queryByText('GammaCard')).not.toBeInTheDocument();
  });

  it('filters neighbors by CMC min', () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText('CMC min'), { target: { value: '3' } });
    // GammaCard (cmc 5) remains; BetaCard (cmc 2) is filtered out.
    expect(screen.getByText('GammaCard')).toBeInTheDocument();
    expect(screen.queryByText('BetaCard')).not.toBeInTheDocument();
  });
});
