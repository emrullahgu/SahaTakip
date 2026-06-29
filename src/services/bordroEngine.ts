// bordroEngine.ts — Birleşik bordro hesap motoru (mavi + beyaz yaka tek mantık).
// Net maaş bazlı: SGK/vergi NET ödemeyi etkilemez (kullanıcı kararı).
//
//   günlük ücret  = anlaşılan net / 30
//   saatlik ücret = günlük / 8
//   mesai         = mesai saati × saatlik × 1.5
//   pazar/tatil   = gün sayısı × günlük
//   gelmedi kes.  = gelmedi günü × günlük
//   avans taksiti = (kullanıcı bu ay düşülecek tutarı girer)
//
//   Hakediş = anlaşılan net + pazar/tatil + mesai + gider + prim + ek ödeme
//   Toplam  = Hakediş − gelmedi kesintisi − avans

export interface BordroCalcInput {
  agreedNet: number;          // anlaşılan net maaş
  workedDays?: number;        // gün (bilgi amaçlı)
  overtimeHours?: number;     // mesai saati
  sundayHolidayDays?: number; // pazar/resmi tatil gün sayısı
  absentDays?: number;        // gelmedi gün
  advance?: number;           // avans (bu ay düşülecek)
  expense?: number;           // gider
  bonus?: number;             // prim
  extraPayment?: number;      // ek ödeme
}

export interface BordroCalcResult {
  dailyRate: number;
  hourlyRate: number;
  overtimePay: number;
  sundayHolidayPay: number;
  absentDeduction: number;
  hakedis: number;            // brüt hak ediş (kesintiler hariç)
  total: number;              // ödenecek net
}

const n = (v: number | undefined): number => (typeof v === 'number' && isFinite(v) ? v : 0);
const r2 = (v: number): number => Math.round(v * 100) / 100;

export function calcBordro(input: BordroCalcInput): BordroCalcResult {
  const agreed = n(input.agreedNet);
  const dailyRate = agreed / 30;
  const hourlyRate = dailyRate / 8;
  const overtimePay = n(input.overtimeHours) * hourlyRate * 1.5;
  const sundayHolidayPay = n(input.sundayHolidayDays) * dailyRate;
  const absentDeduction = n(input.absentDays) * dailyRate;
  const hakedis = agreed + sundayHolidayPay + overtimePay + n(input.expense) + n(input.bonus) + n(input.extraPayment);
  const total = hakedis - absentDeduction - n(input.advance);
  return {
    dailyRate: r2(dailyRate),
    hourlyRate: r2(hourlyRate),
    overtimePay: r2(overtimePay),
    sundayHolidayPay: r2(sundayHolidayPay),
    absentDeduction: r2(absentDeduction),
    hakedis: r2(hakedis),
    total: r2(total),
  };
}

/** Tabloda gösterilecek para birimi formatı (₺). */
export function fmtTRY(v: number): string {
  return (n(v)).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₺';
}
