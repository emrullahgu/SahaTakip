// scoring.ts — Saha Performans / Uygulama Kullanım Puanı (saf, UI-bağımsız, test edilebilir).
//
// Amaç: "en çok giriş yapan" gibi kötüye kullanılabilir bir metrik DEĞİL; gerçek
// operasyonel kalite. v1 sinyalleri (client'taki work_orders'tan, ek deploy gerektirmez):
//   - İş tamamlama oranı (gerçek iş emri kapatma)
//   - Rapor eksiksizliği (foto önce/sonra + malzeme + not + imza)
//   - İş hacmi (gerçek iş sayısı, tavanlı — gereksiz giriş-çıkışı teşvik etmez)
// İLERİDE (started_at/finished_at + customer_ratings + check-in zamanları yazılınca):
//   zamanında kapatma ve müşteri-puanı alt-skorları eklenecek (TODO yorumları).

import type { WorkOrder } from '../types';
import type { EmployeeProductivityEntry } from '../types';

export interface StaffScore {
  name: string;
  jobs: number;              // toplam atanan/sahip iş
  completed: number;         // fiilen tamamlanan/ileri durumdaki
  completionRate: number;    // 0..1
  reportCompleteness: number;// 0..1 (ortalama)
  laborHours: number;
  revenue: number;           // tamamlanan işlerin teklif tutarı toplamı
  score: number;             // 0..100
}

// Fiilen işin yapıldığı/ilerlediği durumlar.
const DONE_STATUSES: ReadonlyArray<WorkOrder['status']> = [
  'Tamamlandı', 'Onay Bekliyor', 'Teklif Gönderildi', 'Faturalandırıldı',
];

/** Tek iş emri için rapor eksiksizliği (0..1): foto/malzeme/not/imza doluluğu. */
export function reportCompletenessOf(w: WorkOrder): number {
  const hasBefore = !!(w.beforePhoto || (w.beforePhotos && w.beforePhotos.length));
  const hasAfter = !!(w.afterPhoto || (w.afterPhotos && w.afterPhotos.length));
  const hasMaterials = !!(w.materials && w.materials.length);
  const hasNotes = !!(w.notes && w.notes.trim());
  const hasSignature = !!w.signatureUri;
  const flags = [hasBefore, hasAfter, hasMaterials, hasNotes, hasSignature];
  return flags.filter(Boolean).length / flags.length;
}

const WEIGHTS = { completion: 0.4, report: 0.4, volume: 0.2 };
const VOLUME_CAP = 10; // bu kadar işte hacim alt-skoru tavanlanır

/** İş emirlerini kişiye (assignedToName veya engineer) göre gruplayıp skorlar. */
export function computeStaffScores(workOrders: WorkOrder[]): StaffScore[] {
  const byName = new Map<string, WorkOrder[]>();
  for (const w of workOrders) {
    const name = (w.assignedToName || w.engineer || '').trim();
    if (!name) continue;
    const arr = byName.get(name);
    if (arr) arr.push(w); else byName.set(name, [w]);
  }

  const scores: StaffScore[] = [];
  byName.forEach((list, name) => {
    const jobs = list.length;
    const done = list.filter(w => DONE_STATUSES.includes(w.status));
    const completed = done.length;
    const completionRate = jobs > 0 ? completed / jobs : 0;
    const reportCompleteness = jobs > 0 ? list.reduce((s, w) => s + reportCompletenessOf(w), 0) / jobs : 0;
    const laborHours = Math.round(list.reduce((s, w) => s + (w.actualLaborMinutes ?? 0), 0) / 60);
    const revenue = done.reduce((s, w) => s + (Number(w.quoteAmount) || 0), 0);
    const volume = Math.min(1, jobs / VOLUME_CAP);
    const score = Math.round(
      (completionRate * WEIGHTS.completion + reportCompleteness * WEIGHTS.report + volume * WEIGHTS.volume) * 100,
    );
    scores.push({ name, jobs, completed, completionRate, reportCompleteness, laborHours, revenue, score });
  });

  // Skora göre azalan; eşitlikte daha çok tamamlayan önde.
  return scores.sort((a, b) => b.score - a.score || b.completed - a.completed);
}

/** EmployeeRanking ekranının beklediği biçime çevirir (sıralama no atar). */
export function toProductivityEntries(scores: StaffScore[]): EmployeeProductivityEntry[] {
  return scores.map((s, i) => ({
    employeeId: s.name,           // gerçek user_id bağı kurulana dek ad anahtar
    employeeName: s.name,
    jobsCompleted: s.completed,
    hoursWorked: s.laborHours,
    revenueGenerated: s.revenue,
    efficiencyScore: s.score,
    ranking: i + 1,
  }));
}

/** Tek kişinin kendi puan kartı için (saha personeli "kendi performansım"). */
export function scoreForName(workOrders: WorkOrder[], name: string): StaffScore | null {
  const target = (name || '').trim();
  if (!target) return null;
  return computeStaffScores(workOrders).find(s => s.name === target) ?? null;
}
