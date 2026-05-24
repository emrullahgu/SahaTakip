// Faz 58 — AdvCollectionForecastScreen (POZ-DEV-289)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listCollectionForecasts, COLL_RISK_LABEL, COLL_RISK_COLOR } from '../services/advanced';
import type { AdvCollectionForecast } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

export default function AdvCollectionForecastScreen() {
  const [items, setItems] = useState<AdvCollectionForecast[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listCollectionForecasts()))(); }, []));

  const total = items.reduce((a, x) => a + x.outstandingTotal, 0);
  const highRisk = items.filter(i => i.risk === 'high').length;
  const avgConf = items.reduce((a, x) => a + x.confidence, 0) / Math.max(1, items.length);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={c => c.customerId}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <>
            <View style={s.intro}>
              <Ionicons name="trending-down" size={48} color="#dc2626" />
              <Text style={s.introT}>Tahsilat Tahmin Modeli</Text>
              <Text style={s.introD}>Cari geçmiş + ödeme davranışı + sektör trendi ile ödeme tarihi tahmini</Text>
            </View>

            <View style={s.kpiRow}>
              <Kpi label="Bekleyen" value={`₺${(total / 1000).toFixed(0)}K`} color="#dc2626" />
              <Kpi label="Yüksek Risk" value={highRisk.toString()} color="#ef4444" />
              <Kpi label="Model Güveni" value={`%${Math.round(avgConf * 100)}`} color="#22c55e" />
            </View>

            <Text style={s.sectionT}>Müşteri Tahminleri</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="trending-down-outline"
            title="Tahmin verisi yok"
            subtitle="Modelin tahmin yapabilmesi için yeterli finansal veri toplanmadı."
          />
        }
        renderItem={({ item: c }) => (
          <View key={c.customerId} style={[s.card, { borderLeftColor: COLL_RISK_COLOR[c.risk], marginBottom: spacing.sm }]}>
            <View style={s.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardT}>{c.customer}</Text>
                <Text style={s.cardD}>Bekleyen tutar: ₺{c.outstandingTotal.toLocaleString('tr-TR')}</Text>
              </View>
              <View style={[s.riskPill, { borderColor: COLL_RISK_COLOR[c.risk] }]}>
                <Text style={[s.riskT, { color: COLL_RISK_COLOR[c.risk] }]}>{COLL_RISK_LABEL[c.risk]}</Text>
              </View>
            </View>
            <View style={s.predictRow}>
              <Ionicons name="calendar" size={16} color={COLL_RISK_COLOR[c.risk]} />
              <Text style={s.predictT}>Tahmini ödeme: {c.predictedPaymentDate}</Text>
              <View style={s.confBox}>
                <View style={s.confBar}>
                  <View style={[s.confFill, { width: `${c.confidence * 100}%`, backgroundColor: COLL_RISK_COLOR[c.risk] }]} />
                </View>
                <Text style={s.confT}>%{Math.round(c.confidence * 100)}</Text>
              </View>
            </View>
            <View style={s.drivers}>
              <Text style={s.driverHead}>Etkileyen faktörler:</Text>
              {c.drivers.map((d, i) => (
                <View key={i} style={s.driverRow}>
                  <Ionicons name="ellipse" size={6} color={COLL_RISK_COLOR[c.risk]} />
                  <Text style={s.driverT}>{d}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.kpi, { borderColor: color }]}>
      <Text style={[s.kpiV, { color }]}>{value}</Text>
      <Text style={s.kpiL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  intro: { alignItems: 'center', padding: spacing.md, gap: 4 },
  introT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  introD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  kpiV: { fontSize: typography.lg, fontWeight: '800' },
  kpiL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.sm },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  cardD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  riskPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  riskT: { fontSize: typography.xs, fontWeight: '700' },
  predictRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.primary, padding: spacing.sm, borderRadius: radius.sm },
  predictT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', flex: 1 },
  confBox: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 80 },
  confBar: { flex: 1, height: 6, backgroundColor: colors.bg.secondary, borderRadius: 3, overflow: 'hidden' },
  confFill: { height: 6 },
  confT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  drivers: { gap: 4 },
  driverHead: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  driverT: { color: colors.text.primary, fontSize: typography.xs },
});
