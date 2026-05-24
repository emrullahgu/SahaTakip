// Faz 55 — GoLiveChecklistScreen (POZ-DEV-253)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listGoLiveChecklist } from '../services/goLive';
import type { GoLiveChecklistItem } from '../types';

const CAT_LABEL: Record<GoLiveChecklistItem['category'], string> = { infra: 'Altyapı', data: 'Veri', comms: 'İletişim', support: 'Destek', monitoring: 'İzleme' };
const CAT_COLOR: Record<GoLiveChecklistItem['category'], string> = { infra: '#06b6d4', data: '#3b82f6', comms: '#a855f7', support: '#f59e0b', monitoring: '#22c55e' };

export default function GoLiveChecklistScreen() {
  const [items, setItems] = useState<GoLiveChecklistItem[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listGoLiveChecklist()))(); }, []));
  const stats = useMemo(() => ({
    done: items.filter(i => i.done).length,
    total: items.length,
    criticalOpen: items.filter(i => i.critical && !i.done).length,
  }), [items]);
  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="rocket" size={48} color="#ef4444" />
          <Text style={s.heroT}>Canlıya Alma Günü Kontrolü</Text>
          <Text style={s.heroD}>Production go-live için son kontroller</Text>
        </View>
        <View style={s.statRow}>
          <View style={[s.statBox, { borderColor: '#22c55e' }]}><Text style={[s.statV, { color: '#22c55e' }]}>%{progress}</Text><Text style={s.statL}>Tamamlanan</Text></View>
          <View style={[s.statBox, { borderColor: '#3b82f6' }]}><Text style={[s.statV, { color: '#3b82f6' }]}>{stats.done}/{stats.total}</Text><Text style={s.statL}>Madde</Text></View>
          <View style={[s.statBox, { borderColor: '#ef4444' }]}><Text style={[s.statV, { color: '#ef4444' }]}>{stats.criticalOpen}</Text><Text style={s.statL}>Kritik Açık</Text></View>
        </View>
        {items.map(i => (
          <View key={i.id} style={[s.card, { borderLeftColor: i.done ? '#22c55e' : i.critical ? '#ef4444' : '#f59e0b' }]}>
            <Ionicons name={i.done ? 'checkmark-circle' : i.critical ? 'alert-circle' : 'ellipse-outline'} size={22} color={i.done ? '#22c55e' : i.critical ? '#ef4444' : '#64748b'} />
            <View style={{ flex: 1 }}>
              <Text style={[s.itemT, i.done && { textDecorationLine: 'line-through', color: colors.text.muted }]}>{i.text}</Text>
              <View style={s.metaRow}>
                <View style={[s.pill, { backgroundColor: CAT_COLOR[i.category] + '33', borderColor: CAT_COLOR[i.category] }]}>
                  <Text style={[s.pillT, { color: CAT_COLOR[i.category] }]}>{CAT_LABEL[i.category]}</Text>
                </View>
                <Text style={s.owner}>{i.owner}</Text>
                {i.critical && <View style={[s.pill, { borderColor: '#ef4444' }]}><Text style={[s.pillT, { color: '#ef4444' }]}>Kritik</Text></View>}
              </View>
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
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#ef4444', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  statV: { fontSize: typography.md, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  itemT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  pillT: { fontSize: 10, fontWeight: '800' },
  owner: { color: colors.text.muted, fontSize: 10 },
});
