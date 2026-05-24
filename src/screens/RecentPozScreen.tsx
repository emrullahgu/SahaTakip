// RecentPozScreen — POZ-DEV-136 Son kullanılan POZ listesi (hızlı erişim)
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { listRecentPozes, RecentPoz } from '../services/recentPozes';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TL = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;

export default function RecentPozScreen() {
  const nav = useNavigation<Nav>();
  const [list, setList] = useState<RecentPoz[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listRecentPozes();
      setList(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item, index }: { item: RecentPoz; index: number }) => {
    const total = item.materialPrice + item.installPrice + item.dismantlePrice;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => nav.navigate('NewQuote')}
        activeOpacity={0.85}
      >
        <View style={[styles.rank, { backgroundColor: index === 0 ? '#22c55e' : index < 3 ? '#0ea5e9' : '#64748b' }]}>
          <Text style={styles.rankText}>{item.count}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.poz}>{item.pozId}</Text>
          <Text style={styles.name} numberOfLines={2}>{item.pozName}</Text>
          <View style={styles.metaRow}>
            <Meta label="Malz." value={TL(item.materialPrice)} />
            <Meta label="Mtj." value={TL(item.installPrice)} />
            {item.dismantlePrice > 0 && <Meta label="Dmtj." value={TL(item.dismantlePrice)} />}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.total}>{TL(total)}</Text>
          <Text style={styles.unit}>/ {item.unit}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color="#0ea5e9" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={list}
        keyExtractor={item => item.pozId}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="time-outline" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Son Kullanılan POZ'lar</Text>
              <Text style={styles.heroSub}>{list.length} kayıt — kullanım sıklığına göre</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="Henüz kayıt yok"
            subtitle="Teklif oluşturdukça kullanılan POZ'lar burada listelenir."
          />
        }
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.text.muted} />}
      />
    </SafeAreaView>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#22c55e', borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, marginBottom: spacing.xs },
  rank: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  poz: { color: '#0ea5e9', fontWeight: '800', fontSize: typography.xs },
  name: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  metaPill: { flexDirection: 'row', gap: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.bg.primary, borderRadius: radius.sm },
  metaLabel: { color: colors.text.faint, fontSize: 10 },
  metaValue: { color: colors.text.muted, fontSize: 10, fontWeight: '700' },
  total: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  unit: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyText: { color: colors.text.muted, fontWeight: '700', fontSize: typography.sm },
  emptySub: { color: colors.text.faint, fontSize: typography.xs, textAlign: 'center' },
});
