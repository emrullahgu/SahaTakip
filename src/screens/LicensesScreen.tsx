// LicensesScreen — Faz 40
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { LicenseRecord } from '../types';
import { listLicenses, listTenants, PLAN_LABEL, PLAN_COLOR } from '../services/platform';

export default function LicensesScreen() {
  const [items, setItems] = useState<LicenseRecord[]>([]);
  const [tNames, setTNames] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    setItems(await listLicenses());
    const ts = await listTenants();
    setTNames(Object.fromEntries(ts.map(t => [t.id, t.name])));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 60 }}
        ListEmptyComponent={<Text style={s.empty}>Lisans yok.</Text>}
        renderItem={({ item }) => {
          const daysLeft = Math.ceil((new Date(item.endsAt).getTime() - Date.now()) / 86400000);
          const expiring = daysLeft < 30;
          return (
            <View style={[s.card, { borderLeftColor: item.active ? (expiring ? '#f59e0b' : '#22c55e') : '#ef4444' }]}>
              <View style={s.row}>
                <Ionicons name="shield-checkmark-outline" size={20} color={item.active ? '#22c55e' : '#ef4444'} />
                <View style={{ flex: 1 }}>
                  <Text style={s.n}>{tNames[item.tenantId] || item.tenantId}</Text>
                  <Text style={s.sub}>{item.seats} koltuk · {new Date(item.startsAt).toLocaleDateString('tr-TR')} → {new Date(item.endsAt).toLocaleDateString('tr-TR')}</Text>
                </View>
                <View style={[s.b, { backgroundColor: PLAN_COLOR[item.plan] }]}>
                  <Text style={s.bT}>{PLAN_LABEL[item.plan]}</Text>
                </View>
              </View>
              <Text style={[s.days, { color: expiring ? '#f59e0b' : colors.text.muted }]}>
                {daysLeft > 0 ? `${daysLeft} gün kaldı` : 'Süresi doldu'}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  b: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  bT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  days: { fontSize: typography.xs, marginTop: 6, textAlign: 'right' },
});
