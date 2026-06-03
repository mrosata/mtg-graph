import type { Card } from '@shared/types';
import { buildCardNameLookup, lookupByName } from './cardNameIndex';

export type ImportEntry = { count: number; name: string; mtgoId?: number };

export type ParsedDeck = {
  name: string | null;
  entries: ImportEntry[];
  // Each Arena `Sideboard` line or DEK `Sideboard="true"` row becomes one entry.
  // Carries mtgoId for DEK round-trip the same way main entries do.
  sideboardEntries: ImportEntry[];
  unparseableLines: string[];
};

type Section = 'none' | 'about' | 'deck' | 'sideboard';

const CARD_LINE = /^(\d+)\s+(.+)$/;
const NAME_LINE = /^Name\s+(.+)$/i;

export function parseArenaDeck(text: string): ParsedDeck {
  let section: Section = 'none';
  let name: string | null = null;
  const entries: ImportEntry[] = [];
  const sideboardEntries: ImportEntry[] = [];
  const unparseableLines: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('//') || line.startsWith('#')) continue;

    const header = line.toLowerCase();
    if (header === 'about') { section = 'about'; continue; }
    if (header === 'deck') { section = 'deck'; continue; }
    if (header === 'sideboard') { section = 'sideboard'; continue; }

    if (section === 'about') {
      const m = line.match(NAME_LINE);
      if (m) name = m[1]!.trim();
      // Commander, Companion, anything else: silently ignored.
      continue;
    }

    if (section === 'deck' || section === 'sideboard') {
      const m = line.match(CARD_LINE);
      if (!m) { unparseableLines.push(line); continue; }
      const count = parseInt(m[1]!, 10);
      const cardName = m[2]!.trim();
      const target = section === 'deck' ? entries : sideboardEntries;
      target.push({ count, name: cardName });
    }
  }

  return { name, entries, sideboardEntries, unparseableLines };
}

// Dispatcher: sniff the text and route to the right parser. The first
// non-whitespace char decides: '<' → XML/DEK, anything else → Arena text.
export function parseDeck(text: string): ParsedDeck {
  return text.trimStart().startsWith('<') ? parseDekDeck(text) : parseArenaDeck(text);
}

// Parse Archidekt/MTGO Workstation .dek XML format.
// CatID is the MTGO catalog ID and is per-printing — we preserve it so
// round-tripping a deck back to Archidekt keeps the user's printing choice.
// CatID="0" means "no MTGO printing available" — treat as absent.
export function parseDekDeck(xml: string): ParsedDeck {
  // Leading whitespace breaks the XML declaration. Browsers/file pickers
  // sometimes inject BOMs or stray newlines, so trim defensively.
  const doc = new DOMParser().parseFromString(xml.trimStart(), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid DEK file: malformed XML.');
  }

  const entries: ImportEntry[] = [];
  const sideboardEntries: ImportEntry[] = [];
  const unparseableLines: string[] = [];

  for (const el of Array.from(doc.getElementsByTagName('Cards'))) {
    const name = el.getAttribute('Name')?.trim() ?? '';
    const qtyRaw = el.getAttribute('Quantity') ?? '';
    const qty = Number.parseInt(qtyRaw, 10);
    if (!name || !Number.isFinite(qty) || qty <= 0) {
      unparseableLines.push(el.outerHTML);
      continue;
    }
    const catId = Number.parseInt(el.getAttribute('CatID') ?? '', 10);
    const entry: ImportEntry = { count: qty, name };
    if (Number.isFinite(catId) && catId > 0) entry.mtgoId = catId;

    const sideboard = (el.getAttribute('Sideboard') ?? 'false').toLowerCase() === 'true';
    (sideboard ? sideboardEntries : entries).push(entry);
  }

  return { name: null, entries, sideboardEntries, unparseableLines };
}

export type ResolvedEntry = { oracleId: string; count: number; name: string; mtgoId?: number };

function resolveEntry(entry: ImportEntry, lookup: ReturnType<typeof buildCardNameLookup>):
  | { ok: true; resolved: ResolvedEntry }
  | { ok: false } {
  const hit = lookupByName(lookup, entry.name);
  if (!hit) return { ok: false };
  const resolved: ResolvedEntry = {
    oracleId: hit.oracleId,
    count: entry.count,
    name: hit.canonicalName,
  };
  if (entry.mtgoId !== undefined) resolved.mtgoId = entry.mtgoId;
  return { ok: true, resolved };
}

export type ImportResult = {
  resolved: ResolvedEntry[];
  unknown: ImportEntry[];
  sideboardResolved: ResolvedEntry[];
  sideboardUnknown: ImportEntry[];
  unparseableLines: string[];
};

export function resolveImport(parsed: ParsedDeck, cards: Map<string, Card>): ImportResult {
  const lookup = buildCardNameLookup(cards);

  const resolved: ResolvedEntry[] = [];
  const unknown: ImportEntry[] = [];
  for (const entry of parsed.entries) {
    const r = resolveEntry(entry, lookup);
    if (r.ok) resolved.push(r.resolved);
    else unknown.push(entry);
  }

  const sideboardResolved: ResolvedEntry[] = [];
  const sideboardUnknown: ImportEntry[] = [];
  for (const entry of parsed.sideboardEntries) {
    const r = resolveEntry(entry, lookup);
    if (r.ok) sideboardResolved.push(r.resolved);
    else sideboardUnknown.push(entry);
  }

  return {
    resolved,
    unknown,
    sideboardResolved,
    sideboardUnknown,
    unparseableLines: parsed.unparseableLines,
  };
}
