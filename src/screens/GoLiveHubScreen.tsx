// Faz 55 — GoLiveHubScreen
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tile = { key: keyof RootStackParamList; label: string; icon: string; color: string };

const TILES: Tile[] = [
  { key: 'GoLiveChecklist', label: 'Canlıya Alma Listesi', icon: 'rocket', color: '#ef4444' },
  { key: 'GoLiveMonitor', label: 'İzleme Paneli', icon: 'pulse', color: '#22c55e' },
  { key: 'GoLiveLogs', label: 'Hata Logları', icon: 'bug', color: '#f59e0b' },
  { key: 'GoLiveFeedback', label: 'Geri Bildirimler', icon: 'chatbubbles', color: '#06b6d4' },
  { key: 'GoLiveBugTasks', label: 'Hata → Görev', icon: 'construct', color: '#a855f7' },
  { key: 'GoLiveWeekly', label: 'Haftalık Rapor', icon: 'calendar', color: '#3b82f6' },
  { key: 'GoLiveMonthly', label: 'Aylık Analiz', icon: 'analytics', color: '#ec4899' },
  { key: 'GoLiveBacklog', label: 'İyileştirme Backlog', icon: 'list', color: '#8b5cf6' },
  { key: 'GoLiveReleases', label: 'Sürüm Planı', icon: 'git-branch', color: '#10b981' },
  { key: 'GoLiveSupport', label: 'Destek Süreci', icon: 'shield-half', color: '#f97316' },
];

export default function GoLiveHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileW = `${100 / cols - 1}%`;
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Ionicons name="rocket-outline" size={100} color="#dc2626" />
          <Text style={s.heroT}>Canlı Kullanım & İzleme</Text>
          <Text style={s.heroD}>Canlıya alma, izleme, geri bildirim, sürekli iyileştirme</Text>
        </View>
        <View style={s.grid}>
          {TILES.map(t => (
            <TouchableOpacity key={t.key} style={[s.tile, { width: tileW as any, borderColor: t.color }]} onPress={() => nav.navigate(t.key as any)} activeOpacity={0.85}>
              <Ionicons name={t.icon as any} size={32} color={t.color} />
              <Text style={s.tileL}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.md },
  hero: { alignItems: 'center', paddingVertical: spacing.lg, gap: 6 },
  heroT: { color: colors.text.primary, fontSize: typography.xxl, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center', paddingHorizontal: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any },
  tile: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, backgroundColor: colors.bg.secondary, alignItems: 'center', gap: spacing.sm, minHeight: 120, justifyContent: 'center', marginBottom: spacing.sm },
  tileL: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', textAlign: 'center' },
});
