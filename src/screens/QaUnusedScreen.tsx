// Faz 52 — QaUnusedScreen (POZ-DEV-224)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listQaUnusedFiles } from '../services/codeQuality';
import type { QaUnusedFile } from '../types';

const KIND_LABEL: Record<QaUnusedFile['kind'], string> = { component: 'Component', hook: 'Hook', service: 'Servis', util: 'Util', screen: 'Ekran', type: 'Tip' };
const KIND_COLOR: Record<QaUnusedFile['kind'], string> = { component: '#0ea5e9', hook: '#a855f7', service: '#22c55e', util: '#f59e0b', screen: '#ec4899', type: '#3b82f6' };
const KIND_ICON: Record<QaUnusedFile['kind'], string> = { component: 'cube', hook: 'link', service: 'server', util: 'construct', screen: 'phone-portrait', type: 'code' };

export default function QaUnusedScreen() {
  const [items, setItems] = useState<QaUnusedFile[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listQaUnusedFiles()))(); }, []));

  const stats = useMemo(() => ({
    total: items.length,
    removable: items.filter(i => i.removable).length,
    totalKb: items.reduce((a, b) => a + b.sizeKb, 0),
  }), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="trash" size={48} color="#f59e0b" />
          <Text style={s.heroT}>Kullanılmayan Kod</Text>
          <Text style={s.heroD}>{stats.total} dosya • {stats.removable} silinebilir • toplam {stats.totalKb.toFixed(1)} KB</Text>
        </View>

        {items.map(f => (
          <View key={f.id} style={[s.card, { borderLeftColor: f.removable ? '#ef4444' : '#f59e0b' }]}>
            <View style={s.headRow}>
              <Ionicons name={KIND_ICON[f.kind] as any} size={20} color={KIND_COLOR[f.kind]} />
              <View style={{ flex: 1 }}>
                <Text style={s.path}>{f.path}</Text>
                <Text style={s.meta}>{f.sizeKb.toFixed(1)} KB • Son değişiklik: {new Date(f.lastModified).toLocaleDateString('tr-TR')}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: KIND_COLOR[f.kind] + '33', borderColor: KIND_COLOR[f.kind] }]}>
                <Text style={[s.pillT, { color: KIND_COLOR[f.kind] }]}>{KIND_LABEL[f.kind]}</Text>
              </View>
            </View>
            <View style={[s.tag, { borderColor: f.removable ? '#ef4444' : '#f59e0b' }]}>
              <Ionicons name={f.removable ? 'trash-bin' : 'alert-circle'} size={11} color={f.removable ? '#ef4444' : '#f59e0b'} />
              <Text style={[s.tagT, { color: f.removable ? '#ef4444' : '#f59e0b' }]}>{f.removable ? 'Silinebilir' : 'Manuel inceleme gerekli'}</Text>
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
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#f59e0b', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  path: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', fontFamily: 'monospace' as any },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: 10, fontWeight: '800' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  tagT: { fontSize: 10, fontWeight: '700' },
});
