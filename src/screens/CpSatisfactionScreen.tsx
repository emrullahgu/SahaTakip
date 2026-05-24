// Faz 48 — CpSatisfactionScreen (POZ-DEV-187)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listCpSatisfaction } from '../services/customerPortal';
import type { CpSatisfactionEntry } from '../types';

const CAT_COLOR: Record<CpSatisfactionEntry['category'], string> = { praise: '#22c55e', neutral: '#f59e0b', complaint: '#ef4444' };
const CAT_ICON: Record<CpSatisfactionEntry['category'], string> = { praise: 'happy', neutral: 'sad', complaint: 'thumbs-down' };
const CAT_LABEL: Record<CpSatisfactionEntry['category'], string> = { praise: 'Övgü', neutral: 'Nötr', complaint: 'Şikayet' };

export default function CpSatisfactionScreen() {
  const [list, setList] = useState<CpSatisfactionEntry[]>([]);
  useFocusEffect(useCallback(() => { (async () => setList(await listCpSatisfaction()))(); }, []));

  const stats = useMemo(() => {
    if (!list.length) return { avg: 0, praise: 0, neutral: 0, complaint: 0 };
    return {
      avg: list.reduce((s, e) => s + e.rating, 0) / list.length,
      praise: list.filter(e => e.category === 'praise').length,
      neutral: list.filter(e => e.category === 'neutral').length,
      complaint: list.filter(e => e.category === 'complaint').length,
    };
  }, [list]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Text style={s.heroL}>Ortalama Puan</Text>
          <View style={s.starRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <Ionicons key={i} name={i <= Math.round(stats.avg) ? 'star' : 'star-outline'} size={28} color="#facc15" />
            ))}
          </View>
          <Text style={s.heroV}>{stats.avg.toFixed(1)} / 5.0 · {list.length} değerlendirme</Text>
        </View>

        <View style={s.catRow}>
          <View style={[s.catBox, { borderColor: '#22c55e' }]}>
            <Ionicons name="happy" size={20} color="#22c55e" />
            <Text style={[s.catV, { color: '#22c55e' }]}>{stats.praise}</Text>
            <Text style={s.catL}>Övgü</Text>
          </View>
          <View style={[s.catBox, { borderColor: '#f59e0b' }]}>
            <Ionicons name="sad" size={20} color="#f59e0b" />
            <Text style={[s.catV, { color: '#f59e0b' }]}>{stats.neutral}</Text>
            <Text style={s.catL}>Nötr</Text>
          </View>
          <View style={[s.catBox, { borderColor: '#ef4444' }]}>
            <Ionicons name="thumbs-down" size={20} color="#ef4444" />
            <Text style={[s.catV, { color: '#ef4444' }]}>{stats.complaint}</Text>
            <Text style={s.catL}>Şikayet</Text>
          </View>
        </View>

        <Text style={s.section}>Geri Bildirim Geçmişi</Text>
        {list.map(e => (
          <View key={e.id} style={[s.card, { borderLeftColor: CAT_COLOR[e.category] }]}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.wo}>{e.workOrderTitle}</Text>
                <View style={s.starsSm}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Ionicons key={i} name={i <= e.rating ? 'star' : 'star-outline'} size={12} color="#facc15" />
                  ))}
                </View>
              </View>
              <View style={[s.catPill, { backgroundColor: CAT_COLOR[e.category] + '33', borderColor: CAT_COLOR[e.category] }]}>
                <Ionicons name={CAT_ICON[e.category] as any} size={12} color={CAT_COLOR[e.category]} />
                <Text style={[s.catPillT, { color: CAT_COLOR[e.category] }]}>{CAT_LABEL[e.category]}</Text>
              </View>
            </View>
            {e.comment && <Text style={s.cmt}>"{e.comment}"</Text>}
            <Text style={s.date}>{new Date(e.createdAt).toLocaleDateString('tr-TR')}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#facc15', alignItems: 'center', gap: 6 },
  heroL: { color: colors.text.muted, fontSize: typography.sm },
  starRow: { flexDirection: 'row', gap: 4 },
  heroV: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  catRow: { flexDirection: 'row', gap: spacing.sm },
  catBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', gap: 2 },
  catV: { fontSize: typography.lg, fontWeight: '800' },
  catL: { color: colors.text.muted, fontSize: typography.xs },
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700', marginTop: spacing.sm },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wo: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  starsSm: { flexDirection: 'row', gap: 2, marginTop: 2 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  catPillT: { fontSize: typography.xs, fontWeight: '800' },
  cmt: { color: colors.text.muted, fontSize: typography.sm, fontStyle: 'italic' },
  date: { color: colors.text.faint, fontSize: typography.xs },
});
