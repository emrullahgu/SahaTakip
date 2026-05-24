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

type Nav = NativeStackNavigationProp<RootStackParamList, 'Approvals'>;
type R = RouteProp<RootStackParamList, 'Approvals'>;

const STATUS_FILTERS: { key: ApprovalStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'pending', label: 'Bekliyor' },
  { key: 'approved', label: 'Onaylandı' },
  { key: 'rejected', label: 'Reddedildi' },
];

export default function ApprovalsScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [filter, setFilter] = useState<ApprovalStatus | 'all'>(route.params?.status || 'all');

  const load = useCallback(async () => { setItems(await listApprovals()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => filter === 'all' ? items : items.filter(i => i.status === filter), [items, filter]);

  const seedDemo = async () => {
    await createApproval({ kind: 'delete', title: 'Müşteri silme talebi', description: 'M-1024 silinecek', resource: 'customer', resourceId: 'M-1024', requestedByName: 'Ahmet' });
    await createApproval({ kind: 'discount', title: '%25 iskonto onayı', description: 'Teklif T-204 için', resource: 'quote', resourceId: 'T-204', requestedByName: 'Mehmet' });
    load();
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
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40, gap: spacing.sm }}>
            <Text style={s.empty}>Bu filtrede onay yok.</Text>
            <TouchableOpacity style={s.seedBtn} onPress={seedDemo}>
              <Ionicons name="flask-outline" size={16} color="#fff" />
              <Text style={s.seedTxt}>Demo Onay Oluştur</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => nav.navigate('ApprovalDetail', { requestId: item.id })}>
            <View style={[s.statusDot, { backgroundColor: APPROVAL_STATUS_COLOR[item.status] }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.t}>{item.title}</Text>
              <Text style={s.sub}>{APPROVAL_KIND_LABEL[item.kind]} · {APPROVAL_STATUS_LABEL[item.status]}{item.requestedByName ? ` · ${item.requestedByName}` : ''}</Text>
            </View>
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
