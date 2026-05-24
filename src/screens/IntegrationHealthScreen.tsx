// IntegrationHealthScreen — POZ-DEV-468
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { IntegrationHealth } from '../types';
import { listIntegrationHealth, refreshHealth, STATUS_COLOR, STATUS_LABEL } from '../services/enterpriseIntegrations';

export default function IntegrationHealthScreen() {
  const [items, setItems] = useState<IntegrationHealth[]>([]);
  const load = useCallback(async () => { setItems(await listIntegrationHealth()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.bar}>
        <Text style={s.title}>Sağlık Durumu</Text>
        <TouchableOpacity onPress={async () => { await refreshHealth(); load(); }} style={s.refresh}>
          <Ionicons name="pulse-outline" size={14} color="#fff" />
          <Text style={s.refreshT}>Yenile</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 60 }}
        ListEmptyComponent={<Text style={s.empty}>Veri yok.</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: STATUS_COLOR[item.status] }]}>
            <View style={s.row}>
              <Ionicons name="pulse-outline" size={20} color={STATUS_COLOR[item.status]} />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{item.service}</Text>
                <Text style={s.sub}>{new Date(item.checkedAt).toLocaleString('tr-TR')}</Text>
              </View>
              <View style={[s.st, { borderColor: STATUS_COLOR[item.status] }]}>
                <Text style={[s.stT, { color: STATUS_COLOR[item.status] }]}>{STATUS_LABEL[item.status]}</Text>
              </View>
            </View>
            <View style={s.metrics}>
              {item.latencyMs !== undefined && (
                <View style={s.metric}>
                  <Text style={s.mLabel}>Gecikme</Text>
                  <Text style={s.mValue}>{item.latencyMs}ms</Text>
                </View>
              )}
              {item.uptimePct !== undefined && (
                <View style={s.metric}>
                  <Text style={s.mLabel}>Uptime</Text>
                  <Text style={[s.mValue, { color: item.uptimePct >= 99 ? '#22c55e' : '#f59e0b' }]}>{item.uptimePct.toFixed(2)}%</Text>
                </View>
              )}
            </View>
            {item.message ? <Text style={s.msg}>{item.message}</Text> : null}
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
  refresh: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#84cc16', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  refreshT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  st: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  stT: { fontSize: 10, fontWeight: '800' },
  metrics: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  metric: { flex: 1 },
  mLabel: { color: colors.text.muted, fontSize: 10 },
  mValue: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: 2 },
  msg: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4, fontStyle: 'italic' },
});
