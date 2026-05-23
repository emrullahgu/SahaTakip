// SlaScreen — POZ-DEV-070
// SLA / planlanan bitişi geçmiş, hâlâ tamamlanmamış iş emirleri.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import { listSlaItems } from '../services/reports';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Sla'>;

function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} dk`;
  if (h < 48) return `${h.toFixed(1)} sa`;
  return `${Math.floor(h / 24)} gün ${Math.round(h % 24)} sa`;
}

export default function SlaScreen() {
  const navigation = useNavigation<Nav>();
  const { workOrders } = useAppContext();
  const items = useMemo(() => listSlaItems(workOrders), [workOrders]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Geciken İşler</Text>
        <View
          style={[
            styles.badge,
            items.length > 0 ? styles.badgeDanger : styles.badgeOk,
          ]}
        >
          <Text style={styles.badgeText}>{items.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>SLA ihlali yok.</Text>
          </View>
        ) : (
          items.map(it => {
            const severity =
              it.hoursOverdue >= 48 ? '#dc2626' : it.hoursOverdue >= 8 ? '#f97316' : '#f59e0b';
            return (
              <TouchableOpacity
                key={it.workOrderId}
                style={styles.card}
                onPress={() =>
                  navigation.navigate('WorkOrderDetail', { workOrderId: it.workOrderId })
                }
                activeOpacity={0.85}
              >
                <View style={[styles.sevBar, { backgroundColor: severity }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.client}>{it.client}</Text>
                  <Text style={styles.service}>{it.serviceName}</Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.statusChip, { borderColor: severity }]}>
                      <Text style={[styles.statusText, { color: severity }]}>
                        {it.status}
                      </Text>
                    </View>
                    {it.assignedToName ? (
                      <Text style={styles.meta}>{it.assignedToName}</Text>
                    ) : null}
                  </View>
                  {it.plannedEnd ? (
                    <Text style={styles.meta}>
                      Planlanan bitiş:{' '}
                      {new Date(it.plannedEnd).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.overdue, { color: severity }]}>
                    +{fmtHours(it.hoursOverdue)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  badge: {
    minWidth: 30,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  badgeDanger: { backgroundColor: colors.rose.default },
  badgeOk: { backgroundColor: colors.emerald.border },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    overflow: 'hidden',
  },
  sevBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  client: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  service: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  meta: { color: colors.text.muted, fontSize: typography.xs },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '800' },
  overdue: { fontSize: typography.sm, fontWeight: '800' },
});
