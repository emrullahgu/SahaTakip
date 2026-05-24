// InspectionsScreen — denetim listesi
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { listInspections, deleteInspection, INSPECTION_TYPE_LABEL } from '../services/inspections';
import { Inspection, InspectionType, RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Inspections'>;
type RP = RouteProp<RootStackParamList, 'Inspections'>;

const TYPES: (InspectionType | 'all')[] = ['all', 'audit', 'safety', 'quality', 'commissioning', 'periodic'];

function fmt(iso: string): string { try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return iso; } }

export default function InspectionsScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RP>();
  const filterAssetId = route.params?.assetId;
  const filterCustomerId = route.params?.customerId;
  const [items, setItems] = useState<Inspection[]>([]);
  const [typeFilter, setTypeFilter] = useState<InspectionType | 'all'>(route.params?.type ?? 'all');

  const refresh = useCallback(async () => { setItems(await listInspections()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = useMemo(() => items.filter(i => {
    if (filterAssetId && i.assetId !== filterAssetId) return false;
    if (filterCustomerId && i.customerId !== filterCustomerId) return false;
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    return true;
  }), [items, filterAssetId, filterCustomerId, typeFilter]);

  const onDelete = (id: string) => {
    Alert.alert('Sil', 'Denetim silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteInspection(id); await refresh(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.newBtn} onPress={() => nav.navigate('InspectionForm', filterAssetId ? { assetId: filterAssetId } : undefined)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newBtnText}>Yeni Denetim</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.newBtn, { backgroundColor: '#dc2626' }]} onPress={() => nav.navigate('Nonconformities', filterAssetId ? { assetId: filterAssetId } : undefined)}>
          <Ionicons name="warning-outline" size={16} color="#fff" />
          <Text style={styles.newBtnText}>Uygunsuzluklar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chipsRow}>
        {TYPES.map(t => {
          const active = typeFilter === t;
          return (
            <TouchableOpacity key={t} style={[styles.chip, active && styles.chipActive]} onPress={() => setTypeFilter(t)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t === 'all' ? 'Tümü' : INSPECTION_TYPE_LABEL[t as keyof typeof INSPECTION_TYPE_LABEL]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ListEmptyComponent={
          <EmptyState
            icon="clipboard-outline"
            title="Denetim bulunamadı"
            subtitle="Filtreleri değiştirerek tekrar deneyebilir veya yeni bir denetim başlatabilirsiniz."
            actionLabel="+ Yeni Denetim"
            onAction={() => nav.navigate('InspectionForm', filterAssetId ? { assetId: filterAssetId } : undefined)}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => nav.navigate('InspectionForm', { inspectionId: item.id })}
            onLongPress={() => onDelete(item.id)}
          >
            <View style={[styles.scoreBox, { backgroundColor: item.score >= 80 ? colors.emerald.bg : item.score >= 60 ? 'rgba(245,158,11,0.12)' : colors.rose.bg }]}>
              <Text style={[styles.scoreNum, { color: item.score >= 80 ? brand.green : item.score >= 60 ? '#f59e0b' : colors.rose.default }]}>
                {item.score}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub}>
                {INSPECTION_TYPE_LABEL[item.type as keyof typeof INSPECTION_TYPE_LABEL]} · {fmt(item.date)}
              </Text>
              {item.customerName ? <Text style={styles.subFaint}>{item.customerName}</Text> : null}
            </View>
            <View style={[styles.statusPill, { backgroundColor: item.status === 'completed' ? colors.emerald.bg : 'rgba(245,158,11,0.12)' }]}>
              <Text style={[styles.statusText, { color: item.status === 'completed' ? brand.green : '#f59e0b' }]}>
                {item.status === 'completed' ? 'Bitti' : 'Taslak'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { flexDirection: 'row', gap: 8, padding: spacing.lg, paddingBottom: 6 },
  newBtn: { flex: 1, flexDirection: 'row', gap: 4, backgroundColor: brand.green, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: spacing.lg, marginBottom: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipActive: { backgroundColor: brand.blueLight, borderColor: brand.blueLight },
  chipText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginTop: spacing.sm },
  scoreBox: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: typography.md, fontWeight: '800' },
  title: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  subFaint: { color: colors.text.faint, fontSize: 11, marginTop: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.muted },
});
