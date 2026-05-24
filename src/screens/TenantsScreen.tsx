// TenantsScreen — Faz 40
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, Tenant } from '../types';
import { colors, spacing, radius, typography } from '../theme';
import { listTenants, setCurrentTenant, deleteTenant, PLAN_LABEL, PLAN_COLOR, TENANT_STATUS_LABEL, TENANT_STATUS_COLOR } from '../services/platform';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function TenantsScreen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<Tenant[]>([]);
  const load = useCallback(async () => { setItems(await listTenants()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = (id: string) => Alert.alert('Sil', 'Firma silinsin mi?', [
    { text: 'Vazgeç' }, { text: 'Sil', style: 'destructive', onPress: async () => { await deleteTenant(id); load(); } },
  ]);
  const select = async (id: string) => { await setCurrentTenant(id); load(); };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => select(item.id)} onLongPress={() => remove(item.id)} style={[s.card, item.isCurrent && { borderColor: '#22c55e', borderWidth: 2 }]}>
            <View style={s.row}>
              <Ionicons name="business-outline" size={20} color={PLAN_COLOR[item.plan]} />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{item.name}</Text>
                <Text style={s.sub}>{item.memberCount} üye · {item.storageMb} MB</Text>
              </View>
              {item.isCurrent && <Ionicons name="checkmark-circle" size={20} color="#22c55e" />}
            </View>
            <View style={s.tags}>
              <View style={[s.t, { backgroundColor: PLAN_COLOR[item.plan] }]}>
                <Text style={s.tT}>{PLAN_LABEL[item.plan]}</Text>
              </View>
              <View style={[s.t, { borderWidth: 1, borderColor: TENANT_STATUS_COLOR[item.status], backgroundColor: 'transparent' }]}>
                <Text style={[s.tT, { color: TENANT_STATUS_COLOR[item.status] }]}>{TENANT_STATUS_LABEL[item.status]}</Text>
              </View>
              <TouchableOpacity onPress={() => nav.navigate('TenantMembers', { tenantId: item.id })} style={[s.t, { backgroundColor: '#64748b' }]}>
                <Text style={s.tT}>Üyeler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => nav.navigate('TenantSettings', { tenantId: item.id })} style={[s.t, { backgroundColor: '#0ea5e9' }]}>
                <Text style={s.tT}>Ayarlar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => nav.navigate('TenantForm', {})}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  t: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  tT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
});
