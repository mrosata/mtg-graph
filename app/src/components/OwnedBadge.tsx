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
        'inline-flex items-center rounded bg-neutral-800/80 px-1.5 text-[10px] font-medium text-neutral-200 ' +
        className
      }
      aria-label={`Owned: ${count}`}
    >
      ×{count}
    </span>
  );
}
