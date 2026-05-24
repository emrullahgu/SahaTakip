// Faz 42 — FieldZonesScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { FieldZone } from '../types';
import { listZones } from '../services/fieldOps';

export default function FieldZonesScreen() {
  const [items, setItems] = useState<FieldZone[]>([]);
  const load = useCallback(async () => { setItems(await listZones()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: item.color }]}>
            <View style={s.head}>
              <View style={[s.dot, { backgroundColor: item.color }]} />
              <Text style={s.name}>{item.name}</Text>
            </View>
            <View style={s.row}>
              <View style={s.col}>
                <Ionicons name="person" size={16} color="#0ea5e9" />
                <Text style={s.lbl}>Lider</Text>
                <Text style={s.v}>{item.leaderUserName || '—'}</Text>
              </View>
              <View style={s.col}>
                <Ionicons name="people" size={16} color="#22c55e" />
                <Text style={s.lbl}>Üye</Text>
                <Text style={s.v}>{item.memberCount}</Text>
              </View>
              <View style={s.col}>
                <Ionicons name="briefcase" size={16} color="#f59e0b" />
                <Text style={s.lbl}>Aktif İş</Text>
                <Text style={s.v}>{item.activeJobs}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  row: { flexDirection: 'row', gap: spacing.sm },
  col: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg.primary, borderRadius: radius.sm, alignItems: 'center', gap: 2 },
  lbl: { color: colors.text.muted, fontSize: 10 },
  v: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
});
