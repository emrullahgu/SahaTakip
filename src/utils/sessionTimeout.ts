// sessionTimeout.ts — POZ-DEV-337 Oturum zaman aşımı + biyometrik kilit hazırlığı
import { AppState, type AppStateStatus } from 'react-native';

export interface SessionTimeoutOptions {
  /** İnaktif kalma süresi (ms). Varsayılan 15dk. */
  timeoutMs?: number;
  /** Zaman dolduğunda çağrılır (logout / kilit ekranı). */
  onTimeout: () => void;
  /** İsteğe bağlı: kullanıcı aktivitesi geri dönüldüğünde. */
  onResume?: () => void;
}

let lastActivityAt = Date.now();
let timer: ReturnType<typeof setTimeout> | null = null;
let subscription: { remove: () => void } | null = null;

export function startSessionTimeout(opts: SessionTimeoutOptions): () => void {
  const timeoutMs = opts.timeoutMs ?? 15 * 60 * 1000;

  const reset = () => {
    lastActivityAt = Date.now();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      opts.onTimeout();
    }, timeoutMs);
  };

  const handleAppState = (state: AppStateStatus) => {
    if (state === 'active') {
      const elapsed = Date.now() - lastActivityAt;
      if (elapsed >= timeoutMs) {
        opts.onTimeout();
      } else {
        opts.onResume?.();
        reset();
      }
    } else {
      lastActivityAt = Date.now();
    }
  };

  subscription = AppState.addEventListener('change', handleAppState);
  reset();

  return () => {
    if (timer) clearTimeout(timer);
    subscription?.remove();
    timer = null;
    subscription = null;
  };
}

export function bumpActivity(): void {
  lastActivityAt = Date.now();
}
