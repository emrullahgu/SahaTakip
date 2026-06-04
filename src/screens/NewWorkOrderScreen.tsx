// NewWorkOrderScreen — Gerçek İŞ EMRİ (görev/atama) oluşturma.
// NewServiceScreen "servis raporu" (iş bittikten sonra foto+malzeme); bu ekran
// iş BAŞLAMADAN önce yapılacak işi tanımlar: müşteri + hizmet + öncelik + tarih
// + (opsiyonel) personel ataması. Status 'Bekliyor' / atanırsa 'Atandı'.
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import CustomerPicker from '../components/CustomerPicker';
import { newUuid } from '../services/data/repository';
import { priorityColor } from '../services/workOrderFlow';
import { WORK_ORDER_JOB_TYPES, jobTypeLabel } from '../services/workOrderFlow';
import type { RootStackParamList, WorkOrder, WorkOrderPriority, Customer, WorkOrderJobType } from '../types';

const PRIORITIES: WorkOrderPriority[] = ['Normal', 'Yüksek', 'Acil'];

export default function NewWorkOrderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { customers, employees, addWorkOrder, assignWorkOrder } = useAppContext();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [priority, setPriority] = useState<WorkOrderPriority>('Normal');
  const [jobType, setJobType] = useState<WorkOrderJobType>('FIELD');
  const [plannedDate, setPlannedDate] = useState('');
  const [assignee, setAssignee] = useState<{ id: string; name: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [showAssignee, setShowAssignee] = useState(false);

  const submit = () => {
    if (!customer) { Alert.alert('Müşteri Seçin', 'İş emri için bir müşteri seçin.'); return; }
    if (!serviceName.trim()) { Alert.alert('Hizmet Girin', 'Yapılacak işin adını yazın.'); return; }

    const id = newUuid();
    const planned = plannedDate.trim() ? `${plannedDate.trim()}T08:00:00` : undefined;
    const wo: WorkOrder = {
      id,
      client: customer.shortName,
      serviceName: serviceName.trim(),
      date: plannedDate.trim() || new Date().toISOString().slice(0, 10),
      engineer: assignee?.name || '',
      materials: [],
      otherCost: 0, laborCost: 0, materialCost: 0, quoteAmount: 0, profit: 0,
      beforePhoto: '', afterPhoto: '',
      status: assignee ? 'Atandı' : 'Bekliyor',
      priority,
      jobType,
      plannedStart: planned,
      assignedToId: assignee?.id,
      assignedToName: assignee?.name,
      assignmentStatus: assignee ? 'Atandı' : 'Atanmadı',
      notes: notes.trim(),
    };
    addWorkOrder(wo);
    // Atama yapıldıysa atanan kişiye bildirim gitsin (assignWorkOrder push tetikler).
    if (assignee) {
      try { assignWorkOrder(id, assignee.id, assignee.name); } catch { /* ignore */ }
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Yeni İş Emri</Text>
          <Text style={styles.subtitle}>Yapılacak işi tanımlayın ve atayın</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.labelRow}>
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>1. Müşteri</Text>
          <TouchableOpacity
            style={styles.newCustomerBtn}
            onPress={() => navigation.navigate('CustomerForm')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.newCustomerText}>Yeni Müşteri</Text>
          </TouchableOpacity>
        </View>
        <CustomerPicker
          customers={customers}
          selectedId={customer?.id}
          onSelect={setCustomer}
          placeholder="Müşteri ara (ad, ünvan, vergi no)..."
        />

        <Text style={styles.label}>2. Yapılacak Hizmet / İş</Text>
        <TextInput
          style={styles.input}
          value={serviceName}
          onChangeText={setServiceName}
          placeholder="Örn. Trafo periyodik bakımı, pano montajı..."
          placeholderTextColor={colors.text.faint}
        />

        <Text style={styles.label}>3. Öncelik</Text>
        <View style={styles.chipRow}>
          {PRIORITIES.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, priority === p && { backgroundColor: priorityColor(p), borderColor: priorityColor(p) }]}
              onPress={() => setPriority(p)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, priority === p && { color: '#fff' }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>4. İş Türü</Text>
        <View style={styles.chipRow}>
          {WORK_ORDER_JOB_TYPES.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[styles.chip, jobType === t.value && { backgroundColor: colors.indigo.default, borderColor: colors.indigo.default }]}
              onPress={() => setJobType(t.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, jobType === t.value && { color: '#fff' }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {jobType !== 'FIELD' && (
          <Text style={styles.hint}>{jobTypeLabel(jobType)} — lokasyon/check-in gerektirmez.</Text>
        )}

        <Text style={styles.label}>5. Planlanan Tarih (opsiyonel)</Text>
        <TextInput
          style={styles.input}
          value={plannedDate}
          onChangeText={setPlannedDate}
          placeholder="YYYY-AA-GG"
          placeholderTextColor={colors.text.faint}
        />

        <Text style={styles.label}>6. Atanan Personel (opsiyonel)</Text>
        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowAssignee(v => !v)} activeOpacity={0.8}>
          <Ionicons name="person-outline" size={18} color={colors.emerald.default} />
          <Text style={[styles.pickerText, !assignee && { color: colors.text.faint }]}>
            {assignee ? assignee.name : 'Personel seçin (boş bırakılırsa havuza düşer)'}
          </Text>
          <Ionicons name={showAssignee ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.faint} />
        </TouchableOpacity>
        {showAssignee && (
          <View style={styles.assigneeList}>
            {assignee && (
              <TouchableOpacity style={styles.assigneeItem} onPress={() => { setAssignee(null); setShowAssignee(false); }}>
                <Ionicons name="close-circle-outline" size={16} color={colors.rose.default} />
                <Text style={[styles.assigneeName, { color: colors.rose.default }]}>Atamayı kaldır</Text>
              </TouchableOpacity>
            )}
            {employees.map(e => (
              <TouchableOpacity
                key={e.id}
                style={styles.assigneeItem}
                onPress={() => { setAssignee({ id: e.id, name: e.name }); setShowAssignee(false); }}
              >
                <Ionicons name="person" size={16} color={colors.text.muted} />
                <Text style={styles.assigneeName}>{e.name}</Text>
                <Text style={styles.assigneeRole}>{e.role}</Text>
              </TouchableOpacity>
            ))}
            {employees.length === 0 && <Text style={styles.hint}>Personel kaydı yok.</Text>}
          </View>
        )}

        <Text style={styles.label}>7. Not (opsiyonel)</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="İş ile ilgili açıklama, adres detayı..."
          placeholderTextColor={colors.text.faint}
          multiline
        />

        <TouchableOpacity style={styles.submitBtn} onPress={submit} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.submitText}>İş Emrini Oluştur</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: typography.xl, color: colors.text.primary, fontWeight: '900' },
  subtitle: { fontSize: typography.xs, color: colors.text.muted, marginTop: 2 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  label: { fontSize: typography.sm, color: colors.text.secondary, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
  newCustomerBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.emerald.default, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.full },
  newCustomerText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary, fontSize: typography.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.card },
  chipText: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '700' },
  hint: { fontSize: typography.xs, color: colors.text.muted, marginTop: spacing.xs },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  pickerText: { flex: 1, color: colors.text.primary, fontSize: typography.sm },
  assigneeList: { marginTop: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.lg, overflow: 'hidden' },
  assigneeItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  assigneeName: { flex: 1, color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  assigneeRole: { color: colors.text.faint, fontSize: typography.xs },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.emerald.default, borderRadius: radius.lg, paddingVertical: spacing.md, marginTop: spacing.xl },
  submitText: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
});
