import type { Color } from '@shared/types';

type Props = {
  distribution: Record<Color, number>;
};

const WUBRG: Color[] = ['W', 'U', 'B', 'R', 'G'];

const COLOR_BG: Record<Color, string> = {
  W: 'bg-yellow-100',
  U: 'bg-sky-300',
  B: 'bg-neutral-800',
  R: 'bg-red-500',
  G: 'bg-green-600',
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
        className="h-3 w-full rounded-sm bg-neutral-800"
      />
    );
  }
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-sm">
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
