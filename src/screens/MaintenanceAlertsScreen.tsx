// Faz 46 — MaintenanceAlertsScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { EqAsset, EqMaintenancePlan } from '../types';
import { listEqAssets, upcomingEqPlans } from '../services/equipment';

const WINDOWS = [7, 14, 30, 60];

export default function MaintenanceAlertsScreen() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<EqMaintenancePlan[]>([]);
  const [assets, setAssets] = useState<EqAsset[]>([]);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    const [a, p] = await Promise.all([listEqAssets(), upcomingEqPlans(days)]);
    setAssets(a);
    setItems(p);
  }, [days]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const assetName = (id: string) => {
    const a = assets.find(x => x.id === id);
    return a ? `${a.code} · ${a.name}` : id;
  };

  const overdue = items.filter(i => new Date(i.nextDueAt).getTime() < Date.now()).length;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.alertBanner}>
        <Ionicons name="alert-circle" size={20} color="#f97316" />
        <Text style={s.alertT}>{overdue > 0 ? `${overdue} bakım gecikmiş` : 'Gecikmiş bakım yok'}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {WINDOWS.map(w => (
          <TouchableOpacity key={w} onPress={() => setDays(w)} style={[s.chip, days === w && s.chipOn]}>
            <Text style={[s.chipT, days === w && s.chipTOn]}>Sonraki {w} gün</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => {
          const d = Math.round((new Date(item.nextDueAt).getTime() - Date.now()) / 86400000);
          const c = d < 0 ? '#ef4444' : d <= 7 ? '#f59e0b' : '#eab308';
          return (
            <TouchableOpacity style={[s.card, { borderLeftColor: c }]} onPress={() => nav.navigate('AssetMaintenanceHistory', { assetId: item.assetId })}>
              <View style={[s.icon, { backgroundColor: c + '33' }]}>
                <Ionicons name={d < 0 ? 'alert' : 'time'} size={22} color={c} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{item.taskDescription}</Text>
                <Text style={s.meta}>{assetName(item.assetId)}</Text>
                <Text style={[s.meta, { color: c }]}>{d < 0 ? `${-d} gün gecikmiş` : `${d} gün kaldı`} · {item.owner}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={s.empty}>Bu pencerede planlanmış bakım yok.</Text>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, margin: spacing.md, marginBottom: 4, backgroundColor: '#f9731622', borderRadius: radius.sm, borderLeftWidth: 4, borderLeftColor: '#f97316' },
  alertT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  chips: { padding: spacing.sm, gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.bg.secondary, borderRadius: 14, marginRight: 4, borderWidth: 1, borderColor: colors.border.primary },
  chipOn: { backgroundColor: '#f97316', borderColor: '#f97316' },
  chipT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  chipTOn: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
});
