// AssetHistoryScreen — POZ-DEV-193 Varlık geçmişi (bakım + denetim + enerji okuma timeline)
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { Asset, Inspection, MaintenancePlan, EnergyReading, RootStackParamList } from '../types';
import { listAssets } from '../services/assets';
import { listInspections } from '../services/inspections';
import { listPlans } from '../services/maintenancePlans';
import { listReadings } from '../services/energyReadings';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface TimelineItem {
  id: string;
  kind: 'maintenance' | 'inspection' | 'energy';
  date: string;
  title: string;
  meta?: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const KIND_META: Record<TimelineItem['kind'], { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  maintenance: { color: '#22c55e', icon: 'construct-outline', label: 'Bakım' },
  inspection:  { color: '#8b5cf6', icon: 'clipboard-outline', label: 'Denetim' },
  energy:      { color: '#f59e0b', icon: 'flash-outline',     label: 'Enerji' },
};

export default function AssetHistoryScreen() {
  const nav = useNavigation<Nav>();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [readings, setReadings] = useState<EnergyReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, p, i, r] = await Promise.all([
          listAssets(),
          listPlans(),
          listInspections(),
          listReadings(),
        ]);
        setAssets(a);
        setPlans(p);
        setInspections(i);
        setReadings(r);
        if (a.length > 0) setSelectedId(a[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const timeline: TimelineItem[] = useMemo(() => {
    if (!selectedId) return [];
    const items: TimelineItem[] = [];
    for (const p of plans.filter(x => x.assetId === selectedId)) {
      if (p.lastDoneAt) items.push({
        id: `m-${p.id}`,
        kind: 'maintenance',
        date: p.lastDoneAt,
        title: p.name,
        meta: p.assignedToName,
        color: KIND_META.maintenance.color,
        icon: KIND_META.maintenance.icon,
      });
    }
    for (const i of inspections.filter(x => x.assetId === selectedId)) {
      items.push({
        id: `i-${i.id}`,
        kind: 'inspection',
        date: i.date || i.createdAt,
        title: i.title,
        meta: `Skor: ${i.score}/100${i.inspectorName ? ' · ' + i.inspectorName : ''}`,
        color: KIND_META.inspection.color,
        icon: KIND_META.inspection.icon,
      });
    }
    for (const r of readings.filter(x => x.assetId === selectedId)) {
      items.push({
        id: `e-${r.id}`,
        kind: 'energy',
        date: r.date || r.createdAt,
        title: r.kind.toUpperCase() + ' okuma',
        meta: r.inspectorName,
        color: KIND_META.energy.color,
        icon: KIND_META.energy.icon,
      });
    }
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedId, plans, inspections, readings]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color="#06b6d4" /></View>
      </SafeAreaView>
    );
  }

  const selectedAsset = assets.find(a => a.id === selectedId);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="time-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Varlık Geçmişi</Text>
            <Text style={styles.heroSub}>{selectedAsset?.name || 'Varlık seçin'} · {timeline.length} olay</Text>
          </View>
        </View>

        {assets.length === 0 ? (
          <Text style={styles.empty}>Henüz varlık tanımlanmadı.</Text>
        ) : (
          <>
            <Text style={styles.section}>Varlık</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assetRow}>
              {assets.map(a => {
                const on = a.id === selectedId;
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.assetBtn, on && styles.assetBtnActive]}
                    onPress={() => setSelectedId(a.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.assetText, on && styles.assetTextActive]} numberOfLines={1}>{a.name}</Text>
                    {a.power && <Text style={[styles.assetMeta, on && { color: 'rgba(255,255,255,0.85)' }]}>{a.power}</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.section}>Zaman Çizelgesi</Text>
            {timeline.length === 0 ? (
              <Text style={styles.empty}>Bu varlık için henüz kayıt yok.</Text>
            ) : timeline.map(t => (
              <View key={t.id} style={styles.tlRow}>
                <View style={[styles.tlIcon, { backgroundColor: t.color }]}>
                  <Ionicons name={t.icon} size={14} color="#fff" />
                </View>
                <View style={[styles.tlCard, { borderLeftColor: t.color }]}>
                  <View style={styles.tlHead}>
                    <Text style={styles.tlKind}>{KIND_META[t.kind].label}</Text>
                    <Text style={styles.tlDate}>{new Date(t.date).toLocaleDateString('tr-TR')}</Text>
                  </View>
                  <Text style={styles.tlTitle} numberOfLines={2}>{t.title}</Text>
                  {t.meta && <Text style={styles.tlMeta}>{t.meta}</Text>}
                </View>
              </View>
            ))}

            {selectedAsset && (
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => nav.navigate('AssetDetail', { assetId: selectedAsset.id })}
                activeOpacity={0.85}
              >
                <Ionicons name="open-outline" size={16} color="#fff" />
                <Text style={styles.detailText}>Varlık Detayını Aç</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#06b6d4', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  section: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  empty: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center', padding: spacing.md },
  assetRow: { gap: 6, paddingRight: spacing.lg },
  assetBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary, minWidth: 140 },
  assetBtnActive: { backgroundColor: '#06b6d4', borderColor: '#06b6d4' },
  assetText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  assetTextActive: { color: '#fff' },
  assetMeta: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  tlRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tlIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  tlCard: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 3, borderRadius: radius.md },
  tlHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  tlKind: { color: colors.text.muted, fontSize: 10, fontWeight: '800' },
  tlDate: { color: colors.text.faint, fontSize: 10 },
  tlTitle: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  tlMeta: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  detailBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#06b6d4', padding: spacing.sm, borderRadius: radius.md, marginTop: spacing.md },
  detailText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});
