// app/src/components/CheatsheetModal.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheatsheetModal, { CHEATSHEET_EXAMPLES } from './CheatsheetModal';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
import { useGraphStore } from '../stores/graphStore';
import { FAMILIES } from '../lib/tagFamilies';
import type { Card, TagDef } from '@shared/types';

function card(id: string, name: string, tags: Card['tags'] = []): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags,
  };
}

function seedStoreWithExamples() {
  // Reading-card tags use IDs that are *distinct* from the pair's tag IDs so
  // section C's text assertions (which look up the pair's tag IDs) don't
  // accidentally also match section B's bullets.
  const readingTags: Card['tags'] = [
    { tagId: 'effect.create_token', axis: 'effect', evidence: '' },
    { tagId: 'trigger.creature_etb', axis: 'trigger', evidence: '' },
    { tagId: 'condition.cares_artifacts', axis: 'condition', evidence: '' },
  ];
  const pairEffectTag: Card['tags'][number] = {
    tagId: CHEATSHEET_EXAMPLES.interactionPair.effectTag, axis: 'effect', evidence: '',
  };
  const pairConsumerTag: Card['tags'][number] = {
    tagId: CHEATSHEET_EXAMPLES.interactionPair.consumerTag, axis: 'trigger', evidence: '',
  };
  const tagDefs: TagDef[] = [
    { tagId: 'effect.create_token', axis: 'effect', label: 'Creates tokens', description: '', pairsWith: [] },
    { tagId: 'trigger.creature_etb', axis: 'trigger', label: 'On creature ETB', description: '', pairsWith: [] },
    { tagId: 'condition.cares_artifacts', axis: 'condition', label: 'Cares about artifacts', description: '', pairsWith: [] },
    { tagId: pairEffectTag.tagId, axis: 'effect', label: 'Pair effect', description: '', pairsWith: [] },
    { tagId: pairConsumerTag.tagId, axis: 'trigger', label: 'Pair consumer', description: '', pairsWith: [] },
  ];
  useGraphStore.setState({
    cards: new Map([
      [CHEATSHEET_EXAMPLES.readingCard, card(CHEATSHEET_EXAMPLES.readingCard, 'ReadingExample', readingTags)],
      [CHEATSHEET_EXAMPLES.interactionPair.effect, card(CHEATSHEET_EXAMPLES.interactionPair.effect, 'EffectExample', [pairEffectTag])],
      [CHEATSHEET_EXAMPLES.interactionPair.consumer, card(CHEATSHEET_EXAMPLES.interactionPair.consumer, 'ConsumerExample', [pairConsumerTag])],
    ]),
    edges: new Map(),
    edgesInbound: new Map(),
    tagCatalog: new Map(tagDefs.map((t) => [t.tagId, t])),
    ruleVersion: 't',
    status: 'ready',
  });
}

function renderModal(onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <CheatsheetModal onClose={onClose} />
    </MemoryRouter>,
  );
}

describe('CheatsheetModal', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    seedStoreWithExamples();
  });

  it('renders all 12 family labels', () => {
    renderModal();
    for (const fam of FAMILIES) {
      expect(screen.getByText(fam.label)).toBeInTheDocument();
    }
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    // Use fireEvent.keyDown on window via document
    const ev = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(ev);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    // The dialog's parent (backdrop) is the element with bg-black/60.
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement!;
    backdrop.click();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders the "Reading a card" section with the example card name and the three prefix bullets', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: /reading a card/i })).toBeInTheDocument();
    expect(screen.getByText('ReadingExample')).toBeInTheDocument();
    // Three bullets keyed by the three axis labels:
    expect(screen.getByText(/things this card does/i)).toBeInTheDocument();
    expect(screen.getByText(/fires? when something happens/i)).toBeInTheDocument();
    expect(screen.getByText(/what this card cares about/i)).toBeInTheDocument();
  });

  it('renders the "What\'s an interaction?" section with both pair card names and the tag labels', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: /what's an interaction/i })).toBeInTheDocument();
    expect(screen.getByText('EffectExample')).toBeInTheDocument();
    expect(screen.getByText('ConsumerExample')).toBeInTheDocument();
    expect(screen.getByText(CHEATSHEET_EXAMPLES.interactionPair.effectTag)).toBeInTheDocument();
    expect(screen.getByText(CHEATSHEET_EXAMPLES.interactionPair.consumerTag)).toBeInTheDocument();
  });

  it('clicking the effect example closes the modal and navigates to /?card=<id>', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.click(screen.getByRole('button', { name: /EffectExample/ }));
    expect(onClose).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(
      `/?card=${encodeURIComponent(CHEATSHEET_EXAMPLES.interactionPair.effect)}`,
    );
  });

  it('clicking the consumer example closes the modal and navigates to /?card=<id>', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.click(screen.getByRole('button', { name: /ConsumerExample/ }));
    expect(onClose).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(
      `/?card=${encodeURIComponent(CHEATSHEET_EXAMPLES.interactionPair.consumer)}`,
    );
  });

  it('renders the placeholder when an example card is missing from the graph', () => {
    // Re-seed without the readingCard.
    useGraphStore.setState({
      cards: new Map([
        [CHEATSHEET_EXAMPLES.interactionPair.effect, card(CHEATSHEET_EXAMPLES.interactionPair.effect, 'EffectExample')],
        [CHEATSHEET_EXAMPLES.interactionPair.consumer, card(CHEATSHEET_EXAMPLES.interactionPair.consumer, 'ConsumerExample')],
      ]),
      edges: new Map(),
      edgesInbound: new Map(),
      tagCatalog: new Map(),
      ruleVersion: 't',
      status: 'ready',
    });
    renderModal();
    expect(screen.getByText(/example card unavailable in this set/i)).toBeInTheDocument();
    // Other sections still render.
    expect(screen.getByText('EffectExample')).toBeInTheDocument();
  });

  it('renders the placeholder when the interaction-pair consumer is missing', () => {
    // Re-seed without the interaction pair consumer card.
    const readingTags: Card['tags'] = [
      { tagId: 'effect.create_token', axis: 'effect', evidence: '' },
      { tagId: 'trigger.creature_etb', axis: 'trigger', evidence: '' },
      { tagId: 'condition.cares_artifacts', axis: 'condition', evidence: '' },
    ];
    useGraphStore.setState({
      cards: new Map([
        [CHEATSHEET_EXAMPLES.readingCard, card(CHEATSHEET_EXAMPLES.readingCard, 'ReadingExample', readingTags)],
        [CHEATSHEET_EXAMPLES.interactionPair.effect, card(CHEATSHEET_EXAMPLES.interactionPair.effect, 'EffectExample')],
        // consumer omitted on purpose
      ]),
      edges: new Map(),
      edgesInbound: new Map(),
      tagCatalog: new Map(),
      ruleVersion: 't',
      status: 'ready',
    });
    renderModal();
    // Section A (families) still renders.
    expect(screen.getByText('Destruction')).toBeInTheDocument();
    // Section B (reading card) still renders.
    expect(screen.getByText('ReadingExample')).toBeInTheDocument();
    // Section C falls back to the placeholder. There are now two placeholder
    // strings on screen (Section B can't render bullets without all axes
    // present? — no, the reading card has all three axes, Section B renders
    // normally. Only Section C falls back, so exactly one placeholder.)
    expect(screen.getByText(/example card unavailable in this set/i)).toBeInTheDocument();
  });

  it('calls onClose when the × close button is clicked', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.click(screen.getByRole('button', { name: /close cheatsheet/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
