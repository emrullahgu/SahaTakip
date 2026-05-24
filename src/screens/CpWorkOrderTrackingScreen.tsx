// Faz 48 — CpWorkOrderTrackingScreen (POZ-DEV-184)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listCpWorkOrders, CP_WO_LABEL, CP_WO_COLOR } from '../services/customerPortal';
import type { CpWorkOrderProgress } from '../types';

export default function CpWorkOrderTrackingScreen() {
  const [list, setList] = useState<CpWorkOrderProgress[]>([]);
  useFocusEffect(useCallback(() => { (async () => setList(await listCpWorkOrders()))(); }, []));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        {list.map(w => (
          <View key={w.id} style={s.card}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.num}>{w.number}</Text>
                <Text style={s.title}>{w.title}</Text>
              </View>
              <View style={[s.statusPill, { backgroundColor: CP_WO_COLOR[w.status] + '33', borderColor: CP_WO_COLOR[w.status] }]}>
                <Text style={[s.statusT, { color: CP_WO_COLOR[w.status] }]}>{CP_WO_LABEL[w.status]}</Text>
              </View>
            </View>
            <View style={s.metaRow}>
              <View style={s.metaItem}><Ionicons name="person" size={12} color={colors.text.muted} /><Text style={s.meta}>{w.assignedTo}</Text></View>
              <View style={s.metaItem}><Ionicons name="location" size={12} color={colors.text.muted} /><Text style={s.meta}>{w.location}</Text></View>
              <View style={s.metaItem}><Ionicons name="calendar" size={12} color={colors.text.muted} /><Text style={s.meta}>{new Date(w.scheduledAt).toLocaleDateString('tr-TR')}</Text></View>
            </View>

            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${w.progressPct}%`, backgroundColor: CP_WO_COLOR[w.status] }]} />
            </View>
            <Text style={s.pct}>%{w.progressPct} tamamlandı</Text>

            <View style={s.timeline}>
              {w.steps.map((st, i) => (
                <View key={i} style={s.tlItem}>
                  <View style={[s.tlDot, { backgroundColor: st.done ? CP_WO_COLOR[w.status] : colors.bg.primary, borderColor: CP_WO_COLOR[w.status] }]}>
                    {st.done && <Ionicons name="checkmark" size={10} color="#fff" />}
                  </View>
                  {i < w.steps.length - 1 && <View style={[s.tlLine, { backgroundColor: w.steps[i + 1].done ? CP_WO_COLOR[w.status] : colors.border.primary }]} />}
                  <Text style={[s.tlT, st.done && { color: colors.text.primary, fontWeight: '700' }]}>{st.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.md },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  num: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  title: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusT: { fontSize: typography.xs, fontWeight: '800' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { color: colors.text.muted, fontSize: typography.xs },
  barBg: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  pct: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'right' },
  timeline: { gap: 4 },
  tlItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tlDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tlLine: { position: 'absolute', left: 7, top: 16, width: 2, height: 12 },
  tlT: { color: colors.text.muted, fontSize: typography.xs, flex: 1 },
});
