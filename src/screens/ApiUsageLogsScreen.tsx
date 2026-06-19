// ApiUsageLogsScreen — POZ-DEV-466
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { ApiUsageLog } from '../types';
import { listApiUsageLogs, resetApiUsageLogs } from '../services/enterpriseIntegrations';

const codeColor = (c: number) => c >= 500 ? '#ef4444' : c >= 400 ? '#f59e0b' : c >= 300 ? '#0ea5e9' : '#22c55e';
const methodColor: Record<string, string> = { GET: '#22c55e', POST: '#0ea5e9', PUT: '#f59e0b', DELETE: '#ef4444', PATCH: '#a855f7' };

export default function ApiUsageLogsScreen() {
  const [items, setItems] = useState<ApiUsageLog[]>([]);
  const load = useCallback(async () => { setItems(await listApiUsageLogs()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.bar}>
        <Text style={s.title}>API Kullanımı ({items.length})</Text>
        <TouchableOpacity onPress={async () => { await resetApiUsageLogs(); load(); }} style={s.reset}>
          <Ionicons name="refresh-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 4, paddingBottom: 60 }}
        ListEmptyComponent={<Text style={s.empty}>Log yok.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.row}>
              <View style={[s.m, { backgroundColor: methodColor[item.method] || '#64748b' }]}>
                <Text style={s.mT}>{item.method}</Text>
              </View>
              <Text style={s.ep} numberOfLines={1}>{item.endpoint}</Text>
              <Text style={[s.code, { color: codeColor(item.statusCode) }]}>{item.statusCode}</Text>
            </View>
            <Text style={s.sub}>{item.durationMs}ms · {item.ip || '-'} · {new Date(item.occurredAt).toLocaleTimeString('tr-TR')}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  reset: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  m: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, minWidth: 50, alignItems: 'center' },
  mT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  ep: { flex: 1, color: colors.text.primary, fontSize: typography.xs, fontFamily: 'monospace' },
  code: { fontSize: typography.sm, fontWeight: '800' },
  sub: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
});
