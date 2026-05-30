import type { TagDef } from '@shared/types';

type Props = {
  selected: string[];
  catalog: Map<string, TagDef>;
  onRemove: (tagId: string) => void;
};

export default function SelectedTagChips({ selected, catalog, onRemove }: Props) {
  if (selected.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      {selected.map((tagId) => {
        const label = catalog.get(tagId)?.label ?? tagId;
        return (
          <span
            key={tagId}
            className="inline-flex items-center gap-1 rounded border border-amber-700 bg-amber-950/40 px-1.5 py-0.5 text-[11px] text-amber-200"
          >
            {label}
            <button
              onClick={() => onRemove(tagId)}
              aria-label={`Remove ${label}`}
              className="text-amber-400 hover:text-amber-100"
            >
              ×
            </button>
          </span>
        );
      })}
    </div>
  );
}
