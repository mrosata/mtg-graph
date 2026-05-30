// pipeline/cache.ts
//
// File-based cache for raw Scryfall set responses. One JSON file per set code,
// containing the concatenated `data` arrays from all pages of the search. The
// pipeline reads from cache by default and writes after every successful fetch;
// `npm run refresh:cards` bypasses the read step to force a re-download.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const DEFAULT_CACHE_DIR = resolve(process.cwd(), '.cache', 'scryfall');

export function readCachedSet(cacheDir: string, setCode: string): unknown[] | null {
  const path = join(cacheDir, `${setCode}.json`);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedSet(cacheDir: string, setCode: string, raw: unknown[]): void {
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(join(cacheDir, `${setCode}.json`), JSON.stringify(raw));
}
