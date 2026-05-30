import type { Card } from '@shared/types';

export type ImportEntry = { count: number; name: string };

export type ParsedDeck = {
  name: string | null;
  entries: ImportEntry[];
  sideboardCount: number;
  unparseableLines: string[];
};

type Section = 'none' | 'about' | 'deck' | 'sideboard';

const CARD_LINE = /^(\d+)\s+(.+)$/;
const NAME_LINE = /^Name\s+(.+)$/i;

export function parseArenaDeck(text: string): ParsedDeck {
  let section: Section = 'none';
  let name: string | null = null;
  const entries: ImportEntry[] = [];
  let sideboardCount = 0;
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
      if (section === 'deck') entries.push({ count, name: cardName });
      else sideboardCount += count;
    }
  }

  return { name, entries, sideboardCount, unparseableLines };
}

export type ResolvedEntry = { oracleId: string; count: number; name: string };

export type ImportResult = {
  resolved: ResolvedEntry[];
  unknown: ImportEntry[];
  sideboardCount: number;
  unparseableLines: string[];
};

const DFC_SEPARATOR = ' // ';

export function resolveImport(parsed: ParsedDeck, cards: Map<string, Card>): ImportResult {
  // Build the lookup once per call. Imports are rare; the artifact is loaded
  // once at startup. Caching across calls isn't worth the extra plumbing.
  const exactByLower = new Map<string, { oracleId: string; canonicalName: string }>();
  const frontFaceByLower = new Map<string, { oracleId: string; canonicalName: string }>();
  for (const card of cards.values()) {
    const lower = card.name.toLowerCase();
    exactByLower.set(lower, { oracleId: card.oracleId, canonicalName: card.name });
    const sepIdx = card.name.indexOf(DFC_SEPARATOR);
    if (sepIdx !== -1) {
      const front = card.name.slice(0, sepIdx).toLowerCase();
      // First-write-wins: with zero name collisions this can't realistically
      // collide, but be defensive in case the artifact later contains them.
      if (!frontFaceByLower.has(front)) {
        frontFaceByLower.set(front, { oracleId: card.oracleId, canonicalName: card.name });
      }
    }
  }

  const resolved: ResolvedEntry[] = [];
  const unknown: ImportEntry[] = [];
  for (const entry of parsed.entries) {
    const lower = entry.name.toLowerCase();
    const hit = exactByLower.get(lower) ?? frontFaceByLower.get(lower);
    if (hit) {
      resolved.push({ oracleId: hit.oracleId, count: entry.count, name: hit.canonicalName });
    } else {
      unknown.push(entry);
    }
  }

  return {
    resolved,
    unknown,
    sideboardCount: parsed.sideboardCount,
    unparseableLines: parsed.unparseableLines,
  };
}
