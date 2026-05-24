// PackagesScreen — Faz 40
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { PACKAGE_DEFINITIONS, getCurrentPackage, PLAN_COLOR } from '../services/platform';
import type { PackagePlan } from '../types';

export default function PackagesScreen() {
  const [current, setCurrent] = useState<PackagePlan>('starter');
  const load = useCallback(async () => { setCurrent(await getCurrentPackage()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={PACKAGE_DEFINITIONS}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 60 }}
        renderItem={({ item }) => {
          const isCurrent = item.id === current;
          return (
            <View style={[s.card, { borderColor: PLAN_COLOR[item.id], borderWidth: isCurrent ? 2 : 1 }]}>
              <View style={s.head}>
                <View>
                  <Text style={s.n}>{item.name}</Text>
                  <Text style={s.sub}>{item.maxUsers === 9999 ? 'Sınırsız' : item.maxUsers} kullanıcı · {(item.maxStorageMb / 1024).toFixed(1)} GB</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.price, { color: PLAN_COLOR[item.id] }]}>₺{item.monthlyPrice}</Text>
                  <Text style={s.sub}>/ay</Text>
                </View>
              </View>
              {isCurrent && (
                <View style={s.cur}>
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                  <Text style={s.curT}>Mevcut Paket</Text>
                </View>
              )}
              <View style={s.mods}>
                {item.modules.map(m => (
                  <View key={m} style={[s.mod, { borderColor: PLAN_COLOR[item.id] }]}>
                    <Text style={[s.modT, { color: PLAN_COLOR[item.id] }]}>{m}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  n: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  price: { fontSize: typography.xxl, fontWeight: '800' },
  cur: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  curT: { color: '#22c55e', fontSize: typography.xs, fontWeight: '700' },
  mods: { flexDirection: 'row', gap: 4, marginTop: spacing.sm, flexWrap: 'wrap' },
  mod: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  modT: { fontSize: 10, fontWeight: '700' },
});
