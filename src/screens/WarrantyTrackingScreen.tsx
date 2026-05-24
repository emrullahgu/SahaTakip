// Faz 46 — WarrantyTrackingScreen
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { EqAsset } from '../types';
import { listEqAssets, EQ_TYPE_COLOR, EQ_TYPE_ICON, EQ_TYPE_LABEL } from '../services/equipment';

type Filter = 'all' | 'expired' | 'soon' | 'ok';

const daysBetween = (a: number, b: number) => Math.round((a - b) / 86400000);

const warrantyStatus = (a: EqAsset): { label: string; color: string; days: number; kind: Filter } => {
  if (!a.warrantyUntil) return { label: 'Garanti yok', color: '#64748b', days: 0, kind: 'expired' };
  const d = daysBetween(new Date(a.warrantyUntil).getTime(), Date.now());
  if (d < 0) return { label: `${-d} gün önce doldu`, color: '#ef4444', days: d, kind: 'expired' };
  if (d <= 60) return { label: `${d} gün kaldı`, color: '#f59e0b', days: d, kind: 'soon' };
  return { label: `${d} gün kaldı`, color: '#22c55e', days: d, kind: 'ok' };
};

export default function WarrantyTrackingScreen() {
  const [items, setItems] = useState<EqAsset[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => { setItems(await listEqAssets()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const annotated = useMemo(() => items.map(a => ({ a, w: warrantyStatus(a) })), [items]);
  const filtered = useMemo(() => filter === 'all' ? annotated : annotated.filter(x => x.w.kind === filter), [annotated, filter]);
  const counts = useMemo(() => ({
    expired: annotated.filter(x => x.w.kind === 'expired').length,
    soon: annotated.filter(x => x.w.kind === 'soon').length,
    ok: annotated.filter(x => x.w.kind === 'ok').length,
  }), [annotated]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.summary}>
        <TouchableOpacity style={[s.sumC, { backgroundColor: '#ef444433' }, filter === 'expired' && { borderColor: '#ef4444', borderWidth: 2 }]} onPress={() => setFilter(filter === 'expired' ? 'all' : 'expired')}>
          <Text style={s.sumV}>{counts.expired}</Text>
          <Text style={s.sumL}>Süresi dolan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.sumC, { backgroundColor: '#f59e0b33' }, filter === 'soon' && { borderColor: '#f59e0b', borderWidth: 2 }]} onPress={() => setFilter(filter === 'soon' ? 'all' : 'soon')}>
          <Text style={s.sumV}>{counts.soon}</Text>
          <Text style={s.sumL}>Yaklaşan (60g)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.sumC, { backgroundColor: '#22c55e33' }, filter === 'ok' && { borderColor: '#22c55e', borderWidth: 2 }]} onPress={() => setFilter(filter === 'ok' ? 'all' : 'ok')}>
          <Text style={s.sumV}>{counts.ok}</Text>
          <Text style={s.sumL}>Garantide</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={x => x.a.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: item.w.color }]}>
            <View style={[s.icon, { backgroundColor: EQ_TYPE_COLOR[item.a.type] + '33' }]}>
              <Ionicons name={EQ_TYPE_ICON[item.a.type] as any} size={22} color={EQ_TYPE_COLOR[item.a.type]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{item.a.code} · {item.a.name}</Text>
              <Text style={s.meta}>{EQ_TYPE_LABEL[item.a.type]} · {item.a.brand} {item.a.model}</Text>
              <Text style={s.meta}>{item.a.warrantyUntil ? `Garanti bitiş: ${new Date(item.a.warrantyUntil).toLocaleDateString('tr-TR')}` : 'Garanti tarihi yok'}</Text>
              {item.a.serviceUntil && <Text style={s.meta}>Servis sözleşmesi: {new Date(item.a.serviceUntil).toLocaleDateString('tr-TR')}</Text>}
            </View>
            <View style={[s.daysBox, { backgroundColor: item.w.color }]}>
              <Text style={s.daysT}>{item.w.label}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>Eşleşen kayıt yok.</Text>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  summary: { flexDirection: 'row', gap: 6, padding: spacing.md, paddingBottom: 4 },
  sumC: { flex: 1, padding: 10, borderRadius: radius.sm, alignItems: 'center', borderWidth: 0 },
  sumV: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '800' },
  sumL: { color: colors.text.muted, fontSize: typography.xs },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  daysBox: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, maxWidth: 100 },
  daysT: { color: '#fff', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
});
