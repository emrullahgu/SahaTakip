// Faz 46 — MaintenancePlanScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { EqAsset, EqMaintenancePlan } from '../types';
import { listEqAssets, listEqPlans, createEqPlan } from '../services/equipment';

const dueColor = (dateStr: string) => {
  const d = Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (d < 0) return '#ef4444';
  if (d <= 7) return '#f59e0b';
  if (d <= 30) return '#eab308';
  return '#22c55e';
};

export default function MaintenancePlanScreen() {
  const [assets, setAssets] = useState<EqAsset[]>([]);
  const [items, setItems] = useState<EqMaintenancePlan[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ assetId: '', taskDescription: '', intervalDays: '90', owner: '' });

  const load = useCallback(async () => {
    const [a, p] = await Promise.all([listEqAssets(), listEqPlans()]);
    setAssets(a);
    setItems(p.sort((x, y) => new Date(x.nextDueAt).getTime() - new Date(y.nextDueAt).getTime()));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const assetName = (id: string) => {
    const a = assets.find(x => x.id === id);
    return a ? `${a.code} · ${a.name}` : id;
  };

  const submit = async () => {
    const days = Number(form.intervalDays);
    if (!form.assetId || !form.taskDescription || !days) { Alert.alert('Eksik', 'Varlık, görev ve aralık zorunlu.'); return; }
    await createEqPlan({
      assetId: form.assetId,
      taskDescription: form.taskDescription,
      intervalDays: days,
      nextDueAt: new Date(Date.now() + days * 86400000).toISOString(),
      owner: form.owner || 'Saha Ekibi',
    });
    setOpen(false);
    setForm({ assetId: '', taskDescription: '', intervalDays: '90', owner: '' });
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => {
          const c = dueColor(item.nextDueAt);
          const dt = new Date(item.nextDueAt);
          return (
            <View style={[s.card, { borderLeftColor: c }]}>
              <View style={[s.dateBox, { backgroundColor: c }]}>
                <Text style={s.dateD}>{dt.getDate()}</Text>
                <Text style={s.dateM}>{dt.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{item.taskDescription}</Text>
                <Text style={s.meta}>{assetName(item.assetId)}</Text>
                <Text style={s.meta}>Her {item.intervalDays} gün · Sorumlu: {item.owner}</Text>
                {item.lastPerformedAt && <Text style={s.meta}>Son: {new Date(item.lastPerformedAt).toLocaleDateString('tr-TR')}</Text>}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={s.empty}>Periyodik bakım planı yok.</Text>}
      />

      <TouchableOpacity style={s.fab} onPress={() => setOpen(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mT}>Yeni Plan</Text>
            <Text style={s.lab}>Varlık</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {assets.map(a => (
                <TouchableOpacity key={a.id} onPress={() => setForm(f => ({ ...f, assetId: a.id }))} style={[s.tpill, form.assetId === a.id && { backgroundColor: '#06b6d4' }]}>
                  <Text style={[s.tpillT, form.assetId === a.id && { color: '#fff' }]}>{a.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={s.inp} placeholder="Görev tanımı *" placeholderTextColor={colors.text.faint} value={form.taskDescription} onChangeText={v => setForm(f => ({ ...f, taskDescription: v }))} />
            <TextInput style={s.inp} placeholder="Aralık (gün)" placeholderTextColor={colors.text.faint} keyboardType="numeric" value={form.intervalDays} onChangeText={v => setForm(f => ({ ...f, intervalDays: v }))} />
            <TextInput style={s.inp} placeholder="Sorumlu" placeholderTextColor={colors.text.faint} value={form.owner} onChangeText={v => setForm(f => ({ ...f, owner: v }))} />
            <View style={s.actions}>
              <TouchableOpacity style={[s.act, { backgroundColor: colors.bg.primary }]} onPress={() => setOpen(false)}><Text style={s.actT}>İptal</Text></TouchableOpacity>
              <TouchableOpacity style={[s.act, { backgroundColor: '#06b6d4' }]} onPress={submit}><Text style={s.actT}>Kaydet</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  dateBox: { width: 56, height: 56, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dateD: { color: '#fff', fontSize: typography.xl, fontWeight: '800' },
  dateM: { color: '#fff', fontSize: 9, fontWeight: '800' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, gap: 4 },
  mT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800', marginBottom: 4 },
  lab: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  tpill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.bg.primary, marginRight: 6, borderWidth: 1, borderColor: colors.border.primary },
  tpillT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  inp: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: 10, borderRadius: 8, marginVertical: 4, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  act: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  actT: { color: '#fff', fontWeight: '800' },
});
