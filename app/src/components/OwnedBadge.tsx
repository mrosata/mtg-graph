import type { Card } from '@shared/types';
import { useLibraryStore } from '../stores/libraryStore';
import { isBasicLand } from '../lib/basics';

type Props = { card: Card; className?: string };

export default function OwnedBadge({ card, className = '' }: Props) {
  const owned = useLibraryStore((s) => s.owned);
  if (!owned) return null;
  if (isBasicLand(card)) return null;
  const count = owned.get(card.oracleId) ?? 0;
  return (
    <span
      className={
        'inline-flex items-center rounded bg-mana-g/15 px-1.5 font-mono tabular text-[10px] font-medium text-[#82b97c] ring-1 ring-inset ring-mana-g/25 ' +
        className
      }
      aria-label={`Owned: ${count}`}
    >
      <svg
        viewBox="0 0 16 16"
        width="9"
        height="9"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mr-0.5 opacity-90"
      >
        <path d="M3 8.5l3 3 7-7" />
      </svg>
      ×{count}
    </span>
  );
}
