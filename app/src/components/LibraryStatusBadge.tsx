import { useLibraryStore } from '../stores/libraryStore';
import { TOUR_IDS } from '../wizard/selectors';

export default function LibraryStatusBadge() {
  const owned = useLibraryStore((s) => s.owned);
  const enabled = useLibraryStore((s) => s.enabled);

  if (!owned) {
    return (
      <span
        className="eyebrow text-vellum-dim/70"
        aria-label="No library loaded"
        data-tour-id={TOUR_IDS.libraryStatusBadge}
      >
        no library
      </span>
    );
  }
  return (
    <span
      aria-label={enabled ? 'Library active' : 'Library loaded but inactive'}
      data-tour-id={TOUR_IDS.libraryStatusBadge}
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ' +
        (enabled
          ? 'border-brass/40 bg-brass/10 text-brass-hi'
          : 'border-ink-line-2 bg-ink-panel/60 text-vellum-dim')
      }
    >
      <span
        aria-hidden="true"
        className={
          'h-1.5 w-1.5 rounded-full ' +
          (enabled ? 'bg-brass shadow-[0_0_6px_var(--brass)]' : 'bg-vellum-dim/50')
        }
      />
      <span className="font-mono tabular text-[11px] leading-none">
        {owned.size.toLocaleString()}
      </span>
      <span className="leading-none">cards owned</span>
    </span>
  );
}
