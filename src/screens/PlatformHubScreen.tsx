// PlatformHubScreen — Faz 40
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { colors, spacing, radius, typography } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tile = { key: keyof RootStackParamList; label: string; icon: any; color: string };

const TILES: Tile[] = [
  { key: 'Tenants', label: 'Firmalar', icon: 'business-outline', color: '#0ea5e9' },
  { key: 'Modules', label: 'Modüller', icon: 'apps-outline', color: '#a855f7' },
  { key: 'Packages', label: 'Paketler', icon: 'pricetag-outline', color: '#f59e0b' },
  { key: 'Licenses', label: 'Lisanslar', icon: 'shield-checkmark-outline', color: '#22c55e' },
  { key: 'UsageLimits', label: 'Kullanım Limitleri', icon: 'speedometer-outline', color: '#ec4899' },
  { key: 'DbIndexHints', label: 'DB İndeks İpuçları', icon: 'server-outline', color: '#06b6d4' },
  { key: 'ArchivePolicies', label: 'Arşiv Politikaları', icon: 'archive-outline', color: '#8b5cf6' },
  { key: 'ArchiveJobs', label: 'Arşiv Görevleri', icon: 'file-tray-stacked-outline', color: '#10b981' },
  { key: 'Backups', label: 'Yedekler', icon: 'cloud-upload-outline', color: '#3b82f6' },
  { key: 'RestoreTests', label: 'Restore Testi', icon: 'refresh-circle-outline', color: '#eab308' },
  { key: 'SystemHealth', label: 'Sistem Sağlığı', icon: 'pulse-outline', color: '#84cc16' },
  { key: 'MaintenanceMode', label: 'Bakım Modu', icon: 'construct-outline', color: '#ef4444' },
];

export default function PlatformHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <View style={s.hero}>
          <Ionicons name="server-outline" size={52} color="#a855f7" />
          <Text style={s.heroT}>Platform Yönetimi</Text>
          <Text style={s.heroD}>Çoklu firma, modüller, lisans, bakım ve sistem sağlığı.</Text>
        </View>
        <View style={s.grid}>
          {TILES.map(t => (
            <TouchableOpacity key={t.key as string} onPress={() => nav.navigate(t.key as any)} style={[s.tile, { backgroundColor: t.color + '22', borderColor: t.color, width: `${100 / cols - 1}%` }]}>
              <Ionicons name={t.icon} size={28} color={t.color} />
              <Text style={s.tileT}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  hero: { alignItems: 'center', backgroundColor: '#a855f722', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: '#a855f7', marginBottom: spacing.md },
  heroT: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '800', marginTop: spacing.sm },
  heroD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  tile: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  tileT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', textAlign: 'center' },
});
