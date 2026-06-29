// bordro — birleşik net-maaş motoru + veri katmanı (offline yol; SUPABASE_CONFIGURED=false).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calcBordro, fmtTRY } from '../bordroEngine';
import { saveBordro, bordroForPeriod, deleteBordro, draftFor, bordroTotals, currentPeriod, recentPeriods } from '../bordro';

beforeEach(async () => { await AsyncStorage.clear(); });

describe('bordroEngine.calcBordro', () => {
  test('birleşik formül: hakediş ve net toplam doğru', () => {
    const r = calcBordro({
      agreedNet: 30000, overtimeHours: 8, sundayHolidayDays: 2, absentDays: 1,
      advance: 5000, expense: 1000, bonus: 2000, extraPayment: 500,
    });
    expect(r.dailyRate).toBe(1000);          // 30000/30
    expect(r.hourlyRate).toBe(125);          // 1000/8
    expect(r.overtimePay).toBe(1500);        // 8*125*1.5
    expect(r.sundayHolidayPay).toBe(2000);   // 2*1000
    expect(r.absentDeduction).toBe(1000);    // 1*1000
    expect(r.hakedis).toBe(37000);           // 30000+2000+1500+1000+2000+500
    expect(r.total).toBe(31000);             // 37000-1000-5000
  });

  test('boş/eksik girdi 0 üretir, çökmez', () => {
    const r = calcBordro({ agreedNet: 0 });
    expect(r.total).toBe(0);
    expect(r.hakedis).toBe(0);
  });

  test('yalnız maaş → toplam = maaş', () => {
    expect(calcBordro({ agreedNet: 25000 }).total).toBe(25000);
  });

  test('fmtTRY ₺ ile biçimler', () => {
    expect(fmtTRY(1000)).toContain('₺');
  });
});

describe('bordro servisi (offline)', () => {
  test('saveBordro + bordroForPeriod kaydı döner, totals motorla eşleşir', async () => {
    const b = await saveBordro({ employeeId: 'emp-1', period: '2026-06', fullName: 'Ali Veli', agreedNet: 30000, overtimeHours: 10 });
    expect(b.id).toMatch(/^[0-9a-f]{8}-/i);
    const list = await bordroForPeriod('2026-06');
    expect(list).toHaveLength(1);
    expect(list[0].fullName).toBe('Ali Veli');
    const t = bordroTotals(list[0]);
    expect(t.overtimePay).toBe(calcBordro({ agreedNet: 30000, overtimeHours: 10 }).overtimePay);
  });

  test('aynı personel+dönem ikinci kayıt günceller (yeni kayıt değil)', async () => {
    await saveBordro({ employeeId: 'emp-1', period: '2026-06', fullName: 'Ali', agreedNet: 30000 });
    await saveBordro({ employeeId: 'emp-1', period: '2026-06', fullName: 'Ali', agreedNet: 35000 });
    const list = await bordroForPeriod('2026-06');
    expect(list).toHaveLength(1);
    expect(list[0].agreedNet).toBe(35000);
  });

  test('UI yolu: FARKLI id ile aynı emp+period → mükerrer DEĞİL (emp+period dedup)', async () => {
    // draftFor her zaman yeni id üretir; yine de tekilleştirme employeeId+period ile olmalı
    const d1 = draftFor('emp-7', 'Veli', '2026-06', 30000);
    await saveBordro(d1);
    const d2 = draftFor('emp-7', 'Veli', '2026-06', 40000); // farklı id, aynı kişi+ay
    await saveBordro(d2);
    const list = await bordroForPeriod('2026-06');
    expect(list).toHaveLength(1);
    expect(list[0].agreedNet).toBe(40000);
  });

  test('farklı dönem ayrı tutulur', async () => {
    await saveBordro({ employeeId: 'emp-1', period: '2026-06', fullName: 'Ali', agreedNet: 30000 });
    await saveBordro({ employeeId: 'emp-1', period: '2026-07', fullName: 'Ali', agreedNet: 30000 });
    expect(await bordroForPeriod('2026-06')).toHaveLength(1);
    expect(await bordroForPeriod('2026-07')).toHaveLength(1);
  });

  test('deleteBordro kaydı kaldırır', async () => {
    const b = await saveBordro({ employeeId: 'emp-1', period: '2026-06', fullName: 'Ali', agreedNet: 30000 });
    await deleteBordro(b.id);
    expect(await bordroForPeriod('2026-06')).toHaveLength(0);
  });

  test('draftFor maaşı taşır, currentPeriod/recentPeriods YYYY-MM verir', () => {
    const d = draftFor('emp-9', 'Veli', '2026-06', 28000, '12345678901');
    expect(d.agreedNet).toBe(28000);
    expect(d.nationalId).toBe('12345678901');
    expect(currentPeriod()).toMatch(/^\d{4}-\d{2}$/);
    expect(recentPeriods(3)).toHaveLength(3);
  });
});
