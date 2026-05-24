// Faz 52 — Code Quality & Refactor servisi (qa_*_v1)
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  QaConsoleLog, QaUnusedFile, QaSharedComponent, QaApiErrorRule,
  QaUiStateAudit, QaTypeIssue, QaModuleAudit, QaRenderMetric,
  QaQueryAudit, QaQualityKpi, QaStatus, QaSeverity,
} from '../types';

const K = {
  console: 'qa_console_v1',
  unused: 'qa_unused_v1',
  shared: 'qa_shared_v1',
  api: 'qa_api_v1',
  ui: 'qa_ui_v1',
  types: 'qa_types_v1',
  modules: 'qa_modules_v1',
  render: 'qa_render_v1',
  query: 'qa_query_v1',
  kpi: 'qa_kpi_v1',
};

export const QA_STATUS_LABEL: Record<QaStatus, string> = { open: 'Açık', fixed: 'Düzeltildi', ignored: 'Yoksayıldı' };
export const QA_STATUS_COLOR: Record<QaStatus, string> = { open: '#ef4444', fixed: '#22c55e', ignored: '#64748b' };
export const QA_SEV_COLOR: Record<QaSeverity, string> = { error: '#ef4444', warning: '#f59e0b', info: '#0ea5e9' };

async function getOrSeed<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw) return JSON.parse(raw) as T;
  // Sahte/seed veri yok — diziler boş, nesneler s�f�r alanl� fallback ile döner.
  return Array.isArray(fallback) ? (([] as unknown) as T) : fallback;
}
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

export async function listQaConsoleLogs(): Promise<QaConsoleLog[]> {
  return getOrSeed<QaConsoleLog[]>(K.console, [
    { id: 'c1', level: 'warn', message: 'Each child in a list should have a unique "key" prop', source: 'QuotesScreen', count: 42, lastSeen: daysAgo(0), status: 'fixed' },
    { id: 'c2', level: 'warn', message: 'Setting a timer for a long period of time (Android)', source: 'services/location.ts', count: 8, lastSeen: daysAgo(1), status: 'fixed' },
    { id: 'c3', level: 'error', message: 'TypeError: Cannot read property "map" of undefined', source: 'CustomerHistoryScreen', count: 3, lastSeen: daysAgo(2), status: 'fixed' },
    { id: 'c4', level: 'warn', message: 'react-hooks/exhaustive-deps missing', source: 'QuoteDetailScreen', count: 12, lastSeen: daysAgo(0), status: 'open' },
    { id: 'c5', level: 'info', message: 'Slow render detected (218ms)', source: 'BiHubScreen', count: 6, lastSeen: daysAgo(0), status: 'open' },
    { id: 'c6', level: 'warn', message: 'shadow* style props deprecated, use boxShadow', source: 'StatusBadge', count: 18, lastSeen: daysAgo(1), status: 'ignored' },
    { id: 'c7', level: 'error', message: 'Network request failed (offline)', source: 'services/supabase.ts', count: 4, lastSeen: daysAgo(0), status: 'fixed' },
    { id: 'c8', level: 'warn', message: 'AsyncStorage extracted from react-native core', source: 'context/AppContext', count: 1, lastSeen: daysAgo(3), status: 'fixed' },
  ]);
}

export async function listQaUnusedFiles(): Promise<QaUnusedFile[]> {
  return getOrSeed<QaUnusedFile[]>(K.unused, [
    { id: 'u1', path: 'src/components/legacy/OldQuoteCard.tsx', kind: 'component', sizeKb: 4.2, lastModified: daysAgo(180), removable: true },
    { id: 'u2', path: 'src/hooks/useDeprecatedAuth.ts', kind: 'hook', sizeKb: 1.8, lastModified: daysAgo(120), removable: true },
    { id: 'u3', path: 'src/services/firestore-mock.ts', kind: 'service', sizeKb: 6.4, lastModified: daysAgo(220), removable: true },
    { id: 'u4', path: 'src/utils/csv-old.ts', kind: 'util', sizeKb: 2.1, lastModified: daysAgo(90), removable: true },
    { id: 'u5', path: 'src/screens/PrototypeMapScreen.tsx', kind: 'screen', sizeKb: 12.0, lastModified: daysAgo(150), removable: true },
    { id: 'u6', path: 'src/types/legacy.ts', kind: 'type', sizeKb: 3.4, lastModified: daysAgo(95), removable: true },
    { id: 'u7', path: 'src/components/charts/OldBarChart.tsx', kind: 'component', sizeKb: 5.6, lastModified: daysAgo(70), removable: false },
  ]);
}

