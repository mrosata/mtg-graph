import { TOUR_IDS } from '../../wizard/selectors';

type Props = {
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
};

const BTN_BASE =
  'inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/60 text-neutral-200 transition';
const BTN_ENABLED = 'hover:bg-neutral-800/80 hover:text-white';
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
