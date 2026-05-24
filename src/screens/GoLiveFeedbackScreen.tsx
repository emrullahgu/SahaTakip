// Faz 55 — GoLiveFeedbackScreen (POZ-DEV-256)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listGoLiveFeedback, GO_LIVE_STATUS_LABEL, GO_LIVE_STATUS_COLOR } from '../services/goLive';
import type { GoLiveFeedback } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const CAT_LABEL: Record<GoLiveFeedback['category'], string> = { bug: 'Hata', feature: 'İstek', ux: 'UX', performance: 'Performans', other: 'Diğer' };
const CAT_COLOR: Record<GoLiveFeedback['category'], string> = { bug: '#ef4444', feature: '#3b82f6', ux: '#a855f7', performance: '#f59e0b', other: '#64748b' };

export default function GoLiveFeedbackScreen() {
  const [items, setItems] = useState<GoLiveFeedback[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listGoLiveFeedback()))(); }, []));
  const avgRating = useMemo(() => items.length ? (items.reduce((s, i) => s + i.rating, 0) / items.length).toFixed(1) : '0.0', [items]);
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={f => f.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <View style={s.heroCard}>
            <Ionicons name="chatbubbles" size={48} color="#06b6d4" />
            <Text style={s.heroT}>Kullanıcı Geri Bildirimleri</Text>
            <Text style={s.heroD}>{items.length} bildirim • Ortalama puan: {avgRating}/5</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="Geri bildirim yok"
            subtitle="Henüz kullanıcılardan gelen bir geri bildirim bulunmuyor."
          />
        }
        renderItem={({ item: f }) => (
          <View key={f.id} style={[s.card, { borderLeftColor: CAT_COLOR[f.category as keyof typeof CAT_COLOR] }]}>
            <View style={s.headRow}>
              <Ionicons name="person-circle" size={28} color={colors.text.muted} />
              <View style={{ flex: 1 }}>
                <Text style={s.user}>{f.user}</Text>
                <Text style={s.role}>{f.role} • {f.createdAt}</Text>
              </View>
              <View style={s.ratingBox}>
                {[1, 2, 3, 4, 5].map(n => (
                  <Ionicons key={n} name={n <= f.rating ? 'star' : 'star-outline'} size={12} color="#f59e0b" />
                ))}
              </View>
            </View>
            <Text style={s.msg}>{f.message}</Text>
            <View style={s.metaRow}>
              <View style={[s.pill, { backgroundColor: CAT_COLOR[f.category as keyof typeof CAT_COLOR] + '33', borderColor: CAT_COLOR[f.category as keyof typeof CAT_COLOR] }]}>
                <Text style={[s.pillT, { color: CAT_COLOR[f.category as keyof typeof CAT_COLOR] }]}>{CAT_LABEL[f.category as keyof typeof CAT_LABEL]}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: GO_LIVE_STATUS_COLOR[f.status as keyof typeof GO_LIVE_STATUS_COLOR] + '33', borderColor: GO_LIVE_STATUS_COLOR[f.status as keyof typeof GO_LIVE_STATUS_COLOR] }]}>
                <Text style={[s.pillT, { color: GO_LIVE_STATUS_COLOR[f.status as keyof typeof GO_LIVE_STATUS_COLOR] }]}>{GO_LIVE_STATUS_LABEL[f.status as keyof typeof GO_LIVE_STATUS_LABEL]}</Text>
              </View>
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
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#06b6d4', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  user: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  role: { color: colors.text.muted, fontSize: 10 },
  ratingBox: { flexDirection: 'row', gap: 1 },
  msg: { color: colors.text.primary, fontSize: typography.sm, lineHeight: 18, paddingLeft: 4 },
  metaRow: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  pillT: { fontSize: 10, fontWeight: '800' },
});
