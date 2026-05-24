// MaintenancePlansScreen — POZ-DEV-085 Periyodik bakım planı
import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import {
  listPlans, createPlan, deletePlan, markDone,
  MAINTENANCE_KIND_LABEL,
} from '../services/maintenancePlans';
import { getAsset } from '../services/assets';
import { MaintenanceKind, MaintenancePlan, RootStackParamList } from '../types';

type RP = RouteProp<RootStackParamList, 'MaintenancePlans'>;

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return iso; }
}
function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default function MaintenancePlansScreen() {
  const route = useRoute<RP>();
  const { customers, employees } = useAppContext();
  const filterAssetId = route.params?.assetId;
  const filterCustomerId = route.params?.customerId;

  const [items, setItems] = useState<MaintenancePlan[]>([]);
  const [assetName, setAssetName] = useState<string>('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<MaintenanceKind>('preventive');
  const [frequencyDays, setFrequencyDays] = useState('30');
  const [customerId, setCustomerId] = useState<string | undefined>(filterCustomerId);
  const [assignedToId, setAssignedToId] = useState<string | undefined>();
  const [notes, setNotes] = useState('');

  const refresh = useCallback(async () => {
    const all = await listPlans();
    setItems(all);
    if (filterAssetId) {
      const a = await getAsset(filterAssetId);
      if (a) setAssetName(a.name);
    }
  }, [filterAssetId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = useMemo(() => {
    return items.filter(p => {
      if (filterAssetId && p.assetId !== filterAssetId) return false;
      if (filterCustomerId && p.customerId !== filterCustomerId) return false;
      return true;
    });
  }, [items, filterAssetId, filterCustomerId]);

  const dueCount = useMemo(
    () => filtered.filter(p => p.active && daysUntil(p.nextDueAt) <= 7).length,
    [filtered],
  );

  const onAdd = async () => {
    if (!name.trim()) { Alert.alert('Eksik', 'Plan adı zorunlu.'); return; }
    const freq = Number(frequencyDays) || 30;
    const customer = customers.find(c => c.id === customerId);
    const assignee = employees.find(e => e.id === assignedToId);
    await createPlan({
      name: name.trim(),
      kind,
      frequencyDays: freq,
      assetId: filterAssetId,
      assetName: filterAssetId ? assetName : undefined,
      customerId,
      customerName: customer ? (customer.title || customer.shortName) : undefined,
      assignedToId,
      assignedToName: assignee?.name,
      active: true,
      notes: notes.trim() || undefined,
    });
    setName(''); setNotes(''); setFrequencyDays('30');
    await refresh();
  };

  const onMarkDone = async (p: MaintenancePlan) => {
    await markDone(p.id);
    await refresh();
  };

  const onDelete = (p: MaintenancePlan) => {
    Alert.alert('Sil', `${p.name} silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deletePlan(p.id); await refresh(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <View style={[styles.sumCard, { backgroundColor: colors.emerald.bg, borderColor: colors.emerald.border }]}>
            <Text style={[styles.sumValue, { color: brand.green }]}>{filtered.length}</Text>
            <Text style={styles.sumLabel}>Toplam Plan</Text>
          </View>
          <View style={[styles.sumCard, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
            <Text style={[styles.sumValue, { color: '#f59e0b' }]}>{dueCount}</Text>
            <Text style={styles.sumLabel}>Yaklaşan (7g)</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Yeni Plan</Text>

        <Text style={styles.label}>Plan Adı *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="ör. Aylık Trafo Bakımı" placeholderTextColor={colors.text.faint} />

        <Text style={styles.label}>Tür</Text>
        <View style={styles.grid}>
          {(['preventive','corrective'] as MaintenanceKind[]).map(k => {
            const active = k === kind;
            return (
              <TouchableOpacity key={k} style={[styles.btn, active && styles.btnActive]} onPress={() => setKind(k)}>
                <Text style={[styles.btnText, active && styles.btnTextActive]}>{MAINTENANCE_KIND_LABEL[k]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Frekans (gün)</Text>
        <TextInput style={styles.input} value={frequencyDays} onChangeText={setFrequencyDays} keyboardType="number-pad" placeholder="30" placeholderTextColor={colors.text.faint} />

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

        <Text style={styles.label}>Notlar</Text>
        <TextInput style={[styles.input, { minHeight: 48, textAlignVertical: 'top' }]} multiline value={notes} onChangeText={setNotes} placeholder="Açıklama" placeholderTextColor={colors.text.faint} />

        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Ionicons name="add-circle-outline" size={16} color="#fff" />
          <Text style={styles.addText}>Plan Ekle</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Planlar ({filtered.length})</Text>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="construct-outline" size={36} color={colors.text.faint} />
            <Text style={styles.emptyText}>Plan yok.</Text>
          </View>
        ) : filtered.map(p => {
          const du = daysUntil(p.nextDueAt);
          const overdue = du < 0;
          const soon = du >= 0 && du <= 7;
          const color = overdue ? colors.rose.default : soon ? '#f59e0b' : brand.green;
          return (
            <View key={p.id} style={styles.planCard}>
              <View style={[styles.bar, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>{p.name}</Text>
                <Text style={styles.planSub}>
                  {MAINTENANCE_KIND_LABEL[p.kind]} · Her {p.frequencyDays} gün
                  {p.assignedToName ? ` · ${p.assignedToName}` : ''}
                </Text>
                {p.customerName ? <Text style={styles.planSub}>{p.customerName}</Text> : null}
                <Text style={[styles.planDate, { color }]}>
                  {overdue ? `${Math.abs(du)} gün gecikmiş` : du === 0 ? 'Bugün' : `${du} gün kaldı`} · {fmtDate(p.nextDueAt)}
                </Text>
              </View>
              <View style={{ gap: 6 }}>
                <TouchableOpacity style={[styles.miniBtn, { backgroundColor: brand.green }]} onPress={() => onMarkDone(p)}>
                  <Ionicons name="checkmark" size={13} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.miniBtn, { backgroundColor: colors.rose.default }]} onPress={() => onDelete(p)}>
                  <Ionicons name="trash-outline" size={13} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  sectionTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginBottom: spacing.sm },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text.primary, fontSize: typography.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary,
  },
  btnActive: { backgroundColor: brand.blueLight, borderColor: brand.blueLight },
  btnText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  btnTextActive: { color: '#fff' },
  addBtn: {
    flexDirection: 'row', backgroundColor: brand.green, paddingVertical: 12,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: spacing.md,
  },
  addText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  planCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary,
    borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm,
  },
  bar: { width: 4, height: 36, borderRadius: 2 },
  planTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  planSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  planDate: { fontSize: typography.xs, fontWeight: '700', marginTop: 4 },
  miniBtn: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { color: colors.text.muted },
});
