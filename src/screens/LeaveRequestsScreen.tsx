// LeaveRequestsScreen — İzin talepleri (Bölüm 4). Yönetici tüm talepleri görür,
// onaylar/reddeder ve personel adına talep oluşturur. RLS maaş/izin gizliliği DB'de.
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import EmptyState from '../components/EmptyState';
import {
  listLeaveRequests, createLeaveRequest, decideLeaveRequest,
  LEAVE_TYPE_LABEL, LEAVE_STATUS_LABEL, type LeaveRequest,
} from '../services/payrollHr';

const TYPES: LeaveRequest['leaveType'][] = ['annual', 'sick', 'unpaid', 'other'];
const STATUS_COLOR: Record<LeaveRequest['status'], string> = {
  pending: colors.amber.default, approved: colors.emerald.default, rejected: colors.rose.default,
};

export default function LeaveRequestsScreen() {
  const nav = useNavigation();
  const { employees } = useAppContext();
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [empId, setEmpId] = useState<string>('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [type, setType] = useState<LeaveRequest['leaveType']>('annual');
  const [reason, setReason] = useState('');

  const nameOf = (id: string) => employees.find(e => e.id === id)?.name || 'Personel';

  const load = useCallback(() => {
    setLoading(true);
    listLeaveRequests().then(setItems).finally(() => setLoading(false));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    if (!empId) { Alert.alert('Personel', 'Personel seçin.'); return; }
    if (!start.trim() || !end.trim()) { Alert.alert('Tarih', 'Başlangıç ve bitiş tarihi girin.'); return; }
    try {
      await createLeaveRequest({ employeeId: empId, startDate: start.trim(), endDate: end.trim(), leaveType: type, reason: reason.trim() });
      setShowNew(false); setEmpId(''); setStart(''); setEnd(''); setReason(''); setType('annual');
      load();
    } catch (e: any) { Alert.alert('Hata', e?.message || 'Talep oluşturulamadı'); }
  };

  const decide = async (id: string, approve: boolean) => {
    try { await decideLeaveRequest(id, approve); load(); }
    catch (e: any) { Alert.alert('Hata', e?.message || 'İşlem başarısız'); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={8}><Ionicons name="arrow-back" size={24} color={colors.text.primary} /></TouchableOpacity>
        <Text style={styles.title}>İzin Talepleri</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowNew(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={18} color="#fff" /><Text style={styles.newBtnText}>Yeni</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        onRefresh={load}
        refreshing={loading}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardName}>{nameOf(item.employeeId)}</Text>
              <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[item.status] }]}>
                <Text style={styles.statusText}>{LEAVE_STATUS_LABEL[item.status]}</Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>{LEAVE_TYPE_LABEL[item.leaveType]} · {item.startDate} → {item.endDate}</Text>
            {!!item.reason && <Text style={styles.cardReason}>{item.reason}</Text>}
            {item.status === 'pending' && (
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.emerald.default }]} onPress={() => decide(item.id, true)}>
                  <Ionicons name="checkmark" size={16} color="#fff" /><Text style={styles.actText}>Onayla</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.rose.default }]} onPress={() => decide(item.id, false)}>
                  <Ionicons name="close" size={16} color="#fff" /><Text style={styles.actText}>Reddet</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={!loading ? <EmptyState icon="airplane-outline" title="İzin talebi yok" subtitle="Sağ üstten 'Yeni' ile izin talebi oluşturun." /> : null}
      />

      <Modal visible={showNew} transparent animationType="slide" onRequestClose={() => setShowNew(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni İzin Talebi</Text>
              <TouchableOpacity onPress={() => setShowNew(false)}><Ionicons name="close" size={22} color={colors.text.muted} /></TouchableOpacity>
            </View>
            <Text style={styles.label}>Personel</Text>
            <FlatList
              data={employees}
              keyExtractor={e => e.id}
              style={{ maxHeight: 130 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.empRow} onPress={() => setEmpId(item.id)}>
                  <Ionicons name={empId === item.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={empId === item.id ? colors.emerald.default : colors.text.faint} />
                  <Text style={styles.empName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <Text style={styles.label}>İzin Türü</Text>
            <View style={styles.chipRow}>
              {TYPES.map(t => (
                <TouchableOpacity key={t} style={[styles.chip, type === t && { backgroundColor: colors.amber.default, borderColor: colors.amber.default }]} onPress={() => setType(t)}>
                  <Text style={[styles.chipText, type === t && { color: '#fff' }]}>{LEAVE_TYPE_LABEL[t]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dateRow}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Başlangıç YYYY-AA-GG" placeholderTextColor={colors.text.faint} value={start} onChangeText={setStart} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Bitiş YYYY-AA-GG" placeholderTextColor={colors.text.faint} value={end} onChangeText={setEnd} />
            </View>
            <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} placeholder="Açıklama (opsiyonel)" placeholderTextColor={colors.text.faint} value={reason} onChangeText={setReason} multiline />
            <TouchableOpacity style={styles.submitBtn} onPress={submit} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={styles.submitText}>Talep Oluştur</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { flex: 1, fontSize: typography.xl, color: colors.text.primary, fontWeight: '900' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.amber.default, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full },
  newBtnText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  card: { backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border.primary },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: typography.md, color: colors.text.primary, fontWeight: '800' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardMeta: { fontSize: typography.xs, color: colors.text.muted, marginTop: 4 },
  cardReason: { fontSize: typography.sm, color: colors.text.secondary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: radius.md, paddingVertical: 8 },
  actText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.bg.primary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  modalTitle: { fontSize: typography.lg, color: colors.text.primary, fontWeight: '800' },
  label: { fontSize: typography.xs, color: colors.text.secondary, fontWeight: '800', marginTop: spacing.sm, marginBottom: spacing.xs },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  empName: { color: colors.text.primary, fontSize: typography.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.card },
  chipText: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '700' },
  dateRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary, fontSize: typography.sm, marginTop: spacing.sm },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.emerald.default, borderRadius: radius.lg, paddingVertical: spacing.md, marginTop: spacing.lg },
  submitText: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
});
