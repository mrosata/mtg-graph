import { useGraphStore } from '../stores/graphStore';

type Props = {
  tagIds: string[];
  onRemove: (tagId: string) => void;
};

export default function ActiveTagFilter({ tagIds, onRemove }: Props) {
  const tagCatalog = useGraphStore((s) => s.tagCatalog);
  if (tagIds.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tagIds.map((tagId) => {
        const def = tagCatalog.get(tagId);
        const label = def?.label ?? tagId;
        const isTheme = def?.category === 'theme';
        const tone = isTheme
          ? 'border-violet-700 bg-violet-950 text-violet-200'
          : 'border-amber-700 bg-amber-950 text-amber-200';
        return (
          <span
            key={tagId}
            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] ${tone}`}
          >
            {label}
            <button
              type="button"
              onClick={() => onRemove(tagId)}
              className="rounded px-1 text-neutral-400 hover:text-neutral-100"
              aria-label={`Remove ${label} filter`}
            >
              ×
            </button>
          </span>
        );
      })}
    </div>
  );
}
