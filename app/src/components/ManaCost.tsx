import ManaSymbol from './ManaSymbol';

type Props = { cost: string | null };

export default function ManaCost({ cost }: Props) {
  if (!cost) return null;
  const symbols = cost.match(/\{[^}]+\}/g) ?? [];
  if (symbols.length === 0) return null;
  return (
    <span className="inline-flex shrink-0 gap-0.5">
      {symbols.map((sym, i) => (
        <ManaSymbol key={i} token={sym} />
      ))}
    </span>
  );
}
