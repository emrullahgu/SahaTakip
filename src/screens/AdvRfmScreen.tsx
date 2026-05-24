// Faz 58 — AdvRfmScreen (POZ-DEV-290)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listRfmCustomers, RFM_SEGMENT_LABEL, RFM_SEGMENT_COLOR, RFM_SEGMENT_ICON } from '../services/advanced';
import type { AdvRfmCustomer, AdvRfmSegment } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const SEGMENTS: AdvRfmSegment[] = ['champions', 'loyal', 'potential', 'new', 'at_risk', 'hibernating', 'lost'];

export default function AdvRfmScreen() {
  const [items, setItems] = useState<AdvRfmCustomer[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listRfmCustomers()))(); }, []));

  const counts = SEGMENTS.reduce<Record<AdvRfmSegment, number>>((acc, seg) => {
    acc[seg] = items.filter(i => i.segment === seg).length; return acc;
  }, { champions: 0, loyal: 0, potential: 0, new: 0, at_risk: 0, hibernating: 0, lost: 0 });

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={c => c.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <>
            <View style={s.intro}>
              <Ionicons name="people-circle" size={48} color="#ec4899" />
              <Text style={s.introT}>RFM Segmentasyon</Text>
              <Text style={s.introD}>Recency (Tazelik) · Frequency (Sıklık) · Monetary (Tutar) skorlaması</Text>
            </View>

            <Text style={s.sectionT}>Segment Dağılımı</Text>
            <View style={s.segGrid}>
              {SEGMENTS.map(seg => (
                <View key={seg} style={[s.segCard, { borderColor: RFM_SEGMENT_COLOR[seg as AdvRfmSegment] }]}>
                  <Ionicons name={RFM_SEGMENT_ICON[seg as AdvRfmSegment] as any} size={24} color={RFM_SEGMENT_COLOR[seg as AdvRfmSegment]} />
                  <Text style={[s.segN, { color: RFM_SEGMENT_COLOR[seg as AdvRfmSegment] }]}>{counts[seg as AdvRfmSegment]}</Text>
                  <Text style={s.segL}>{RFM_SEGMENT_LABEL[seg as AdvRfmSegment]}</Text>
                </View>
              ))}
            </View>

            <Text style={s.sectionT}>Müşteriler</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Segmentasyon verisi yok"
            subtitle="Müşteri davranışlarını analiz etmek için henüz yeterli veri birikmedi."
          />
        }
        renderItem={({ item: c }) => (
          <View key={c.id} style={[s.card, { borderLeftColor: RFM_SEGMENT_COLOR[c.segment as AdvRfmSegment], marginBottom: spacing.sm }]}>
            <View style={s.cardHead}>
              <Ionicons name={RFM_SEGMENT_ICON[c.segment as AdvRfmSegment] as any} size={20} color={RFM_SEGMENT_COLOR[c.segment as AdvRfmSegment]} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardT}>{c.name}</Text>
                <Text style={s.cardD}>{RFM_SEGMENT_LABEL[c.segment as AdvRfmSegment]} · RFM {c.rfmScore}</Text>
              </View>
              <Text style={s.amount}>₺{(c.monetary / 1000).toFixed(0)}K</Text>
            </View>
            <View style={s.rfmRow}>
              <Metric label="Recency" value={`${c.recency}gn`} color="#3b82f6" />
              <Metric label="Frequency" value={c.frequency.toString()} color="#06b6d4" />
              <Metric label="Monetary" value={`₺${(c.monetary / 1000).toFixed(0)}K`} color="#22c55e" />
            </View>
            <View style={s.actionBox}>
              <Ionicons name="bulb" size={14} color="#f59e0b" />
              <Text style={s.actionT}>{c.recommendedAction}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.metric}>
      <Text style={[s.metricV, { color }]}>{value}</Text>
      <Text style={s.metricL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  intro: { alignItems: 'center', padding: spacing.md, gap: 4 },
  introT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  introD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.sm },
  segGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any },
  segCard: { width: '32%' as any, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', marginBottom: spacing.sm, gap: 2 },
  segN: { fontSize: typography.xl, fontWeight: '800' },
  segL: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  cardD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  amount: { color: '#22c55e', fontSize: typography.sm, fontWeight: '800' },
  rfmRow: { flexDirection: 'row', backgroundColor: colors.bg.primary, padding: spacing.sm, borderRadius: radius.sm, justifyContent: 'space-around' },
  metric: { alignItems: 'center' },
  metricV: { fontSize: typography.sm, fontWeight: '800' },
  metricL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  actionBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f59e0b22', padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: '#f59e0b44' },
  actionT: { color: colors.text.primary, fontSize: typography.xs, flex: 1, fontWeight: '600' },
});
