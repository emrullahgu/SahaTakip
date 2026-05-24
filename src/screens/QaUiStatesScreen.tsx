// Faz 52 — QaUiStatesScreen (POZ-DEV-227)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listQaUiStates } from '../services/codeQuality';
import type { QaUiStateAudit } from '../types';

export default function QaUiStatesScreen() {
  const [items, setItems] = useState<QaUiStateAudit[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listQaUiStates()))(); }, []));

  const stats = useMemo(() => ({
    total: items.length,
    ok: items.filter(i => i.loadingOk && i.emptyOk && i.errorOk).length,
  }), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="apps" size={48} color="#06b6d4" />
          <Text style={s.heroT}>UI Durum Standartları</Text>
          <Text style={s.heroD}>{stats.ok}/{stats.total} ekran tam standart • Loading / Empty / Error</Text>
        </View>

        <View style={s.tableHead}>
          <Text style={[s.thScreen, s.thT]}>Ekran</Text>
          <Text style={[s.thCol, s.thT]}>Loading</Text>
          <Text style={[s.thCol, s.thT]}>Empty</Text>
          <Text style={[s.thCol, s.thT]}>Error</Text>
        </View>

        {items.map(a => {
          const allOk = a.loadingOk && a.emptyOk && a.errorOk;
          return (
            <View key={a.id} style={[s.row, { borderLeftColor: allOk ? '#22c55e' : '#f59e0b' }]}>
              <View style={s.rowMain}>
                <Text style={s.screen} numberOfLines={1}>{a.screen}</Text>
                <View style={s.col}><Ionicons name={a.loadingOk ? 'checkmark-circle' : 'close-circle'} size={18} color={a.loadingOk ? '#22c55e' : '#ef4444'} /></View>
                <View style={s.col}><Ionicons name={a.emptyOk ? 'checkmark-circle' : 'close-circle'} size={18} color={a.emptyOk ? '#22c55e' : '#ef4444'} /></View>
                <View style={s.col}><Ionicons name={a.errorOk ? 'checkmark-circle' : 'close-circle'} size={18} color={a.errorOk ? '#22c55e' : '#ef4444'} /></View>
              </View>
              {a.notes ? <Text style={s.notes}>{a.notes}</Text> : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#06b6d4', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  tableHead: { flexDirection: 'row', backgroundColor: colors.bg.secondary, paddingVertical: 8, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  thScreen: { flex: 2 },
  thCol: { flex: 1, textAlign: 'center' },
  thT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '800' },
  row: { backgroundColor: colors.bg.secondary, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  rowMain: { flexDirection: 'row', alignItems: 'center' },
  screen: { flex: 2, color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  col: { flex: 1, alignItems: 'center' },
  notes: { color: colors.text.muted, fontSize: typography.xs, fontStyle: 'italic' },
});
