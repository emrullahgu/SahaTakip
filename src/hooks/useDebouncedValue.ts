// useDebouncedValue — bir değeri belirtilen gecikmeyle "geciktirir".
// Ağır türev hesaplar (ör. 13K ürünlük katalog filtresi) her tuş vuruşunda değil,
// kullanıcı yazmayı bıraktıktan ~delay ms sonra çalışsın diye kullanılır. TextInput
// `value` hızlı kalır (akıcı yazım), filtre debounce edilmiş değerden türetilir.
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
