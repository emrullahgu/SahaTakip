// Faz 45 — QualityDashboardScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { QualityDashboardStat } from '../types';
import { computeQualityDashboard, NC_KIND_LABEL, NC_KIND_COLOR, NC_STATUS_LABEL, NC_STATUS_COLOR } from '../services/quality';

export default function QualityDashboardScreen() {
  const [stat, setStat] = useState<QualityDashboardStat | null>(null);
  const load = useCallback(async () => { setStat(await computeQualityDashboard()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!stat) return <SafeAreaView style={s.safe}><Text style={s.empty}>Yükleniyor...</Text></SafeAreaView>;

  const totalKind = stat.byKind.reduce((a, b) => a + b.count, 0) || 1;
  const maxStatus = Math.max(1, ...stat.byStatus.map(b => b.count));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View style={s.kpiRow}>
          <View style={[s.kpi, { borderLeftColor: '#ef4444' }]}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={[s.kV, { color: '#ef4444' }]}>{stat.openCount}</Text>
            <Text style={s.kL}>Açık Uygunsuzluk</Text>
          </View>
          <View style={[s.kpi, { borderLeftColor: '#f97316' }]}>
            <Ionicons name="time" size={20} color="#f97316" />
            <Text style={[s.kV, { color: '#f97316' }]}>{stat.overdueCount}</Text>
            <Text style={s.kL}>Gecikmiş</Text>
          </View>
        </View>
        <View style={s.kpiRow}>
          <View style={[s.kpi, { borderLeftColor: '#22c55e' }]}>
            <Ionicons name="checkmark-done" size={20} color="#22c55e" />
            <Text style={[s.kV, { color: '#22c55e' }]}>{stat.closedThisMonth}</Text>
            <Text style={s.kL}>Bu Ay Kapanan</Text>
          </View>
          <View style={[s.kpi, { borderLeftColor: '#0ea5e9' }]}>
            <Ionicons name="hourglass" size={20} color="#0ea5e9" />
            <Text style={[s.kV, { color: '#0ea5e9' }]}>{stat.avgClosureDays}</Text>
            <Text style={s.kL}>Ort. Kapanma (gün)</Text>
          </View>
        </View>

        <View style={s.bigCard}>
          <Text style={s.cardT}>Tekrar Oranı (90 gün)</Text>
          <Text style={[s.bigV, { color: stat.repeatRate > 30 ? '#ef4444' : stat.repeatRate > 15 ? '#f59e0b' : '#22c55e' }]}>{stat.repeatRate}%</Text>
          <View style={s.bar}>
            <View style={[s.barFill, { width: `${Math.min(100, stat.repeatRate)}%`, backgroundColor: stat.repeatRate > 30 ? '#ef4444' : stat.repeatRate > 15 ? '#f59e0b' : '#22c55e' }]} />
          </View>
          <Text style={s.cardSub}>Aynı lokasyon/tür kombinasyonu tekrar oranı</Text>
        </View>

        <View style={s.bigCard}>
          <Text style={s.cardT}>Türe Göre Dağılım</Text>
          {stat.byKind.map(k => (
            <View key={k.kind} style={s.distRow}>
              <View style={[s.dot, { backgroundColor: NC_KIND_COLOR[k.kind] }]} />
              <Text style={s.distL}>{NC_KIND_LABEL[k.kind]}</Text>
              <View style={s.distBar}>
                <View style={[s.distFill, { width: `${(k.count / totalKind) * 100}%`, backgroundColor: NC_KIND_COLOR[k.kind] }]} />
              </View>
              <Text style={s.distV}>{k.count}</Text>
            </View>
          ))}
        </View>

        <View style={s.bigCard}>
          <Text style={s.cardT}>Durum Dağılımı</Text>
          {stat.byStatus.map(st => (
            <View key={st.status} style={s.distRow}>
              <View style={[s.dot, { backgroundColor: NC_STATUS_COLOR[st.status] }]} />
              <Text style={s.distL}>{NC_STATUS_LABEL[st.status]}</Text>
              <View style={s.distBar}>
                <View style={[s.distFill, { width: `${(st.count / maxStatus) * 100}%`, backgroundColor: NC_STATUS_COLOR[st.status] }]} />
              </View>
              <Text style={s.distV}>{st.count}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, alignItems: 'flex-start' },
  kV: { fontSize: typography.xl, fontWeight: '800' },
  kL: { color: colors.text.muted, fontSize: 10 },
  bigCard: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.sm },
  cardT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  cardSub: { color: colors.text.muted, fontSize: typography.xs },
  bigV: { fontSize: 36, fontWeight: '800' },
  bar: { height: 8, backgroundColor: colors.bg.primary, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  distL: { color: colors.text.muted, fontSize: typography.xs, width: 100 },
  distBar: { flex: 1, height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, overflow: 'hidden' },
  distFill: { height: 6, borderRadius: 3 },
  distV: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '800', width: 30, textAlign: 'right' },
});
