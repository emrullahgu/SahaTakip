// Faz 42 — FieldJobDetailScreen: tek tıkla stage akışı
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { FieldJob, FieldJobStage, RootStackParamList } from '../types';
import { getJob, advanceStage, canCloseJob, PRIORITY_COLOR, PRIORITY_LABEL, STAGE_COLOR, STAGE_LABEL } from '../services/fieldOps';

type R = RouteProp<RootStackParamList, 'FieldJobDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const NEXT_STAGE: Partial<Record<FieldJobStage, { next: FieldJobStage; label: string; icon: any; color: string }>> = {
  assigned: { next: 'enroute', label: 'Yola Çık', icon: 'car', color: '#0ea5e9' },
  enroute: { next: 'arrived', label: 'Vardım', icon: 'location', color: '#06b6d4' },
  arrived: { next: 'in_progress', label: 'İşi Başlat', icon: 'play', color: '#f59e0b' },
  in_progress: { next: 'completed', label: 'İşi Bitir', icon: 'checkmark-circle', color: '#22c55e' },
};

export default function FieldJobDetailScreen() {
  const route = useRoute<R>();
  const nav = useNavigation<Nav>();
  const [job, setJob] = useState<FieldJob | null>(null);
  const load = useCallback(async () => { const j = await getJob(route.params.jobId); setJob(j || null); }, [route.params.jobId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onAdvance = async () => {
    if (!job) return;
    const next = NEXT_STAGE[job.stage];
    if (!next) return;
    if (next.next === 'completed') {
      const c = await canCloseJob(job.id);
      if (!c.ok) {
        Alert.alert('İşi Bitiremezsiniz', 'Zorunlu kontroller eksik:\n• ' + c.missing.join('\n• '));
        return;
      }
    }
    await advanceStage(job.id, next.next);
    load();
  };

  if (!job) return <SafeAreaView style={s.safe}><Text style={s.empty}>Yükleniyor...</Text></SafeAreaView>;
  const action = NEXT_STAGE[job.stage];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 90 }}>
        <View style={s.card}>
          <Text style={s.name}>{job.customerName}</Text>
          <Text style={s.addr}>{job.address}</Text>
          <View style={s.chipRow}>
            <View style={[s.chip, { backgroundColor: PRIORITY_COLOR[job.priority] }]}>
              <Text style={s.chipT}>{PRIORITY_LABEL[job.priority]}</Text>
            </View>
            <View style={[s.chip, { backgroundColor: STAGE_COLOR[job.stage] }]}>
              <Text style={s.chipT}>{STAGE_LABEL[job.stage]}</Text>
            </View>
          </View>
        </View>
        <View style={s.card}>
          <Text style={s.h}>Atanan</Text>
          <Text style={s.v}>{job.assignedUserName}</Text>
          <Text style={s.h}>Planlanan</Text>
          <Text style={s.v}>{new Date(job.scheduledAt).toLocaleString('tr-TR')}</Text>
          {job.slaAt && (<><Text style={s.h}>SLA</Text><Text style={s.v}>{new Date(job.slaAt).toLocaleString('tr-TR')}</Text></>)}
          <Text style={s.h}>Tahmini Süre</Text>
          <Text style={s.v}>{job.estimatedMinutes} dk</Text>
        </View>
        <View style={s.timeline}>
          {job.startedAt && <Text style={s.t}>🚗 Yola çıktı: {new Date(job.startedAt).toLocaleTimeString('tr-TR')}</Text>}
          {job.arrivedAt && <Text style={s.t}>📍 Vardı: {new Date(job.arrivedAt).toLocaleTimeString('tr-TR')}</Text>}
          {job.completedAt && <Text style={s.t}>✅ Tamamlandı: {new Date(job.completedAt).toLocaleTimeString('tr-TR')}</Text>}
        </View>
        <View style={s.linkRow}>
          <TouchableOpacity style={s.link} onPress={() => nav.navigate('FieldChecklist', { jobId: job.id })}>
            <Ionicons name="checkbox-outline" size={20} color="#0ea5e9" />
            <Text style={s.linkT}>Checklist</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.link} onPress={() => nav.navigate('FieldQualityCheck', { jobId: job.id })}>
            <Ionicons name="ribbon-outline" size={20} color="#22c55e" />
            <Text style={s.linkT}>Kalite</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {action && (
        <TouchableOpacity style={[s.fab, { backgroundColor: action.color }]} onPress={onAdvance}>
          <Ionicons name={action.icon} size={22} color="#fff" />
          <Text style={s.fabT}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 4 },
  name: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  addr: { color: colors.text.muted, fontSize: typography.sm },
  chipRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chipT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  h: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: 4 },
  v: { color: colors.text.primary, fontSize: typography.sm },
  timeline: { padding: spacing.sm, gap: 4 },
  t: { color: colors.text.muted, fontSize: typography.xs },
  linkRow: { flexDirection: 'row', gap: spacing.sm },
  link: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, justifyContent: 'center' },
  linkT: { color: colors.text.primary, fontWeight: '700' },
  fab: { position: 'absolute', left: 16, right: 16, bottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md, elevation: 4 },
  fabT: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
});
