// WebAdminScreen — POZ-DEV-095 web/admin layout hub (responsive grid)
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Tile {
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: keyof RootStackParamList;
  poz: string;
}

const TILES: Tile[] = [
  { label: 'Kullanıcı & Rol', desc: 'Yetkili kullanıcılar, roller ve yetkilendirme', icon: 'people-outline', color: '#6366f1', route: 'UsersAdmin', poz: 'POZ-DEV-098' },
  { label: 'Form Tasarımı', desc: 'Form şablonları ve özel alanlar', icon: 'document-text-outline', color: '#0ea5e9', route: 'FormTemplates', poz: 'POZ-DEV-099' },
  { label: 'Canlı Takip', desc: 'Saha personeli ve araç anlık konumları', icon: 'navigate-circle-outline', color: '#16a34a', route: 'LiveTracking', poz: 'POZ-DEV-100' },
  { label: 'Anomali Tespiti', desc: 'Sistem anomalileri ve kritik uyarılar', icon: 'pulse-outline', color: '#dc2626', route: 'Anomalies', poz: 'POZ-DEV-094' },
  { label: 'AI Asistan', desc: 'Yapay zeka destekli operasyonlar', icon: 'sparkles-outline', color: '#8b5cf6', route: 'AiHub', poz: 'POZ-DEV-090' },
  { label: 'Raporlar', desc: 'KPI ve gelişmiş dashboard', icon: 'bar-chart-outline', color: '#f59e0b', route: 'Reports', poz: 'POZ-DEV-064' },
];

export default function WebAdminScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 1100 ? 4 : width >= 750 ? 3 : width >= 520 ? 2 : 1;
  const gap = spacing.md;
  const tileWidth = (Math.min(width, 1400) - spacing.lg * 2 - gap * (cols - 1)) / cols;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="desktop-outline" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Web Admin Paneli</Text>
            <Text style={styles.heroSub}>
              {Platform.OS === 'web' ? 'Geniş ekran yönetim arayüzü' : 'Mobilden yönetim erişimi'} · {cols} sütun
            </Text>
          </View>
        </View>

        <View style={[styles.grid, { gap }]}>
          {TILES.map(t => (
            <TouchableOpacity
              key={t.route}
              style={[styles.tile, { width: tileWidth, borderColor: t.color + '44' }]}
              onPress={() => nav.navigate(t.route as never)}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIcon, { backgroundColor: t.color }]}>
                <Ionicons name={t.icon} size={22} color="#fff" />
              </View>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileDesc} numberOfLines={2}>{t.desc}</Text>
              <Text style={[styles.tilePoz, { color: t.color }]}>{t.poz}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>İpuçları</Text>
          <Tip text="Tüm liste ekranlarında üstteki arama çubuğunu kullanın (POZ-DEV-097)." />
          <Tip text="Kullanıcı listesinde kayıtları basılı tutarak toplu işlem yapın (POZ-DEV-096)." />
          <Tip text="Web tarayıcıdan açtığınızda yerleşim 4 sütuna kadar genişler." />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <View style={styles.tipRow}>
      <Ionicons name="bulb-outline" size={14} color="#f59e0b" />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, maxWidth: 1400, alignSelf: 'center', width: '100%' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#6366f1', borderRadius: radius.md, marginBottom: spacing.lg },
  heroIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontSize: typography.lg, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { backgroundColor: colors.bg.secondary, borderWidth: 1, padding: spacing.md, borderRadius: radius.md },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  tileLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginBottom: 4 },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, lineHeight: 16, minHeight: 32 },
  tilePoz: { fontSize: 10, fontWeight: '800', marginTop: 8, letterSpacing: 0.5 },
  tipsCard: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  tipsTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm, marginBottom: spacing.sm },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  tipText: { flex: 1, color: colors.text.muted, fontSize: typography.xs, lineHeight: 16 },
});
