import { useEffect, useState } from 'react';

type CursorProps = {
  mode: 'cursor';
  url: string;
  x: number;
  y: number;
  width?: number;
};

type AnchoredProps = {
  mode: 'anchored';
  url: string;
  anchorRight: number;
  width: number;
  hideBelowPx?: number;
};

type Props = CursorProps | AnchoredProps;

function useMinWidth(minPx: number | null): boolean {
  const [matches, setMatches] = useState(() => {
    if (minPx == null || typeof window === 'undefined') return true;
    return window.matchMedia(`(min-width: ${minPx}px)`).matches;
  });
  useEffect(() => {
    if (minPx == null || typeof window === 'undefined') {
      setMatches(true);
      return;
    }
    const mql = window.matchMedia(`(min-width: ${minPx}px)`);
    const handler = () => setMatches(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [minPx]);
  return matches;
}

export default function HoverCardPreview(props: Props) {
  const hideBelowPx = props.mode === 'anchored' ? props.hideBelowPx ?? null : null;
  const visible = useMinWidth(hideBelowPx);
  if (!visible) return null;

  if (props.mode === 'cursor') {
    const width = props.width ?? 240;
    return (
      <img
        src={props.url}
        alt=""
        data-testid="hover-card-preview"
        className="pointer-events-none fixed z-50 rounded shadow-2xl"
        style={{
          width,
          left: Math.max(8, props.x - (width + 20)),
          top: Math.max(8, Math.min(window.innerHeight - 340, props.y - 100)),
        }}
      />
    );
  }

  return (
    <img
      src={props.url}
      alt=""
      data-testid="hover-card-preview"
      className="pointer-events-none fixed top-1/2 z-50 -translate-y-1/2 rounded shadow-2xl"
      style={{ right: props.anchorRight, width: props.width }}
    />
  );
}
