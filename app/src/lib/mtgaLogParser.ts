export type MtgaRawDeck = {
  id: string;
  name: string;
  format: string;
  mainDeck: { id: number; quantity: number }[];
  sideboard: { id: number; quantity: number }[];
  companion: { id: number } | null;
};

export type MtgaLogContents = {
  collection: Record<string, number> | null;
  decks: MtgaRawDeck[] | null;
};

const COLLECTION_RE = /<==\s*PlayerInventory\.GetPlayerCards(?:V\d+)?\b/;
const DECKS_RE = /<==\s*Deck\.GetDeckLists(?:V\d+)?\b/;

export function parseMtgaLogText(text: string): MtgaLogContents {
  let collection: Record<string, number> | null = null;
  let decks: MtgaRawDeck[] | null = null;

  let i = 0;
  while (i < text.length) {
    const nl = text.indexOf('\n', i);
    const line = text.slice(i, nl === -1 ? text.length : nl);

    if (COLLECTION_RE.test(line)) {
      const after = nl === -1 ? text.length : nl + 1;
      const { value, end } = readJsonValue(text, after);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Last one wins — always overwrite.
        collection = value as Record<string, number>;
      }
      i = end;
      continue;
    }
    if (DECKS_RE.test(line)) {
      const after = nl === -1 ? text.length : nl + 1;
      const { value, end } = readJsonValue(text, after);
      if (Array.isArray(value)) {
        decks = (value as unknown[])
          .filter((d): d is MtgaRawDeck => isRawDeck(d));
      }
      i = end;
      continue;
    }

    i = nl === -1 ? text.length : nl + 1;
  }

  return { collection, decks };
}

function isRawDeck(d: unknown): d is MtgaRawDeck {
  if (!d || typeof d !== 'object') return false;
  const o = d as Record<string, unknown>;
  return typeof o.id === 'string'
    && typeof o.name === 'string'
    && typeof o.format === 'string'
    && Array.isArray(o.mainDeck)
    && Array.isArray(o.sideboard);
}

/**
 * Read a single JSON value (object or array) starting at `start`, skipping
 * leading whitespace. Returns the parsed value plus the index just past the
 * closing bracket. Bracket-balances naively so multi-line JSON works; respects
 * string literals so braces inside strings don't throw the count off.
 */
function readJsonValue(text: string, start: number): { value: unknown; end: number } {
  let i = start;
  while (i < text.length && /\s/.test(text[i]!)) i++;
  const open = text[i];
  if (open !== '{' && open !== '[') return { value: null, end: i };
  const close = open === '{' ? '}' : ']';

  let depth = 0;
  let inStr = false;
  let escape = false;
  const begin = i;
  for (; i < text.length; i++) {
    const ch = text[i]!;
    if (inStr) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        const slice = text.slice(begin, i + 1);
        try { return { value: JSON.parse(slice), end: i + 1 }; }
        catch { return { value: null, end: i + 1 }; }
      }
    }
  }
  return { value: null, end: text.length };
}