export async function listQaShared(): Promise<QaSharedComponent[]> {
  return getOrSeed<QaSharedComponent[]>(K.shared, [
    { id: 's1', name: 'FormField', category: 'form', usageCount: 142, filesUsing: 38, refactored: true, description: 'Tek satır label+input wrapper' },
    { id: 's2', name: 'DataTable', category: 'table', usageCount: 28, filesUsing: 28, refactored: true, description: 'Sıralanabilir/filtrelenebilir tablo' },
    { id: 's3', name: 'ConfirmModal', category: 'modal', usageCount: 56, filesUsing: 42, refactored: true, description: 'Onay/iptal modalı' },
    { id: 's4', name: 'PrimaryButton', category: 'button', usageCount: 218, filesUsing: 82, refactored: true, description: 'Ana eylem butonu' },
    { id: 's5', name: 'EmptyState', category: 'state', usageCount: 64, filesUsing: 64, refactored: true, description: 'Boş liste durumu' },
    { id: 's6', name: 'LoadingSpinner', category: 'state', usageCount: 82, filesUsing: 70, refactored: true, description: 'Yükleniyor göstergesi' },
    { id: 's7', name: 'ErrorBoundary', category: 'state', usageCount: 12, filesUsing: 12, refactored: true, description: 'React hata sınırı' },
    { id: 's8', name: 'StatCard', category: 'card', usageCount: 38, filesUsing: 24, refactored: true, description: 'KPI/istatistik kartı' },
    { id: 's9', name: 'StatusBadge', category: 'card', usageCount: 142, filesUsing: 68, refactored: true, description: 'Durum renkli rozet' },
    { id: 's10', name: 'PhotoPicker', category: 'form', usageCount: 22, filesUsing: 18, refactored: false, description: 'Galeri/kamera fotoğraf seçici' },
  ]);
}

