// AgingReportScreen — POZ-DEV-186 Tahsilat yaş analizi (vade & gecikme)
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { CustomerBalance, RootStackParamList } from '../types';
import { useAppContext } from '../context/AppContext';
import { computeCustomerBalances } from '../services/payments';
import { useHasRole } from '../components/RoleGuard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Bucket = 'current' | '0-30' | '31-60' | '61-90' | '90+';

const BUCKET_LABEL: Record<Bucket, string> = {
  current: 'Güncel',
  '0-30': '0-30 gün',
  '31-60': '31-60 gün',
  '61-90': '61-90 gün',
  '90+': '90+ gün',
};

const BUCKET_COLOR: Record<Bucket, string> = {
  current: '#22c55e',
  '0-30': '#84cc16',
  '31-60': '#f59e0b',
  '61-90': '#fb923c',
  '90+': '#ef4444',
};

interface AgingRow extends CustomerBalance {
  bucket: Bucket;
  daysSincePayment: number;
}

function classify(b: CustomerBalance): { bucket: Bucket; days: number } {
  if (b.balance <= 0) return { bucket: 'current', days: 0 };
  if (!b.lastPaymentAt) return { bucket: '90+', days: 9999 };
  const days = Math.floor((Date.now() - new Date(b.lastPaymentAt).getTime()) / (24 * 3600 * 1000));
  if (days <= 30) return { bucket: '0-30', days };
  if (days <= 60) return { bucket: '31-60', days };
  if (days <= 90) return { bucket: '61-90', days };
  return { bucket: '90+', days };
}

export default function AgingReportScreen() {
  const canSee = useHasRole(['admin', 'manager']);
  if (!canSee) {
    return null;
  }
  return <AgingReportInner />;
}

function AgingReportInner() {
  const nav = useNavigation<Nav>();
  const { customers, workOrders, quotes } = useAppContext();
  const [balances, setBalances] = useState<CustomerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Bucket | 'all'>('all');

  useEffect(() => {
    (async () => {
      try { setBalances(await computeCustomerBalances(customers, workOrders, quotes)); }
      finally { setLoading(false); }
    })();
  }, [customers, workOrders, quotes]);

  const rows: AgingRow[] = useMemo(() => {
    return balances
      .filter(b => b.balance > 0)
      .map(b => {
        const { bucket, days } = classify(b);
        return { ...b, bucket, daysSincePayment: days };
      })
      .sort((a, b) => b.daysSincePayment - a.daysSincePayment);
  }, [balances]);

  const buckets = useMemo(() => {
    const out: Record<Bucket, { count: number; amount: number }> = {
      current: { count: 0, amount: 0 },
      '0-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 },
    };
    for (const r of rows) {
      out[r.bucket].count++;
      out[r.bucket].amount += r.balance;
    }
    return out;
  }, [rows]);

  const totalOverdue = Object.entries(buckets).filter(([k]) => k !== 'current').reduce((s, [, v]) => s + v.amount, 0);

  const filtered = filter === 'all' ? rows : rows.filter(r => r.bucket === filter);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color="#ef4444" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="hourglass-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Tahsilat Yaşı</Text>
            <Text style={styles.heroSub}>₺{totalOverdue.toLocaleString('tr-TR')} bekleyen alacak</Text>
          </View>
        </View>

        <View style={styles.bucketRow}>
          {(['0-30', '31-60', '61-90', '90+'] as Bucket[]).map(b => (
            <TouchableOpacity
              key={b}
              style={[styles.bucket, { borderColor: BUCKET_COLOR[b] }, filter === b && { backgroundColor: BUCKET_COLOR[b] + '22' }]}
              onPress={() => setFilter(filter === b ? 'all' : b)}
              activeOpacity={0.85}
            >
              <Text style={[styles.bucketLabel, { color: BUCKET_COLOR[b] }]}>{BUCKET_LABEL[b]}</Text>
              <Text style={styles.bucketAmount}>₺{buckets[b].amount.toLocaleString('tr-TR')}</Text>
              <Text style={styles.bucketCount}>{buckets[b].count} müşteri</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filter !== 'all' && (
          <TouchableOpacity onPress={() => setFilter('all')} style={styles.clearBtn}>
            <Ionicons name="close-circle-outline" size={14} color={colors.text.muted} />
            <Text style={styles.clearText}>Filtreyi temizle ({BUCKET_LABEL[filter as Bucket]})</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.section}>{filtered.length} müşteri</Text>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>Bu kategoride borç yok</Text>
        ) : filtered.map(r => (
          <TouchableOpacity
            key={r.customerId}
            style={[styles.row, { borderLeftColor: BUCKET_COLOR[r.bucket] }]}
            onPress={() => nav.navigate('Payments', { customerId: r.customerId })}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName} numberOfLines={1}>{r.customerName}</Text>
              <Text style={styles.rowMeta}>
                {r.lastPaymentAt ? `Son: ${new Date(r.lastPaymentAt).toLocaleDateString('tr-TR')} · ${r.daysSincePayment} gün` : 'Ödeme yapılmamış'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.rowAmount, { color: BUCKET_COLOR[r.bucket] }]}>
                ₺{r.balance.toLocaleString('tr-TR')}
              </Text>
              <View style={[styles.bucketPill, { backgroundColor: BUCKET_COLOR[r.bucket] + '22' }]}>
                <Text style={[styles.bucketPillText, { color: BUCKET_COLOR[r.bucket] }]}>{BUCKET_LABEL[r.bucket]}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#ef4444', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  bucketRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  bucket: { flex: 1, minWidth: 140, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderRadius: radius.md },
  bucketLabel: { fontSize: typography.xs, fontWeight: '800' },
  bucketAmount: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '900', marginTop: 2 },
  bucketCount: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  clearText: { color: colors.text.muted, fontSize: typography.xs },
  section: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  empty: { color: colors.text.muted, fontSize: typography.xs, padding: spacing.md, textAlign: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 3, borderRadius: radius.md },
  rowName: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  rowMeta: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  rowAmount: { fontSize: typography.sm, fontWeight: '900' },
  bucketPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full, marginTop: 4 },
  bucketPillText: { fontSize: 9, fontWeight: '800' },
});
