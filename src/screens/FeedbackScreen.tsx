// FeedbackScreen — POZ-DEV-333 Geri bildirim listesi
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, FeedbackEntry, FeedbackStatus } from '../types';
import { listFeedback, FEEDBACK_CATEGORY_COLOR, FEEDBACK_CATEGORY_LABEL, FEEDBACK_STATUS_COLOR, FEEDBACK_STATUS_LABEL } from '../services/feedback';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Feedback'>;

export default function FeedbackScreen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<FeedbackEntry[]>([]);
  const [filter, setFilter] = useState<'all' | FeedbackStatus>('all');

  const refresh = useCallback(async () => { setItems(await listFeedback()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = useMemo(() => filter === 'all' ? items : items.filter(i => i.status === filter), [items, filter]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.toolbar}>
        <Text style={s.count}>{items.length} kayıt</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => nav.navigate('FeedbackForm', undefined)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addT}>Yeni</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
        <Tab label="Tümü" active={filter === 'all'} onPress={() => setFilter('all')} count={items.length} />
        {(['open', 'in_review', 'planned', 'closed'] as FeedbackStatus[]).map(st => (
          <Tab key={st} label={FEEDBACK_STATUS_LABEL[st]} color={FEEDBACK_STATUS_COLOR[st]} active={filter === st} onPress={() => setFilter(st)} count={items.filter(i => i.status === st).length} />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.content}>
        {filtered.length === 0 && <Text style={s.empty}>Kayıt yok</Text>}
        {filtered.map(f => (
          <TouchableOpacity key={f.id} style={[s.card, { borderLeftColor: FEEDBACK_CATEGORY_COLOR[f.category] }]} onPress={() => nav.navigate('FeedbackDetail', { entryId: f.id })}>
            <View style={s.row}>
              <View style={[s.catPill, { backgroundColor: FEEDBACK_CATEGORY_COLOR[f.category] + '22', borderColor: FEEDBACK_CATEGORY_COLOR[f.category] }]}>
                <Text style={[s.catT, { color: FEEDBACK_CATEGORY_COLOR[f.category] }]}>{FEEDBACK_CATEGORY_LABEL[f.category]}</Text>
              </View>
              <View style={[s.statusPill, { backgroundColor: FEEDBACK_STATUS_COLOR[f.status] + '22', borderColor: FEEDBACK_STATUS_COLOR[f.status] }]}>
                <Text style={[s.statusT, { color: FEEDBACK_STATUS_COLOR[f.status] }]}>{FEEDBACK_STATUS_LABEL[f.status]}</Text>
              </View>
            </View>
            <Text style={s.title}>{f.title}</Text>
            <Text style={s.msg} numberOfLines={2}>{f.message}</Text>
            <View style={s.row}>
              {f.rating != null && (
                <View style={s.rateRow}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Ionicons key={i} name={i <= (f.rating || 0) ? 'star' : 'star-outline'} size={12} color="#f59e0b" />
                  ))}
                </View>
              )}
              <Text style={s.time}>{new Date(f.createdAt).toLocaleDateString('tr-TR')}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tab({ label, active, onPress, color, count }: { label: string; active: boolean; onPress: () => void; color?: string; count: number }) {
  return (
    <TouchableOpacity style={[s.tab, active && { backgroundColor: color || '#0ea5e9', borderColor: color || '#0ea5e9' }]} onPress={onPress}>
      <Text style={[s.tabT, active && { color: '#fff' }]}>{label} ({count})</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  count: { color: colors.text.muted, fontSize: typography.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22c55e', paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md },
  addT: { color: '#fff', fontWeight: '700' },
  tabsRow: { paddingHorizontal: spacing.md, gap: 6 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, marginRight: 6 },
  tabT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  empty: { color: colors.text.muted, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.md },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  catT: { fontSize: typography.xs, fontWeight: '700' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  statusT: { fontSize: typography.xs, fontWeight: '700' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  msg: { color: colors.text.muted, fontSize: typography.xs },
  time: { color: colors.text.faint, fontSize: typography.xs },
  rateRow: { flexDirection: 'row', gap: 2 },
});
