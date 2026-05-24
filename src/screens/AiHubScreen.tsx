// AiHubScreen — POZ-DEV-090..094 merkezi (yapay zeka modülleri)
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { AI_PROVIDER_LABEL, getAiSettings } from '../services/ai';
import { AiSettings, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AiHub'>;

interface Tile {
  key: keyof RootStackParamList;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  poz: string;
}

const TILES: Tile[] = [
  { key: 'SmartPozSuggest', title: 'Akıllı POZ Önerisi', desc: 'İş tanımından otomatik kalem öner', icon: 'sparkles-outline', color: '#8b5cf6', poz: 'POZ-DEV-090' },
  { key: 'PhotoAnalysis', title: 'Fotoğraf Analizi', desc: 'Hasar / arıza tespiti', icon: 'camera-outline', color: '#ec4899', poz: 'POZ-DEV-091' },
  { key: 'VoiceReport', title: 'Sesli Rapor', desc: 'Transkriptten özet + eylem', icon: 'mic-outline', color: '#0ea5e9', poz: 'POZ-DEV-092' },
  { key: 'RouteOptimizer', title: 'Rota Optimizasyonu', desc: 'En kısa saha turu (TSP)', icon: 'map-outline', color: '#16a34a', poz: 'POZ-DEV-093' },
  { key: 'Anomalies', title: 'Anomali Tespiti', desc: 'Gecikme / maliyet / pasiflik', icon: 'pulse-outline', color: '#dc2626', poz: 'POZ-DEV-094' },
];

export default function AiHubScreen() {
  const nav = useNavigation<Nav>();
  const [settings, setSettings] = useState<AiSettings | null>(null);

  const refresh = useCallback(async () => { setSettings(await getAiSettings()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const isLive = settings && settings.provider !== 'mock' && !!settings.apiKey;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroHead}>
            <View style={[styles.heroIcon, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
              <Ionicons name="sparkles" size={28} color="#a78bfa" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>AI Asistan</Text>
              <Text style={styles.heroDesc}>Saha verisinden akıllı çıktılar</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.statusBar} onPress={() => nav.navigate('AiSettings')}>
            <View style={[styles.statusDot, { backgroundColor: isLive ? brand.green : '#f59e0b' }]} />
            <Text style={styles.statusText}>
              {settings ? AI_PROVIDER_LABEL[settings.provider] : 'Yükleniyor…'}
              {isLive ? ` · ${settings?.model || 'varsayılan model'}` : ' · Demo modda'}
            </Text>
            <Ionicons name="settings-outline" size={16} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        {TILES.map(t => (
          <TouchableOpacity
            key={t.key as string}
            style={styles.tile}
            onPress={() => nav.navigate(t.key as never)}
            activeOpacity={0.85}
          >
            <View style={[styles.tileIcon, { backgroundColor: t.color + '22', borderColor: t.color + '55' }]}>
              <Ionicons name={t.icon} size={22} color={t.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tileTitle}>{t.title}</Text>
              <Text style={styles.tileDesc}>{t.desc}</Text>
              <Text style={styles.tilePoz}>{t.poz}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.faint} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  heroCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', backgroundColor: 'rgba(139,92,246,0.08)', marginBottom: spacing.md },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroDesc: { color: colors.text.muted, fontSize: typography.sm, marginTop: 2 },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(139,92,246,0.2)' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { flex: 1, color: colors.text.secondary, fontSize: typography.xs, fontWeight: '600' },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginTop: spacing.sm },
  tileIcon: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tilePoz: { color: colors.text.faint, fontSize: 10, marginTop: 4, fontWeight: '700', letterSpacing: 0.5 },
});
