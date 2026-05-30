import ManaSymbol from './ManaSymbol';

type Props = { text: string };

export default function OracleText({ text }: Props) {
  if (!text) return null;
  const parts = text.split(/(\{[^}]+\})/g);
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null;
        if (/^\{[^}]+\}$/.test(p)) return <ManaSymbol key={i} token={p} />;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
