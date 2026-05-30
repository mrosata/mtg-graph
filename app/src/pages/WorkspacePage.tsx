import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BrowserShell from '../components/BrowserShell';
import DeckPanel from '../components/DeckPanel';
import FillManaButton from '../components/FillManaButton';
import GoldfishButton from '../components/GoldfishButton';
import ImportSummary from '../components/ImportSummary';
import Toast from '../components/Toast';
import { useDeckStore } from '../stores/deckStore';
import { isDirty } from '../lib/deckDiff';
import { TOUR_IDS } from '../wizard/selectors';
import type { Filter } from '../lib/filter';

export default function WorkspacePage() {
  const [filter, setFilter] = useState<Filter>({});
  const activeDeckId = useDeckStore((s) => s.activeDeckId);
  const hasActiveDeck = activeDeckId !== null;

  // Boolean dep is intentional: handler reads the live activeDeckId via getState() at fire time.
  useEffect(() => {
    if (!hasActiveDeck) return;
    function onKeyDown(e: KeyboardEvent) {
      const isSave = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && !e.shiftKey && !e.altKey;
      if (!isSave) return;
      const { activeDeckId: id, decks, saveDeck } = useDeckStore.getState();
      if (!id) return;
      e.preventDefault();
      const active = decks.find((d) => d.id === id);
      if (active && isDirty(active)) void saveDeck(id);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hasActiveDeck]);

  if (!hasActiveDeck) {
    return (
      <BrowserShell
        filter={filter}
        onFilterChange={setFilter}
        showHoverPreview
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center justify-end gap-2 border-b border-neutral-800 bg-neutral-950 px-4 py-2"
        data-tour-id={TOUR_IDS.deckActionBar}
      >
        <FillManaButton />
        <GoldfishButton />
        <div className="inline-flex overflow-hidden rounded border border-neutral-700 text-xs">
          <span className="bg-amber-900/40 px-2 py-1 font-semibold text-amber-200">List</span>
          <Link
            to="/graph"
            className="px-2 py-1 text-neutral-300 hover:bg-neutral-900"
            data-tour-id={TOUR_IDS.deckGraphLink}
          >
            Graph
          </Link>
        </div>
      </div>
      <ImportSummary />
      <div className="min-h-0 flex-1">
        <BrowserShell
          filter={filter}
          onFilterChange={setFilter}
          rightRail={({ onCardClick, drawerOpen }) => (
            <DeckPanel onCardClick={onCardClick} drawerOpen={drawerOpen} />
          )}
        />
      </div>
      <Toast />
    </div>
  );
}
