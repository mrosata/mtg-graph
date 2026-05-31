import { useLibraryStore } from '../stores/libraryStore';

export default function LibraryStatusBadge() {
  const owned = useLibraryStore((s) => s.owned);
  const enabled = useLibraryStore((s) => s.enabled);

  if (!owned) {
    return <span className="text-xs text-neutral-500">No library</span>;
  }
  return (
    <span
      className={`text-xs ${enabled ? 'text-neutral-200' : 'text-neutral-500'}`}
      aria-label={enabled ? 'Library active' : 'Library loaded but inactive'}
    >
      Library: {owned.size.toLocaleString()} cards
    </span>
  );
}
