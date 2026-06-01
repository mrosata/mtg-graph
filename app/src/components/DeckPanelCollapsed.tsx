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

// Each type gets a thin colored left rail against ink-raised. The accent
// alludes to the type without burying the brass theme — saturated chips
// against ink, not the loud bg-emerald-700 / bg-amber-700 zoo.
const TYPE_ACCENT: Record<DeckType, string> = {
  Creature: 'border-l-mana-g',
  Planeswalker: 'border-l-axis-condition',
  Instant: 'border-l-mana-u',
  Sorcery: 'border-l-mana-r',
  Artifact: 'border-l-mana-c',
  Enchantment: 'border-l-mana-w',
  Battle: 'border-l-mana-r',
  Land: 'border-l-vellum-dim',
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
        className="focus-brass group flex w-full items-center justify-between gap-1 rounded border border-ink-line bg-ink-raised px-1.5 py-1 text-[10px] font-semibold uppercase tracking-eyebrow text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi"
      >
        <span>Deck</span>
        <svg
          viewBox="0 0 16 16"
          width="10"
          height="10"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3l5 5-5 5" />
        </svg>
      </button>

      {deck && (
        <>
          <div className="font-mono tabular text-sm text-vellum">{total}c</div>

          <div data-stats className="flex w-full flex-col gap-1">
            {TYPE_ORDER.filter((t) => (counts[t] ?? 0) > 0).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onJumpToType(t)}
                aria-label={`Jump to ${TYPE_PLURAL[t].toLowerCase()}`}
                className={`focus-brass flex w-full items-center justify-between rounded-sm border-l-2 bg-ink-raised px-1.5 py-0.5 font-mono tabular text-xs text-vellum transition-colors hover:bg-ink-raised/80 hover:text-brass-hi ${TYPE_ACCENT[t]}`}
                title={`${TYPE_PLURAL[t]}: ${counts[t]}`}
              >
                <span className="font-semibold">{TYPE_LETTER[t]}</span>
                <span data-type-count={t} className="text-vellum-mute">{counts[t]}</span>
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
