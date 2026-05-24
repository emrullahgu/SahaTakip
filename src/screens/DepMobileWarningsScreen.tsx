// Faz 51 — DepMobileWarningsScreen (POZ-DEV-219)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listDepErrors } from '../services/deploy';
import type { DepBuildError } from '../types';

const SEV_COLOR: Record<DepBuildError['severity'], string> = { error: '#ef4444', warning: '#f59e0b' };
const CAT_LABEL: Record<DepBuildError['category'], string> = { typescript: 'TypeScript', lint: 'Lint', dependency: 'Bağımlılık', config: 'Yapılandırma', asset: 'Asset' };

export default function DepMobileWarningsScreen() {
  const [items, setItems] = useState<DepBuildError[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listDepErrors()))(); }, []));

  const mobileItems = useMemo(() => items.filter(i => i.platform === 'mobile'), [items]);
  const stats = useMemo(() => ({
    total: mobileItems.length,
    open: mobileItems.filter(i => !i.fixed).length,
    error: mobileItems.filter(i => i.severity === 'error').length,
  }), [mobileItems]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="phone-portrait" size={48} color="#10b981" />
          <Text style={s.heroT}>Mobil Platform Uyarıları</Text>
          <Text style={s.heroD}>{stats.total} kayıt • {stats.open} açık • {stats.error} hata</Text>
        </View>

        {mobileItems.map(e => (
          <View key={e.id} style={[s.card, { borderLeftColor: e.fixed ? '#22c55e' : SEV_COLOR[e.severity], opacity: e.fixed ? 0.6 : 1 }]}>
            <View style={s.headRow}>
              <Ionicons name={e.fixed ? 'checkmark-done-circle' : (e.severity === 'error' ? 'close-circle' : 'warning')} size={20} color={e.fixed ? '#22c55e' : SEV_COLOR[e.severity]} />
              <View style={{ flex: 1 }}>
                <Text style={s.code}>{e.file.split('/').pop()}:{e.line}</Text>
                <Text style={s.msg}>{e.message}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: SEV_COLOR[e.severity] + '33', borderColor: SEV_COLOR[e.severity] }]}>
                <Text style={[s.pillT, { color: SEV_COLOR[e.severity] }]}>{CAT_LABEL[e.category]}</Text>
              </View>
            </View>
            <Text style={s.file}>{e.file}</Text>
          </View>
        ))}

        {mobileItems.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
            <Text style={s.emptyT}>Mobil platformda uyarı yok</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#10b981', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 4 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  code: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800', fontFamily: 'monospace' as any },
  msg: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  file: { color: '#0ea5e9', fontSize: typography.xs, fontFamily: 'monospace' as any },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  empty: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  emptyT: { color: colors.text.muted, fontSize: typography.sm },
});
