// Faz 51 — Deploy & Platform servisi (dep_*_v1)
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  DepEnvVar, DepSupabaseConfig, DepRlsPolicy, DepStorageBucket,
  DepNetlifyDeploy, DepBuildError, DepAiProvider, DepAiRateLimit,
  DepAiRequestLog, DepApkBuild, DepCheckStatus,
} from '../types';

const K = {
  env: 'dep_env_v1',
  sb: 'dep_sb_v1',
  rls: 'dep_rls_v1',
  storage: 'dep_storage_v1',
  netlify: 'dep_netlify_v1',
  errors: 'dep_errors_v1',
  ai: 'dep_ai_v1',
  rl: 'dep_rl_v1',
  ailog: 'dep_ailog_v1',
  apk: 'dep_apk_v1',
};

export const DEP_STATUS_LABEL: Record<DepCheckStatus, string> = { ok: 'Hazır', warn: 'Uyarı', fail: 'Hata', pending: 'Beklemede' };
export const DEP_STATUS_COLOR: Record<DepCheckStatus, string> = { ok: '#22c55e', warn: '#f59e0b', fail: '#ef4444', pending: '#64748b' };
export const DEP_STATUS_ICON: Record<DepCheckStatus, string> = { ok: 'checkmark-circle', warn: 'warning', fail: 'close-circle', pending: 'time' };

async function getOrSeed<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw) return JSON.parse(raw) as T;
  // Sahte/seed veri yok — diziler boş döner, nesneler fallback olarak verilir.
  return Array.isArray(fallback) ? (([] as unknown) as T) : fallback;
}
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

// --- Env vars
export async function listDepEnvVars(): Promise<DepEnvVar[]> {
  return getOrSeed<DepEnvVar[]>(K.env, [
    { id: 'e1', key: 'EXPO_PUBLIC_SUPABASE_URL', scope: 'mobile', required: true, set: true, masked: 'https://xxx.supabase.co', description: 'Supabase proje URL' },
    { id: 'e2', key: 'EXPO_PUBLIC_SUPABASE_ANON_KEY', scope: 'mobile', required: true, set: true, masked: 'eyJh...8sFQ', description: 'Supabase anon (client) key' },
    { id: 'e3', key: 'SUPABASE_SERVICE_ROLE_KEY', scope: 'server', required: true, set: true, masked: 'eyJh...Tz12', description: 'Supabase service role (sunucu)' },
    { id: 'e4', key: 'OPENAI_API_KEY', scope: 'server', required: true, set: true, masked: 'sk-...4Vbx', description: 'OpenAI API key' },
    { id: 'e5', key: 'ANTHROPIC_API_KEY', scope: 'server', required: false, set: true, masked: 'sk-ant-...QqK', description: 'Anthropic Claude API key (fallback)' },
    { id: 'e6', key: 'EXPO_PUBLIC_APP_URL', scope: 'web', required: true, set: true, masked: 'https://saha.acmesolar.com', description: 'Web app public URL' },
    { id: 'e7', key: 'SENTRY_DSN', scope: 'all', required: false, set: false, description: 'Sentry hata raporlama DSN' },
    { id: 'e8', key: 'EXPO_PUBLIC_GMAPS_KEY', scope: 'mobile', required: true, set: true, masked: 'AIza...kQ8s', description: 'Google Maps API key' },
    { id: 'e9', key: 'NETLIFY_AUTH_TOKEN', scope: 'web', required: false, set: true, masked: 'nfp_...3vKa', description: 'Netlify CI auth token' },
  ]);
}

// --- Supabase config
export async function getDepSupabase(): Promise<DepSupabaseConfig> {
  return getOrSeed<DepSupabaseConfig>(K.sb, {
    projectUrl: 'https://xxxxxxxxxxxxxxxx.supabase.co',
    anonKeySet: true,
    serviceRoleSet: true,
    region: 'eu-central-1 (Frankfurt)',
    dbSize: '1.2 GB',
    monthlyEgress: '4.8 GB / 250 GB',
    authProviders: ['email', 'magic_link', 'google', 'apple'],
    status: 'ok',
  });
}

// --- RLS
export async function listDepRls(): Promise<DepRlsPolicy[]> {
  return getOrSeed<DepRlsPolicy[]>(K.rls, [
    { id: 'r1', table: 'customers', policy: 'tenant_isolation', command: 'all', enabled: true, checkPassed: true, rowsAffected: 1240 },
    { id: 'r2', table: 'work_orders', policy: 'tenant_isolation', command: 'all', enabled: true, checkPassed: true, rowsAffected: 8420 },
    { id: 'r3', table: 'quotes', policy: 'tenant_isolation', command: 'all', enabled: true, checkPassed: true, rowsAffected: 3120 },
    { id: 'r4', table: 'expenses', policy: 'tenant_isolation', command: 'all', enabled: true, checkPassed: true, rowsAffected: 920 },
    { id: 'r5', table: 'users', policy: 'self_or_admin', command: 'select', enabled: true, checkPassed: true, rowsAffected: 138 },
    { id: 'r6', table: 'audit_logs', policy: 'admin_only', command: 'select', enabled: true, checkPassed: true, rowsAffected: 42800 },
    { id: 'r7', table: 'tenant_settings', policy: 'owner_only', command: 'update', enabled: true, checkPassed: true, rowsAffected: 18 },
    { id: 'r8', table: 'legacy_imports', policy: 'tenant_isolation', command: 'all', enabled: false, checkPassed: false, rowsAffected: 12 },
    { id: 'r9', table: 'pozes', policy: 'public_read', command: 'select', enabled: true, checkPassed: true, rowsAffected: 1850 },
  ]);
}

