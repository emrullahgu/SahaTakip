import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import type { WorkOrder, Quote } from '../types';

export async function generateAndShareActivityPdf(
  date: string,
  workOrders: WorkOrder[],
  quotes: Quote[]
) {
  const dayWos = workOrders.filter(w => (w.date || '').slice(0, 10) === date);
  const dayQuotes = quotes.filter(q => (q.date || '').slice(0, 10) === date);

  const woRows = dayWos.map((w, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${w.id}</strong></td>
      <td>${w.client}</td>
      <td>${w.serviceName}</td>
      <td>${w.status}</td>
      <td class="right">${w.quoteAmount.toLocaleString('tr-TR')} ₺</td>
    </tr>
  `).join('');

  const qRows = dayQuotes.map((q, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${q.number}</strong></td>
      <td>${q.customerName}</td>
      <td>${q.title}</td>
      <td>${q.status}</td>
      <td class="right">${q.grandTotal.toLocaleString('tr-TR')} ₺</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<style>
  body { font-family: 'Helvetica', Arial, sans-serif; padding: 30px; font-size: 11px; color: #333; }
  h1 { color: #1e40af; margin-bottom: 5px; }
  .date { color: #666; margin-bottom: 20px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
  th { background: #f3f4f6; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  .right { text-align: right; }
  .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #1e40af; border-left: 4px solid #22c55e; padding-left: 10px; }
  .footer { margin-top: 30px; text-align: center; color: #999; font-size: 9px; }
</style>
</head>
<body>
  <h1>SAHA AKTİVİTE RAPORU</h1>
  <div class="date">Tarih: ${date}</div>

  <div class="section-title">İş Emirleri & Servisler (${dayWos.length})</div>
  <table>
    <thead><tr><th>#</th><th>ID</th><th>Müşteri</th><th>Hizmet</th><th>Durum</th><th class="right">Tutar</th></tr></thead>
    <tbody>${woRows || '<tr><td colspan="6" style="text-align:center">Kayıt yok</td></tr>'}</tbody>
  </table>

  <div class="section-title">Yeni Teklifler (${dayQuotes.length})</div>
  <table>
    <thead><tr><th>#</th><th>No</th><th>Müşteri</th><th>Konu</th><th>Durum</th><th class="right">Tutar</th></tr></thead>
    <tbody>${qRows || '<tr><td colspan="6" style="text-align:center">Kayıt yok</td></tr>'}</tbody>
  </table>

  <div class="footer">SahaTakip Mühendislik · Otomatik Sistem Raporu</div>
</body>
</html>`;

  if (Platform.OS === 'web') {
    // Web: yeni sekmede HTML olarak aç (kullanıcı tarayıcıdan PDF kaydedebilir)
    try {
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        setTimeout(() => { try { w.print(); } catch {} }, 300);
      } else {
        Alert.alert('Uyarı', 'Pop-up engellendi. Tarayıcı ayarlarından izin verin.');
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'PDF oluşturulamadı');
    }
    return;
  }
  try {
    const res = await Print.printToFileAsync({ html });
    if (!res?.uri) throw new Error('PDF dosyası oluşturulamadı');
    await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: 'Aktivite Raporu' });
  } catch (e: any) {
    Alert.alert('Hata', e?.message || 'PDF oluşturulamadı');
  }
}
