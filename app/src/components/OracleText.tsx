import ManaSymbol from './ManaSymbol';

type Props = { text: string };

// Splits on mana tokens AND parenthesized reminder-text. Reminder text gets
// rendered in Cormorant italic for a small editorial nod; mana tokens get the
// usual symbol pill. Everything else stays plain.
export default function OracleText({ text }: Props) {
  if (!text) return null;
  const parts = text.split(/(\{[^}]+\}|\([^)]+\))/g);
  return (
    <span className="font-body text-sm leading-relaxed text-vellum-mute">
      {parts.map((p, i) => {
        if (!p) return null;
        if (/^\{[^}]+\}$/.test(p)) return <ManaSymbol key={i} token={p} />;
        if (/^\([^)]+\)$/.test(p)) {
          return (
            <span key={i} className="font-head italic text-vellum-dim">
              {p}
            </span>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}
