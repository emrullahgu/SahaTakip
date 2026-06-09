// AiQuoteDraftDetailScreen — Faz 41
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { AiQuoteDraft, QuoteLine, RootStackParamList } from '../types';
import { getQuoteDraft, setQuoteDraftStatus } from '../services/aiAssistant';
import { POZ_CATALOG, DEFAULT_OVERHEAD, DEFAULT_PROFIT, DEFAULT_VAT } from '../data/pozCatalog';
import { newUuid } from '../services/data/repository';

type R = RouteProp<RootStackParamList, 'AiQuoteDraftDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

// AI taslağındaki kalemleri gerçek teklif satırlarına dönüştür.
// Eşleşen POZ → katalogdan malzeme/montaj fiyatı; eşleşmeyen → manuel satır (fiyat 0).
function draftToQuoteLines(d: AiQuoteDraft): QuoteLine[] {
  return d.items.map((it, i) => {
    const poz = POZ_CATALOG.find(p => p.id === it.pozCode);
    if (poz) {
      return {
        id: `ai-${i}`, lineNo: i + 1, pozId: poz.id, pozName: poz.name, unit: poz.unit, quantity: it.qty,
        materialPrice: poz.materialPrice, installPrice: poz.installPrice, dismantlePrice: poz.dismantlePrice ?? 0,
        withDismantle: false, overheadPct: poz.defaultOverhead, profitPct: poz.defaultProfit, vatPct: poz.vatRate, discountPct: 0,
      };
    }
    // Eşleşmeyen kalem → MANUAL- önekli pozId; NewQuote bunu manuel-fiyat moduna alır
    // (Malzeme/Montaj alanları DÜZENLENEBİLİR olur). Önceki pozId:'' fiyat alanlarını
    // kilitliyordu — "fiyat girilmeli" denip kullanıcı GİREMİYORDU.
    return {
      id: `ai-${i}`, lineNo: i + 1, pozId: `MANUAL-${newUuid().slice(0, 8)}`, pozName: it.pozName, unit: it.unit || 'Adet', quantity: it.qty,
      materialPrice: it.needsPrice ? 0 : it.unitPrice, installPrice: 0, dismantlePrice: 0,
      withDismantle: false, overheadPct: DEFAULT_OVERHEAD, profitPct: DEFAULT_PROFIT, vatPct: DEFAULT_VAT, discountPct: 0,
    };
  });
}

export default function AiQuoteDraftDetailScreen() {
  const route = useRoute<R>();
  const nav = useNavigation<Nav>();
  const [draft, setDraft] = useState<AiQuoteDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    try { const d = await getQuoteDraft(route.params.draftId); setDraft(d || null); }
    finally { setLoaded(true); }
  }, [route.params.draftId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const action = async (status: 'approved' | 'rejected') => {
    Alert.alert(status === 'approved' ? 'Onayla' : 'Reddet', 'Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Evet', onPress: async () => { await setQuoteDraftStatus(route.params.draftId, status); nav.goBack(); } },
    ]);
  };

  if (!loaded) return <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 48 }} color={colors.text.muted} /></SafeAreaView>;
  if (!draft) return <SafeAreaView style={s.safe}><Text style={s.empty}>Taslak bulunamadı.</Text></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 60 }}>
        <View style={s.card}>
          <Text style={s.h}>Müşteri</Text>
          <Text style={s.v}>{draft.customerName}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.h}>Keşif Notu</Text>
          <Text style={s.v}>{draft.surveyText}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.h}>Kalemler</Text>
          {draft.items.map((it, i) => {
            const conf = Math.round((it.confidence ?? 0) * 100);
            const confColor = it.needsPrice ? '#f59e0b' : conf >= 70 ? '#22c55e' : conf >= 40 ? '#0ea5e9' : '#64748b';
            return (
              <View key={i} style={s.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itName}>{it.pozName}</Text>
                  <View style={s.metaRow}>
                    {!it.needsPrice && (
                      <View style={[s.confPill, { backgroundColor: confColor + '22', borderColor: confColor }]}>
                        <Ionicons name="sparkles" size={9} color={confColor} />
                        <Text style={[s.confText, { color: confColor }]}>%{conf} eşleşme</Text>
                      </View>
                    )}
                    {it.needsPrice && (
                      <View style={[s.confPill, { backgroundColor: '#f59e0b22', borderColor: '#f59e0b' }]}>
                        <Ionicons name="alert-circle" size={9} color="#f59e0b" />
                        <Text style={[s.confText, { color: '#f59e0b' }]}>Fiyat girilmeli</Text>
                      </View>
                    )}
                    {!!it.unit && <Text style={s.unitText}>{it.unit}</Text>}
                  </View>
                </View>
                <Text style={s.itQty}>{it.qty} × {it.needsPrice ? '—' : `₺${it.unitPrice.toLocaleString('tr-TR')}`}</Text>
                <Text style={s.itTot}>{it.needsPrice ? '—' : `₺${(it.qty * it.unitPrice).toLocaleString('tr-TR')}`}</Text>
              </View>
            );
          })}
          <View style={s.total}>
            <Text style={s.tLbl}>Ara Toplam</Text>
            <Text style={s.tVal}>₺{draft.totalAmount.toLocaleString('tr-TR')}</Text>
          </View>
          {draft.items.some(it => it.needsPrice) && (
            <Text style={s.warn}>⚠ Bazı kalemler için POZ eşleşmedi — fiyat uydurulmadı. Teklife dönüştürüp fiyatları siz girin.</Text>
          )}
        </View>

        <TouchableOpacity
          style={[s.btn, { backgroundColor: '#0ea5e9', marginTop: spacing.xs }]}
          onPress={() => nav.navigate('NewQuote', {
            prefill: {
              customerName: draft.customerName,
              title: draft.surveyText.slice(0, 60),
              lines: draftToQuoteLines(draft),
            },
          })}
        >
          <Ionicons name="create" size={18} color="#fff" />
          <Text style={s.btnT}>Gerçek Teklife Dönüştür</Text>
        </TouchableOpacity>

        {draft.status === 'draft' && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444' }]} onPress={() => action('rejected')}>
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={s.btnT}>Reddet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: '#22c55e' }]} onPress={() => action('approved')}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={s.btnT}>Onayla</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  h: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginBottom: 4 },
  v: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  itName: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  confPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  confText: { fontSize: 9, fontWeight: '800' },
  unitText: { color: colors.text.faint, fontSize: 10 },
  warn: { color: '#f59e0b', fontSize: typography.xs, marginTop: spacing.sm, lineHeight: 16 },
  itQty: { color: colors.text.muted, fontSize: typography.xs },
  itTot: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', minWidth: 80, textAlign: 'right' },
  total: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 2, borderTopColor: colors.border.primary },
  tLbl: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  tVal: { color: '#22c55e', fontSize: typography.lg, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.sm, borderRadius: radius.sm },
  btnT: { color: '#fff', fontWeight: '700' },
});
