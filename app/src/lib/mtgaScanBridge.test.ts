import { describe, it, expect, vi, afterEach } from 'vitest';
import { scanCollection, bridgeHealth } from './mtgaScanBridge';

afterEach(() => { vi.restoreAllMocks(); });

describe('mtgaScanBridge', () => {
  it('returns ok collection from /api/scan', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ status: 'ok', collection: [{ count: 4, name: 'Abrade', set: 'DMU', cn: '131' }] }),
    })) as unknown as typeof fetch);
    const res = await scanCollection([]);
    expect(res.status).toBe('ok');
    expect(res.collection?.[0]?.name).toBe('Abrade');
  });

  it('maps a network failure to engine-offline', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('refused'); }) as unknown as typeof fetch);
    const h = await bridgeHealth();
    expect(h.online).toBe(false);
  });

  it('scanDeck posts the deck and maps matched/total', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ status: 'ok', collection: [{ count: 4, name: 'Abrade', set: 'DMU', cn: '131' }], matched: 9, total: 10 }),
    }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    const { scanDeck } = await import('./mtgaScanBridge');
    const res = await scanDeck([{ name: 'Abrade', count: 4 }]);
    expect(res.status).toBe('ok');
    expect(res.matched).toBe(9);
    expect(res.total).toBe(10);
    const body = JSON.parse(((fetchMock.mock.calls[0] as unknown as Parameters<typeof fetch>)[1] as RequestInit).body as string);
    expect(body).toEqual({ deck: [{ name: 'Abrade', count: 4 }] });
  });
});
