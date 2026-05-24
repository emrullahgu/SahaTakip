// Faz 49 — SecClassificationScreen (POZ-DEV-191)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listSecClassification, SEC_SENS_LABEL, SEC_SENS_COLOR } from '../services/secCenter';
import type { SecClassificationItem, SecSensitivity } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const SENS_ORDER: SecSensitivity[] = ['phi', 'pii', 'confidential', 'internal', 'public'];

export default function SecClassificationScreen() {
  const [list, setList] = useState<SecClassificationItem[]>([]);
  const [filter, setFilter] = useState<SecSensitivity | 'all'>('all');

  useFocusEffect(useCallback(() => { (async () => setList(await listSecClassification()))(); }, []));

  const counts = useMemo(() => {
    const c: Record<SecSensitivity, number> = { public: 0, internal: 0, confidential: 0, pii: 0, phi: 0 };
    list.forEach(i => { c[i.sensitivity]++; });
    return c;
  }, [list]);

  const filtered = filter === 'all' ? list : list.filter(i => i.sensitivity === filter);
  const encryptedCount = list.filter(i => i.encrypted).length;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <>
            <View style={s.summary}>
              <View style={s.sumBox}>
                <Text style={s.sumV}>{list.length}</Text>
                <Text style={s.sumL}>Etiketli Alan</Text>
              </View>
              <View style={[s.sumBox, { backgroundColor: '#22c55e22' }]}>
                <Text style={[s.sumV, { color: '#22c55e' }]}>{encryptedCount}</Text>
                <Text style={s.sumL}>Şifreli</Text>
              </View>
            </View>

            <View style={s.legend}>
              {SENS_ORDER.map(k => (
                <TouchableOpacity key={k} style={[s.legendBox, { borderColor: SEC_SENS_COLOR[k as keyof typeof SEC_SENS_COLOR] }, filter === k && { backgroundColor: SEC_SENS_COLOR[k as keyof typeof SEC_SENS_COLOR] + '33' }]} onPress={() => setFilter(filter === k ? 'all' : k)}>
                  <View style={[s.dot, { backgroundColor: SEC_SENS_COLOR[k as keyof typeof SEC_SENS_COLOR] }]} />
                  <Text style={s.legendT}>{SEC_SENS_LABEL[k as keyof typeof SEC_SENS_LABEL]}</Text>
                  <Text style={[s.legendC, { color: SEC_SENS_COLOR[k as keyof typeof SEC_SENS_COLOR] }]}>{counts[k as keyof typeof counts]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="shield-outline"
            title="Sınıflandırma yok"
            subtitle="Henüz hassas veri sınıflandırması yapılmadı."
          />
        }
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: SEC_SENS_COLOR[item.sensitivity as keyof typeof SEC_SENS_COLOR] }]}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.field}>{item.field}</Text>
                <Text style={s.table}>{item.table}</Text>
                {item.description && <Text style={s.desc}>{item.description}</Text>}
              </View>
              <View style={s.right}>
                <View style={[s.pill, { backgroundColor: SEC_SENS_COLOR[item.sensitivity as keyof typeof SEC_SENS_COLOR] + '33', borderColor: SEC_SENS_COLOR[item.sensitivity as keyof typeof SEC_SENS_COLOR] }]}>
                  <Text style={[s.pillT, { color: SEC_SENS_COLOR[item.sensitivity as keyof typeof SEC_SENS_COLOR] }]}>{SEC_SENS_LABEL[item.sensitivity as keyof typeof SEC_SENS_LABEL]}</Text>
                </View>
                <Text style={s.count}>{item.recordCount.toLocaleString('tr-TR')} kayıt</Text>
                <View style={s.encRow}>
                  <Ionicons name={item.encrypted ? 'lock-closed' : 'lock-open'} size={12} color={item.encrypted ? '#22c55e' : '#ef4444'} />
                  <Text style={[s.encT, { color: item.encrypted ? '#22c55e' : '#ef4444' }]}>
                    {item.encrypted ? 'Şifreli' : 'Düz metin'}
                  </Text>
                </View>
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
  summary: { flexDirection: 'row', gap: spacing.sm },
  sumBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border.primary },
  sumV: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  sumL: { color: colors.text.muted, fontSize: typography.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, backgroundColor: colors.bg.secondary },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  legendC: { fontSize: typography.xs, fontWeight: '800' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  field: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  table: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  desc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4, fontStyle: 'italic' },
  right: { alignItems: 'flex-end', gap: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  count: { color: colors.text.muted, fontSize: typography.xs },
  encRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  encT: { fontSize: typography.xs, fontWeight: '700' },
});
