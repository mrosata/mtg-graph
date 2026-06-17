import { useState } from 'react';
import type { ImportRowSummary, LibraryImportResult } from '../lib/libraryImport';
import type { MtgaCollectionSummary } from '../lib/mtgaResolve';

type Props = {
  result: LibraryImportResult;
  mtgaSummary?: MtgaCollectionSummary;
};

function Group({
  title, rows, initialOpen,
}: { title: string; rows: ImportRowSummary[]; initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div className="mt-3 border-t border-ink-line pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="focus-brass flex w-full items-center justify-between text-left text-xs font-medium text-vellum-mute transition-colors hover:text-brass-hi"
      >
        <span>
          <span aria-hidden="true" className="mr-1 text-brass">{open ? '▼' : '▶'}</span>
          {`${title} (${rows.length})`}
        </span>
      </button>
      {open && rows.length > 0 && (
        <ul className="mt-2 max-h-48 overflow-y-auto font-mono text-xs tabular text-vellum-dim scrollbar-slim">
          {rows.map((r, i) => (
            <li key={`${r.name}-${r.setCode}-${i}`}>
              {`${r.quantity}× ${r.name} (${r.setCode || '—'})`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LibraryImportSummary({ result, mtgaSummary }: Props) {
  const cardCount = result.owned.size;

  return (
    <div>
      <p className="text-sm tabular text-brass-hi">
        {`Imported ${cardCount.toLocaleString()} cards`}
      </p>
      {mtgaSummary && mtgaSummary.outOfPoolCount > 0 && (
        <p className="mt-1 text-xs text-vellum-dim">
          {`${mtgaSummary.outOfPoolCount.toLocaleString()} cards in your collection aren't in our Standard pool.`}
        </p>
      )}
      {!mtgaSummary && (
        <>
          <Group title="Unknown names" rows={result.unknownNames} initialOpen />
          <Group title="Unknown sets" rows={result.unknownSets} initialOpen={false} />
          <Group
            title="Unparseable rows"
            rows={result.unparseableLines.map((line) => ({
              name: line.length > 60 ? line.slice(0, 60) + '…' : line,
              setCode: '',
              quantity: 1,
            }))}
            initialOpen={false}
          />
        </>
      )}
    </div>
  );
}
