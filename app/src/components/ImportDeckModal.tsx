import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeckStore } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';
import { useImportSummaryStore } from '../stores/importSummaryStore';
import { parseArenaDeck, resolveImport } from '../lib/deckImport';

type Props = { onClose: () => void };

export default function ImportDeckModal({ onClose }: Props) {
  const cards = useGraphStore((s) => s.cards);
  const importDeck = useDeckStore((s) => s.importDeck);
  const setSummary = useImportSummaryStore((s) => s.set);
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleImport = async () => {
    const parsed = parseArenaDeck(text);
    const result = resolveImport(parsed, cards);
    if (parsed.entries.length === 0) {
      setError('No cards found. Paste an Arena-format decklist.');
      return;
    }
    if (result.resolved.length === 0) {
      setError(
        `None of the ${parsed.entries.length} cards are in our Standard set. mtg-graph currently only supports Standard.`,
      );
      return;
    }
    await importDeck(parsed.name, result.resolved);
    if (
      result.unknown.length > 0 ||
      result.sideboardCount > 0 ||
      result.unparseableLines.length > 0
    ) {
      setSummary(result);
    }
    onClose();
    navigate('/');
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const out = reader.result;
      if (typeof out === 'string') setText(out);
    };
    reader.onerror = () => setError("Couldn't read file.");
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-[36rem] max-w-[90vw] rounded-lg border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-deck-title"
      >
        <h3 id="import-deck-title" className="text-lg font-semibold">
          Import deck
        </h3>
        <p className="mt-1 text-xs text-neutral-400">
          Paste an MTG Arena-format decklist, or load it from a .txt file.
        </p>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); }}
          rows={12}
          className="mt-3 w-full rounded border border-neutral-700 bg-neutral-950 p-2 font-mono text-xs text-neutral-100"
          placeholder={'About\nName My Deck\n\nDeck\n4 Lightning Bolt\n…'}
        />
        <div className="mt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-amber-400 hover:underline"
          >
            Load from file…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-neutral-700 px-3 py-1 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="rounded bg-amber-500 px-3 py-1 text-sm font-semibold text-black hover:bg-amber-400"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
