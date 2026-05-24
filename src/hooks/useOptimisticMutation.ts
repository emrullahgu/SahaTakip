// useOptimisticMutation.ts — POZ-DEV-323 Optimistic UI helper
import { useCallback, useRef, useState } from 'react';

interface State<T> {
  data: T;
  pending: boolean;
  error: Error | null;
}

interface Options<T, A> {
  apply: (current: T, args: A) => T; // optimistic predikte
  commit: (args: A) => Promise<T | void>; // gerçek sunucu çağrısı
  rollback?: (current: T, args: A) => T; // hata durumunda geri al
}

/**
 * Optimistic UI mutasyonu — önce UI'ı güncelle, sonra `commit`. Hata olursa `rollback`.
 *
 * @example
 *   const { data, pending, mutate } = useOptimisticMutation({
 *     apply: (orders, newOrder) => [newOrder, ...orders],
 *     commit: (newOrder) => api.createOrder(newOrder),
 *   }, initialOrders);
 */
export function useOptimisticMutation<T, A>(opts: Options<T, A>, initial: T) {
  const [state, setState] = useState<State<T>>({ data: initial, pending: false, error: null });
  const previousRef = useRef<T>(initial);

  const mutate = useCallback(
    async (args: A) => {
      previousRef.current = state.data;
      const optimistic = opts.apply(state.data, args);
      setState({ data: optimistic, pending: true, error: null });
      try {
        const result = await opts.commit(args);
        setState({
          data: (result ?? optimistic) as T,
          pending: false,
          error: null,
        });
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        const rolled = opts.rollback ? opts.rollback(previousRef.current, args) : previousRef.current;
        setState({ data: rolled, pending: false, error: err });
      }
    },
    [opts, state.data],
  );

  return { ...state, mutate, reset: () => setState({ data: initial, pending: false, error: null }) };
}
