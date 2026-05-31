export type ParsedLibraryRow = {
  name: string;
  setCode: string;
  collectorNumber: string;
  quantity: number;
};

export type ParsedLibrary = {
  rows: ParsedLibraryRow[];
  unparseableLines: string[];
};

const REQUIRED_COLUMNS = ['Name', 'Set code', 'Collector number', 'Quantity'] as const;

// Minimal RFC-4180-ish CSV row splitter. Handles quoted fields, embedded commas,
// and doubled-quote escapes ("" -> ").
function splitCsvRow(row: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (row[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"') { inQuotes = true; }
      else { cur += ch; }
    }
  }
  out.push(cur);
  return out;
}

export function parseManaboxCsv(text: string): ParsedLibrary {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('Empty CSV (no header row).');
  }

  const headerCells = splitCsvRow(lines[0]!).map((c) => c.trim());
  const headerLower = headerCells.map((c) => c.toLowerCase());
  const colIdx = (label: string) => headerLower.indexOf(label.toLowerCase());

  for (const required of REQUIRED_COLUMNS) {
    if (colIdx(required) === -1) {
      throw new Error(
        `This doesn't look like a Manabox CSV. Missing required column: ${required}. ` +
        `Expected: ${REQUIRED_COLUMNS.join(', ')}.`,
      );
    }
  }

  const nameIdx = colIdx('Name');
  const setIdx  = colIdx('Set code');
  const collIdx = colIdx('Collector number');
  const qtyIdx  = colIdx('Quantity');

  const rows: ParsedLibraryRow[] = [];
  const unparseableLines: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    const cells = splitCsvRow(line);
    const name = (cells[nameIdx] ?? '').trim();
    const setCode = (cells[setIdx] ?? '').trim();
    const collectorNumber = (cells[collIdx] ?? '').trim();
    const qtyRaw = (cells[qtyIdx] ?? '').trim();
    const qty = Number.parseInt(qtyRaw, 10);
    if (!name || !Number.isFinite(qty) || qty <= 0 || !/^\d+$/.test(qtyRaw)) {
      unparseableLines.push(line);
      continue;
    }
    rows.push({ name, setCode, collectorNumber, quantity: qty });
  }

  return { rows, unparseableLines };
}

import type { Card } from '@shared/types';
import { buildCardNameLookup, lookupByName } from './cardNameIndex';

export type ImportRowSummary = {
  name: string;
  setCode: string;
  quantity: number;
};

export type LibraryImportResult = {
  owned: Map<string, number>;
  unknownNames: ImportRowSummary[];
  unknownSets: ImportRowSummary[];
  unparseableLines: string[];
};

export function resolveLibrary(
  parsed: ParsedLibrary,
  cards: Map<string, Card>,
  knownSetCodes: ReadonlySet<string>,
): LibraryImportResult {
  const lookup = buildCardNameLookup(cards);
  const knownLower = new Set<string>();
  for (const c of knownSetCodes) knownLower.add(c.toLowerCase());

  const owned = new Map<string, number>();
  const unknownNames: ImportRowSummary[] = [];
  const unknownSets: ImportRowSummary[] = [];

  for (const row of parsed.rows) {
    const hit = lookupByName(lookup, row.name);
    if (hit) {
      owned.set(hit.oracleId, (owned.get(hit.oracleId) ?? 0) + row.quantity);
      continue;
    }
    const summary: ImportRowSummary = {
      name: row.name, setCode: row.setCode, quantity: row.quantity,
    };
    if (knownLower.has(row.setCode.toLowerCase())) {
      unknownNames.push(summary);
    } else {
      unknownSets.push(summary);
    }
  }

  return { owned, unknownNames, unknownSets, unparseableLines: parsed.unparseableLines };
}
