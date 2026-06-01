import { FAMILIES, type FamilyId } from '../../lib/tagFamilies';
import type { ColorFilter } from '../../lib/deckGraph';
import ManaSymbol from '../ManaSymbol';
import { TOUR_IDS } from '../../wizard/selectors';

const COLORS: { id: ColorFilter; label: string }[] = [
  { id: 'W', label: 'White' },
  { id: 'U', label: 'Blue' },
  { id: 'B', label: 'Black' },
  { id: 'R', label: 'Red' },
  { id: 'G', label: 'Green' },
  { id: 'C', label: 'Colorless' },
];

type Mode = 'deck' | 'focus';

type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  focusedCardName: string | null;
  onClearFocus: () => void;
  canEnterFocus: boolean;
  presentFamilies: Set<FamilyId>;
  offFamilies: Set<FamilyId>;
  onToggleFamily: (id: FamilyId) => void;
  onResetFamilies: () => void;
  onColors: Set<ColorFilter>;
  onToggleColor: (c: ColorFilter) => void;
  pendingMutationCount: number;
  onRefresh: () => void;
  familyEdgeCounts: Map<FamilyId, number>;
};

export default function PillRow(props: Props) {
  return (
    <div
      className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-ink-line bg-ink-panel/95 px-4 py-2 text-xs backdrop-blur-sm"
      data-tour-id={TOUR_IDS.pillRow}
    >
      <div className="flex items-center gap-2">
        <span className="eyebrow">Mode</span>
        <div className="inline-flex overflow-hidden rounded-full border border-ink-line-2 bg-ink-raised p-0.5">
          <button
            type="button"
            onClick={() => props.onModeChange('deck')}
            title="Show every card in the deck and the interactions between them"
            className={`focus-brass rounded-full px-3 py-0.5 transition-colors ${
              props.mode === 'deck'
                ? 'bg-brass text-ink-bg shadow-[0_0_8px_rgba(212,164,74,0.35)]'
                : 'text-vellum-mute hover:text-brass-hi'
            }`}
          >
            Deck
          </button>
          <button
            type="button"
            onClick={() => props.onModeChange('focus')}
            disabled={!props.canEnterFocus}
            title={
              props.canEnterFocus
                ? 'Pick a card to highlight only its neighborhood of interactions'
                : 'Click a card (or double-click in the graph) to focus on it'
            }
            className={`focus-brass rounded-full px-3 py-0.5 transition-colors ${
              props.mode === 'focus'
                ? 'bg-brass text-ink-bg shadow-[0_0_8px_rgba(212,164,74,0.35)]'
                : 'text-vellum-mute hover:text-brass-hi'
            } disabled:cursor-not-allowed disabled:text-vellum-dim disabled:hover:text-vellum-dim`}
          >
            Card focus
          </button>
        </div>
        {props.focusedCardName && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-brass/40 bg-brass/15 px-2 py-0.5 font-head italic text-brass-hi">
            {props.focusedCardName}
            <button
              type="button"
              aria-label="Clear focused card"
              onClick={props.onClearFocus}
              className="focus-brass ml-1 not-italic text-brass-hi transition-colors hover:text-vellum"
            >
              ×
            </button>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="eyebrow">Families</span>
        {FAMILIES.filter(
          (f) => props.presentFamilies.has(f.id) || props.offFamilies.has(f.id),
        ).map((f) => {
          const isOff = props.offFamilies.has(f.id);
          const count = props.familyEdgeCounts.get(f.id);
          return (
            <button
              type="button"
              key={f.id}
              aria-pressed={!isOff}
              onClick={() => props.onToggleFamily(f.id)}
              title={`${f.label} — ${f.description}${isOff ? ' (click to show)' : ' (click to hide)'}`}
              className={`focus-brass inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 transition-colors ${
                isOff
                  ? 'border-ink-line bg-ink-bg text-vellum-dim line-through'
                  : 'border-brass/40 bg-brass/10 text-brass-hi hover:border-brass/70'
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: f.color,
                  opacity: isOff ? 0.3 : 1,
                  boxShadow: isOff ? 'none' : `0 0 6px ${f.color}88`,
                }}
              />
              {f.label}
              {count !== undefined && !isOff && (
                <span className="font-mono text-[10px] tabular text-vellum-dim">{`·${count}`}</span>
              )}
            </button>
          );
        })}
        {props.offFamilies.size > 0 && (
          <button
            type="button"
            onClick={props.onResetFamilies}
            className="focus-brass ml-1 text-brass transition-colors hover:text-brass-hi hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        <span className="eyebrow">Colors</span>
        {COLORS.map((c) => {
          const on = props.onColors.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              aria-pressed={on}
              onClick={() => props.onToggleColor(c.id)}
              className={`focus-brass flex h-6 w-6 items-center justify-center rounded-full transition-opacity ${on ? '' : 'opacity-30 grayscale'} hover:opacity-100`}
            >
              <ManaSymbol token={c.id.toLowerCase()} />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={props.onRefresh}
        disabled={props.pendingMutationCount === 0}
        className="focus-brass ml-auto inline-flex items-center gap-1.5 rounded-full bg-brass px-3.5 py-1 font-semibold text-ink-bg transition-colors hover:bg-brass-hi disabled:cursor-not-allowed disabled:bg-ink-raised disabled:text-vellum-dim"
        aria-label="Refresh suggestions"
      >
        Refresh suggestions
        {props.pendingMutationCount > 0 && (
          <span className="rounded-full bg-ink-bg/30 px-1.5 py-0.5 font-mono text-[10px] tabular text-brass-hi">
            {`+${props.pendingMutationCount}`}
          </span>
        )}
      </button>
    </div>
  );
}
