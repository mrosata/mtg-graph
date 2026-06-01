import { useEffect } from 'react';
import { Routes, Route, NavLink, Link } from 'react-router-dom';
import WorkspacePage from './pages/WorkspacePage';
import DecksPage from './pages/DecksPage';
import DeckGraphPage from './pages/DeckGraphPage';
import { useGraphStore } from './stores/graphStore';
import { useActiveDeck, useDeckStore } from './stores/deckStore';
import { useLibraryStore } from './stores/libraryStore';
import WizardProvider from './wizard/WizardProvider';
import HelpMenu from './wizard/HelpMenu';
import LibraryStatusBadge from './components/LibraryStatusBadge';
import { TOUR_IDS } from './wizard/selectors';

const ARTIFACT_URL = (() => {
  const set = import.meta.env.VITE_SET_CODE ?? 'standard';
  const base = import.meta.env.VITE_ARTIFACT_BASE_URL ?? '/data';
  return `${base.replace(/\/$/, '')}/cards-${set}.json`;
})();

export default function App() {
  const activeDeck = useActiveDeck();

  useEffect(() => {
    useGraphStore.getState().hydrate(ARTIFACT_URL);
    useDeckStore.getState().load();
    useLibraryStore.getState().hydrate();
  }, []);

  return (
    <WizardProvider>
      <div className="flex h-screen flex-col bg-ink-bg text-vellum">
        <nav className="relative z-40 flex shrink-0 items-center gap-5 bg-ink-bg/85 px-5 py-3 backdrop-blur">
          <BrandMark />
          <span aria-hidden="true" className="h-5 w-px bg-ink-line" />
          <div className="flex items-center gap-1 text-sm">
            <NavLink
              to="/"
              end
              data-tour-id={TOUR_IDS.navBrowse}
              className={({ isActive }) =>
                'group relative px-2 py-1 font-medium tracking-wide transition-colors ' +
                (isActive ? 'text-vellum' : 'text-vellum-dim hover:text-vellum')
              }
            >
              {({ isActive }) => (
                <>
                  <span>Browse</span>
                  <span
                    aria-hidden="true"
                    className={
                      'absolute inset-x-2 -bottom-0.5 h-px origin-left transition-transform duration-200 ' +
                      (isActive
                        ? 'scale-x-100 bg-gradient-to-r from-transparent via-brass to-transparent'
                        : 'scale-x-0 bg-ink-line-2 group-hover:scale-x-50')
                    }
                  />
                </>
              )}
            </NavLink>
            <NavLink
              to="/decks"
              data-tour-id={TOUR_IDS.navDecks}
              className={({ isActive }) =>
                'group relative px-2 py-1 font-medium tracking-wide transition-colors ' +
                (isActive ? 'text-vellum' : 'text-vellum-dim hover:text-vellum')
              }
            >
              {({ isActive }) => (
                <>
                  <span>Decks</span>
                  <span
                    aria-hidden="true"
                    className={
                      'absolute inset-x-2 -bottom-0.5 h-px origin-left transition-transform duration-200 ' +
                      (isActive
                        ? 'scale-x-100 bg-gradient-to-r from-transparent via-brass to-transparent'
                        : 'scale-x-0 bg-ink-line-2 group-hover:scale-x-50')
                    }
                  />
                </>
              )}
            </NavLink>
          </div>
          {activeDeck && (
            <Link
              to="/"
              data-tour-id={TOUR_IDS.navActiveDeck}
              aria-label={`Active deck: ${activeDeck.name}`}
              title="Return to workspace"
              className="group ml-2 flex items-center gap-2 rounded-full border border-ink-line-2 bg-ink-panel/80 px-3 py-1 text-xs transition-colors hover:border-brass/60 hover:bg-ink-raised"
            >
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brass shadow-[0_0_8px_var(--brass)]" />
              <span className="font-head italic text-vellum text-[13px] leading-none transition-colors group-hover:text-brass-hi">
                {activeDeck.name}
              </span>
            </Link>
          )}
          <div className="ml-auto flex items-center gap-3">
            <LibraryStatusBadge />
            <HelpMenu />
          </div>
          <div aria-hidden="true" className="brass-hairline-soft absolute inset-x-0 bottom-0" />
        </nav>
        <div className="min-h-0 flex-1">
          <Routes>
            <Route path="/" element={<WorkspacePage />} />
            <Route path="/decks" element={<DecksPage />} />
            <Route path="/graph" element={<DeckGraphPage />} />
          </Routes>
        </div>
      </div>
    </WizardProvider>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 select-none" aria-label="MTG Graph">
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        aria-hidden="true"
        className="drop-shadow-[0_0_6px_rgba(212,164,74,0.35)]"
      >
        {/* Trefoil seal: three brass nodes joined by inner lines — abstraction
            of a card-interaction graph. Slow background ring evokes mana ritual. */}
        <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(212,164,74,0.32)" strokeWidth="0.6" />
        <line x1="11" y1="4" x2="5.2" y2="14.5" stroke="rgba(212,164,74,0.45)" strokeWidth="0.7" />
        <line x1="11" y1="4" x2="16.8" y2="14.5" stroke="rgba(212,164,74,0.45)" strokeWidth="0.7" />
        <line x1="5.2" y1="14.5" x2="16.8" y2="14.5" stroke="rgba(212,164,74,0.45)" strokeWidth="0.7" />
        <circle cx="11" cy="4" r="1.9" fill="#f0c97a" />
        <circle cx="5.2" cy="14.5" r="1.9" fill="#d4a44a" />
        <circle cx="16.8" cy="14.5" r="1.9" fill="#d4a44a" />
      </svg>
      <span className="font-display text-[15px] font-semibold tracking-[0.22em] text-vellum">
        MTG<span className="text-brass">·</span>GRAPH
      </span>
    </div>
  );
}
