import type { TagDef } from '@shared/types';

type Props = {
  selected: string[];
  catalog: Map<string, TagDef>;
  onRemove: (tagId: string) => void;
};

// Per-axis chip styling — mirrors TagChip.tsx so removable filter pills carry
// the same axis-of-origin signal across the app. Theme tags reuse the
// amethyst condition palette (theme is conceptually a deck-shaping axis).
function chipClasses(def: TagDef | undefined): { tone: string; dot: string; cross: string } {
  const isTheme = def?.category === 'theme';
  const axis = def?.axis;
  if (isTheme) {
    return {
      tone: 'border-[#b388e8]/40 bg-[#b388e8]/15 text-[#b388e8]',
      dot: 'bg-[#b388e8]',
      cross: 'text-[#b388e8]/70 hover:text-[#b388e8]',
    };
  }
  if (axis === 'trigger') {
    return {
      tone: 'border-mana-u/40 bg-mana-u/15 text-mana-u',
      dot: 'bg-mana-u',
      cross: 'text-mana-u/70 hover:text-mana-u',
    };
  }
  if (axis === 'condition') {
    return {
      tone: 'border-[#b388e8]/40 bg-[#b388e8]/15 text-[#b388e8]',
      dot: 'bg-[#b388e8]',
      cross: 'text-[#b388e8]/70 hover:text-[#b388e8]',
    };
  }
  // default: effect (brass)
  return {
    tone: 'border-brass/40 bg-brass/15 text-brass-hi',
    dot: 'bg-brass',
    cross: 'text-brass/70 hover:text-brass-hi',
  };
}

export default function SelectedTagChips({ selected, catalog, onRemove }: Props) {
  if (selected.length === 0) return null;
  return (
    <div className="mb-2 mt-2 flex flex-wrap gap-1">
      {selected.map((tagId) => {
        const def = catalog.get(tagId);
        const label = def?.label ?? tagId;
        const { tone, dot, cross } = chipClasses(def);
        return (
          <span
            key={tagId}
            className={`group inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${tone}`}
          >
            <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
            {label}
            <button
              type="button"
              onClick={() => onRemove(tagId)}
              aria-label={`Remove ${label}`}
              className={`ml-0.5 rounded leading-none transition-colors ${cross}`}
            >
              ×
            </button>
          </span>
        );
      })}
    </div>
  );
}
