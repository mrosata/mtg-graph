const BASE = import.meta.env.VITE_MTGA_BRIDGE_URL ?? 'http://127.0.0.1:17171';

export type ScanRow = { count: number; name: string; set: string; cn: string };
export type ScanStatus =
  | 'ok'
  | 'need_anchor'
  | 'ambiguous'
  | 'inconclusive'
  | 'not_found'
  | 'no_process';
export type ScanResult = { status: ScanStatus; collection?: ScanRow[]; matched?: number; total?: number };

export type DeckEntry = { name: string; count: number };
export type Health = {
  online: boolean;
  running_as_root?: boolean;
  arena_process_found?: boolean;
  card_db_ready?: boolean;
};
export type CardHit = { grpId: number; name: string; set: string; collectorNumber: string };

export async function bridgeHealth(): Promise<Health> {
  try {
    const r = await fetch(`${BASE}/api/health`);
    if (!r.ok) return { online: false };
    return { online: true, ...(await r.json()) };
  } catch {
    return { online: false };
  }
}

export async function searchCards(q: string): Promise<CardHit[]> {
  const r = await fetch(`${BASE}/api/cards/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) return [];
  return (await r.json()) as CardHit[];
}

export async function scanCollection(
  anchors: { grpId: number; quantity: number }[],
): Promise<ScanResult> {
  const r = await fetch(`${BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ anchors }),
  });
  if (!r.ok) return { status: 'not_found' };
  return (await r.json()) as ScanResult;
}

export async function scanDeck(deck: DeckEntry[]): Promise<ScanResult> {
  const r = await fetch(`${BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deck }),
  });
  if (!r.ok) return { status: 'not_found' };
  return (await r.json()) as ScanResult;
}
