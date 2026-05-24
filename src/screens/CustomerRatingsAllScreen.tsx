// CustomerRatingsAllScreen — POZ-DEV-142 Tüm müşteri memnuniyet puanları (özet + son yorumlar)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, CustomerRating, Customer } from '../types';
import { useAppContext } from '../context/AppContext';
import { listRatings } from '../services/customerRatings';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Row {
  customerId: string;
  customerName: string;
  count: number;
  avg: number;
  last?: CustomerRating;
}

export default function CustomerRatingsAllScreen() {
  const nav = useNavigation<Nav>();
  const { customers } = useAppContext();
  const [ratings, setRatings] = useState<CustomerRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listRatings();
      setRatings(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { rows, overallAvg, totalCount } = useMemo(() => {
    const map = new Map<string, CustomerRating[]>();
    for (const r of ratings) {
      const list = map.get(r.customerId) || [];
      list.push(r);
      map.set(r.customerId, list);
    }
    const rs: Row[] = [];
    for (const [cid, list] of map) {
      const sum = list.reduce((a, r) => a + r.score, 0);
      const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const cust = customers.find((c: Customer) => c.id === cid);
      rs.push({
        customerId: cid,
        customerName: cust?.shortName || cust?.title || 'Bilinmeyen',
        count: list.length,
        avg: sum / list.length,
        last: sorted[0],
      });
    }
    rs.sort((a, b) => b.avg - a.avg || b.count - a.count);
    const tot = ratings.length;
    const oAvg = tot > 0 ? ratings.reduce((a, r) => a + r.score, 0) / tot : 0;
    return { rows: rs, overallAvg: oAvg, totalCount: tot };
  }, [ratings, customers]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color="#f59e0b" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={rows}
        keyExtractor={r => r.customerId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.85}
            onPress={() => nav.navigate('CustomerPortal', { customerId: item.customerId })}
          >
            <View style={[styles.avgBadge, { backgroundColor: avgColor(item.avg) }]}>
              <Text style={styles.avgText}>{item.avg.toFixed(1)}</Text>
              <Ionicons name="star" size={10} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.customerName}</Text>
              <Text style={styles.meta}>{item.count} puan</Text>
              {item.last?.comment ? (
                <Text style={styles.comment} numberOfLines={2}>"{item.last.comment}"</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Ionicons name="star-outline" size={28} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Müşteri Memnuniyet</Text>
                <Text style={styles.heroSub}>{totalCount} puan • {rows.length} müşteri</Text>
              </View>
            </View>
            {totalCount > 0 && (
              <View style={styles.sumCard}>
                <Ionicons name="trophy-outline" size={20} color="#f59e0b" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sumLabel}>Genel Ortalama</Text>
                  <Text style={styles.sumValue}>{overallAvg.toFixed(2)} / 5</Text>
                </View>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="star-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>Henüz puan kaydı yok</Text>
            <Text style={styles.emptySub}>İş emri tamamlandığında müşteriden puan toplayın.</Text>
          </View>
        }
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.text.muted} />}
      />
    </SafeAreaView>
  );
}

function avgColor(avg: number): string {
  if (avg >= 4.5) return '#22c55e';
  if (avg >= 3.5) return '#f59e0b';
  if (avg >= 2.5) return '#fb923c';
  return '#ef4444';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#f59e0b', borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  sumCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, borderLeftWidth: 4, borderLeftColor: '#f59e0b', marginBottom: spacing.md },
  sumLabel: { color: colors.text.muted, fontSize: typography.xs },
  sumValue: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, marginBottom: spacing.xs },
  avgBadge: { width: 56, paddingVertical: 8, borderRadius: radius.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 3 },
  avgText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  name: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  comment: { color: colors.text.faint, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyText: { color: colors.text.muted, fontWeight: '700', fontSize: typography.sm },
  emptySub: { color: colors.text.faint, fontSize: typography.xs, textAlign: 'center' },
});