// --- Storage buckets
export async function listDepStorage(): Promise<DepStorageBucket[]> {
  return getOrSeed<DepStorageBucket[]>(K.storage, [
    { id: 's1', name: 'avatars', public: true, sizeMb: 128, fileCount: 142, policies: 2, uploadTestOk: true },
    { id: 's2', name: 'workorder-photos', public: false, sizeMb: 4820, fileCount: 6840, policies: 4, uploadTestOk: true },
    { id: 's3', name: 'quote-pdfs', public: false, sizeMb: 380, fileCount: 1120, policies: 3, uploadTestOk: true },
    { id: 's4', name: 'service-reports', public: false, sizeMb: 1240, fileCount: 3260, policies: 3, uploadTestOk: true },
    { id: 's5', name: 'tenant-logos', public: true, sizeMb: 18, fileCount: 24, policies: 2, uploadTestOk: true },
    { id: 's6', name: 'legacy-imports', public: false, sizeMb: 88, fileCount: 12, policies: 0, uploadTestOk: false },
  ]);
}

// --- Netlify
export async function listDepNetlify(): Promise<DepNetlifyDeploy[]> {
  return getOrSeed<DepNetlifyDeploy[]>(K.netlify, [
    { id: 'n1', status: 'ready', branch: 'main', commit: 'a4f12c3', message: 'Faz 50 — SaaS modülleri tamamlandı', durationSec: 142, createdAt: daysAgo(0), publishUrl: 'https://sahatakip.netlify.app' },
    { id: 'n2', status: 'ready', branch: 'main', commit: '8b21d09', message: 'Faz 49 — Güvenlik & KVKK', durationSec: 138, createdAt: daysAgo(1), publishUrl: 'https://sahatakip.netlify.app' },
    { id: 'n3', status: 'error', branch: 'feature/portal-v2', commit: '5c83f10', message: 'Müşteri portalı 2.0 deneme', durationSec: 96, createdAt: daysAgo(2) },
    { id: 'n4', status: 'ready', branch: 'main', commit: 'fe902a1', message: 'Faz 48 finalize', durationSec: 151, createdAt: daysAgo(3), publishUrl: 'https://sahatakip.netlify.app' },
    { id: 'n5', status: 'building', branch: 'hotfix/quote-totals', commit: 'd0a47b2', message: 'Teklif toplam hesaplama düzeltmesi', durationSec: 28, createdAt: daysAgo(0) },
  ]);
}

// --- Build errors
export async function listDepErrors(): Promise<DepBuildError[]> {
  return getOrSeed<DepBuildError[]>(K.errors, [
    { id: 'b1', file: 'node_modules/expo/tsconfig.base.json', line: 10, message: 'TS6046: --module dışsal uyarı (yoksay)', severity: 'warning', platform: 'web', category: 'config', fixed: false },
    { id: 'b2', file: 'src/screens/MapScreen.tsx', line: 84, message: 'Unused import "Marker"', severity: 'warning', platform: 'web', category: 'lint', fixed: true },
    { id: 'b3', file: 'src/services/pdf.ts', line: 32, message: 'Parameter "x" implicitly has any type', severity: 'warning', platform: 'web', category: 'typescript', fixed: true },
    { id: 'b4', file: 'package.json', line: 1, message: 'react-native-svg peer dep uyumsuz', severity: 'warning', platform: 'mobile', category: 'dependency', fixed: true },
    { id: 'b5', file: 'app.json', line: 28, message: 'ACCESS_BACKGROUND_LOCATION izni eksik', severity: 'error', platform: 'mobile', category: 'config', fixed: true },
    { id: 'b6', file: 'src/services/ai.ts', line: 12, message: 'process.env.OPENAI_API_KEY referansı runtime fallback eksik', severity: 'warning', platform: 'web', category: 'config', fixed: true },
    { id: 'b7', file: 'assets/icon.png', line: 1, message: 'İkon 1024x1024 olmalı (mevcut 512x512)', severity: 'error', platform: 'mobile', category: 'asset', fixed: true },
    { id: 'b8', file: 'src/screens/QuoteDetailScreen.tsx', line: 218, message: 'Eslint: react-hooks/exhaustive-deps', severity: 'warning', platform: 'web', category: 'lint', fixed: true },
  ]);
}

