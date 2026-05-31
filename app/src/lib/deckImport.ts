import type { Card } from '@shared/types';
import { buildCardNameLookup, lookupByName } from './cardNameIndex';

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

export function resolveImport(parsed: ParsedDeck, cards: Map<string, Card>): ImportResult {
  const lookup = buildCardNameLookup(cards);

  const resolved: ResolvedEntry[] = [];
  const unknown: ImportEntry[] = [];
  for (const entry of parsed.entries) {
    const hit = lookupByName(lookup, entry.name);
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
