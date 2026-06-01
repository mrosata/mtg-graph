import { TOUR_IDS } from '../../wizard/selectors';

type Props = {
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
};

const BTN_BASE =
  'focus-brass inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink-line-2 bg-ink-raised/80 text-brass-hi shadow-[0_2px_6px_-2px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-colors';
const BTN_ENABLED = 'hover:border-brass/60 hover:bg-ink-raised hover:text-brass';
const BTN_DISABLED = 'opacity-40 cursor-not-allowed';

export default function CanvasNavButtons({ canBack, canForward, onBack, onForward }: Props) {
  return (
    <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Go back"
        title="Back (browser history)"
        disabled={!canBack}
        onClick={onBack}
        data-tour-id={TOUR_IDS.deckGraphNavBack}
        className={`${BTN_BASE} ${canBack ? BTN_ENABLED : BTN_DISABLED}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Go forward"
        title="Forward (browser history)"
        disabled={!canForward}
        onClick={onForward}
        data-tour-id={TOUR_IDS.deckGraphNavForward}
        className={`${BTN_BASE} ${canForward ? BTN_ENABLED : BTN_DISABLED}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
