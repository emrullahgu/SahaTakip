// Faz 45 — NcAssignmentScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { NonConformityRecord } from '../types';
import { listNonConformities, assignNc, updateNcStatus, NC_STATUS_COLOR, NC_STATUS_LABEL, NC_SEV_COLOR, NC_SEV_LABEL } from '../services/quality';

const STAFF = ['Ali Demir', 'Ayşe Kaya', 'Hakan Öz', 'Mehmet Yılmaz', 'Selin Yıldız'];

export default function NcAssignmentScreen() {
  const [items, setItems] = useState<NonConformityRecord[]>([]);
  const [modal, setModal] = useState<NonConformityRecord | null>(null);
  const [assignee, setAssignee] = useState('');
  const [days, setDays] = useState('7');

  const load = useCallback(async () => { setItems(await listNonConformities()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = items.filter(n => n.status !== 'closed');
  const closed = items.filter(n => n.status === 'closed');

  const onAssign = async () => {
    if (!modal || !assignee) { Alert.alert('Eksik', 'Sorumlu seçin.'); return; }
    const dueAt = new Date(Date.now() + (Number(days) || 7) * 86400000).toISOString();
    await assignNc(modal.id, assignee, dueAt);
    setModal(null); setAssignee(''); setDays('7'); load();
  };

  const onClose = async (id: string) => {
    Alert.alert('Onay', 'Bu kayıt kapatılsın mı?', [
      { text: 'İptal' },
      {
        text: 'Kapat', style: 'destructive', onPress: async () => {
          await updateNcStatus(id, 'closed'); load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.statRow}>
        <View style={[s.stat, { borderLeftColor: '#ef4444' }]}>
          <Text style={[s.sV, { color: '#ef4444' }]}>{open.length}</Text>
          <Text style={s.sL}>Açık</Text>
        </View>
        <View style={[s.stat, { borderLeftColor: '#22c55e' }]}>
          <Text style={[s.sV, { color: '#22c55e' }]}>{closed.length}</Text>
          <Text style={s.sL}>Kapalı</Text>
        </View>
        <View style={[s.stat, { borderLeftColor: '#a855f7' }]}>
          <Text style={[s.sV, { color: '#a855f7' }]}>{items.filter(i => i.assignedTo).length}</Text>
          <Text style={s.sL}>Atanmış</Text>
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => {
          const due = item.dueAt ? new Date(item.dueAt) : null;
          const daysLeft = due ? Math.round((due.getTime() - Date.now()) / 86400000) : null;
          return (
            <View style={[s.card, { borderLeftColor: NC_SEV_COLOR[item.severity] }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.code}>{item.code}</Text>
                <Text style={s.title}>{item.title}</Text>
                <View style={s.badges}>
                  <View style={[s.b, { backgroundColor: NC_SEV_COLOR[item.severity] }]}><Text style={s.bT}>{NC_SEV_LABEL[item.severity]}</Text></View>
                  <View style={[s.b, { backgroundColor: NC_STATUS_COLOR[item.status] }]}><Text style={s.bT}>{NC_STATUS_LABEL[item.status]}</Text></View>
                </View>
                <Text style={s.assg}>{item.assignedTo ? `👤 ${item.assignedTo}` : '— Atanmamış —'}</Text>
                {due && (
                  <Text style={[s.due, { color: daysLeft! < 0 ? '#ef4444' : daysLeft! < 3 ? '#f59e0b' : colors.text.muted }]}>
                    Hedef: {due.toLocaleDateString('tr-TR')} ({daysLeft! >= 0 ? `${daysLeft} gün` : `${-daysLeft!} gün gecikme`})
                  </Text>
                )}
              </View>
              <View style={s.btns}>
                {item.status !== 'closed' && (
                  <>
                    <TouchableOpacity style={[s.btn, { backgroundColor: '#a855f7' }]} onPress={() => { setModal(item); setAssignee(item.assignedTo || ''); }}>
                      <Ionicons name="person-add" size={14} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.btn, { backgroundColor: '#22c55e' }]} onPress={() => onClose(item.id)}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />

      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mTitle}>Sorumlu Ata</Text>
            <Text style={s.mSub}>{modal?.code} · {modal?.title}</Text>
            <Text style={s.lbl}>Personel</Text>
            <ScrollView style={{ maxHeight: 250 }}>
              {STAFF.map(p => (
                <TouchableOpacity key={p} style={[s.staffRow, assignee === p && { borderColor: '#a855f7', backgroundColor: '#a855f720' }]} onPress={() => setAssignee(p)}>
                  <Ionicons name="person" size={18} color={assignee === p ? '#a855f7' : colors.text.muted} />
                  <Text style={[s.staffT, assignee === p && { color: '#a855f7' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={s.lbl}>Hedef süresi (gün)</Text>
            <TextInput style={s.input} value={days} onChangeText={setDays} keyboardType="numeric" placeholderTextColor={colors.text.faint} />
            <View style={s.actions}>
              <TouchableOpacity style={[s.act, { backgroundColor: colors.bg.primary }]} onPress={() => setModal(null)}>
                <Text style={s.actT}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.act, { backgroundColor: '#a855f7' }]} onPress={onAssign}>
                <Text style={s.actT}>Ata</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  statRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  stat: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, alignItems: 'flex-start' },
  sV: { fontSize: typography.xl, fontWeight: '800' },
  sL: { color: colors.text.muted, fontSize: 10 },
  card: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  code: { color: colors.text.faint, fontSize: 10, fontWeight: '800' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  badges: { flexDirection: 'row', gap: 4, marginTop: 4 },
  b: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  bT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  assg: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  due: { fontSize: typography.xs, marginTop: 2 },
  btns: { gap: 6, alignItems: 'center' },
  btn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  mTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  mSub: { color: colors.text.muted, fontSize: typography.xs },
  lbl: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: 6 },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.primary, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border.primary, marginBottom: 4 },
  staffT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  act: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  actT: { color: '#fff', fontWeight: '800' },
});
