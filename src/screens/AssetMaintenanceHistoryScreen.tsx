// Faz 46 — AssetMaintenanceHistoryScreen
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { EqAsset, EqMaintenanceRecord, EqMaintenanceKind } from '../types';
import { listEqAssets, listEqMaintenance, createEqMaintenance, deleteEqMaintenance, EQ_MAINT_LABEL, EQ_MAINT_COLOR } from '../services/equipment';

const KINDS: EqMaintenanceKind[] = ['periodic', 'breakdown', 'inspection'];

export default function AssetMaintenanceHistoryScreen() {
  const route = useRoute<any>();
  const presetId = route.params?.assetId as string | undefined;
  const [assets, setAssets] = useState<EqAsset[]>([]);
  const [items, setItems] = useState<EqMaintenanceRecord[]>([]);
  const [filterAsset, setFilterAsset] = useState<string | 'all'>(presetId ?? 'all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ assetId: '', kind: 'periodic' as EqMaintenanceKind, performedBy: '', description: '', cost: '0' });

  const load = useCallback(async () => {
    const [a, m] = await Promise.all([listEqAssets(), listEqMaintenance()]);
    setAssets(a); setItems(m);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmDelete = (id: string) => {
    Alert.alert('Bakım kaydını sil', 'Bu kayıt silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { try { await deleteEqMaintenance(id); load(); } catch (e: any) { Alert.alert('Hata', e?.message || 'Silinemedi.'); } } },
    ]);
  };

  const list = useMemo(() => filterAsset === 'all' ? items : items.filter(i => i.assetId === filterAsset), [items, filterAsset]);
  const totalCost = useMemo(() => list.reduce((s, x) => s + x.cost, 0), [list]);

  const assetName = (id: string) => {
    const a = assets.find(x => x.id === id);
    return a ? `${a.code} · ${a.name}` : id;
  };

  const submit = async () => {
    if (!form.assetId || !form.description) { Alert.alert('Eksik', 'Varlık ve açıklama zorunlu.'); return; }
    await createEqMaintenance({ assetId: form.assetId, kind: form.kind, performedAt: new Date().toISOString(), performedBy: form.performedBy || 'Saha Ekibi', description: form.description, cost: Number(form.cost) || 0 });
    setOpen(false);
    setForm({ assetId: '', kind: 'periodic', performedBy: '', description: '', cost: '0' });
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        <TouchableOpacity onPress={() => setFilterAsset('all')} style={[s.chip, filterAsset === 'all' && s.chipOn]}>
          <Text style={[s.chipT, filterAsset === 'all' && s.chipTOn]}>Tümü</Text>
        </TouchableOpacity>
        {assets.map(a => (
          <TouchableOpacity key={a.id} onPress={() => setFilterAsset(a.id)} style={[s.chip, filterAsset === a.id && s.chipOn]}>
            <Text style={[s.chipT, filterAsset === a.id && s.chipTOn]}>{a.code}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={s.summary}>
        <Text style={s.sumL}>{list.length} kayıt</Text>
        <Text style={s.sumV}>₺{totalCost.toLocaleString('tr-TR')}</Text>
      </View>

      <FlatList
        data={list}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: EQ_MAINT_COLOR[item.kind] }]}>
            <View style={{ flex: 1 }}>
              <View style={s.row}>
                <Text style={[s.badge, { backgroundColor: EQ_MAINT_COLOR[item.kind] }]}>{EQ_MAINT_LABEL[item.kind]}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.date}>{new Date(item.performedAt).toLocaleDateString('tr-TR')}</Text>
                  <TouchableOpacity onPress={() => confirmDelete(item.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={colors.rose.default} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={s.title}>{assetName(item.assetId)}</Text>
              <Text style={s.desc}>{item.description}</Text>
              <Text style={s.meta}>{item.performedBy} · ₺{item.cost.toLocaleString('tr-TR')}{item.parts ? ` · ${item.parts.join(', ')}` : ''}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>Bakım kaydı yok.</Text>}
      />

      <TouchableOpacity style={s.fab} onPress={() => setOpen(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mT}>Yeni Bakım</Text>
            <Text style={s.lab}>Varlık</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {assets.map(a => (
                <TouchableOpacity key={a.id} onPress={() => setForm(f => ({ ...f, assetId: a.id }))} style={[s.tpill, form.assetId === a.id && { backgroundColor: '#0ea5e9' }]}>
                  <Text style={[s.tpillT, form.assetId === a.id && { color: '#fff' }]}>{a.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={s.lab}>Tür</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
              {KINDS.map(k => (
                <TouchableOpacity key={k} onPress={() => setForm(f => ({ ...f, kind: k }))} style={[s.tpill, form.kind === k && { backgroundColor: EQ_MAINT_COLOR[k] }]}>
                  <Text style={[s.tpillT, form.kind === k && { color: '#fff' }]}>{EQ_MAINT_LABEL[k]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={s.inp} placeholder="Bakımı yapan" placeholderTextColor={colors.text.faint} value={form.performedBy} onChangeText={v => setForm(f => ({ ...f, performedBy: v }))} />
            <TextInput style={[s.inp, { height: 60 }]} multiline placeholder="Açıklama *" placeholderTextColor={colors.text.faint} value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} />
            <TextInput style={s.inp} placeholder="Maliyet ₺" placeholderTextColor={colors.text.faint} keyboardType="numeric" value={form.cost} onChangeText={v => setForm(f => ({ ...f, cost: v }))} />
            <View style={s.actions}>
              <TouchableOpacity style={[s.act, { backgroundColor: colors.bg.primary }]} onPress={() => setOpen(false)}><Text style={s.actT}>İptal</Text></TouchableOpacity>
              <TouchableOpacity style={[s.act, { backgroundColor: '#0ea5e9' }]} onPress={submit}><Text style={s.actT}>Kaydet</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  chips: { padding: spacing.sm, gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.bg.secondary, borderRadius: 14, marginRight: 4, borderWidth: 1, borderColor: colors.border.primary },
  chipOn: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  chipT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  chipTOn: { color: '#fff' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: 4 },
  sumL: { color: colors.text.muted, fontSize: typography.xs },
  sumV: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  badge: { color: '#fff', fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  date: { color: colors.text.muted, fontSize: typography.xs },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  desc: { color: colors.text.primary, fontSize: typography.xs, marginTop: 2 },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', elevation: 4 },
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
