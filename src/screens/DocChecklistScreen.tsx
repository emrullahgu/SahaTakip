// Faz 54 — DocChecklistScreen (POZ-DEV-252)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listDocChecklist, listDocTrChars } from '../services/docs';
import type { DocChecklistItem, DocTrCharCheck } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const CAT_LABEL: Record<DocChecklistItem['category'], string> = { data: 'Veri', permission: 'Yetki', integration: 'Entegrasyon', training: 'Eğitim', translation: 'Türkçe' };
const CAT_COLOR: Record<DocChecklistItem['category'], string> = { data: '#3b82f6', permission: '#ef4444', integration: '#06b6d4', training: '#a855f7', translation: '#f59e0b' };

export default function DocChecklistScreen() {
  const [items, setItems] = useState<DocChecklistItem[]>([]);
  const [chars, setChars] = useState<DocTrCharCheck[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [c, t] = await Promise.all([listDocChecklist(), listDocTrChars()]);
      setItems(c);
      setChars(t);
    })();
  }, []));

  const stats = useMemo(() => ({
    total: items.length,
    done: items.filter(i => i.done).length,
    criticalOpen: items.filter(i => i.critical && !i.done).length,
    charsOk: chars.filter(c => c.ok).length,
    charsTotal: chars.length,
  }), [items, chars]);

  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <>
            <View style={s.heroCard}>
              <Ionicons name="checkbox" size={48} color="#3b82f6" />
              <Text style={s.heroT}>Canlı Kullanım Öncesi Kontrol</Text>
              <Text style={s.heroD}>Yayın öncesi eğitim ve kabul kontrolü</Text>
            </View>

            <View style={s.statRow}>
              <View style={[s.statBox, { borderColor: '#22c55e' }]}><Text style={[s.statV, { color: '#22c55e' }]}>%{progress}</Text><Text style={s.statL}>Tamamlanan</Text></View>
              <View style={[s.statBox, { borderColor: '#3b82f6' }]}><Text style={[s.statV, { color: '#3b82f6' }]}>{stats.done}/{stats.total}</Text><Text style={s.statL}>Madde</Text></View>
              <View style={[s.statBox, { borderColor: '#ef4444' }]}><Text style={[s.statV, { color: '#ef4444' }]}>{stats.criticalOpen}</Text><Text style={s.statL}>Kritik Açık</Text></View>
            </View>

            <Text style={s.sectionT}>Kontrol Maddeleri</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="checkbox-outline"
            title="Madde yok"
            subtitle="Henüz bir kontrol listesi maddesi tanımlanmadı."
          />
        }
        renderItem={({ item: i }) => (
          <View key={i.id} style={[s.card, { borderLeftColor: i.done ? '#22c55e' : i.critical ? '#ef4444' : '#f59e0b' }]}>
            <Ionicons name={i.done ? 'checkmark-circle' : i.critical ? 'alert-circle' : 'ellipse-outline'} size={22} color={i.done ? '#22c55e' : i.critical ? '#ef4444' : '#64748b'} />
            <View style={{ flex: 1 }}>
              <Text style={[s.itemT, i.done && { textDecorationLine: 'line-through', color: colors.text.muted }]}>{i.text}</Text>
              <View style={s.itemMetaRow}>
                <View style={[s.catPill, { backgroundColor: CAT_COLOR[i.category as keyof typeof CAT_COLOR] + '33', borderColor: CAT_COLOR[i.category as keyof typeof CAT_COLOR] }]}>
                  <Text style={[s.catT, { color: CAT_COLOR[i.category as keyof typeof CAT_COLOR] }]}>{CAT_LABEL[i.category as keyof typeof CAT_LABEL]}</Text>
                </View>
                {i.critical && (
                  <View style={[s.criticalTag, { borderColor: '#ef4444' }]}>
                    <Ionicons name="flag" size={10} color="#ef4444" />
                    <Text style={[s.criticalT]}>Kritik</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <>
            <Text style={s.sectionT}>Türkçe Karakter Kontrolleri ({stats.charsOk}/{stats.charsTotal} OK)</Text>
            {chars.map(c => (
              <View key={c.id} style={[s.charCard, { borderLeftColor: c.ok ? '#22c55e' : '#ef4444' }]}>
                <Ionicons name={c.ok ? 'checkmark-circle' : 'close-circle'} size={18} color={c.ok ? '#22c55e' : '#ef4444'} />
                <Text style={s.charFile} numberOfLines={1}>{c.file}</Text>
                <Text style={s.charMeta}>{c.total} string{c.issues > 0 ? ` • ${c.issues} sorun` : ''}</Text>
              </View>
            ))}
          </>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#3b82f6', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  statV: { fontSize: typography.md, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  itemT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  catPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  catT: { fontSize: 10, fontWeight: '800' },
  criticalTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  criticalT: { color: '#ef4444', fontSize: 10, fontWeight: '700' },
  charCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg.secondary, paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 3 },
  charFile: { color: colors.text.primary, fontSize: typography.xs, fontFamily: 'monospace' as any, flex: 1 },
  charMeta: { color: colors.text.muted, fontSize: 10 },
});
