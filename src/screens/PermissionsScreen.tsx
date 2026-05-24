// PermissionsScreen — POZ-DEV-356 Ekran/aksiyon bazlı detaylı izin listesi (rol başına)
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listPermissions, setPermission, ROLES, ROLE_LABEL, ROLE_COLOR, RESOURCE_LABEL, ACTION_LABEL } from '../services/governance';
import type { Permission, UserRoleExt, RootStackParamList } from '../types';

type R = RouteProp<RootStackParamList, 'PermissionsScreen'>;

export default function PermissionsScreen() {
  const route = useRoute<R>();
  const [role, setRole] = useState<UserRoleExt>(route.params?.role || 'manager');
  const [perms, setPerms] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => { setLoading(true); setPerms(await listPermissions()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => perms.filter(p => p.role === role), [perms, role]);
  const allowedCount = filtered.filter(p => p.allowed).length;

  const toggle = async (p: Permission) => {
    await setPermission(p.role, p.resource, p.action, !p.allowed);
    await load();
  };

  if (loading) return <SafeAreaView style={s.safe}><View style={s.loading}><ActivityIndicator color="#a855f7" /></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.roleBar} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}>
        {ROLES.map(r => (
          <TouchableOpacity key={r} onPress={() => setRole(r)} style={[s.roleChip, role === r && { backgroundColor: ROLE_COLOR[r] }]}>
            <Text style={[s.roleChipTxt, role === r && { color: '#fff' }]}>{ROLE_LABEL[r]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.summary}>
        <Text style={s.summaryT}>{ROLE_LABEL[role]} · {allowedCount}/{filtered.length} izin aktif</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 6 }}>
        {filtered.map(p => (
          <TouchableOpacity key={p.id} style={s.row} onPress={() => toggle(p)}>
            <Ionicons name={p.allowed ? 'checkmark-circle' : 'close-circle-outline'} size={22} color={p.allowed ? '#22c55e' : '#64748b'} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.t}>{RESOURCE_LABEL[p.resource]} · {ACTION_LABEL[p.action]}</Text>
              <Text style={s.sub}>{p.resource} / {p.action}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  roleBar: { maxHeight: 50, marginTop: spacing.sm },
  roleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  roleChipTxt: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  summary: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  summaryT: { color: colors.text.muted, fontSize: typography.sm },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.faint, fontSize: typography.xs, marginTop: 2 },
});
