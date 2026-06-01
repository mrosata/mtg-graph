type Props = { countsByCmc: number[]; max: number };

const CHART_HEIGHT_PX = 96; // h-24 equivalent

export default function ManaCurve({ countsByCmc, max }: Props) {
  const safeMax = Math.max(1, max);
  const peak = Math.max(...countsByCmc);
  return (
    <div>
      <div
        className="flex items-end gap-1 border-b border-transparent"
        style={{ height: CHART_HEIGHT_PX }}
      >
        {countsByCmc.map((n, i) => {
          const isPeak = n > 0 && n === peak;
          return (
            <div
              key={i}
              className={`w-6 rounded-t-sm bg-brass ${
                isPeak ? 'shadow-[0_0_8px_rgba(212,164,74,0.35)]' : ''
              }`}
              style={{ height: Math.round((n / safeMax) * CHART_HEIGHT_PX) }}
              title={`CMC ${i}: ${n}`}
            />
          );
        })}
      </div>
      <div className="brass-hairline-soft" aria-hidden="true" />
      <div className="mt-1 flex gap-1">
        {countsByCmc.map((_, i) => (
          <div
            key={i}
            className="w-6 text-center font-mono tabular text-[10px] text-vellum-dim"
          >
            {i === 7 ? '7+' : i}
          </div>
        ))}
      </div>
    </div>
  );
}
