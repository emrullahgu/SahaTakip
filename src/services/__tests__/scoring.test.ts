import { computeStaffScores, toProductivityEntries, reportCompletenessOf } from '../scoring';
import type { WorkOrder } from '../../types';

// Skorlama yalnız şu alanları okur; testte kısmi nesne yeterli.
const wo = (p: Partial<WorkOrder>): WorkOrder => p as unknown as WorkOrder;

describe('scoring', () => {
  test('rapor eksiksizliği: tüm alanlar dolu = 1, hiçbiri = 0', () => {
    expect(reportCompletenessOf(wo({
      beforePhoto: 'a', afterPhoto: 'b', materials: [{} as any], notes: 'x', signatureUri: 's',
    }))).toBe(1);
    expect(reportCompletenessOf(wo({ materials: [] }))).toBe(0);
  });

  test('tamamlayan + eksiksiz rapor yüksek skor; eşik sıralaması doğru', () => {
    const orders: WorkOrder[] = [
      // Ahmet: 2 iş, ikisi tamamlanmış, tam raporlu → yüksek
      wo({ assignedToName: 'Ahmet', status: 'Tamamlandı', beforePhoto: 'a', afterPhoto: 'b', materials: [{} as any], notes: 'n', signatureUri: 's', quoteAmount: 1000 }),
      wo({ assignedToName: 'Ahmet', status: 'Faturalandırıldı', beforePhoto: 'a', afterPhoto: 'b', materials: [{} as any], notes: 'n', signatureUri: 's', quoteAmount: 2000 }),
      // Veli: 2 iş, hiçbiri tamamlanmamış, rapor boş → düşük
      wo({ assignedToName: 'Veli', status: 'Bekliyor', materials: [] }),
      wo({ assignedToName: 'Veli', status: 'Atandı', materials: [] }),
    ];
    const scores = computeStaffScores(orders);
    expect(scores).toHaveLength(2);
    expect(scores[0].name).toBe('Ahmet');
    expect(scores[0].completed).toBe(2);
    expect(scores[0].completionRate).toBe(1);
    expect(scores[0].reportCompleteness).toBe(1);
    expect(scores[0].revenue).toBe(3000);
    expect(scores[0].score).toBeGreaterThan(scores[1].score);
    expect(scores[1].name).toBe('Veli');
    expect(scores[1].completed).toBe(0);
    expect(scores[1].completionRate).toBe(0);
    expect(scores[1].reportCompleteness).toBe(0);
    // Tamamlama/rapor 0; yalnız küçük hacim katkısı kalır (gereksiz giriş ödüllenmez).
    expect(scores[1].score).toBeLessThanOrEqual(5);
  });

  test('isimsiz iş emirleri atlanır; sıralama no atanır', () => {
    const orders: WorkOrder[] = [
      wo({ assignedToName: '', engineer: '', status: 'Tamamlandı' }),
      wo({ engineer: 'Mehmet', status: 'Tamamlandı', beforePhoto: 'a' }),
    ];
    const entries = toProductivityEntries(computeStaffScores(orders));
    expect(entries).toHaveLength(1);
    expect(entries[0].employeeName).toBe('Mehmet');
    expect(entries[0].ranking).toBe(1);
  });
});
