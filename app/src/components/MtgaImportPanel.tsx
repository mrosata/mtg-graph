import { useState } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useDeckStore } from '../stores/deckStore';
import { parseMtgaLogFile } from '../lib/mtgaLogParser';
import {
  resolveMtgaCollection,
  resolveMtgaDecks,
  type MtgaCollectionSummary,
  type ParsedMtgaDeck,
} from '../lib/mtgaResolve';
import type { LibraryImportResult } from '../lib/libraryImport';
import LibraryImportSummary from './LibraryImportSummary';
import MtgaDeckChecklist from './MtgaDeckChecklist';

type Props = {
  mode: 'full' | 'decks-only';
  onClose: () => void;
};

type ParseState =
  | { kind: 'idle' }
  | { kind: 'parsing'; bytes: number; total: number }
  | {
      kind: 'ready';
      libraryResult: LibraryImportResult | null;
      mtgaSummary: MtgaCollectionSummary | null;
      decks: ParsedMtgaDeck[] | null;
      filename: string;
    }
  | { kind: 'error'; message: string };

export default function MtgaImportPanel({ mode, onClose }: Props) {
  const cards = useGraphStore((s) => s.cards);
  const importLibrary = useLibraryStore((s) => s.importLibrary);
  const ownedFromStore = useLibraryStore((s) => s.owned);
  const importDeck = useDeckStore((s) => s.importDeck);

  const [state, setState] = useState<ParseState>({ kind: 'idle' });
  const [decksOptIn, setDecksOptIn] = useState(false);
  const [crossSectionOptIn, setCrossSectionOptIn] = useState(false);
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setState({ kind: 'parsing', bytes: 0, total: file.size });
    try {
      const contents = await parseMtgaLogFile(file, (bytes, total) => {
        setState({ kind: 'parsing', bytes, total });
      });
      const hasCollection = contents.collection !== null;
      const hasDecks = contents.decks !== null;

      if (!hasCollection && !hasDecks) {
        setState({
          kind: 'error',
          message:
            "Neither a collection snapshot nor decks were found in this log. " +
            "Try Player-prev.log if it exists in the same folder.",
        });
        return;
      }
      if (mode === 'full' && !hasCollection) {
        setState({
          kind: 'error',
          message:
            "We couldn't find a collection snapshot in this log. " +
            "Open MTGA, click the Collection tab, then re-export Player.log.",
        });
        return;
      }
      if (mode === 'decks-only' && !hasDecks) {
        setState({
          kind: 'error',
          message:
            "We couldn't find any decks in this log. " +
            "Open MTGA's deck builder, then re-export Player.log.",
        });
        return;
      }

      const libraryBundle = hasCollection
        ? resolveMtgaCollection(contents.collection!, cards)
        : null;
      const decks = hasDecks ? resolveMtgaDecks(contents.decks!, cards) : null;

      setState({
        kind: 'ready',
        libraryResult: libraryBundle?.result ?? null,
        mtgaSummary: libraryBundle?.mtgaSummary ?? null,
        decks,
        filename: file.name,
      });
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message });
    }
  };

  const handleConfirm = async () => {
    if (state.kind !== 'ready') return;
    setBusy(true);
    try {
      const wantsCollection =
        mode === 'full'
          ? state.libraryResult !== null
          : state.libraryResult !== null && crossSectionOptIn;

      if (wantsCollection && state.libraryResult) {
        await importLibrary(state.libraryResult, state.filename);
      }

      const wantsDecks = mode === 'decks-only' || (mode === 'full' && decksOptIn);
      if (wantsDecks && state.decks) {
        const byId = new Map(state.decks.map((d) => [d.mtgaId, d]));
        for (const id of selectedDeckIds) {
          const d = byId.get(id);
          if (!d) continue;
          const resolved = d.mainboard.map((e) => ({
            oracleId: e.oracleId,
            count: e.count,
            name: '',
          }));
          const side = d.sideboard.map((e) => ({
            oracleId: e.oracleId,
            count: e.count,
            name: '',
          }));
          await importDeck(d.mtgaName, resolved, side);
        }
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const confirmLabel = computeConfirmLabel(
    state,
    mode,
    decksOptIn,
    crossSectionOptIn,
    selectedDeckIds.size,
  );
  const confirmDisabled =
    state.kind !== 'ready' ||
    busy ||
    (mode === 'decks-only' && selectedDeckIds.size === 0 && !crossSectionOptIn);

  return (
    <div>
      <p className="text-xs text-vellum-dim">
        Pick your Arena <code className="text-vellum-mute">Player.log</code>.
      </p>
      <p className="mt-1 text-xs text-vellum-dim">
        Windows: <code>%APPDATA%\..\LocalLow\Wizards Of The Coast\MTGA\Player.log</code>
        <br />
        macOS: <code>~/Library/Logs/Wizards Of The Coast/MTGA/Player.log</code>
      </p>
      <p className="mt-1 text-xs text-vellum-dim">
        The file can be large (50–500 MB); parsing happens locally — nothing is uploaded.
      </p>

      <label className="focus-brass mt-3 inline-flex cursor-pointer items-center rounded border border-ink-line-2 bg-ink-raised px-3 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi">
        Choose Player.log
        <input
          type="file"
          accept=".log,text/plain"
          className="hidden"
          aria-label="Choose Player.log"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </label>

      {state.kind === 'parsing' && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded bg-ink-raised">
            <div
              className="h-full bg-brass transition-all"
              style={{
                width: `${state.total === 0 ? 0 : (state.bytes / state.total) * 100}%`,
              }}
              role="progressbar"
              aria-valuenow={state.bytes}
              aria-valuemax={state.total}
            />
          </div>
          <p className="mt-1 text-xs text-vellum-dim tabular">
            {`${(state.bytes / 1e6).toFixed(1)} / ${(state.total / 1e6).toFixed(1)} MB`}
          </p>
        </div>
      )}

      {state.kind === 'error' && (
        <p className="mt-3 rounded border border-mana-r/40 bg-mana-r/10 px-3 py-2 text-xs text-mana-r">
          {state.message}
        </p>
      )}

      {state.kind === 'ready' && (
        <div className="mt-4 space-y-4">
          {mode === 'full' && state.libraryResult && state.mtgaSummary && (
            <LibraryImportSummary
              result={state.libraryResult}
              mtgaSummary={state.mtgaSummary}
            />
          )}

          {mode === 'full' && state.decks && state.decks.length > 0 && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-vellum-mute">
              <input
                type="checkbox"
                checked={decksOptIn}
                onChange={(e) => {
                  setDecksOptIn(e.target.checked);
                  if (!e.target.checked) setSelectedDeckIds(new Set());
                }}
                aria-label="Also import my MTGA decks"
              />
              Also import my MTGA decks ({state.decks.length} available)
            </label>
          )}

          {mode === 'decks-only' && state.libraryResult && !ownedFromStore && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-ink-line bg-ink-raised px-3 py-2 text-sm text-vellum-mute">
              <input
                type="checkbox"
                checked={crossSectionOptIn}
                onChange={(e) => setCrossSectionOptIn(e.target.checked)}
                aria-label="Also import the collection snapshot in this log"
              />
              This log also contains your collection. Import it too?
            </label>
          )}

          {((mode === 'full' && decksOptIn) || mode === 'decks-only') &&
            state.decks && (
              <MtgaDeckChecklist
                decks={state.decks}
                selected={selectedDeckIds}
                onChange={setSelectedDeckIds}
              />
            )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="focus-brass rounded border border-ink-line-2 bg-ink-raised px-3.5 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirmDisabled}
          className="focus-brass rounded bg-brass px-3.5 py-1.5 text-sm font-semibold text-ink-bg transition-colors hover:bg-brass-hi disabled:cursor-not-allowed disabled:bg-ink-raised disabled:text-vellum-dim"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

function computeConfirmLabel(
  state: ParseState,
  mode: 'full' | 'decks-only',
  decksOptIn: boolean,
  crossSectionOptIn: boolean,
  selectedCount: number,
): string {
  if (state.kind !== 'ready') return mode === 'decks-only' ? 'Import decks' : 'Import library';
  if (mode === 'full') {
    if (decksOptIn && selectedCount > 0) {
      return selectedCount === 1
        ? 'Import library + 1 deck'
        : `Import library + ${selectedCount} decks`;
    }
    return 'Import library';
  }
  // decks-only
  const parts: string[] = [];
  if (crossSectionOptIn) parts.push('library');
  if (selectedCount > 0) parts.push(selectedCount === 1 ? '1 deck' : `${selectedCount} decks`);
  if (parts.length === 0) return 'Import';
  return `Import ${parts.join(' + ')}`;
}
