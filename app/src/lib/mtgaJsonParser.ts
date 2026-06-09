import type { ParsedLibrary, ParsedLibraryRow } from './libraryImport';

// MTGA-collection-exporter (https://github.com/NthPhantom10/MTGA-collection-exporter)
// writes its `mtga_collection.json` as a flat JSON array, sorted by (name, set):
//   [
//     { "count": 4, "name": "Abrade", "set": "DMU", "cn": "131" },
//     ...
//   ]
// No arena_id is preserved — the tool merges by (name, set) before write. That
// means this parser produces the same ParsedLibrary shape Manabox produces, and
// downstream resolution goes through `resolveLibrary` (name-based), not the
// arena_id index.
export function parseMtgaCollectionJson(text: string): ParsedLibrary {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON: file does not parse as JSON.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error(
      "This doesn't look like an MTGA collection export — top-level value must be a JSON array.",
    );
  }

  const rows: ParsedLibraryRow[] = [];
  const unparseableLines: string[] = [];

  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') {
      unparseableLines.push(JSON.stringify(entry));
      continue;
    }
    const e = entry as Record<string, unknown>;
    const name = typeof e.name === 'string' ? e.name : '';
    const set = typeof e.set === 'string' ? e.set : '';
    const cn = typeof e.cn === 'string' ? e.cn : '';
    const count = typeof e.count === 'number' && Number.isFinite(e.count) ? e.count : NaN;

    if (!name || !Number.isFinite(count) || count <= 0) {
      unparseableLines.push(JSON.stringify(entry));
      continue;
    }
    rows.push({ name, setCode: set, collectorNumber: cn, quantity: count });
  }

  return { rows, unparseableLines };
}
