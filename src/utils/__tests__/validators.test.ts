// validators.test.ts — POZ-DEV-339 Validator unit test örnekleri
import {
  required,
  email,
  phoneTR,
  tcNo,
  vergiNo,
  isValidVKN,
  iban,
  minLength,
  numberRange,
  compose,
} from '../validators';

describe('validators', () => {
  describe('required', () => {
    const v = required();
    it('boş string hata verir', () => expect(v('')).not.toBeNull());
    it('null hata verir', () => expect(v(null)).not.toBeNull());
    it('boş dizi hata verir', () => expect(v([])).not.toBeNull());
    it('dolu değer null döner', () => expect(v('abc')).toBeNull());
  });

  describe('email', () => {
    it('geçerli e-posta null', () => expect(email('a@b.co')).toBeNull());
    it('@ yoksa hata', () => expect(email('abc')).not.toBeNull());
    it('boş değer null (opsiyonel alan)', () => expect(email('')).toBeNull());
  });

  describe('phoneTR', () => {
    it('5XXXXXXXXX geçerli', () => expect(phoneTR('5321234567')).toBeNull());
    it('05XXXXXXXXX geçerli', () => expect(phoneTR('05321234567')).toBeNull());
    it('+90 5XX... (905...) geçerli', () => expect(phoneTR('+90 532 123 45 67')).toBeNull());
    it('9 hane hata', () => expect(phoneTR('532123456')).not.toBeNull());
  });

  describe('tcNo', () => {
    it('geçerli TC null döner', () => expect(tcNo('10000000146')).toBeNull());
    it('10 hane hata', () => expect(tcNo('1234567890')).not.toBeNull());
    it('11 hane ama checksum yanlış', () => expect(tcNo('12345678901')).not.toBeNull());
  });

  describe('vergiNo', () => {
    it('geçerli VKN (gerçek firma) null döner', () => expect(vergiNo('5641385589')).toBeNull());
    it('9 hane uzunluk hatası', () => expect(vergiNo('123456789')).toBe('Vergi No 10 haneli olmalı'));
    it('10 hane ama sağlama yanlış → hata', () => expect(vergiNo('5641385588')).toBe('Geçersiz Vergi No (sağlama hatası)'));
    it('boş değer null (opsiyonel alan)', () => expect(vergiNo('')).toBeNull());
  });

  describe('isValidVKN', () => {
    it('gerçek firma VKN geçerli', () => expect(isValidVKN('5641385589')).toBe(true));
    it('yanlış sağlama basamağı geçersiz', () => expect(isValidVKN('5641385588')).toBe(false));
    it('10 haneden farklı geçersiz', () => expect(isValidVKN('123')).toBe(false));
  });

  describe('iban', () => {
    it('TR + 24 hane geçerli', () => expect(iban('TR320010009999901234567890')).toBeNull());
    it('eksik hane hata', () => expect(iban('TR3200100099')).not.toBeNull());
  });

  describe('minLength', () => {
    it('eşit geçerli', () => expect(minLength(3)('abc')).toBeNull());
    it('eksik hata', () => expect(minLength(3)('ab')).not.toBeNull());
  });

  describe('numberRange', () => {
    const v = numberRange(0, 100);
    it('aralıkta null', () => expect(v(50)).toBeNull());
    it('üst sınır geçerli', () => expect(v(100)).toBeNull());
    it('aşma hata', () => expect(v(101)).not.toBeNull());
  });

  describe('compose', () => {
    it('ilk hatayı döndürür', () => {
      const v = compose(required(), email);
      expect(v('')).toBe('Bu alan zorunludur');
      expect(v('abc')).toBe('Geçersiz e-posta');
      expect(v('a@b.co')).toBeNull();
    });
  });
});
