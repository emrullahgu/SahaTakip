// webTools.test.ts — check_regulation_updates DÜRÜSTLÜĞÜ (ADV-2 / Req#3).
// Tüm kaynak fetch'leri başarısızsa koşulsuz ok:true dönmek, ajanın "mevzuat
// tarandı" diye yalan söylemesine yol açıyordu. Artık fetched=0 → ok:false.

import { WEB_TOOLS } from '../webTools';

const ctx: any = { app: null, confirm: async () => true, log: () => {} };
const origFetch = global.fetch;

afterEach(() => { global.fetch = origFetch; });

describe('check_regulation_updates — ok gerçek indirme sonucundan türer', () => {
  it('tüm fetch\'ler başarısızsa ok:false + error döner', async () => {
    global.fetch = jest.fn(async () => { throw new Error('network down'); }) as any;
    const res = await WEB_TOOLS.check_regulation_updates.handler({ category: 'emo', maxSources: 1 }, ctx);
    expect(res.ok).toBe(false);
    expect(res.fetched).toBe(0);
    expect(String(res.error)).toMatch(/indirilemedi/i);
  });

  it('bilinmeyen kategori için ok:false', async () => {
    const res = await WEB_TOOLS.check_regulation_updates.handler({ category: 'zzz-yok' }, ctx);
    expect(res.ok).toBe(false);
  });
});
