// repository.test.ts — POZ-DEV-339 repository helpers unit testleri (Faz 5 audit)
import { isUuid, newUuid } from '../repository';

describe('repository helpers', () => {
  describe('isUuid', () => {
    it('geçerli v4 UUID true döner', () => {
      expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });
    it('uppercase UUID true döner', () => {
      expect(isUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });
    it("yerel 'Q-' formatı false döner", () => {
      expect(isUuid('Q-1779712365803')).toBe(false);
    });
    it("'local-...' formatı false döner", () => {
      expect(isUuid('local-1779712365803')).toBe(false);
    });
    it('boş string false döner', () => {
      expect(isUuid('')).toBe(false);
    });
    it('eksik segment false döner', () => {
      expect(isUuid('550e8400-e29b-41d4-a716')).toBe(false);
    });
  });

  describe('newUuid', () => {
    it('üretilen değer UUID formatında', () => {
      const id = newUuid();
      expect(isUuid(id)).toBe(true);
    });
    it('iki çağrı farklı id döner', () => {
      const a = newUuid();
      const b = newUuid();
      expect(a).not.toBe(b);
    });
    it('1000 çağrıda çakışma yok', () => {
      const set = new Set<string>();
      for (let i = 0; i < 1000; i++) set.add(newUuid());
      expect(set.size).toBe(1000);
    });
  });
});
