// SystemHealthScreen — Faz 40
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { SystemHealthCheck } from '../types';
import { listSystemHealth, refreshSystemHealth, HEALTH_COLOR, HEALTH_LABEL, COMPONENT_LABEL } from '../services/platform';

export default function SystemHealthScreen() {
  const [items, setItems] = useState<SystemHealthCheck[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setItems(await listSystemHealth()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setBusy(true);
    try { setItems(await refreshSystemHealth()); } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 90 }}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: HEALTH_COLOR[item.status] }]}>
            <View style={s.row}>
              <Ionicons name="pulse" size={20} color={HEALTH_COLOR[item.status]} />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{COMPONENT_LABEL[item.component]}</Text>
                <Text style={s.sub}>{item.message || ''}{item.latencyMs !== undefined ? ` · ${item.latencyMs}ms` : ''}</Text>
                <Text style={s.tm}>{new Date(item.checkedAt).toLocaleTimeString('tr-TR')}</Text>
              </View>
              <View style={[s.b, { backgroundColor: HEALTH_COLOR[item.status] }]}>
                <Text style={s.bT}>{HEALTH_LABEL[item.status]}</Text>
              </View>
            </View>
          </View>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={onRefresh} disabled={busy}>
        <Ionicons name={busy ? 'hourglass-outline' : 'refresh'} size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tm: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  b: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  bT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
