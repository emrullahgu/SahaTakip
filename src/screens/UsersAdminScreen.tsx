// UsersAdminScreen — POZ-DEV-096..098 users with bulk + filter + role mgmt
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import SearchFilterBar, { FilterChip } from '../components/SearchFilterBar';
import BulkSelectionBar from '../components/BulkSelectionBar';
import {
  bulkUpdate, deleteUsers, listUsers, makeUser, ROLE_COLOR,
  ROLE_LABEL_TR, ROLE_ORDER, upsertUser,
} from '../services/users';
import { AppRole, AppUser } from '../types';

type RoleFilter = 'all' | AppRole;

function fmtDate(iso: string): string { try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return ''; } }

export default function UsersAdminScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const [users, setUsers] = useState<AppUser[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [showRolePicker, setShowRolePicker] = useState(false);

  // form state
  const [fName, setFName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fRole, setFRole] = useState<AppRole>('viewer');
  const [fActive, setFActive] = useState(true);

  const refresh = useCallback(async () => { setUsers(await listUsers()); }, []);
  useFocusEffect(useCallback(() => { refresh(); setSelected(new Set()); }, [refresh]));

  const chips = useMemo<FilterChip[]>(() => {
    const counts: Record<string, number> = { all: users.length };
    for (const r of ROLE_ORDER) counts[r] = users.filter(u => u.role === r).length;
    return [
      { key: 'all', label: 'Tümü', count: counts.all },
      ...ROLE_ORDER.map(r => ({ key: r, label: ROLE_LABEL_TR[r], count: counts[r] })),
    ];
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, query, roleFilter]);

  const toggle = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  };

  const openNew = () => {
    setEditing(null);
    setFName(''); setFEmail(''); setFRole('viewer'); setFActive(true);
    setShowForm(true);
  };

  const openEdit = (u: AppUser) => {
    setEditing(u);
    setFName(u.name); setFEmail(u.email); setFRole(u.role); setFActive(u.active);
    setShowForm(true);
  };

  const onSave = async () => {
    const n = fName.trim(); const e = fEmail.trim();
    if (!n || !e) { Alert.alert('Eksik', 'Ad ve e-posta zorunlu.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { Alert.alert('Hata', 'Geçerli e-posta girin.'); return; }
    const user: AppUser = editing
      ? { ...editing, name: n, email: e, role: fRole, active: fActive }
      : makeUser({ name: n, email: e, role: fRole, active: fActive });
    await upsertUser(user);
    setShowForm(false);
    await refresh();
  };

  const onBulk = async (key: string) => {
    const ids = Array.from(selected);
    if (key === 'delete') {
      Alert.alert('Toplu Sil', `${ids.length} kullanıcı silinsin mi?`, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: async () => {
          await deleteUsers(ids); setSelected(new Set()); await refresh();
        } },
      ]);
    } else if (key === 'activate' || key === 'deactivate') {
      await bulkUpdate(ids, { active: key === 'activate' });
      setSelected(new Set()); await refresh();
    } else if (key === 'changeRole') {
      setShowRolePicker(true);
    }
  };

  const applyRole = async (role: AppRole) => {
    await bulkUpdate(Array.from(selected), { role });
    setShowRolePicker(false); setSelected(new Set()); await refresh();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.heading}>Kullanıcılar ({filtered.length})</Text>
          <TouchableOpacity style={styles.newBtn} onPress={openNew}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.newBtnText}>Yeni</Text>
          </TouchableOpacity>
        </View>

        <SearchFilterBar
          value={query}
          onChange={setQuery}
          placeholder="Ad veya e-posta ara…"
          chips={chips}
          activeKey={roleFilter}
          onChipPress={k => setRoleFilter(k as RoleFilter)}
        />

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={36} color={colors.text.faint} />
              <Text style={styles.emptyText}>Kullanıcı bulunamadı.</Text>
            </View>
          ) : filtered.map(u => {
            const isSel = selected.has(u.id);
            return (
              <TouchableOpacity
                key={u.id}
                style={[styles.row, isSel && styles.rowSelected, wide && { paddingVertical: 14 }]}
                onPress={() => selected.size > 0 ? toggle(u.id) : openEdit(u)}
                onLongPress={() => toggle(u.id)}
              >
                <View style={[styles.checkbox, isSel && styles.checkboxActive]}>
                  {isSel && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <View style={[styles.avatar, { backgroundColor: ROLE_COLOR[u.role] }]}>
                  <Text style={styles.avatarText}>{u.name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, !u.active && { color: colors.text.faint, textDecorationLine: 'line-through' }]} numberOfLines={1}>{u.name}</Text>
                    {!u.active && <View style={styles.inactivePill}><Text style={styles.inactiveText}>Pasif</Text></View>}
                  </View>
                  <Text style={styles.email} numberOfLines={1}>{u.email}</Text>
                </View>
                <View style={[styles.rolePill, { backgroundColor: ROLE_COLOR[u.role] + '22', borderColor: ROLE_COLOR[u.role] }]}>
                  <Text style={[styles.roleText, { color: ROLE_COLOR[u.role] }]}>{ROLE_LABEL_TR[u.role]}</Text>
                </View>
                {wide && <Text style={styles.dateText}>{fmtDate(u.createdAt)}</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <BulkSelectionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onAction={onBulk}
        actions={[
          { key: 'activate', label: 'Aktifleştir', icon: 'checkmark-circle-outline', color: '#16a34a' },
          { key: 'deactivate', label: 'Pasifleştir', icon: 'pause-circle-outline', color: '#64748b' },
          { key: 'changeRole', label: 'Rol Değiştir', icon: 'shield-outline', color: '#8b5cf6' },
          { key: 'delete', label: 'Sil', icon: 'trash-outline', destructive: true },
        ]}
      />

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editing ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'}</Text>
            <Text style={styles.label}>Ad Soyad</Text>
            <TextInput style={styles.input} value={fName} onChangeText={setFName} placeholder="Adı Soyadı" placeholderTextColor={colors.text.faint} />
            <Text style={styles.label}>E-posta</Text>
            <TextInput style={styles.input} value={fEmail} onChangeText={setFEmail} placeholder="ornek@firma.com" placeholderTextColor={colors.text.faint} autoCapitalize="none" keyboardType="email-address" />
            <Text style={styles.label}>Rol</Text>
            <View style={styles.roleGrid}>
              {ROLE_ORDER.map(r => (
                <TouchableOpacity key={r} style={[styles.roleChip, fRole === r && { backgroundColor: ROLE_COLOR[r], borderColor: ROLE_COLOR[r] }]} onPress={() => setFRole(r)}>
                  <Text style={[styles.roleChipText, fRole === r && { color: '#fff' }]}>{ROLE_LABEL_TR[r]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.activeRow} onPress={() => setFActive(!fActive)}>
              <View style={[styles.checkbox, fActive && styles.checkboxActive]}>
                {fActive && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={styles.activeText}>Aktif</Text>
            </TouchableOpacity>
            <View style={styles.modalRow}>
              <TouchableOpacity style={[styles.mBtn, styles.mBtnSec]} onPress={() => setShowForm(false)}>
                <Text style={styles.mBtnSecText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mBtn, styles.mBtnPri]} onPress={onSave}>
                <Text style={styles.mBtnPriText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Role picker for bulk */}
      <Modal visible={showRolePicker} animationType="fade" transparent onRequestClose={() => setShowRolePicker(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Toplu Rol Atama ({selected.size})</Text>
            <View style={styles.roleGrid}>
              {ROLE_ORDER.map(r => (
                <TouchableOpacity key={r} style={[styles.roleChip, { borderColor: ROLE_COLOR[r] }]} onPress={() => applyRole(r)}>
                  <Text style={[styles.roleChipText, { color: ROLE_COLOR[r] }]}>{ROLE_LABEL_TR[r]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.mBtn, styles.mBtnSec, { marginTop: spacing.md }]} onPress={() => setShowRolePicker(false)}>
              <Text style={styles.mBtnSecText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { flex: 1, padding: spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  heading: { flex: 1, color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: brand.green, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginBottom: 6 },
  rowSelected: { borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)' },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: colors.border.secondary, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, flexShrink: 1 },
  inactivePill: { backgroundColor: 'rgba(100,116,139,0.2)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  inactiveText: { color: colors.text.muted, fontSize: 9, fontWeight: '700' },
  email: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  roleText: { fontSize: 10, fontWeight: '800' },
  dateText: { color: colors.text.faint, fontSize: 11, marginLeft: 6 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: colors.text.muted },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border.primary },
  modalTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: spacing.md },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 4, fontWeight: '700' },
  input: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8, color: colors.text.primary, fontSize: typography.sm },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  roleChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.primary },
  roleChipText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md },
  activeText: { color: colors.text.primary, fontSize: typography.sm },
  modalRow: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  mBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  mBtnPri: { backgroundColor: brand.green },
  mBtnPriText: { color: '#fff', fontWeight: '800' },
  mBtnSec: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  mBtnSecText: { color: colors.text.muted, fontWeight: '700' },
});
