// Faz 44 — LiveOpsHubScreen
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
  { key: 'LiveOpsMap', label: 'Canlı Harita', icon: 'map', color: '#0ea5e9' },
  { key: 'JobHeatmap', label: 'İş Yoğunluğu', icon: 'flame', color: '#ef4444' },
  { key: 'PersonnelAvailability', label: 'Personel Durumu', icon: 'people', color: '#22c55e' },
  { key: 'SmartRouteSuggest', label: 'Akıllı Rota', icon: 'git-network', color: '#8b5cf6' },
  { key: 'EtaEstimate', label: 'ETA Hesaplama', icon: 'time', color: '#f59e0b' },
  { key: 'RouteDeviationAlerts', label: 'Rota Uyarıları', icon: 'warning', color: '#f97316' },
  { key: 'SiteEventLogs', label: 'Varış/Ayrılış', icon: 'log-in', color: '#06b6d4' },
  { key: 'TeamPerformanceLayer', label: 'Ekip Performans', icon: 'trophy', color: '#eab308' },
  { key: 'OperationReplay', label: 'Gün Replay', icon: 'play-circle', color: '#a855f7' },
];

export default function LiveOpsHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
        <View style={s.hero}>
          <Ionicons name="map" size={100} color="#0ea5e9" />
          <Text style={s.title}>Canlı Operasyon</Text>
          <Text style={s.sub}>Harita, rota, yoğunluk ve gerçek zamanlı saha takibi</Text>
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
