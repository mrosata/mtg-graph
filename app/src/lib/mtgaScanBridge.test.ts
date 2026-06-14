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
});
