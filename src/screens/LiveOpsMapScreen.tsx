// Faz 44 — LiveOpsMapScreen
import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { LiveOpsEntity, LiveOpsEntityKind } from '../types';
import { listEntities, ENTITY_COLOR, ENTITY_ICON, ENTITY_LABEL } from '../services/liveOps';

const KINDS: (LiveOpsEntityKind | 'all')[] = ['all', 'personnel', 'vehicle', 'job', 'site'];

export default function LiveOpsMapScreen() {
  const [items, setItems] = useState<LiveOpsEntity[]>([]);
  const [filter, setFilter] = useState<LiveOpsEntityKind | 'all'>('all');
  const load = useCallback(async () => { setItems(await listEntities()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = filter === 'all' ? items : items.filter(e => e.kind === filter);
  const bounds = useMemo(() => {
    if (items.length === 0) return null;
    const lats = items.map(i => i.lat);
    const lngs = items.map(i => i.lng);
    return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLng: Math.min(...lngs), maxLng: Math.max(...lngs) };
  }, [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.filterRow}>
        {KINDS.map(k => (
          <TouchableOpacity key={k} style={[s.fBtn, filter === k && { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' }]} onPress={() => setFilter(k)}>
            <Text style={[s.fT, filter === k && { color: '#fff' }]}>{k === 'all' ? 'Tümü' : ENTITY_LABEL[k]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {bounds && (
        <View style={s.mapBox}>
          <Text style={s.mapH}>Konum Yoğunluğu</Text>
          <View style={s.canvas}>
            {filtered.map(e => {
              const x = ((e.lng - bounds.minLng) / Math.max(0.001, bounds.maxLng - bounds.minLng)) * 100;
              const y = (1 - (e.lat - bounds.minLat) / Math.max(0.001, bounds.maxLat - bounds.minLat)) * 100;
              return (
                <View key={e.id} style={[s.dot, { left: `${x}%`, top: `${y}%`, backgroundColor: ENTITY_COLOR[e.kind] }]}>
                  <Ionicons name={ENTITY_ICON[e.kind] as any} size={10} color="#fff" />
                </View>
              );
            })}
          </View>
          <Text style={s.mapSub}>{filtered.length} canlı varlık</Text>
        </View>
      )}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: ENTITY_COLOR[item.kind] }]}>
            <Ionicons name={ENTITY_ICON[item.kind] as any} size={20} color={ENTITY_COLOR[item.kind]} />
            <View style={{ flex: 1 }}>
              <Text style={s.n}>{item.name}</Text>
              <Text style={s.k}>{ENTITY_LABEL[item.kind]}{item.status ? ` · ${item.status}` : ''}</Text>
              <Text style={s.c}>{item.lat.toFixed(4)}, {item.lng.toFixed(4)}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: spacing.sm },
  fBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  fT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  mapBox: { margin: spacing.md, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  mapH: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  canvas: { height: 180, marginVertical: spacing.sm, backgroundColor: '#0f172a', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, position: 'relative', overflow: 'hidden' },
  dot: { position: 'absolute', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginTop: -10, borderWidth: 1, borderColor: '#fff' },
  mapSub: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  k: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  c: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
});
