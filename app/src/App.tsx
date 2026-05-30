import { useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import WorkspacePage from './pages/WorkspacePage';
import DecksPage from './pages/DecksPage';
import DeckGraphPage from './pages/DeckGraphPage';
import { useGraphStore } from './stores/graphStore';
import { useActiveDeck, useDeckStore } from './stores/deckStore';
import WizardProvider from './wizard/WizardProvider';
import HelpMenu from './wizard/HelpMenu';
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
  }, []);

  return (
    <WizardProvider>
      <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
        <nav className="flex shrink-0 items-center gap-4 border-b border-neutral-800 px-4 py-3">
          <NavLink
            to="/"
            end
            data-tour-id={TOUR_IDS.navBrowse}
            className={({ isActive }) => isActive ? 'font-semibold' : ''}
          >
            Browse
          </NavLink>
          <NavLink
            to="/decks"
            data-tour-id={TOUR_IDS.navDecks}
            className={({ isActive }) => isActive ? 'font-semibold' : ''}
          >
            Decks
          </NavLink>
          {activeDeck && (
            <span
              className="text-neutral-400"
              data-tour-id={TOUR_IDS.navActiveDeck}
              aria-label={`Active deck: ${activeDeck.name}`}
            >
              {activeDeck.name}
            </span>
          )}
          <HelpMenu />
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
