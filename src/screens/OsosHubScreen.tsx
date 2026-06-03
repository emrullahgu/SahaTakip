// OsosHubScreen — POZ-DEV-246 OSOS okuma + haftalık raporlama merkez
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { listReadings, listWeeklyReports, listAlarms, maybeRunAutoToday } from '../services/osos';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function OsosHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - (cols - 1) * spacing.md) / cols;
  const [c, setC] = useState({ readings: 0, reports: 0, latest: 0, alarms: 0 });
  const refresh = useCallback(async () => {
    const [rs, wr, al] = await Promise.all([listReadings(), listWeeklyReports(), listAlarms({ unacknowledgedOnly: true })]);
    const week = Date.now() - 7 * 86400000;
    setC({
      readings: rs.length,
      reports: wr.length,
      latest: rs.filter(r => new Date(r.readingAt).getTime() >= week).length,
      alarms: al.length,
    });
  }, []);
  useEffect(() => {
    refresh();
    // POZ-DEV-250: planlı saat geldiyse ve bugün çalışmadıysa otomatik tetikle
    maybeRunAutoToday().then(res => { if (res) refresh(); }).catch(() => { /* sessiz */ });
  }, [refresh]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const TILES = [
    { key: 'OsosReadings',   label: 'OSOS Okuma',     desc: 'Sayaç kayıtları',     icon: 'speedometer-outline' as const,    color: '#0ea5e9', poz: 'POZ-DEV-247' },
    { key: 'OsosImport',     label: 'Excel Import',   desc: 'Toplu içe aktarma',   icon: 'cloud-upload-outline' as const,   color: '#8b5cf6', poz: 'POZ-DEV-248' },
    { key: 'WeeklyReports',  label: 'Haftalık Rapor', desc: 'Periyodik özet',      icon: 'bar-chart-outline' as const,      color: '#22c55e', poz: 'POZ-DEV-249' },
    { key: 'OsosAutomation', label: 'Otomasyon',      desc: 'Alarm + günlük dağıtım', icon: 'flash-outline' as const,        color: '#eab308', poz: 'POZ-DEV-250' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="speedometer-outline" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>OSOS & Haftalık Rapor</Text>
            <Text style={s.heroS}>Sayaç okuma · Excel import · Rapor</Text>
          </View>
        </View>
        <View style={s.statusRow}>
          <Pill label={`Okuma: ${c.readings}`} color="#0ea5e9" icon="speedometer-outline" />
          <Pill label={`Son 7g: ${c.latest}`} color="#22c55e" icon="time-outline" />
          <Pill label={`Rapor: ${c.reports}`} color="#a855f7" icon="bar-chart-outline" />
          <Pill label={`Alarm: ${c.alarms}`} color={c.alarms > 0 ? '#ef4444' : '#64748b'} icon="alert-circle-outline" />
        </View>
        <View style={[s.grid, { maxWidth: 1200, alignSelf: 'center', width: '100%' }]}>
          {TILES.map(t => (
            <TouchableOpacity key={t.key} style={[s.tile, { width: tileWidth }]} onPress={() => nav.navigate(t.key as never)} activeOpacity={0.85}>
              <View style={[s.tileIcon, { backgroundColor: t.color }]}><Ionicons name={t.icon} size={22} color="#fff" /></View>
              <Text style={s.tileLabel}>{t.label}</Text>
              <Text style={s.tileDesc}>{t.desc}</Text>
              <Text style={s.tilePoz}>{t.poz}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ label, color, icon }: { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[s.pill, { borderColor: color, backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[s.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#0ea5e9', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroS: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tilePoz: { color: colors.text.faint, fontSize: 10, marginTop: 6, fontWeight: '700' },
});
