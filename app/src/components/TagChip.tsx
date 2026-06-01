import type { CardTag, TagDef } from '@shared/types';

type Props = { tag: CardTag; def?: TagDef };

const AXIS_LABEL: Record<CardTag['axis'], string> = {
  effect: 'effect',
  condition: 'condition',
  trigger: 'trigger',
};

// Per-axis chip styling: surface tint + text + border, plus an inline axis dot.
// effect = brass, trigger = mana-u, condition = amethyst (#b388e8).
const AXIS_CHIP: Record<CardTag['axis'], string> = {
  effect:
    'bg-brass/15 text-brass-hi border-brass/40 shadow-[inset_0_1px_0_rgba(240,201,122,0.18)]',
  trigger:
    'bg-mana-u/15 text-mana-u border-mana-u/40 shadow-[inset_0_1px_0_rgba(126,182,232,0.22)]',
  condition:
    'bg-[#b388e8]/15 text-[#b388e8] border-[#b388e8]/40 shadow-[inset_0_1px_0_rgba(179,136,232,0.22)]',
};

const AXIS_DOT: Record<CardTag['axis'], string> = {
  effect: 'bg-brass',
  trigger: 'bg-mana-u',
  condition: 'bg-[#b388e8]',
};

export default function TagChip({ tag, def }: Props) {
  const label = def?.label ?? tag.tagId;
  const desc = def?.description ?? tag.tagId;
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-5 ' +
        AXIS_CHIP[tag.axis]
      }
      data-axis={tag.axis}
      title={`${label} (${AXIS_LABEL[tag.axis]}) — ${desc}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-1.5 w-1.5 rounded-full ${AXIS_DOT[tag.axis]}`}
      />
      {label}
    </span>
  );
}
