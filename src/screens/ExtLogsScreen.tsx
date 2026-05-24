// Faz 57 — ExtLogsScreen (POZ-DEV-275)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getExtLogs, getExtIntegration } from '../services/extensions';
import type { ExtLogEntry, ExtIntegration, RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

type R = RouteProp<RootStackParamList, 'ExtLogs'>;

const LEVEL_COLOR: Record<ExtLogEntry['level'], string> = {
  info: '#3b82f6', warn: '#f59e0b', error: '#ef4444', success: '#22c55e',
};
const LEVEL_ICON: Record<ExtLogEntry['level'], string> = {
  info: 'information-circle', warn: 'warning', error: 'close-circle', success: 'checkmark-circle',
};
const LEVEL_LABEL: Record<ExtLogEntry['level'], string> = {
  info: 'Bilgi', warn: 'Uyarı', error: 'Hata', success: 'Başarılı',
};

export default function ExtLogsScreen() {
  const { params } = useRoute<R>();
  const [it, setIt] = useState<ExtIntegration | null>(null);
  const [logs, setLogs] = useState<ExtLogEntry[]>([]);
  useFocusEffect(useCallback(() => {
    (async () => {
      setIt((await getExtIntegration(params.id)) ?? null);
      setLogs(await getExtLogs(params.id));
    })();
  }, [params.id]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={logs}
        keyExtractor={l => l.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          it ? (
            <View style={s.hero}>
              <Ionicons name={it.icon as any} size={32} color={it.color} />
              <Text style={s.heroT}>{it.name}</Text>
              <Text style={s.heroD}>Entegrasyon log kayıtları</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="Log yok"
            subtitle="Bu entegrasyona ait henüz bir işlem kaydı bulunmuyor."
          />
        }
        renderItem={({ item: l }) => (
          <View key={l.id} style={[s.row, { borderLeftColor: LEVEL_COLOR[l.level as keyof typeof LEVEL_COLOR] }]}>
            <Ionicons name={LEVEL_ICON[l.level as keyof typeof LEVEL_ICON] as any} size={18} color={LEVEL_COLOR[l.level as keyof typeof LEVEL_COLOR]} />
            <View style={{ flex: 1 }}>
              <View style={s.rowHead}>
                <View style={[s.levelPill, { borderColor: LEVEL_COLOR[l.level as keyof typeof LEVEL_COLOR] }]}>
                  <Text style={[s.levelT, { color: LEVEL_COLOR[l.level as keyof typeof LEVEL_COLOR] }]}>{LEVEL_LABEL[l.level as keyof typeof LEVEL_LABEL]}</Text>
                </View>
                <Text style={s.at}>{l.at}</Text>
              </View>
              <Text style={s.msg}>{l.message}</Text>
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
  hero: { alignItems: 'center', padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs },
  empty: { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  emptyT: { color: colors.text.muted, fontSize: typography.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'space-between' },
  levelPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  levelT: { fontSize: typography.xs, fontWeight: '700' },
  at: { color: colors.text.muted, fontSize: typography.xs },
  msg: { color: colors.text.primary, fontSize: typography.xs, marginTop: 4 },
});
