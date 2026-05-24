// Faz 49 — SecHubScreen
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Tile = { route: keyof RootStackParamList; icon: string; color: string; title: string; desc: string };

const TILES: Tile[] = [
  { route: 'SecClassification', icon: 'pricetag', color: '#ef4444', title: 'Veri Sınıflandırma', desc: 'Hassas alan etiketleme' },
  { route: 'KvkkRequests', icon: 'document-text', color: '#0ea5e9', title: 'KVKK Talepleri', desc: 'Veri sahibi başvuruları' },
  { route: 'DataExport', icon: 'cloud-download', color: '#22c55e', title: 'Veri Dışa Aktarım', desc: 'Kullanıcı veri kopyası' },
  { route: 'DataErasure', icon: 'trash', color: '#dc2626', title: 'Veri Silme', desc: 'Anonimleştirme ve silme' },
  { route: 'SecDevices', icon: 'phone-portrait', color: '#a855f7', title: 'Cihaz Oturumları', desc: 'Aktif cihaz yönetimi' },
  { route: 'SuspiciousActivity', icon: 'warning', color: '#f59e0b', title: 'Şüpheli Aktivite', desc: 'Anomali tespiti' },
  { route: 'AdminAlerts', icon: 'notifications', color: '#ec4899', title: 'Admin Uyarıları', desc: 'Kritik işlem bildirimi' },
  { route: 'BackupReport', icon: 'save', color: '#14b8a6', title: 'Yedek Raporu', desc: 'Doğrulama geçmişi' },
  { route: 'DrPlan', icon: 'shield-checkmark', color: '#0ea5e9', title: 'Felaket Kurtarma', desc: 'RPO/RTO ve adımlar' },
  { route: 'SecHealth', icon: 'pulse', color: '#facc15', title: 'Güvenlik Skoru', desc: 'Kurumsal sağlık özeti' },
];

export default function SecHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileW = `${100 / cols - 1}%`;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Ionicons name="lock-closed" size={100} color="#ef4444" />
          <Text style={s.heroT}>Güvenlik & Uyumluluk</Text>
          <Text style={s.heroS}>KVKK, yedekleme, denetim ve sağlık skoru</Text>
        </View>

        <View style={s.grid}>
          {TILES.map(t => (
            <TouchableOpacity key={t.route} style={[s.tile, { width: tileW as any, borderColor: t.color }]} onPress={() => nav.navigate(t.route as any)} activeOpacity={0.85}>
              <View style={[s.tileIcon, { backgroundColor: t.color + '22' }]}>
                <Ionicons name={t.icon as any} size={28} color={t.color} />
              </View>
              <Text style={s.tileT}>{t.title}</Text>
              <Text style={s.tileD}>{t.desc}</Text>
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
  hero: { alignItems: 'center', gap: 6, paddingVertical: spacing.md },
  heroT: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '800' },
  heroS: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any },
  tile: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  tileIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  tileT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', textAlign: 'center' },
  tileD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
});
