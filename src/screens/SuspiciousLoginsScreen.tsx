// SuspiciousLoginsScreen — POZ-DEV-362
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listSessions } from '../services/governance';
import type { SessionLog } from '../types';

export default function SuspiciousLoginsScreen() {
  const [items, setItems] = useState<SessionLog[]>([]);

  const load = useCallback(async () => { setItems(await listSessions()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const suspicious = useMemo(() => items.filter(i => i.suspicious), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.summary}>
        <View style={s.summaryCard}>
          <Ionicons name="shield-outline" size={28} color="#ef4444" />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={s.summaryT}>{suspicious.length} şüpheli giriş</Text>
            <Text style={s.summaryS}>Toplam {items.length} oturum içinde</Text>
          </View>
        </View>
      </View>
      <FlatList
        data={suspicious}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={s.empty}>Şüpheli giriş yok. ✅</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Ionicons name="warning" size={22} color="#ef4444" />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.t}>{item.userName || item.userId}</Text>
              <Text style={s.sub}>{item.platform || '—'}{item.ip ? ' · ' + item.ip : ''}{item.location ? ' · ' + item.location : ''}</Text>
              <Text style={s.sub}>{new Date(item.startedAt).toLocaleString('tr-TR')}</Text>
              {item.reason ? <Text style={s.warn}>{item.reason}</Text> : null}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  summary: { padding: spacing.md },
  summaryCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: '#ef444422', borderRadius: radius.md, borderWidth: 1, borderColor: '#ef4444' },
  summaryT: { color: '#ef4444', fontSize: typography.md, fontWeight: '800' },
  summaryS: { color: colors.text.muted, fontSize: typography.sm },
  empty: { color: '#22c55e', textAlign: 'center', marginTop: 40, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: '#ef4444' },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  warn: { color: '#ef4444', fontSize: typography.xs, marginTop: 2, fontWeight: '700' },
});
