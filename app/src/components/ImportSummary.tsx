import { useEffect } from 'react';
import { useImportSummaryStore } from '../stores/importSummaryStore';

export default function ImportSummary() {
  const result = useImportSummaryStore((s) => s.result);
  const clear = useImportSummaryStore((s) => s.clear);

  // Clear on unmount so a later return to the workspace doesn't re-show the panel.
  useEffect(() => () => clear(), [clear]);

  if (!result) return null;

  const sumCounts = (entries: { count: number }[]) => entries.reduce((s, e) => s + e.count, 0);
  const importedCount =
    sumCounts(result.resolved) + sumCounts(result.sideboardResolved);
  const totalParsed =
    importedCount + sumCounts(result.unknown) + sumCounts(result.sideboardUnknown);
  const skippedCount = sumCounts(result.unknown) + sumCounts(result.sideboardUnknown);
  const allUnknown = [...result.unknown, ...result.sideboardUnknown];

  return (
    <div
      role="status"
      className="m-4 rounded border border-brass/40 bg-brass/10 p-3 text-sm text-vellum"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold tabular text-brass-hi">
          {`Imported ${importedCount} of ${totalParsed} cards.`}
        </p>
        <button
          onClick={clear}
          aria-label="Dismiss import summary"
          className="focus-brass text-vellum-mute transition-colors hover:text-brass-hi"
        >
          ×
        </button>
      </div>
      {allUnknown.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-vellum-mute">
            {`${skippedCount} cards skipped — not in Standard. mtg-graph currently only supports Standard.`}
          </summary>
          <ul className="mt-1 list-disc pl-5 font-mono text-xs tabular text-vellum-dim">
            {allUnknown.map((e, i) => (
              <li key={i}>{`${e.count} ${e.name}`}</li>
            ))}
          </ul>
        </details>
      )}
      {result.unparseableLines.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-vellum-dim">
            {`${result.unparseableLines.length} unparseable lines skipped.`}
          </summary>
          <ul className="mt-1 list-disc pl-5 font-mono text-xs text-vellum-dim">
            {result.unparseableLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
