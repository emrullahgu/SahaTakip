// payrollHr — net = gross - deductions - advances (maaş hesabı doğru olmalı)
const mockState: any = { row: null };
const mockSingle = jest.fn(async () => ({ data: { id: 'p1', employee_id: 'e1', period: '2026-06', gross: 1000, deductions: 100, advances: 50, net: 850, status: 'draft' }, error: null }));
const mockUpsert = jest.fn((row: any) => { mockState.row = row; return { select: () => ({ single: mockSingle }) }; });

jest.mock('../supabase', () => ({
  SUPABASE_CONFIGURED: true,
  supabase: {
    from: () => ({ upsert: mockUpsert }),
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
  },
}));

import { upsertPayrollRecord, LEAVE_TYPE_LABEL, LEAVE_STATUS_LABEL } from '../payrollHr';

describe('payrollHr', () => {
  it('net = brüt - kesinti - avans (doğru hesaplar)', async () => {
    await upsertPayrollRecord({ employeeId: 'e1', period: '2026-06', gross: 1000, deductions: 100, advances: 50 });
    expect(mockState.row.net).toBe(850);
    expect(mockState.row.gross).toBe(1000);
    expect(mockState.row.employee_id).toBe('e1');
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({ net: 850 }), { onConflict: 'employee_id,period' });
  });

  it('eksik kesinti/avans 0 sayılır', async () => {
    await upsertPayrollRecord({ employeeId: 'e2', period: '2026-07', gross: 500 });
    expect(mockState.row.net).toBe(500);
  });

  it('izin etiketleri tanımlı', () => {
    expect(LEAVE_TYPE_LABEL.annual).toBe('Yıllık İzin');
    expect(LEAVE_STATUS_LABEL.approved).toBe('Onaylandı');
  });
});
