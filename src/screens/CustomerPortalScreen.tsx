// ====================================================================
// CustomerPortalScreen — POZ-DEV-048
// Müşteri kendi teklif & iş emirlerini görür. Read-only.
// Genellikle deep link / paylaşımlı link ile açılır; auth duvarı yok.
// ====================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, brand, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { useAppContext } from '../context/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerPortal'>;

export default function CustomerPortalScreen({ route, navigation }: Props) {
  const { customerId } = route.params;
  const { customers, quotes, workOrders } = useAppContext();
  const customer = customers.find(c => c.id === customerId);

  const myQuotes = useMemo(
    () =>
      customer
        ? quotes.filter(
            q => q.customerName === customer.shortName || q.customerTitle === customer.title,
          )
        : [],
    [customer, quotes],
  );

  const myWorkOrders = useMemo(
    () =>
      customer
        ? workOrders.filter(w => w.client === customer.shortName || w.client === customer.title)
        : [],
    [customer, workOrders],
  );

  if (!customer) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Müşteri bulunamadı.</Text>
      </View>
    );
  }

  const totalAccepted = myQuotes
    .filter(q => q.status === 'Kabul Edildi' || q.status === 'Faturalandırıldı')
    .reduce((s, q) => s + q.grandTotal, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.banner}>
        <Ionicons name="person-circle-outline" size={36} color={brand.green} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{customer.shortName}</Text>
          <Text style={styles.sub} numberOfLines={2}>{customer.title}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Teklif" value={myQuotes.length} />
        <Stat label="İş Emri" value={myWorkOrders.length} />
        <Stat label="Toplam (₺)" value={(totalAccepted / 1000).toFixed(0) + 'K'} />
      </View>

      <Text style={styles.section}>Tekliflerim</Text>
      {myQuotes.length === 0 && <Text style={styles.empty}>Teklif yok.</Text>}
      {myQuotes.map(q => (
        <TouchableOpacity
          key={q.id}
          style={styles.card}
          onPress={() => navigation.navigate('QuoteDetail', { quoteId: q.id })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{q.number}</Text>
            <Text style={styles.cardSub} numberOfLines={1}>{q.title}</Text>
            <Text style={styles.cardMeta}>{q.date} · {q.status}</Text>
          </View>
          <Text style={styles.amount}>
            ₺{q.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
          </Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.section}>İş Emirleri</Text>
      {myWorkOrders.length === 0 && <Text style={styles.empty}>İş emri yok.</Text>}
      {myWorkOrders.map(w => (
        <TouchableOpacity
          key={w.id}
          style={styles.card}
          onPress={() => navigation.navigate('WorkOrderDetail', { workOrderId: w.id })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{w.id}</Text>
            <Text style={styles.cardSub} numberOfLines={1}>{w.serviceName}</Text>
            <Text style={styles.cardMeta}>{w.date} · {w.status}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 16, marginBottom: 16 },
  banner: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: brand.green,
    alignItems: 'center',
    marginBottom: 14,
  },
  title: { color: colors.text.primary, fontSize: 18, fontWeight: '900' },
  sub: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  stat: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  statValue: { color: brand.green, fontSize: 16, fontWeight: '900' },
  statLabel: { color: colors.text.muted, fontSize: 9, marginTop: 4, fontWeight: '700', textTransform: 'uppercase' },
  section: { color: brand.green, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  card: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
  },
  cardTitle: { color: brand.green, fontWeight: '800', fontSize: typography.sm },
  cardSub: { color: colors.text.primary, fontSize: typography.sm, marginTop: 2 },
  cardMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  amount: { color: colors.text.primary, fontWeight: '900', fontSize: typography.sm },
});
