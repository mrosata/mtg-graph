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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-bg/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[36rem] max-w-[90vw] overflow-hidden rounded-lg border border-ink-line-2 bg-ink-panel shadow-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-deck-title"
      >
        <div className="brass-hairline" />
        <div className="p-6">
          <h3 id="import-deck-title" className="font-head text-2xl text-vellum">
            Import deck
          </h3>
          <p className="mt-1 text-xs text-vellum-dim">
            Paste an MTG Arena-format decklist, or load it from a .txt file.
          </p>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setError(null); }}
            rows={12}
            className="focus-brass mt-3 w-full rounded border border-ink-line-2 bg-ink-bg p-2 font-mono text-xs text-vellum scrollbar-slim"
            placeholder={'About\nName My Deck\n\nDeck\n4 Lightning Bolt\n…'}
          />
          <div className="mt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-brass transition-colors hover:text-brass-hi hover:underline"
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
          {error && <p className="mt-2 text-sm text-mana-r">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="focus-brass rounded border border-ink-line-2 bg-ink-raised px-3.5 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              className="focus-brass rounded bg-brass px-3.5 py-1.5 text-sm font-semibold text-ink-bg transition-colors hover:bg-brass-hi"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
