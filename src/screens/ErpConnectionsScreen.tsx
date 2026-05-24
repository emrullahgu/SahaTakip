// ErpConnectionsScreen — POZ-DEV-454
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, ErpConnection } from '../types';
import { colors, spacing, radius, typography } from '../theme';
import {
  listConnections, deleteConnection, testConnection,
  ERP_VENDOR_LABEL, ERP_VENDOR_COLOR, STATUS_LABEL, STATUS_COLOR,
} from '../services/enterpriseIntegrations';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ErpConnectionsScreen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<ErpConnection[]>([]);
  const load = useCallback(async () => { setItems(await listConnections()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const test = async (id: string) => {
    const r = await testConnection(id);
    Alert.alert('Test Sonucu', STATUS_LABEL[r]);
    load();
  };
  const remove = (id: string) => Alert.alert('Sil', 'Bağlantıyı silmek istiyor musun?', [
    { text: 'Vazgeç' }, { text: 'Sil', style: 'destructive', onPress: async () => { await deleteConnection(id); load(); } },
  ]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => nav.navigate('ErpConnectionForm', { connectionId: item.id })} onLongPress={() => remove(item.id)} style={s.card}>
            <View style={s.row}>
              <View style={[s.badge, { backgroundColor: ERP_VENDOR_COLOR[item.vendor] }]}>
                <Text style={s.badgeT}>{ERP_VENDOR_LABEL[item.vendor]}</Text>
              </View>
              <Text style={s.name}>{item.name}</Text>
              <View style={[s.st, { borderColor: STATUS_COLOR[item.status] }]}>
                <Text style={[s.stT, { color: STATUS_COLOR[item.status] }]}>{STATUS_LABEL[item.status]}</Text>
              </View>
            </View>
            {item.baseUrl ? <Text style={s.sub} numberOfLines={1}>{item.baseUrl}</Text> : null}
            {item.lastError ? <Text style={[s.sub, { color: '#ef4444' }]}>{item.lastError}</Text> : null}
            <View style={s.act}>
              <TouchableOpacity onPress={() => test(item.id)} style={[s.btn, { backgroundColor: '#0ea5e9' }]}>
                <Ionicons name="pulse-outline" size={14} color="#fff" />
                <Text style={s.btnT}>Test</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => nav.navigate('ErpConnectionForm')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  name: { flex: 1, color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  st: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  stT: { fontSize: 10, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  act: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  btnT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
});
