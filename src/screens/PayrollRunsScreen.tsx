// PayrollRunsScreen — POZ-DEV-253 Bordro listesi + yeni bordro modali
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, PayrollRun } from '../types';
import { useAppContext } from '../context/AppContext';
import { listPayrollRuns, computePayroll, savePayrollRun, listTimesheet, timesheetForMonth } from '../services/payroll';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

export default function PayrollRunsScreen() {
  const nav = useNavigation<Nav>();
  const { employees } = useAppContext();
  const [items, setItems] = useState<PayrollRun[]>([]);
  const [modal, setModal] = useState(false);
  const [empId, setEmp] = useState<string | undefined>();
  const [month, setMonth] = useState<string>(monthKey(new Date()));
  const [wage, setWage] = useState('25000');
  const [bonus, setBonus] = useState('');
  const [advance, setAdvance] = useState('');
  const [expense, setExpense] = useState('');
  const [otRate, setOtRate] = useState('50');
  const [days, setDays] = useState('0');
  const [otHours, setOtHours] = useState('0');

  const refresh = useCallback(async () => { setItems(await listPayrollRuns()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onOpenModal = async () => {
    setModal(true);
    if (empId) loadTimesheet(empId, month);
  };

  const loadTimesheet = async (eId: string, m: string) => {
    const all = await listTimesheet();
    const entries = timesheetForMonth(all, eId, `${m}-01`);
    setDays(String(entries.filter(e => e.status === 'present').length));
    setOtHours(String(entries.reduce((s, e) => s + (e.overtime || 0), 0)));
  };

  const preview = useMemo(() => {
    if (!empId) return null;
    const emp = employees.find(e => e.id === empId);
    return computePayroll({
      employeeId: empId,
      employeeName: emp?.name || '',
      periodMonth: month,
      monthlyWage: Number(wage) || 0,
      daysWorked: Number(days) || 0,
      overtimeHours: Number(otHours) || 0,
      overtimeRate: Number(otRate) || 50,
      bonus: bonus ? Number(bonus) : undefined,
      advance: advance ? Number(advance) : undefined,
      expense: expense ? Number(expense) : undefined,
    });
  }, [empId, month, wage, days, otHours, otRate, bonus, advance, expense, employees]);

  const onSave = async () => {
    if (!preview) return Alert.alert('Eksik', 'Personel seçin');
    // DOĞRULAMA: geçersiz/negatif değerler bordroya sızmasın (önceden negatif NET maaş bile
    // sessizce kaydediliyordu — avans brütten fazlaysa).
    if (!(Number(wage) > 0)) return Alert.alert('Geçersiz', "Aylık ücret 0'dan büyük olmalı.");
    const d = Number(days);
    if (!Number.isFinite(d) || d < 0 || d > 31) return Alert.alert('Geçersiz', 'Çalışılan gün 0–31 arası olmalı.');
    if (!/^\d{4}-\d{2}$/.test(month)) return Alert.alert('Geçersiz', 'Dönem YYYY-AA biçiminde olmalı (örn. 2026-06).');
    if (preview.net < 0) {
      return Alert.alert('Negatif Net Maaş', `Net maaş negatif (${preview.net.toFixed(2)} ₺) — avans/kesinti brüt ücretten fazla. Değerleri kontrol edin.`);
    }
    await savePayrollRun({ ...preview, status: 'draft' });
    setModal(false);
    refresh();
  };

  const grouped = useMemo(() => {
    const m = new Map<string, PayrollRun[]>();
    items.forEach(r => {
      const arr = m.get(r.periodMonth) || [];
      arr.push(r);
      m.set(r.periodMonth, arr);
    });
    return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.headerRow}>
          <Text style={s.title}>Bordrolar</Text>
          <TouchableOpacity style={s.addBtn} onPress={onOpenModal}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addBtnText}>Yeni Bordro</Text>
          </TouchableOpacity>
        </View>

        {grouped.length === 0 && <Text style={s.empty}>Henüz bordro yok</Text>}
        {grouped.map(([m, runs]) => {
          const total = runs.reduce((sum, r) => sum + r.net, 0);
          return (
            <View key={m} style={s.group}>
              <View style={s.groupHead}>
                <Text style={s.groupTitle}>{m}</Text>
                <Text style={s.groupTotal}>₺{total.toLocaleString('tr-TR')}</Text>
              </View>
              {runs.map(r => (
                <TouchableOpacity key={r.id} style={s.card} onPress={() => nav.navigate('PayrollDetail', { runId: r.id })}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{r.employeeName}</Text>
                    <Text style={s.cardMeta}>Brüt: ₺{r.gross.toLocaleString('tr-TR')} · Kesinti: ₺{r.deductions.toLocaleString('tr-TR')}</Text>
                  </View>
                  <Text style={s.netVal}>₺{r.net.toLocaleString('tr-TR')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Yeni Bordro</Text>
              <TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={22} color={colors.text.primary} /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={s.fieldLabel}>Dönem (YYYY-MM)</Text>
              <TextInput style={s.input} value={month} onChangeText={(v) => { setMonth(v); if (empId) loadTimesheet(empId, v); }} />
              <Text style={s.fieldLabel}>Personel</Text>
              <View style={s.chips}>
                {employees.map(e => (
                  <TouchableOpacity key={e.id} style={[s.chip, empId === e.id && s.chipActive]} onPress={() => { setEmp(e.id); loadTimesheet(e.id, month); }}>
                    <Text style={[s.chipText, empId === e.id && { color: '#fff' }]}>{e.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Aylık ücret</Text><TextInput style={s.input} value={wage} onChangeText={setWage} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Çalışma günü</Text><TextInput style={s.input} value={days} onChangeText={setDays} keyboardType="numeric" /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Mesai (saat)</Text><TextInput style={s.input} value={otHours} onChangeText={setOtHours} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Mesai ₺/saat</Text><TextInput style={s.input} value={otRate} onChangeText={setOtRate} keyboardType="numeric" /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Prim</Text><TextInput style={s.input} value={bonus} onChangeText={setBonus} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Avans</Text><TextInput style={s.input} value={advance} onChangeText={setAdvance} keyboardType="numeric" /></View>
              </View>
              <Text style={s.fieldLabel}>Masraf iadesi</Text>
              <TextInput style={s.input} value={expense} onChangeText={setExpense} keyboardType="numeric" />

              {preview && (
                <View style={s.calcBox}>
                  <View style={s.calcRow}><Text style={s.calcL}>Brüt</Text><Text style={s.calcV}>₺{preview.gross.toLocaleString('tr-TR')}</Text></View>
                  <View style={s.calcRow}><Text style={s.calcL}>Kesinti</Text><Text style={s.calcV}>₺{preview.deductions.toLocaleString('tr-TR')}</Text></View>
                  <View style={s.calcRow}><Text style={[s.calcL, { color: colors.text.primary, fontWeight: '800' }]}>NET</Text><Text style={[s.calcV, { color: '#22c55e', fontSize: typography.md }]}>₺{preview.net.toLocaleString('tr-TR')}</Text></View>
                </View>
              )}

              <TouchableOpacity style={s.saveBtn} onPress={onSave}>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={s.saveText}>Bordroyu Kaydet</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10b981', paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: spacing.lg },
  group: { gap: 6 },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  groupTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  groupTotal: { color: '#22c55e', fontWeight: '800', fontSize: typography.sm },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  cardMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  netVal: { color: '#22c55e', fontWeight: '800', fontSize: typography.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bg.primary, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, padding: spacing.lg, maxHeight: '90%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  fieldLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: 8, marginBottom: 4 },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, color: colors.text.primary, fontSize: typography.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  chipText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  calcBox: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, padding: spacing.md, gap: 6, marginTop: spacing.md },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calcL: { color: colors.text.muted, fontSize: typography.sm },
  calcV: { color: colors.text.primary, fontWeight: '800' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.md },
  saveText: { color: '#fff', fontWeight: '800' },
});
