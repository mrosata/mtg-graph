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
    <div ref={containerRef} className="relative ml-auto">
      <button
        type="button"
        aria-label="Help"
        aria-haspopup="menu"
        aria-expanded={open}
        data-tour-id={TOUR_IDS.navHelp}
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-700 text-sm text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
      >
        ?
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-50 w-56 overflow-hidden rounded border border-neutral-700 bg-neutral-900 text-sm shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={openCheatsheet}
            className="block w-full px-3 py-2 text-left text-neutral-200 hover:bg-neutral-800"
          >
            Cheatsheet
          </button>
          <hr className="border-neutral-800" />
          <button
            type="button"
            role="menuitem"
            onClick={() => launch('global')}
            className="block w-full px-3 py-2 text-left text-neutral-200 hover:bg-neutral-800"
          >
            Show {tourLabel('global')}
          </button>
          {pageTour && (
            <button
              type="button"
              role="menuitem"
              onClick={() => launch(pageTour)}
              className="block w-full px-3 py-2 text-left text-neutral-200 hover:bg-neutral-800"
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
