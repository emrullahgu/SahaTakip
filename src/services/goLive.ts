// Faz 55 — Canlı Kullanım, İzleme ve Sürekli İyileştirme (static demo data)
import type {
  GoLiveChecklistItem, GoLiveMonitorCard, GoLiveLogEntry, GoLiveFeedback,
  GoLiveBugTask, GoLiveWeeklyReport, GoLiveMonthlyReport, GoLiveBacklogItem,
  GoLiveRelease, GoLiveSupportPlanItem, GoLiveSeverity, GoLiveStatus, GoLiveHealth,
} from '../types';

export const GO_LIVE_SEVERITY_LABEL: Record<GoLiveSeverity, string> = {
  low: 'Düşük', medium: 'Orta', high: 'Yüksek', critical: 'Kritik',
};
export const GO_LIVE_SEVERITY_COLOR: Record<GoLiveSeverity, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#ef4444', critical: '#b91c1c',
};
export const GO_LIVE_STATUS_LABEL: Record<GoLiveStatus, string> = {
  open: 'Açık', in_progress: 'Devam Ediyor', resolved: 'Çözüldü',
};
export const GO_LIVE_STATUS_COLOR: Record<GoLiveStatus, string> = {
  open: '#ef4444', in_progress: '#f59e0b', resolved: '#22c55e',
};
export const GO_LIVE_HEALTH_COLOR: Record<GoLiveHealth, string> = {
  green: '#22c55e', yellow: '#f59e0b', red: '#ef4444',
};

const CHECKLIST: GoLiveChecklistItem[] = [
  { id: 'gl1', text: 'Production Supabase yedeği alındı', owner: 'Admin', done: true, critical: true, category: 'data' },
  { id: 'gl2', text: 'Netlify environment değişkenleri doğrulandı', owner: 'DevOps', done: true, critical: true, category: 'infra' },
  { id: 'gl3', text: 'APK yeni sürüm yayınlandı (1.0.0)', owner: 'DevOps', done: true, critical: true, category: 'infra' },
  { id: 'gl4', text: 'Müşterilere canlı kullanım duyurusu gönderildi', owner: 'Yönetici', done: true, critical: false, category: 'comms' },
  { id: 'gl5', text: 'Saha personeline kısa eğitim yapıldı', owner: 'Yönetici', done: true, critical: false, category: 'comms' },
  { id: 'gl6', text: 'Hata bildirim kanalı (Slack #go-live) açıldı', owner: 'Support', done: true, critical: true, category: 'support' },
  { id: 'gl7', text: 'On-call rotasyonu belirlendi (ilk 7 gün)', owner: 'Support', done: false, critical: true, category: 'support' },
  { id: 'gl8', text: 'Crash izleme dashboardu açık', owner: 'DevOps', done: true, critical: true, category: 'monitoring' },
  { id: 'gl9', text: 'API hata uyarıları (e-posta) tanımlandı', owner: 'DevOps', done: true, critical: false, category: 'monitoring' },
  { id: 'gl10', text: 'Rollback prosedürü test edildi', owner: 'DevOps', done: true, critical: true, category: 'infra' },
  { id: 'gl11', text: 'KVKK aydınlatma metni güncellendi', owner: 'Admin', done: true, critical: false, category: 'data' },
  { id: 'gl12', text: 'İlk gün destek hatları açıldı (08:00-22:00)', owner: 'Support', done: false, critical: false, category: 'support' },
];

const MONITOR: GoLiveMonitorCard[] = [
  { id: 'm1', label: 'Crash-Free Oturum', value: '99.6', unit: '%', status: 'green', trend: 'up', target: '≥ 99.0%' },
  { id: 'm2', label: 'API P95 Yanıt', value: '420', unit: 'ms', status: 'green', trend: 'flat', target: '< 800ms' },
  { id: 'm3', label: 'Supabase Hata Oranı', value: '0.4', unit: '%', status: 'green', trend: 'down', target: '< 1%' },
  { id: 'm4', label: 'Aktif Kullanıcı (DAU)', value: '127', status: 'yellow', trend: 'up', target: '≥ 200' },
  { id: 'm5', label: 'Açık Hata Sayısı', value: '6', status: 'yellow', trend: 'flat', target: '< 5' },
  { id: 'm6', label: 'Push Teslim Oranı', value: '98.2', unit: '%', status: 'green', trend: 'flat', target: '≥ 95%' },
  { id: 'm7', label: 'Senkronizasyon Hatası', value: '0.8', unit: '%', status: 'green', trend: 'down', target: '< 2%' },
  { id: 'm8', label: 'PDF Üretim Süresi', value: '1.4', unit: 'sn', status: 'green', trend: 'flat', target: '< 3sn' },
];

