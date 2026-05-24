// AccessRulesScreen — POZ-DEV-108 IP/Cihaz kısıtlama
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { deleteAccessRule, listAccessRules, makeAccessRule, upsertAccessRule, validateIpRule } from '../services/security';
import { AccessRule, AccessRuleKind } from '../types';

function fmt(iso: string): string { try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return iso; } }

export default function AccessRulesScreen() {
  const [list, setList] = useState<AccessRule[]>([]);
  const [filter, setFilter] = useState<AccessRuleKind | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AccessRule | null>(null);
  const [fKind, setFKind] = useState<AccessRuleKind>('ip');
  const [fValue, setFValue] = useState('');
  const [fLabel, setFLabel] = useState('');

  const refresh = useCallback(async () => { setList(await listAccessRules()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = useMemo(() => filter === 'all' ? list : list.filter(r => r.kind === filter), [list, filter]);

  const openNew = () => { setEditing(null); setFKind('ip'); setFValue(''); setFLabel(''); setShowForm(true); };
  const openEdit = (r: AccessRule) => { setEditing(r); setFKind(r.kind); setFValue(r.value); setFLabel(r.label || ''); setShowForm(true); };

  const onSave = async () => {
    if (!fValue.trim()) { Alert.alert('Eksik', 'Değer gerekli.'); return; }
    if (fKind === 'ip' && !validateIpRule(fValue.trim())) {
      Alert.alert('Geçersiz', "IP biçimi hatalı. Örn: 1.2.3.4, 10.0.0.0/24, * veya any.");
      return;
    }
    const next: AccessRule = editing
      ? { ...editing, kind: fKind, value: fValue.trim(), label: fLabel.trim() || undefined }
      : makeAccessRule({ kind: fKind, value: fValue.trim(), label: fLabel.trim() || undefined });
    await upsertAccessRule(next);
    setShowForm(false);
    await refresh();
  };

  const onToggle = async (r: AccessRule) => { await upsertAccessRule({ ...r, active: !r.active }); await refresh(); };
  const onDelete = (id: string) => {
    Alert.alert('Sil', 'Kural silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteAccessRule(id); await refresh(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.heading}>Erişim Kuralları ({filtered.length})</Text>
          <TouchableOpacity style={styles.newBtn} onPress={openNew}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.newBtnText}>Yeni</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          {(['all', 'ip', 'device'] as const).map(f => {
            const active = filter === f;
            return (
              <TouchableOpacity key={f} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setFilter(f)}>
                <Ionicons name={f === 'all' ? 'apps-outline' : f === 'ip' ? 'globe-outline' : 'phone-portrait-outline'} size={12} color={active ? '#fff' : colors.text.muted} />
                <Text style={[styles.filterChipText, active && { color: '#fff' }]}>{f === 'all' ? 'Tümü' : f === 'ip' ? 'IP' : 'Cihaz'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color="#8b5cf6" />
          <Text style={styles.infoText}>
            Etkin kurallara uyan istekler kabul edilir. Kural yoksa erişim sınırlandırılmaz. `*` veya `any` herhangi bir IP'ye izin verir.
          </Text>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="key-outline" size={36} color={colors.text.faint} />
            <Text style={styles.emptyText}>Kural yok.</Text>
          </View>
        ) : filtered.map(r => (
          <TouchableOpacity key={r.id} style={[styles.card, !r.active && { opacity: 0.55 }]} onPress={() => openEdit(r)}>
            <View style={styles.rowTop}>
              <View style={[styles.kindBadge, { backgroundColor: r.kind === 'ip' ? '#0ea5e9' : '#8b5cf6' }]}>
                <Ionicons name={r.kind === 'ip' ? 'globe-outline' : 'phone-portrait-outline'} size={12} color="#fff" />
                <Text style={styles.kindText}>{r.kind === 'ip' ? 'IP' : 'CİHAZ'}</Text>
              </View>
              <Text style={styles.valueText} numberOfLines={1}>{r.value}</Text>
              <Switch value={r.active} onValueChange={() => onToggle(r)} thumbColor={r.active ? '#fff' : '#94a3b8'} trackColor={{ true: brand.green, false: colors.border.primary }} />
            </View>
            {r.label && <Text style={styles.label}>{r.label}</Text>}
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Oluşturuldu: {fmt(r.createdAt)}</Text>
              <TouchableOpacity onPress={() => onDelete(r.id)}>
                <Ionicons name="trash-outline" size={14} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>{editing ? 'Kuralı Düzenle' : 'Yeni Kural'}</Text>
              <Text style={styles.fLabel}>Tür</Text>
              <View style={styles.segRow}>
                {(['ip', 'device'] as const).map(k => {
                  const active = k === fKind;
                  return (
                    <TouchableOpacity key={k} style={[styles.segChip, active && { backgroundColor: k === 'ip' ? '#0ea5e9' : '#8b5cf6', borderColor: k === 'ip' ? '#0ea5e9' : '#8b5cf6' }]} onPress={() => setFKind(k)}>
                      <Text style={[styles.segChipText, active && { color: '#fff' }]}>{k === 'ip' ? 'IP Adresi' : 'Cihaz Kimliği'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.fLabel}>Değer</Text>
              <TextInput
                style={[styles.input, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}
                value={fValue} onChangeText={setFValue}
                placeholder={fKind === 'ip' ? '10.0.0.0/24 veya 1.2.3.4' : 'device-id-...'}
                placeholderTextColor={colors.text.faint}
                autoCapitalize="none"
              />
              <Text style={styles.fLabel}>Etiket (opsiyonel)</Text>
              <TextInput style={styles.input} value={fLabel} onChangeText={setFLabel} placeholder="örn: Ofis ağı" placeholderTextColor={colors.text.faint} />
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  heading: { flex: 1, color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: brand.green, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.md },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  filterChipActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  filterChipText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  infoBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', padding: spacing.sm, backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', marginBottom: spacing.md },
  infoText: { flex: 1, color: '#c4b5fd', fontSize: 11, lineHeight: 15 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginBottom: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kindBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  kindText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  valueText: { flex: 1, color: colors.text.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: typography.xs, fontWeight: '700' },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  metaText: { color: colors.text.faint, fontSize: 10 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: colors.text.muted },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
  modal: { backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border.primary },
  modalTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: spacing.md },
  fLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 4, fontWeight: '700' },
  input: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8, color: colors.text.primary, fontSize: typography.sm },
  segRow: { flexDirection: 'row', gap: 6 },
  segChip: { flex: 1, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.primary, alignItems: 'center' },
  segChipText: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  modalRow: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  mBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  mBtnPri: { backgroundColor: brand.green },
  mBtnPriText: { color: '#fff', fontWeight: '800' },
  mBtnSec: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  mBtnSecText: { color: colors.text.muted, fontWeight: '700' },
});
