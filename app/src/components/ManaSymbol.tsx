type Props = { token: string };

const COLOR_NAME: Record<string, string> = {
  w: 'white',
  u: 'blue',
  b: 'black',
  r: 'red',
  g: 'green',
  c: 'colorless',
  s: 'snow',
  e: 'energy',
  t: 'tap',
  q: 'untap',
  x: 'X',
  y: 'Y',
  z: 'Z',
};

function nameForHalf(half: string): string {
  if (COLOR_NAME[half]) return COLOR_NAME[half];
  if (half === '2') return 'two';
  return half;
}

function ariaLabel(inner: string): string {
  const lower = inner.toLowerCase();
  if (COLOR_NAME[lower]) return COLOR_NAME[lower];
  if (/^\d+$/.test(inner)) return inner;
  if (lower.endsWith('/p')) {
    const c = lower.slice(0, -2);
    return `Phyrexian ${nameForHalf(c)}`;
  }
  if (lower.includes('/')) {
    const [a, b] = lower.split('/');
    return `${nameForHalf(a ?? '')} or ${nameForHalf(b ?? '')}`;
  }
  return inner;
}

function msClass(inner: string): string {
  const lower = inner.toLowerCase();
  if (lower === 't') return 'ms-tap';
  if (lower === 'q') return 'ms-untap';
  if (lower.includes('/')) return `ms-${lower.replace('/', '')}`;
  return `ms-${lower}`;
}

const KNOWN = /^(?:[wubrgcsexyzqt]|\d+|[wubrg]\/[wubrg]|[wubrg]\/p|2\/[wubrg])$/i;

export default function ManaSymbol({ token }: Props) {
  const inner = token.replace(/^\{|\}$/g, '');
  if (!KNOWN.test(inner)) {
    return (
      <span
        role="img"
        className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-ink-line-2 bg-ink-raised px-1 font-mono text-[9px] font-bold text-vellum"
        aria-label={inner}
      >
        {inner}
      </span>
    );
  }
  return (
    <i
      className={`ms ${msClass(inner)} ms-cost ms-shadow`}
      aria-label={ariaLabel(inner)}
      role="img"
    />
  );
}
