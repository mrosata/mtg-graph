import { useState } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
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
      <section className="mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Library</h4>
        <p className="mt-1 text-xs text-neutral-500">Import a Manabox CSV backup.</p>
        <button
          type="button"
          className="mt-2 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs hover:bg-neutral-700"
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
    <section className="mb-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Library</h4>
      <p className="mt-1 text-xs text-neutral-300">
        {cardCount.toLocaleString()} cards · {copyCount.toLocaleString()} copies
      </p>
      <p className="text-xs text-neutral-500">Imported {importedDate}</p>
      <label className="mt-2 flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => void setEnabled(e.target.checked)}
          aria-label="Library only"
        />
        Library only
      </label>
      <div className="mt-2 flex flex-wrap gap-1">
        <button
          type="button"
          className="rounded border border-neutral-700 px-2 py-0.5 text-xs hover:bg-neutral-800"
          onClick={() => setShowImport(true)}
        >
          Re-import
        </button>
        <button
          type="button"
          className="rounded border border-neutral-700 px-2 py-0.5 text-xs hover:bg-neutral-800"
          onClick={() => setShowReport(true)}
        >
          View report
        </button>
        <button
          type="button"
          className="rounded border border-rose-700/50 px-2 py-0.5 text-xs text-rose-300 hover:bg-rose-900/30"
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
            className="w-[36rem] max-w-[92vw] rounded-lg border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold">Library import report</h3>
            <div className="mt-3">
              <LibraryImportSummary
                result={{
                  owned, unknownNames: meta.unknownNames, unknownSets: meta.unknownSets,
                  unparseableLines: meta.unparseableLines,
                }}
              />
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
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
