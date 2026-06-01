// app/src/components/CheatsheetModal.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FAMILIES } from '../lib/tagFamilies';
import { useGraphStore } from '../stores/graphStore';
import ManaCost from './ManaCost';
import type { Card, CardTag } from '@shared/types';

type Props = {
  onClose: () => void;
};

export const CHEATSHEET_EXAMPLES = {
  readingCard: 'c2283655-f6b8-4399-ba1f-68a7107f9485',
  interactionPair: {
    effect: '10d33e95-3e5d-447e-ba4a-acd3c33b4045',
    consumer: 'd70d4686-2c35-4149-aed1-7e3b9e022702',
    effectTag: 'effect.deals_damage',
    consumerTag: 'trigger.damage_dealt',
  },
} as const;

function findTagByAxis(tags: CardTag[], axis: CardTag['axis']): CardTag | undefined {
  return tags.find((t) => t.axis === axis);
}

function MissingExample() {
  return (
    <p className="font-head italic text-vellum-dim">Example card unavailable in this set.</p>
  );
}

function ExampleCardRow({ card }: { card: Card }) {
  return (
    <div className="flex items-center gap-2 rounded border border-ink-line bg-ink-raised px-2.5 py-1.5">
      <ManaCost cost={card.manaCost} />
      <span className="font-head italic text-vellum">{card.name}</span>
    </div>
  );
}

function ReadingCardBlock() {
  const card = useGraphStore((s) => s.cards.get(CHEATSHEET_EXAMPLES.readingCard));
  if (!card) return <MissingExample />;
  const effectTag = findTagByAxis(card.tags, 'effect');
  const triggerTag = findTagByAxis(card.tags, 'trigger');
  const conditionTag = findTagByAxis(card.tags, 'condition');
  return (
    <div className="space-y-3">
      <ExampleCardRow card={card} />
      <ul className="space-y-2 text-vellum-mute">
        {effectTag && (
          <li>
            <code className="rounded bg-brass/15 px-1.5 py-0.5 font-mono text-xs text-brass-hi">{effectTag.tagId}</code>
            {' — Things this card does.'}
          </li>
        )}
        {triggerTag && (
          <li>
            <code className="rounded bg-mana-u/15 px-1.5 py-0.5 font-mono text-xs text-mana-u">{triggerTag.tagId}</code>
            {' — Fires when something happens.'}
          </li>
        )}
        {conditionTag && (
          <li>
            <code className="rounded bg-axis-condition/15 px-1.5 py-0.5 font-mono text-xs" style={{ color: '#c5a3ee' }}>{conditionTag.tagId}</code>
            {' — What this card cares about.'}
          </li>
        )}
      </ul>
    </div>
  );
}

function InteractionPairBlock({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const effectCard = useGraphStore((s) => s.cards.get(CHEATSHEET_EXAMPLES.interactionPair.effect));
  const consumerCard = useGraphStore((s) => s.cards.get(CHEATSHEET_EXAMPLES.interactionPair.consumer));
  if (!effectCard || !consumerCard) return <MissingExample />;

  const open = (oracleId: string) => {
    onClose();
    navigate(`/?card=${encodeURIComponent(oracleId)}`);
  };

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={() => open(effectCard.oracleId)}
        className="focus-brass flex-1 rounded border border-ink-line bg-ink-raised px-2 py-2 text-left transition-colors hover:border-brass/60"
      >
        <ExampleCardRow card={effectCard} />
        <div className="mt-1.5 font-mono text-[11px] text-brass-hi">
          {CHEATSHEET_EXAMPLES.interactionPair.effectTag}
        </div>
      </button>
      <div className="flex flex-col items-center px-1 text-xs text-vellum-dim">
        <span aria-hidden="true" className="text-2xl leading-none text-brass">→</span>
        <span className="mt-1 whitespace-nowrap">
          <span className="text-brass-hi">effect</span>
          {' matches '}
          <span className="text-mana-u">consumer</span>
        </span>
      </div>
      <button
        type="button"
        onClick={() => open(consumerCard.oracleId)}
        className="focus-brass flex-1 rounded border border-ink-line bg-ink-raised px-2 py-2 text-left transition-colors hover:border-brass/60"
      >
        <ExampleCardRow card={consumerCard} />
        <div className="mt-1.5 font-mono text-[11px] text-mana-u">
          {CHEATSHEET_EXAMPLES.interactionPair.consumerTag}
        </div>
      </button>
    </div>
  );
}

export default function CheatsheetModal({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-bg/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-ink-line-2 bg-ink-panel shadow-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cheatsheet-title"
      >
        <div className="brass-hairline" />
        <header className="flex items-center justify-between border-b border-ink-line px-5 py-3">
          <h2 id="cheatsheet-title" className="font-head text-2xl text-vellum">Cheatsheet</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cheatsheet"
            className="focus-brass rounded p-1 text-vellum-dim transition-colors hover:bg-ink-raised hover:text-brass-hi"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-vellum scrollbar-slim">
          <section aria-labelledby="cs-families">
            <p className="eyebrow mb-1">Section A</p>
            <h3 id="cs-families" className="mb-1 font-head text-xl text-vellum">Tag families</h3>
            <p className="mb-3 text-vellum-mute">
              Tags throughout the app are colored by family. Here's what each one means.
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FAMILIES.map((fam) => (
                <li key={fam.id} className="flex items-start gap-2 rounded border border-ink-line bg-ink-raised/40 p-2">
                  <span
                    aria-hidden="true"
                    className="mt-1 inline-block h-3 w-3 shrink-0 rounded-sm"
                    style={{ background: fam.color, boxShadow: `0 0 8px ${fam.color}55` }}
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-vellum">{fam.label}</div>
                    <div className="text-xs text-vellum-dim">{fam.description}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="brass-hairline-soft my-5" />

          <section aria-labelledby="cs-reading">
            <p className="eyebrow mb-1">Section B</p>
            <h3 id="cs-reading" className="mb-1 font-head text-xl text-vellum">Reading a card</h3>
            <p className="mb-3 text-vellum-mute">
              Every card carries one or more tags. The prefix tells you what kind of thing the tag represents.
            </p>
            <ReadingCardBlock />
          </section>

          <div className="brass-hairline-soft my-5" />

          <section aria-labelledby="cs-interaction">
            <p className="eyebrow mb-1">Section C</p>
            <h3 id="cs-interaction" className="mb-1 font-head text-xl text-vellum">What's an interaction?</h3>
            <p className="mb-3 text-vellum-mute">
              Cards interact when one card's effect matches what another card cares about.
              The graph builder links every such pair into an edge.
            </p>
            <InteractionPairBlock onClose={onClose} />
            <p className="mt-3 text-xs text-vellum-dim">
              The same arrow appears under the <em className="not-italic text-vellum-mute">Interactions</em> and{' '}
              <em className="not-italic text-vellum-mute">Deck themes</em> tabs of any card's detail panel — each row reads as{' '}
              <span className="text-brass-hi">source's effect</span> →{' '}
              <span className="text-mana-u">target's trigger or condition</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
