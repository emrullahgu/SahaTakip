// Faz 50 — SaasIsolationScreen (POZ-DEV-202)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listSaasIsolation } from '../services/saas';
import type { SaasIsolationCheck } from '../types';

const SCOPE_LABEL: Record<SaasIsolationCheck['scope'], string> = { tenant: 'Firma', user: 'Kullanıcı', global: 'Global' };
const SCOPE_COLOR: Record<SaasIsolationCheck['scope'], string> = { tenant: '#0ea5e9', user: '#a855f7', global: '#64748b' };
const POLICY_LABEL: Record<SaasIsolationCheck['policy'], string> = { rls: 'RLS (DB)', app: 'Uygulama', none: 'Yok' };
const POLICY_COLOR: Record<SaasIsolationCheck['policy'], string> = { rls: '#22c55e', app: '#f59e0b', none: '#64748b' };

export default function SaasIsolationScreen() {
  const [items, setItems] = useState<SaasIsolationCheck[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listSaasIsolation()))(); }, []));

  const stats = useMemo(() => ({
    total: items.length,
    ok: items.filter(i => i.ok).length,
    fail: items.filter(i => !i.ok).length,
    leaked: items.reduce((a, i) => a + i.rowsLeaked, 0),
  }), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="shield-half" size={48} color="#22c55e" />
          <Text style={s.heroT}>Veri İzolasyon Kontrolü</Text>
          <Text style={s.heroD}>Firma bazlı veri ayrımının her tabloda doğru çalıştığı kontrol edilir.</Text>
        </View>

        <View style={s.statRow}>
          <View style={s.statBox}><Text style={s.statV}>{stats.total}</Text><Text style={s.statL}>Tablo</Text></View>
          <View style={[s.statBox, { borderColor: '#22c55e' }]}><Text style={[s.statV, { color: '#22c55e' }]}>{stats.ok}</Text><Text style={s.statL}>Temiz</Text></View>
          <View style={[s.statBox, { borderColor: '#ef4444' }]}><Text style={[s.statV, { color: '#ef4444' }]}>{stats.fail}</Text><Text style={s.statL}>Sorun</Text></View>
          <View style={[s.statBox, { borderColor: '#f59e0b' }]}><Text style={[s.statV, { color: '#f59e0b' }]}>{stats.leaked}</Text><Text style={s.statL}>Sızıntı</Text></View>
        </View>

        {items.map(i => (
          <View key={i.id} style={[s.card, { borderLeftColor: i.ok ? '#22c55e' : '#ef4444' }]}>
            <View style={s.headRow}>
              <Ionicons name={i.ok ? 'checkmark-circle' : 'alert-circle'} size={20} color={i.ok ? '#22c55e' : '#ef4444'} />
              <Text style={s.tableT}>{i.table}</Text>
              <View style={{ flex: 1 }} />
              <View style={[s.pill, { backgroundColor: SCOPE_COLOR[i.scope] + '33', borderColor: SCOPE_COLOR[i.scope] }]}>
                <Text style={[s.pillT, { color: SCOPE_COLOR[i.scope] }]}>{SCOPE_LABEL[i.scope]}</Text>
              </View>
            </View>
            <View style={s.metaRow}>
              <View style={[s.pill, { backgroundColor: POLICY_COLOR[i.policy] + '33', borderColor: POLICY_COLOR[i.policy] }]}>
                <Text style={[s.pillT, { color: POLICY_COLOR[i.policy] }]}>{POLICY_LABEL[i.policy]}</Text>
              </View>
              <Text style={[s.metaT, i.rowsLeaked > 0 && { color: '#ef4444', fontWeight: '700' }]}>
                Sızıntı: {i.rowsLeaked} satır
              </Text>
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
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#22c55e', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center' },
  statV: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tableT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaT: { color: colors.text.muted, fontSize: typography.xs },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
});
