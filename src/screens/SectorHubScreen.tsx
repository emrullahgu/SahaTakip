// SectorHubScreen — POZ-DEV-191 Sektörel modüller merkez (Enerji / Varlık / Bakım / Denetim / Satış)
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { listPlans, dueSoon } from '../services/maintenancePlans';
import { listInspections, listNonconformities } from '../services/inspections';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Tile {
  key: keyof RootStackParamList;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  poz?: string;
}

const TILES: Tile[] = [
  { key: 'Assets',             label: 'Varlıklar',     desc: 'Trafo/Pano/GES envanter', icon: 'cube-outline',           color: '#0ea5e9', poz: 'POZ-DEV-084' },
  { key: 'MaintenancePlans',   label: 'Bakım Planı',   desc: 'Önleyici & düzeltici',     icon: 'construct-outline',      color: '#22c55e', poz: 'POZ-DEV-086' },
  { key: 'Inspections',        label: 'Denetim',       desc: 'Audit / kalite / iş güv.', icon: 'clipboard-outline',      color: '#8b5cf6', poz: 'POZ-DEV-088' },
  { key: 'EnergyReadingForm',  label: 'Enerji Okuma',  desc: 'Sayaç/Pano/Trafo/GES',     icon: 'flash-outline',          color: '#f59e0b', poz: 'POZ-DEV-085' },
  { key: 'Nonconformities',    label: 'Uygunsuzluk',   desc: 'CAPA & root cause',        icon: 'warning-outline',        color: '#ef4444', poz: 'POZ-DEV-089' },
  { key: 'SalesVisits',        label: 'Satış Ziyaret', desc: 'Rakip & sonuç kaydı',     icon: 'briefcase-outline',      color: '#ec4899', poz: 'POZ-DEV-090' },
  { key: 'AssetHistory',       label: 'Varlık Geçmiş',desc: 'Bakım & denetim zaman',    icon: 'time-outline',           color: '#06b6d4', poz: 'POZ-DEV-192' },
];

export default function SectorHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - (cols - 1) * spacing.md) / cols;

  const [plansCount, setPlansCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [inspectionsCount, setInspectionsCount] = useState(0);
  const [openNC, setOpenNC] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [plans, dues, ins, ncs] = await Promise.all([
          listPlans(),
          dueSoon(7),
          listInspections(),
          listNonconformities(),
        ]);
        setPlansCount(plans.length);
        setDueCount(dues.length);
        setInspectionsCount(ins.length);
        setOpenNC(ncs.filter(n => n.status === 'open' || n.status === 'in_progress').length);
      } catch {}
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="business-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Sektörel Modüller</Text>
            <Text style={styles.heroSub}>Enerji · Bakım · Denetim · Satış</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Pill label={`Plan: ${plansCount}`} color="#22c55e" icon="construct-outline" />
          <Pill label={`Yaklaşan: ${dueCount}`} color={dueCount > 0 ? '#f59e0b' : '#64748b'} icon="alarm-outline" />
          <Pill label={`Denetim: ${inspectionsCount}`} color="#8b5cf6" icon="clipboard-outline" />
          <Pill label={`Açık NC: ${openNC}`} color={openNC > 0 ? '#ef4444' : '#22c55e'} icon="warning-outline" />
        </View>

        {dueCount > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => nav.navigate('MaintenancePlans')}
            activeOpacity={0.85}
          >
            <Ionicons name="alarm-outline" size={20} color="#f59e0b" />
            <Text style={styles.alertText}>{dueCount} bakım önümüzdeki 7 günde planlı. Listeyi açın.</Text>
            <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
          </TouchableOpacity>
        )}

        <View style={[styles.grid, { maxWidth: 1200, alignSelf: 'center', width: '100%' }]}>
          {TILES.map(t => (
            <TouchableOpacity
              key={String(t.key)}
              style={[styles.tile, { width: tileWidth }]}
              onPress={() => nav.navigate(t.key as never)}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIcon, { backgroundColor: t.color }]}>
                <Ionicons name={t.icon} size={22} color="#fff" />
              </View>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileDesc}>{t.desc}</Text>
              {t.poz && <Text style={styles.tilePoz}>{t.poz}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ label, color, icon }: { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.pill, { borderColor: color, backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#0ea5e9', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, backgroundColor: '#f59e0b22', borderWidth: 1, borderColor: '#f59e0b', borderRadius: radius.md },
  alertText: { color: '#f59e0b', fontSize: typography.xs, fontWeight: '700', flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tilePoz: { color: colors.text.faint, fontSize: 10, marginTop: 6, fontWeight: '700' },
});
