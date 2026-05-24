// EInvoiceScreen — POZ-DEV-082
// E-Fatura sağlayıcı ayarları + kuyruktaki kayıtların listesi + tekil gönder.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  loadConfig,
  saveConfig,
  listRecords,
  submitRecord,
  deleteRecord,
  E_INVOICE_PROVIDERS,
  E_INVOICE_STATUS_LABEL,
} from '../services/eInvoice';
import { EInvoiceConfig, EInvoiceProvider, EInvoiceRecord, EInvoiceStatus } from '../types';

const STATUS_COLOR: Record<EInvoiceStatus, string> = {
  draft: colors.text.muted,
  queued: '#f59e0b',
  sent: '#0ea5e9',
  accepted: brand.green,
  rejected: colors.rose.default,
  error: colors.rose.default,
};

function fmtMoney(n: number): string {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleString('tr-TR'); } catch { return iso; }
}

export default function EInvoiceScreen() {
  const [config, setConfig] = useState<EInvoiceConfig | null>(null);
  const [records, setRecords] = useState<EInvoiceRecord[]>([]);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    const [cfg, recs] = await Promise.all([loadConfig(), listRecords()]);
    setConfig(cfg);
    setRecords(recs);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onSaveConfig = async () => {
    if (!config) return;
    await saveConfig(config);
    Alert.alert('Ayarlar', 'Kaydedildi.');
  };

  const onSubmit = async (rec: EInvoiceRecord) => {
    setWorking(true);
    try {
      const res = await submitRecord(rec);
      Alert.alert('E-Fatura', res.ok ? `Gönderildi: ${res.status}` : `Hata: ${res.message}`);
      await refresh();
    } finally {
      setWorking(false);
    }
  };

  const onDelete = (rec: EInvoiceRecord) => {
    Alert.alert('Sil', 'Kuyruktan kaldırılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteRecord(rec.id);
          await refresh();
        },
      },
    ]);
  };

  if (!config) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>Yükleniyor…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>E-Fatura Ayarları</Text>
        <Text style={styles.sub}>Logo / Mikro / Nilvera vb. sağlayıcı bağlantısı</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Etkin</Text>
          <Switch
            value={config.enabled}
            onValueChange={v => setConfig({ ...config, enabled: v })}
            trackColor={{ false: colors.border.primary, true: brand.green }}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Test Modu</Text>
          <Switch
            value={!!config.testMode}
            onValueChange={v => setConfig({ ...config, testMode: v })}
            trackColor={{ false: colors.border.primary, true: brand.blueLight }}
          />
        </View>

        <Text style={styles.label}>Sağlayıcı</Text>
        <View style={styles.providerGrid}>
          {E_INVOICE_PROVIDERS.map(pr => {
            const active = pr.value === config.provider;
            return (
              <TouchableOpacity
                key={pr.value}
                style={[styles.provider, active && styles.providerActive]}
                onPress={() => setConfig({ ...config, provider: pr.value as EInvoiceProvider })}
              >
                <Text style={[styles.providerText, active && styles.providerTextActive]}>
                  {pr.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Field label="API URL" value={config.apiUrl ?? ''} onChange={v => setConfig({ ...config, apiUrl: v })} />
        <Field label="Kullanıcı" value={config.username ?? ''} onChange={v => setConfig({ ...config, username: v })} />
        <Field label="VKN/TCKN" value={config.vknTckn ?? ''} onChange={v => setConfig({ ...config, vknTckn: v })} />
        <Field label="Firma Unvan" value={config.companyTitle ?? ''} onChange={v => setConfig({ ...config, companyTitle: v })} />
        <Field label="Seri Önek" value={config.prefix ?? ''} onChange={v => setConfig({ ...config, prefix: v })} />

        <TouchableOpacity style={styles.saveBtn} onPress={onSaveConfig}>
          <Ionicons name="save-outline" size={16} color="#fff" />
          <Text style={styles.saveBtnText}>Ayarları Kaydet</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { marginTop: spacing.lg }]}>Kuyruk ({records.length})</Text>
        {records.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>Kuyrukta kayıt yok.</Text>
          </View>
        ) : (
          records.map(r => (
            <View key={r.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{r.customerName}</Text>
                <Text style={styles.cardSub}>{fmtMoney(r.total)} · {fmtDate(r.createdAt)}</Text>
                {r.errorMessage ? (
                  <Text style={styles.error} numberOfLines={2}>{r.errorMessage}</Text>
                ) : null}
                {r.externalId ? (
                  <Text style={styles.cardSub}>Ext: {r.externalId}</Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={[styles.status, { color: STATUS_COLOR[r.status] }]}>
                  {E_INVOICE_STATUS_LABEL[r.status]}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => onSubmit(r)}
                    disabled={working}
                  >
                    <Ionicons name="paper-plane-outline" size={12} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: colors.rose.default }]}
                    onPress={() => onDelete(r)}
                  >
                    <Ionicons name="trash-outline" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ marginTop: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={label}
        placeholderTextColor={colors.text.faint}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loading: { color: colors.text.muted, padding: spacing.lg },
  content: { padding: spacing.lg, paddingBottom: 80 },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: spacing.sm,
  },
  rowLabel: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 4 },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  provider: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  providerActive: { backgroundColor: brand.blueLight, borderColor: brand.blueLight },
  providerText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  providerTextActive: { color: '#fff' },
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
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: brand.green,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: 8,
  },
  cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  cardSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  status: { fontSize: typography.xs, fontWeight: '800' },
  error: { color: colors.rose.default, fontSize: 10, marginTop: 4 },
  smallBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
