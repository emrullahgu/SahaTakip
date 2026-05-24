// Faz 53 — UatHubScreen
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
  { key: 'UatAdmin', label: 'Admin Senaryoları', icon: 'shield-checkmark', color: '#ef4444' },
  { key: 'UatManager', label: 'Yönetici Senaryoları', icon: 'briefcase', color: '#a855f7' },
  { key: 'UatField', label: 'Saha Senaryoları', icon: 'walk', color: '#22c55e' },
  { key: 'UatCustomer', label: 'Müşteri Senaryoları', icon: 'person', color: '#0ea5e9' },
  { key: 'UatQuote', label: 'Teklif E2E', icon: 'document-text', color: '#f59e0b' },
  { key: 'UatWorkOrder', label: 'İş Emri E2E', icon: 'construct', color: '#06b6d4' },
  { key: 'UatStock', label: 'Stok & Zimmet E2E', icon: 'cube', color: '#3b82f6' },
  { key: 'UatLocation', label: 'Konum & Rota E2E', icon: 'location', color: '#10b981' },
  { key: 'UatNotification', label: 'Bildirim Akışları', icon: 'notifications', color: '#ec4899' },
  { key: 'UatReport', label: 'Test Raporu', icon: 'analytics', color: '#8b5cf6' },
];

export default function UatHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileW = `${100 / cols - 1}%`;
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Ionicons name="checkmark-done-circle" size={100} color="#14b8a6" />
          <Text style={s.heroT}>Kabul Testleri</Text>
          <Text style={s.heroD}>Rol bazlı senaryolar, uçtan uca akışlar ve test raporlama</Text>
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
