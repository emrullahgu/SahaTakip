// Faz 46 — AssetListScreen
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { a11yButton } from '../utils/a11y';
import type { EqAsset, EqAssetType, EqAssetStatus } from '../types';
import { listEqAssets, createEqAsset, updateEqAssetStatus, deleteEqAsset, EQ_TYPE_LABEL, EQ_TYPE_ICON, EQ_TYPE_COLOR, EQ_STATUS_LABEL, EQ_STATUS_COLOR } from '../services/equipment';

const TYPES: EqAssetType[] = ['transformer', 'panel', 'meter', 'inverter', 'ups', 'generator', 'compensation', 'cable', 'other'];
const STATUSES: EqAssetStatus[] = ['active', 'maintenance', 'broken', 'retired'];

export default function AssetListScreen() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<EqAsset[]>([]);
  const [filter, setFilter] = useState<EqAssetType | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [statusFor, setStatusFor] = useState<EqAsset | null>(null);
  const [form, setForm] = useState({ type: 'transformer' as EqAssetType, name: '', customerName: '', location: '', brand: '', model: '', serialNo: '', capacity: '' });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listEqAssets()); }
    finally { setLoading(false); setLoaded(true); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => filter === 'all' ? items : items.filter(i => i.type === filter), [items, filter]);

  const submit = async () => {
    if (!form.name || !form.brand) { Alert.alert('Eksik', 'Ad ve marka zorunlu.'); return; }
    try {
      await createEqAsset({ ...form, installedAt: new Date().toISOString(), status: 'active' });
      setOpen(false);
      setForm({ type: 'transformer', name: '', customerName: '', location: '', brand: '', model: '', serialNo: '', capacity: '' });
      load();
    } catch (e: any) { Alert.alert('Hata', e?.message || 'Varlık kaydedilemedi.'); }
  };

  const confirmDelete = (item: EqAsset) => {
    Alert.alert('Varlığı sil', `${item.code} · ${item.name} silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try { await deleteEqAsset(item.id); load(); }
        catch (e: any) { Alert.alert('Hata', e?.message || 'Silinemedi.'); }
      } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.chips}>
        <TouchableOpacity onPress={() => setFilter('all')} style={[s.chip, filter === 'all' && s.chipOn]}>
          <Text style={[s.chipT, filter === 'all' && s.chipTOn]}>Tümü ({items.length})</Text>
        </TouchableOpacity>
        {TYPES.map(t => (
          <TouchableOpacity key={t} onPress={() => setFilter(t)} style={[s.chip, filter === t && { backgroundColor: EQ_TYPE_COLOR[t] }]}>
            <Ionicons name={EQ_TYPE_ICON[t] as any} size={12} color={filter === t ? '#fff' : EQ_TYPE_COLOR[t]} />
            <Text style={[s.chipT, filter === t && { color: '#fff' }]}>{EQ_TYPE_LABEL[t]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.text.muted} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.card, { borderLeftColor: EQ_TYPE_COLOR[item.type] }]} onPress={() => nav.navigate('ServiceCard', { assetId: item.id })} onLongPress={() => confirmDelete(item)} delayLongPress={350}>
            <View style={[s.icon, { backgroundColor: EQ_TYPE_COLOR[item.type] + '33' }]}>
              <Ionicons name={EQ_TYPE_ICON[item.type] as any} size={24} color={EQ_TYPE_COLOR[item.type]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{item.code} · {item.name}</Text>
              <Text style={s.meta}>{item.brand} {item.model} · {item.capacity || '—'}</Text>
              <Text style={s.meta}>{item.customerName} · {item.location}</Text>
            </View>
            <TouchableOpacity onPress={() => setStatusFor(item)} style={[s.status, { backgroundColor: EQ_STATUS_COLOR[item.status] }]}>
              <Text style={s.statusT}>{EQ_STATUS_LABEL[item.status]}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(item)} style={s.delBtn} hitSlop={8} {...a11yButton('Varlığı sil')}>
              <Ionicons name="trash-outline" size={18} color={colors.rose.default} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={loaded ? <Text style={s.empty}>Henüz varlık yok.</Text> : null}
      />

      <TouchableOpacity style={s.fab} onPress={() => setOpen(true)} {...a11yButton('Yeni varlık ekle')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mT}>Yeni Varlık</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={s.lab}>Tür</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {TYPES.map(t => (
                  <TouchableOpacity key={t} onPress={() => setForm(f => ({ ...f, type: t }))} style={[s.tpill, form.type === t && { backgroundColor: EQ_TYPE_COLOR[t] }]}>
                    <Text style={[s.tpillT, form.type === t && { color: '#fff' }]}>{EQ_TYPE_LABEL[t]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput style={s.inp} placeholder="Ad *" placeholderTextColor={colors.text.faint} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
              <TextInput style={s.inp} placeholder="Müşteri" placeholderTextColor={colors.text.faint} value={form.customerName} onChangeText={v => setForm(f => ({ ...f, customerName: v }))} />
              <TextInput style={s.inp} placeholder="Konum" placeholderTextColor={colors.text.faint} value={form.location} onChangeText={v => setForm(f => ({ ...f, location: v }))} />
              <TextInput style={s.inp} placeholder="Marka *" placeholderTextColor={colors.text.faint} value={form.brand} onChangeText={v => setForm(f => ({ ...f, brand: v }))} />
              <TextInput style={s.inp} placeholder="Model" placeholderTextColor={colors.text.faint} value={form.model} onChangeText={v => setForm(f => ({ ...f, model: v }))} />
              <TextInput style={s.inp} placeholder="Seri No" placeholderTextColor={colors.text.faint} value={form.serialNo} onChangeText={v => setForm(f => ({ ...f, serialNo: v }))} />
              <TextInput style={s.inp} placeholder="Kapasite (ör. 630 kVA)" placeholderTextColor={colors.text.faint} value={form.capacity} onChangeText={v => setForm(f => ({ ...f, capacity: v }))} />
            </ScrollView>
            <View style={s.actions}>
              <TouchableOpacity style={[s.act, { backgroundColor: colors.bg.primary }]} onPress={() => setOpen(false)}><Text style={s.actT}>İptal</Text></TouchableOpacity>
              <TouchableOpacity style={[s.act, { backgroundColor: '#0ea5e9' }]} onPress={submit}><Text style={s.actT}>Kaydet</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!statusFor} transparent animationType="fade" onRequestClose={() => setStatusFor(null)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mT}>Durum Değiştir</Text>
            {STATUSES.map(st => (
              <TouchableOpacity key={st} style={[s.stRow, { backgroundColor: EQ_STATUS_COLOR[st] + '33' }]}
                onPress={async () => { if (statusFor) { try { await updateEqAssetStatus(statusFor.id, st); setStatusFor(null); load(); } catch (e: any) { Alert.alert('Hata', e?.message || 'Durum güncellenemedi.'); } } }}>
                <View style={[s.stDot, { backgroundColor: EQ_STATUS_COLOR[st] }]} />
                <Text style={s.stT}>{EQ_STATUS_LABEL[st]}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.act, { backgroundColor: colors.bg.primary, marginTop: 8 }]} onPress={() => setStatusFor(null)}><Text style={s.actT}>Kapat</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm, gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, marginRight: 4 },
  chipOn: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  chipT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  chipTOn: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  status: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  delBtn: { padding: 4, marginLeft: 2 },
  statusT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, gap: 6 },
  mT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800', marginBottom: 4 },
  lab: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginBottom: 4 },
  tpill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.bg.primary, marginRight: 6, borderWidth: 1, borderColor: colors.border.primary },
  tpillT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  inp: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: 10, borderRadius: 8, marginVertical: 4, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  act: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  actT: { color: '#fff', fontWeight: '800' },
  stRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, marginVertical: 2 },
  stDot: { width: 12, height: 12, borderRadius: 6 },
  stT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
});
