// PaymentDetailScreen — POZ-DEV-079, 082
// Tahsilat detayı + PDF makbuz paylaşımı + e-Fatura kuyruğa al / gönder.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  getPayment,
  deletePayment,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABEL,
} from '../services/payments';
import { generateAndShareReceiptPdf } from '../services/receiptPdf';
import { queueFromPayment, submitRecord, listRecords, loadConfig } from '../services/eInvoice';
import { useAppContext } from '../context/AppContext';
import { Payment, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PaymentDetail'>;
type Rt = RouteProp<RootStackParamList, 'PaymentDetail'>;

function fmtMoney(n: number, c?: string): string {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c === 'TRY' || !c ? '₺' : c}`;
}
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR');
  } catch {
    return iso;
  }
}

export default function PaymentDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { paymentId } = route.params;
  const { customers } = useAppContext();
  const [p, setP] = useState<Payment | null>(null);
  const [working, setWorking] = useState(false);
  const [einvoiceStatus, setEinvoiceStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const x = await getPayment(paymentId);
    setP(x);
    const records = await listRecords();
    const existing = records.find(r => r.paymentId === paymentId);
    setEinvoiceStatus(existing ? existing.status : null);
  }, [paymentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!p) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>Yükleniyor…</Text>
      </SafeAreaView>
    );
  }

  const method = PAYMENT_METHODS.find(m => m.value === p.method);
  const customer = customers.find(c => c.id === p.customerId);

  const onShare = async () => {
    setWorking(true);
    try {
      await generateAndShareReceiptPdf(p);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('PDF', msg);
    } finally {
      setWorking(false);
    }
  };

  const onQueueEInvoice = async () => {
    setWorking(true);
    try {
      const rec = await queueFromPayment(p, customer?.taxNumber);
      setEinvoiceStatus(rec.status);
      Alert.alert('E-Fatura', 'Kuyruğa eklendi.');
    } finally {
      setWorking(false);
    }
  };

  const onSubmitEInvoice = async () => {
    setWorking(true);
    try {
      const cfg = await loadConfig();
      if (!cfg.enabled) {
        Alert.alert('E-Fatura', 'Önce E-Fatura ayarlarını etkinleştirin.');
        return;
      }
      const records = await listRecords();
      let rec = records.find(r => r.paymentId === p.id);
      if (!rec) {
        rec = await queueFromPayment(p, customer?.taxNumber);
      }
      const res = await submitRecord(rec);
      setEinvoiceStatus(res.status);
      Alert.alert(
        'E-Fatura',
        res.ok ? `Gönderildi (${res.status}).` : `Hata: ${res.message ?? 'Bilinmiyor'}`,
      );
    } finally {
      setWorking(false);
    }
  };

  const onDelete = () => {
    Alert.alert('Sil', 'Tahsilatı silmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deletePayment(p.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{p.receiptNo}</Text>
          <Text style={styles.totalValue}>{fmtMoney(p.amount, p.currency)}</Text>
          <Text style={styles.totalSub}>
            {PAYMENT_STATUS_LABEL[p.status]} · {method?.label ?? p.method}
          </Text>
        </View>

        <Row label="Müşteri" value={p.customerName} />
        <Row label="Tarih" value={fmtDate(p.receivedAt)} />
        {p.workOrderId ? <Row label="İş Emri" value={p.workOrderId} /> : null}
        {p.quoteId ? <Row label="Teklif" value={p.quoteId} /> : null}
        {p.receivedBy ? <Row label="Tahsilatçı" value={p.receivedBy} /> : null}
        {p.vatRate ? <Row label="KDV" value={`%${p.vatRate}`} /> : null}
        {p.note ? <Row label="Not" value={p.note} /> : null}
        {einvoiceStatus ? <Row label="E-Fatura" value={einvoiceStatus} /> : null}

        <TouchableOpacity style={[styles.btn, { backgroundColor: brand.blueLight }]} onPress={onShare} disabled={working}>
          <Ionicons name="share-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Makbuz PDF Paylaş</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#8b5cf6' }]}
          onPress={onQueueEInvoice}
          disabled={working}
        >
          <Ionicons name="receipt-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>E-Faturaya Kuyruğa Al</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#16a34a' }]}
          onPress={onSubmitEInvoice}
          disabled={working}
        >
          <Ionicons name="paper-plane-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>E-Faturayı Gönder</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary }]}
          onPress={() => navigation.navigate('PaymentForm', { paymentId: p.id })}
          disabled={working}
        >
          <Ionicons name="create-outline" size={16} color={colors.text.primary} />
          <Text style={[styles.btnText, { color: colors.text.primary }]}>Düzenle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { borderWidth: 1, borderColor: colors.rose.default, backgroundColor: 'transparent' }]}
          onPress={onDelete}
          disabled={working}
        >
          <Ionicons name="trash-outline" size={16} color={colors.rose.default} />
          <Text style={[styles.btnText, { color: colors.rose.default }]}>Sil</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loading: { color: colors.text.muted, padding: spacing.lg },
  content: { padding: spacing.lg, gap: 8, paddingBottom: 80 },
  totalCard: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: { color: colors.text.muted, fontSize: typography.xs },
  totalValue: { color: brand.green, fontWeight: '800', fontSize: 28, marginTop: 4 },
  totalSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  rowLabel: { color: colors.text.muted, fontSize: typography.xs },
  rowValue: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  btn: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
});
