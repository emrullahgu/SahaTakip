// AiDailyReportScreen — Faz 41
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { AiDailyReport } from '../types';
import { listDailyReports, generateDailyReport } from '../services/aiAssistant';

export default function AiDailyReportScreen() {
  const [items, setItems] = useState<AiDailyReport[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setItems(await listDailyReports()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onGen = async () => {
    setBusy(true);
    try { await generateDailyReport(); load(); } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 8, paddingBottom: 90 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz rapor yok. FAB ile üretin.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.head}>
              <Ionicons name="calendar" size={22} color="#22c55e" />
              <Text style={s.date}>{item.date}</Text>
            </View>
            <Text style={s.txt}>{item.text}</Text>
            <View style={s.metrics}>
              {item.metrics.map(m => (
                <View key={m.label} style={s.m}>
                  <Text style={s.mV}>{m.value}</Text>
                  <Text style={s.mL}>{m.label}</Text>
                </View>
              ))}
            </View>
            <Text style={s.tm}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
          </View>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={onGen} disabled={busy}>
        <Ionicons name={busy ? 'hourglass-outline' : 'sparkles'} size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  date: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  txt: { color: colors.text.primary, fontSize: typography.sm },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  m: { flex: 1, minWidth: 80, padding: spacing.sm, backgroundColor: colors.bg.primary, borderRadius: radius.sm, alignItems: 'center' },
  mV: { color: '#22c55e', fontSize: typography.lg, fontWeight: '800' },
  mL: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  tm: { color: colors.text.faint, fontSize: 10 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
