// Faz 58 — İleri Analitik & AI (Advanced Analytics + AI services)
import type {
  AdvEcomChannel, AdvEcomOrder, AdvCallAgent, AdvCallRecord, AdvBIDataset,
  AdvVoiceTranscript, AdvCollectionForecast, AdvRfmCustomer, AdvRfmSegment,
} from '../types';

// E-commerce ----------------------------------------------------------
const ECOM_CHANNELS: AdvEcomChannel[] = [
  { id: 'shopify', name: 'Shopify', logo: 'logo-shopify', color: '#95bf47', productsSynced: 1240, ordersToday: 38, revenueToday: 42_650, status: 'connected' },
  { id: 'woo', name: 'WooCommerce', logo: 'logo-wordpress', color: '#7f54b3', productsSynced: 980, ordersToday: 21, revenueToday: 18_200, status: 'connected' },
  { id: 'trendyol', name: 'Trendyol', logo: 'cart', color: '#f27a1a', productsSynced: 540, ordersToday: 56, revenueToday: 67_100, status: 'connected' },
  { id: 'hepsiburada', name: 'Hepsiburada', logo: 'storefront', color: '#ff6000', productsSynced: 410, ordersToday: 19, revenueToday: 23_400, status: 'pending' },
  { id: 'n11', name: 'n11', logo: 'bag-handle', color: '#dd1414', productsSynced: 0, ordersToday: 0, revenueToday: 0, status: 'disconnected' },
];
const ECOM_ORDERS: AdvEcomOrder[] = [
  { id: 'o1', channel: 'Shopify', customer: 'Ada Yapı Ltd.', amount: 4250, items: 3, status: 'new', at: '09:42' },
  { id: 'o2', channel: 'Trendyol', customer: 'M. Kaya', amount: 1180, items: 1, status: 'preparing', at: '09:28' },
  { id: 'o3', channel: 'Shopify', customer: 'Marmara Cam', amount: 8900, items: 7, status: 'shipped', at: '08:50' },
  { id: 'o4', channel: 'WooCommerce', customer: 'Tekno Bina', amount: 2350, items: 2, status: 'delivered', at: 'Dün' },
  { id: 'o5', channel: 'Trendyol', customer: 'E. Yıldız', amount: 540, items: 1, status: 'cancelled', at: 'Dün' },
  { id: 'o6', channel: 'Hepsiburada', customer: 'Star Mağaza', amount: 12_500, items: 12, status: 'preparing', at: '10:15' },
];
export async function listEcomChannels(): Promise<AdvEcomChannel[]> { return ECOM_CHANNELS; }
export async function listEcomOrders(): Promise<AdvEcomOrder[]> { return ECOM_ORDERS; }
export const ECOM_STATUS_LABEL: Record<AdvEcomOrder['status'], string> = {
  new: 'Yeni', preparing: 'Hazırlanıyor', shipped: 'Kargolandı', delivered: 'Teslim Edildi', cancelled: 'İptal',
};
export const ECOM_STATUS_COLOR: Record<AdvEcomOrder['status'], string> = {
  new: '#3b82f6', preparing: '#f59e0b', shipped: '#8b5cf6', delivered: '#22c55e', cancelled: '#ef4444',
};