export async function toggleErrorFixed(id: string): Promise<void> {
  const list = await listDepErrors();
  const next = list.map(b => b.id === id ? { ...b, fixed: !b.fixed } : b);
  await AsyncStorage.setItem(K.errors, JSON.stringify(next));
}

// --- AI providers
export async function listDepAiProviders(): Promise<DepAiProvider[]> {
  return getOrSeed<DepAiProvider[]>(K.ai, [
    { id: 'p1', name: 'OpenAI', model: 'gpt-4o-mini', apiKeySet: true, priority: 1, fallback: false, status: 'active', latencyMs: 820, successRate: 99.4, costPer1kTokens: 0.15 },
    { id: 'p2', name: 'Anthropic', model: 'claude-3.5-sonnet', apiKeySet: true, priority: 2, fallback: true, status: 'active', latencyMs: 1240, successRate: 99.1, costPer1kTokens: 3.00 },
    { id: 'p3', name: 'Local (Ollama)', model: 'llama3.1:8b', apiKeySet: false, priority: 3, fallback: true, status: 'inactive', latencyMs: 2400, successRate: 92.0, costPer1kTokens: 0 },
  ]);
}

// --- AI security
export async function listDepRateLimits(): Promise<DepAiRateLimit[]> {
  return getOrSeed<DepAiRateLimit[]>(K.rl, [
    { id: 'rl1', role: 'admin', requestsPerMin: 120, tokensPerDay: 500000, enabled: true },
    { id: 'rl2', role: 'manager', requestsPerMin: 60, tokensPerDay: 100000, enabled: true },
    { id: 'rl3', role: 'staff', requestsPerMin: 30, tokensPerDay: 25000, enabled: true },
    { id: 'rl4', role: 'customer', requestsPerMin: 10, tokensPerDay: 5000, enabled: true },
  ]);
}

export async function listDepAiLogs(): Promise<DepAiRequestLog[]> {
  return getOrSeed<DepAiRequestLog[]>(K.ailog, [
    { id: 'l1', at: daysAgo(0), user: 'ahmet@acme.com', role: 'manager', provider: 'OpenAI', tokens: 1240, durationMs: 920, status: 'ok' },
    { id: 'l2', at: daysAgo(0), user: 'mehmet@acme.com', role: 'staff', provider: 'OpenAI', tokens: 380, durationMs: 740, status: 'ok' },
    { id: 'l3', at: daysAgo(0), user: 'mehmet@acme.com', role: 'staff', provider: 'OpenAI', tokens: 0, durationMs: 12, status: 'rate_limited' },
    { id: 'l4', at: daysAgo(0), user: 'ayse@acme.com', role: 'admin', provider: 'Anthropic', tokens: 4200, durationMs: 2840, status: 'ok' },
    { id: 'l5', at: daysAgo(1), user: 'fatma@acme.com', role: 'manager', provider: 'OpenAI', tokens: 820, durationMs: 1120, status: 'error' },
    { id: 'l6', at: daysAgo(1), user: 'cem@acme.com', role: 'staff', provider: 'OpenAI', tokens: 540, durationMs: 880, status: 'ok' },
  ]);
}

// --- APK builds
export async function listDepApkBuilds(): Promise<DepApkBuild[]> {
  return getOrSeed<DepApkBuild[]>(K.apk, [
    { id: 'a1', version: '1.50.0', versionCode: 150, buildNumber: '#2026.142', profile: 'production', sizeMb: 38.2, builtAt: daysAgo(0), status: 'completed', downloadUrl: 'https://expo.dev/artifacts/...', installTestPassed: true, smokeTestPassed: true, notes: 'Faz 50 — SaaS modülleri' },
    { id: 'a2', version: '1.49.1', versionCode: 149, buildNumber: '#2026.138', profile: 'preview', sizeMb: 37.8, builtAt: daysAgo(2), status: 'completed', downloadUrl: 'https://expo.dev/artifacts/...', installTestPassed: true, smokeTestPassed: true, notes: 'Faz 49 — Güvenlik & KVKK' },
    { id: 'a3', version: '1.49.0', versionCode: 148, buildNumber: '#2026.131', profile: 'production', sizeMb: 37.6, builtAt: daysAgo(5), status: 'completed', downloadUrl: 'https://expo.dev/artifacts/...', installTestPassed: true, smokeTestPassed: true },
    { id: 'a4', version: '1.48.0', versionCode: 147, buildNumber: '#2026.118', profile: 'production', sizeMb: 36.4, builtAt: daysAgo(12), status: 'failed', installTestPassed: false, smokeTestPassed: false, notes: 'Imzalama hatası, yenilendi (a3)' },
    { id: 'a5', version: '1.51.0', versionCode: 151, buildNumber: '#2026.145', profile: 'preview', sizeMb: 0, builtAt: daysAgo(0), status: 'in_progress', installTestPassed: false, smokeTestPassed: false, notes: 'Faz 51 derleme devam ediyor' },
  ]);
}
