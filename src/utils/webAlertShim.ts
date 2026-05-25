/**
 * Web Alert Polyfill
 * --------------------
 * react-native-web'de `Alert.alert(title, message, buttons[])` çağrılarındaki
 * butonların onPress callback'leri çağrılmaz (RN-Web Alert.alert no-op'tur).
 * Bu sebeple "Sil / Bitir / Onayla" gibi onay akışları web'de sessizce ölür.
 *
 * Bu modül, web'de Alert.alert'i `window.confirm` / `window.alert` ile sarmalar:
 * - 1 buton  -> window.alert(title + message), buton onPress'i hemen çağrılır
 * - 2-3 buton -> window.confirm; OK -> destructive/default buton, Cancel -> cancel buton
 * Idempotent: tek seferlik install eder.
 */
import { Alert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: ((value?: string) => void) | null;
  style?: 'default' | 'cancel' | 'destructive';
};

let installed = false;

export function installWebAlertShim(): void {
  if (installed) return;
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined') return;
  installed = true;

  const originalAlert = Alert.alert;

  Alert.alert = ((
    title: string,
    message?: string,
    buttons?: AlertButton[],
    _options?: unknown,
  ) => {
    const text = message ? `${title}\n\n${message}` : title;
    const btns = buttons ?? [];

    try {
      if (btns.length <= 1) {
        // eslint-disable-next-line no-alert
        window.alert(text);
        const onPress = btns[0]?.onPress;
        if (typeof onPress === 'function') {
          try { onPress(); } catch (e) { console.warn('[webAlertShim] onPress', e); }
        }
        return;
      }

      // 2-3 button case: prefer destructive/default as "OK", cancel as "Cancel"
      const cancelBtn =
        btns.find(b => b.style === 'cancel') ?? btns[0];
      const confirmBtn =
        btns.find(b => b.style === 'destructive') ??
        btns.find(b => b.style === 'default') ??
        btns.find(b => b !== cancelBtn) ??
        btns[btns.length - 1];

      // eslint-disable-next-line no-alert
      const ok = window.confirm(text);
      const cb = ok ? confirmBtn?.onPress : cancelBtn?.onPress;
      if (typeof cb === 'function') {
        try { cb(); } catch (e) { console.warn('[webAlertShim] cb', e); }
      }
    } catch (e) {
      console.warn('[webAlertShim] failed, falling back to original', e);
      try { originalAlert(title, message, buttons as any); } catch {}
    }
  }) as typeof Alert.alert;
}
