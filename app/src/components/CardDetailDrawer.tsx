import { useEffect, useRef, useState } from 'react';
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

const FLIPPABLE: ReadonlySet<string> = new Set(['transform', 'modal_dfc', 'meld']);
const STACKED: ReadonlySet<string> = new Set(['split', 'adventure']);

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
  const [face, setFace] = useState<'front' | 'back'>('front');

  const isFlippable = FLIPPABLE.has(card.layout ?? 'normal') && (card.faces?.length ?? 0) === 2;
  const isStacked = STACKED.has(card.layout ?? 'normal') && (card.faces?.length ?? 0) === 2;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Do not capture keypresses that originate from text-input elements or
      // when a modifier is held (e.g. Cmd+F for browser find).
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape' && canBack) onBack();
      if (e.key === 'f' && isFlippable) setFace((f) => (f === 'front' ? 'back' : 'front'));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onBack, canBack, isFlippable]);

  useEffect(() => {
    setFace('front');
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [card.oracleId]);

  const activeFace = isFlippable ? card.faces![face === 'front' ? 0 : 1]! : null;
  const displayName = activeFace?.name ?? card.name;
  const displayTypeLine = activeFace?.typeLine ?? card.typeLine;
  const displayOracleText = activeFace?.oracleText ?? card.oracleText;
  const displayImage = activeFace?.imageUrl ?? card.imageUrl;

  const visibleTags = isStacked
    ? card.tags
    : isFlippable
    ? card.tags.filter((t) => t.face === face || t.face === undefined)
    : card.tags;

  return (
    <aside ref={scrollRef} className="h-full w-full overflow-y-auto border-l border-ink-line bg-ink-panel p-4 text-vellum">
      {/* nav buttons unchanged */}
      <div className="inline-flex overflow-hidden rounded-md border border-ink-line bg-ink-raised/60">
        <NavButton direction="back" disabled={!canBack} onClick={onBack} ariaLabel="Previous card" />
        <div className="h-8 w-px bg-ink-line" aria-hidden="true" />
        <NavButton direction="forward" disabled={!canForward} onClick={onForward} ariaLabel="Next card" />
      </div>

      <div className="foil-edge mt-3 overflow-hidden rounded-md relative" style={{ transitionDuration: '320ms' }}>
        <img src={displayImage} alt={displayName} className="w-full" />
        {isFlippable && (
          <button
            type="button"
            onClick={() => setFace((f) => (f === 'front' ? 'back' : 'front'))}
            aria-label={face === 'front' ? 'Flip to back face' : 'Flip to front face'}
            title={card.faces![face === 'front' ? 1 : 0]!.name}
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-brass/50 bg-ink-bg/80 text-brass-hi shadow-md backdrop-blur transition-colors hover:bg-brass/20 focus-brass"
          >
            ↻
          </button>
        )}
      </div>

      {isStacked ? (
        <>
          <h2 className="mt-4 font-head text-3xl leading-tight text-vellum">{card.name}</h2>
          <p className="font-head italic text-sm text-vellum-mute">{card.typeLine}</p>
          <div className="brass-hairline-soft mt-3" aria-hidden="true" />
          <div className="mt-3 flex items-center gap-3">
            <AddToDeckButton oracleId={card.oracleId} />
          </div>
          {card.faces!.map((f, i) => (
            <div key={i} className="mt-4 border-t border-ink-line pt-3">
              <h3 className="font-head text-xl text-vellum">{f.name}</h3>
              <p className="font-head italic text-xs text-vellum-mute">{f.typeLine}</p>
              <div className="mt-2 whitespace-pre-wrap"><OracleText text={f.oracleText} /></div>
            </div>
          ))}
        </>
      ) : (
        <>
          <h2 className="mt-4 font-head text-3xl leading-tight text-vellum">{displayName}</h2>
          <p className="font-head italic text-sm text-vellum-mute">{displayTypeLine}</p>
          <div className="brass-hairline-soft mt-3" aria-hidden="true" />
          <div className="mt-3 flex items-center gap-3">
            <AddToDeckButton oracleId={card.oracleId} />
          </div>
          <div className="mt-3 whitespace-pre-wrap">
            <OracleText text={displayOracleText} />
          </div>
        </>
      )}
      <div className="mt-3 flex flex-wrap gap-1">
        {collapseParentChildChips(visibleTags, tagCatalog).map((t, i) => (
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
      className="focus-brass flex h-8 w-9 items-center justify-center text-brass transition-colors hover:bg-brass/10 hover:text-brass-hi disabled:cursor-not-allowed disabled:text-ink-line-2 disabled:hover:bg-transparent"
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
