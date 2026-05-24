// Faz 51 — DepStorageScreen (POZ-DEV-213)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listDepStorage } from '../services/deploy';
import type { DepStorageBucket } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

export default function DepStorageScreen() {
  const [items, setItems] = useState<DepStorageBucket[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listDepStorage()))(); }, []));

  const stats = useMemo(() => ({
    total: items.length,
    publicCount: items.filter(b => b.public).length,
    sizeMb: items.reduce((a, b) => a + b.sizeMb, 0),
    fileCount: items.reduce((a, b) => a + b.fileCount, 0),
    failCount: items.filter(b => !b.uploadTestOk).length,
  }), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={b => b.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <>
            <View style={s.heroCard}>
              <Ionicons name="folder-open" size={48} color="#a855f7" />
              <Text style={s.heroT}>Storage Bucket Yönetimi</Text>
              <Text style={s.heroD}>{stats.total} bucket • {(stats.sizeMb / 1024).toFixed(2)} GB • {stats.fileCount.toLocaleString('tr-TR')} dosya</Text>
            </View>

            <View style={s.statRow}>
              <View style={[s.statBox, { borderColor: '#0ea5e9' }]}><Text style={[s.statV, { color: '#0ea5e9' }]}>{stats.publicCount}</Text><Text style={s.statL}>Public</Text></View>
              <View style={[s.statBox, { borderColor: '#22c55e' }]}><Text style={[s.statV, { color: '#22c55e' }]}>{stats.total - stats.failCount}</Text><Text style={s.statL}>Upload OK</Text></View>
              <View style={[s.statBox, { borderColor: '#ef4444' }]}><Text style={[s.statV, { color: '#ef4444' }]}>{stats.failCount}</Text><Text style={s.statL}>Sorun</Text></View>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="folder-outline"
            title="Bucket yok"
            subtitle="Storage üzerinde yapılandırılmış bir bucket bulunamadı."
          />
        }
        renderItem={({ item: b }) => (
          <View key={b.id} style={[s.card, { borderLeftColor: b.uploadTestOk ? '#22c55e' : '#ef4444' }]}>
            <View style={s.headRow}>
              <Ionicons name={b.public ? 'globe' : 'lock-closed'} size={20} color={b.public ? '#0ea5e9' : '#64748b'} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{b.name}</Text>
                <Text style={s.meta}>{b.fileCount.toLocaleString('tr-TR')} dosya • {b.sizeMb < 1024 ? `${b.sizeMb} MB` : `${(b.sizeMb / 1024).toFixed(1)} GB`}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: (b.public ? '#0ea5e9' : '#64748b') + '33', borderColor: b.public ? '#0ea5e9' : '#64748b' }]}>
                <Text style={[s.pillT, { color: b.public ? '#0ea5e9' : '#64748b' }]}>{b.public ? 'PUBLIC' : 'PRIVATE'}</Text>
              </View>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaT}><Ionicons name="key" size={11} color={colors.text.muted} /> {b.policies} policy</Text>
              <View style={[s.testPill, { backgroundColor: (b.uploadTestOk ? '#22c55e' : '#ef4444') + '33', borderColor: b.uploadTestOk ? '#22c55e' : '#ef4444' }]}>
                <Ionicons name={b.uploadTestOk ? 'checkmark-circle' : 'close-circle'} size={11} color={b.uploadTestOk ? '#22c55e' : '#ef4444'} />
                <Text style={[s.testT, { color: b.uploadTestOk ? '#22c55e' : '#ef4444' }]}>{b.uploadTestOk ? 'Upload OK' : 'Upload Hatası'}</Text>
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
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#a855f7', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  statV: { fontSize: typography.lg, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: 10, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  metaT: { color: colors.text.muted, fontSize: typography.xs },
  testPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  testT: { fontSize: 10, fontWeight: '800' },
});
