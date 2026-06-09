import type { ParsedMtgaDeck } from '../lib/mtgaResolve';

type Props = {
  decks: ParsedMtgaDeck[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
};

export default function MtgaDeckChecklist({ decks, selected, onChange }: Props) {
  const sorted = [...decks].sort((a, b) => b.inPoolPercent - a.inPoolPercent);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const selectAll = () => onChange(new Set(sorted.map((d) => d.mtgaId)));
  const selectNone = () => onChange(new Set());

  return (
    <div>
      <div className="mb-2 flex items-center gap-3 text-xs">
        <button type="button" onClick={selectAll}
          className="focus-brass text-vellum-mute transition-colors hover:text-brass-hi">
          Select all
        </button>
        <span className="text-ink-line">|</span>
        <button type="button" onClick={selectNone}
          className="focus-brass text-vellum-mute transition-colors hover:text-brass-hi">
          Select none
        </button>
      </div>
      <ul className="max-h-72 overflow-y-auto rounded border border-ink-line bg-ink-raised scrollbar-slim">
        {sorted.map((d) => {
          const mainCount = d.mainboard.reduce((acc, e) => acc + e.count, 0);
          return (
            <li key={d.mtgaId} className="border-b border-ink-line last:border-b-0">
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-ink-panel">
                <input
                  type="checkbox"
                  checked={selected.has(d.mtgaId)}
                  onChange={() => toggle(d.mtgaId)}
                  aria-label={d.mtgaName}
                />
                <span className="flex-1 truncate text-vellum">{d.mtgaName}</span>
                <span className="text-xs text-vellum-dim">{d.mtgaFormat}</span>
                <span className="text-xs text-vellum-dim tabular">{mainCount}</span>
                <span className={`text-xs tabular ${d.inPoolPercent === 100 ? 'text-brass-hi' : 'text-vellum-mute'}`}>
                  {`${d.inPoolPercent}% in pool`}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
