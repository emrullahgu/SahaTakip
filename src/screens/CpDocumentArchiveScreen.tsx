// Faz 48 — CpDocumentArchiveScreen (POZ-DEV-186)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listCpDocuments, CP_DOC_LABEL, CP_DOC_ICON, CP_DOC_COLOR } from '../services/customerPortal';
import type { CpDocumentItem, CpDocumentKind } from '../types';

const KINDS: (CpDocumentKind | 'all')[] = ['all', 'invoice', 'quote', 'report', 'photo', 'contract', 'certificate'];

export default function CpDocumentArchiveScreen() {
  const [list, setList] = useState<CpDocumentItem[]>([]);
  const [filter, setFilter] = useState<CpDocumentKind | 'all'>('all');
  useFocusEffect(useCallback(() => { (async () => setList(await listCpDocuments()))(); }, []));

  const filtered = useMemo(() => list.filter(d => filter === 'all' || d.kind === filter), [list, filter]);
  const unread = list.filter(d => d.unread).length;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.summary}>
          <View style={s.sumBox}>
            <Text style={s.sumV}>{list.length}</Text>
            <Text style={s.sumL}>Toplam</Text>
          </View>
          <View style={[s.sumBox, { backgroundColor: '#ef444433' }]}>
            <Text style={[s.sumV, { color: '#ef4444' }]}>{unread}</Text>
            <Text style={s.sumL}>Okunmamış</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {KINDS.map(k => (
            <TouchableOpacity key={k} style={[s.chip, filter === k && { backgroundColor: '#0ea5e9' }]} onPress={() => setFilter(k)}>
              <Text style={[s.chipT, filter === k && { color: '#fff' }]}>{k === 'all' ? 'Tümü' : CP_DOC_LABEL[k]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filtered.map(d => (
          <TouchableOpacity key={d.id} style={s.card}>
            <View style={[s.iconBox, { backgroundColor: CP_DOC_COLOR[d.kind] + '22', borderColor: CP_DOC_COLOR[d.kind] }]}>
              <Ionicons name={CP_DOC_ICON[d.kind] as any} size={20} color={CP_DOC_COLOR[d.kind]} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.row}>
                <Text style={[s.title, d.unread && { fontWeight: '800' }]}>{d.title}</Text>
                {d.unread && <View style={s.dot} />}
              </View>
              <Text style={s.meta}>{CP_DOC_LABEL[d.kind]} · {d.sizeKb > 1024 ? `${(d.sizeKb / 1024).toFixed(1)} MB` : `${d.sizeKb} KB`} · {new Date(d.uploadedAt).toLocaleDateString('tr-TR')}</Text>
            </View>
            <Ionicons name="download" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  summary: { flexDirection: 'row', gap: spacing.sm },
  sumBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border.primary },
  sumV: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  sumL: { color: colors.text.muted, fontSize: typography.xs },
  chips: { gap: spacing.xs, paddingVertical: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  iconBox: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});
