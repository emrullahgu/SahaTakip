// workOrderFlow — iş türü (job_type) + check-in gerekliliği
import { requiresCheckIn, jobTypeLabel, WORK_ORDER_JOB_TYPES, canTransition } from '../workOrderFlow';

describe('iş türü (FIELD/OFFICE/REMOTE)', () => {
  it('yalnız saha (FIELD) işi check-in gerektirir', () => {
    expect(requiresCheckIn({ jobType: 'FIELD' })).toBe(true);
    expect(requiresCheckIn({ jobType: 'OFFICE' })).toBe(false);
    expect(requiresCheckIn({ jobType: 'REMOTE' })).toBe(false);
    expect(requiresCheckIn({})).toBe(true); // varsayılan FIELD
  });

  it('jobTypeLabel doğru etiketi döner', () => {
    expect(jobTypeLabel('OFFICE')).toBe('Ofis İşi');
    expect(jobTypeLabel('REMOTE')).toBe('Uzaktan Destek');
    expect(jobTypeLabel(undefined)).toBe('Saha İşi');
  });

  it('3 iş türü tanımlı', () => {
    expect(WORK_ORDER_JOB_TYPES.map(t => t.value)).toEqual(['FIELD', 'OFFICE', 'REMOTE']);
  });
});

describe('durum geçiş state machine (Teklif→İş→...)', () => {
  it('geçerli geçişlere izin verir, geçersizleri reddeder', () => {
    expect(canTransition('Bekliyor', 'Atandı')).toBe(true);
    // terminal/atlamalı geçişler reddedilmeli
    expect(canTransition('Tamamlandı', 'Bekliyor')).toBe(false);
  });
});
