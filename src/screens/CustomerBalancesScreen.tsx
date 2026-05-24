// CustomerBalancesScreen — POZ-DEV-080
// Müşteri bazlı bakiye (borç/alacak) listesi.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { computeCustomerBalances } from '../services/payments';
import { useAppContext } from '../context/AppContext';
import { CustomerBalance, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CustomerBalances'>;

function fmtMoney(n: number): string {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

export default function CustomerBalancesScreen() {
  const navigation = useNavigation<Nav>();
  const { customers, workOrders, quotes } = useAppContext();
  const [items, setItems] = useState<CustomerBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'debt' | 'paid'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await computeCustomerBalances(customers, workOrders, quotes);
      setItems(all.sort((a, b) => b.balance - a.balance));
    } finally {
      setLoading(false);
    }
  }, [customers, workOrders, quotes]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalDebt = items.filter(x => x.balance > 0).reduce((s, x) => s + x.balance, 0);
  const totalCredit = items.filter(x => x.balance < 0).reduce((s, x) => s + -x.balance, 0);

  const filtered =
    filter === 'all'
      ? items
      : filter === 'debt'
        ? items.filter(x => x.balance > 0.01)
        : items.filter(x => Math.abs(x.balance) <= 0.01);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Müşteri Bakiyeleri</Text>
      </View>

      <View style={styles.summary}>
        <View style={[styles.sumCard, { borderColor: colors.rose.default }]}>
          <Text style={styles.sumLabel}>Toplam Alacak</Text>
          <Text style={[styles.sumValue, { color: colors.rose.default }]}>{fmtMoney(totalDebt)}</Text>
        </View>
        <View style={[styles.sumCard, { borderColor: brand.green }]}>
          <Text style={styles.sumLabel}>Lehte Bakiye</Text>
          <Text style={[styles.sumValue, { color: brand.green }]}>{fmtMoney(totalCredit)}</Text>
        </View>
      </View>

      <View style={styles.chipsRow}>
        {(['all', 'debt', 'paid'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === 'all' ? 'Tümü' : f === 'debt' ? 'Borçlular' : 'Bakiyesi Kapalı'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>Kayıt yok.</Text>
          </View>
        ) : (
          filtered.map(b => {
            const owes = b.balance > 0.01;
            const color = owes ? colors.rose.default : b.balance < -0.01 ? brand.green : colors.text.muted;
            return (
              <TouchableOpacity
                key={b.customerId}
                style={styles.card}
                onPress={() => navigation.navigate('Payments', { customerId: b.customerId })}
                activeOpacity={0.85}
              >
                <View style={[styles.bar, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{b.customerName}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>Fatura: {fmtMoney(b.totalInvoiced)}</Text>
                    <Text style={styles.meta}>Tahsil: {fmtMoney(b.totalReceived)}</Text>
                    {b.pendingAmount > 0 ? (
                      <Text style={[styles.meta, { color: '#f59e0b' }]}>
                        Bekleyen: {fmtMoney(b.pendingAmount)}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.amount, { color }]}>
                    {owes ? '+' : b.balance < 0 ? '−' : ''}{fmtMoney(Math.abs(b.balance))}
                  </Text>
                  <Text style={styles.metaSmall}>
                    {owes ? 'Borçlu' : b.balance < 0 ? 'Lehte' : 'Kapalı'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  summary: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  sumCard: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sumLabel: { color: colors.text.muted, fontSize: typography.xs },
  sumValue: { fontWeight: '800', fontSize: typography.md, marginTop: 4 },
  chipsRow: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  chipActive: { backgroundColor: brand.blueLight, borderColor: brand.blueLight },
  chipText: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  card: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    overflow: 'hidden',
  },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  meta: { color: colors.text.muted, fontSize: typography.xs },
  metaSmall: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  amount: { fontWeight: '800', fontSize: typography.md },
});
