// ArchiveJobsScreen — Faz 40
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { ArchiveJob } from '../types';
import { listArchiveJobs, ENTITY_LABEL } from '../services/platform';

const STATUS_COLOR: Record<ArchiveJob['status'], string> = { queued: '#64748b', running: '#0ea5e9', success: '#22c55e', failed: '#ef4444' };
const STATUS_LABEL: Record<ArchiveJob['status'], string> = { queued: 'Sırada', running: 'Çalışıyor', success: 'Başarılı', failed: 'Başarısız' };

export default function ArchiveJobsScreen() {
  const [items, setItems] = useState<ArchiveJob[]>([]);
  const load = useCallback(async () => { setItems(await listArchiveJobs()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 60 }}
        ListEmptyComponent={<Text style={s.empty}>Arşiv görevi yok.</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: STATUS_COLOR[item.status] }]}>
            <View style={s.row}>
              <Ionicons name="archive" size={18} color={STATUS_COLOR[item.status]} />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{ENTITY_LABEL[item.entity as ArchiveJob['entity'] & keyof typeof ENTITY_LABEL] || item.entity}</Text>
                <Text style={s.sub}>{item.movedCount} kayıt · {new Date(item.startedAt).toLocaleString('tr-TR')}</Text>
              </View>
              <View style={[s.b, { backgroundColor: STATUS_COLOR[item.status] }]}>
                <Text style={s.bT}>{STATUS_LABEL[item.status]}</Text>
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
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  b: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  bT: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
