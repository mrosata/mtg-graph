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
  const [filter, setFilter] = useState<Filter>({ scope: 'standard' });
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
        className="flex items-center justify-end gap-2 border-b border-ink-line bg-ink-bg/70 px-4 py-2"
        data-tour-id={TOUR_IDS.deckActionBar}
      >
        <FillManaButton />
        <GoldfishButton />
        <div className="ml-1 inline-flex overflow-hidden rounded-full border border-ink-line-2 bg-ink-panel/80 p-0.5 text-[11px]">
          <span className="rounded-full bg-brass/15 px-2.5 py-1 font-semibold uppercase tracking-caps text-brass-hi shadow-[inset_0_0_0_1px_rgba(212,164,74,0.45)]">
            List
          </span>
          <Link
            to="/graph"
            className="rounded-full px-2.5 py-1 font-semibold uppercase tracking-caps text-vellum-mute transition-colors hover:bg-ink-raised hover:text-vellum"
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
          showHoverPreview
          rightRail={({ onCardClick, drawerOpen }) => (
            <DeckPanel onCardClick={onCardClick} drawerOpen={drawerOpen} />
          )}
        />
      </div>
      <Toast />
    </div>
  );
}
