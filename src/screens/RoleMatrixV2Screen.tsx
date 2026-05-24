// RoleMatrixV2Screen — POZ-DEV-351 Rol × Kaynak × Eylem matrisi
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import {
  listPermissions, setPermission, resetPermissions,
  ROLES, ROLE_LABEL, ROLE_COLOR, RESOURCES, RESOURCE_LABEL, ACTIONS, ACTION_LABEL,
} from '../services/governance';
import type { Permission, UserRoleExt, PermissionResource, PermissionAction } from '../types';

export default function RoleMatrixV2Screen() {
  const [perms, setPerms] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRoleExt>('manager');

  const load = async () => {
    setLoading(true);
    setPerms(await listPermissions());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const isAllowed = (res: PermissionResource, act: PermissionAction): boolean => {
    const p = perms.find(x => x.role === role && x.resource === res && x.action === act);
    return p?.allowed ?? false;
  };

  const toggle = async (res: PermissionResource, act: PermissionAction) => {
    const current = isAllowed(res, act);
    await setPermission(role, res, act, !current);
    await load();
  };

  const doReset = () => {
    Alert.alert('Sıfırla', 'Tüm rol matrisi varsayılana dönecek. Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sıfırla', style: 'destructive', onPress: async () => { await resetPermissions(); await load(); } },
    ]);
  };

  if (loading) return <SafeAreaView style={s.safe}><View style={s.loading}><ActivityIndicator color="#8b5cf6" /></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.toolbar}>
        <Text style={s.toolbarT}>{perms.length} izin tanımı</Text>
        <TouchableOpacity style={s.resetBtn} onPress={doReset}>
          <Ionicons name="refresh-outline" size={16} color="#fff" />
          <Text style={s.resetTxt}>Sıfırla</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.roleBar} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}>
        {ROLES.map(r => (
          <TouchableOpacity key={r} onPress={() => setRole(r)} style={[s.roleChip, role === r && { backgroundColor: ROLE_COLOR[r] }]}>
            <Text style={[s.roleChipTxt, role === r && { color: '#fff' }]}>{ROLE_LABEL[r]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={[s.headerCell, { flex: 2 }]}>Kaynak</Text>
          {ACTIONS.map(a => (
            <Text key={a} style={[s.headerCell, { flex: 1, textAlign: 'center' }]}>{ACTION_LABEL[a]}</Text>
          ))}
        </View>
        {RESOURCES.map(res => (
          <View key={res} style={s.row}>
            <Text style={[s.cell, { flex: 2 }]}>{RESOURCE_LABEL[res]}</Text>
            {ACTIONS.map(act => {
              const ok = isAllowed(res, act);
              return (
                <TouchableOpacity key={act} onPress={() => toggle(res, act)} style={[s.cellBtn, { flex: 1 }]}>
                  <Ionicons name={ok ? 'checkmark-circle' : 'close-circle-outline'} size={22} color={ok ? '#22c55e' : '#64748b'} />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  toolbarT: { color: colors.text.muted, fontSize: typography.sm },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  resetTxt: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  roleBar: { maxHeight: 50, marginBottom: spacing.sm },
  roleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  roleChipTxt: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  content: { padding: spacing.md, gap: 4 },
  header: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.primary, marginBottom: 4 },
  headerCell: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, marginBottom: 2 },
  cell: { color: colors.text.primary, fontSize: typography.sm, paddingHorizontal: spacing.sm },
  cellBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
});
