// silenceWarnings.ts — Benign / 3rd party uyarıları üst seviyede filtreler.
// Kullanım: App.tsx içinde `installWarningSilencer()` çağrılır.
//
// Filtrelenenler:
//  - expo-notifications web: "Listening to push token changes is not yet fully supported on web"
//  - react-native-web touch responder: "Cannot record touch end without a touch start"
//
// Not: Sadece console.warn / console.error'ın "match" eden mesajlarını yutar;
// gerçek hatalar / yeni uyarılar olduğu gibi konsola düşmeye devam eder.

const PATTERNS: RegExp[] = [
  /Listening to push token changes is not yet fully supported on web/i,
  /Adding a listener will have no effect/i,
  /Cannot record touch end without a touch start/i,
  /google\.maps\.Marker is deprecated/i,
  /Google Maps JavaScript API has been loaded directly without loading=async/i,
];

let installed = false;

export function installWarningSilencer(): void {
  if (installed) return;
  installed = true;

  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);

  const matches = (args: unknown[]): boolean => {
    try {
      const text = args
        .map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : ''))
        .join(' ');
      return PATTERNS.some((re) => re.test(text));
    } catch {
      return false;
    }
  };

  console.warn = (...args: unknown[]) => {
    if (matches(args)) return;
    origWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    if (matches(args)) return;
    origError(...args);
  };
}
