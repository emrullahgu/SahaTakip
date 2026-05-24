// PayrollDetailScreen — POZ-DEV-254 Bordro detayı + durum değişimi
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, PayrollRun } from '../types';
import { getPayrollRun, savePayrollRun } from '../services/payroll';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'PayrollDetail'>;

const STATUS_LABEL: Record<PayrollRun['status'], string> = { draft: 'Taslak', approved: 'Onaylı', paid: 'Ödendi' };
const STATUS_COLOR: Record<PayrollRun['status'], string> = { draft: '#94a3b8', approved: '#0ea5e9', paid: '#22c55e' };

export default function PayrollDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const [run, setRun] = useState<PayrollRun | null>(null);

  const refresh = useCallback(async () => {
    setRun((await getPayrollRun(route.params.runId)) || null);
  }, [route.params.runId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (!run) return <SafeAreaView style={s.safe}><Text style={s.empty}>Bordro bulunamadı</Text></SafeAreaView>;

  const advance = (next: PayrollRun['status']) => {
    Alert.alert('Durum', `${STATUS_LABEL[next]} olarak işaretlensin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Evet', onPress: async () => { await savePayrollRun({ ...run, status: next }); refresh(); } },
    ]);
  };

  const next: PayrollRun['status'] | null = run.status === 'draft' ? 'approved' : run.status === 'approved' ? 'paid' : null;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.hero, { backgroundColor: STATUS_COLOR[run.status] }]}>
          <View style={s.heroIcon}><Ionicons name="cash-outline" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>{run.employeeName}</Text>
            <Text style={s.heroS}>{run.periodMonth} · {STATUS_LABEL[run.status]}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Kalemler</Text>
        {run.items.map((it, i) => (
          <View key={i} style={s.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.itemLabel}>{it.label}</Text>
            </View>
            <Text style={[s.itemAmount, it.amount < 0 && { color: '#ef4444' }]}>
              {it.amount < 0 ? '-' : '+'}₺{Math.abs(it.amount).toLocaleString('tr-TR')}
            </Text>
          </View>
        ))}

        <View style={s.totalsBox}>
          <View style={s.totalRow}><Text style={s.totalL}>Brüt</Text><Text style={s.totalV}>₺{run.gross.toLocaleString('tr-TR')}</Text></View>
          <View style={s.totalRow}><Text style={s.totalL}>Kesinti</Text><Text style={s.totalV}>₺{run.deductions.toLocaleString('tr-TR')}</Text></View>
          <View style={s.totalRow}><Text style={[s.totalL, { color: colors.text.primary, fontWeight: '800' }]}>NET</Text><Text style={[s.totalV, { color: '#22c55e', fontSize: typography.md }]}>₺{run.net.toLocaleString('tr-TR')}</Text></View>
        </View>

        {next && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: STATUS_COLOR[next] }]} onPress={() => advance(next)}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={s.actionText}>{STATUS_LABEL[next]} olarak işaretle</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: spacing.xl },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroS: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  sectionTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, marginTop: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm },
  itemLabel: { color: colors.text.primary, fontWeight: '600', fontSize: typography.sm },
  itemNotes: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  itemAmount: { color: '#22c55e', fontWeight: '800', fontSize: typography.sm },
  totalsBox: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, padding: spacing.md, gap: 6, marginTop: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalL: { color: colors.text.muted, fontSize: typography.sm },
  totalV: { color: colors.text.primary, fontWeight: '800' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.md },
  actionText: { color: '#fff', fontWeight: '800' },
});
