// IntegrationErrorsScreen — POZ-DEV-467
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { IntegrationErrorLog } from '../types';
import { listIntegrationErrors, resolveIntegrationError, resetIntegrationErrors, SEVERITY_COLOR } from '../services/enterpriseIntegrations';

type F = 'all' | 'open' | 'resolved';

export default function IntegrationErrorsScreen() {
  const [items, setItems] = useState<IntegrationErrorLog[]>([]);
  const [f, setF] = useState<F>('open');
  const load = useCallback(async () => { setItems(await listIntegrationErrors()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => items.filter(i => f === 'all' ? true : f === 'open' ? !i.resolved : i.resolved), [items, f]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.bar}>
        <View style={s.chips}>
          {(['open', 'all', 'resolved'] as F[]).map(k => (
            <TouchableOpacity key={k} onPress={() => setF(k)} style={[s.chip, f === k && { backgroundColor: '#dc2626' }]}>
              <Text style={[s.chipT, f === k && { color: '#fff' }]}>{k === 'open' ? 'Açık' : k === 'all' ? 'Tümü' : 'Çözüldü'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={async () => { await resetIntegrationErrors(); load(); }} style={s.reset}>
          <Ionicons name="refresh-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 60 }}
        ListEmptyComponent={<Text style={s.empty}>Kayıt yok.</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: SEVERITY_COLOR[item.severity] }]}>
            <View style={s.row}>
              <View style={[s.sev, { backgroundColor: SEVERITY_COLOR[item.severity] }]}>
                <Text style={s.sevT}>{item.severity.toUpperCase()}</Text>
              </View>
              <Text style={s.src}>{item.source}</Text>
              {item.resolved && <Ionicons name="checkmark-circle" size={16} color="#22c55e" />}
            </View>
            <Text style={s.msg}>{item.message}</Text>
            {item.details ? <Text style={s.det} numberOfLines={2}>{item.details}</Text> : null}
            <View style={s.foot}>
              <Text style={s.sub}>{new Date(item.occurredAt).toLocaleString('tr-TR')}</Text>
              {!item.resolved && (
                <TouchableOpacity onPress={async () => { await resolveIntegrationError(item.id); load(); }} style={s.btn}>
                  <Text style={s.btnT}>Çöz</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, gap: 6 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#dc2626' },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  reset: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sev: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sevT: { color: '#fff', fontSize: 9, fontWeight: '800' },
  src: { flex: 1, color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  msg: { color: colors.text.primary, fontSize: typography.sm, marginTop: 4 },
  det: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  sub: { color: colors.text.muted, fontSize: 10 },
  btn: { backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  btnT: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
