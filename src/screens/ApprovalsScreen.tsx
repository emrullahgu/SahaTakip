// ApprovalsScreen — POZ-DEV-357 Onay akışları
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { listApprovals, createApproval, APPROVAL_KIND_LABEL, APPROVAL_STATUS_LABEL, APPROVAL_STATUS_COLOR } from '../services/governance';
import type { ApprovalRequest, ApprovalStatus, RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { useAppContext } from '../context/AppContext';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Approvals'>;
type R = RouteProp<RootStackParamList, 'Approvals'>;

const STATUS_FILTERS: { key: ApprovalStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'pending', label: 'Bekliyor' },
  { key: 'approved', label: 'Onaylandı' },
  { key: 'rejected', label: 'Reddedildi' },
];

// Saha iş emirleri (Onay Bekliyor) için sentetik approval item tipi
type RowItem = ApprovalRequest & { _woId?: string };

export default function ApprovalsScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const { workOrders } = useAppContext();
  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [filter, setFilter] = useState<ApprovalStatus | 'all'>(route.params?.status || 'all');

  const load = useCallback(async () => { setItems(await listApprovals()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Saha cihazlarından Supabase'e yazılan "Onay Bekliyor" iş emirlerini de listele
  const woApprovals: RowItem[] = useMemo(() => {
    return workOrders
      .filter(w => w.status === 'Onay Bekliyor')
      .map(w => ({
        id: `wo_${w.id}`,
        _woId: w.id,
        kind: 'other' as const,
        status: 'pending' as const,
        title: `Servis Raporu Onayı: ${w.customerName || w.customerId}`,
        description: w.notes,
        resource: 'work_order' as const,
        resourceId: w.id,
        requestedByName: w.assignedTo || w.createdBy,
        createdAt: w.createdAt || new Date().toISOString(),
      }));
  }, [workOrders]);

  const all: RowItem[] = useMemo(() => {
    // WO onaylarını üste koy + local approvalleri ekle (id ile dedupe)
    const localFiltered = items.filter(i => !woApprovals.some(w => w.resourceId === i.resourceId));
    return [...woApprovals, ...localFiltered];
  }, [items, woApprovals]);

  const filtered = useMemo(() => filter === 'all' ? all : all.filter(i => i.status === filter), [all, filter]);

  const seedDemo = async () => {
    await createApproval({ kind: 'delete', title: 'Müşteri silme talebi', description: 'M-1024 silinecek', resource: 'customer', resourceId: 'M-1024', requestedByName: 'Ahmet' });
    await createApproval({ kind: 'discount', title: '%25 iskonto onayı', description: 'Teklif T-204 için', resource: 'quote', resourceId: 'T-204', requestedByName: 'Mehmet' });
    load();
  };

  const onPressItem = (item: RowItem) => {
    if (item._woId) {
      nav.navigate('WorkOrderDetail', { workOrderId: item._woId });
    } else {
      nav.navigate('ApprovalDetail', { requestId: item.id });
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.bar} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[s.chip, filter === f.key && { backgroundColor: '#22c55e' }]}>
            <Text style={[s.chipTxt, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 100 }}
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-circle-outline"
            title="Bekleyen onay yok"
            subtitle="Bu filtreye uygun onay talebi bulunamadı."
            actionLabel="+ Demo Onay Oluştur"
            onAction={seedDemo}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => onPressItem(item)}>
            <View style={[s.statusDot, { backgroundColor: APPROVAL_STATUS_COLOR[item.status as keyof typeof APPROVAL_STATUS_COLOR] }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.t}>{item.title}</Text>
              <Text style={s.sub}>{APPROVAL_KIND_LABEL[item.kind as keyof typeof APPROVAL_KIND_LABEL]} · {APPROVAL_STATUS_LABEL[item.status as keyof typeof APPROVAL_STATUS_LABEL]}{item.requestedByName ? ` · ${item.requestedByName}` : ''}</Text>
            </View>
            {item._woId ? <Ionicons name="construct-outline" size={18} color="#f59e0b" style={{ marginRight: 4 }} /> : null}
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  bar: { maxHeight: 50, marginTop: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipTxt: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  empty: { color: colors.text.muted },
  seedBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#8b5cf6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full },
  seedTxt: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  t: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});
