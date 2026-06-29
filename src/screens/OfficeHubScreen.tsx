// OfficeHubScreen — "Ofis Takip" merkez ekranı (Notion benzeri ofis çalışma alanı).
// Ofis ekibi (admin/manager/engineer) için: Çalışma Alanı (sayfa/blok), Panolar (kanban),
// Toplantı Notları + mevcut ofis araçlarına kısayol. İstatistikler + son sayfalar.
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography, brand } from '../theme';
import { RootStackParamList, OfficePage } from '../types';
import { officeStats, listPages, OfficeStats } from '../services/officeWorkspace';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const EMPTY: OfficeStats = { pages: 0, favorites: 0, boards: 0, openCards: 0, meetings: 0, openActions: 0 };

export default function OfficeHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - (cols - 1) * spacing.md) / cols;
  const [stats, setStats] = useState<OfficeStats>(EMPTY);
  const [recent, setRecent] = useState<OfficePage[]>([]);

  const refresh = useCallback(async () => {
    const [s, pages] = await Promise.all([officeStats(), listPages()]);
    setStats(s);
    setRecent(
      pages
        .filter(p => !p.archived)
        .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
        .slice(0, 5),
    );
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const TILES: { key: keyof RootStackParamList; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { key: 'OfficePages',    label: 'Çalışma Alanı', desc: 'Sayfa · blok · alt-sayfa', icon: 'documents-outline', color: brand.blue },
    { key: 'OfficeBoards',   label: 'Panolar',       desc: 'Kanban · kart',           icon: 'grid-outline',      color: '#a855f7' },
    { key: 'OfficeMeetings', label: 'Toplantılar',   desc: 'Not · aksiyon maddesi',   icon: 'people-outline',    color: '#f59e0b' },
  ];

  const SHORTCUTS: { key: keyof RootStackParamList; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { key: 'TaskHub',     label: 'Görevler',    icon: 'checkmark-done-outline', color: '#0ea5e9' },
    { key: 'Calendar',    label: 'Takvim',      icon: 'calendar-outline',       color: '#22c55e' },
    { key: 'Approvals',   label: 'Onaylar',     icon: 'shield-checkmark-outline', color: '#ef4444' },
    { key: 'Departments', label: 'Departmanlar', icon: 'business-outline',       color: '#8b5cf6' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="briefcase-outline" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>Ofis Takip</Text>
            <Text style={s.heroS}>Çalışma Alanı · Panolar · Toplantılar</Text>
          </View>
        </View>

        {/* İstatistik pill'leri */}
        <View style={s.statusRow}>
          <Pill label={`${stats.pages} Sayfa`} color={brand.blue} icon="document-text-outline" />
          <Pill label={`${stats.boards} Pano`} color="#a855f7" icon="grid-outline" />
          <Pill label={`${stats.openCards} Kart`} color="#0ea5e9" icon="albums-outline" />
          <Pill label={`${stats.meetings} Toplantı`} color="#f59e0b" icon="people-outline" />
          <Pill label={`${stats.openActions} Açık Aksiyon`} color={stats.openActions > 0 ? '#ef4444' : '#64748b'} icon="alert-circle-outline" />
        </View>

        {/* Ana modüller */}
        <Text style={s.sectionLabel}>Çalışma Alanı</Text>
        <View style={[s.grid, { maxWidth: 1200, alignSelf: 'center', width: '100%' }]}>
          {TILES.map(t => (
            <TouchableOpacity key={t.key} style={[s.tile, { width: tileWidth }]} onPress={() => nav.navigate(t.key as any)} activeOpacity={0.85}>
              <View style={[s.tileIcon, { backgroundColor: t.color }]}><Ionicons name={t.icon} size={22} color="#fff" /></View>
              <Text style={s.tileLabel}>{t.label}</Text>
              <Text style={s.tileDesc}>{t.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Son sayfalar */}
        {recent.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Son Sayfalar</Text>
            <View style={s.recentCard}>
              {recent.map((p, i) => (
                <TouchableOpacity
                  key={p.id}
                  style={[s.recentRow, i < recent.length - 1 && s.recentDivider]}
                  onPress={() => nav.navigate('OfficePage', { pageId: p.id })}
                  activeOpacity={0.7}
                >
                  <Text style={s.recentEmoji}>{p.icon}</Text>
                  <Text style={s.recentTitle} numberOfLines={1}>{p.title}</Text>
                  {p.isFavorite && <Ionicons name="star" size={14} color="#f59e0b" />}
                  <Ionicons name="chevron-forward" size={16} color={colors.text.faint} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Mevcut araçlara kısayol */}
        <Text style={s.sectionLabel}>Ofis Araçları</Text>
        <View style={s.shortcutRow}>
          {SHORTCUTS.map(sc => (
            <TouchableOpacity key={sc.key} style={s.shortcut} onPress={() => nav.navigate(sc.key as any)} activeOpacity={0.8}>
              <View style={[s.shortcutIcon, { backgroundColor: sc.color + '22' }]}>
                <Ionicons name={sc.icon} size={20} color={sc.color} />
              </View>
              <Text style={s.shortcutLabel}>{sc.label}</Text>
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
  content: { padding: spacing.lg, paddingBottom: 90, gap: spacing.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: brand.blue, borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: '#fff', fontWeight: '800', fontSize: typography.lg },
  heroS: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  sectionLabel: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700', marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  recentCard: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: spacing.md },
  recentDivider: { borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  recentEmoji: { fontSize: 18 },
  recentTitle: { flex: 1, color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
  shortcutRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  shortcut: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.full },
  shortcutIcon: { width: 32, height: 32, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
});
