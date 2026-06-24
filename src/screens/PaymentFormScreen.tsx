// PaymentFormScreen — POZ-DEV-078
// Yeni / mevcut tahsilatı kaydetme.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  createPayment,
  updatePayment,
  getPayment,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABEL,
} from '../services/payments';
import { addEntry } from '../services/cashRegister';
import { newUuid } from '../services/data';
import { Notify } from '../services/notifications';
import { useAppContext } from '../context/AppContext';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PaymentForm'>;
type Rt = RouteProp<RootStackParamList, 'PaymentForm'>;

export default function PaymentFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const editId = route.params?.paymentId;
  const initCustomerId = route.params?.customerId;
  const initWorkOrderId = route.params?.workOrderId;
  const initQuoteId = route.params?.quoteId;

  const { customers, workOrders, employees } = useAppContext();

  const [customerId, setCustomerId] = useState(initCustomerId ?? '');
  const [workOrderId, setWorkOrderId] = useState(initWorkOrderId ?? '');
  const [quoteId, setQuoteId] = useState(initQuoteId ?? '');
  const [amount, setAmount] = useState('');
  const [vatRate, setVatRate] = useState('20');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [status, setStatus] = useState<PaymentStatus>('received');
  const [receivedById, setReceivedById] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  // KARARLI id'ler: tahsilat ve kasa girişi atomik değil; kasa girişi koparsa kullanıcı
  // "Kaydet"e tekrar basar. Aynı id ile retry -> upsert idempotent -> çift tahsilat/çift
  // kasa girişi OLMAZ. Form mount başına sabit (yeni tahsilat); editId'de kullanılmaz.
  const payIdRef = useRef(newUuid());
  const cashIdRef = useRef(newUuid());

  useEffect(() => {
    (async () => {
      if (editId) {
        const p = await getPayment(editId);
        if (p) {
          setCustomerId(p.customerId);
          setWorkOrderId(p.workOrderId ?? '');
          setQuoteId(p.quoteId ?? '');
          setAmount(String(p.amount));
          setVatRate(p.vatRate ? String(p.vatRate) : '');
          setMethod(p.method);
          setStatus(p.status);
          setReceivedById(p.receivedById ?? '');
          setNote(p.note ?? '');
        }
      }
    })();
  }, [editId]);

  const customer = useMemo(
    () => customers.find(c => c.id === customerId),
    [customers, customerId],
  );
  const employee = useMemo(
    () => employees.find(e => e.id === receivedById),
    [employees, receivedById],
  );

  const onSave = async () => {
    const amt = parseFloat(amount.replace(',', '.'));
    if (!customer) {
      Alert.alert('Eksik', 'Müşteri seçin.');
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert('Eksik', 'Tutar 0\'dan büyük olmalı.');
      return;
    }

    setSaving(true);
    try {
      const vat = parseFloat(vatRate.replace(',', '.'));
      const base: Omit<Payment, 'id' | 'createdAt'> = {
        customerId: customer.id,
        customerName: customer.shortName,
        workOrderId: workOrderId || undefined,
        quoteId: quoteId || undefined,
        amount: amt,
        method,
        status,
        receivedAt: new Date().toISOString(),
        receivedBy: employee?.name,
        receivedById: employee?.id,
        vatRate: Number.isFinite(vat) ? vat : undefined,
        note: note.trim() || undefined,
      };

      // 1) TAHSİLAT — başarısız olursa kasa girişine GEÇME (yetim kasa girişi olmasın).
      let saved: Payment | null;
      try {
        if (editId) {
          saved = await updatePayment(editId, base);
        } else {
          saved = await createPayment({ ...base, id: payIdRef.current });
        }
      } catch (e: any) {
        // Tahsilatın KENDİSİ kaydedilemedi → dürüst hata; kararlı id sayesinde tekrar
        // denemek çift kayıt YARATMAZ (upsert idempotent).
        Alert.alert('Hata', (editId ? 'Tahsilat güncellenemedi: ' : 'Tahsilat kaydedilemedi: ') + (e?.message || 'bilinmeyen hata'));
        return;
      }

      // 2) KASA GİRİŞİ — tahsilat KAYDEDİLDİ; kasa girişi ayrı tablo (atomik değil).
      // Koparsa tahsilatı "kaydedilemedi" diye GÖSTERME (yalan olur); hedefli mesaj ver.
      // Kararlı cashId + upsert → "Kaydet"e tekrar basmak yalnız kasa girişini tamamlar,
      // tahsilatı TEKRARLAMAZ.
      if (!editId && saved && status === 'received' && employee &&
          (method === 'cash' || method === 'card' || method === 'transfer')) {
        try {
          await addEntry({
            id: cashIdRef.current,
            employeeId: employee.id,
            employeeName: employee.name,
            kind: 'collection',
            amount: amt,
            paymentId: saved.id,
            workOrderId: workOrderId || undefined,
            note: `${customer.shortName} tahsilatı`,
          });
        } catch (e: any) {
          Alert.alert(
            'Kısmen tamam',
            'Tahsilat KAYDEDİLDİ ancak kasa girişi yapılamadı: ' + (e?.message || 'bilinmeyen hata') +
              '\n\n"Kaydet"e tekrar basarsanız yalnız kasa girişi tamamlanır (tahsilat tekrarlanmaz).',
          );
          return;
        }
      }

      // Bildirim olayı (tahsilat + kasa girişi tamam)
      if (!editId && saved && status === 'received') {
        await Notify.paymentReceived(customer.shortName, amt, saved.id);
      }

      Alert.alert('Tamam', editId ? 'Tahsilat güncellendi.' : 'Tahsilat kaydedildi.', [
        {
          text: 'Detay',
          onPress: () =>
            saved && navigation.replace('PaymentDetail', { paymentId: saved.id }),
        },
        { text: 'Kapat', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{editId ? 'Tahsilatı Düzenle' : 'Yeni Tahsilat'}</Text>

        <Text style={styles.label}>Müşteri *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {customers.map(c => {
            const active = c.id === customerId;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCustomerId(c.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c.shortName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>İş Emri (opsiyonel)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, workOrderId === '' && styles.chipActive]}
            onPress={() => setWorkOrderId('')}
          >
            <Text style={[styles.chipText, workOrderId === '' && styles.chipTextActive]}>—</Text>
          </TouchableOpacity>
          {workOrders
            .filter(w => !customer || w.client === customer.shortName || w.client === customer.title)
            .slice(0, 30)
            .map(w => {
              const active = w.id === workOrderId;
              return (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setWorkOrderId(w.id)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                    {w.serviceName}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView>

        <Text style={styles.label}>Tutar (₺) *</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={colors.text.faint}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>KDV Oranı (%)</Text>
        <TextInput
          style={styles.input}
          value={vatRate}
          onChangeText={setVatRate}
          placeholder="20"
          placeholderTextColor={colors.text.faint}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Ödeme Yöntemi</Text>
        <View style={styles.methodGrid}>
          {PAYMENT_METHODS.map(m => {
            const active = m.value === method;
            return (
              <TouchableOpacity
                key={m.value}
                style={[styles.methodBtn, active && styles.methodBtnActive]}
                onPress={() => setMethod(m.value)}
              >
                <Ionicons
                  name={m.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={active ? '#fff' : colors.text.primary}
                />
                <Text style={[styles.methodText, active && styles.methodTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Durum</Text>
        <View style={styles.statusRow}>
          {(['received', 'pending', 'cancelled', 'refunded'] as PaymentStatus[]).map(s => {
            const active = s === status;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {PAYMENT_STATUS_LABEL[s]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Tahsilatçı (Personel)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, receivedById === '' && styles.chipActive]}
            onPress={() => setReceivedById('')}
          >
            <Text style={[styles.chipText, receivedById === '' && styles.chipTextActive]}>—</Text>
          </TouchableOpacity>
          {employees.map(e => {
            const active = e.id === receivedById;
            return (
              <TouchableOpacity
                key={e.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setReceivedById(e.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{e.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Not</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          onChangeText={setNote}
          placeholder="Açıklama"
          placeholderTextColor={colors.text.faint}
          multiline
        />

        <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving}>
          <Ionicons name="save-outline" size={16} color="#fff" />
          <Text style={styles.saveBtnText}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: 4 },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginBottom: spacing.sm },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.md, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text.primary,
    fontSize: typography.sm,
  },
  noteInput: { minHeight: 70, textAlignVertical: 'top' },
  chips: { gap: 6, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  chipActive: { backgroundColor: brand.blueLight, borderColor: brand.blueLight },
  chipText: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  methodBtn: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
    gap: 6,
    alignItems: 'center',
  },
  methodBtnActive: { backgroundColor: brand.green, borderColor: brand.green },
  methodText: { color: colors.text.primary, fontWeight: '700', fontSize: typography.xs },
  methodTextActive: { color: '#fff' },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: brand.green,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});
