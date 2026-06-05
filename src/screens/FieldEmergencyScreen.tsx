// Faz 42 — FieldEmergencyScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { FieldEmergencyDispatch } from '../types';
import { listEmergencies, dispatchEmergency, resolveEmergency, createEmergency, deleteEmergency, PRIORITY_COLOR, PRIORITY_LABEL } from '../services/fieldOps';

const STATUS_COLOR: Record<FieldEmergencyDispatch['status'], string> = { pending: '#ef4444', dispatched: '#f59e0b', arrived: '#06b6d4', resolved: '#22c55e', cancelled: '#64748b' };
const STATUS_LABEL: Record<FieldEmergencyDispatch['status'], string> = { pending: 'Beklemede', dispatched: 'Yolda', arrived: 'Vardı', resolved: 'Çözüldü', cancelled: 'İptal' };

export default function FieldEmergencyScreen() {
  const [items, setItems] = useState<FieldEmergencyDispatch[]>([]);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [addr, setAddr] = useState('');
  const load = useCallback(async () => { setItems(await listEmergencies()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmDelete = (id: string, label: string) => {
    Alert.alert('Acil kaydını sil', `"${label}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { try { await deleteEmergency(id); load(); } catch (e: any) { Alert.alert('Hata', e?.message || 'Silinemedi.'); } } },
    ]);
  };

  const onCreate = async () => {
    if (!title.trim() || !addr.trim()) return;
    await createEmergency(title, addr);
    setTitle(''); setAddr(''); setModal(false); load();
  };

  const onDispatch = (id: string) => {
    Alert.prompt?.('En yakın personeli ata', 'Ad gir:', async (name) => {
      if (!name) return;
      await dispatchEmergency(id, name, 10 + Math.floor(Math.random() * 15));
      load();
    });
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 90 }}
        ListEmptyComponent={<Text style={s.empty}>Acil iş yok.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.card, { borderLeftColor: STATUS_COLOR[item.status] }]} activeOpacity={0.9} onLongPress={() => confirmDelete(item.id, item.title)} delayLongPress={350}>
            <View style={s.head}>
              <Ionicons name="flash" size={22} color={STATUS_COLOR[item.status]} />
              <Text style={[s.title, { flex: 1 }]}>{item.title}</Text>
              <View style={[s.chip, { backgroundColor: PRIORITY_COLOR[item.priority] }]}><Text style={s.chipT}>{PRIORITY_LABEL[item.priority]}</Text></View>
              <TouchableOpacity onPress={() => confirmDelete(item.id, item.title)} hitSlop={8} style={{ padding: 2 }}>
                <Ionicons name="trash-outline" size={16} color={colors.rose.default} />
              </TouchableOpacity>
            </View>
            <Text style={s.addr}>📍 {item.address}</Text>
            <Text style={s.tm}>🕒 {new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
            {item.dispatchedUserName && <Text style={s.disp}>🚨 {item.dispatchedUserName} · ETA: {item.etaMinutes}dk</Text>}
            <View style={s.btnRow}>
              <View style={[s.chip, { backgroundColor: STATUS_COLOR[item.status] }]}><Text style={s.chipT}>{STATUS_LABEL[item.status]}</Text></View>
              <View style={{ flex: 1 }} />
              {item.status === 'pending' && (
                <TouchableOpacity style={[s.btn, { backgroundColor: '#f59e0b' }]} onPress={() => onDispatch(item.id)}>
                  <Text style={s.btnT}>Ata</Text>
                </TouchableOpacity>
              )}
              {(item.status === 'dispatched' || item.status === 'arrived') && (
                <TouchableOpacity style={[s.btn, { backgroundColor: '#22c55e' }]} onPress={async () => { await resolveEmergency(item.id); load(); }}>
                  <Text style={s.btnT}>Çöz</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.mw}>
          <View style={s.mbox}>
            <Text style={s.mt}>Acil İş</Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Başlık" placeholderTextColor={colors.text.faint} />
            <TextInput style={s.input} value={addr} onChangeText={setAddr} placeholder="Adres" placeholderTextColor={colors.text.faint} />
            <View style={s.mbtns}>
              <TouchableOpacity style={[s.mb, { backgroundColor: '#475569' }]} onPress={() => setModal(false)}><Text style={s.mbT}>Vazgeç</Text></TouchableOpacity>
              <TouchableOpacity style={[s.mb, { backgroundColor: '#ef4444' }]} onPress={onCreate}><Text style={s.mbT}>Oluştur</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', flex: 1 },
  addr: { color: colors.text.muted, fontSize: typography.xs },
  tm: { color: colors.text.faint, fontSize: 10 },
  disp: { color: '#f59e0b', fontSize: typography.xs, fontWeight: '700', marginTop: 4 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chipT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  btn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm },
  btnT: { color: '#fff', fontWeight: '700', fontSize: typography.xs },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  mw: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.md },
  mbox: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  mt: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  mbtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  mb: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  mbT: { color: '#fff', fontWeight: '700' },
});
