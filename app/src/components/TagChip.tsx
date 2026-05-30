import type { CardTag, TagDef } from '@shared/types';

type Props = { tag: CardTag; def?: TagDef };

const AXIS_LABEL: Record<CardTag['axis'], string> = {
  effect: 'effect',
  condition: 'condition',
  trigger: 'trigger',
};

export default function TagChip({ tag, def }: Props) {
  const color =
    tag.axis === 'effect'
      ? 'bg-amber-900 text-amber-200'
      : tag.axis === 'condition'
        ? 'bg-violet-900 text-violet-200'
        : 'bg-sky-900 text-sky-200';
  const label = def?.label ?? tag.tagId;
  const desc = def?.description ?? tag.tagId;
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs ${color}`}
      data-axis={tag.axis}
      title={`${label} (${AXIS_LABEL[tag.axis]}) — ${desc}`}
    >
      {label}
    </span>
  );
}
