// Faz 42 — FieldShiftPlanScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { FieldShiftPlan, FieldZone } from '../types';
import { listPlan, addPlan, deletePlan, listZones } from '../services/fieldOps';

export default function FieldShiftPlanScreen() {
  const [items, setItems] = useState<FieldShiftPlan[]>([]);
  const [zones, setZones] = useState<FieldZone[]>([]);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('17:00');

  const load = useCallback(async () => { setItems(await listPlan()); setZones(await listZones()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onAdd = async () => {
    if (!name.trim() || !zoneId) { Alert.alert('Eksik', 'Ad ve bölge zorunlu.'); return; }
    await addPlan({ zoneId, userId: 'u-' + Date.now(), userName: name, date: new Date().toISOString().slice(0, 10), startTime: start, endTime: end });
    setName(''); setZoneId(''); setModal(false); load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 90 }}
        ListEmptyComponent={<Text style={s.empty}>Vardiya planı yok.</Text>}
        renderItem={({ item }) => {
          const z = zones.find(zz => zz.id === item.zoneId);
          return (
            <View style={[s.card, { borderLeftColor: z?.color || colors.border.primary }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.userName}</Text>
                <Text style={s.sub}>{z?.name || item.zoneId} · {item.date}</Text>
                <Text style={s.tm}>⏰ {item.startTime} → {item.endTime}</Text>
              </View>
              <TouchableOpacity onPress={() => Alert.alert('Sil', 'Plan silinsin mi?', [{ text: 'Vazgeç' }, { text: 'Sil', style: 'destructive', onPress: async () => { await deletePlan(item.id); load(); } }])}>
                <Ionicons name="trash" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          );
        }}
      />
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.mw}>
          <View style={s.mbox}>
            <Text style={s.mt}>Yeni Vardiya</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Personel adı" placeholderTextColor={colors.text.faint} />
            <Text style={s.lbl}>Bölge</Text>
            <View style={s.zonRow}>
              {zones.map(z => (
                <TouchableOpacity key={z.id} style={[s.zonBtn, zoneId === z.id && { backgroundColor: z.color, borderColor: z.color }]} onPress={() => setZoneId(z.id)}>
                  <Text style={[s.zonT, zoneId === z.id && { color: '#fff' }]}>{z.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.timeRow}>
              <TextInput style={[s.input, { flex: 1 }]} value={start} onChangeText={setStart} placeholder="08:00" placeholderTextColor={colors.text.faint} />
              <TextInput style={[s.input, { flex: 1 }]} value={end} onChangeText={setEnd} placeholder="17:00" placeholderTextColor={colors.text.faint} />
            </View>
            <View style={s.mbtns}>
              <TouchableOpacity style={[s.mbtn, { backgroundColor: '#475569' }]} onPress={() => setModal(false)}><Text style={s.mbtnT}>Vazgeç</Text></TouchableOpacity>
              <TouchableOpacity style={[s.mbtn, { backgroundColor: '#0ea5e9' }]} onPress={onAdd}><Text style={s.mbtnT}>Ekle</Text></TouchableOpacity>
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
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  name: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tm: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  mw: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.md },
  mbox: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  mt: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  lbl: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  zonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  zonBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  zonT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  timeRow: { flexDirection: 'row', gap: spacing.sm },
  mbtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  mbtn: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  mbtnT: { color: '#fff', fontWeight: '700' },
});
