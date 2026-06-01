type Props = {
  countsByCmc: number[];
  heightPx?: number;
};

export default function MiniManaCurve({ countsByCmc, heightPx = 36 }: Props) {
  const max = Math.max(1, ...countsByCmc);
  return (
    <div className="flex items-end gap-0.5" style={{ height: heightPx }}>
      {countsByCmc.map((n, i) => (
        <div
          key={i}
          data-cmc={i}
          className="w-2 rounded-t-[1px] bg-brass/80"
          style={{ height: Math.round((n / max) * heightPx) }}
          title={`CMC ${i === 7 ? '7+' : i}: ${n}`}
        />
      ))}
    </div>
  );
}
