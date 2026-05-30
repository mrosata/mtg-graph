type Props = { countsByCmc: number[]; max: number };

const CHART_HEIGHT_PX = 96; // h-24 equivalent

export default function ManaCurve({ countsByCmc, max }: Props) {
  const safeMax = Math.max(1, max);
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: CHART_HEIGHT_PX }}>
        {countsByCmc.map((n, i) => (
          <div
            key={i}
            className="w-6 bg-amber-500"
            style={{ height: Math.round((n / safeMax) * CHART_HEIGHT_PX) }}
            title={`CMC ${i}: ${n}`}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {countsByCmc.map((_, i) => (
          <div key={i} className="w-6 text-center text-[10px] text-neutral-400">
            {i === 7 ? '7+' : i}
          </div>
        ))}
      </div>
    </div>
  );
}
