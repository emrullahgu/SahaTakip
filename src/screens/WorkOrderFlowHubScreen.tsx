// WorkOrderFlowHubScreen — POZ-DEV-125 İş Emri Akışı merkez ekranı
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { useAppContext } from '../context/AppContext';

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
  { key: 'WorkOrderKanban',        label: 'Kanban',           desc: 'Durum sütunları ile akış',  icon: 'grid-outline',         color: '#0ea5e9', poz: 'POZ-DEV-126' },
  { key: 'BulkAssign',             label: 'Toplu Atama',      desc: 'Çoklu seç & ata',            icon: 'people-outline',       color: '#8b5cf6', poz: 'POZ-DEV-007' },
  { key: 'Assignments',            label: 'Atamalarım',       desc: 'Kabul / red / devret',       icon: 'briefcase-outline',    color: '#22c55e', poz: 'POZ-DEV-009' },
  { key: 'AutoAssign',             label: 'Otomatik Atama',   desc: 'En yakın personel önerisi',  icon: 'flash-outline',        color: '#f59e0b', poz: 'POZ-DEV-128' },
  { key: 'Sla',                    label: 'SLA Takibi',       desc: 'Gecikme & uyarı',            icon: 'alarm-outline',        color: '#ef4444', poz: 'POZ-DEV-010' },
  { key: 'WorkOrderCostDashboard', label: 'Maliyet Panosu',   desc: 'Kâr / zarar dökümü',         icon: 'cash-outline',         color: '#16a34a', poz: 'POZ-DEV-127' },
  { key: 'RecurringTasks',         label: 'Tekrarlayan',      desc: 'Periyodik şablonlar',        icon: 'repeat-outline',       color: '#0891b2', poz: 'POZ-DEV-029' },
  { key: 'MaintenancePlans',       label: 'Bakım Planları',   desc: 'Varlık & müşteri bazlı',     icon: 'construct-outline',    color: '#64748b', poz: 'POZ-DEV-031' },
];

export default function WorkOrderFlowHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - (cols - 1) * spacing.md) / cols;

  const { workOrders } = useAppContext();

  const stats = useMemo(() => {
    const total = workOrders.length;
    const open = workOrders.filter(w => w.status !== 'Tamamlandı' && w.status !== 'İptal' && w.status !== 'Faturalandırıldı').length;
    const urgent = workOrders.filter(w => w.priority === 'Acil').length;
    const overdue = workOrders.filter(w => {
      if (!w.plannedEnd) return false;
      if (w.status === 'Tamamlandı' || w.status === 'İptal') return false;
      return new Date(w.plannedEnd).getTime() < Date.now();
    }).length;
    return { total, open, urgent, overdue };
  }, [workOrders]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="hammer-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>İş Emri Akışı</Text>
            <Text style={styles.heroSub}>Atama, durum, SLA, maliyet ve periyodik bakım</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Pill label={`Toplam: ${stats.total}`} color="#64748b" icon="layers-outline" />
          <Pill label={`Açık: ${stats.open}`} color="#0ea5e9" icon="pulse-outline" />
          <Pill label={`Acil: ${stats.urgent}`} color="#ef4444" icon="flame-outline" />
          <Pill label={`Geciken: ${stats.overdue}`} color="#f59e0b" icon="alarm-outline" />
        </View>

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
  content: { padding: spacing.lg, paddingBottom: 80 },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#0ea5e9', borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tilePoz: { color: colors.text.faint, fontSize: 10, marginTop: 6, fontWeight: '700' },
});
