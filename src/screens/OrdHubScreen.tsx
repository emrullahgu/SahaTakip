// Faz 59 — OrdHubScreen (POZ-DEV-291)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { getOrdSummary, ORD_STATUS_LABEL, ORD_STATUS_COLOR } from '../services/orders';
import type { RootStackParamList, OrdSummary } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TILES: { label: string; icon: string; color: string; route: keyof RootStackParamList }[] = [
  { label: 'Sipariş Listesi', icon: 'list', color: '#f97316', route: 'OrdList' },
  { label: 'Yeni Sipariş', icon: 'add-circle', color: '#22c55e', route: 'OrdForm' },
  { label: 'Tekrarlayan', icon: 'repeat', color: '#8b5cf6', route: 'OrdRecurring' },
  { label: 'Analitik', icon: 'analytics', color: '#06b6d4', route: 'OrdAnalytics' },
];

export default function OrdHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileW = `${100 / cols - 1}%`;
  const [sum, setSum] = useState<OrdSummary | null>(null);
  useFocusEffect(useCallback(() => { (async () => setSum(await getOrdSummary()))(); }, []));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Ionicons name="bag-handle" size={100} color="#f97316" />
          <Text style={s.heroT}>Sipariş Yönetimi</Text>
          <Text style={s.heroD}>Tekliften siparişe, sahadan teslime tam akış</Text>
        </View>

        {sum && (
          <View style={s.kpiRow}>
            <Kpi label="Toplam" value={sum.totalOrders.toString()} color="#f97316" />
            <Kpi label="Ciro" value={`₺${(sum.totalValue / 1000).toFixed(0)}K`} color="#22c55e" />
            <Kpi label="Ortalama" value={`₺${(sum.avgOrderValue / 1000).toFixed(0)}K`} color="#06b6d4" />
          </View>
        )}

        <View style={s.grid}>
          {TILES.map(t => (
            <TouchableOpacity
              key={t.route as string}
              style={[s.tile, { width: tileW as any, borderColor: t.color }]}
              onPress={() => nav.navigate(t.route as any)}
              activeOpacity={0.85}
            >
              <Ionicons name={t.icon as any} size={32} color={t.color} />
              <Text style={s.tileT}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {sum && (
          <View style={s.statusBox}>
            <Text style={s.sectionT}>Durum Dağılımı</Text>
            {Object.entries(sum.byStatus).map(([k, v]) => (
              <View key={k} style={s.statusRow}>
                <View style={[s.dot, { backgroundColor: ORD_STATUS_COLOR[k as keyof typeof ORD_STATUS_COLOR] }]} />
                <Text style={s.statusL}>{ORD_STATUS_LABEL[k as keyof typeof ORD_STATUS_LABEL]}</Text>
                <Text style={s.statusV}>{v}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  hero: { alignItems: 'center', padding: spacing.md, gap: 6 },
  heroT: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  kpiV: { fontSize: typography.lg, fontWeight: '800' },
  kpiL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any, marginTop: spacing.sm },
  tile: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', minHeight: 120, justifyContent: 'center', gap: 8, marginBottom: spacing.sm },
  tileT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', textAlign: 'center' },
  statusBox: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusL: { color: colors.text.primary, fontSize: typography.sm, flex: 1 },
  statusV: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
});
