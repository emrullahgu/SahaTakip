// Faz 44 — RouteDeviationAlertsScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { RouteDeviationAlert } from '../types';
import { listDeviations, resolveDeviation } from '../services/liveOps';

export default function RouteDeviationAlertsScreen() {
  const [items, setItems] = useState<RouteDeviationAlert[]>([]);
  const load = useCallback(async () => { setItems(await listDeviations()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = items.filter(i => !i.resolved);
  const closed = items.filter(i => i.resolved);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.statRow}>
        <View style={[s.statCard, { borderLeftColor: '#ef4444' }]}>
          <Ionicons name="warning" size={20} color="#ef4444" />
          <Text style={[s.sV, { color: '#ef4444' }]}>{open.length}</Text>
          <Text style={s.sL}>Açık Uyarı</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: '#22c55e' }]}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <Text style={[s.sV, { color: '#22c55e' }]}>{closed.length}</Text>
          <Text style={s.sL}>Çözülen</Text>
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: item.resolved ? '#22c55e' : '#ef4444' }]}>
            <Ionicons name={item.resolved ? 'checkmark-circle' : 'warning'} size={22} color={item.resolved ? '#22c55e' : '#ef4444'} />
            <View style={{ flex: 1 }}>
              <Text style={s.n}>{item.personnelName}</Text>
              <Text style={s.d}>{item.expectedRoute} · {item.deviationKm.toFixed(1)} km sapma</Text>
              <Text style={s.l}>Son konum: {item.lastKnown}</Text>
              <Text style={s.t}>{new Date(item.alertAt).toLocaleString('tr-TR')}</Text>
            </View>
            {!item.resolved && (
              <TouchableOpacity style={s.btn} onPress={async () => { await resolveDeviation(item.id); load(); }}>
                <Text style={s.btnT}>Kapat</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  statRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  statCard: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, alignItems: 'flex-start' },
  sV: { fontSize: typography.xl, fontWeight: '800' },
  sL: { color: colors.text.muted, fontSize: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  d: { color: '#ef4444', fontSize: typography.xs, marginTop: 2 },
  l: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  t: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  btn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#22c55e', borderRadius: radius.sm },
  btnT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
});