// Call Center ---------------------------------------------------------
const CALL_AGENTS: AdvCallAgent[] = [
  { id: 'a1', name: 'Selin Demir', calls: 42, avgDurationSec: 218, satisfaction: 4.8, status: 'on_call' },
  { id: 'a2', name: 'Cem Aydın', calls: 38, avgDurationSec: 312, satisfaction: 4.5, status: 'available' },
  { id: 'a3', name: 'Pınar Kara', calls: 27, avgDurationSec: 195, satisfaction: 4.9, status: 'break' },
  { id: 'a4', name: 'Burak Şahin', calls: 31, avgDurationSec: 260, satisfaction: 4.6, status: 'available' },
  { id: 'a5', name: 'Elif Polat', calls: 0, avgDurationSec: 0, satisfaction: 0, status: 'offline' },
];
const CALL_RECORDS: AdvCallRecord[] = [
  { id: 'c1', customer: 'Marmara Cam', agent: 'Selin Demir', durationSec: 245, direction: 'in', outcome: 'resolved', at: '09:42', hasRecording: true },
  { id: 'c2', customer: 'Ada Yapı', agent: 'Cem Aydın', durationSec: 412, direction: 'out', outcome: 'resolved', at: '09:15', hasRecording: true },
  { id: 'c3', customer: 'Star Mağaza', agent: 'Pınar Kara', durationSec: 88, direction: 'in', outcome: 'transferred', at: '08:50', hasRecording: true },
  { id: 'c4', customer: 'Tekno Bina', agent: 'Burak Şahin', durationSec: 0, direction: 'in', outcome: 'missed', at: '08:30', hasRecording: false },
  { id: 'c5', customer: 'Bilinmeyen', agent: 'Selin Demir', durationSec: 12, direction: 'in', outcome: 'voicemail', at: '08:12', hasRecording: true },
  { id: 'c6', customer: 'E. Yıldız', agent: 'Cem Aydın', durationSec: 195, direction: 'out', outcome: 'resolved', at: '07:55', hasRecording: true },
];
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
const BI_DATASETS: AdvBIDataset[] = [
  { id: 'd1', name: 'Satış Özet (günlük)', rows: 124_580, lastSync: '15 dk önce', destination: 'PowerBI', status: 'healthy' },
  { id: 'd2', name: 'Müşteri Boyut Tablosu', rows: 8_240, lastSync: '12 dk önce', destination: 'PowerBI', status: 'healthy' },
  { id: 'd3', name: 'Stok Hareketleri', rows: 412_100, lastSync: '2 saat önce', destination: 'Looker', status: 'stale' },
  { id: 'd4', name: 'Servis Performans', rows: 24_910, lastSync: '8 dk önce', destination: 'PowerBI', status: 'healthy' },
  { id: 'd5', name: 'Tahsilat Vade Analizi', rows: 56_320, lastSync: 'Başarısız', destination: 'Metabase', status: 'failed' },
  { id: 'd6', name: 'KPI Skor Kartı', rows: 1_240, lastSync: '5 dk önce', destination: 'Tableau', status: 'healthy' },
];
export async function listBIDatasets(): Promise<AdvBIDataset[]> { return BI_DATASETS; }
export const BI_STATUS_LABEL: Record<AdvBIDataset['status'], string> = {
  healthy: 'Sağlıklı', stale: 'Eski', failed: 'Başarısız',
};
export const BI_STATUS_COLOR: Record<AdvBIDataset['status'], string> = {
  healthy: '#22c55e', stale: '#f59e0b', failed: '#ef4444',
};

// Voice AI ------------------------------------------------------------
const VOICE_TRANSCRIPTS: AdvVoiceTranscript[] = [
  { id: 'v1', user: 'Ahmet Demir', durationSec: 42, language: 'tr-TR', confidence: 0.96, at: '09:42', category: 'visit_note',
    text: 'Müşteri Marmara Cam ziyareti tamamlandı. Yeni kampanya hakkında bilgi verildi. 15 günlük ödeme vadesi talep ettiler.' },
  { id: 'v2', user: 'Selin Yılmaz', durationSec: 28, language: 'tr-TR', confidence: 0.92, at: '09:15', category: 'quote_draft',
    text: 'Ada Yapıya 12 adet 8 milim ısı camı teklifi hazırla, KDV dahil m2 fiyatı 480 lira, peşin ödeme indirimi yüzde 5.' },
  { id: 'v3', user: 'Mehmet Kara', durationSec: 65, language: 'tr-TR', confidence: 0.89, at: '08:55', category: 'service_report',
    text: 'Star Mağaza servis raporu. Cam çatlaması bakım kapsamında değiştirildi. Garanti süresi 2 yıl. Müşteri imzası alındı.' },
  { id: 'v4', user: 'Burak Şahin', durationSec: 18, language: 'tr-TR', confidence: 0.94, at: '08:30', category: 'memo',
    text: 'Yarın saat 10 da Tekno Bina ziyareti planlandı. Karşılaşma noktası inşaat sahası girişi.' },
];
export async function listVoiceTranscripts(): Promise<AdvVoiceTranscript[]> { return VOICE_TRANSCRIPTS; }
export const VOICE_CATEGORY_LABEL: Record<AdvVoiceTranscript['category'], string> = {
  visit_note: 'Ziyaret Notu', service_report: 'Servis Raporu', quote_draft: 'Teklif Taslağı', memo: 'Not',
};
export const VOICE_CATEGORY_COLOR: Record<AdvVoiceTranscript['category'], string> = {
  visit_note: '#3b82f6', service_report: '#f59e0b', quote_draft: '#22c55e', memo: '#8b5cf6',
};

