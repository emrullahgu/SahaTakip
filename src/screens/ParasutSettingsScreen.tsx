// ParasutSettingsScreen — Paraşüt entegrasyonu ayar + görüntüleme (POZ-DEV-109)
// Salt-okunur varsayılan: fatura/cari/ürün/harcama görüntülenir. Fatura kesme
// ÇİFT KİLİTLİ ve varsayılan KAPALI (bu toggle + sunucu PARASUT_INVOICING_ENABLED).
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import { formatTRY } from '../utils/money';
import {
  loadParasutSettings, saveParasutSettings, testParasutConnection,
  listSalesInvoices, listPurchaseBills, listProducts,
  type ParasutSettings, type ParasutInvoice, type ParasutBill, type ParasutProduct,
} from '../services/parasut';

export default function ParasutSettingsScreen() {
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission('settings', 'W'); // admin
  const [settings, setSettings] = useState<ParasutSettings>({ enabled: false, invoicingEnabled: false, offersEnabled: false });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [invoices, setInvoices] = useState<ParasutInvoice[]>([]);
  const [bills, setBills] = useState<ParasutBill[]>([]);
  const [products, setProducts] = useState<ParasutProduct[]>([]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    loadParasutSettings().then(s => { if (alive) setSettings(s); });
    return () => { alive = false; };
  }, []));

  const update = async (patch: Partial<ParasutSettings>) => {
    if (!isAdmin) { Alert.alert('Yetki', 'Bu ayarı yalnızca yönetici değiştirebilir.'); return; }
    setSaving(true);
    try {
      const next = await saveParasutSettings(patch);
      setSettings(next);
    } finally { setSaving(false); }
  };

  const onTest = async () => {
    setTesting(true);
    const r = await testParasutConnection();
    setTesting(false);
    Alert.alert(r.ok ? 'Başarılı' : 'Hata', r.message);
  };

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [inv, bil, prd] = await Promise.all([
        listSalesInvoices({ 'page[size]': '10', sort: '-issue_date' } as any).catch(() => []),
        listPurchaseBills({ 'page[size]': '10', sort: '-issue_date' } as any).catch(() => []),
        listProducts({ 'page[size]': '10' }).catch(() => []),
      ]);
      setInvoices(inv); setBills(bil); setProducts(prd);
      if (!inv.length && !bil.length && !prd.length) {
        Alert.alert('Veri yok', 'Paraşüt\'ten kayıt gelmedi. Bağlantıyı test edin ve yapılandırmayı kontrol edin.');
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Veriler getirilemedi.');
    } finally { setLoadingData(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={s.card}>
          <View style={s.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Paraşüt Entegrasyonu</Text>
              <Text style={s.desc}>Muhasebe verilerini (fatura, cari, ürün, harcama) uygulamada görüntüleyin.</Text>
            </View>
            <Switch value={settings.enabled} disabled={!isAdmin || saving} onValueChange={(v) => update({ enabled: v })} />
          </View>
        </View>

        <View style={s.card}>
          <View style={s.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Taslak Teklif (sales_offers)</Text>
              <Text style={s.note}>
                Paraşüt'e TASLAK satış teklifi yazmayı açar — fatura DEĞİL. Faturadan bağımsızdır; açık olsa bile sunucu ayrıca PARASUT_OFFERS_ENABLED gerektirir (çift kilit). AI ajan bu açıkken Paraşüt taslak teklifi oluşturabilir.
              </Text>
            </View>
            <Switch value={settings.offersEnabled} disabled={!isAdmin || saving} onValueChange={(v) => update({ offersEnabled: v })} />
          </View>
        </View>

        <View style={s.card}>
          <View style={s.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Fatura Kesme (POST)</Text>
              <Text style={s.warn}>
                ⚠ Sistem oturana kadar KAPALI tutun. Açık olsa bile sunucu ayrıca PARASUT_INVOICING_ENABLED gerektirir (çift kilit).
              </Text>
            </View>
            <Switch value={settings.invoicingEnabled} disabled={!isAdmin || saving} onValueChange={(v) => update({ invoicingEnabled: v })} />
          </View>
        </View>

        {!isAdmin && <Text style={s.note}>Ayarları yalnızca yönetici değiştirebilir.</Text>}

        <View style={s.btnRow}>
          <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={onTest} disabled={testing} activeOpacity={0.85}>
            {testing ? <ActivityIndicator color={colors.emerald.default} /> : <Ionicons name="pulse-outline" size={16} color={colors.emerald.default} />}
            <Text style={[s.btnTxt, { color: colors.emerald.default }]}>Bağlantıyı Test Et</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={fetchData} disabled={loadingData} activeOpacity={0.85}>
            {loadingData ? <ActivityIndicator color="#fff" /> : <Ionicons name="download-outline" size={16} color="#fff" />}
            <Text style={[s.btnTxt, { color: '#fff' }]}>Verileri Getir</Text>
          </TouchableOpacity>
        </View>

        {invoices.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Son Satış Faturaları ({invoices.length})</Text>
            {invoices.map(i => (
              <View key={i.id} style={s.line}>
                <Text style={s.lineMain} numberOfLines={1}>{i.no || i.id} · {i.date || ''}</Text>
                <Text style={s.lineAmt}>{formatTRY(i.total ?? 0)}</Text>
              </View>
            ))}
          </View>
        )}

        {bills.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Son Harcamalar/Gider Faturaları ({bills.length})</Text>
            {bills.map(b => (
              <View key={b.id} style={s.line}>
                <Text style={s.lineMain} numberOfLines={1}>{b.description || b.id} · {b.date || ''}</Text>
                <Text style={[s.lineAmt, { color: colors.rose.default }]}>{formatTRY(b.total ?? 0)}</Text>
              </View>
            ))}
          </View>
        )}

        {products.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Ürünler ({products.length})</Text>
            {products.map(p => (
              <View key={p.id} style={s.line}>
                <Text style={s.lineMain} numberOfLines={1}>{p.name || p.code || p.id}</Text>
                <Text style={s.lineAmt}>{formatTRY(p.listPrice ?? 0)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.footer}>
          Kurulum: Sunucu sırları (client_id/secret/kullanıcı/şifre/firma id) Supabase secrets ile bir kez tanımlanır;
          uygulamada saklanmaz. Detay: parasut-proxy fonksiyon başlığı.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.lg, padding: spacing.lg },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { fontSize: typography.md, fontWeight: '800', color: colors.text.primary },
  desc: { fontSize: typography.sm, color: colors.text.muted, marginTop: 4 },
  warn: { fontSize: typography.sm, color: colors.amber.default, marginTop: 4, fontWeight: '600' },
  note: { fontSize: typography.sm, color: colors.text.muted, fontStyle: 'italic' },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md, borderRadius: radius.md },
  btnGhost: { backgroundColor: colors.emerald.bg, borderWidth: 1, borderColor: colors.emerald.border },
  btnPrimary: { backgroundColor: colors.indigo.default },
  btnTxt: { fontSize: typography.sm, fontWeight: '800' },
  sectionTitle: { fontSize: typography.sm, fontWeight: '800', color: colors.text.secondary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border.default },
  lineMain: { flex: 1, fontSize: typography.sm, color: colors.text.primary },
  lineAmt: { fontSize: typography.sm, fontWeight: '800', color: colors.emerald.default },
  footer: { fontSize: typography.xs, color: colors.text.faint, marginTop: spacing.sm, lineHeight: 16 },
});
