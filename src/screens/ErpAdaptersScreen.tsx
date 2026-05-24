// ErpAdaptersScreen — POZ-DEV-104
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  ERP_PROVIDER_COLOR, ERP_PROVIDER_LABEL,
  deleteErpAdapter, listErpAdapters, makeErpAdapter, mockSyncErp, upsertErpAdapter,
} from '../services/integrations';
import { ErpAdapter, ErpProvider } from '../types';

const PROVIDERS: ErpProvider[] = ['logo', 'netsis', 'mikro', 'custom'];

function fmt(iso?: string): string { if (!iso) return '—'; try { return new Date(iso).toLocaleString('tr-TR'); } catch { return iso; } }

export default function ErpAdaptersScreen() {
  const [list, setList] = useState<ErpAdapter[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ErpAdapter | null>(null);
  const [fProvider, setFProvider] = useState<ErpProvider>('logo');
  const [fLabel, setFLabel] = useState('');
  const [fBaseUrl, setFBaseUrl] = useState('');
  const [fApiKey, setFApiKey] = useState('');
  const [fUsername, setFUsername] = useState('');
  const [fSyncCustomers, setFSyncCustomers] = useState(true);
  const [fSyncInvoices, setFSyncInvoices] = useState(true);
  const [fSyncProducts, setFSyncProducts] = useState(false);

  const refresh = useCallback(async () => { setList(await listErpAdapters()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const openNew = () => {
    setEditing(null);
    setFProvider('logo'); setFLabel(''); setFBaseUrl(''); setFApiKey(''); setFUsername('');
    setFSyncCustomers(true); setFSyncInvoices(true); setFSyncProducts(false);
    setShowForm(true);
  };
  const openEdit = (a: ErpAdapter) => {
    setEditing(a);
    setFProvider(a.provider); setFLabel(a.label); setFBaseUrl(a.baseUrl || ''); setFApiKey(a.apiKey || ''); setFUsername(a.username || '');
    setFSyncCustomers(a.syncCustomers); setFSyncInvoices(a.syncInvoices); setFSyncProducts(a.syncProducts);
    setShowForm(true);
  };

  const onSave = async () => {
    if (!fLabel.trim()) { Alert.alert('Eksik', 'Etiket gerekli.'); return; }
    const base = editing || makeErpAdapter({ provider: fProvider, label: fLabel.trim() });
    const next: ErpAdapter = {
      ...base,
      provider: fProvider,
      label: fLabel.trim(),
      baseUrl: fBaseUrl.trim() || undefined,
      apiKey: fApiKey.trim() || undefined,
      username: fUsername.trim() || undefined,
      syncCustomers: fSyncCustomers,
      syncInvoices: fSyncInvoices,
      syncProducts: fSyncProducts,
    };
    await upsertErpAdapter(next);
    setShowForm(false);
    await refresh();
  };

  const onDelete = (id: string) => {
    Alert.alert('Sil', 'Adaptör silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteErpAdapter(id); await refresh(); } },
    ]);
  };

  const onSync = async (id: string) => {
    await mockSyncErp(id);
    await refresh();
    Alert.alert('Senkronizasyon', 'Demo modda başarılı.');
  };

  const onToggle = async (a: ErpAdapter) => {
    await upsertErpAdapter({ ...a, active: !a.active });
    await refresh();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.heading}>ERP / CRM Adaptörleri ({list.length})</Text>
          <TouchableOpacity style={styles.newBtn} onPress={openNew}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.newBtnText}>Yeni</Text>
          </TouchableOpacity>
        </View>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={36} color={colors.text.faint} />
            <Text style={styles.emptyText}>Henüz adaptör yok.</Text>
          </View>
        ) : list.map(a => (
          <TouchableOpacity key={a.id} style={[styles.card, !a.active && { opacity: 0.55 }]} onPress={() => openEdit(a)}>
            <View style={styles.rowTop}>
              <View style={[styles.providerBadge, { backgroundColor: ERP_PROVIDER_COLOR[a.provider] }]}>
                <Text style={styles.providerBadgeText}>{ERP_PROVIDER_LABEL[a.provider]}</Text>
              </View>
              <Text style={styles.label}>{a.label}</Text>
              <View style={{ flex: 1 }} />
              <View style={[styles.statusDot, { backgroundColor: a.active ? '#22c55e' : '#64748b' }]} />
            </View>
            {a.baseUrl && <Text style={styles.urlText} numberOfLines={1}>{a.baseUrl}</Text>}
            <View style={styles.syncRow}>
              {a.syncCustomers && <SyncPill label="Müşteri" />}
              {a.syncInvoices && <SyncPill label="Fatura" />}
              {a.syncProducts && <SyncPill label="Ürün" />}
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Son sync: {fmt(a.lastSyncAt)}</Text>
              {a.lastSyncStatus && (
                <Text style={[styles.metaText, { color: a.lastSyncStatus === 'success' ? '#22c55e' : '#dc2626' }]}>
                  {a.lastSyncStatus === 'success' ? '✓' : '✗'}
                </Text>
              )}
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onSync(a.id)}>
                <Ionicons name="sync-outline" size={14} color="#0ea5e9" />
                <Text style={[styles.actionText, { color: '#0ea5e9' }]}>Senkronize Et</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onToggle(a)}>
                <Ionicons name={a.active ? 'pause-outline' : 'play-outline'} size={14} color="#f59e0b" />
                <Text style={[styles.actionText, { color: '#f59e0b' }]}>{a.active ? 'Durdur' : 'Başlat'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(a.id)}>
                <Ionicons name="trash-outline" size={14} color="#dc2626" />
                <Text style={[styles.actionText, { color: '#dc2626' }]}>Sil</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>{editing ? 'Adaptör Düzenle' : 'Yeni Adaptör'}</Text>
              <Text style={styles.fLabel}>Sağlayıcı</Text>
              <View style={styles.providerRow}>
                {PROVIDERS.map(p => {
                  const active = p === fProvider;
                  return (
                    <TouchableOpacity key={p} style={[styles.providerChip, active && { backgroundColor: ERP_PROVIDER_COLOR[p], borderColor: ERP_PROVIDER_COLOR[p] }]} onPress={() => setFProvider(p)}>
                      <Text style={[styles.providerChipText, active && { color: '#fff' }]}>{ERP_PROVIDER_LABEL[p]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.fLabel}>Etiket</Text>
              <TextInput style={styles.input} value={fLabel} onChangeText={setFLabel} placeholder="örn: Logo Ana Şirket" placeholderTextColor={colors.text.faint} />
              <Text style={styles.fLabel}>Base URL</Text>
              <TextInput style={styles.input} value={fBaseUrl} onChangeText={setFBaseUrl} placeholder="https://logo.example.com/api" placeholderTextColor={colors.text.faint} autoCapitalize="none" />
              <Text style={styles.fLabel}>API Key</Text>
              <TextInput style={styles.input} value={fApiKey} onChangeText={setFApiKey} placeholder="•••••••" placeholderTextColor={colors.text.faint} secureTextEntry autoCapitalize="none" />
              <Text style={styles.fLabel}>Kullanıcı Adı</Text>
              <TextInput style={styles.input} value={fUsername} onChangeText={setFUsername} placeholder="(opsiyonel)" placeholderTextColor={colors.text.faint} autoCapitalize="none" />
              <Text style={styles.fLabel}>Senkronize Edilecek</Text>
              <SwitchRow label="Müşteri kayıtları" value={fSyncCustomers} onChange={setFSyncCustomers} />
              <SwitchRow label="Fatura/Tahsilat" value={fSyncInvoices} onChange={setFSyncInvoices} />
              <SwitchRow label="Ürün/Stok" value={fSyncProducts} onChange={setFSyncProducts} />
              <View style={styles.modalRow}>
                <TouchableOpacity style={[styles.mBtn, styles.mBtnSec]} onPress={() => setShowForm(false)}>
                  <Text style={styles.mBtnSecText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mBtn, styles.mBtnPri]} onPress={onSave}>
                  <Text style={styles.mBtnPriText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (b: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} thumbColor={value ? '#fff' : '#94a3b8'} trackColor={{ true: brand.green, false: colors.border.primary }} />
    </View>
  );
}

function SyncPill({ label }: { label: string }) {
  return <View style={styles.syncPill}><Text style={styles.syncPillText}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  heading: { flex: 1, color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: brand.green, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginBottom: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  providerBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  providerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  label: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  urlText: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  syncRow: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  syncPill: { backgroundColor: 'rgba(34,197,94,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  syncPillText: { color: '#86efac', fontSize: 10, fontWeight: '700' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  metaText: { color: colors.text.faint, fontSize: 10 },
  actionsRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: colors.text.muted },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
  modal: { backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border.primary },
  modalTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: spacing.md },
  fLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 4, fontWeight: '700' },
  input: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8, color: colors.text.primary, fontSize: typography.sm },
  providerRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  providerChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.primary },
  providerChipText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  switchLabel: { color: colors.text.primary, fontSize: typography.sm },
  modalRow: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  mBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  mBtnPri: { backgroundColor: brand.green },
  mBtnPriText: { color: '#fff', fontWeight: '800' },
  mBtnSec: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  mBtnSecText: { color: colors.text.muted, fontWeight: '700' },
});
