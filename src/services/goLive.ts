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

const CHECKLIST: GoLiveChecklistItem[] = [];

const MONITOR: GoLiveMonitorCard[] = [];

const LOGS: GoLiveLogEntry[] = [];

const FEEDBACK: GoLiveFeedback[] = [];

const BUG_TASKS: GoLiveBugTask[] = [];

const WEEKLY: GoLiveWeeklyReport = {
  weekStart: '', weekEnd: '',
  totalUsers: 0, activeUsers: 0, sessions: 0,
  crashes: 0, errors: 0, feedbacks: 0, resolvedBugs: 0,
  topIssues: [], highlights: [],
};

const MONTHLY: GoLiveMonthlyReport = {
  month: '', avgDailyActive: 0, p95LatencyMs: 0, crashFreeRate: 0,
  npsScore: 0, retention7d: 0, retention30d: 0, costNote: '', recommendations: [],
};

const BACKLOG: GoLiveBacklogItem[] = [];

const RELEASES: GoLiveRelease[] = [];

const SUPPORT: GoLiveSupportPlanItem[] = [];

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
