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
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-neutral-800 bg-neutral-950 px-4 py-2 text-xs" data-tour-id={TOUR_IDS.pillRow}>
      <div className="flex items-center gap-2">
        <span className="uppercase tracking-wide text-neutral-500">Mode</span>
        <div className="inline-flex overflow-hidden rounded border border-neutral-700">
          <button
            type="button"
            onClick={() => props.onModeChange('deck')}
            title="Show every card in the deck and the interactions between them"
            className={`px-2 py-1 ${props.mode === 'deck' ? 'bg-amber-900/40 text-amber-200' : 'text-neutral-300 hover:bg-neutral-900'}`}
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
            className={`px-2 py-1 ${props.mode === 'focus' ? 'bg-amber-900/40 text-amber-200' : 'text-neutral-300 hover:bg-neutral-900'} disabled:cursor-not-allowed disabled:text-neutral-600 disabled:hover:bg-transparent`}
          >
            Card focus
          </button>
        </div>
        {props.focusedCardName && (
          <span className="ml-1 inline-flex items-center gap-1 rounded border border-amber-700 bg-amber-950/50 px-2 py-0.5 text-amber-200">
            {props.focusedCardName}
            <button
              type="button"
              aria-label="Clear focused card"
              onClick={props.onClearFocus}
              className="ml-1 text-amber-300 hover:text-amber-100"
            >
              ×
            </button>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="uppercase tracking-wide text-neutral-500">Families</span>
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
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${
                isOff
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-600 line-through'
                  : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-500'
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: f.color, opacity: isOff ? 0.3 : 1 }}
              />
              {f.label}
              {count !== undefined && !isOff && (
                <span className="text-[10px] text-neutral-500">·{count}</span>
              )}
            </button>
          );
        })}
        {props.offFamilies.size > 0 && (
          <button
            type="button"
            onClick={props.onResetFamilies}
            className="ml-1 text-amber-400 hover:text-amber-200 hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        <span className="uppercase tracking-wide text-neutral-500">Colors</span>
        {COLORS.map((c) => {
          const on = props.onColors.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              aria-pressed={on}
              onClick={() => props.onToggleColor(c.id)}
              className={`flex h-6 w-6 items-center justify-center rounded-full ${on ? '' : 'opacity-30'}`}
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
        className="ml-auto inline-flex items-center gap-1.5 rounded border border-amber-600 bg-amber-500 px-3 py-1 font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500"
        aria-label="Refresh suggestions"
      >
        Refresh suggestions
        {props.pendingMutationCount > 0 && (
          <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px]">+{props.pendingMutationCount}</span>
        )}
      </button>
    </div>
  );
}
