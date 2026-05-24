// Faz 52 — QaApiErrorsScreen (POZ-DEV-226)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listQaApiErrors, toggleQaApiRule } from '../services/codeQuality';
import type { QaApiErrorRule } from '../types';

const CAT_LABEL: Record<QaApiErrorRule['category'], string> = { network: 'Ağ', auth: 'Yetki', validation: 'Doğrulama', server: 'Sunucu', timeout: 'Zaman Aşımı' };
const CAT_COLOR: Record<QaApiErrorRule['category'], string> = { network: '#f59e0b', auth: '#ef4444', validation: '#3b82f6', server: '#a855f7', timeout: '#ec4899' };

export default function QaApiErrorsScreen() {
  const [items, setItems] = useState<QaApiErrorRule[]>([]);
  const load = useCallback(async () => setItems(await listQaApiErrors()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="cloud-offline" size={48} color="#a855f7" />
          <Text style={s.heroT}>API Hata Yönetimi</Text>
          <Text style={s.heroD}>Standart hata mesajları, yeniden deneme stratejisi ve kategorize raporlama</Text>
        </View>

        {items.map(r => (
          <View key={r.id} style={[s.card, { borderLeftColor: CAT_COLOR[r.category], opacity: r.enabled ? 1 : 0.55 }]}>
            <View style={s.headRow}>
              <View style={[s.pill, { backgroundColor: CAT_COLOR[r.category] + '33', borderColor: CAT_COLOR[r.category] }]}>
                <Text style={[s.pillT, { color: CAT_COLOR[r.category] }]}>{CAT_LABEL[r.category]}</Text>
              </View>
              <View style={{ flex: 1 }} />
              <Switch value={r.enabled} onValueChange={() => toggleQaApiRule(r.id).then(load)} />
            </View>
            <Text style={s.pattern}>{r.pattern}</Text>
            <Text style={s.userMsg}>{r.userMessage}</Text>
            <View style={s.metaRow}>
              <View style={[s.tag, { borderColor: r.retryable ? '#22c55e' : '#64748b' }]}>
                <Ionicons name={r.retryable ? 'refresh' : 'remove'} size={11} color={r.retryable ? '#22c55e' : '#64748b'} />
                <Text style={[s.tagT, { color: r.retryable ? '#22c55e' : '#64748b' }]}>{r.retryable ? 'Yeniden Dene' : 'Tek Seferlik'}</Text>
              </View>
              <Text style={s.hits}>{r.hits.toLocaleString('tr-TR')} olay</Text>
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
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#a855f7', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  pattern: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', fontFamily: 'monospace' as any },
  userMsg: { color: colors.text.muted, fontSize: typography.xs, fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tagT: { fontSize: 10, fontWeight: '700' },
  hits: { color: colors.text.muted, fontSize: typography.xs, marginLeft: 'auto', fontWeight: '700' },
});
