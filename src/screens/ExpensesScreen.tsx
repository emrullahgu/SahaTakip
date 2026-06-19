import React, { useCallback, useEffect, useState } from 'react';
import { localDateISO } from '../utils/date';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
 FlatList,
  RefreshControl,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography } from '../theme';
import EmptyState from '../components/EmptyState';
import RowMenu from '../components/RowMenu';
import { useAppContext } from '../context/AppContext';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { listExpenses, addExpense, deleteExpense, type Expense } from '../services/expenses';

const EXPENSE_TYPES = ['Yol', 'Yemek', 'Malzeme', 'Diğer'];

export default function ExpensesScreen() {
  const { toast, showToast } = useAppContext();
  const navigation = useNavigation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState(EXPENSE_TYPES[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { setExpenses(await listExpenses()); }
    finally { setLoading(false); setLoaded(true); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      Alert.alert('Geçersiz Tutar', 'Lütfen geçerli bir tutar girin.');
      return;
    }
    try {
      await addExpense({
        type,
        amount: parsed,
        date: localDateISO(),
        description,
      });
      setAmount('');
      setDescription('');
      setShowForm(false);
      showToast('Masraf başarıyla kaydedildi!');
      await load();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Masraf kaydedilemedi');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense(id);
      showToast('Masraf silindi');
      await load();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Masraf silinemedi');
    }
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const pending = expenses.filter(e => e.status === 'Bekliyor').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Masraflarım</Text>
            <Text style={styles.subtitle}>Oluşturduğunuz masrafların tümü</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowForm(!showForm)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ expanded: showForm }}
            accessibilityLabel={showForm ? 'Masraf formunu kapat' : 'Masraf ekle'}
          >
            <Ionicons name={showForm ? 'close' : 'add'} size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        {expenses.length > 0 && (
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>₺{total.toLocaleString('tr-TR')}</Text>
              <Text style={styles.summaryLbl}>Toplam Masraf</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: colors.amber.default }]}>{pending}</Text>
              <Text style={styles.summaryLbl}>Onay Bekliyor</Text>
            </View>
          </View>
        )}

        {/* Add Form */}
        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Yeni Masraf Ekle</Text>

            {/* Type Selector */}
            <View style={styles.typeRow}>
              {EXPENSE_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                  onPress={() => setType(t)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Tutar (₺)"
              placeholderTextColor={colors.text.faint}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={[styles.input, { marginTop: spacing.sm }]}
              placeholder="Açıklama (isteğe bağlı)"
              placeholderTextColor={colors.text.faint}
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Masrafı Kaydet</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Filter Badges */}
        {expenses.length > 0 && (
          <View style={styles.filterRow}>
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>Tümünü Göster</Text>
            </View>
            <View style={[styles.filterChip, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border.secondary }]}>
              <Text style={[styles.filterChipText, { color: colors.text.muted }]}>Bekleyenler</Text>
            </View>
          </View>
        )}

        {/* List or Empty State */}
        <FlatList
          {...FLATLIST_DEFAULTS}
          data={expenses}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.text.muted} />}
          ListEmptyComponent={loaded ? (
            <EmptyState
              icon="receipt-outline"
              title="Henüz masraf yok"
              subtitle="Saha harcamalarınızı kaydetmek için + butonuna basın."
              actionLabel="+ Masraf Ekle"
              onAction={() => setShowForm(true)}
            />
          ) : null}
          renderItem={({ item: e }) => (
            <View key={e.id} style={styles.expenseCard}>
              <View style={styles.expenseIcon}>
                <Ionicons
                  name={
                    e.type === 'Yol' ? 'car-outline' :
                    e.type === 'Yemek' ? 'restaurant-outline' :
                    e.type === 'Malzeme' ? 'construct-outline' :
                    'receipt-outline'
                  }
                  size={20}
                  color={colors.amber.default}
                />
              </View>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseType}>{e.type}</Text>
                {e.description ? (
                  <Text style={styles.expenseDesc} numberOfLines={1}>{e.description}</Text>
                ) : null}
                <Text style={styles.expenseDate}>{e.date}</Text>
              </View>
              <View style={styles.expenseRight}>
                <Text style={styles.expenseAmount}>
                  ₺{e.amount.toLocaleString('tr-TR')}
                </Text>
                <View style={[
                  styles.expenseStatus,
                  { backgroundColor: e.status === 'Onaylandı' ? colors.emerald.bg : colors.amber.bg }
                ]}>
                  <Text style={[
                    styles.expenseStatusText,
                    { color: e.status === 'Onaylandı' ? colors.emerald.default : colors.amber.default }
                  ]}>
                    {e.status}
                  </Text>
                </View>
              </View>
              <RowMenu
                items={[
                  {
                    label: 'Sil',
                    icon: 'trash-outline',
                    destructive: true,
                    confirm: `Bu masraf silinecek.`,
                    onPress: () => handleDelete(e.id),
                  },
                ]}
              />
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  container: { flex: 1, paddingHorizontal: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: { fontSize: typography.xl, color: colors.text.primary, fontWeight: '900' },
  subtitle: { fontSize: typography.xs, color: colors.text.muted, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.emerald.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: { alignItems: 'center' },
  summaryVal: { fontSize: typography.xl, color: colors.text.primary, fontWeight: '800' },
  summaryLbl: { fontSize: typography.xs, color: colors.text.faint, marginTop: 2 },
  divider: { width: 1, height: 36, backgroundColor: colors.border.primary },
  form: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  formTitle: {
    fontSize: typography.sm,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.bg.card,
    alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: colors.emerald.default },
  typeBtnText: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '600' },
  typeBtnTextActive: { color: colors.bg.primary },
  input: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    color: colors.text.primary,
    fontSize: typography.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  saveBtn: {
    backgroundColor: colors.emerald.default,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveBtnText: { color: colors.bg.primary, fontSize: typography.sm, fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.indigo.default,
  },
  filterChipText: { fontSize: typography.xs, color: '#fff', fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, paddingBottom: 80 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: typography.md, color: colors.text.secondary, fontWeight: '700' },
  emptyDesc: {
    fontSize: typography.xs,
    color: colors.text.faint,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  emptyBtn: {
    backgroundColor: colors.indigo.default,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  emptyBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: spacing.md,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.amber.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseInfo: { flex: 1 },
  expenseType: { fontSize: typography.sm, color: colors.text.primary, fontWeight: '700' },
  expenseDesc: { fontSize: typography.xs, color: colors.text.muted, marginTop: 1 },
  expenseDate: { fontSize: typography.xs, color: colors.text.faint, marginTop: 2 },
  expenseRight: { alignItems: 'flex-end', gap: 4 },
  expenseAmount: { fontSize: typography.sm, color: colors.text.primary, fontWeight: '800' },
  expenseStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  expenseStatusText: { fontSize: 10, fontWeight: '700' },
});
