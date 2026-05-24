// Faz 58 — AdvBIScreen (POZ-DEV-287)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listBIDatasets, BI_STATUS_LABEL, BI_STATUS_COLOR } from '../services/advanced';
import type { AdvBIDataset } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const DEST_ICON: Record<AdvBIDataset['destination'], string> = {
  PowerBI: 'bar-chart', Looker: 'analytics', Metabase: 'pie-chart', Tableau: 'stats-chart',
};
const DEST_COLOR: Record<AdvBIDataset['destination'], string> = {
  PowerBI: '#f2c811', Looker: '#4285f4', Metabase: '#509ee3', Tableau: '#1f77b4',
};

export default function AdvBIScreen() {
  const [datasets, setDatasets] = useState<AdvBIDataset[]>([]);
  useFocusEffect(useCallback(() => { (async () => setDatasets(await listBIDatasets()))(); }, []));

  const totalRows = datasets.reduce((a, d) => a + d.rows, 0);
  const healthy = datasets.filter(d => d.status === 'healthy').length;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList<AdvBIDataset>
        {...FLATLIST_DEFAULTS}
        data={datasets}
        keyExtractor={d => d.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <>
            <View style={s.intro}>
              <Ionicons name="git-network" size={48} color="#8b5cf6" />
              <Text style={s.introT}>BI Veri Köprüsü</Text>
              <Text style={s.introD}>Power BI, Looker, Metabase ve Tableau'ya canlı veri akışı</Text>
            </View>

            <View style={s.kpiRow}>
              <Kpi label="Dataset" value={datasets.length.toString()} color="#8b5cf6" />
              <Kpi label="Sağlıklı" value={healthy.toString()} color="#22c55e" />
              <Kpi label="Toplam Satır" value={`${(totalRows / 1000).toFixed(0)}K`} color="#06b6d4" />
            </View>

            <Text style={s.sectionT}>Datasetler</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="bar-chart-outline"
            title="Dataset yok"
            subtitle="Henüz tanımlanmış bir BI veri seti bulunmuyor."
          />
        }
        renderItem={({ item: d }) => (
          <View style={[s.card, { borderLeftColor: BI_STATUS_COLOR[d.status as keyof typeof BI_STATUS_COLOR], marginBottom: spacing.xs }]}>
            <View style={s.row}>
              <View style={[s.iconBox, { backgroundColor: (DEST_COLOR[d.destination as keyof typeof DEST_COLOR] || '#ccc') + '22' }]}>
                <Ionicons name={DEST_ICON[d.destination as keyof typeof DEST_ICON] as any} size={20} color={DEST_COLOR[d.destination as keyof typeof DEST_COLOR]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardT}>{d.name}</Text>
                <Text style={s.cardD}>{d.destination} · {d.rows.toLocaleString('tr-TR')} satır · {d.lastSync}</Text>
              </View>
              <View style={[s.statusPill, { borderColor: BI_STATUS_COLOR[d.status as keyof typeof BI_STATUS_COLOR] }]}>
                <Text style={[s.statusT, { color: BI_STATUS_COLOR[d.status as keyof typeof BI_STATUS_COLOR] }]}>{BI_STATUS_LABEL[d.status as keyof typeof BI_STATUS_LABEL]}</Text>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          datasets.length > 0 ? (
            <TouchableOpacity style={s.btn} activeOpacity={0.85} onPress={() => Alert.alert('Senkronizasyon', 'Tüm datasetler için manuel tetikleme gönderildi (demo).')}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={s.btnT}>Tümünü Senkronize Et</Text>
            </TouchableOpacity>
          ) : null
        }
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
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  cardD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  statusT: { fontSize: typography.xs, fontWeight: '700' },
  btn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: '#8b5cf6', marginTop: spacing.sm },
  btnT: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
});
