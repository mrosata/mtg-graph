import { useState } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useDeckStore } from '../stores/deckStore';
import { STANDARD_SET_CODES } from '@shared/sets';
import { parseMtgaLogFile } from '../lib/mtgaLogParser';
import { parseMtgaCollectionJson } from '../lib/mtgaJsonParser';
import {
  resolveMtgaCollection,
  resolveMtgaDecks,
  type MtgaCollectionSummary,
  type ParsedMtgaDeck,
} from '../lib/mtgaResolve';
import { resolveLibrary, type LibraryImportResult } from '../lib/libraryImport';
import { bridgeHealth, scanCollection, searchCards, type CardHit } from '../lib/mtgaScanBridge';
import LibraryImportSummary from './LibraryImportSummary';
import MtgaDeckChecklist from './MtgaDeckChecklist';

type Props = {
  mode: 'full' | 'decks-only';
  onClose: () => void;
};

type Source = 'log' | 'json' | 'scan';

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

const KNOWN_SET_CODES = new Set(STANDARD_SET_CODES.map((c) => c.toLowerCase()));

export default function MtgaImportPanel({ mode, onClose }: Props) {
  const cards = useGraphStore((s) => s.cards);
  const importLibrary = useLibraryStore((s) => s.importLibrary);
  const ownedFromStore = useLibraryStore((s) => s.owned);
  const importDeck = useDeckStore((s) => s.importDeck);

  // Decks-only mode is Player.log only — the JSON export carries no decks.
  const [source, setSource] = useState<Source>('log');
  const effectiveSource: Source = mode === 'decks-only' ? 'log' : source;

  const [state, setState] = useState<ParseState>({ kind: 'idle' });
  const [decksOptIn, setDecksOptIn] = useState(false);
  const [crossSectionOptIn, setCrossSectionOptIn] = useState(false);
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [anchorHits, setAnchorHits] = useState<CardHit[]>([]);
  const [anchor, setAnchor] = useState<{ grpId: number; name: string } | null>(null);
  const [anchorQty, setAnchorQty] = useState('');
  const [ambiguous, setAmbiguous] = useState(false);

  const resetParseState = () => {
    setState({ kind: 'idle' });
    setDecksOptIn(false);
    setCrossSectionOptIn(false);
    setSelectedDeckIds(new Set());
    setScanMsg(null);
    setAmbiguous(false);
    setAnchor(null);
    setAnchorHits([]);
    setAnchorQty('');
  };

  const handleScan = async () => {
    setScanMsg(null);
    setAmbiguous(false);
    setState({ kind: 'parsing', bytes: 0, total: 0 });
    const health = await bridgeHealth();
    if (!health.online) {
      setState({ kind: 'idle' });
      setScanMsg(
        'Start the exporter first — double-click launch-mac.command, approve the password prompt, then Scan again.',
      );
      return;
    }
    if (!health.arena_process_found) {
      setState({ kind: 'idle' });
      setScanMsg('Open MTG Arena and visit the Collection tab, then Scan again.');
      return;
    }
    const res = await scanCollection([]);
    if (res.status === 'ambiguous') {
      setState({ kind: 'idle' });
      setAmbiguous(true);
      setScanMsg('Found more than one candidate — add one owned card to narrow it down.');
      return;
    }
    if (res.status !== 'ok' || !res.collection) {
      setState({ kind: 'idle' });
      setScanMsg("Couldn't locate your collection. Make sure Arena is on the Collection tab.");
      return;
    }
    const parsed = parseMtgaCollectionJson(JSON.stringify(res.collection));
    const result = resolveLibrary(parsed, cards, KNOWN_SET_CODES);
    setState({ kind: 'ready', libraryResult: result, mtgaSummary: null, decks: null, filename: 'Live scan' });
  };

  const runAnchorScan = async () => {
    if (!anchor || !anchorQty) return;
    setAmbiguous(false);
    const res = await scanCollection([{ grpId: anchor.grpId, quantity: Number(anchorQty) }]);
    if (res.status === 'ok' && res.collection) {
      const parsed = parseMtgaCollectionJson(JSON.stringify(res.collection));
      setState({
        kind: 'ready',
        libraryResult: resolveLibrary(parsed, cards, KNOWN_SET_CODES),
        mtgaSummary: null,
        decks: null,
        filename: 'Live scan',
      });
    } else {
      setScanMsg("Still couldn't pin it down — try a different card with a distinctive quantity.");
    }
  };

  const handleLogFile = async (file: File) => {
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
            "On Mac and Linux these events no longer write — switch to Collection JSON above.",
        });
        return;
      }
      if (mode === 'full' && !hasCollection) {
        setState({
          kind: 'error',
          message:
            "We couldn't find a collection snapshot in this log. " +
            "On Windows, open MTGA → Collection tab, then re-export Player.log. " +
            "On Mac/Linux, use Collection JSON instead.",
        });
        return;
      }
      if (mode === 'decks-only' && !hasDecks) {
        setState({
          kind: 'error',
          message:
            "We couldn't find any decks in this log. " +
            "On Windows, open MTGA's deck builder, then re-export Player.log. " +
            "Mac and Linux logs no longer carry deck data.",
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

  const handleJsonFile = async (file: File) => {
    setState({ kind: 'parsing', bytes: 0, total: file.size });
    try {
      const text = await readFileText(file);
      const parsed = parseMtgaCollectionJson(text);
      const result = resolveLibrary(parsed, cards, KNOWN_SET_CODES);
      setState({
        kind: 'ready',
        libraryResult: result,
        mtgaSummary: null,
        decks: null,
        filename: file.name,
      });
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message });
    }
  };

  const handleFile = (file: File) =>
    effectiveSource === 'log' ? handleLogFile(file) : handleJsonFile(file);

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

  const fileAccept = effectiveSource === 'log' ? '.log,text/plain' : '.json,application/json';
  const fileLabel = effectiveSource === 'log' ? 'Choose Player.log' : 'Choose collection JSON';

  return (
    <div>
      {mode === 'full' && (
        <div className="mb-3 rounded border border-ink-line-2 bg-ink-raised px-3 py-2 text-xs text-vellum-dim">
          <span className="font-semibold text-brass-hi">Heads up — </span>
          MTGA's <code className="text-vellum-mute">Player.log</code> only carries
          collection data on <strong>Windows</strong> with Detailed Logs enabled.
          Mac and Linux clients no longer write the event. If that's you, switch
          to <strong>Collection JSON</strong> below — produced by{' '}
          <a
            href="https://github.com/NthPhantom10/MTGA-collection-exporter"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brass underline hover:text-brass-hi"
          >
            MTGA-collection-exporter
          </a>
          {' '}(Windows-side, but the JSON file is portable).
        </div>
      )}

      {mode === 'full' && (
        <div
          role="tablist"
          aria-label="MTGA source"
          className="mb-3 flex gap-1 text-sm"
        >
          <SourceButton
            active={source === 'log'}
            onClick={() => {
              setSource('log');
              resetParseState();
            }}
          >
            Player.log
          </SourceButton>
          <SourceButton
            active={source === 'json'}
            onClick={() => {
              setSource('json');
              resetParseState();
            }}
          >
            Collection JSON
          </SourceButton>
          <SourceButton
            active={source === 'scan'}
            onClick={() => {
              setSource('scan');
              resetParseState();
            }}
          >
            Live scan
          </SourceButton>
        </div>
      )}

      {effectiveSource === 'log' && (
        <>
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
        </>
      )}

      {effectiveSource === 'json' && (
        <>
          <p className="text-xs text-vellum-dim">
            Pick the <code className="text-vellum-mute">mtga_collection.json</code>{' '}
            produced by MTGA-collection-exporter. Matched against card names + set
            codes — same path Manabox CSVs use.
          </p>
        </>
      )}

      {effectiveSource === 'scan' && (
        <div>
          <p className="text-xs text-vellum-dim">
            Scan your live MTG Arena collection — no file needed. Requires the exporter
            running locally (one-click launcher) and Arena open on the Collection tab.
          </p>
          <button
            type="button"
            onClick={() => void handleScan()}
            className="focus-brass mt-3 inline-flex items-center rounded border border-ink-line-2 bg-ink-raised px-3 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi"
          >
            Scan my collection
          </button>
          {scanMsg && (
            <p className="mt-3 rounded border border-brass/40 bg-ink-raised px-3 py-2 text-xs text-vellum-mute">
              {scanMsg}
            </p>
          )}
          {ambiguous && (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                placeholder="Search a card you own…"
                className="focus-brass w-full rounded border border-ink-line-2 bg-ink-raised px-2 py-1 text-sm text-vellum-mute"
                onChange={(e) => {
                  void searchCards(e.target.value).then(setAnchorHits);
                }}
              />
              <ul className="max-h-32 overflow-auto text-sm">
                {anchorHits.map((h) => (
                  <li key={h.grpId}>
                    <button
                      type="button"
                      className="text-vellum-mute hover:text-brass-hi"
                      onClick={() => setAnchor({ grpId: h.grpId, name: h.name })}
                    >
                      {h.name} ({h.set})
                    </button>
                  </li>
                ))}
              </ul>
              {anchor && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-brass-hi">{anchor.name}</span>
                  <input
                    aria-label="quantity"
                    type="number"
                    min={1}
                    value={anchorQty}
                    onChange={(e) => setAnchorQty(e.target.value)}
                    className="w-16 rounded border border-ink-line-2 bg-ink-raised px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void runAnchorScan()}
                    className="focus-brass rounded bg-brass px-3 py-1 text-sm font-semibold text-ink-bg"
                  >
                    Narrow it down
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {effectiveSource !== 'scan' && (
        <label className="focus-brass mt-3 inline-flex cursor-pointer items-center rounded border border-ink-line-2 bg-ink-raised px-3 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi">
          {fileLabel}
          <input
            type="file"
            accept={fileAccept}
            className="hidden"
            aria-label={fileLabel}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </label>
      )}

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
          {mode === 'full' && state.libraryResult && (
            <LibraryImportSummary
              result={state.libraryResult}
              mtgaSummary={state.mtgaSummary ?? undefined}
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

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read file."));
    reader.readAsText(file);
  });
}

function SourceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'focus-brass rounded px-3 py-1 text-sm transition-colors',
        active
          ? 'bg-ink-raised text-brass-hi border border-brass/40'
          : 'text-vellum-mute border border-transparent hover:text-brass-hi',
      ].join(' ')}
    >
      {children}
    </button>
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
