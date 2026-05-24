// TenantSettingsScreen — Faz 40
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, TenantSetting } from '../types';
import { listSettings, updateSetting } from '../services/platform';

type R = RouteProp<RootStackParamList, 'TenantSettings'>;

const LABELS: Record<string, string> = {
  currency: 'Para Birimi', timezone: 'Zaman Dilimi', language: 'Dil', invoice_prefix: 'Fatura Öneki', allow_offline_login: 'Çevrimdışı Giriş',
};

export default function TenantSettingsScreen() {
  const r = useRoute<R>();
  const tenantId = r.params?.tenantId || 't1';
  const [items, setItems] = useState<TenantSetting[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const list = await listSettings(tenantId);
    setItems(list);
    setEdits(Object.fromEntries(list.map(i => [i.id, i.value])));
  }, [tenantId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async (id: string) => {
    await updateSetting(id, edits[id] || '');
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 8 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.l}>{LABELS[item.key] || item.key}</Text>
            <View style={s.row}>
              <TextInput value={edits[item.id] ?? item.value} onChangeText={t => setEdits(e => ({ ...e, [item.id]: t }))} style={s.input} placeholderTextColor={colors.text.faint} />
              <TouchableOpacity onPress={() => save(item.id)} style={s.btn}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={s.sub}>Son: {new Date(item.updatedAt).toLocaleString('tr-TR')}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  l: { color: colors.text.muted, fontSize: typography.xs, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  input: { flex: 1, backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  btn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  sub: { color: colors.text.muted, fontSize: 10, marginTop: 4 },
});
