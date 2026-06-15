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
import { bridgeHealth, scanCollection, scanDeck, searchCards, EXPECTED_BRIDGE_VERSION, type CardHit } from '../lib/mtgaScanBridge';
import { parseArenaDeck } from '../lib/deckImport';
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
  // Live scan: anchor-first. Connect probes the bridge; once connected the
  // anchor picker is the primary UI. `anchors` accumulates confirmed cards as
  // the engine asks us to narrow an ambiguous match.
  const [connected, setConnected] = useState(false);
  const [anchors, setAnchors] = useState<{ grpId: number; quantity: number }[]>([]);
  const [anchorHits, setAnchorHits] = useState<CardHit[]>([]);
  const [anchor, setAnchor] = useState<{ grpId: number; name: string } | null>(null);
  const [anchorQty, setAnchorQty] = useState('');
  const [scanMode, setScanMode] = useState<'deck' | 'search'>('deck');
  const [deckText, setDeckText] = useState('');
  const [deckMatch, setDeckMatch] = useState<{ matched: number; total: number } | null>(null);
  const [bridgeStale, setBridgeStale] = useState(false);

  const resetParseState = () => {
    setState({ kind: 'idle' });
    setDecksOptIn(false);
    setCrossSectionOptIn(false);
    setSelectedDeckIds(new Set());
    setScanMsg(null);
    setDeckMatch(null);
    setConnected(false);
    setAnchors([]);
    setAnchor(null);
    setAnchorHits([]);
    setAnchorQty('');
  };

  const handleConnect = async () => {
    setScanMsg(null);
    setState({ kind: 'parsing', bytes: 0, total: 0 });
    const health = await bridgeHealth();
    setState({ kind: 'idle' });
    if (!health.online) {
      setScanMsg(
        'Start the exporter first — double-click launch-mac.command, approve the password prompt, then Connect again.',
      );
      return;
    }
    if (!health.arena_process_found) {
      setScanMsg('Open MTG Arena and visit the Collection tab, then Connect again.');
      return;
    }
    setBridgeStale(health.version === undefined || health.version < EXPECTED_BRIDGE_VERSION);
    setConnected(true);
  };

  const handleScan = async () => {
    if (!anchor || Number(anchorQty) < 1) return;
    setScanMsg(null);
    const pending = [...anchors, { grpId: anchor.grpId, quantity: Number(anchorQty) }];
    setState({ kind: 'parsing', bytes: 0, total: 0 });
    const res = await scanCollection(pending);
    setState({ kind: 'idle' });

    if (res.status === 'ok' && res.collection) {
      const parsed = parseMtgaCollectionJson(JSON.stringify(res.collection));
      setState({
        kind: 'ready',
        libraryResult: resolveLibrary(parsed, cards, KNOWN_SET_CODES),
        mtgaSummary: null,
        decks: null,
        filename: 'Live scan',
      });
      return;
    }

    if (res.status === 'ambiguous' || res.status === 'need_anchor') {
      // Keep the accepted anchor(s); ask for one more to disambiguate.
      setAnchors(pending);
      setAnchor(null);
      setAnchorHits([]);
      setAnchorQty('');
      setScanMsg('Add one more card you own to narrow it down.');
      return;
    }

    if (res.status === 'no_process') {
      setScanMsg('Open MTG Arena and visit the Collection tab, then scan again.');
      return;
    }

    // not_found (and any other non-ok status): the current card didn't work.
    // Drop only the just-tried anchor so they can pick a different one.
    setAnchor(null);
    setAnchorHits([]);
    setAnchorQty('');
    setScanMsg(
      "Couldn't find your collection from that card — try a different one you own (a card you have 3-4 of works best).",
    );
  };

  const handleDeckScan = async () => {
    setScanMsg(null);
    setDeckMatch(null);
    const parsed = parseArenaDeck(deckText);
    const byName = new Map<string, number>();
    for (const e of [...parsed.entries, ...parsed.sideboardEntries]) {
      // Strip Arena set/collector suffix: "Abrade (DMU) 131" → "Abrade"
      const nameOnly = e.name.replace(/\s*\([^)]+\)\s*\S*$/, '').trim() || e.name;
      byName.set(nameOnly, (byName.get(nameOnly) ?? 0) + e.count);
    }
    const deck = [...byName].map(([name, count]) => ({ name, count }));
    if (deck.length === 0) {
      setScanMsg("That doesn't look like an Arena deck. Paste a deck exported from MTGA.");
      return;
    }
    setState({ kind: 'parsing', bytes: 0, total: 0 });
    const res = await scanDeck(deck);
    setState({ kind: 'idle' });
    if (res.status === 'ok' && res.collection) {
      setDeckMatch({ matched: res.matched ?? 0, total: res.total ?? deck.length });
      setState({
        kind: 'ready',
        libraryResult: resolveLibrary(parseMtgaCollectionJson(JSON.stringify(res.collection)), cards, KNOWN_SET_CODES),
        mtgaSummary: null,
        decks: null,
        filename: 'Live scan (deck)',
      });
      return;
    }
    if (res.status === 'no_process') {
      setScanMsg('Open MTG Arena and visit the Collection tab, then try again.');
      return;
    }
    if (res.status === 'inconclusive') {
      const matched = res.matched ?? 0;
      const total = res.total ?? deck.length;
      // A low match usually means the collection isn't resident in memory yet —
      // exporting a deck leaves you in the deck builder, not the Collection tab.
      setScanMsg(
        `Only matched ${matched} of ${total} of your deck's cards. Your collection may not be ` +
          `loaded — open the Collection tab in Arena and scroll through it once, then scan again. ` +
          `(Or use Search a card.)`,
      );
      return;
    }
    setScanMsg("Couldn't pin it down from that deck — paste a different deck or use Search a card.");
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
          {' '}On <strong>Mac</strong>, skip the file entirely — use{' '}
          <strong>Live scan</strong> above (one-click launcher reads Arena directly).
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
            running locally (one-click launcher). <strong>Important:</strong> open your{' '}
            <strong>Collection</strong> tab in Arena and scroll through it once so it loads
            into memory, then scan (paste a deck, or search a card you own).
          </p>

          {!connected ? (
            <button
              type="button"
              onClick={() => void handleConnect()}
              className="focus-brass mt-3 inline-flex items-center rounded border border-ink-line-2 bg-ink-raised px-3 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi"
            >
              Connect
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              {bridgeStale && (
                <p className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  Your local exporter looks out of date — quit it (Ctrl-C) and re-launch to get the
                  latest. Deck import needs the current version.
                </p>
              )}
              <div role="tablist" aria-label="anchor mode" className="flex gap-1 text-xs">
                <button type="button" role="tab" aria-selected={scanMode === 'deck'}
                  onClick={() => { setScanMode('deck'); setScanMsg(null); setDeckMatch(null); }}
                  className={['focus-brass rounded px-2 py-0.5', scanMode === 'deck' ? 'bg-ink-raised text-brass-hi border border-brass/40' : 'text-vellum-mute border border-transparent hover:text-brass-hi'].join(' ')}>
                  Paste a deck
                </button>
                <button type="button" role="tab" aria-selected={scanMode === 'search'}
                  onClick={() => { setScanMode('search'); setScanMsg(null); setDeckMatch(null); }}
                  className={['focus-brass rounded px-2 py-0.5', scanMode === 'search' ? 'bg-ink-raised text-brass-hi border border-brass/40' : 'text-vellum-mute border border-transparent hover:text-brass-hi'].join(' ')}>
                  Search a card
                </button>
              </div>

              {scanMode === 'deck' ? (
                <>
                  <p className="text-xs text-vellum-dim">
                    Paste any deck you own (Arena → deck → Export). Tip: after copying it,
                    visit your <strong>Collection</strong> tab and scroll once so the
                    collection is loaded before you scan.
                  </p>
                  <textarea
                    value={deckText}
                    onChange={(e) => setDeckText(e.target.value)}
                    placeholder="In Arena: open a deck → Export → paste here"
                    rows={6}
                    className="focus-brass w-full rounded border border-ink-line-2 bg-ink-raised px-2 py-1 text-sm text-vellum-mute"
                  />
                  <button type="button" onClick={() => void handleDeckScan()}
                    className="focus-brass rounded bg-brass px-3 py-1 text-sm font-semibold text-ink-bg transition-colors hover:bg-brass-hi">
                    Find my collection
                  </button>
                </>
              ) : (
                <>
                  {anchors.length > 0 && (
                    <p className="text-xs text-vellum-dim">
                      {anchors.length === 1 ? '1 anchor card' : `${anchors.length} anchor cards`} added.
                    </p>
                  )}
                  <input
                    type="text"
                    placeholder="Search a card you own…"
                    className="focus-brass w-full rounded border border-ink-line-2 bg-ink-raised px-2 py-1 text-sm text-vellum-mute"
                    onChange={(e) => { void searchCards(e.target.value).then(setAnchorHits); }}
                  />
                  {!anchor && (
                    <ul className="max-h-32 overflow-auto text-sm">
                      {anchorHits.map((h) => (
                        <li key={h.grpId}>
                          <button type="button" className="text-vellum-mute hover:text-brass-hi"
                            onClick={() => setAnchor({ grpId: h.grpId, name: h.name })}>
                            {h.name} ({h.set})
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {anchor && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-brass-hi">{anchor.name}</span>
                      <input aria-label="quantity" type="number" min={1} value={anchorQty}
                        onChange={(e) => setAnchorQty(e.target.value)}
                        className="w-16 rounded border border-ink-line-2 bg-ink-raised px-2 py-1 text-sm" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleScan()}
                    disabled={!anchor || Number(anchorQty) < 1}
                    className="focus-brass rounded bg-brass px-3 py-1 text-sm font-semibold text-ink-bg transition-colors hover:bg-brass-hi disabled:cursor-not-allowed disabled:bg-ink-raised disabled:text-vellum-dim"
                  >
                    Scan my collection
                  </button>
                </>
              )}
            </div>
          )}

          {scanMsg && (
            <p className="mt-3 rounded border border-brass/40 bg-ink-raised px-3 py-2 text-xs text-vellum-mute">
              {scanMsg}
            </p>
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
          {deckMatch && (
            <p className="text-xs text-brass-hi">
              Matched {deckMatch.matched} of {deckMatch.total} deck cards.
            </p>
          )}
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
