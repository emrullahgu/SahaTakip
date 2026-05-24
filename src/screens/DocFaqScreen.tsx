// Faz 54 — DocFaqScreen (POZ-DEV-250)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listDocFaq } from '../services/docs';
import type { DocFaqItem } from '../types';

const CAT_LABEL: Record<DocFaqItem['category'], string> = { login: 'Giriş', quote: 'Teklif', workorder: 'İş Emri', sync: 'Senkronizasyon', pdf: 'PDF', notification: 'Bildirim', general: 'Genel' };
const CAT_COLOR: Record<DocFaqItem['category'], string> = { login: '#ef4444', quote: '#f59e0b', workorder: '#06b6d4', sync: '#3b82f6', pdf: '#a855f7', notification: '#ec4899', general: '#22c55e' };

export default function DocFaqScreen() {
  const [items, setItems] = useState<DocFaqItem[]>([]);
  const [filter, setFilter] = useState<DocFaqItem['category'] | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { (async () => setItems(await listDocFaq()))(); }, []));

  const filtered = useMemo(() => filter === 'all' ? items : items.filter(i => i.category === filter), [items, filter]);
  const categories = useMemo(() => Array.from(new Set(items.map(i => i.category))), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="help-buoy" size={48} color="#f59e0b" />
          <Text style={s.heroT}>Sık Karşılaşılan Hatalar ve Çözümler</Text>
          <Text style={s.heroD}>{items.length} kayıt • {categories.length} kategori</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <TouchableOpacity onPress={() => setFilter('all')} style={[s.chip, filter === 'all' && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }]}>
            <Text style={[s.chipT, filter === 'all' && { color: '#fff' }]}>Hepsi</Text>
          </TouchableOpacity>
          {categories.map(c => (
            <TouchableOpacity key={c} onPress={() => setFilter(c)} style={[s.chip, { borderColor: CAT_COLOR[c] }, filter === c && { backgroundColor: CAT_COLOR[c] }]}>
              <Text style={[s.chipT, { color: CAT_COLOR[c] }, filter === c && { color: '#fff' }]}>{CAT_LABEL[c]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filtered.map(item => {
          const open = expanded === item.id;
          return (
            <TouchableOpacity key={item.id} activeOpacity={0.85} onPress={() => setExpanded(open ? null : item.id)} style={[s.card, { borderLeftColor: CAT_COLOR[item.category] }]}>
              <View style={s.headRow}>
                <View style={[s.catPill, { backgroundColor: CAT_COLOR[item.category] + '33', borderColor: CAT_COLOR[item.category] }]}>
                  <Text style={[s.catT, { color: CAT_COLOR[item.category] }]}>{CAT_LABEL[item.category]}</Text>
                </View>
                <View style={s.helpBadge}>
                  <Ionicons name="thumbs-up" size={11} color="#22c55e" />
                  <Text style={s.helpT}>{item.helpfulCount}</Text>
                </View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.muted} />
              </View>
              <Text style={s.q}>{item.question}</Text>
              {open && <Text style={s.a}>{item.answer}</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#f59e0b', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipT: { fontSize: typography.xs, fontWeight: '700', color: colors.text.primary },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  catPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  catT: { fontSize: 10, fontWeight: '800' },
  helpBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  helpT: { color: '#22c55e', fontSize: typography.xs, fontWeight: '700' },
  q: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  a: { color: colors.text.muted, fontSize: typography.xs, lineHeight: 18, backgroundColor: colors.bg.primary, padding: 8, borderRadius: 6 },
});
