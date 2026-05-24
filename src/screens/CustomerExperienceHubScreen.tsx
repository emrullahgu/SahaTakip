// CustomerExperienceHubScreen — POZ-DEV-400
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../types';
import { listPortalUsers, listShareLinks, listSurveys, listComments, listAutoReports } from '../services/customerExperience';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TILES = [
  { key: 'PortalUsers', label: 'Portal Kullanıcıları', icon: 'people-outline', color: '#0ea5e9' },
  { key: 'ShareLinks', label: 'Paylaşımlı Linkler', icon: 'link-outline', color: '#22c55e' },
  { key: 'QuoteApprovals', label: 'Teklif Onayları', icon: 'checkmark-done-outline', color: '#a855f7' },
  { key: 'CustomerComments', label: 'Müşteri Yorumları', icon: 'chatbubbles-outline', color: '#f59e0b' },
  { key: 'SatisfactionSurveys', label: 'Memnuniyet Anketleri', icon: 'happy-outline', color: '#ec4899' },
  { key: 'AutoReports', label: 'Otomatik Raporlar', icon: 'mail-outline', color: '#06b6d4' },
] as const;

export default function CustomerExperienceHubScreen() {
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const [stats, setStats] = useState({ portal: 0, links: 0, surveys: 0, comments: 0, reports: 0 });

  const load = useCallback(async () => {
    const [pu, lk, sv, cm, ar] = await Promise.all([listPortalUsers(), listShareLinks(), listSurveys(), listComments(), listAutoReports()]);
    setStats({ portal: pu.length, links: lk.filter(l => l.status === 'active').length, surveys: sv.filter(s => s.status === 'completed').length, comments: cm.length, reports: ar.filter(r => r.enabled).length });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="storefront-outline" size={52} color="#ec4899" /></View>
          <Text style={s.heroT}>Müşteri Deneyimi</Text>
          <Text style={s.heroS}>Portal, paylaşımlı linkler, anketler ve otomatik raporlar.</Text>
        </View>
        <View style={s.statRow}>
          <Stat v={stats.portal} l="Portal" c="#0ea5e9" />
          <Stat v={stats.links} l="Aktif Link" c="#22c55e" />
          <Stat v={stats.surveys} l="Tamamlanan Anket" c="#ec4899" />
          <Stat v={stats.comments} l="Yorum" c="#f59e0b" />
        </View>
        <View style={[s.grid, { gap: spacing.sm }]}>
          {TILES.map(t => (
            <TouchableOpacity key={t.key} style={[s.tile, { width: `${100 / cols - 1}%`, backgroundColor: t.color + '22', borderColor: t.color }]} onPress={() => navigation.navigate(t.key as any)}>
              <Ionicons name={t.icon as any} size={32} color={t.color} />
              <Text style={s.tileT}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ v, l, c }: { v: number; l: string; c: string }) {
  return (
    <View style={[s.stat, { borderColor: c }]}>
      <Text style={[s.statV, { color: c }]}>{v}</Text>
      <Text style={s.statL}>{l}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  hero: { backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border.primary },
  heroIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ec489922', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  heroT: { color: colors.text.primary, fontSize: typography.xxl, fontWeight: '800' },
  heroS: { color: colors.text.muted, fontSize: typography.sm, marginTop: 4, textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center', borderWidth: 1 },
  statV: { fontSize: typography.lg, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { padding: spacing.md, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, minHeight: 110 },
  tileT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', marginTop: spacing.xs, textAlign: 'center' },
});
