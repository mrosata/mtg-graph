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
        // in the count header bar above the card grid. The whole pill is the
        // remove button so clicking anywhere on it drops the filter.
        const tone = isTheme
          ? 'border-[#b388e8]/40 bg-[#b388e8]/15 text-[#b388e8] hover:bg-[#b388e8]/25 hover:border-[#b388e8]/60'
          : 'border-brass/40 bg-brass/15 text-brass-hi hover:bg-brass/25 hover:border-brass/60';
        const dot = isTheme ? 'bg-[#b388e8]' : 'bg-brass';
        return (
          <button
            key={tagId}
            type="button"
            onClick={() => onRemove(tagId)}
            aria-label={`Remove ${label} filter`}
            title={`Remove ${label} filter`}
            className={`focus-brass group inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors ${tone}`}
          >
            <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
            {label}
            <span aria-hidden="true" className="ml-0.5 text-vellum-dim transition-colors group-hover:text-vellum">
              ×
            </span>
          </button>
        );
      })}
    </div>
  );
}
