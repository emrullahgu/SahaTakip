// IntegrationWebhooksScreen — POZ-DEV-462
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, IntegrationWebhook } from '../types';
import { listWebhooksV2, deleteWebhookV2, toggleWebhookV2, triggerWebhookV2 } from '../services/enterpriseIntegrations';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function IntegrationWebhooksScreen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<IntegrationWebhook[]>([]);
  const load = useCallback(async () => { setItems(await listWebhooksV2()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = (id: string) => Alert.alert('Sil', 'Silinsin mi?', [
    { text: 'Vazgeç' }, { text: 'Sil', style: 'destructive', onPress: async () => { await deleteWebhookV2(id); load(); } },
  ]);
  const test = async (id: string) => {
    const ok = await triggerWebhookV2(id);
    Alert.alert('Test', ok ? 'Başarılı' : 'Başarısız');
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={s.empty}>Webhook yok. + ile ekle.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => nav.navigate('IntegrationWebhookForm', { webhookId: item.id })} onLongPress={() => remove(item.id)} style={s.card}>
            <View style={s.row}>
              <Ionicons name="flash-outline" size={20} color="#eab308" />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{item.name}</Text>
                <Text style={s.sub} numberOfLines={1}>{item.event} · {item.url}</Text>
              </View>
              <Switch value={item.isActive} onValueChange={async () => { await toggleWebhookV2(item.id); load(); }} />
            </View>
            <View style={s.foot}>
              <Text style={s.sub}>Başarısız: {item.failureCount}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity onPress={() => test(item.id)} style={[s.btn, { backgroundColor: '#0ea5e9' }]}>
                  <Ionicons name="play-outline" size={12} color="#fff" />
                  <Text style={s.btnT}>Test</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => nav.navigate('IntegrationWebhookDeliveries', { webhookId: item.id })} style={[s.btn, { backgroundColor: '#64748b' }]}>
                  <Ionicons name="list-outline" size={12} color="#fff" />
                  <Text style={s.btnT}>Geçmiş</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => nav.navigate('IntegrationWebhookForm', {})}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  btnT: { color: '#fff', fontSize: 10, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#eab308', alignItems: 'center', justifyContent: 'center' },
});
