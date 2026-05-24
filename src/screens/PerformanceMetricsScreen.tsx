// PerformanceMetricsScreen — POZ-DEV-337 Ekran açılış / performans özetleri
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { PerformanceSample } from '../types';
import { listPerfSamples, summarizePerf, clearPerf, recordPerf } from '../services/performance';

export default function PerformanceMetricsScreen() {
  const [samples, setSamples] = useState<PerformanceSample[]>([]);
  const refresh = useCallback(async () => { setSamples(await listPerfSamples()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const summary = useMemo(() => summarizePerf(samples), [samples]);
  const slow = summary.filter(s => s.avg > 1000);

  const onClear = () => {
    Alert.alert('Temizle', 'Tüm performans örnekleri silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await clearPerf(); refresh(); } },
    ]);
  };

  const onSeed = async () => {
    for (const sc of ['Home', 'WorkOrders', 'Quotes', 'Customers', 'TaskAnalytics']) {
      await recordPerf(sc, Math.round(200 + Math.random() * 1500));
    }
    refresh();
  };

  const maxAvg = Math.max(1, ...summary.map(s => s.avg));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.statRow}>
          <Stat label="Toplam Örnek" value={samples.length} color="#0ea5e9" />
          <Stat label="Yavaş Ekran" value={slow.length} color="#ef4444" />
          <Stat label="Ekran" value={summary.length} color="#22c55e" />
        </View>

        <View style={s.btnRow}>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#0ea5e9' }]} onPress={onSeed}>
            <Ionicons name="flask-outline" size={16} color="#fff" />
            <Text style={s.btnT}>Örnek Üret</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444' }]} onPress={onClear}>
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={s.btnT}>Temizle</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.section}>Ekran Bazlı Ortalama Süre (ms)</Text>
        {summary.length === 0 && <Text style={s.empty}>Henüz performans örneği yok</Text>}
        {summary.map(row => {
          const w = (row.avg / maxAvg) * 100;
          const color = row.avg > 1500 ? '#ef4444' : row.avg > 1000 ? '#f59e0b' : '#22c55e';
          return (
            <View key={row.screen} style={s.barCard}>
              <View style={s.barHead}>
                <Text style={s.barName}>{row.screen}</Text>
                <Text style={[s.barAvg, { color }]}>{row.avg} ms</Text>
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${w}%`, backgroundColor: color }]} />
              </View>
              <Text style={s.barMeta}>n={row.count} · min {row.min}ms · max {row.max}ms</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[s.stat, { borderColor: color }]}>
      <Text style={[s.statN, { color }]}>{value}</Text>
      <Text style={s.statL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  statRow: { flexDirection: 'row', gap: 6 },
  stat: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  statN: { fontSize: typography.lg, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 6 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.sm, borderRadius: radius.md },
  btnT: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  section: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, marginTop: spacing.sm },
  empty: { color: colors.text.muted, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.sm },
  barCard: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 4 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between' },
  barName: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  barAvg: { fontSize: typography.sm, fontWeight: '700' },
  barTrack: { height: 8, backgroundColor: colors.bg.primary, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barMeta: { color: colors.text.faint, fontSize: typography.xs },
});
