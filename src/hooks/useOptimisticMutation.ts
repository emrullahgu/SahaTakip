// useOptimisticMutation.ts — POZ-DEV-323 Optimistic UI helper
import { useCallback, useEffect, useRef, useState } from 'react';

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
 */
export function useOptimisticMutation<T, A>(opts: Options<T, A>, initial: T) {
  const [state, setState] = useState<State<T>>({ data: initial, pending: false, error: null });
  const previousRef = useRef<T>(initial);
  const dataRef = useRef<T>(initial);
  const optsRef = useRef(opts);
  const isMountedRef = useRef(true);

  // En güncel data ve opts'u ref'lerde tut — mutate sabit kalsın, render döngüsü oluşmasın.
  dataRef.current = state.data;
  optsRef.current = opts;

  useEffect(() => () => { isMountedRef.current = false; }, []);

  const mutate = useCallback(async (args: A) => {
    const current = dataRef.current;
    previousRef.current = current;
    const optimistic = optsRef.current.apply(current, args);
    if (isMountedRef.current) {
      setState({ data: optimistic, pending: true, error: null });
    }
    try {
      const result = await optsRef.current.commit(args);
      if (!isMountedRef.current) return;
      setState({
        data: (result ?? optimistic) as T,
        pending: false,
        error: null,
      });
    } catch (e) {
      if (!isMountedRef.current) return;
      const err = e instanceof Error ? e : new Error(String(e));
      const rolled = optsRef.current.rollback
        ? optsRef.current.rollback(previousRef.current, args)
        : previousRef.current;
      setState({ data: rolled, pending: false, error: err });
    }
  }, []);

  const reset = useCallback(() => {
    if (isMountedRef.current) setState({ data: initial, pending: false, error: null });
  }, [initial]);

  return { ...state, mutate, reset };
}
