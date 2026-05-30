// pipeline/fetch.ts
import type { Card, Color, Rarity } from '../shared/types';
import { DEFAULT_CACHE_DIR, readCachedSet, writeCachedSet } from './cache';

type ScryfallFace = {
  oracle_text?: string;
  image_uris?: { normal?: string; large?: string };
};

export type ScryfallCard = {
  oracle_id: string;
  name: string;
  set: string;
  collector_number: string;
  mana_cost?: string | null;
  cmc: number;
  colors?: string[];
  color_identity?: string[];
  type_line: string;
  oracle_text?: string;
  power?: string | null;
  toughness?: string | null;
  keywords?: string[];
  rarity: string;
  image_uris?: { normal?: string; large?: string };
  card_faces?: ScryfallFace[];
};

type ScryfallPage = {
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
};

const COLORS: ReadonlySet<string> = new Set(['W', 'U', 'B', 'R', 'G']);

export function stripScryfallCard(raw: ScryfallCard): Card {
  const { types, subtypes, supertypes } = parseTypeLine(raw.type_line);
  const image =
    raw.image_uris?.normal ??
    raw.image_uris?.large ??
    raw.card_faces?.[0]?.image_uris?.normal ??
    raw.card_faces?.[0]?.image_uris?.large ??
    '';

  // For multi-face cards (DFCs, MDFCs, adventures), Scryfall puts oracle_text on
  // each face rather than the top level. v0.1 concatenates faces so the regex
  // extractor sees the full card text. True per-face splitting is deferred to v0.2.
  const oracleText =
    raw.oracle_text && raw.oracle_text.length > 0
      ? raw.oracle_text
      : (raw.card_faces ?? [])
          .map((f) => f.oracle_text ?? '')
          .filter((t) => t.length > 0)
          .join('\n\n');

  return {
    oracleId: raw.oracle_id,
    name: raw.name,
    set: raw.set,
    printings: [raw.set],
    collectorNumber: raw.collector_number,
    manaCost: raw.mana_cost ?? null,
    cmc: raw.cmc,
    colors: (raw.colors ?? []).filter((c): c is Color => COLORS.has(c)),
    colorIdentity: (raw.color_identity ?? []).filter((c): c is Color => COLORS.has(c)),
    typeLine: raw.type_line,
    types,
    subtypes,
    supertypes,
    oracleText,
    keywords: raw.keywords ?? [],
    power: raw.power ?? null,
    toughness: raw.toughness ?? null,
    rarity: normalizeRarity(raw.rarity),
    imageUrl: image,
    tags: [],
  };
}

function normalizeRarity(r: string): Rarity {
  if (r === 'common' || r === 'uncommon' || r === 'rare' || r === 'mythic') return r;
  return 'common';
}

const SUPERTYPES = new Set(['Basic', 'Legendary', 'Snow', 'World', 'Ongoing']);

function parseTypeLine(typeLine: string): {
  types: string[];
  subtypes: string[];
  supertypes: string[];
} {
  // "Legendary Creature — Human Soldier" → supertypes:[Legendary], types:[Creature], subtypes:[Human,Soldier]
  const [left, right = ''] = typeLine.split('—').map((s) => s.trim());
  const leftWords = (left ?? '').split(/\s+/).filter(Boolean);
  const supertypes = leftWords.filter((w) => SUPERTYPES.has(w));
  const types = leftWords.filter((w) => !SUPERTYPES.has(w));
  const subtypes = right ? right.split(/\s+/).filter(Boolean) : [];
  return { types, subtypes, supertypes };
}

async function fetchWithBackoff(url: string): Promise<Response> {
  let backoff = 1000;
  for (let attempt = 0; attempt < 5; attempt++) {
    const resp = await fetch(url);
    if (resp.status !== 429) return resp;
    const retryAfter = Number(resp.headers.get('Retry-After'));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoff;
    await new Promise((r) => setTimeout(r, wait));
    backoff *= 2;
  }
  return fetch(url);
}

export type FetchOptions = {
  /**
   * Directory to read/write raw Scryfall responses. Set to `null` to disable
   * caching entirely (tests use this so mocked fetch responses aren't bypassed).
   * Defaults to `<cwd>/.cache/scryfall`.
   */
  cacheDir?: string | null;
  /**
   * When true, ignore any cached file on read but still write the fresh response.
   * Wired to the CLI's `--refresh` flag.
   */
  refresh?: boolean;
};

async function fetchRawSet(setCode: string): Promise<ScryfallCard[]> {
  const raw: ScryfallCard[] = [];
  let url: string | undefined =
    `https://api.scryfall.com/cards/search?q=set:${encodeURIComponent(setCode)}&unique=cards`;
  let firstRequest = true;
  while (url) {
    // Scryfall asks for 50–100ms between requests; otherwise we hit 429s on full-Standard runs.
    if (!firstRequest) await new Promise((r) => setTimeout(r, 150));
    firstRequest = false;
    const resp = await fetchWithBackoff(url);
    if (!resp.ok) {
      throw new Error(`Scryfall fetch failed: ${resp.status} ${resp.statusText}`);
    }
    const page = (await resp.json()) as ScryfallPage;
    raw.push(...page.data);
    url = page.has_more ? page.next_page : undefined;
  }
  return raw;
}

export async function fetchSetFromScryfall(
  setCode: string,
  opts: FetchOptions = {},
): Promise<Card[]> {
  const cacheDir = opts.cacheDir === undefined ? DEFAULT_CACHE_DIR : opts.cacheDir;
  if (cacheDir && !opts.refresh) {
    const cached = readCachedSet(cacheDir, setCode);
    if (cached) return cached.map((raw) => stripScryfallCard(raw as ScryfallCard));
  }
  const raw = await fetchRawSet(setCode);
  if (cacheDir) writeCachedSet(cacheDir, setCode, raw);
  return raw.map(stripScryfallCard);
}
