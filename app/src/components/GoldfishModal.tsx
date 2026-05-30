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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-[1500px] max-w-[95vw] flex-col rounded-lg border border-neutral-700 bg-neutral-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goldfish-title"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 id="goldfish-title" className="text-sm font-semibold text-neutral-200">
            Goldfish — &ldquo;{deck?.name ?? '(no deck)'}&rdquo;
          </h3>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs tabular-nums text-neutral-400">
              Library: {remaining} / {totalLibrary}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-neutral-400 hover:text-neutral-100"
            >
              ×
            </button>
          </div>
        </div>
        <div className="my-4 min-h-0 flex-1 overflow-auto">
          {empty ? (
            <div className="flex h-full items-center justify-center py-8 text-sm text-neutral-400">
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
                        className="h-[336px] w-[240px] rounded-lg border border-neutral-700 shadow-md group-hover:shadow-2xl group-hover:ring-1 group-hover:ring-amber-400/60"
                      />
                    ) : (
                      <div
                        role="img"
                        aria-label={c?.name ?? oracleId}
                        className="flex h-[336px] w-[240px] items-end rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-xs text-neutral-300 shadow-md group-hover:shadow-2xl group-hover:ring-1 group-hover:ring-amber-400/60"
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
        <div className="flex justify-end gap-2 border-t border-neutral-800 pt-3">
          <button
            type="button"
            onClick={onShuffle}
            disabled={empty}
            className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:text-neutral-600"
          >
            ↻ Shuffle
          </button>
          <button
            type="button"
            onClick={onDraw}
            disabled={!canDraw}
            className="rounded bg-amber-500 px-3 py-1 text-xs font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
          >
            + Draw
          </button>
        </div>
      </div>
    </div>
  );
}
