// Faz 59 — OrdAnalyticsScreen (POZ-DEV-296)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getOrdSummary, ORD_STATUS_LABEL, ORD_STATUS_COLOR } from '../services/orders';
import type { OrdSummary, OrdStatus } from '../types';

export default function OrdAnalyticsScreen() {
  const [sum, setSum] = useState<OrdSummary | null>(null);
  useFocusEffect(useCallback(() => { (async () => setSum(await getOrdSummary()))(); }, []));

  if (!sum) return <SafeAreaView style={s.safe}><View style={s.empty}><Text style={{ color: colors.text.muted }}>Yükleniyor…</Text></View></SafeAreaView>;

  const maxStatus = Math.max(1, ...Object.values(sum.byStatus));
  const maxRevenue = Math.max(1, ...sum.topProducts.map(p => p.revenue));
  const conversionRate = sum.byStatus.delivered / Math.max(1, sum.totalOrders - sum.byStatus.cancelled) * 100;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.intro}>
          <Ionicons name="analytics" size={48} color="#06b6d4" />
          <Text style={s.introT}>Sipariş Analitiği</Text>
          <Text style={s.introD}>Durum dağılımı, ortalama sepet, dönüşüm ve en çok satan ürünler</Text>
        </View>

        <View style={s.kpiGrid}>
          <Kpi label="Toplam Sipariş" value={sum.totalOrders.toString()} icon="bag-handle" color="#f97316" />
          <Kpi label="Ciro" value={`₺${(sum.totalValue / 1000).toFixed(0)}K`} icon="cash" color="#22c55e" />
          <Kpi label="Ort. Sepet" value={`₺${(sum.avgOrderValue / 1000).toFixed(0)}K`} icon="cart" color="#06b6d4" />
          <Kpi label="Tamamlanma" value={`%${conversionRate.toFixed(0)}`} icon="checkmark-done" color="#8b5cf6" />
        </View>

        <Text style={s.sectionT}>Durum Dağılımı</Text>
        <View style={s.box}>
          {(Object.keys(sum.byStatus) as OrdStatus[]).map(st => {
            const cnt = sum.byStatus[st];
            const pct = (cnt / maxStatus) * 100;
            return (
              <View key={st} style={s.barRow}>
                <Text style={s.barL}>{ORD_STATUS_LABEL[st]}</Text>
                <View style={s.barBg}>
                  <View style={[s.barFill, { width: `${pct}%`, backgroundColor: ORD_STATUS_COLOR[st] }]} />
                </View>
                <Text style={[s.barV, { color: ORD_STATUS_COLOR[st] }]}>{cnt}</Text>
              </View>
            );
          })}
        </View>

        <Text style={s.sectionT}>En Çok Satan Ürünler</Text>
        <View style={s.box}>
          {sum.topProducts.map((p, i) => {
            const pct = (p.revenue / maxRevenue) * 100;
            return (
              <View key={p.name} style={s.prodRow}>
                <View style={s.rankBox}>
                  <Text style={s.rank}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.prodN}>{p.name}</Text>
                  <Text style={s.prodM}>{p.qty} adet</Text>
                  <View style={s.prodBar}>
                    <View style={[s.prodBarFill, { width: `${pct}%` }]} />
                  </View>
                </View>
                <Text style={s.prodR}>₺{(p.revenue / 1000).toFixed(0)}K</Text>
              </View>
            );
          })}
        </View>

        <View style={s.insight}>
          <Ionicons name="bulb" size={18} color="#f59e0b" />
          <Text style={s.insightT}>
            İptal oranı %{((sum.byStatus.cancelled / sum.totalOrders) * 100).toFixed(0)} —
            {sum.byStatus.cancelled > sum.totalOrders * 0.15
              ? ' iptal nedenleri incelenmelidir.'
              : ' kabul edilebilir seviyede.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={[s.kpi, { borderColor: color }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[s.kpiV, { color }]}>{value}</Text>
      <Text style={s.kpiL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { alignItems: 'center', padding: spacing.md, gap: 4 },
  introT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  introD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any },
  kpi: { width: '49%' as any, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', marginBottom: spacing.sm, gap: 4 },
  kpiV: { fontSize: typography.lg, fontWeight: '800' },
  kpiL: { color: colors.text.muted, fontSize: typography.xs },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.sm },
  box: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barL: { color: colors.text.primary, fontSize: typography.xs, width: 100 },
  barBg: { flex: 1, height: 12, backgroundColor: colors.bg.primary, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: 12, borderRadius: 6 },
  barV: { fontSize: typography.sm, fontWeight: '800', width: 30, textAlign: 'right' },
  prodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  rankBox: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f9731622', alignItems: 'center', justifyContent: 'center' },
  rank: { color: '#f97316', fontSize: typography.sm, fontWeight: '800' },
  prodN: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  prodM: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  prodBar: { height: 4, backgroundColor: colors.bg.primary, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  prodBarFill: { height: 4, backgroundColor: '#22c55e', borderRadius: 2 },
  prodR: { color: '#22c55e', fontSize: typography.sm, fontWeight: '800' },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f59e0b22', padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: '#f59e0b44' },
  insightT: { color: colors.text.primary, fontSize: typography.xs, flex: 1, fontWeight: '600' },
});