export async function listQaApiErrors(): Promise<QaApiErrorRule[]> {
  return getOrSeed<QaApiErrorRule[]>(K.api, [
    { id: 'a1', pattern: 'Network request failed', category: 'network', userMessage: 'İnternet bağlantınızı kontrol edin', retryable: true, enabled: true, hits: 124 },
    { id: 'a2', pattern: 'JWT expired', category: 'auth', userMessage: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın', retryable: false, enabled: true, hits: 38 },
    { id: 'a3', pattern: 'duplicate key value', category: 'validation', userMessage: 'Bu kayıt zaten mevcut', retryable: false, enabled: true, hits: 12 },
    { id: 'a4', pattern: 'permission denied', category: 'auth', userMessage: 'Bu işlem için yetkiniz yok', retryable: false, enabled: true, hits: 22 },
    { id: 'a5', pattern: '500 Internal Server', category: 'server', userMessage: 'Sunucu hatası, lütfen daha sonra deneyin', retryable: true, enabled: true, hits: 8 },
    { id: 'a6', pattern: 'timeout', category: 'timeout', userMessage: 'İstek zaman aşımına uğradı', retryable: true, enabled: true, hits: 42 },
    { id: 'a7', pattern: 'invalid input syntax', category: 'validation', userMessage: 'Geçersiz veri formatı', retryable: false, enabled: true, hits: 4 },
  ]);
}

export async function listQaUiStates(): Promise<QaUiStateAudit[]> {
  return getOrSeed<QaUiStateAudit[]>(K.ui, [
    { id: 'i1', screen: 'CustomersScreen', loadingOk: true, emptyOk: true, errorOk: true },
    { id: 'i2', screen: 'WorkOrdersScreen', loadingOk: true, emptyOk: true, errorOk: true },
    { id: 'i3', screen: 'QuotesScreen', loadingOk: true, emptyOk: true, errorOk: true },
    { id: 'i4', screen: 'ServicesScreen', loadingOk: true, emptyOk: false, errorOk: true, notes: 'Empty state placeholder eksik' },
    { id: 'i5', screen: 'ExpensesScreen', loadingOk: true, emptyOk: true, errorOk: true },
    { id: 'i6', screen: 'ReportsScreen', loadingOk: true, emptyOk: true, errorOk: false, notes: 'Hata mesajı görünmüyor' },
    { id: 'i7', screen: 'MapScreen', loadingOk: false, emptyOk: true, errorOk: true, notes: 'Yer izni bekleyiş ekranı eklenecek' },
    { id: 'i8', screen: 'NotificationsScreen', loadingOk: true, emptyOk: true, errorOk: true },
  ]);
}

export async function listQaTypes(): Promise<QaTypeIssue[]> {
  return getOrSeed<QaTypeIssue[]>(K.types, [
    { id: 't1', file: 'src/services/pdf.ts', line: 32, kind: 'implicit-any', snippet: 'function build(x) {', fixed: true },
    { id: 't2', file: 'src/screens/MapScreen.tsx', line: 84, kind: 'any', snippet: 'const m: any = ref.current', fixed: true },
    { id: 't3', file: 'src/services/excel.ts', line: 12, kind: 'loose-cast', snippet: 'row as any as QuoteItem', fixed: false },
    { id: 't4', file: 'src/components/charts/Bar.tsx', line: 22, kind: 'missing-return', snippet: 'function fmt(n) { ... }', fixed: true },
    { id: 't5', file: 'src/utils/csv.ts', line: 8, kind: 'any', snippet: 'parse: (raw: any) => any', fixed: false },
    { id: 't6', file: 'src/types/legacy.ts', line: 1, kind: 'unused-type', snippet: 'export type LegacyQuote = ...', fixed: true },
  ]);
}

export async function listQaModules(): Promise<QaModuleAudit[]> {
  return getOrSeed<QaModuleAudit[]>(K.modules, [
    { id: 'm1', folder: 'src/screens', files: 240, cohesion: 'mixed', suggestion: 'Domain bazlı alt klasörler önerilir (quote/, workorder/, customer/)' },
    { id: 'm2', folder: 'src/services', files: 38, cohesion: 'good' },
    { id: 'm3', folder: 'src/components', files: 28, cohesion: 'good' },
    { id: 'm4', folder: 'src/types', files: 1, cohesion: 'poor', suggestion: '3600+ satır tek dosya — domain bazlı bölünmeli' },
    { id: 'm5', folder: 'src/context', files: 2, cohesion: 'good' },
    { id: 'm6', folder: 'src/navigation', files: 1, cohesion: 'mixed', suggestion: '1700+ satır navigator — stack/tab dosyalarına bölünebilir' },
    { id: 'm7', folder: 'src/data', files: 2, cohesion: 'good' },
  ]);
}

export async function listQaRender(): Promise<QaRenderMetric[]> {
  return getOrSeed<QaRenderMetric[]>(K.render, [
    { id: 'r1', screen: 'BiHubScreen', avgRenderMs: 218, rerenders: 4, optimized: false },
    { id: 'r2', screen: 'WorkOrdersScreen', avgRenderMs: 142, rerenders: 3, listSize: 240, optimized: true, technique: 'virtualization' },
    { id: 'r3', screen: 'CustomersScreen', avgRenderMs: 96, rerenders: 2, listSize: 180, optimized: true, technique: 'memo' },
    { id: 'r4', screen: 'QuotesScreen', avgRenderMs: 124, rerenders: 3, listSize: 90, optimized: true, technique: 'memo' },
    { id: 'r5', screen: 'QuoteDetailScreen', avgRenderMs: 168, rerenders: 6, optimized: false },
    { id: 'r6', screen: 'MapScreen', avgRenderMs: 380, rerenders: 8, optimized: false },
    { id: 'r7', screen: 'ManagerScreen', avgRenderMs: 84, rerenders: 2, optimized: true, technique: 'memo' },
    { id: 'r8', screen: 'HomeScreen', avgRenderMs: 62, rerenders: 1, optimized: true, technique: 'callback' },
  ]);
}

export async function listQaQueries(): Promise<QaQueryAudit[]> {
  return getOrSeed<QaQueryAudit[]>(K.query, [
    { id: 'q1', table: 'customers', callSite: 'CustomersScreen.load', rowsTypical: 180, hasSelect: true, hasIndex: true, duplicate: false, optimized: true },
    { id: 'q2', table: 'work_orders', callSite: 'WorkOrdersScreen.load', rowsTypical: 240, hasSelect: true, hasIndex: true, duplicate: false, optimized: true },
    { id: 'q3', table: 'quotes', callSite: 'QuotesScreen.load', rowsTypical: 90, hasSelect: true, hasIndex: true, duplicate: false, optimized: true },
    { id: 'q4', table: 'expenses', callSite: 'ManagerScreen.kpi', rowsTypical: 320, hasSelect: false, hasIndex: true, duplicate: true, optimized: false },
    { id: 'q5', table: 'audit_logs', callSite: 'AuditLogScreen.load', rowsTypical: 5000, hasSelect: true, hasIndex: false, duplicate: false, optimized: false },
    { id: 'q6', table: 'work_orders', callSite: 'HomeScreen.summary', rowsTypical: 240, hasSelect: false, hasIndex: true, duplicate: true, optimized: false },
    { id: 'q7', table: 'pozes', callSite: 'NewQuoteScreen.search', rowsTypical: 1850, hasSelect: true, hasIndex: true, duplicate: false, optimized: true },
    { id: 'q8', table: 'notifications', callSite: 'NotificationsScreen.load', rowsTypical: 80, hasSelect: true, hasIndex: true, duplicate: false, optimized: true },
  ]);
}

export async function getQaKpi(): Promise<QaQualityKpi> {
  return getOrSeed<QaQualityKpi>(K.kpi, {
    totalFiles: 0,
    totalLines: 0,
    anyUsages: 0,
    consoleIssues: 0,
    unusedFiles: 0,
    duplicateComponents: 0,
    testCoverage: 0,
    lintWarnings: 0,
    buildTimeSec: 0,
    bundleSizeMb: 0,
    techDebtHours: 0,
    lastAuditAt: daysAgo(0),
  });
}

export async function toggleQaConsoleStatus(id: string): Promise<void> {
  const list = await listQaConsoleLogs();
  const next = list.map(l => l.id === id ? { ...l, status: (l.status === 'open' ? 'fixed' : l.status === 'fixed' ? 'ignored' : 'open') as QaStatus } : l);
  await AsyncStorage.setItem(K.console, JSON.stringify(next));
}
export async function toggleQaApiRule(id: string): Promise<void> {
  const list = await listQaApiErrors();
  const next = list.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
  await AsyncStorage.setItem(K.api, JSON.stringify(next));
}
