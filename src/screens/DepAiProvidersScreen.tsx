// Faz 51 — DepAiProvidersScreen (POZ-DEV-216)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listDepAiProviders } from '../services/deploy';
import type { DepAiProvider } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const STATUS_LABEL: Record<DepAiProvider['status'], string> = { active: 'Aktif', inactive: 'Pasif', degraded: 'Düşük' };
const STATUS_COLOR: Record<DepAiProvider['status'], string> = { active: '#22c55e', inactive: '#64748b', degraded: '#f59e0b' };

export default function DepAiProvidersScreen() {
  const [items, setItems] = useState<DepAiProvider[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listDepAiProviders()))(); }, []));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items.sort((a, b) => a.priority - b.priority)}
        keyExtractor={p => p.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <View style={s.heroCard}>
            <Ionicons name="sparkles" size={48} color="#f59e0b" />
            <Text style={s.heroT}>AI Sağlayıcı Yapılandırması</Text>
            <Text style={s.heroD}>Öncelik sıralı sağlayıcılar • otomatik fallback</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="sparkles-outline"
            title="Sağlayıcı yok"
            subtitle="Sistemde henüz bir AI sağlayıcı yapılandırması bulunmuyor."
          />
        }
        renderItem={({ item: p }) => (
          <View key={p.id} style={[s.card, { borderLeftColor: STATUS_COLOR[p.status] }]}>
            <View style={s.headRow}>
              <View style={s.priBadge}><Text style={s.priT}>#{p.priority}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{p.name}</Text>
                <Text style={s.model}>{p.model}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: STATUS_COLOR[p.status] + '33', borderColor: STATUS_COLOR[p.status] }]}>
                <Text style={[s.pillT, { color: STATUS_COLOR[p.status] }]}>{STATUS_LABEL[p.status]}</Text>
              </View>
            </View>
            <View style={s.tagRow}>
              <View style={[s.tag, { borderColor: p.apiKeySet ? '#22c55e' : '#ef4444' }]}>
                <Ionicons name={p.apiKeySet ? 'key' : 'key-outline'} size={11} color={p.apiKeySet ? '#22c55e' : '#ef4444'} />
                <Text style={[s.tagT, { color: p.apiKeySet ? '#22c55e' : '#ef4444' }]}>{p.apiKeySet ? 'API Key Hazır' : 'API Key Eksik'}</Text>
              </View>
              {p.fallback && (
                <View style={[s.tag, { borderColor: '#0ea5e9' }]}>
                  <Ionicons name="swap-horizontal" size={11} color="#0ea5e9" />
                  <Text style={[s.tagT, { color: '#0ea5e9' }]}>Fallback</Text>
                </View>
              )}
            </View>
            <View style={s.statsRow}>
              <View style={s.statBox}><Text style={s.statV}>{p.latencyMs}ms</Text><Text style={s.statL}>Gecikme</Text></View>
              <View style={s.statBox}><Text style={[s.statV, { color: p.successRate > 99 ? '#22c55e' : '#f59e0b' }]}>{p.successRate.toFixed(1)}%</Text><Text style={s.statL}>Başarı</Text></View>
              <View style={s.statBox}><Text style={s.statV}>${p.costPer1kTokens.toFixed(2)}</Text><Text style={s.statL}>1k token</Text></View>
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
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#f59e0b', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f59e0b', justifyContent: 'center', alignItems: 'center' },
  priT: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
  name: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  model: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2, fontFamily: 'monospace' as any },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tagT: { fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 6 },
  statBox: { flex: 1, backgroundColor: colors.bg.primary, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border.primary },
  statV: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});
