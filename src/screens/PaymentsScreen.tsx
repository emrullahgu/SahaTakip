// PaymentsScreen — POZ-DEV-078
// Tüm tahsilatların listesi + filtre + yeni tahsilat oluşturma.

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
 FlatList,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  listPayments,
  deletePayment,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABEL,
} from '../services/payments';
import { Payment, RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';
import PressableScale from '../components/PressableScale';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { useHasRole } from '../components/RoleGuard';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Payments'>;
type Rt = RouteProp<RootStackParamList, 'Payments'>;

const STATUS_COLOR: Record<Payment['status'], string> = {
  received: brand.green,
  pending: '#f59e0b',
  cancelled: colors.text.muted,
  refunded: '#0ea5e9',
};

function fmtMoney(n: number): string {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function PaymentsScreen() {
  const canSee = useHasRole(['admin', 'manager']);
  if (!canSee) {
    return null;
  }
  return <PaymentsScreenInner />;
}

function PaymentsScreenInner() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const filterCustomerId = route.params?.customerId;
  const filterWorkOrderId = route.params?.workOrderId;

  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Payment['status'] | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await listPayments();
      let filtered = all;
      if (filterCustomerId) filtered = filtered.filter(p => p.customerId === filterCustomerId);
      if (filterWorkOrderId) filtered = filtered.filter(p => p.workOrderId === filterWorkOrderId);
      setItems(filtered.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)));
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [filterCustomerId, filterWorkOrderId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(
    () => statusFilter === 'all' ? items : items.filter(p => p.status === statusFilter),
    [items, statusFilter],
  );

  const totalReceived = useMemo(
    () => items.filter(p => p.status === 'received').reduce((s, p) => s + p.amount, 0),
    [items],
  );
  const totalPending = useMemo(
    () => items.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
    [items],
  );

  const onLongPress = (p: Payment) => {
    Alert.alert('Tahsilat', p.receiptNo ?? p.id, [
      { text: 'Kapat', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deletePayment(p.id);
          await load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Tahsilatlar</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() =>
            navigation.navigate('PaymentForm', {
              customerId: filterCustomerId,
              workOrderId: filterWorkOrderId,
            })
          }
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>Yeni</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summary}>
        <View style={[styles.sumCard, { borderColor: brand.green }]}>
          <Text style={styles.sumLabel}>Alınan</Text>
          <Text style={[styles.sumValue, { color: brand.green }]}>{fmtMoney(totalReceived)}</Text>
        </View>
        <View style={[styles.sumCard, { borderColor: '#f59e0b' }]}>
          <Text style={styles.sumLabel}>Bekleyen</Text>
          <Text style={[styles.sumValue, { color: '#f59e0b' }]}>{fmtMoney(totalPending)}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {(['all', 'received', 'pending', 'cancelled', 'refunded'] as const).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, statusFilter === s && styles.chipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
              {s === 'all' ? 'Tümü' : PAYMENT_STATUS_LABEL[s as keyof typeof PAYMENT_STATUS_LABEL]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={loaded ? (
          <EmptyState
            icon="cash-outline"
            title="Tahsilat yok"
            subtitle="Filtreyi değiştirerek tekrar deneyebilir veya yeni bir tahsilat ekleyebilirsiniz."
            actionLabel="+ Yeni Tahsilat"
            onAction={() =>
              navigation.navigate('PaymentForm', {
                customerId: filterCustomerId,
                workOrderId: filterWorkOrderId,
              })
            }
          />
        ) : null}
        renderItem={({ item: p }) => {
          const m = PAYMENT_METHODS.find(x => x.value === p.method);
          return (
            <PressableScale
              style={styles.card}
              onPress={() => navigation.navigate('PaymentDetail', { paymentId: p.id })}
              onLongPress={() => onLongPress(p)}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: STATUS_COLOR[p.status as keyof typeof STATUS_COLOR] + '22' },
                ]}
              >
                <Ionicons
                  name={(m?.icon ?? 'cash-outline') as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={STATUS_COLOR[p.status as keyof typeof STATUS_COLOR]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {p.customerName}
                </Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {p.receiptNo} · {fmtDate(p.receivedAt)} · {m?.label ?? p.method}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.amount, { color: STATUS_COLOR[p.status as keyof typeof STATUS_COLOR] }]}>
                  {fmtMoney(p.amount)}
                </Text>
                <Text style={[styles.statusChip, { color: STATUS_COLOR[p.status as keyof typeof STATUS_COLOR] }]}>
                  {PAYMENT_STATUS_LABEL[p.status as keyof typeof PAYMENT_STATUS_LABEL]}
                </Text>
              </View>
            </PressableScale>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  newBtn: {
    flexDirection: 'row',
    backgroundColor: brand.green,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 4,
    alignItems: 'center',
  },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
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
  chips: { paddingHorizontal: spacing.lg, gap: 6, paddingTop: spacing.sm },
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
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  cardSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  amount: { fontWeight: '800', fontSize: typography.sm },
  statusChip: { fontSize: 10, fontWeight: '700', marginTop: 2 },
});
