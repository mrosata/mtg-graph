import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWizardStore } from './wizardStore';
import { TOUR_IDS, tourForPathname, tourLabel, type TourId } from './selectors';
import CheatsheetModal from '../components/CheatsheetModal';

export default function HelpMenu() {
  const [open, setOpen] = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathname = useLocation().pathname;
  const pageTour: TourId | null = tourForPathname(pathname);
  const openTour = useWizardStore((s) => s.openTour);

  // Close popover on Esc.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Close popover on outside click.
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const launch = useCallback(
    (id: TourId) => {
      openTour(id, { reset: true });
      setOpen(false);
    },
    [openTour],
  );

  const openCheatsheet = useCallback(() => {
    setCheatsheetOpen(true);
    setOpen(false);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Help"
        aria-haspopup="menu"
        aria-expanded={open}
        data-tour-id={TOUR_IDS.navHelp}
        onClick={() => setOpen((o) => !o)}
        className={
          'flex h-7 w-7 items-center justify-center rounded-full border text-[13px] transition-colors ' +
          (open
            ? 'border-brass bg-brass/15 text-brass-hi'
            : 'border-ink-line-2 bg-ink-panel/60 text-vellum-mute hover:border-brass/60 hover:text-brass-hi')
        }
      >
        ?
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-50 w-56 overflow-hidden rounded-md border border-ink-line-2 bg-ink-panel shadow-panel"
        >
          <div aria-hidden="true" className="brass-hairline" />
          <button
            type="button"
            role="menuitem"
            onClick={openCheatsheet}
            className="block w-full px-3 py-2 text-left text-sm text-vellum transition-colors hover:bg-ink-raised hover:text-brass-hi"
          >
            Cheatsheet
          </button>
          <hr className="border-ink-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => launch('global')}
            className="block w-full px-3 py-2 text-left text-sm text-vellum transition-colors hover:bg-ink-raised hover:text-brass-hi"
          >
            Show {tourLabel('global')}
          </button>
          {pageTour && (
            <button
              type="button"
              role="menuitem"
              onClick={() => launch(pageTour)}
              className="block w-full px-3 py-2 text-left text-sm text-vellum transition-colors hover:bg-ink-raised hover:text-brass-hi"
            >
              Show {tourLabel(pageTour)}
            </button>
          )}
        </div>
      )}
      {cheatsheetOpen && <CheatsheetModal onClose={() => setCheatsheetOpen(false)} />}
    </div>
  );
}