// Collection Forecast -------------------------------------------------
const COLLECTION_FORECAST: AdvCollectionForecast[] = [
  { customerId: 'k1', customer: 'Marmara Cam Sanayi', outstandingTotal: 84_500, predictedPaymentDate: '28.05.2026', risk: 'low', confidence: 0.91, drivers: ['12 ay temiz ödeme', 'Vade 7 gün önce uzatıldı', 'Aktif sipariş var'] },
  { customerId: 'k2', customer: 'Ada Yapı Ltd.', outstandingTotal: 42_300, predictedPaymentDate: '02.06.2026', risk: 'low', confidence: 0.86, drivers: ['Düzenli ödeyici', 'Sezonsal yavaşlama'] },
  { customerId: 'k3', customer: 'Tekno Bina A.Ş.', outstandingTotal: 156_200, predictedPaymentDate: '15.06.2026', risk: 'medium', confidence: 0.74, drivers: ['Son 3 ödeme 5-10 gün geç', 'Cari limit %85 dolu'] },
  { customerId: 'k4', customer: 'Star Mağaza', outstandingTotal: 28_750, predictedPaymentDate: '22.06.2026', risk: 'medium', confidence: 0.68, drivers: ['Yeni müşteri', 'Sadece 2 ödeme geçmişi'] },
  { customerId: 'k5', customer: 'Yıldız İnşaat', outstandingTotal: 312_400, predictedPaymentDate: '08.07.2026', risk: 'high', confidence: 0.62, drivers: ['Son 2 ödeme 20+ gün geç', 'Sektörde durgunluk', 'Cari limit aşıldı'] },
  { customerId: 'k6', customer: 'Polat Yapı', outstandingTotal: 78_900, predictedPaymentDate: 'Belirsiz', risk: 'high', confidence: 0.45, drivers: ['Son ödeme 60 gün önce', 'Tahsilat görüşmesi yapılmadı'] },
];
export async function listCollectionForecasts(): Promise<AdvCollectionForecast[]> { return COLLECTION_FORECAST; }
export const COLL_RISK_LABEL: Record<AdvCollectionForecast['risk'], string> = {
  low: 'Düşük', medium: 'Orta', high: 'Yüksek',
};
export const COLL_RISK_COLOR: Record<AdvCollectionForecast['risk'], string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#ef4444',
};

// RFM ----------------------------------------------------------------
const RFM_CUSTOMERS: AdvRfmCustomer[] = [
  { id: 'r1', name: 'Marmara Cam Sanayi', recency: 5, frequency: 28, monetary: 1_240_000, rfmScore: '5-5-5', segment: 'champions', recommendedAction: 'Sadakat programı + özel fiyat' },
  { id: 'r2', name: 'Ada Yapı Ltd.', recency: 8, frequency: 22, monetary: 890_000, rfmScore: '5-5-4', segment: 'champions', recommendedAction: 'Yıllık çerçeve sözleşme önerisi' },
  { id: 'r3', name: 'Tekno Bina A.Ş.', recency: 14, frequency: 18, monetary: 620_000, rfmScore: '4-4-4', segment: 'loyal', recommendedAction: 'Çapraz satış (servis ekle)' },
  { id: 'r4', name: 'Star Mağaza', recency: 30, frequency: 6, monetary: 180_000, rfmScore: '3-3-3', segment: 'potential', recommendedAction: 'Üst pakete teşvik kampanyası' },
  { id: 'r5', name: 'Yeni Yapı', recency: 12, frequency: 2, monetary: 45_000, rfmScore: '4-2-2', segment: 'new', recommendedAction: 'Karşılama paketi & eğitim' },
  { id: 'r6', name: 'Yıldız İnşaat', recency: 65, frequency: 15, monetary: 540_000, rfmScore: '2-4-4', segment: 'at_risk', recommendedAction: 'Müşteri kazanma görüşmesi planla' },
  { id: 'r7', name: 'Eski Müşteri Ltd.', recency: 120, frequency: 10, monetary: 280_000, rfmScore: '1-3-3', segment: 'hibernating', recommendedAction: 'Win-back kampanyası, %20 indirim' },
  { id: 'r8', name: 'Kayıp Müşteri', recency: 365, frequency: 5, monetary: 95_000, rfmScore: '1-2-2', segment: 'lost', recommendedAction: 'Kara liste değil; senelik takip' },
  { id: 'r9', name: 'Polat Yapı', recency: 22, frequency: 12, monetary: 410_000, rfmScore: '4-4-3', segment: 'loyal', recommendedAction: 'Referans programı önerisi' },
];
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
