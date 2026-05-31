import { useState } from 'react';
import type { ImportRowSummary, LibraryImportResult } from '../lib/libraryImport';

type Props = { result: LibraryImportResult };

function Group({
  title, rows, initialOpen,
}: { title: string; rows: ImportRowSummary[]; initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div className="mt-3 border-t border-neutral-800 pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left text-xs font-medium text-neutral-300"
      >
        <span>{open ? '▼' : '▶'} {title} ({rows.length})</span>
      </button>
      {open && rows.length > 0 && (
        <ul className="mt-2 max-h-48 overflow-y-auto text-xs text-neutral-400">
          {rows.map((r, i) => (
            <li key={`${r.name}-${r.setCode}-${i}`}>
              {r.quantity}× {r.name} ({r.setCode || '—'})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LibraryImportSummary({ result }: Props) {
  const cardCount = result.owned.size;
  let copyCount = 0;
  for (const n of result.owned.values()) copyCount += n;

  return (
    <div>
      <p className="text-sm text-neutral-200">
        {`Imported ${cardCount.toLocaleString()} cards (${copyCount.toLocaleString()} copies)`}
      </p>
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
    </div>
  );
}
