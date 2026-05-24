// Faz 52 — QaSharedScreen (POZ-DEV-225)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listQaShared } from '../services/codeQuality';
import type { QaSharedComponent } from '../types';

const CAT_LABEL: Record<QaSharedComponent['category'], string> = { form: 'Form', table: 'Tablo', modal: 'Modal', button: 'Buton', card: 'Kart', state: 'Durum' };
const CAT_COLOR: Record<QaSharedComponent['category'], string> = { form: '#0ea5e9', table: '#a855f7', modal: '#f59e0b', button: '#22c55e', card: '#ec4899', state: '#3b82f6' };

export default function QaSharedScreen() {
  const [items, setItems] = useState<QaSharedComponent[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listQaShared()))(); }, []));

  const stats = useMemo(() => ({
    total: items.length,
    refactored: items.filter(i => i.refactored).length,
    totalUsage: items.reduce((a, b) => a + b.usageCount, 0),
  }), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="cube" size={48} color="#0ea5e9" />
          <Text style={s.heroT}>Ortak Component Kataloğu</Text>
          <Text style={s.heroD}>{stats.total} component • {stats.refactored} refactor edildi • {stats.totalUsage.toLocaleString('tr-TR')} kullanım</Text>
        </View>

        {items.map(c => (
          <View key={c.id} style={[s.card, { borderLeftColor: c.refactored ? '#22c55e' : '#f59e0b' }]}>
            <View style={s.headRow}>
              <View style={[s.iconBox, { backgroundColor: CAT_COLOR[c.category] + '33' }]}>
                <Ionicons name="cube-outline" size={20} color={CAT_COLOR[c.category]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{c.name}</Text>
                <Text style={s.desc}>{c.description}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: CAT_COLOR[c.category] + '33', borderColor: CAT_COLOR[c.category] }]}>
                <Text style={[s.pillT, { color: CAT_COLOR[c.category] }]}>{CAT_LABEL[c.category]}</Text>
              </View>
            </View>
            <View style={s.statsRow}>
              <View style={s.statBox}><Text style={s.statV}>{c.usageCount}</Text><Text style={s.statL}>Kullanım</Text></View>
              <View style={s.statBox}><Text style={s.statV}>{c.filesUsing}</Text><Text style={s.statL}>Dosya</Text></View>
              <View style={[s.tag, { borderColor: c.refactored ? '#22c55e' : '#f59e0b' }]}>
                <Ionicons name={c.refactored ? 'checkmark-circle' : 'time'} size={11} color={c.refactored ? '#22c55e' : '#f59e0b'} />
                <Text style={[s.tagT, { color: c.refactored ? '#22c55e' : '#f59e0b' }]}>{c.refactored ? 'Refactor OK' : 'Bekliyor'}</Text>
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
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#0ea5e9', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  name: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  desc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  statBox: { flex: 1, backgroundColor: colors.bg.primary, paddingVertical: 6, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border.primary },
  statV: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tag: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  tagT: { fontSize: 10, fontWeight: '700' },
});
