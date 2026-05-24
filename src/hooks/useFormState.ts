// useFormState.ts — POZ-DEV-331 Form state yönetimi (touched/dirty/errors)
import { useCallback, useMemo, useState } from 'react';
import type { Validator } from '../utils/validators';

type Schema<T> = { [K in keyof T]?: Validator };

interface UseFormStateOptions<T> {
  initial: T;
  schema?: Schema<T>;
}

export function useFormState<T extends Record<string, any>>(opts: UseFormStateOptions<T>) {
  const [values, setValues] = useState<T>(opts.initial);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as any);

  const errors = useMemo(() => {
    const result: Partial<Record<keyof T, string>> = {};
    if (!opts.schema) return result;
    for (const key in opts.schema) {
      const validator = opts.schema[key];
      if (validator) {
        const err = validator(values[key]);
        if (err) result[key] = err;
      }
    }
    return result;
  }, [values, opts.schema]);

  const isValid = Object.keys(errors).length === 0;
  const isDirty = useMemo(() => {
    for (const k in opts.initial) {
      if (opts.initial[k] !== values[k]) return true;
    }
    return false;
  }, [values, opts.initial]);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const touch = useCallback(<K extends keyof T>(key: K) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  const touchAll = useCallback(() => {
    const all = {} as Record<keyof T, boolean>;
    for (const k in opts.initial) all[k] = true;
    setTouched(all);
  }, [opts.initial]);

  const reset = useCallback(() => {
    setValues(opts.initial);
    setTouched({} as any);
  }, [opts.initial]);

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    setField,
    touch,
    touchAll,
    reset,
    setValues,
  };
}
