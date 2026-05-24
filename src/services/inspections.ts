// inspections.ts — POZ-DEV-087, POZ-DEV-088
// Denetim formu + uygunsuzluk kaydı + kalite puanlama + düzeltici faaliyet
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Inspection,
  InspectionItem,
  InspectionType,
  Nonconformity,
  NonconformitySeverity,
  NonconformityStatus,
} from '../types';

const INS_KEY = '@SahaTakip:inspections';
const NC_KEY = '@SahaTakip:nonconformities';

function rid(prefix: string): string {
  return prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// --- Inspections -------------------------------------------------------------

export async function listInspections(): Promise<Inspection[]> {
  try {
    const raw = await AsyncStorage.getItem(INS_KEY);
    return raw ? (JSON.parse(raw) as Inspection[]) : [];
  } catch {
    return [];
  }
}

export async function getInspection(id: string): Promise<Inspection | undefined> {
  const all = await listInspections();
  return all.find(i => i.id === id);
}

export function computeScore(items: InspectionItem[]): number {
  const evaluable = items.filter(i => i.status !== 'na');
  if (evaluable.length === 0) return 100;
  const ok = evaluable.filter(i => i.status === 'ok').length;
  return Math.round((ok / evaluable.length) * 100);
}

export async function createInspection(
  input: Omit<Inspection, 'id' | 'createdAt' | 'score'> & { score?: number },
): Promise<Inspection> {
  const all = await listInspections();
  const next: Inspection = {
    ...input,
    id: rid('ins'),
    score: input.score ?? computeScore(input.items),
    createdAt: new Date().toISOString(),
  };
  all.unshift(next);
  await AsyncStorage.setItem(INS_KEY, JSON.stringify(all));
  return next;
}

export async function updateInspection(
  id: string,
  patch: Partial<Inspection>,
): Promise<Inspection | undefined> {
  const all = await listInspections();
  const i = all.findIndex(x => x.id === id);
  if (i < 0) return undefined;
  const merged = { ...all[i], ...patch, id: all[i].id };
  if (patch.items) merged.score = computeScore(merged.items);
  all[i] = merged;
  await AsyncStorage.setItem(INS_KEY, JSON.stringify(all));
  return merged;
}

export async function deleteInspection(id: string): Promise<void> {
  const all = await listInspections();
  await AsyncStorage.setItem(INS_KEY, JSON.stringify(all.filter(x => x.id !== id)));
}

// Hazır kontrol listesi şablonları
export const INSPECTION_TEMPLATES: Record<InspectionType, { title: string; questions: string[] }> = {
  audit: {
    title: 'Genel Denetim',
    questions: [
      'Saha güvenli ve düzenli mi?',
      'Acil çıkış yolları açık mı?',
      'Yangın söndürücüler erişilebilir mi?',
      'Etiketleme ve uyarı işaretleri tam mı?',
      'Kayıtlar güncel ve eksiksiz mi?',
    ],
  },
  safety: {
    title: 'İş Güvenliği Kontrol',
    questions: [
      'KKD eksiksiz kullanılıyor mu?',
      'Topraklama bağlantıları sağlam mı?',
      'Yüksek gerilim ikaz levhaları yerinde mi?',
      'Pano kapakları kilitli mi?',
      'Yangın güvenliği ekipmanı çalışır durumda mı?',
    ],
  },
  quality: {
    title: 'Kalite Kontrol',
    questions: [
      'Montaj projeye uygun mu?',
      'Kablo etiketleri ve renk kodu doğru mu?',
      'Sıkma torkları kontrol edildi mi?',
      'Test sonuçları kabul sınırları içinde mi?',
      'Temizlik ve son işçilik tamam mı?',
    ],
  },
  commissioning: {
    title: 'Devreye Alma',
    questions: [
      'İzolasyon direnci ölçümü uygun mu?',
      'Faz sırası doğru mu?',
      'Koruma röleleri ayarlandı mı?',
      'Yük dengesi kontrol edildi mi?',
      'Müşteri eğitimi verildi mi?',
    ],
  },
  periodic: {
    title: 'Periyodik Kontrol',
    questions: [
      'Önceki periyot uygunsuzlukları kapatıldı mı?',
      'Görsel kontroller yapıldı mı?',
      'Ölçüm değerleri normal mi?',
      'Bağlantı sıkmaları yapıldı mı?',
      'Temizlik ve bakım tamamlandı mı?',
    ],
  },
};

export function buildItemsFromTemplate(type: InspectionType): InspectionItem[] {
  return INSPECTION_TEMPLATES[type].questions.map((q, idx) => ({
    id: 'q' + idx + '_' + Math.random().toString(36).slice(2, 6),
    question: q,
    status: 'ok',
  }));
}

// --- Nonconformities --------------------------------------------------------

export async function listNonconformities(): Promise<Nonconformity[]> {
  try {
    const raw = await AsyncStorage.getItem(NC_KEY);
    return raw ? (JSON.parse(raw) as Nonconformity[]) : [];
  } catch {
    return [];
  }
}

export async function createNonconformity(
  input: Omit<Nonconformity, 'id' | 'createdAt' | 'status'> & { status?: NonconformityStatus },
): Promise<Nonconformity> {
  const all = await listNonconformities();
  const next: Nonconformity = {
    ...input,
    id: rid('nc'),
    status: input.status || 'open',
    createdAt: new Date().toISOString(),
  };
  all.unshift(next);
  await AsyncStorage.setItem(NC_KEY, JSON.stringify(all));
  return next;
}

export async function updateNonconformity(
  id: string,
  patch: Partial<Nonconformity>,
): Promise<Nonconformity | undefined> {
  const all = await listNonconformities();
  const i = all.findIndex(x => x.id === id);
  if (i < 0) return undefined;
  all[i] = { ...all[i], ...patch, id: all[i].id };
  if (patch.status === 'closed' && !all[i].closedAt) {
    all[i].closedAt = new Date().toISOString();
  }
  await AsyncStorage.setItem(NC_KEY, JSON.stringify(all));
  return all[i];
}

export async function deleteNonconformity(id: string): Promise<void> {
  const all = await listNonconformities();
  await AsyncStorage.setItem(NC_KEY, JSON.stringify(all.filter(x => x.id !== id)));
}

export async function listByInspection(inspectionId: string): Promise<Nonconformity[]> {
  const all = await listNonconformities();
  return all.filter(x => x.inspectionId === inspectionId);
}

export const INSPECTION_TYPE_LABEL: Record<InspectionType, string> = {
  audit: 'Genel Denetim',
  safety: 'İş Güvenliği',
  quality: 'Kalite',
  commissioning: 'Devreye Alma',
  periodic: 'Periyodik',
};

export const SEVERITY_LABEL: Record<NonconformitySeverity, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
};

export const SEVERITY_COLOR: Record<NonconformitySeverity, string> = {
  low: '#0ea5e9',
  medium: '#f59e0b',
  high: '#ea580c',
  critical: '#dc2626',
};

export const NC_STATUS_LABEL: Record<NonconformityStatus, string> = {
  open: 'Açık',
  in_progress: 'Devam',
  closed: 'Kapalı',
  cancelled: 'İptal',
};
