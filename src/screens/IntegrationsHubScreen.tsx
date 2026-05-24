// IntegrationsHubScreen — POZ-DEV-101..108 hub
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Section {
  title: string;
  tiles: { label: string; desc: string; icon: keyof typeof Ionicons.glyphMap; color: string; route: keyof RootStackParamList; poz: string }[];
}

const SECTIONS: Section[] = [
  {
    title: 'Entegrasyon',
    tiles: [
      { label: 'API Anahtarları', desc: 'REST API erişim kontrolü', icon: 'key-outline', color: '#0ea5e9', route: 'ApiKeys', poz: 'POZ-DEV-101' },
      { label: 'Webhook', desc: 'Olay tabanlı dış sistem bildirimi', icon: 'send-outline', color: '#8b5cf6', route: 'Webhooks', poz: 'POZ-DEV-102' },
      { label: 'Excel İçe Aktar', desc: 'Müşteri, POZ ve personel toplu yükleme', icon: 'cloud-upload-outline', color: '#16a34a', route: 'ExcelImport', poz: 'POZ-DEV-103' },
      { label: 'ERP / CRM', desc: 'Logo, Netsis, Mikro adaptörleri', icon: 'cube-outline', color: '#f59e0b', route: 'ErpAdapters', poz: 'POZ-DEV-104' },
    ],
  },
  {
    title: 'Güvenlik',
    tiles: [
      { label: 'KVKK', desc: 'Aydınlatma metni ve onay kayıtları', icon: 'shield-checkmark-outline', color: '#dc2626', route: 'Kvkk', poz: 'POZ-DEV-105' },
      { label: 'Yedekleme', desc: 'Veri yedek alma ve geri yükleme', icon: 'save-outline', color: '#0ea5e9', route: 'Backup', poz: 'POZ-DEV-106' },
      { label: 'İki Adımlı Doğrulama', desc: 'TOTP ile ek güvenlik katmanı', icon: 'lock-closed-outline', color: '#16a34a', route: 'TwoFactor', poz: 'POZ-DEV-107' },
      { label: 'Erişim Kuralları', desc: 'IP / cihaz kısıtlamaları', icon: 'filter-outline', color: '#8b5cf6', route: 'AccessRules', poz: 'POZ-DEV-108' },
    ],
  },
];

export default function IntegrationsHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : width >= 600 ? 2 : 1;
  const gap = spacing.md;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - gap * (cols - 1)) / cols;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Ionicons name="git-network-outline" size={26} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Entegrasyon & Güvenlik</Text>
            <Text style={styles.heroSub}>Dış sistem bağlantıları ve güvenlik politikaları</Text>
          </View>
        </View>

        {SECTIONS.map(s => (
          <View key={s.title} style={{ marginBottom: spacing.lg }}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <View style={[styles.grid, { gap }]}>
              {s.tiles.map(t => (
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
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#0ea5e9', borderRadius: radius.md, marginBottom: spacing.lg },
  heroTitle: { color: '#fff', fontSize: typography.lg, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  sectionTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { backgroundColor: colors.bg.secondary, borderWidth: 1, padding: spacing.md, borderRadius: radius.md },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  tileLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginBottom: 4 },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, lineHeight: 16, minHeight: 32 },
  tilePoz: { fontSize: 10, fontWeight: '800', marginTop: 8, letterSpacing: 0.5 },
});
