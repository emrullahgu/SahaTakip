// Faz 46 — EnergyAssetTypesScreen (POZ-DEV-169)
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { EqAsset, EqAssetType } from '../types';
import { listEqAssets, EQ_TYPE_COLOR, EQ_TYPE_ICON, EQ_TYPE_LABEL } from '../services/equipment';

const TYPES: { key: EqAssetType; desc: string }[] = [
  { key: 'transformer', desc: 'Yüksek gerilimi alçak gerilime dönüştüren cihazlar' },
  { key: 'panel', desc: 'Dağıtım/üretim/kontrol panoları' },
  { key: 'meter', desc: 'Elektrik tüketim ve üretim sayaçları' },
  { key: 'inverter', desc: 'GES ve UPS DC↔AC çeviriciler' },
  { key: 'ups', desc: 'Kesintisiz güç kaynakları' },
  { key: 'generator', desc: 'Yedek jeneratörler' },
  { key: 'compensation', desc: 'Reaktif güç kompanzasyon panoları' },
  { key: 'cable', desc: 'Enerji kabloları ve hatları' },
  { key: 'other', desc: 'Diğer enerji ekipmanları' },
];

export default function EnergyAssetTypesScreen() {
  const nav = useNavigation<any>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 3 : 2;
  const [items, setItems] = useState<EqAsset[]>([]);

  const load = useCallback(async () => { setItems(await listEqAssets()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const counts = useMemo(() => {
    const m: Record<EqAssetType, number> = { transformer: 0, panel: 0, meter: 0, inverter: 0, ups: 0, generator: 0, compensation: 0, cable: 0, other: 0 };
    items.forEach(a => { m[a.type] = (m[a.type] || 0) + 1; });
    return m;
  }, [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.summary}>
          <Text style={s.sumV}>{items.length}</Text>
          <Text style={s.sumL}>Kayıtlı enerji ekipmanı</Text>
        </View>
        <View style={s.grid}>
          {TYPES.map(t => (
            <TouchableOpacity key={t.key} style={[s.card, { width: `${100 / cols - 1}%` as any, borderColor: EQ_TYPE_COLOR[t.key] }]}
              onPress={() => nav.navigate('AssetList')}>
              <View style={[s.icon, { backgroundColor: EQ_TYPE_COLOR[t.key] + '33' }]}>
                <Ionicons name={EQ_TYPE_ICON[t.key] as any} size={28} color={EQ_TYPE_COLOR[t.key]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{EQ_TYPE_LABEL[t.key]}</Text>
                <Text style={s.desc} numberOfLines={2}>{t.desc}</Text>
              </View>
              <View style={[s.countBox, { backgroundColor: EQ_TYPE_COLOR[t.key] }]}>
                <Text style={s.countT}>{counts[t.key]}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.md },
  summary: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bg.secondary, alignItems: 'center', borderWidth: 1, borderColor: colors.border.primary },
  sumV: { color: colors.text.primary, fontSize: 32, fontWeight: '800' },
  sumL: { color: colors.text.muted, fontSize: typography.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any, rowGap: spacing.sm },
  card: { padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  desc: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  countBox: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, minWidth: 36, alignItems: 'center' },
  countT: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});
