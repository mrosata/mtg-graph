import type { Color } from '@shared/types';

type Props = {
  distribution: Record<Color, number>;
};

const WUBRG: Color[] = ['W', 'U', 'B', 'R', 'G'];

// Semantic mana fills calibrated for the dark editorial canvas. These match the
// `mana-*` tokens from index.css / tailwind.config.js so they read consistently
// next to color filter pips elsewhere in the UI.
const COLOR_BG: Record<Color, string> = {
  W: 'bg-mana-w',
  U: 'bg-mana-u',
  B: 'bg-mana-b',
  R: 'bg-mana-r',
  G: 'bg-mana-g',
};

const COLOR_NAME: Record<Color, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
};

function fmt(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(1);
}

export default function ColorPipBar({ distribution }: Props) {
  const total = WUBRG.reduce((s, c) => s + distribution[c], 0);
  if (total === 0) {
    return (
      <div
        role="img"
        aria-label="No colored pips"
        className="h-3 w-full rounded-sm border border-ink-line bg-ink-raised"
      />
    );
  }
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-sm border border-ink-line shadow-[inset_0_1px_0_rgba(0,0,0,0.4)]">
      {WUBRG.filter((c) => distribution[c] > 0).map((c) => (
        <div
          key={c}
          data-color={c}
          className={COLOR_BG[c]}
          style={{ width: `${(distribution[c] / total) * 100}%` }}
          title={`${COLOR_NAME[c]}: ${fmt(distribution[c])} pips`}
        />
      ))}
    </div>
  );
}
