// Faz 49 — DrPlanScreen (POZ-DEV-199)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getDrPlan, toggleDrStep, recordDrDrill } from '../services/secCenter';
import type { DrPlan } from '../types';

export default function DrPlanScreen() {
  const [plan, setPlan] = useState<DrPlan | null>(null);

  const load = useCallback(async () => setPlan(await getDrPlan()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = useMemo(() => {
    if (!plan) return { done: 0, total: 0, totalMin: 0, doneMin: 0 };
    const done = plan.steps.filter(x => x.done).length;
    const totalMin = plan.steps.reduce((s, x) => s + x.estimatedMinutes, 0);
    const doneMin = plan.steps.filter(x => x.done).reduce((s, x) => s + x.estimatedMinutes, 0);
    return { done, total: plan.steps.length, totalMin, doneMin };
  }, [plan]);

  if (!plan) return <SafeAreaView style={s.safe} />;

  const daysSinceDrill = plan.lastDrillAt
    ? Math.floor((Date.now() - new Date(plan.lastDrillAt).getTime()) / 86400000)
    : null;

  const drill = (success: boolean) => {
    Alert.alert('Tatbikat Kaydı', success ? 'Başarılı tatbikat kaydedilsin mi?' : 'Başarısız tatbikat kaydedilsin mi?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Kaydet', onPress: async () => { await recordDrDrill(success); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Ionicons name="shield-checkmark" size={40} color="#0ea5e9" />
          <Text style={s.heroT}>Felaket Kurtarma Planı</Text>
          <Text style={s.heroS}>RPO/RTO ve hedef sürelerle adım adım kurtarma</Text>
        </View>

        <View style={s.kpiRow}>
          <View style={[s.kpi, { borderColor: '#22c55e' }]}>
            <Text style={[s.kpiV, { color: '#22c55e' }]}>{plan.rpoMinutes}</Text>
            <Text style={s.kpiL}>RPO (dakika)</Text>
            <Text style={s.kpiD}>Maks. veri kaybı</Text>
          </View>
          <View style={[s.kpi, { borderColor: '#0ea5e9' }]}>
            <Text style={[s.kpiV, { color: '#0ea5e9' }]}>{plan.rtoMinutes}</Text>
            <Text style={s.kpiL}>RTO (dakika)</Text>
            <Text style={s.kpiD}>Maks. kesinti</Text>
          </View>
        </View>

        <View style={[s.drillCard, { borderColor: daysSinceDrill !== null && daysSinceDrill > 30 ? '#ef4444' : '#22c55e' }]}>
          <View style={s.row}>
            <Ionicons name="calendar" size={20} color={daysSinceDrill !== null && daysSinceDrill > 30 ? '#ef4444' : '#22c55e'} />
            <View style={{ flex: 1 }}>
              <Text style={s.drillT}>Son Tatbikat</Text>
              {plan.lastDrillAt ? (
                <Text style={s.drillS}>
                  {new Date(plan.lastDrillAt).toLocaleDateString('tr-TR')} · {daysSinceDrill} gün önce · {plan.lastDrillSuccess ? '✓ Başarılı' : '✗ Başarısız'}
                </Text>
              ) : (
                <Text style={s.drillS}>Hiç yapılmamış</Text>
              )}
            </View>
          </View>
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, { backgroundColor: '#22c55e' }]} onPress={() => drill(true)}>
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={s.btnT}>Başarılı</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444' }]} onPress={() => drill(false)}>
              <Ionicons name="close" size={14} color="#fff" />
              <Text style={s.btnT}>Başarısız</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.section}>Kurtarma Adımları ({stats.done}/{stats.total} · {stats.doneMin}/{stats.totalMin} dk)</Text>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${(stats.done / Math.max(1, stats.total)) * 100}%` }]} />
        </View>

        {plan.steps.map(st => (
          <TouchableOpacity key={st.order} style={s.step} onPress={async () => { await toggleDrStep(st.order); load(); }}>
            <View style={[s.stepNo, st.done && { backgroundColor: '#22c55e', borderColor: '#22c55e' }]}>
              {st.done ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Text style={s.stepNoT}>{st.order}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.stepT, st.done && { textDecorationLine: 'line-through', color: colors.text.muted }]}>{st.title}</Text>
              <Text style={s.stepM}>{st.responsible} · ~{st.estimatedMinutes} dk</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  hero: { alignItems: 'center', gap: 4, paddingVertical: spacing.sm },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroS: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center' },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  kpiV: { fontSize: 28, fontWeight: '800' },
  kpiL: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', marginTop: 2 },
  kpiD: { color: colors.text.muted, fontSize: typography.xs },
  drillCard: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  drillT: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  drillS: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: radius.sm },
  btnT: { color: '#fff', fontSize: typography.xs, fontWeight: '800' },
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700', marginTop: spacing.sm },
  progressBg: { height: 6, backgroundColor: colors.bg.secondary, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#22c55e' },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  stepNo: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.primary },
  stepNoT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '800' },
  stepT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  stepM: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});
