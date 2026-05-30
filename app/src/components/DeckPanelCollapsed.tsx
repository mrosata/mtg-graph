import { useGraphStore } from '../stores/graphStore';
import { useActiveDeck } from '../stores/deckStore';
import {
  typeCounts,
  manaCurveBuckets,
  colorPipDistribution,
  TYPE_ORDER,
  TYPE_PLURAL,
  type DeckType,
} from '../lib/deckStats';
import MiniManaCurve from './MiniManaCurve';
import ColorPipBar from './ColorPipBar';

type Props = {
  onExpand: () => void;
  onJumpToType: (type: DeckType) => void;
};

const TYPE_LETTER: Record<DeckType, string> = {
  Creature: 'C',
  Planeswalker: 'P',
  Instant: 'I',
  Sorcery: 'S',
  Artifact: 'A',
  Enchantment: 'E',
  Battle: 'B',
  Land: 'L',
};

const TYPE_BG: Record<DeckType, string> = {
  Creature: 'bg-emerald-700',
  Planeswalker: 'bg-purple-700',
  Instant: 'bg-sky-700',
  Sorcery: 'bg-rose-700',
  Artifact: 'bg-stone-600',
  Enchantment: 'bg-amber-700',
  Battle: 'bg-orange-700',
  Land: 'bg-neutral-700',
};

export default function DeckPanelCollapsed({ onExpand, onJumpToType }: Props) {
  const cards = useGraphStore((s) => s.cards);
  const deck = useActiveDeck();

  const total = deck?.workingCards.reduce((s, c) => s + c.count, 0) ?? 0;
  const counts = deck ? typeCounts(deck, cards) : {};
  const curve = deck ? manaCurveBuckets(deck, cards) : new Array(8).fill(0);
  const colors = deck
    ? colorPipDistribution(deck, cards)
    : { W: 0, U: 0, B: 0, R: 0, G: 0 };

  return (
    <div className="flex h-full flex-col items-center gap-3 p-2">
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand deck panel"
        title="Expand deck panel"
        className="group flex w-full items-center justify-between gap-1 rounded border border-neutral-800 bg-neutral-900/60 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-300 transition hover:border-amber-500/40 hover:bg-neutral-800 hover:text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
      >
        <span>Deck</span>
        <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3l5 5-5 5" />
        </svg>
      </button>

      {deck && (
        <>
          <div className="font-mono text-sm text-neutral-100">{total}c</div>

          <div data-stats className="flex w-full flex-col gap-1">
            {TYPE_ORDER.filter((t) => (counts[t] ?? 0) > 0).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onJumpToType(t)}
                aria-label={`Jump to ${TYPE_PLURAL[t].toLowerCase()}`}
                className={`flex w-full items-center justify-between rounded-sm px-1.5 py-0.5 text-xs font-mono text-neutral-100 hover:brightness-110 ${TYPE_BG[t]}`}
                title={`${TYPE_PLURAL[t]}: ${counts[t]}`}
              >
                <span>{TYPE_LETTER[t]}</span>
                <span data-type-count={t}>{counts[t]}</span>
              </button>
            ))}
          </div>

          <div className="w-full">
            <MiniManaCurve countsByCmc={curve} />
          </div>

          <div className="w-full">
            <ColorPipBar distribution={colors} />
          </div>
        </>
      )}
    </div>
  );
}
