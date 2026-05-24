// ApiKeysScreen — POZ-DEV-101
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { createApiKey, deleteApiKey, listApiKeys, revokeApiKey, SCOPE_LABEL_TR } from '../services/integrations';
import { ApiKey, ApiKeyScope } from '../types';

const SCOPES: ApiKeyScope[] = ['read', 'write', 'admin'];

function fmt(iso?: string): string { if (!iso) return '—'; try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return iso; } }
function maskKey(k: string): string { return k.slice(0, 12) + '••••••••' + k.slice(-4); }

export default function ApiKeysScreen() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);
  const [fLabel, setFLabel] = useState('');
  const [fScopes, setFScopes] = useState<ApiKeyScope[]>(['read']);

  const refresh = useCallback(async () => { setKeys(await listApiKeys()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const toggleScope = (s: ApiKeyScope) => {
    setFScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const onCreate = async () => {
    if (!fLabel.trim() || fScopes.length === 0) { Alert.alert('Eksik', 'Etiket ve en az 1 yetki gerekli.'); return; }
    const k = await createApiKey({ label: fLabel.trim(), scopes: fScopes });
    setShowForm(false);
    setFLabel(''); setFScopes(['read']);
    setCreatedKey(k);
    await refresh();
  };

  const onRevoke = (id: string) => {
    Alert.alert('Devre Dışı Bırak', 'Bu anahtar artık API isteklerini kabul etmeyecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Devre Dışı Bırak', onPress: async () => { await revokeApiKey(id); await refresh(); } },
    ]);
  };

  const onDelete = (id: string) => {
    Alert.alert('Sil', 'Kalıcı silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteApiKey(id); await refresh(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.heading}>API Anahtarları ({keys.length})</Text>
          <TouchableOpacity style={styles.newBtn} onPress={() => setShowForm(true)}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.newBtnText}>Yeni</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color="#0ea5e9" />
          <Text style={styles.infoText}>
            API anahtarları Supabase Edge Functions üzerinden REST erişimi sağlar. Anahtarınızı bir kez kopyalayın; tekrar gösterilmez.
          </Text>
        </View>

        {keys.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="key-outline" size={36} color={colors.text.faint} />
            <Text style={styles.emptyText}>Henüz API anahtarı yok.</Text>
          </View>
        ) : keys.map(k => (
          <View key={k.id} style={[styles.card, !k.active && { opacity: 0.55 }]}>
            <View style={styles.rowTop}>
              <Text style={styles.label}>{k.label}</Text>
              {!k.active && <View style={styles.revokedPill}><Text style={styles.revokedText}>İptal Edilmiş</Text></View>}
            </View>
            <View style={styles.keyRow}>
              <Text style={styles.keyText} selectable>{show[k.id] ? k.key : maskKey(k.key)}</Text>
              <TouchableOpacity onPress={() => setShow(s => ({ ...s, [k.id]: !s[k.id] }))}>
                <Ionicons name={show[k.id] ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.scopeRow}>
              {k.scopes.map(s => (
                <View key={s} style={styles.scopePill}><Text style={styles.scopeText}>{SCOPE_LABEL_TR[s]}</Text></View>
              ))}
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Oluşturma: {fmt(k.createdAt)}</Text>
              <Text style={styles.metaText}>Son kullanım: {fmt(k.lastUsedAt)}</Text>
            </View>
            <View style={styles.actionsRow}>
              {k.active && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => onRevoke(k.id)}>
                  <Ionicons name="ban-outline" size={14} color="#f59e0b" />
                  <Text style={[styles.actionText, { color: '#f59e0b' }]}>Devre Dışı</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(k.id)}>
                <Ionicons name="trash-outline" size={14} color="#dc2626" />
                <Text style={[styles.actionText, { color: '#dc2626' }]}>Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Yeni API Anahtarı</Text>
            <Text style={styles.fLabel}>Etiket</Text>
            <TextInput style={styles.input} value={fLabel} onChangeText={setFLabel} placeholder="örn: Logo entegrasyon" placeholderTextColor={colors.text.faint} />
            <Text style={styles.fLabel}>Yetkiler</Text>
            <View style={styles.scopePicker}>
              {SCOPES.map(s => {
                const active = fScopes.includes(s);
                return (
                  <TouchableOpacity key={s} style={[styles.scopeChip, active && styles.scopeChipActive]} onPress={() => toggleScope(s)}>
                    <Text style={[styles.scopeChipText, active && { color: '#fff' }]}>{SCOPE_LABEL_TR[s]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.modalRow}>
              <TouchableOpacity style={[styles.mBtn, styles.mBtnSec]} onPress={() => setShowForm(false)}>
                <Text style={styles.mBtnSecText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mBtn, styles.mBtnPri]} onPress={onCreate}>
                <Text style={styles.mBtnPriText}>Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!createdKey} animationType="fade" transparent onRequestClose={() => setCreatedKey(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <View style={styles.warnBox}>
              <Ionicons name="warning-outline" size={18} color="#f59e0b" />
              <Text style={styles.warnText}>
                Bu anahtar yalnızca şimdi görüntülenecek. Şimdi kopyalayın, kapattıktan sonra tekrar gösterilmeyecek.
              </Text>
            </View>
            <Text style={styles.fLabel}>{createdKey?.label}</Text>
            <View style={styles.fullKeyBox}>
              <Text style={styles.fullKeyText} selectable>{createdKey?.key}</Text>
            </View>
            {Platform.OS === 'web' && createdKey && (
              <TouchableOpacity
                style={[styles.mBtn, { backgroundColor: '#0ea5e9', marginTop: spacing.sm }]}
                onPress={() => { try { navigator.clipboard?.writeText(createdKey.key); Alert.alert('Kopyalandı', 'Anahtar panoya alındı.'); } catch {} }}
              >
                <Text style={styles.mBtnPriText}>Panoya Kopyala</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.mBtn, styles.mBtnPri, { marginTop: spacing.md }]} onPress={() => setCreatedKey(null)}>
              <Text style={styles.mBtnPriText}>Anladım</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  heading: { flex: 1, color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: brand.green, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  infoBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', padding: spacing.sm, backgroundColor: 'rgba(14,165,233,0.08)', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(14,165,233,0.25)', marginBottom: spacing.md },
  infoText: { flex: 1, color: '#7dd3fc', fontSize: 11, lineHeight: 15 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginBottom: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  revokedPill: { backgroundColor: 'rgba(245,158,11,0.18)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  revokedText: { color: '#f59e0b', fontSize: 10, fontWeight: '700' },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 8, backgroundColor: colors.bg.primary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  keyText: { flex: 1, color: colors.text.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11 },
  scopeRow: { flexDirection: 'row', gap: 4, marginTop: 8, flexWrap: 'wrap' },
  scopePill: { backgroundColor: 'rgba(14,165,233,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  scopeText: { color: '#0ea5e9', fontSize: 10, fontWeight: '700' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  metaText: { color: colors.text.faint, fontSize: 10 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: colors.text.muted },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border.primary },
  modalTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: spacing.md },
  fLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 4, fontWeight: '700' },
  input: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8, color: colors.text.primary, fontSize: typography.sm },
  scopePicker: { flexDirection: 'row', gap: 6, marginTop: 4 },
  scopeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.primary },
  scopeChipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  scopeChipText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  warnBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: spacing.sm, backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: radius.sm, borderWidth: 1, borderColor: '#f59e0b', marginBottom: spacing.md },
  warnText: { flex: 1, color: '#fbbf24', fontSize: 11, lineHeight: 16 },
  fullKeyBox: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, padding: spacing.sm },
  fullKeyText: { color: colors.text.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
  modalRow: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  mBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  mBtnPri: { backgroundColor: brand.green },
  mBtnPriText: { color: '#fff', fontWeight: '800' },
  mBtnSec: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  mBtnSecText: { color: colors.text.muted, fontWeight: '700' },
});
