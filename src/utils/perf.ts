// perf.ts — POZ-DEV-309..312 Performans yardımcıları
// FlatList default props, memoization helpers.
import type { FlatListProps } from 'react-native';

/**
 * FlatList default'ları — large list ekranlarında re-render ve memory baskısını azaltır.
 * Kullanım:
 *   <FlatList {...FLATLIST_DEFAULTS} data={data} renderItem={...} />
 */
export const FLATLIST_DEFAULTS: Partial<FlatListProps<any>> = {
  removeClippedSubviews: true,
  initialNumToRender: 12,
  maxToRenderPerBatch: 12,
  windowSize: 7,
  updateCellsBatchingPeriod: 50,
  keyboardShouldPersistTaps: 'handled',
};

/**
 * Sabit yükseklikli liste öğeleri için `getItemLayout` üretici.
 * @param itemHeight sabit öğe yüksekliği (px)
 */
export function makeGetItemLayout<T>(itemHeight: number) {
  return (_data: ArrayLike<T> | null | undefined, index: number) => ({
    length: itemHeight,
    offset: itemHeight * index,
    index,
  });
}

/**
 * Şallow eşitlik — `React.memo` için custom comparator olarak kullanılabilir.
 */
export function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  if (a === b) return true;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

/**
 * Stabil keyExtractor — `id` yoksa index fallback.
 */
export function keyById<T extends { id?: string | number }>(item: T, index: number): string {
  return item?.id != null ? String(item.id) : `idx_${index}`;
}
