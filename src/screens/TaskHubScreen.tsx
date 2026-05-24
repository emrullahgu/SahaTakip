// TaskHubScreen — POZ-DEV-232 Görev Takip merkez
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { listTasks, tasksOverdue } from '../services/tasks';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function TaskHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - (cols - 1) * spacing.md) / cols;
  const [counts, setCounts] = useState({ total: 0, todo: 0, inprog: 0, done: 0, overdue: 0 });

  const refresh = React.useCallback(async () => {
    const all = await listTasks();
    setCounts({
      total: all.length,
      todo: all.filter(t => t.status === 'todo').length,
      inprog: all.filter(t => t.status === 'in_progress').length,
      done: all.filter(t => t.status === 'done').length,
      overdue: tasksOverdue(all).length,
    });
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useFocusEffect(React.useCallback(() => { refresh(); }, [refresh]));

  const TILES = [
    { key: 'Tasks',       label: 'Tüm Görevler', desc: 'Liste + filtre',   icon: 'list-outline' as const,        color: '#0ea5e9', poz: 'POZ-DEV-233' },
    { key: 'TaskKanban',  label: 'Kanban',       desc: 'Durum kolonları',  icon: 'apps-outline' as const,        color: '#8b5cf6', poz: 'POZ-DEV-234' },
    { key: 'TaskForm',    label: 'Yeni Görev',   desc: 'Hızlı görev ekle', icon: 'add-circle-outline' as const,  color: '#22c55e', poz: 'POZ-DEV-235' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="checkmark-done-outline" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>Görev Takip</Text>
            <Text style={s.heroS}>Liste · Kanban · Öncelik · Termin</Text>
          </View>
        </View>
        <View style={s.statusRow}>
          <Pill label={`Toplam: ${counts.total}`} color="#64748b" icon="layers-outline" />
          <Pill label={`Bekliyor: ${counts.todo}`} color="#0ea5e9" icon="hourglass-outline" />
          <Pill label={`Devam: ${counts.inprog}`} color="#a855f7" icon="play-outline" />
          <Pill label={`Tamamlandı: ${counts.done}`} color="#22c55e" icon="checkmark-circle-outline" />
          <Pill label={`Gecikmiş: ${counts.overdue}`} color={counts.overdue > 0 ? '#ef4444' : '#64748b'} icon="warning-outline" />
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
