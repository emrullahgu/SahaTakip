// QuoteFlowHubScreen — POZ-DEV-133 Teklif sistemi merkez ekranı
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { useAppContext } from '../context/AppContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Tile {
  key: keyof RootStackParamList;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  poz?: string;
}

const TILES: Tile[] = [
  { key: 'NewQuote',         label: 'Yeni Teklif',       desc: 'POZ + 4 sütun ile',           icon: 'add-circle-outline',  color: '#0ea5e9', poz: 'POZ-DEV-033' },
  { key: 'QuoteTemplates',   label: 'Şablonlar',         desc: 'Kompanzasyon / YG / Tava',    icon: 'albums-outline',      color: '#8b5cf6', poz: 'POZ-DEV-041' },
  { key: 'RecentPoz',        label: 'Son Kullanılanlar', desc: 'Hızlı POZ ekleme',            icon: 'time-outline',        color: '#22c55e', poz: 'POZ-DEV-136' },
  { key: 'Customers',        label: 'Müşteriler',        desc: 'Müşteri & saha',              icon: 'people-outline',      color: '#f59e0b' },
];

const TL = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;

export default function QuoteFlowHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - (cols - 1) * spacing.md) / cols;

  const { quotes } = useAppContext();

  const stats = useMemo(() => {
    const total = quotes.length;
    const draft = quotes.filter(q => q.status === 'Taslak').length;
    const sent = quotes.filter(q => q.status === 'Müşteriye Gönderildi' || q.status === 'Onay Bekliyor').length;
    const accepted = quotes.filter(q => q.status === 'Kabul Edildi' || q.status === 'Faturalandırıldı').length;
    const sum = quotes.reduce((a, q) => a + (q.grandTotal || 0), 0);
    return { total, draft, sent, accepted, sum };
  }, [quotes]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="document-text-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Teklif Sistemi</Text>
            <Text style={styles.heroSub}>Hazırla, gönder, paylaş, onaylat</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Pill label={`Toplam: ${stats.total}`} color="#64748b" icon="layers-outline" />
          <Pill label={`Taslak: ${stats.draft}`} color="#0ea5e9" icon="create-outline" />
          <Pill label={`Gönderilen: ${stats.sent}`} color="#f59e0b" icon="send-outline" />
          <Pill label={`Kabul: ${stats.accepted}`} color="#22c55e" icon="checkmark-circle-outline" />
        </View>

        <View style={styles.sumCard}>
          <Ionicons name="cash-outline" size={20} color="#22c55e" />
          <View style={{ flex: 1 }}>
            <Text style={styles.sumLabel}>Toplam Teklif Tutarı</Text>
            <Text style={styles.sumValue}>{TL(stats.sum)}</Text>
          </View>
        </View>

        <View style={[styles.grid, { maxWidth: 1200, alignSelf: 'center', width: '100%' }]}>
          {TILES.map(t => (
            <TouchableOpacity
              key={String(t.key)}
              style={[styles.tile, { width: tileWidth }]}
              onPress={() => nav.navigate(t.key as never)}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIcon, { backgroundColor: t.color }]}>
                <Ionicons name={t.icon} size={22} color="#fff" />
              </View>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileDesc}>{t.desc}</Text>
              {t.poz && <Text style={styles.tilePoz}>{t.poz}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ label, color, icon }: { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.pill, { borderColor: color, backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#0ea5e9', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  sumCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, borderLeftWidth: 4, borderLeftColor: '#22c55e' },
  sumLabel: { color: colors.text.muted, fontSize: typography.xs },
  sumValue: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tilePoz: { color: colors.text.faint, fontSize: 10, marginTop: 6, fontWeight: '700' },
});
