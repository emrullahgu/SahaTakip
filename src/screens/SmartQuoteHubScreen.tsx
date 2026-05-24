// Faz 43 — SmartQuoteHub
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const TILES: { key: keyof RootStackParamList; label: string; icon: any; color: string }[] = [
  { key: 'SurveyForms', label: 'Keşif/Metraj', icon: 'clipboard', color: '#0ea5e9' },
  { key: 'PozLibrary', label: 'POZ Kütüphane', icon: 'library', color: '#8b5cf6' },
  { key: 'PriceListVersions', label: 'Fiyat Listeleri', icon: 'pricetags', color: '#22c55e' },
  { key: 'QuoteCalculator', label: 'Hesap Motoru', icon: 'calculator', color: '#f59e0b' },
  { key: 'HvTransformerQuote', label: 'YG Trafo', icon: 'flash', color: '#ef4444' },
  { key: 'PeriodicCheckQuote', label: 'Periyodik Kontrol', icon: 'shield-checkmark', color: '#06b6d4' },
  { key: 'GesQuote', label: 'GES', icon: 'sunny', color: '#eab308' },
  { key: 'CompensationQuote', label: 'Kompanzasyon', icon: 'pulse', color: '#a855f7' },
  { key: 'QuoteRevisionCompare', label: 'Revizyon Karşı.', icon: 'git-compare', color: '#0ea5e9' },
  { key: 'QuoteOutcomes', label: 'Kazan/Kayıp', icon: 'analytics', color: '#22c55e' },
  { key: 'AiQuoteImprovements', label: 'AI Öneriler', icon: 'sparkles', color: '#06b6d4' },
];

export default function SmartQuoteHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
        <View style={s.hero}>
          <Ionicons name="bulb" size={100} color="#eab308" />
          <Text style={s.title}>Akıllı Teklif</Text>
          <Text style={s.sub}>Keşif, metraj, hesap motorları ve AI öneriler</Text>
        </View>
        <View style={s.grid}>
          {TILES.map(t => (
            <TouchableOpacity key={t.key as string} style={[s.tile, { width: `${100 / cols - 1}%` as any, backgroundColor: t.color }]} onPress={() => nav.navigate(t.key as any)}>
              <Ionicons name={t.icon} size={30} color="#fff" />
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
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  title: { color: colors.text.primary, fontSize: typography.xxl, fontWeight: '800', marginTop: spacing.sm },
  sub: { color: colors.text.muted, fontSize: typography.sm, marginTop: 4, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any, marginTop: spacing.md },
  tile: { padding: spacing.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, minHeight: 100 },
  tileT: { color: '#fff', fontSize: typography.xs, fontWeight: '700', marginTop: 6, textAlign: 'center' },
});
