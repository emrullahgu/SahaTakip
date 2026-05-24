// WorkOrderKanbanScreen — POZ-DEV-126 İş emri durum kanban panosu
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, WorkOrder } from '../types';
import { useAppContext } from '../context/AppContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Column {
  status: WorkOrder['status'];
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const COLUMNS: Column[] = [
  { status: 'Bekliyor',     label: 'Bekliyor',     color: '#64748b', icon: 'hourglass-outline' },
  { status: 'Atandı',       label: 'Atandı',       color: '#0ea5e9', icon: 'person-add-outline' },
  { status: 'Yolda',        label: 'Yolda',        color: '#8b5cf6', icon: 'car-outline' },
  { status: 'Başladı',      label: 'Başladı',      color: '#f59e0b', icon: 'play-circle-outline' },
  { status: 'Tamamlandı',   label: 'Tamamlandı',   color: '#22c55e', icon: 'checkmark-circle-outline' },
  { status: 'İptal',        label: 'İptal',        color: '#ef4444', icon: 'close-circle-outline' },
];

function priorityColor(p?: WorkOrder['priority']): string {
  if (p === 'Acil') return '#ef4444';
  if (p === 'Yüksek') return '#f59e0b';
  return '#64748b';
}

export default function WorkOrderKanbanScreen() {
  const nav = useNavigation<Nav>();
  const { workOrders } = useAppContext();

  const grouped = useMemo(() => {
    const map = new Map<WorkOrder['status'], WorkOrder[]>();
    COLUMNS.forEach(c => map.set(c.status, []));
    workOrders.forEach(w => {
      if (map.has(w.status)) map.get(w.status)!.push(w);
    });
    return map;
  }, [workOrders]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>İş Emri Kanban</Text>
        <Text style={styles.subtitle}>Toplam {workOrders.length} kayıt</Text>
      </View>
      <ScrollView horizontal contentContainerStyle={styles.boardRow} showsHorizontalScrollIndicator={false}>
        {COLUMNS.map(col => {
          const items = grouped.get(col.status) || [];
          return (
            <View key={col.status} style={styles.column}>
              <View style={[styles.colHeader, { borderTopColor: col.color }]}>
                <Ionicons name={col.icon} size={16} color={col.color} />
                <Text style={[styles.colTitle, { color: col.color }]}>{col.label}</Text>
                <View style={[styles.countBadge, { backgroundColor: col.color }]}>
                  <Text style={styles.countText}>{items.length}</Text>
                </View>
              </View>
              <ScrollView style={{ maxHeight: 600 }} contentContainerStyle={{ gap: spacing.sm, padding: spacing.sm }}>
                {items.length === 0 ? (
                  <Text style={styles.empty}>Boş</Text>
                ) : items.map(w => {
                  const overdue = !!(w.plannedEnd && new Date(w.plannedEnd).getTime() < Date.now() && w.status !== 'Tamamlandı' && w.status !== 'İptal');
                  return (
                    <TouchableOpacity
                      key={w.id}
                      style={styles.card}
                      onPress={() => nav.navigate('WorkOrderDetail', { workOrderId: w.id })}
                      activeOpacity={0.85}
                    >
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{w.serviceName}</Text>
                        {w.priority && (
                          <View style={[styles.priDot, { backgroundColor: priorityColor(w.priority) }]} />
                        )}
                      </View>
                      <Text style={styles.cardClient} numberOfLines={1}>{w.client}</Text>
                      {w.assignedToName ? (
                        <View style={styles.metaRow}>
                          <Ionicons name="person-outline" size={11} color={colors.text.muted} />
                          <Text style={styles.metaText} numberOfLines={1}>{w.assignedToName}</Text>
                        </View>
                      ) : null}
                      {w.plannedEnd ? (
                        <View style={styles.metaRow}>
                          <Ionicons name={overdue ? 'alarm' : 'calendar-outline'} size={11} color={overdue ? '#ef4444' : colors.text.muted} />
                          <Text style={[styles.metaText, overdue && { color: '#ef4444', fontWeight: '700' }]} numberOfLines={1}>
                            {new Date(w.plannedEnd).toLocaleDateString('tr-TR')}
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  headerRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.lg },
  subtitle: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  boardRow: { padding: spacing.md, gap: spacing.md, alignItems: 'flex-start' },
  column: { width: 240, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, overflow: 'hidden' },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm, borderTopWidth: 3 },
  colTitle: { fontWeight: '800', fontSize: typography.sm, flex: 1 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, minWidth: 22, alignItems: 'center' },
  countText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  empty: { color: colors.text.faint, fontSize: typography.xs, textAlign: 'center', padding: spacing.md },
  card: { padding: spacing.sm, backgroundColor: colors.bg.primary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, flex: 1 },
  priDot: { width: 8, height: 8, borderRadius: 4 },
  cardClient: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { color: colors.text.muted, fontSize: 11 },
});
