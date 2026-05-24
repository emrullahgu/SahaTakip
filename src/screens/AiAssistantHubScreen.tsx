// AiAssistantHubScreen — Faz 41
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tile = { route: keyof RootStackParamList; label: string; icon: keyof typeof Ionicons.glyphMap; color: string };

const TILES: Tile[] = [
  { route: 'AiSessions', label: 'AI Sohbet', icon: 'chatbubbles-outline', color: '#06b6d4' },
  { route: 'AiPozSuggest', label: 'POZ Öneri', icon: 'pricetag-outline', color: '#10b981' },
  { route: 'AiQuoteDraft', label: 'Teklif Taslağı', icon: 'document-text-outline', color: '#0ea5e9' },
  { route: 'AiWorkOrderSummary', label: 'İş Emri Özeti', icon: 'newspaper-outline', color: '#8b5cf6' },
  { route: 'AiCustomerInsight', label: 'Müşteri Özeti', icon: 'person-outline', color: '#a855f7' },
  { route: 'AiRiskAlerts', label: 'Risk Analizi', icon: 'warning-outline', color: '#f97316' },
  { route: 'AiDailyReport', label: 'Günlük Rapor', icon: 'calendar-outline', color: '#22c55e' },
  { route: 'AiPermissions', label: 'AI Yetkileri', icon: 'shield-checkmark-outline', color: '#64748b' },
  { route: 'AiUsageLogs', label: 'Kullanım Logları', icon: 'analytics-outline', color: '#ef4444' },
];

export default function AiAssistantHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
        <View style={s.hero}>
          <View style={[s.heroIcon, { backgroundColor: '#06b6d4' + '22' }]}>
            <Ionicons name="sparkles" size={52} color="#06b6d4" />
          </View>
          <Text style={s.title}>AI Saha Asistanı</Text>
          <Text style={s.sub}>Akıllı öneri, otomatik özet, risk analizi</Text>
        </View>
        <View style={s.grid}>
          {TILES.map(t => (
            <TouchableOpacity
              key={t.route}
              style={[s.tile, { width: `${100 / cols - 1}%`, borderColor: t.color }]}
              onPress={() => nav.navigate(t.route as never)}
              activeOpacity={0.85}
            >
              <View style={[s.tileIcon, { backgroundColor: t.color + '22' }]}>
                <Ionicons name={t.icon} size={26} color={t.color} />
              </View>
              <Text style={s.tileLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  hero: { alignItems: 'center', marginBottom: spacing.md, gap: 6 },
  heroIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text.primary, fontSize: typography.xxl, fontWeight: '800', marginTop: 8 },
  sub: { color: colors.text.muted, fontSize: typography.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any },
  tile: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', marginBottom: spacing.sm, gap: 8 },
  tileIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', textAlign: 'center' },
});
