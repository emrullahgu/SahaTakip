// ====================================================================
// Tahsilat + kasa idempotency (Req#3 — çift tahsilat / çift kasa girişi önleme)
// ====================================================================
// Tahsilat ile kasa girişi atomik DEĞİL (iki ayrı tablo). Kasa girişi koparsa kullanıcı
// "Kaydet"e tekrar basar. PaymentFormScreen kararlı id (useRef) geçer; createPayment ve
// addEntry upsert + yerel dedup yaptığından retry İKİNCİ bir kayıt yaratmamalı.
// (Test ortamı: SUPABASE_CONFIGURED=false → yerel AsyncStorage yolu.)

import { createPayment, listPayments } from '../payments';
import { addEntry, listEntries } from '../cashRegister';

const PAY_ID = '550e8400-e29b-41d4-a716-446655440010';
const CASH_ID = '550e8400-e29b-41d4-a716-446655440011';

describe('tahsilat/kasa idempotency (kararlı id ile retry)', () => {
  test('aynı id ile iki kez createPayment → tek tahsilat satırı', async () => {
    const base = {
      id: PAY_ID,
      customerId: 'c1',
      customerName: 'Acme',
      amount: 1500,
      method: 'cash' as const,
      status: 'received' as const,
      receivedAt: new Date('2026-06-24T10:00:00Z').toISOString(),
    };
    await createPayment(base);
    await createPayment(base); // retry (kasa girişi kopmuş gibi)
    const all = await listPayments();
    expect(all.filter(p => p.id === PAY_ID).length).toBe(1);
  });

  test('retry makbuz no + tutarı korur (aynı kayıt)', async () => {
    const all = await listPayments();
    const rows = all.filter(p => p.id === PAY_ID);
    expect(rows.length).toBe(1);
    expect(rows[0].amount).toBe(1500);
    expect(rows[0].receiptNo).toBeTruthy();
  });

  test('aynı id ile iki kez addEntry → tek kasa girişi', async () => {
    const base = {
      id: CASH_ID,
      employeeId: 'e1',
      employeeName: 'Ali',
      kind: 'collection' as const,
      amount: 1500,
      paymentId: PAY_ID,
    };
    await addEntry(base);
    await addEntry(base); // retry
    const all = await listEntries();
    expect(all.filter(e => e.id === CASH_ID).length).toBe(1);
  });
});
