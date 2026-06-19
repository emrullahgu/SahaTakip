// ModulesScreen — Faz 40
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { AppModule } from '../types';
import { listModules, toggleModule, PLAN_LABEL, PLAN_COLOR } from '../services/platform';

const CAT_COLOR: Record<AppModule['category'], string> = {
  core: '#0ea5e9', finance: '#22c55e', field: '#f59e0b', analytics: '#a855f7', integration: '#ec4899',
};
const CAT_LABEL: Record<AppModule['category'], string> = {
  core: 'Çekirdek', finance: 'Finans', field: 'Saha', analytics: 'Analitik', integration: 'Entegrasyon',
};

export default function ModulesScreen() {
  const [items, setItems] = useState<AppModule[]>([]);
  const load = useCallback(async () => { setItems(await listModules()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 60 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.row}>
              <View style={[s.cat, { backgroundColor: CAT_COLOR[item.category] }]}>
                <Text style={s.catT}>{CAT_LABEL[item.category]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{item.name}</Text>
                <Text style={s.sub}>{item.code}</Text>
              </View>
              <View style={[s.plan, { borderColor: PLAN_COLOR[item.requiredPlan] }]}>
                <Text style={[s.planT, { color: PLAN_COLOR[item.requiredPlan] }]}>{PLAN_LABEL[item.requiredPlan]}</Text>
              </View>
              <Switch value={item.enabled} onValueChange={async () => { await toggleModule(item.id); load(); }} />
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cat: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  plan: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  planT: { fontSize: 10, fontWeight: '800' },
});
