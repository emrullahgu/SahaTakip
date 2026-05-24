// Faz 57 — ExtHubScreen (POZ-DEV-273)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import {
  listExtIntegrations, getExtSummary, EXT_STATUS_COLOR, EXT_STATUS_LABEL, EXT_STATUS_ICON, EXT_CATEGORY_LABEL,
} from '../services/extensions';
import type { ExtIntegration, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ExtHub'>;

export default function ExtHubScreen() {
  const nav = useNavigation<Nav>();
  const [list, setList] = useState<ExtIntegration[]>([]);
  const [sum, setSum] = useState<{ total: number; connected: number; pending: number; disconnected: number; error: number } | null>(null);
  useFocusEffect(useCallback(() => {
    (async () => { setList(await listExtIntegrations()); setSum(await getExtSummary()); })();
  }, []));

  const grouped = list.reduce<Record<string, ExtIntegration[]>>((acc, it) => {
    (acc[it.category] = acc[it.category] || []).push(it); return acc;
  }, {});

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Ionicons name="link" size={80} color="#7c3aed" />
          <Text style={s.heroT}>Dış Entegrasyonlar & Eklentiler</Text>
          <Text style={s.heroD}>WhatsApp, SMS, Takvim, Banka, POS, ERP, OCR ve daha fazlası</Text>
        </View>
        {sum && (
          <View style={s.kpiRow}>
            <Kpi label="Toplam" value={sum.total} color="#7c3aed" />
            <Kpi label="Bağlı" value={sum.connected} color="#22c55e" />
            <Kpi label="Bekliyor" value={sum.pending} color="#f59e0b" />
            <Kpi label="Pasif" value={sum.disconnected} color="#64748b" />
          </View>
        )}
        {(Object.keys(grouped) as Array<ExtIntegration['category']>).map(cat => (
          <View key={cat} style={s.section}>
            <Text style={s.sectionT}>{EXT_CATEGORY_LABEL[cat]}</Text>
            {grouped[cat].map(it => (
              <TouchableOpacity key={it.id} style={[s.card, { borderLeftColor: it.color }]} activeOpacity={0.85} onPress={() => nav.navigate('ExtConfig', { id: it.id })}>
                <View style={s.cardHead}>
                  <View style={[s.iconBox, { backgroundColor: it.color + '22' }]}>
                    <Ionicons name={it.icon as any} size={22} color={it.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardT}>{it.name}</Text>
                    <Text style={s.cardD} numberOfLines={2}>{it.summary}</Text>
                  </View>
                  <View style={[s.statusPill, { borderColor: EXT_STATUS_COLOR[it.status] }]}>
                    <Ionicons name={EXT_STATUS_ICON[it.status] as any} size={12} color={EXT_STATUS_COLOR[it.status]} />
                    <Text style={[s.statusT, { color: EXT_STATUS_COLOR[it.status] }]}>{EXT_STATUS_LABEL[it.status]}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[s.kpi, { borderColor: color }]}>
      <Text style={[s.kpiV, { color }]}>{value}</Text>
      <Text style={s.kpiL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  hero: { alignItems: 'center', padding: spacing.md, gap: 6 },
  heroT: { color: colors.text.primary, fontSize: typography.xxl, fontWeight: '800', textAlign: 'center' },
  heroD: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center' },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  kpiV: { fontSize: typography.xl, fontWeight: '800' },
  kpiL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  section: { gap: spacing.sm, marginTop: spacing.sm },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  cardT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  cardD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusT: { fontSize: typography.xs, fontWeight: '700' },
});
