import { useState } from 'react';
import { STANDARD_SET_CODES } from '@shared/sets';
import { useGraphStore } from '../stores/graphStore';
import { useLibraryStore } from '../stores/libraryStore';
import { parseManaboxCsv, resolveLibrary, type LibraryImportResult } from '../lib/libraryImport';
import LibraryImportSummary from './LibraryImportSummary';

type Props = { onClose: () => void };

const KNOWN_SET_CODES = new Set(STANDARD_SET_CODES.map((c) => c.toLowerCase()));

export default function ImportLibraryModal({ onClose }: Props) {
  const cards = useGraphStore((s) => s.cards);
  const importLibrary = useLibraryStore((s) => s.importLibrary);

  const [result, setResult] = useState<LibraryImportResult | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const readFileText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Couldn't read file."));
      reader.readAsText(file);
    });

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setFilename(file.name);
    try {
      const text = await readFileText(file);
      const parsed = parseManaboxCsv(text);
      const r = resolveLibrary(parsed, cards, KNOWN_SET_CODES);
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleUse = async () => {
    if (!result || result.owned.size === 0) return;
    setBusy(true);
    await importLibrary(result, filename);
    setBusy(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-bg/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[40rem] max-w-[92vw] overflow-hidden rounded-lg border border-ink-line-2 bg-ink-panel shadow-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-library-title"
      >
        <div className="brass-hairline" />
        <div className="p-6">
          <h3 id="import-library-title" className="font-head text-2xl text-vellum">
            Import library
          </h3>
          <p className="mt-1 text-xs text-vellum-dim">
            Pick a Manabox CSV backup. We'll only show cards that are in both your library and our graph.
          </p>

          <label className="focus-brass mt-4 inline-flex cursor-pointer items-center rounded border border-ink-line-2 bg-ink-raised px-3 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi">
            Choose Manabox CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
              aria-label="Choose Manabox CSV"
            />
          </label>
          {filename && (
            <span className="ml-2 font-mono text-xs text-vellum-dim">{filename}</span>
          )}

          {error && (
            <p className="mt-3 rounded border border-mana-r/40 bg-mana-r/10 px-3 py-2 text-xs text-mana-r">
              {error}
            </p>
          )}

          {result && (
            <div className="mt-4">
              <LibraryImportSummary result={result} />
              {result.owned.size === 0 && (
                <p className="mt-3 text-xs text-brass-hi">
                  No matching cards found. Pick a different file.
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="focus-brass rounded border border-ink-line-2 bg-ink-raised px-3.5 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="focus-brass rounded bg-brass px-3.5 py-1.5 text-sm font-semibold text-ink-bg transition-colors hover:bg-brass-hi disabled:cursor-not-allowed disabled:bg-ink-raised disabled:text-vellum-dim"
              onClick={handleUse}
              disabled={!result || result.owned.size === 0 || busy}
            >
              Use this library
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