const LOGS: GoLiveLogEntry[] = [
  { id: 'l1', kind: 'crash', message: 'NullPointerException — QuoteDetailScreen.render', count: 3, lastAt: '2025-01-15 09:42', severity: 'high', resolved: false },
  { id: 'l2', kind: 'api', message: 'GET /workorders 504 timeout', count: 12, lastAt: '2025-01-15 11:08', severity: 'medium', resolved: false },
  { id: 'l3', kind: 'supabase', message: 'RLS policy reject — customer_documents insert', count: 2, lastAt: '2025-01-15 10:21', severity: 'low', resolved: true },
  { id: 'l4', kind: 'crash', message: 'OutOfMemoryError — MapScreen heavy markers', count: 1, lastAt: '2025-01-14 16:55', severity: 'critical', resolved: false },
  { id: 'l5', kind: 'api', message: 'POST /pdf 500 — template parse error', count: 4, lastAt: '2025-01-15 08:11', severity: 'medium', resolved: true },
  { id: 'l6', kind: 'supabase', message: 'Rate limit — storage uploads', count: 7, lastAt: '2025-01-15 12:30', severity: 'low', resolved: false },
  { id: 'l7', kind: 'api', message: 'PUT /sync 409 conflict', count: 9, lastAt: '2025-01-15 13:05', severity: 'medium', resolved: false },
];

const FEEDBACK: GoLiveFeedback[] = [
  { id: 'fb1', user: 'Ahmet Y.', role: 'Saha', message: 'Teklif imzalama ekranında klavye fotoğrafı kapatıyor', rating: 3, category: 'ux', status: 'open', createdAt: '2025-01-15 10:15' },
  { id: 'fb2', user: 'Merve K.', role: 'Yönetici', message: 'Aylık raporlar çok faydalı, teşekkürler', rating: 5, category: 'other', status: 'resolved', createdAt: '2025-01-15 09:30' },
  { id: 'fb3', user: 'Burak T.', role: 'Saha', message: 'Çevrimdışı modda iş emri eklenince senkronizasyon geç oluyor', rating: 3, category: 'performance', status: 'in_progress', createdAt: '2025-01-14 18:22' },
  { id: 'fb4', user: 'Selin A.', role: 'Müşteri', message: 'PDF teklif e-posta ile gelmedi', rating: 2, category: 'bug', status: 'open', createdAt: '2025-01-15 11:40' },
  { id: 'fb5', user: 'Emre P.', role: 'Admin', message: 'Stok hareket geçmişinde excel dışa aktarım eklenmeli', rating: 4, category: 'feature', status: 'open', createdAt: '2025-01-15 12:05' },
  { id: 'fb6', user: 'Yasemin D.', role: 'Saha', message: 'Harita ekranında ekibin konumu yenilenmeli', rating: 4, category: 'feature', status: 'in_progress', createdAt: '2025-01-15 13:18' },
];

const BUG_TASKS: GoLiveBugTask[] = [
  { id: 'bt1', feedbackId: 'fb1', title: 'İmza ekranında klavye davranışı düzeltilecek', severity: 'medium', assigneeRole: 'field', status: 'in_progress', createdAt: '2025-01-15', eta: '2025-01-17' },
  { id: 'bt2', feedbackId: 'fb4', title: 'PDF e-posta teslim sorunu — SMTP retry mekanizması', severity: 'high', assigneeRole: 'admin', status: 'open', createdAt: '2025-01-15', eta: '2025-01-16' },
  { id: 'bt3', title: 'MapScreen marker performansı optimize edilecek', severity: 'critical', assigneeRole: 'admin', status: 'in_progress', createdAt: '2025-01-14', eta: '2025-01-18' },
  { id: 'bt4', feedbackId: 'fb3', title: 'Offline sync delta-merge optimizasyonu', severity: 'medium', assigneeRole: 'admin', status: 'open', createdAt: '2025-01-14', eta: '2025-01-20' },
  { id: 'bt5', title: 'Storage upload rate limit handling', severity: 'low', assigneeRole: 'support', status: 'open', createdAt: '2025-01-15' },
];

const WEEKLY: GoLiveWeeklyReport = {
  weekStart: '2025-01-13',
  weekEnd: '2025-01-19',
  totalUsers: 240,
  activeUsers: 158,
  sessions: 1842,
  crashes: 9,
  errors: 64,
  feedbacks: 23,
  resolvedBugs: 11,
  topIssues: [
    'Klavye davranışı imza ekranında',
    'PDF e-posta teslimat gecikmeleri',
    'Map performansı yoğun veride',
    'Senkronizasyon çakışmaları (409)',
  ],
  highlights: [
    'Crash-free oranı %99.6 hedef üzerinde',
    'P95 API gecikme 420ms (hedef 800ms)',
    '11 hata aynı hafta kapatıldı',
    '%66 kullanıcı aktivasyon oranı',
  ],
};

const MONTHLY: GoLiveMonthlyReport = {
  month: '2025-01',
  avgDailyActive: 142,
  p95LatencyMs: 430,
  crashFreeRate: 99.5,
  npsScore: 47,
  retention7d: 78,
  retention30d: 64,
  costNote: 'Supabase ~$48/ay, Netlify ücretsiz tier yeterli, push servisi $9/ay',
  recommendations: [
    'Map ekranı için clustering kütüphanesi entegrasyonu',
    'Offline conflict resolution UI iyileştirilmesi',
    'PDF e-posta kuyruğu için retry/queue worker',
    'KVKK izin yönetimi için ayrı ekran',
    'NPS skorunu 60+ hedeflemek için müşteri portalı geliştirmesi',
  ],
};

