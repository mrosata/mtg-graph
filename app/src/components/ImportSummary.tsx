import { useEffect } from 'react';
import { useImportSummaryStore } from '../stores/importSummaryStore';

export default function ImportSummary() {
  const result = useImportSummaryStore((s) => s.result);
  const clear = useImportSummaryStore((s) => s.clear);

  // Clear on unmount so a later return to the workspace doesn't re-show the panel.
  useEffect(() => () => clear(), [clear]);

  if (!result) return null;

  const importedCount = result.resolved.reduce((s, e) => s + e.count, 0);
  const totalParsed = importedCount + result.unknown.reduce((s, e) => s + e.count, 0);

  return (
    <div
      role="status"
      className="m-4 rounded border border-amber-700/50 bg-amber-900/20 p-3 text-sm text-amber-100"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">Imported {importedCount} of {totalParsed} cards.</p>
        <button
          onClick={clear}
          aria-label="Dismiss import summary"
          className="text-amber-300 hover:text-amber-100"
        >
          ×
        </button>
      </div>
      {result.unknown.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer">
            {result.unknown.reduce((s, e) => s + e.count, 0)} cards skipped — not in Standard.
            mtg-graph currently only supports Standard.
          </summary>
          <ul className="mt-1 list-disc pl-5 text-xs text-amber-200">
            {result.unknown.map((e, i) => (
              <li key={i}>{e.count} {e.name}</li>
            ))}
          </ul>
        </details>
      )}
      {result.sideboardCount > 0 && (
        <p className="mt-2 text-xs text-amber-200">
          {result.sideboardCount} sideboard cards skipped — sideboards aren't supported yet.
        </p>
      )}
      {result.unparseableLines.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-amber-200">
            {result.unparseableLines.length} unparseable lines skipped.
          </summary>
          <ul className="mt-1 list-disc pl-5 font-mono text-xs text-amber-200">
            {result.unparseableLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
