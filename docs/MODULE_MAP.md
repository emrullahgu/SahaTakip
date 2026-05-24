# SahaTakip — Modül Haritası

> POZ-DEV-349 Modül & navigation haritası. Tüm ekran/servis prefiksleri.

## Genel Mimari

```
App.tsx
  └─ SafeAreaProvider
     └─ ErrorBoundary
        └─ AuthProvider
           └─ AppProvider
              ├─ ConnectionBanner
              └─ AppNavigator (src/navigation/index.tsx)
                 ├─ AuthStack (Login/Signup/Forgot/Reset)
                 └─ MainStack (~376 Stack.Screen)
                    └─ Tabs (Home/Manager/Map/...)
```

## Ekran Prefiksleri (modül grupları)

| Prefix | Modül | Renk | İkon |
|--------|-------|------|------|
| **Field*** | Saha operasyonları | #22c55e | construct |
| **Asset*** | Varlık yönetimi | #6366f1 | hardware-chip |
| **Cp*** | Müşteri portalı (Customer Portal) | #06b6d4 | people-circle |
| **Ai*** | AI asistan / öneri | #ec4899 | sparkles |
| **Erp*** | ERP entegrasyon | #f59e0b | server |
| **Saas*** | Multi-tenant SaaS | #8b5cf6 | layers |
| **Sec*** | Güvenlik merkezi | #ef4444 | shield-checkmark |
| **Dep*** | Deploy / DevOps | #0ea5e9 | rocket |
| **Qa*** | QA / test | #f97316 | bug |
| **Uat*** | UAT senaryoları | #14b8a6 | flask |
| **Doc*** | Dokümantasyon | #94a3b8 | book |
| **GoLive*** | Canlıya alış | #22c55e | flag |
| **Audit*** | İç denetim | #d946ef | finger-print |
| **Live*** | LiveOps / harita | #10b981 | radio |
| **Ops*** | Operasyon sağlığı | #ef4444 | pulse |
| **Prod*** | Üretim hattı | #6366f1 | cube |
| **Cov*** | Kapsama matrisi (audit) | #6366f1 | scan-circle |
| **Ext*** | 12 entegrasyon harici servis | #7c3aed | link |
| **Adv*** | İleri analitik & AI | #ec4899 | rocket |
| **Ord*** | Sipariş yönetimi (Faz 59) | #f97316 | bag-handle |

## Servis Katmanı (`src/services/`)

- `data/*Repo.ts` — Supabase köprüleri (sessiz fallback, `console.warn`)
- `pdf.ts` / `receiptPdf.ts` / `reportPdf.ts` — PDF üretimi (`expo-print`)
- `crashReporter.ts` — Lokal crash log + global handler
- `notifications.ts` / `pushNotifications.ts` — Bildirim
- `location.ts` + `nearestAssign.ts` — GPS / yakın personel
- `orders.ts` (Faz 59) — Sipariş servisi
- ... (~85 servis)

## Yeni Yardımcılar (Faz 5..16)

- `src/utils/perf.ts` — FlatList defaults, memoization helpers
- `src/utils/a11y.ts` — Accessibility prop üreticileri
- `src/utils/validators.ts` — Form validator registry (TC/IBAN/email/phone)
- `src/utils/urlGuard.ts` — `Linking.openURL` güvenlik sarmalayıcısı
- `src/utils/sessionTimeout.ts` — Oturum zaman aşımı
- `src/utils/logger.ts` — Merkezi log (sink mimarisi)
- `src/hooks/useFormState.ts` — Form state yönetimi
- `src/hooks/useOptimisticMutation.ts` — Optimistic UI mutasyonu
- `src/i18n/{index.ts,tr.json,en.json}` — Lokalizasyon
- `src/themeMode.ts` — Light/Dark token + useTheme
- `src/services/analytics.ts` — Event taksonomisi
- `src/shims/react-native-maps.web.tsx` — Web bundle stub
- `src/components/{EmptyState,ErrorState,LoadingSkeleton,ErrorBoundary}.tsx` — Standart UI

## Konfigürasyon Dosyaları

| Dosya | Amaç |
|-------|------|
| `app.json` | Expo manifest (permissions, plugins, scheme) |
| `eas.json` | EAS build profilleri (dev/preview/production) |
| `metro.config.js` | Metro bundler + web shim resolver |
| `netlify.toml` | Web deploy (SPA fallback + güvenlik başlıkları) |
| `tsconfig.json` | strict + `ignoreDeprecations: "5.0"` |
| `jest.config.js` | Jest test config (kurulum sonrası aktif) |
| `babel.config.js` | Babel preset |
