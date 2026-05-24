// Faz 52 — QaModulesScreen (POZ-DEV-229)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listQaModules } from '../services/codeQuality';
import type { QaModuleAudit } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const COH_LABEL: Record<QaModuleAudit['cohesion'], string> = { good: 'İyi', mixed: 'Karışık', poor: 'Zayıf' };
const COH_COLOR: Record<QaModuleAudit['cohesion'], string> = { good: '#22c55e', mixed: '#f59e0b', poor: '#ef4444' };

export default function QaModulesScreen() {
  const [items, setItems] = useState<QaModuleAudit[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listQaModules()))(); }, []));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={m => m.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <View style={s.heroCard}>
            <Ionicons name="folder" size={48} color="#10b981" />
            <Text style={s.heroT}>Modül Yapısı</Text>
            <Text style={s.heroD}>Klasör bazlı kohezyon, dosya yoğunluğu ve refactor önerileri</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="folder-outline"
            title="Modül verisi yok"
            subtitle="Klasör yapısı analizi henüz tamamlanmadı."
          />
        }
        renderItem={({ item: m }) => (
          <View key={m.id} style={[s.card, { borderLeftColor: COH_COLOR[m.cohesion as keyof typeof COH_COLOR] }]}>
            <View style={s.headRow}>
              <Ionicons name="folder-open" size={20} color={COH_COLOR[m.cohesion as keyof typeof COH_COLOR]} />
              <Text style={s.folder}>{m.folder}</Text>
              <View style={[s.pill, { backgroundColor: COH_COLOR[m.cohesion as keyof typeof COH_COLOR] + '33', borderColor: COH_COLOR[m.cohesion as keyof typeof COH_COLOR] }]}>
                <Text style={[s.pillT, { color: COH_COLOR[m.cohesion as keyof typeof COH_COLOR] }]}>{COH_LABEL[m.cohesion as keyof typeof COH_LABEL]}</Text>
              </View>
            </View>
            <View style={s.metaRow}>
              <View style={s.metaBox}><Ionicons name="document" size={11} color={colors.text.muted} /><Text style={s.metaT}>{m.files} dosya</Text></View>
            </View>
            <Text style={s.suggestion}>{m.suggestion}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#10b981', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  folder: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800', fontFamily: 'monospace' as any, flex: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  metaRow: { flexDirection: 'row', gap: spacing.sm },
  metaBox: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaT: { color: colors.text.muted, fontSize: typography.xs },
  suggestion: { color: colors.text.primary, fontSize: typography.xs, fontStyle: 'italic', backgroundColor: colors.bg.primary, padding: 8, borderRadius: 6 },
});
