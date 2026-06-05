// catalogOverrides — fiyat override + silme uygulanması
import { applyOverrides, deletedIds, type OverrideMap } from '../catalogOverrides';

const base: any[] = [
  { id: 'a', name: 'Ürün A', price: 100 },
  { id: 'b', name: 'Ürün B', price: 200 },
  { id: 'c', name: 'Ürün C', price: 300 },
];

describe('applyOverrides', () => {
  it('override yoksa base aynen döner', () => {
    expect(applyOverrides(base, {})).toBe(base);
  });

  it('fiyat override uygular, silineni çıkarır', () => {
    const ovr: OverrideMap = { a: { price: 150, deleted: false }, b: { deleted: true } };
    const out = applyOverrides(base, ovr);
    expect(out).toHaveLength(2);             // b silindi
    expect(out.find(x => x.id === 'a')!.price).toBe(150); // a fiyatı güncellendi
    expect(out.find(x => x.id === 'c')!.price).toBe(300); // c değişmedi
    expect(out.find(x => x.id === 'b')).toBeUndefined();
  });

  it('isim override uygular', () => {
    const ovr: OverrideMap = { a: { name: 'Yeni Ad A', deleted: false } };
    const out = applyOverrides(base, ovr);
    expect(out.find(x => x.id === 'a')!.name).toBe('Yeni Ad A');
    expect(out.find(x => x.id === 'a')!.price).toBe(100); // fiyat değişmedi
  });

  it('ad + fiyat birlikte override edilir', () => {
    const ovr: OverrideMap = { b: { name: 'B2', price: 250, deleted: false } };
    const out = applyOverrides(base, ovr);
    const b = out.find(x => x.id === 'b')!;
    expect(b.name).toBe('B2');
    expect(b.price).toBe(250);
  });

  it('deletedIds yalnız silinenleri verir', () => {
    const ovr: OverrideMap = { a: { deleted: false }, b: { deleted: true }, c: { deleted: true } };
    expect(deletedIds(ovr).sort()).toEqual(['b', 'c']);
  });
});
