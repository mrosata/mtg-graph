import { useState } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { TOUR_IDS } from '../wizard/selectors';
import ImportLibraryModal from './ImportLibraryModal';
import LibraryImportSummary from './LibraryImportSummary';

export default function LibrarySection() {
  const owned = useLibraryStore((s) => s.owned);
  const enabled = useLibraryStore((s) => s.enabled);
  const meta = useLibraryStore((s) => s.meta);
  const setEnabled = useLibraryStore((s) => s.setEnabled);
  const clearLibrary = useLibraryStore((s) => s.clearLibrary);

  const [showImport, setShowImport] = useState(false);
  const [showReport, setShowReport] = useState(false);

  if (!owned) {
    return (
      <section className="mb-4 rounded-lg border border-ink-line bg-ink-raised p-3" data-tour-id={TOUR_IDS.librarySection}>
        <h4 className="eyebrow">Library</h4>
        <p className="mt-1.5 text-xs text-vellum-mute">Import a Manabox CSV backup.</p>
        <button
          type="button"
          className="focus-brass mt-2 rounded-md border border-ink-line bg-ink-panel px-2.5 py-1 text-xs text-vellum transition-colors hover:border-brass/40 hover:text-brass-hi"
          onClick={() => setShowImport(true)}
        >
          Import library
        </button>
        {showImport && <ImportLibraryModal onClose={() => setShowImport(false)} />}
      </section>
    );
  }

  const cardCount = owned.size;
  let copyCount = 0;
  for (const n of owned.values()) copyCount += n;
  const importedDate = meta ? new Date(meta.importedAt).toLocaleDateString() : '';

  return (
    <section className="mb-4 rounded-lg border border-ink-line bg-ink-raised p-3" data-tour-id={TOUR_IDS.librarySection}>
      <h4 className="eyebrow">Library</h4>
      <p className="mt-1.5 font-mono tabular text-xs text-vellum">
        {cardCount.toLocaleString()} cards · {copyCount.toLocaleString()} copies
      </p>
      <p className="text-[11px] text-vellum-dim">Imported {importedDate}</p>
      <label className="mt-2 flex items-center gap-2 text-xs text-vellum-mute">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => void setEnabled(e.target.checked)}
          aria-label="Library only"
          className="h-3.5 w-3.5 accent-[#d4a44a]"
        />
        Library only
      </label>
      <div className="mt-2 flex flex-wrap gap-1">
        <button
          type="button"
          className="focus-brass rounded border border-ink-line px-2 py-0.5 text-[11px] text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi"
          onClick={() => setShowImport(true)}
        >
          Re-import
        </button>
        <button
          type="button"
          className="focus-brass rounded border border-ink-line px-2 py-0.5 text-[11px] text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi"
          onClick={() => setShowReport(true)}
        >
          View report
        </button>
        <button
          type="button"
          className="focus-brass rounded border border-rose-800/50 px-2 py-0.5 text-[11px] text-rose-300 transition-colors hover:bg-rose-900/30"
          onClick={() => {
            if (confirm('Clear your library? You can re-import any time.')) void clearLibrary();
          }}
        >
          Clear
        </button>
      </div>

      {showImport && <ImportLibraryModal onClose={() => setShowImport(false)} />}
      {showReport && meta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowReport(false)}
        >
          <div
            className="w-[36rem] max-w-[92vw] rounded-lg border border-ink-line-2 bg-ink-panel p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="font-head text-lg italic text-vellum">Library import report</h3>
            <div aria-hidden="true" className="brass-hairline-soft mt-2" />
            <div className="mt-3">
              <LibraryImportSummary
                result={{
                  owned, ownedDetail: new Map(),
                  unknownNames: meta.unknownNames, unknownSets: meta.unknownSets,
                  unparseableLines: meta.unparseableLines,
                }}
              />
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="focus-brass rounded border border-ink-line px-3 py-1.5 text-sm text-vellum transition-colors hover:border-brass/40 hover:text-brass-hi"
                onClick={() => setShowReport(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
