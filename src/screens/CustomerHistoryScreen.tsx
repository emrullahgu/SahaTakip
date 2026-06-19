// ====================================================================
// CustomerHistoryScreen — POZ-DEV-046
// Müşteriye ait teklif + iş emri + belge + puan kayıtlarından
// kronolojik timeline.
// ====================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, brand, spacing, radius, typography } from '../theme';
import { RootStackParamList, CustomerTimelineItem, CustomerTimelineKind } from '../types';
import { buildTimeline } from '../services/customerHistory';
import { averageScore } from '../services/customerRatings';
import { useAppContext } from '../context/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerHistory'>;

const KIND_META: Record<
  CustomerTimelineKind,
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  quote: { icon: 'document-text-outline', color: '#2563eb', label: 'Teklif' },
  workOrder: { icon: 'briefcase-outline', color: brand.green, label: 'İş Emri' },
  visit: { icon: 'location-outline', color: '#0891b2', label: 'Ziyaret' },
  document: { icon: 'attach-outline', color: '#a855f7', label: 'Belge' },
  rating: { icon: 'star-outline', color: '#eab308', label: 'Puan' },
};

export default function CustomerHistoryScreen({ route, navigation }: Props) {
  const { customerId } = route.params;
  const { customers, quotes, workOrders } = useAppContext();
  const customer = customers.find(c => c.id === customerId);
  const [items, setItems] = useState<CustomerTimelineItem[]>([]);
  const [avg, setAvg] = useState(0);

  useEffect(() => {
    if (!customer) return;
    buildTimeline(customer, quotes, workOrders).then(setItems);
    averageScore(customerId).then(setAvg);
  }, [customer, quotes, workOrders, customerId]);

  if (!customer) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Müşteri bulunamadı.</Text>
      </View>
    );
  }

  const handleTap = (item: CustomerTimelineItem) => {
    if (item.kind === 'quote' && item.refId) {
      navigation.navigate('QuoteDetail', { quoteId: item.refId });
    } else if (item.kind === 'workOrder' && item.refId) {
      navigation.navigate('WorkOrderDetail', { workOrderId: item.refId });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.head}>
        <Text style={styles.title}>{customer.shortName}</Text>
        <Text style={styles.sub}>{customer.title}</Text>
        <View style={styles.statsRow}>
          <Stat label="Teklif" value={items.filter(i => i.kind === 'quote').length} />
          <Stat label="İş Emri" value={items.filter(i => i.kind === 'workOrder').length} />
          <Stat label="Belge" value={items.filter(i => i.kind === 'document').length} />
          <Stat label="Puan Ort." value={avg ? avg.toFixed(1) : '–'} />
        </View>
      </View>

      <Text style={styles.section}>Zaman Çizelgesi ({items.length})</Text>
      {items.length === 0 && <Text style={styles.empty}>Henüz kayıt yok.</Text>}
      {items.map(it => {
        const meta = KIND_META[it.kind];
        return (
          <TouchableOpacity
            key={it.id}
            style={styles.card}
            onPress={() => handleTap(it)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { backgroundColor: meta.color + '22' }]}>
              <Ionicons name={meta.icon} size={18} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kind}>{meta.label}</Text>
              <Text style={styles.itemTitle} numberOfLines={1}>{it.title}</Text>
              {it.subtitle ? (
                <Text style={styles.itemSub} numberOfLines={1}>
                  {it.subtitle}
                </Text>
              ) : null}
            </View>
            <Text style={styles.date}>{it.date.slice(0, 10)}</Text>
          </TouchableOpacity>
        );
      })}
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
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 30 },
  head: {
    padding: 12,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    marginBottom: 14,
  },
  title: { color: colors.text.primary, fontSize: 18, fontWeight: '900' },
  sub: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  statsRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  statValue: { color: brand.green, fontSize: 14, fontWeight: '900' },
  statLabel: { color: colors.text.muted, fontSize: 10, marginTop: 2, fontWeight: '700', textTransform: 'uppercase' },
  section: { color: brand.green, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 8,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kind: { color: colors.text.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  itemTitle: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  itemSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  date: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
});
