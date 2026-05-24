// Faz 58 — İleri Analitik & AI (Advanced Analytics + AI services)
import type {
  AdvEcomChannel, AdvEcomOrder, AdvCallAgent, AdvCallRecord, AdvBIDataset,
  AdvVoiceTranscript, AdvCollectionForecast, AdvRfmCustomer, AdvRfmSegment,
} from '../types';

// E-commerce ----------------------------------------------------------
const ECOM_CHANNELS: AdvEcomChannel[] = [];
const ECOM_ORDERS: AdvEcomOrder[] = [];
export async function listEcomChannels(): Promise<AdvEcomChannel[]> { return ECOM_CHANNELS; }
export async function listEcomOrders(): Promise<AdvEcomOrder[]> { return ECOM_ORDERS; }
export const ECOM_STATUS_LABEL: Record<AdvEcomOrder['status'], string> = {
  new: 'Yeni', preparing: 'Hazırlanıyor', shipped: 'Kargolandı', delivered: 'Teslim Edildi', cancelled: 'İptal',
};
export const ECOM_STATUS_COLOR: Record<AdvEcomOrder['status'], string> = {
  new: '#3b82f6', preparing: '#f59e0b', shipped: '#8b5cf6', delivered: '#22c55e', cancelled: '#ef4444',
};

// Call Center ---------------------------------------------------------
const CALL_AGENTS: AdvCallAgent[] = [];
const CALL_RECORDS: AdvCallRecord[] = [];
export async function listCallAgents(): Promise<AdvCallAgent[]> { return CALL_AGENTS; }
export async function listCallRecords(): Promise<AdvCallRecord[]> { return CALL_RECORDS; }
export const CALL_AGENT_STATUS_LABEL: Record<AdvCallAgent['status'], string> = {
  available: 'Müsait', on_call: 'Görüşmede', break: 'Molada', offline: 'Çevrimdışı',
};
export const CALL_AGENT_STATUS_COLOR: Record<AdvCallAgent['status'], string> = {
  available: '#22c55e', on_call: '#3b82f6', break: '#f59e0b', offline: '#64748b',
};
export const CALL_OUTCOME_LABEL: Record<AdvCallRecord['outcome'], string> = {
  resolved: 'Çözüldü', transferred: 'Aktarıldı', voicemail: 'Sesli Mesaj', missed: 'Cevapsız',
};
export const CALL_OUTCOME_COLOR: Record<AdvCallRecord['outcome'], string> = {
  resolved: '#22c55e', transferred: '#3b82f6', voicemail: '#f59e0b', missed: '#ef4444',
};

// BI ------------------------------------------------------------------
const BI_DATASETS: AdvBIDataset[] = [];
export async function listBIDatasets(): Promise<AdvBIDataset[]> { return BI_DATASETS; }
export const BI_STATUS_LABEL: Record<AdvBIDataset['status'], string> = {
  healthy: 'Sağlıklı', stale: 'Eski', failed: 'Başarısız',
};
export const BI_STATUS_COLOR: Record<AdvBIDataset['status'], string> = {
  healthy: '#22c55e', stale: '#f59e0b', failed: '#ef4444',
};

// Voice AI ------------------------------------------------------------
const VOICE_TRANSCRIPTS: AdvVoiceTranscript[] = [];
export async function listVoiceTranscripts(): Promise<AdvVoiceTranscript[]> { return VOICE_TRANSCRIPTS; }
export const VOICE_CATEGORY_LABEL: Record<AdvVoiceTranscript['category'], string> = {
  visit_note: 'Ziyaret Notu', service_report: 'Servis Raporu', quote_draft: 'Teklif Taslağı', memo: 'Not',
};
export const VOICE_CATEGORY_COLOR: Record<AdvVoiceTranscript['category'], string> = {
  visit_note: '#3b82f6', service_report: '#f59e0b', quote_draft: '#22c55e', memo: '#8b5cf6',
};

// Collection Forecast -------------------------------------------------
const COLLECTION_FORECAST: AdvCollectionForecast[] = [];
export async function listCollectionForecasts(): Promise<AdvCollectionForecast[]> { return COLLECTION_FORECAST; }
export const COLL_RISK_LABEL: Record<AdvCollectionForecast['risk'], string> = {
  low: 'Düşük', medium: 'Orta', high: 'Yüksek',
};
export const COLL_RISK_COLOR: Record<AdvCollectionForecast['risk'], string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#ef4444',
};

// RFM ----------------------------------------------------------------
const RFM_CUSTOMERS: AdvRfmCustomer[] = [];
export async function listRfmCustomers(): Promise<AdvRfmCustomer[]> { return RFM_CUSTOMERS; }
export const RFM_SEGMENT_LABEL: Record<AdvRfmSegment, string> = {
  champions: 'Şampiyonlar', loyal: 'Sadık Müşteri', potential: 'Potansiyel', new: 'Yeni Müşteri',
  at_risk: 'Risk Altında', hibernating: 'Uyuyan', lost: 'Kayıp',
};
export const RFM_SEGMENT_COLOR: Record<AdvRfmSegment, string> = {
  champions: '#22c55e', loyal: '#3b82f6', potential: '#06b6d4', new: '#8b5cf6',
  at_risk: '#f59e0b', hibernating: '#a855f7', lost: '#ef4444',
};
export const RFM_SEGMENT_ICON: Record<AdvRfmSegment, string> = {
  champions: 'trophy', loyal: 'heart', potential: 'trending-up', new: 'sparkles',
  at_risk: 'warning', hibernating: 'moon', lost: 'skull',
};
