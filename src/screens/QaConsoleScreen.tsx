// Faz 52 — QaConsoleScreen (POZ-DEV-223)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listQaConsoleLogs, toggleQaConsoleStatus, QA_STATUS_COLOR, QA_STATUS_LABEL } from '../services/codeQuality';
import type { QaConsoleLog } from '../types';

const LEVEL_COLOR: Record<QaConsoleLog['level'], string> = { error: '#ef4444', warn: '#f59e0b', info: '#0ea5e9' };
const LEVEL_ICON: Record<QaConsoleLog['level'], string> = { error: 'close-circle', warn: 'warning', info: 'information-circle' };

export default function QaConsoleScreen() {
  const [items, setItems] = useState<QaConsoleLog[]>([]);
  const load = useCallback(async () => setItems(await listQaConsoleLogs()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const counts = useMemo(() => ({
    open: items.filter(i => i.status === 'open').length,
    fixed: items.filter(i => i.status === 'fixed').length,
    ignored: items.filter(i => i.status === 'ignored').length,
  }), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.statRow}>
          <View style={[s.statBox, { borderColor: '#ef4444' }]}><Text style={[s.statV, { color: '#ef4444' }]}>{counts.open}</Text><Text style={s.statL}>Açık</Text></View>
          <View style={[s.statBox, { borderColor: '#22c55e' }]}><Text style={[s.statV, { color: '#22c55e' }]}>{counts.fixed}</Text><Text style={s.statL}>Düzeltildi</Text></View>
          <View style={[s.statBox, { borderColor: '#64748b' }]}><Text style={[s.statV, { color: '#64748b' }]}>{counts.ignored}</Text><Text style={s.statL}>Yoksayıldı</Text></View>
        </View>

        {items.map(l => (
          <View key={l.id} style={[s.card, { borderLeftColor: QA_STATUS_COLOR[l.status], opacity: l.status === 'ignored' ? 0.55 : 1 }]}>
            <View style={s.headRow}>
              <Ionicons name={LEVEL_ICON[l.level] as any} size={20} color={LEVEL_COLOR[l.level]} />
              <View style={{ flex: 1 }}>
                <Text style={s.msg}>{l.message}</Text>
                <Text style={s.source}>{l.source}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: QA_STATUS_COLOR[l.status] + '33', borderColor: QA_STATUS_COLOR[l.status] }]}>
                <Text style={[s.pillT, { color: QA_STATUS_COLOR[l.status] }]}>{QA_STATUS_LABEL[l.status]}</Text>
              </View>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaT}>{l.count} kez</Text>
              <Text style={s.metaT}>{new Date(l.lastSeen).toLocaleDateString('tr-TR')}</Text>
              <TouchableOpacity onPress={() => toggleQaConsoleStatus(l.id).then(load)} style={s.cycleBtn}>
                <Ionicons name="refresh" size={11} color="#a855f7" />
                <Text style={s.cycleT}>Durum Değiştir</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  statV: { fontSize: typography.lg, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  msg: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  source: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2, fontFamily: 'monospace' as any },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  metaT: { color: colors.text.muted, fontSize: typography.xs },
  cycleBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#a855f7', marginLeft: 'auto' },
  cycleT: { color: '#a855f7', fontSize: typography.xs, fontWeight: '700' },
});
