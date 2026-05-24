# Changelog — SahaTakip

> POZ-DEV-350 Sürüm notları. Son sürüm en üstte.

## [Unreleased] — 2026-05-24

### Eklendi (Faz 5..21)
- **Performans (Faz 5)** — `src/utils/perf.ts`: `FLATLIST_DEFAULTS`, `makeGetItemLayout`, `shallowEqual`, `keyById`.
- **Erişilebilirlik (Faz 6)** — `src/utils/a11y.ts`: `a11yButton`, `a11yLink`, `a11yInput`, `HIT_SLOP_*`, `MIN_TOUCH_SIZE`.
- **Standart durum bileşenleri (Faz 7)** — `EmptyState`, `ErrorState`, `LoadingSkeleton` (+ `SkeletonBlock`).
- **Offline / Optimistic (Faz 8)** — `useOptimisticMutation` hook.
- **i18n (Faz 9)** — `src/i18n/{index.ts,tr.json,en.json}`, `useT`, `formatCurrency`, `formatDate` (Intl tabanlı).
- **Theme (Faz 10)** — `src/themeMode.ts`: light/dark palette, `useTheme` hook, sistem teması algılama.
- **Form (Faz 11)** — `validators.ts` (TC/IBAN/email/phone/required/minLength/numberRange/compose), `useFormState` hook.
- **Güvenlik (Faz 12)** — `urlGuard.ts` (`openUrlSafe` şema beyaz listesi), `sessionTimeout.ts`.
- **Test (Faz 13)** — `jest.config.js`, `jest.setup.js`, `__tests__/validators.test.ts`, `__tests__/orders.test.ts`.
- **Gözlemlenebilirlik (Faz 15)** — `logger.ts` (sink mimarisi), `analytics.ts` (event taksonomisi).
- **Dokümantasyon (Faz 16)** — `docs/MODULE_MAP.md`, `docs/SMOKE_TESTS.md`, `CHANGELOG.md`.
- **Nav audit script (Faz 17)** — `scripts/audit-nav.js` ekran↔route farkı tespiti.
- **Crash önleme (Faz 20)** — Top-level `ErrorBoundary` (`App.tsx`).

### Değişti (Faz 18-19)
- `metro.config.js` — `react-native-maps` web shim resolver.
- `eas.json` — `appVersionSource: local`, `autoIncrement: true`.
- `netlify.toml` — HSTS + X-XSS-Protection + assets immutable cache.
- `tsconfig.json` — `ignoreDeprecations: "5.0"`, `exclude: node_modules`.

## [Faz 59] — 2026-05-24 (önceki)
- **Sipariş yönetimi (Ord*)** — 6 ekran (Hub/List/Form/Detail/Recurring/Analytics), `services/orders.ts`, types, navigation, Manager tile.

## [Faz 58] — 2026-05-22
- **İleri analitik (Adv*)** — VoiceAI, CollectionForecast, RFM ekranları + `services/advanced.ts`.

## [Faz 57] — 2026-05-20
- **External integrations (Ext*)** — 12 entegrasyon, `services/extensions.ts`.

## [Faz 56] — 2026-05-18
- **Coverage matrix (Cov*)** — 23 kategorili kapsama audit.

## [Faz 0-55]
- Detaylar için `POZ_ROADMAP.md` ve git geçmişi.
