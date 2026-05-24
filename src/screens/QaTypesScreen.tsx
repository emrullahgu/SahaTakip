// Faz 52 — QaTypesScreen (POZ-DEV-228)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listQaTypes } from '../services/codeQuality';
import type { QaTypeIssue } from '../types';

const KIND_LABEL: Record<QaTypeIssue['kind'], string> = { 'any': 'any', 'implicit-any': 'implicit any', 'missing-return': 'eksik return', 'unused-type': 'kullanılmayan tip', 'loose-cast': 'gevşek cast' };
const KIND_COLOR: Record<QaTypeIssue['kind'], string> = { 'any': '#ef4444', 'implicit-any': '#f59e0b', 'missing-return': '#a855f7', 'unused-type': '#64748b', 'loose-cast': '#ec4899' };

export default function QaTypesScreen() {
  const [items, setItems] = useState<QaTypeIssue[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listQaTypes()))(); }, []));

  const stats = useMemo(() => ({
    total: items.length,
    fixed: items.filter(i => i.fixed).length,
  }), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="code-slash" size={48} color="#3b82f6" />
          <Text style={s.heroT}>TypeScript Güçlendirme</Text>
          <Text style={s.heroD}>{stats.fixed}/{stats.total} sorun çözüldü</Text>
        </View>

        {items.map(t => (
          <View key={t.id} style={[s.card, { borderLeftColor: t.fixed ? '#22c55e' : KIND_COLOR[t.kind] }]}>
            <View style={s.headRow}>
              <View style={[s.pill, { backgroundColor: KIND_COLOR[t.kind] + '33', borderColor: KIND_COLOR[t.kind] }]}>
                <Text style={[s.pillT, { color: KIND_COLOR[t.kind] }]}>{KIND_LABEL[t.kind]}</Text>
              </View>
              <Text style={s.fileLine}>{t.file}:{t.line}</Text>
              {t.fixed && <Ionicons name="checkmark-circle" size={18} color="#22c55e" style={{ marginLeft: 'auto' }} />}
            </View>
            <Text style={s.snippet}>{t.snippet}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#3b82f6', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  fileLine: { color: colors.text.muted, fontSize: typography.xs, fontFamily: 'monospace' as any, flex: 1 },
  snippet: { color: colors.text.primary, fontSize: typography.xs, fontFamily: 'monospace' as any, backgroundColor: colors.bg.primary, padding: 8, borderRadius: 6 },
});
