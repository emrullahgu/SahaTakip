// CustomerHubScreen — POZ-DEV-141 Müşteri yönetim merkez ekranı
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { useAppContext } from '../context/AppContext';
import { listSites } from '../services/customerSites';
import { listDocuments } from '../services/customerDocuments';
import { listRatings } from '../services/customerRatings';

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
  { key: 'Customers',          label: 'Müşteriler',       desc: 'Liste / form / detay',         icon: 'people-outline',         color: '#0ea5e9', poz: 'POZ-DEV-043' },
  { key: 'CustomerSitesMap',   label: 'Saha Haritası',    desc: 'Tüm müşteri sahaları',         icon: 'map-outline',            color: '#22c55e', poz: 'POZ-DEV-143' },
  { key: 'CustomerRatingsAll', label: 'Memnuniyet',       desc: 'Tüm puanlar & ortalama',       icon: 'star-outline',           color: '#f59e0b', poz: 'POZ-DEV-142' },
  { key: 'CustomerBalances',   label: 'Cari Bakiye',      desc: 'Borç / alacak',                icon: 'wallet-outline',         color: '#8b5cf6', poz: 'POZ-DEV-046' },
  { key: 'SalesVisits',        label: 'Ziyaretler',       desc: 'Saha ziyaret kayıtları',       icon: 'walk-outline',           color: '#0ea5e9', poz: 'POZ-DEV-049' },
];

export default function CustomerHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - (cols - 1) * spacing.md) / cols;

  const { customers } = useAppContext();
  const [siteCount, setSiteCount] = useState(0);
  const [docCount, setDocCount] = useState(0);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [sites, docs, ratings] = await Promise.all([listSites(), listDocuments(), listRatings()]);
        setSiteCount(sites.length);
        setDocCount(docs.length);
        setRatingCount(ratings.length);
        if (ratings.length > 0) {
          const sum = ratings.reduce((a, r) => a + r.score, 0);
          setRatingAvg(sum / ratings.length);
        }
      } catch {}
    })();
  }, []);

  const customerCount = customers.length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="briefcase-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Müşteri Merkezi</Text>
            <Text style={styles.heroSub}>Müşteri, saha, belge, memnuniyet</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Pill label={`Müşteri: ${customerCount}`} color="#0ea5e9" icon="people-outline" />
          <Pill label={`Saha: ${siteCount}`} color="#22c55e" icon="business-outline" />
          <Pill label={`Belge: ${docCount}`} color="#8b5cf6" icon="document-attach-outline" />
          <Pill label={`Puan: ${ratingCount}`} color="#f59e0b" icon="star-outline" />
        </View>

        {ratingAvg !== null && (
          <View style={styles.sumCard}>
            <Ionicons name="star" size={20} color="#f59e0b" />
            <View style={{ flex: 1 }}>
              <Text style={styles.sumLabel}>Ortalama Memnuniyet</Text>
              <Text style={styles.sumValue}>{ratingAvg.toFixed(2)} / 5</Text>
            </View>
          </View>
        )}

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
  sumCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  sumLabel: { color: colors.text.muted, fontSize: typography.xs },
  sumValue: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tilePoz: { color: colors.text.faint, fontSize: 10, marginTop: 6, fontWeight: '700' },
});
