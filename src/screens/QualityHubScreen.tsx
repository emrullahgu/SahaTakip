// QualityHubScreen — POZ-DEV-330 Faz 34 hub
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'QualityHub'>;

const TILES: { key: keyof RootStackParamList; label: string; icon: string; color: string; desc: string }[] = [
  { key: 'CrashReports', label: 'Crash Raporları', icon: 'bug-outline', color: '#ef4444', desc: 'Yakalanan hatalar ve stack' },
  { key: 'Feedback', label: 'Geri Bildirimler', icon: 'chatbox-ellipses-outline', color: '#0ea5e9', desc: 'Kullanıcı önerileri / şikâyetler' },
  { key: 'PerformanceMetrics', label: 'Performans', icon: 'speedometer-outline', color: '#f59e0b', desc: 'Ekran açılış süreleri' },
  { key: 'ReleaseNotes', label: 'Sürüm Notları', icon: 'document-text-outline', color: '#a855f7', desc: 'Yeni özellikler & düzeltmeler' },
  { key: 'EnvironmentInfo', label: 'Ortam Bilgisi', icon: 'cube-outline', color: '#22c55e', desc: 'Build / env / versiyon' },
  { key: 'TestPlan', label: 'Test Planı', icon: 'checkmark-done-circle-outline', color: '#06b6d4', desc: 'Kritik akış kontrol listesi' },
];

export default function QualityHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileW = (width - spacing.md * 2 - spacing.sm * (cols - 1)) / cols;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="ribbon-outline" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>Kalite & Yayın</Text>
            <Text style={s.heroS}>FAZ 34 — Test, hata izleme, performans, sürüm yönetimi</Text>
          </View>
        </View>

        <View style={s.grid}>
          {TILES.map(t => (
            <TouchableOpacity key={t.key} style={[s.tile, { width: tileW, borderLeftColor: t.color }]} onPress={() => nav.navigate(t.key as never)}>
              <View style={[s.tileIcon, { backgroundColor: t.color + '22' }]}>
                <Ionicons name={t.icon as never} size={22} color={t.color} />
              </View>
              <Text style={s.tileLabel}>{t.label}</Text>
              <Text style={s.tileDesc} numberOfLines={2}>{t.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: '#6366f1', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
  heroS: { color: '#fff', opacity: 0.9, fontSize: typography.sm, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderLeftWidth: 4, gap: 6, borderWidth: 1, borderColor: colors.border.primary },
  tileIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs },
});