const BACKLOG: GoLiveBacklogItem[] = [
  { id: 'bk1', title: 'Map clustering & lazy marker', description: 'Yoğun veride harita performansı', impact: 'high', effort: 'm', priorityScore: 85, votes: 12, category: 'Performans' },
  { id: 'bk2', title: 'Offline çakışma çözüm ekranı', description: 'Kullanıcı çakışmaları manuel çözebilsin', impact: 'high', effort: 'l', priorityScore: 78, votes: 9, category: 'UX' },
  { id: 'bk3', title: 'PDF teslimat kuyruğu (retry)', description: 'SMTP gecikme/başarısızlıklarına dayanıklılık', impact: 'high', effort: 's', priorityScore: 92, votes: 8, category: 'Altyapı' },
  { id: 'bk4', title: 'Stok hareket Excel dışa aktarım', description: 'Admin için detaylı rapor', impact: 'medium', effort: 's', priorityScore: 65, votes: 7, category: 'Özellik' },
  { id: 'bk5', title: 'Push bildirim tercih ekranı', description: 'Kullanıcı kategori bazlı seçsin', impact: 'medium', effort: 'm', priorityScore: 60, votes: 5, category: 'UX' },
  { id: 'bk6', title: 'Müşteri portal mobil iyileştirme', description: 'Tablet/responsive', impact: 'medium', effort: 'l', priorityScore: 55, votes: 4, category: 'UX' },
];

const RELEASES: GoLiveRelease[] = [
  { id: 'r1', version: '1.0.0', plannedDate: '2025-01-13', type: 'major', status: 'released', notes: ['İlk canlı sürüm', 'Tüm temel modüller', 'PDF teklif & iş emri'] },
  { id: 'r2', version: '1.0.1', plannedDate: '2025-01-20', type: 'patch', status: 'in_progress', notes: ['İmza klavye düzeltmesi', 'PDF SMTP retry', 'Map performans iyileştirme'] },
  { id: 'r3', version: '1.1.0', plannedDate: '2025-02-10', type: 'minor', status: 'planned', notes: ['Offline çakışma UI', 'Excel dışa aktarım', 'Push tercihleri'] },
  { id: 'r4', version: '1.2.0', plannedDate: '2025-03-15', type: 'minor', status: 'planned', notes: ['Müşteri portal yeniden tasarım', 'NPS anketi otomasyonu', 'Çoklu dil'] },
];

const SUPPORT: GoLiveSupportPlanItem[] = [
  { id: 'sp1', area: 'Crash & API hata izleme', owner: 'DevOps', frequency: 'daily', sla: '4 saat müdahale', description: 'Crash dashboard ve log inceleme her gün 09:00' },
  { id: 'sp2', area: 'Müşteri geri bildirim takibi', owner: 'Support', frequency: 'daily', sla: '24 saat yanıt', description: 'Feedback ekranı incelenir ve kategorize edilir' },
  { id: 'sp3', area: 'Supabase yedek doğrulama', owner: 'DevOps', frequency: 'weekly', sla: 'Pazar 22:00', description: 'Haftalık otomatik yedek doğrulaması' },
  { id: 'sp4', area: 'Performans & maliyet analizi', owner: 'Admin', frequency: 'monthly', sla: 'Ay sonu raporu', description: 'Supabase + Netlify maliyet, P95 trendleri' },
  { id: 'sp5', area: 'Sürüm planlama toplantısı', owner: 'Yönetici', frequency: 'weekly', sla: 'Cuma 14:00', description: 'Backlog değerlendirme, sonraki sprint kapsam' },
  { id: 'sp6', area: 'Kullanıcı eğitimi & onboarding', owner: 'Yönetici', frequency: 'on_demand', sla: 'Aynı gün', description: 'Yeni kullanıcı kayıt olduğunda eğitim videoları paylaşılır' },
];

export async function listGoLiveChecklist(): Promise<GoLiveChecklistItem[]> { return CHECKLIST; }
export async function listGoLiveMonitor(): Promise<GoLiveMonitorCard[]> { return MONITOR; }
export async function listGoLiveLogs(): Promise<GoLiveLogEntry[]> { return LOGS; }
export async function listGoLiveFeedback(): Promise<GoLiveFeedback[]> { return FEEDBACK; }
export async function listGoLiveBugTasks(): Promise<GoLiveBugTask[]> { return BUG_TASKS; }
export async function getGoLiveWeekly(): Promise<GoLiveWeeklyReport> { return WEEKLY; }
export async function getGoLiveMonthly(): Promise<GoLiveMonthlyReport> { return MONTHLY; }
export async function listGoLiveBacklog(): Promise<GoLiveBacklogItem[]> { return [...BACKLOG].sort((a, b) => b.priorityScore - a.priorityScore); }
export async function listGoLiveReleases(): Promise<GoLiveRelease[]> { return RELEASES; }
export async function listGoLiveSupport(): Promise<GoLiveSupportPlanItem[]> { return SUPPORT; }
