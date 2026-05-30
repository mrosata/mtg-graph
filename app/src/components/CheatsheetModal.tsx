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
    <p className="italic text-neutral-500">Example card unavailable in this set.</p>
  );
}

function ExampleCardRow({ card }: { card: Card }) {
  return (
    <div className="flex items-center gap-2 rounded border border-neutral-800 bg-neutral-950 px-2 py-1">
      <ManaCost cost={card.manaCost} />
      <span className="font-medium">{card.name}</span>
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
      <ul className="space-y-2 text-neutral-300">
        {effectTag && (
          <li>
            <code className="rounded bg-amber-950 px-1 text-amber-200">{effectTag.tagId}</code>
            {' — Things this card does.'}
          </li>
        )}
        {triggerTag && (
          <li>
            <code className="rounded bg-sky-950 px-1 text-sky-200">{triggerTag.tagId}</code>
            {' — Fires when something happens.'}
          </li>
        )}
        {conditionTag && (
          <li>
            <code className="rounded bg-violet-950 px-1 text-violet-200">{conditionTag.tagId}</code>
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
        className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-2 text-left hover:border-amber-700"
      >
        <ExampleCardRow card={effectCard} />
        <div className="mt-1 text-xs text-amber-200">
          {CHEATSHEET_EXAMPLES.interactionPair.effectTag}
        </div>
      </button>
      <div className="flex flex-col items-center px-1 text-xs text-neutral-500">
        <span aria-hidden="true" className="text-2xl leading-none text-neutral-400">→</span>
        <span className="mt-1 whitespace-nowrap">
          <span className="text-amber-200">effect</span>
          {' matches '}
          <span className="text-sky-200">consumer</span>
        </span>
      </div>
      <button
        type="button"
        onClick={() => open(consumerCard.oracleId)}
        className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-2 text-left hover:border-amber-700"
      >
        <ExampleCardRow card={consumerCard} />
        <div className="mt-1 text-xs text-sky-200">
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cheatsheet-title"
      >
        <header className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
          <h2 id="cheatsheet-title" className="text-lg font-semibold">Cheatsheet</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cheatsheet"
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-neutral-200">
          <section aria-labelledby="cs-families">
            <h3 id="cs-families" className="mb-1 text-base font-semibold">Tag families</h3>
            <p className="mb-3 text-neutral-400">
              Tags throughout the app are colored by family. Here's what each one means.
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FAMILIES.map((fam) => (
                <li key={fam.id} className="flex items-start gap-2 rounded border border-neutral-800 p-2">
                  <span
                    aria-hidden="true"
                    className="mt-1 inline-block h-3 w-3 shrink-0 rounded-sm"
                    style={{ background: fam.color }}
                  />
                  <div className="min-w-0">
                    <div className="font-medium">{fam.label}</div>
                    <div className="text-xs text-neutral-400">{fam.description}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <hr className="my-5 border-neutral-800" />

          <section aria-labelledby="cs-reading">
            <h3 id="cs-reading" className="mb-1 text-base font-semibold">Reading a card</h3>
            <p className="mb-3 text-neutral-400">
              Every card carries one or more tags. The prefix tells you what kind of thing the tag represents.
            </p>
            <ReadingCardBlock />
          </section>

          <hr className="my-5 border-neutral-800" />

          <section aria-labelledby="cs-interaction">
            <h3 id="cs-interaction" className="mb-1 text-base font-semibold">What's an interaction?</h3>
            <p className="mb-3 text-neutral-400">
              Cards interact when one card's effect matches what another card cares about.
              The graph builder links every such pair into an edge.
            </p>
            <InteractionPairBlock onClose={onClose} />
            <p className="mt-3 text-xs text-neutral-500">
              The same arrow appears under the <em className="not-italic text-neutral-300">Interactions</em> and{' '}
              <em className="not-italic text-neutral-300">Deck themes</em> tabs of any card's detail panel — each row reads as{' '}
              <span className="text-amber-200">source's effect</span> →{' '}
              <span className="text-sky-200">target's trigger or condition</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
