// slaWatcher.ts — SLA ihlali PROAKTİF bildirim tetikleyici (Req#7).
// listSlaItems ile ihlal eden iş emirlerini bulur ve her WO için YALNIZCA BİR KEZ
// Notify.slaBreach çağırır (AsyncStorage'da "bildirildi" seti ile spam önler).
// Tamamen cihaz-yerel: DB/RLS/sync etkisi yok. İhlal tespiti tek kaynak reports.ts'te.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkOrder } from '../types';
import { listSlaItems } from './reports';
import { Notify } from './notifications';

const KEY = '@SahaTakip:slaNotified';

async function loadNotified(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr as string[]) : new Set();
  } catch {
    return new Set();
  }
}

async function saveNotified(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    /* sessiz: bildirim yine de gönderildi, sadece kalıcılık başarısız */
  }
}

/**
 * Verilen iş emirlerini SLA ihlali için tarar ve daha önce BİLDİRİLMEMİŞ her ihlal için
 * bir kez Notify.slaBreach gönderir. "Bildirildi" seti, hâlâ ihlalde olan WO'lara göre
 * budanır → tamamlanıp yeniden açılan ve tekrar geciken bir WO yeniden bildirilebilir.
 * Best-effort: hata uygulama akışını kesmez. Bildirilen YENİ WO sayısını döner.
 */
export async function checkSlaBreaches(workOrders: WorkOrder[]): Promise<number> {
  const breached = listSlaItems(workOrders); // { workOrderId, client, hoursOverdue, ... }
  if (!breached.length) {
    // Hiç ihlal yok → seti temizle (tamamlanan/iptal edilenler birikmesin).
    const prev = await loadNotified();
    if (prev.size) await saveNotified(new Set());
    return 0;
  }

  const notified = await loadNotified();
  const currentIds = new Set(breached.map(b => b.workOrderId));

  let sent = 0;
  for (const item of breached) {
    if (notified.has(item.workOrderId)) continue; // zaten bildirildi → spam yok
    void Promise.resolve(Notify.slaBreach(item.client, item.hoursOverdue, item.workOrderId)).catch(() => {});
    notified.add(item.workOrderId);
    sent++;
  }

  // Artık ihlalde olmayanları (tamamlandı/iptal/plan güncellendi) setten çıkar ki
  // ileride tekrar geciken aynı WO yeniden bildirilebilsin.
  const pruned = new Set([...notified].filter(id => currentIds.has(id)));
  await saveNotified(pruned);

  return sent;
}
