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
        // Compact axis-tinted pill; matches TagChip palette but tighter for use
        // in the count header bar above the card grid.
        const tone = isTheme
          ? 'border-[#b388e8]/40 bg-[#b388e8]/15 text-[#b388e8]'
          : 'border-brass/40 bg-brass/15 text-brass-hi';
        const dot = isTheme ? 'bg-[#b388e8]' : 'bg-brass';
        return (
          <span
            key={tagId}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${tone}`}
          >
            <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
            {label}
            <button
              type="button"
              onClick={() => onRemove(tagId)}
              className="ml-0.5 rounded px-1 text-vellum-dim transition-colors hover:text-vellum"
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
