// Faz 53 — UatScenarioList (rol bazlı senaryo listesi paylaşımlı bileşen)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import {
  listUatScenarios,
  toggleUatScenarioStatus,
  UAT_STATUS_COLOR,
  UAT_STATUS_LABEL,
  UAT_SEV_COLOR,
  UAT_SEV_LABEL,
} from '../services/uat';
import type { UatRole, UatScenario } from '../types';

type Props = {
  role: UatRole;
  heroIcon: string;
  heroColor: string;
  heroTitle: string;
  heroDescription: string;
};

export default function UatScenarioList({ role, heroIcon, heroColor, heroTitle, heroDescription }: Props) {
  const [items, setItems] = useState<UatScenario[]>([]);
  const load = useCallback(async () => setItems(await listUatScenarios(role)), [role]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.heroCard, { borderColor: heroColor }]}>
          <Ionicons name={heroIcon as any} size={48} color={heroColor} />
          <Text style={s.heroT}>{heroTitle}</Text>
          <Text style={s.heroD}>{heroDescription}</Text>
        </View>

        {items.map(sc => (
          <View key={sc.id} style={[s.card, { borderLeftColor: UAT_STATUS_COLOR[sc.status] }]}>
            <View style={s.headRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{sc.title}</Text>
                <Text style={s.desc}>{sc.description}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: UAT_STATUS_COLOR[sc.status] + '33', borderColor: UAT_STATUS_COLOR[sc.status] }]}>
                <Text style={[s.pillT, { color: UAT_STATUS_COLOR[sc.status] }]}>{UAT_STATUS_LABEL[sc.status]}</Text>
              </View>
            </View>

            <View style={s.metaRow}>
              <View style={[s.sevTag, { borderColor: UAT_SEV_COLOR[sc.priority] }]}>
                <Ionicons name="flag" size={11} color={UAT_SEV_COLOR[sc.priority]} />
                <Text style={[s.sevT, { color: UAT_SEV_COLOR[sc.priority] }]}>{UAT_SEV_LABEL[sc.priority]}</Text>
              </View>
              <Text style={s.steps}>{sc.steps.length} adım</Text>
              {sc.lastRunAt && <Text style={s.runAt}>{new Date(sc.lastRunAt).toLocaleDateString('tr-TR')}</Text>}
            </View>

            <View style={s.stepsBox}>
              {sc.steps.map((st, i) => (
                <View key={st.id} style={s.stepRow}>
                  <Ionicons
                    name={st.status === 'pass' ? 'checkmark-circle' : st.status === 'fail' ? 'close-circle' : st.status === 'blocked' ? 'remove-circle' : 'ellipse-outline'}
                    size={14}
                    color={UAT_STATUS_COLOR[st.status]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.stepT}>{i + 1}. {st.text}</Text>
                    <Text style={s.stepExp}>Beklenen: {st.expected}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity onPress={() => toggleUatScenarioStatus(sc.id).then(load)} style={s.cycleBtn}>
              <Ionicons name="refresh" size={12} color="#14b8a6" />
              <Text style={s.cycleT}>Durumu Döndür</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  desc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sevTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  sevT: { fontSize: 10, fontWeight: '700' },
  steps: { color: colors.text.muted, fontSize: typography.xs },
  runAt: { color: colors.text.muted, fontSize: typography.xs, marginLeft: 'auto' },
  stepsBox: { backgroundColor: colors.bg.primary, padding: 8, borderRadius: 6, gap: 6 },
  stepRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  stepT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  stepExp: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  cycleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#14b8a6', alignSelf: 'flex-start' },
  cycleT: { color: '#14b8a6', fontSize: typography.xs, fontWeight: '700' },
});
