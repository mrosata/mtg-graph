import { useEffect, useRef, useState } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { useActiveDeck } from '../stores/deckStore';
import { buildShuffled, sortOpeningHand } from '../lib/goldfish';

type Props = { onClose: () => void };

export default function GoldfishModal({ onClose }: Props) {
  const cards = useGraphStore((s) => s.cards);
  const deck = useActiveDeck();
  const handRowRef = useRef<HTMLDivElement>(null);

  const [shuffled, setShuffled] = useState<string[]>(
    () => (deck ? buildShuffled(deck, Math.random) : []),
  );
  const [drawn, setDrawn] = useState<string[]>(() => sortOpeningHand(shuffled.slice(0, 7), cards));
  const [drawIndex, setDrawIndex] = useState<number>(Math.min(7, shuffled.length));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const el = handRowRef.current;
    if (el && typeof el.scrollTo === 'function') {
      el.scrollTo({ left: el.scrollWidth });
    }
  }, [drawn]);

  const onDraw = () => {
    if (drawIndex >= shuffled.length) return;
    const next = shuffled[drawIndex];
    if (next === undefined) return;
    setDrawn([...drawn, next]);
    setDrawIndex(drawIndex + 1);
  };

  const onShuffle = () => {
    if (!deck) return;
    const next = buildShuffled(deck, Math.random);
    setShuffled(next);
    setDrawn(sortOpeningHand(next.slice(0, 7), cards));
    setDrawIndex(Math.min(7, next.length));
  };

  const totalLibrary = shuffled.length;
  const remaining = totalLibrary - drawIndex;
  const empty = totalLibrary === 0;
  const canDraw = drawIndex < totalLibrary;

  return (
    <div
      data-testid="goldfish-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-bg/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-[1500px] max-w-[95vw] flex-col overflow-hidden rounded-lg border border-ink-line-2 bg-ink-panel shadow-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goldfish-title"
      >
        <div className="brass-hairline" />
        <div className="flex items-center justify-between border-b border-ink-line px-5 py-3">
          <div className="flex items-baseline gap-2">
            <span className="eyebrow">Goldfish</span>
            <h3 id="goldfish-title" className="font-head text-xl italic text-vellum">
              {`“${deck?.name ?? '(no deck)'}”`}
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs tabular text-vellum-dim">
              {`Library: ${remaining} / ${totalLibrary}`}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="focus-brass text-vellum-dim transition-colors hover:text-brass-hi"
            >
              ×
            </button>
          </div>
        </div>
        <div className="my-4 min-h-0 flex-1 overflow-auto px-5">
          {empty ? (
            <div className="flex h-full items-center justify-center py-8 font-head italic text-vellum-mute">
              This deck is empty.
            </div>
          ) : (
            <div
              ref={handRowRef}
              className="flex flex-nowrap content-start px-2 pt-6 pb-2"
            >
              {drawn.map((oracleId, i) => {
                const c = cards.get(oracleId);
                return (
                  <div
                    key={`${oracleId}-${i}`}
                    className="group relative flex-none -ml-12 first:ml-0 transition-transform duration-150 ease-out hover:!z-50 hover:-translate-y-3 hover:scale-110"
                    style={{ zIndex: i }}
                  >
                    {c?.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        className="h-[336px] w-[240px] rounded-lg border border-ink-line shadow-md group-hover:shadow-2xl group-hover:ring-1 group-hover:ring-brass/60"
                      />
                    ) : (
                      <div
                        role="img"
                        aria-label={c?.name ?? oracleId}
                        className="flex h-[336px] w-[240px] items-end rounded-lg border border-ink-line bg-ink-raised p-2 font-head text-xs italic text-vellum-mute shadow-md group-hover:shadow-2xl group-hover:ring-1 group-hover:ring-brass/60"
                      >
                        {c?.name ?? oracleId}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-ink-line px-5 py-3">
          <button
            type="button"
            onClick={onShuffle}
            disabled={empty}
            className="focus-brass inline-flex items-center gap-1 rounded border border-ink-line-2 bg-ink-raised px-3 py-1.5 text-xs text-vellum-mute transition-colors hover:border-brass/50 hover:text-brass-hi disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true">↻</span> Shuffle
          </button>
          <button
            type="button"
            onClick={onDraw}
            disabled={!canDraw}
            className="focus-brass inline-flex items-center gap-1 rounded bg-brass px-3 py-1.5 text-xs font-semibold text-ink-bg transition-colors hover:bg-brass-hi disabled:cursor-not-allowed disabled:bg-ink-raised disabled:text-vellum-dim"
          >
            <span aria-hidden="true">+</span> Draw
          </button>
        </div>
      </div>
    </div>
  );
}
