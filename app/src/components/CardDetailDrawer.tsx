import { useEffect, useRef } from 'react';
import type { Card } from '@shared/types';
import { useGraphStore } from '../stores/graphStore';
import TagChip from './TagChip';
import InteractionsPanel from './InteractionsPanel';
import AddToDeckButton from './AddToDeckButton';
import OracleText from './OracleText';
import { collapseParentChildChips } from './CardDetailDrawer.chip-collapse';

type Props = {
  card: Card;
  onFocusCard: (oracleId: string) => void;
  onBack: () => void;
  onForward: () => void;
  canBack: boolean;
  canForward: boolean;
};

export default function CardDetailDrawer({
  card,
  onFocusCard,
  onBack,
  onForward,
  canBack,
  canForward,
}: Props) {
  const tagCatalog = useGraphStore((s) => s.tagCatalog);
  const scrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canBack) onBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onBack, canBack]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [card.oracleId]);

  return (
    <aside ref={scrollRef} className="h-full w-full overflow-y-auto border-l border-neutral-800 bg-neutral-950 p-4">
      <div className="inline-flex overflow-hidden rounded-md border border-neutral-800 bg-neutral-900/60">
        <NavButton
          direction="back"
          disabled={!canBack}
          onClick={onBack}
          ariaLabel="Previous card"
        />
        <div className="h-8 w-px bg-neutral-800" aria-hidden="true" />
        <NavButton
          direction="forward"
          disabled={!canForward}
          onClick={onForward}
          ariaLabel="Next card"
        />
      </div>
      <img src={card.imageUrl} alt={card.name} className="mt-3 w-full rounded" />
      <h2 className="mt-3 text-lg font-semibold">{card.name}</h2>
      <p className="text-xs text-neutral-400">{card.typeLine}</p>
      <div className="mt-2 flex items-center gap-3">
        <AddToDeckButton oracleId={card.oracleId} />
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm">
        <OracleText text={card.oracleText} />
      </p>
      <div className="mt-3 flex flex-wrap gap-1">
        {collapseParentChildChips(card.tags, tagCatalog).map((t, i) => (
          <TagChip key={`${t.tagId}-${i}`} tag={t} def={tagCatalog.get(t.tagId)} />
        ))}
      </div>
      <InteractionsPanel oracleId={card.oracleId} onFocusCard={onFocusCard} />
    </aside>
  );
}

type NavButtonProps = {
  direction: 'back' | 'forward';
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
};

function NavButton({ direction, disabled, onClick, ariaLabel }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="flex h-8 w-9 items-center justify-center text-neutral-300 transition hover:bg-neutral-800 hover:text-white focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:text-neutral-600 disabled:hover:bg-transparent"
    >
      {direction === 'back' ? <ChevronLeft /> : <ChevronRight />}
    </button>
  );
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L5 8l5 5" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}
