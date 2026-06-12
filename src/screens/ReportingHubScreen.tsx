// ReportingHubScreen — POZ-DEV-170 Raporlama & Dashboard merkez
import React, { useEffect, useMemo, useState } from 'react';
import { localDateISO } from '../utils/date';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { useAppContext } from '../context/AppContext';
import { listReports } from '../services/reports';
import { listSlaItems } from '../services/reports';

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
  { key: 'Dashboard',        label: 'Dashboard',        desc: 'Canlı KPI kartları',       icon: 'speedometer-outline',  color: '#0ea5e9', poz: 'POZ-DEV-068' },
  { key: 'KpiOverview',      label: 'KPI Özeti',         desc: 'Günlük/Haftalık/Aylık',   icon: 'pulse-outline',         color: '#8b5cf6', poz: 'POZ-DEV-171' },
  { key: 'Reports',          label: 'Raporlar',         desc: 'Geçmiş & üret',            icon: 'document-text-outline', color: '#22c55e', poz: 'POZ-DEV-064' },
  { key: 'ReportComparison', label: 'Dönem Karşılaştır', desc: 'Bu hafta vs geçen hafta', icon: 'git-compare-outline',   color: '#ec4899', poz: 'POZ-DEV-172' },
  { key: 'Sla',              label: 'SLA Durumu',       desc: 'Geciken iş emirleri',      icon: 'time-outline',          color: '#ef4444', poz: 'POZ-DEV-070' },
];

export default function ReportingHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const { workOrders } = useAppContext();
  const cols = width >= 900 ? 4 : 2;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - (cols - 1) * spacing.md) / cols;

  const [reportCount, setReportCount] = useState(0);
  useEffect(() => { (async () => { try { setReportCount((await listReports()).length); } catch {} })(); }, []);

  const slaCount = useMemo(() => listSlaItems(workOrders).length, [workOrders]);
  const todayCount = useMemo(() => {
    const today = localDateISO();
    return workOrders.filter(w => (w.date || '').slice(0, 10) === today).length;
  }, [workOrders]);
  const openCount = useMemo(
    () => workOrders.filter(w => w.status !== 'Tamamlandı' && w.status !== 'İptal').length,
    [workOrders]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="bar-chart-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Raporlama & Dashboard</Text>
            <Text style={styles.heroSub}>KPI, SLA, dönemsel rapor üretimi</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Pill label={`Bugün: ${todayCount}`} color="#0ea5e9" icon="today-outline" />
          <Pill label={`Açık İş: ${openCount}`} color="#22c55e" icon="briefcase-outline" />
          <Pill label={`SLA İhlal: ${slaCount}`} color={slaCount > 0 ? '#ef4444' : '#64748b'} icon="time-outline" />
          <Pill label={`Rapor: ${reportCount}`} color="#8b5cf6" icon="document-text-outline" />
        </View>

        {slaCount > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            activeOpacity={0.85}
            onPress={() => nav.navigate('Sla')}
          >
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertLabel}>SLA Uyarısı</Text>
              <Text style={styles.alertValue}>{slaCount} iş emri planlanan süreyi aştı</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ef4444" />
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
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: '#ef4444', borderRadius: radius.md, borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  alertLabel: { color: '#ef4444', fontWeight: '800', fontSize: typography.sm },
  alertValue: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tilePoz: { color: colors.text.faint, fontSize: 10, marginTop: 6, fontWeight: '700' },
});
