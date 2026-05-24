// CashRegisterScreen — POZ-DEV-081
// Saha personeli kasa takibi: personel listesi + seçili personelin ledger'ı + manuel hareket ekleme.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  summariesForAll,
  listByEmployee,
  addEntry,
  deleteEntry,
  CASH_KIND_LABEL,
  CASH_KIND_SIGN,
} from '../services/cashRegister';
import { useAppContext } from '../context/AppContext';
import { CashEntry, CashEntryKind, CashSummary, RootStackParamList } from '../types';

type Rt = RouteProp<RootStackParamList, 'CashRegister'>;

function fmtMoney(n: number): string {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

const KIND_COLOR: Record<CashEntryKind, string> = {
  opening: '#6366f1',
  collection: brand.green,
  expense: '#f59e0b',
  deposit: '#0ea5e9',
  adjustment: '#8b5cf6',
};

const KIND_ICON: Record<CashEntryKind, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  opening: 'flag-outline',
  collection: 'cash-outline',
  expense: 'card-outline',
  deposit: 'swap-horizontal-outline',
  adjustment: 'options-outline',
};

export default function CashRegisterScreen() {
  const route = useRoute<Rt>();
  const initEmpId = route.params?.employeeId;
  const { employees } = useAppContext();
  const [selected, setSelected] = useState<string | null>(initEmpId ?? null);
  const [summaries, setSummaries] = useState<CashSummary[]>([]);
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [kind, setKind] = useState<CashEntryKind>('collection');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const loadSummaries = useCallback(async () => {
    setSummaries(await summariesForAll(employees));
  }, [employees]);

  const loadEntries = useCallback(async () => {
    if (!selected) { setEntries([]); return; }
    setEntries(await listByEmployee(selected));
  }, [selected]);

  useFocusEffect(useCallback(() => { loadSummaries(); }, [loadSummaries]));
  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Auto-select first employee if none
  useEffect(() => {
    if (!selected && employees.length > 0) setSelected(employees[0].id);
  }, [employees, selected]);

  const selectedEmp = useMemo(
    () => employees.find(e => e.id === selected),
    [employees, selected],
  );
  const selectedSummary = useMemo(
    () => summaries.find(s => s.employeeId === selected),
    [summaries, selected],
  );

  const onAdd = async () => {
    if (!selectedEmp) return;
    const amt = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert('Eksik', 'Tutar 0\'dan büyük olmalı.');
      return;
    }
    await addEntry({
      employeeId: selectedEmp.id,
      employeeName: selectedEmp.name,
      kind,
      amount: amt,
      note: note.trim() || undefined,
    });
    setAmount('');
    setNote('');
    await Promise.all([loadEntries(), loadSummaries()]);
  };

  const onDeleteEntry = (e: CashEntry) => {
    Alert.alert('Sil', `${CASH_KIND_LABEL[e.kind]} kaydını silmek istiyor musunuz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(e.id);
          await Promise.all([loadEntries(), loadSummaries()]);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Personel Kasa Takibi</Text>

        <Text style={styles.section}>Personel</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {employees.map(e => {
            const active = e.id === selected;
            const sum = summaries.find(s => s.employeeId === e.id);
            return (
              <TouchableOpacity
                key={e.id}
                style={[styles.empChip, active && styles.empChipActive]}
                onPress={() => setSelected(e.id)}
              >
                <Text style={[styles.empChipName, active && styles.empChipTextActive]}>{e.name}</Text>
                {sum ? (
                  <Text style={[styles.empChipBal, active && styles.empChipTextActive]}>
                    {fmtMoney(sum.balance)}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedSummary ? (
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>{selectedSummary.employeeName} — Kasa Bakiye</Text>
            <Text style={[styles.balanceValue, { color: selectedSummary.balance >= 0 ? brand.green : colors.rose.default }]}>
              {fmtMoney(selectedSummary.balance)}
            </Text>
            <View style={styles.miniGrid}>
              <Mini label="Açılış" value={fmtMoney(selectedSummary.opening)} />
              <Mini label="Tahsilat" value={fmtMoney(selectedSummary.collected)} color={brand.green} />
              <Mini label="Harcama" value={fmtMoney(selectedSummary.spent)} color="#f59e0b" />
              <Mini label="Teslim" value={fmtMoney(selectedSummary.deposited)} color="#0ea5e9" />
            </View>
          </View>
        ) : null}

        <Text style={styles.section}>Yeni Hareket</Text>
        <View style={styles.kindRow}>
          {(['collection', 'expense', 'deposit', 'opening', 'adjustment'] as CashEntryKind[]).map(k => {
            const active = k === kind;
            return (
              <TouchableOpacity
                key={k}
                style={[styles.kindBtn, active && { backgroundColor: KIND_COLOR[k], borderColor: KIND_COLOR[k] }]}
                onPress={() => setKind(k)}
              >
                <Ionicons name={KIND_ICON[k]} size={14} color={active ? '#fff' : colors.text.primary} />
                <Text style={[styles.kindText, active && { color: '#fff' }]}>{CASH_KIND_LABEL[k]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Tutar"
          placeholderTextColor={colors.text.faint}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="Not (opsiyonel)"
          placeholderTextColor={colors.text.faint}
        />
        <TouchableOpacity style={styles.addBtn} onPress={onAdd} disabled={!selected}>
          <Ionicons name="add-circle-outline" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Hareket Ekle</Text>
        </TouchableOpacity>

        <Text style={styles.section}>Hareketler</Text>
        {entries.length === 0 ? (
          <Text style={styles.empty}>Hareket yok.</Text>
        ) : (
          entries.map(e => (
            <TouchableOpacity
              key={e.id}
              style={styles.entryRow}
              onLongPress={() => onDeleteEntry(e)}
              activeOpacity={0.8}
            >
              <View style={[styles.entryIcon, { backgroundColor: KIND_COLOR[e.kind] + '22' }]}>
                <Ionicons name={KIND_ICON[e.kind]} size={14} color={KIND_COLOR[e.kind]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryTitle}>
                  {CASH_KIND_LABEL[e.kind]}
                  {e.note ? ` — ${e.note}` : ''}
                </Text>
                <Text style={styles.entryDate}>{fmtDate(e.date)}</Text>
              </View>
              <Text style={[styles.entryAmount, { color: KIND_COLOR[e.kind] }]}>
                {CASH_KIND_SIGN[e.kind]}{fmtMoney(e.amount)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.mini}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  section: {
    color: colors.text.primary, fontWeight: '800', fontSize: typography.sm,
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  chips: { gap: 8, paddingVertical: 4 },
  empChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
    gap: 2,
  },
  empChipActive: { backgroundColor: brand.blueLight, borderColor: brand.blueLight },
  empChipName: { color: colors.text.primary, fontWeight: '700', fontSize: typography.xs },
  empChipBal: { color: colors.text.muted, fontSize: 10 },
  empChipTextActive: { color: '#fff' },
  balanceCard: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  balanceLabel: { color: colors.text.muted, fontSize: typography.xs },
  balanceValue: { fontWeight: '800', fontSize: 26, marginTop: 4 },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  mini: {
    width: '48%',
    backgroundColor: colors.bg.primary,
    borderRadius: radius.sm,
    padding: 8,
  },
  miniLabel: { color: colors.text.muted, fontSize: 10 },
  miniValue: { color: colors.text.primary, fontWeight: '700', fontSize: typography.xs, marginTop: 2 },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  kindBtn: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
    gap: 4,
    alignItems: 'center',
  },
  kindText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  input: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text.primary,
    fontSize: typography.sm,
    marginTop: 6,
  },
  addBtn: {
    flexDirection: 'row',
    backgroundColor: brand.green,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  empty: { color: colors.text.muted, fontSize: typography.sm, paddingVertical: spacing.lg, textAlign: 'center' },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  entryIcon: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  entryTitle: { color: colors.text.primary, fontWeight: '600', fontSize: typography.xs },
  entryDate: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  entryAmount: { fontWeight: '800', fontSize: typography.xs },
});
