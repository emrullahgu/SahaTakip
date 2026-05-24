// AiPermissionsScreen — Faz 41
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { AiPermission, AiUserRole } from '../types';
import { listPermissions, togglePermission, FEATURE_LABEL, ROLE_LABEL, ROLE_COLOR } from '../services/aiAssistant';

export default function AiPermissionsScreen() {
  const [items, setItems] = useState<AiPermission[]>([]);
  const [role, setRole] = useState<AiUserRole>('admin');
  const load = useCallback(async () => { setItems(await listPermissions()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const roles: AiUserRole[] = ['admin', 'manager', 'staff', 'sales'];
  const filtered = items.filter(i => i.role === role);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.tabs}>
        {roles.map(r => (
          <View key={r} style={[s.tab, role === r && { backgroundColor: ROLE_COLOR[r], borderColor: ROLE_COLOR[r] }]}>
            <Text style={[s.tabT, role === r && { color: '#fff' }]} onPress={() => setRole(r)}>{ROLE_LABEL[r]}</Text>
          </View>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.n}>{FEATURE_LABEL[item.feature]}</Text>
            <Switch value={item.enabled} onValueChange={async () => { await togglePermission(item.id); load(); }} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  tabs: { flexDirection: 'row', padding: spacing.sm, gap: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border.primary },
  tabT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
});
