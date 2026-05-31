import type { Card } from '@shared/types';
import { useLibraryStore } from '../stores/libraryStore';
import { isBasicLand } from '../lib/basics';

type Props = { card: Card };

export default function NotInLibraryBadge({ card }: Props) {
  const owned = useLibraryStore((s) => s.owned);
  if (!owned) return null;
  if (isBasicLand(card)) return null;
  if (owned.has(card.oracleId)) return null;
  return (
    <span
      className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
      aria-label="Not in your library"
      title="Not in your library"
    />
  );
}
