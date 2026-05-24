// NonconformitiesScreen — POZ-DEV-088 (uygunsuzluk + düzeltici faaliyet)
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  listNonconformities, createNonconformity, updateNonconformity, deleteNonconformity,
  SEVERITY_LABEL, SEVERITY_COLOR, NC_STATUS_LABEL,
} from '../services/inspections';
import { useAppContext } from '../context/AppContext';
import {
  Nonconformity, NonconformitySeverity, NonconformityStatus, RootStackParamList,
} from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

type RP = RouteProp<RootStackParamList, 'Nonconformities'>;

const STATUSES: (NonconformityStatus | 'all')[] = ['all', 'open', 'in_progress', 'closed', 'cancelled'];
const SEVERITIES: NonconformitySeverity[] = ['low', 'medium', 'high', 'critical'];

function fmt(iso?: string): string { if (!iso) return '—'; try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return iso; } }

export default function NonconformitiesScreen() {
  const route = useRoute<RP>();
  const { customers, employees } = useAppContext();
  const filterAssetId = route.params?.assetId;
  const filterCustomerId = route.params?.customerId;
  const [items, setItems] = useState<Nonconformity[]>([]);
  const [statusFilter, setStatusFilter] = useState<NonconformityStatus | 'all'>(route.params?.status ?? 'all');

  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<NonconformitySeverity>('medium');
  const [customerId, setCustomerId] = useState<string | undefined>(filterCustomerId);
  const [assignedToId, setAssignedToId] = useState<string | undefined>();

  const refresh = useCallback(async () => { setItems(await listNonconformities()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = useMemo(() => items.filter(n => {
    if (filterAssetId && n.assetId !== filterAssetId) return false;
    if (filterCustomerId && n.customerId !== filterCustomerId) return false;
    if (statusFilter !== 'all' && n.status !== statusFilter) return false;
    return true;
  }), [items, filterAssetId, filterCustomerId, statusFilter]);

  const onAdd = async () => {
    if (!description.trim()) { Alert.alert('Eksik', 'Açıklama zorunlu.'); return; }
    const customer = customers.find(c => c.id === customerId);
    const assignee = employees.find(e => e.id === assignedToId);
    await createNonconformity({
      description: description.trim(),
      severity,
      assetId: filterAssetId,
      customerId,
      customerName: customer ? (customer.title || customer.shortName) : undefined,
      assignedToId,
      assignedToName: assignee?.name,
    });
    setDescription(''); setShowForm(false);
    await refresh();
  };

  const onChangeStatus = (nc: Nonconformity) => {
    Alert.alert('Durum Güncelle', NC_STATUS_LABEL[nc.status] + ' → ?', [
      { text: 'Açık', onPress: async () => { await updateNonconformity(nc.id, { status: 'open' }); await refresh(); } },
      { text: 'Devam', onPress: async () => { await updateNonconformity(nc.id, { status: 'in_progress' }); await refresh(); } },
      { text: 'Kapalı', onPress: async () => { await updateNonconformity(nc.id, { status: 'closed' }); await refresh(); } },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  const onDelete = (nc: Nonconformity) => {
    Alert.alert('Sil', 'Uygunsuzluk silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteNonconformity(nc.id); await refresh(); } },
    ]);
  };

  const openCount = filtered.filter(n => n.status === 'open').length;
  const inProgCount = filtered.filter(n => n.status === 'in_progress').length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={n => n.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.summary}>
              <View style={[styles.sumCard, { backgroundColor: colors.rose.bg, borderColor: colors.rose.border }]}>
                <Text style={[styles.sumValue, { color: colors.rose.default }]}>{openCount}</Text>
                <Text style={styles.sumLabel}>Açık</Text>
              </View>
              <View style={[styles.sumCard, { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' }]}>
                <Text style={[styles.sumValue, { color: '#f59e0b' }]}>{inProgCount}</Text>
                <Text style={styles.sumLabel}>Devam</Text>
              </View>
            </View>

            <View style={styles.chipsRow}>
              {STATUSES.map(s => {
                const active = statusFilter === s;
                return (
                  <TouchableOpacity key={s} style={[styles.chip, active && styles.chipActive]} onPress={() => setStatusFilter(s)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {s === 'all' ? 'Tümü' : NC_STATUS_LABEL[s]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(!showForm)}>
              <Ionicons name={showForm ? 'remove-circle-outline' : 'add-circle-outline'} size={16} color="#fff" />
              <Text style={styles.addText}>{showForm ? 'Formu Kapat' : 'Yeni Uygunsuzluk'}</Text>
            </TouchableOpacity>

            {showForm && (
              <View style={styles.formBox}>
                <Text style={styles.label}>Açıklama *</Text>
                <TextInput
                  style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  multiline value={description} onChangeText={setDescription}
                  placeholder="Uygunsuzluk açıklaması" placeholderTextColor={colors.text.faint}
                />

                <Text style={styles.label}>Önem</Text>
                <View style={styles.grid}>
                  {SEVERITIES.map(s => {
                    const active = severity === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[styles.btn, { borderColor: SEVERITY_COLOR[s] }, active && { backgroundColor: SEVERITY_COLOR[s] }]}
                        onPress={() => setSeverity(s)}
                      >
                        <Text style={[styles.btnText, active && styles.btnTextActive]}>{SEVERITY_LABEL[s]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {!filterCustomerId && (
                  <>
                    <Text style={styles.label}>Müşteri</Text>
                    <View style={styles.grid}>
                      <TouchableOpacity style={[styles.btn, !customerId && styles.btnActive]} onPress={() => setCustomerId(undefined)}>
                        <Text style={[styles.btnText, !customerId && styles.btnTextActive]}>—</Text>
                      </TouchableOpacity>
                      {customers.map(c => {
                        const active = c.id === customerId;
                        return (
                          <TouchableOpacity key={c.id} style={[styles.btn, active && styles.btnActive]} onPress={() => setCustomerId(c.id)}>
                            <Text style={[styles.btnText, active && styles.btnTextActive]}>{c.shortName}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                <Text style={styles.label}>Sorumlu</Text>
                <View style={styles.grid}>
                  <TouchableOpacity style={[styles.btn, !assignedToId && styles.btnActive]} onPress={() => setAssignedToId(undefined)}>
                    <Text style={[styles.btnText, !assignedToId && styles.btnTextActive]}>—</Text>
                  </TouchableOpacity>
                  {employees.map(e => {
                    const active = e.id === assignedToId;
                    return (
                      <TouchableOpacity key={e.id} style={[styles.btn, active && styles.btnActive]} onPress={() => setAssignedToId(e.id)}>
                        <Text style={[styles.btnText, active && styles.btnTextActive]}>{e.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity style={[styles.addBtn, { marginTop: spacing.md }]} onPress={onAdd}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={styles.addText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Uygunsuzluklar ({filtered.length})</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="warning-outline"
            title="Kayıt yok"
            subtitle="Filtreleri değiştirerek tekrar deneyebilir veya yeni bir uygunsuzluk ekleyebilirsiniz."
          />
        }
        renderItem={({ item: n }) => (
          <TouchableOpacity key={n.id} style={styles.ncCard} onPress={() => onChangeStatus(n)} onLongPress={() => onDelete(n)}>
            <View style={[styles.sevBar, { backgroundColor: SEVERITY_COLOR[n.severity] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ncDesc} numberOfLines={2}>{n.description}</Text>
              <Text style={styles.ncSub}>
                {SEVERITY_LABEL[n.severity]} · {fmt(n.createdAt)}
                {n.assignedToName ? ` · ${n.assignedToName}` : ''}
              </Text>
              {n.customerName ? <Text style={styles.ncFaint}>{n.customerName}</Text> : null}
              {n.correctiveAction ? (
                <Text style={styles.ncCorrective}>↪ {n.correctiveAction}</Text>
              ) : null}
            </View>
            <View style={[styles.statusPill, n.status === 'closed' ? { backgroundColor: colors.emerald.bg } : n.status === 'in_progress' ? { backgroundColor: 'rgba(245,158,11,0.12)' } : { backgroundColor: colors.rose.bg }]}>
              <Text style={[styles.statusText, n.status === 'closed' ? { color: brand.green } : n.status === 'in_progress' ? { color: '#f59e0b' } : { color: colors.rose.default }]}>
                {NC_STATUS_LABEL[n.status]}
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
  content: { padding: spacing.lg, paddingBottom: 80 },
  summary: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  sumCard: { flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  sumValue: { fontSize: typography.xl, fontWeight: '800' },
  sumLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipActive: { backgroundColor: brand.blueLight, borderColor: brand.blueLight },
  chipText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  addBtn: { flexDirection: 'row', backgroundColor: brand.green, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 8 },
  addText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  formBox: { marginTop: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, backgroundColor: colors.bg.secondary },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 4 },
  input: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text.primary, fontSize: typography.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.primary },
  btnActive: { backgroundColor: brand.blueLight, borderColor: brand.blueLight },
  btnText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  btnTextActive: { color: '#fff' },
  sectionTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginBottom: spacing.sm },
  ncCard: { flexDirection: 'row', gap: 10, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginTop: spacing.sm },
  sevBar: { width: 4, borderRadius: 2 },
  ncDesc: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  ncSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  ncFaint: { color: colors.text.faint, fontSize: 11, marginTop: 1 },
  ncCorrective: { color: brand.greenLight, fontSize: 11, marginTop: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { color: colors.text.muted },
});
