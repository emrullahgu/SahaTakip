// validators.ts — POZ-DEV-332 Form validator registry
export type Validator = (value: unknown) => string | null;

export const required: (msg?: string) => Validator =
  (msg = 'Bu alan zorunludur') =>
  (v) => {
    if (v == null) return msg;
    if (typeof v === 'string' && v.trim().length === 0) return msg;
    if (Array.isArray(v) && v.length === 0) return msg;
    return null;
  };

export const email: Validator = (v) => {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(s) ? null : 'Geçersiz e-posta';
};

export const phoneTR: Validator = (v) => {
  if (v == null || v === '') return null;
  const s = String(v).replace(/\D/g, '');
  // 5XXXXXXXXX (10 hane) veya 05XXXXXXXXX (11)
  if (s.length === 10 && s.startsWith('5')) return null;
  if (s.length === 11 && s.startsWith('05')) return null;
  return 'Geçersiz telefon';
};

export const tcNo: Validator = (v) => {
  if (v == null || v === '') return null;
  const s = String(v);
  if (!/^[1-9]\d{10}$/.test(s)) return 'TC Kimlik No 11 haneli olmalı';
  const d = s.split('').map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const c10 = (odd * 7 - even) % 10;
  const c11 = (odd + even + d[9]) % 10;
  return c10 === d[9] && c11 === d[10] ? null : 'Geçersiz TC Kimlik No';
};

export const vergiNo: Validator = (v) => {
  if (v == null || v === '') return null;
  const s = String(v);
  return /^\d{10}$/.test(s) ? null : 'Vergi No 10 haneli olmalı';
};

export const iban: Validator = (v) => {
  if (v == null || v === '') return null;
  const s = String(v).toUpperCase().replace(/\s/g, '');
  if (!/^TR\d{24}$/.test(s)) return 'Geçersiz IBAN (TR + 24 hane)';
  return null;
};

export const minLength: (n: number, msg?: string) => Validator = (n, msg) => (v) => {
  if (v == null) return null;
  const s = String(v);
  return s.length >= n ? null : msg ?? `En az ${n} karakter`;
};

export const maxLength: (n: number, msg?: string) => Validator = (n, msg) => (v) => {
  if (v == null) return null;
  const s = String(v);
  return s.length <= n ? null : msg ?? `En çok ${n} karakter`;
};

export const numberRange: (min: number, max: number, msg?: string) => Validator =
  (min, max, msg) => (v) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    if (Number.isNaN(n)) return 'Geçersiz sayı';
    return n >= min && n <= max ? null : msg ?? `${min} - ${max} aralığında olmalı`;
  };

/**
 * Birden fazla validator'ı sırayla çalıştırır, ilk hatayı döndürür.
 */
export function compose(...vs: Validator[]): Validator {
  return (value) => {
    for (const v of vs) {
      const err = v(value);
      if (err) return err;
    }
    return null;
  };
}
