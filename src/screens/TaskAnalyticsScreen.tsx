// TaskAnalyticsScreen — POZ-DEV-307 Görev analitik dashboard
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { Task, TaskStatus, TaskPriority } from '../types';
import { listTasks, TASK_STATUS_LABEL, TASK_STATUS_COLOR, TASK_PRIORITY_LABEL, TASK_PRIORITY_COLOR } from '../services/tasks';
import { useAppContext } from '../context/AppContext';
import MiniBarChart from '../components/MiniBarChart';

export default function TaskAnalyticsScreen() {
  const { employees } = useAppContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const refresh = useCallback(async () => { setTasks(await listTasks()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const overdue = useMemo(() => {
    const now = new Date().toISOString();
    return tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < now).length;
  }, [tasks]);
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const byStatus = useMemo(() => {
    const m = new Map<TaskStatus, number>();
    tasks.forEach(t => m.set(t.status, (m.get(t.status) || 0) + 1));
    return Array.from(m.entries()) as [TaskStatus, number][];
  }, [tasks]);

  const byPriority = useMemo(() => {
    const m = new Map<TaskPriority, number>();
    tasks.forEach(t => m.set(t.priority, (m.get(t.priority) || 0) + 1));
    return Array.from(m.entries()) as [TaskPriority, number][];
  }, [tasks]);

  const byEmployee = useMemo(() => {
    const m = new Map<string, { total: number; done: number }>();
    tasks.forEach(t => {
      if (!t.assignedTo) return;
      const cur = m.get(t.assignedTo) || { total: 0, done: 0 };
      cur.total += 1;
      if (t.status === 'done') cur.done += 1;
      m.set(t.assignedTo, cur);
    });
    return Array.from(m.entries())
      .map(([id, v]) => ({ id, name: employees.find(e => e.id === id)?.name || id, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [tasks, employees]);

  const maxStatus = Math.max(1, ...byStatus.map(([, v]) => v));
  const maxPriority = Math.max(1, ...byPriority.map(([, v]) => v));
  const maxEmp = Math.max(1, ...byEmployee.map(e => e.total));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="bar-chart-outline" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>Görev Analitiği</Text>
            <Text style={s.heroS}>{total} görev · %{completionRate} tamamlanma</Text>
          </View>
        </View>

        <View style={s.kpiRow}>
          <KPI label="Toplam" value={String(total)} color="#0ea5e9" icon="list-outline" />
          <KPI label="Tamamlanan" value={String(done)} color="#22c55e" icon="checkmark-circle-outline" />
          <KPI label="Devam Eden" value={String(inProgress)} color="#f59e0b" icon="play-circle-outline" />
          <KPI label="Gecikmiş" value={String(overdue)} color="#ef4444" icon="alarm-outline" />
        </View>

        <Text style={s.sectionTitle}>Durum Dağılımı</Text>
        <MiniBarChart
          data={byStatus.map(([k, v]) => ({ label: TASK_STATUS_LABEL[k], value: v }))}
          barColor="#0ea5e9"
        />

        <Text style={s.sectionTitle}>Öncelik Dağılımı</Text>
        <MiniBarChart
          data={byPriority.map(([k, v]) => ({ label: TASK_PRIORITY_LABEL[k], value: v }))}
          barColor="#8b5cf6"
        />

        <Text style={s.sectionTitle}>Personel Performansı</Text>
        {byEmployee.length === 0 && <Text style={s.empty}>Atanmış görev yok</Text>}
        {byEmployee.map(e => {
          const rate = e.total > 0 ? Math.round((e.done / e.total) * 100) : 0;
          return (
            <View key={e.id} style={s.empRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.empName}>{e.name}</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${(e.total / maxEmp) * 100}%`, backgroundColor: '#a855f7' }]} />
                </View>
                <Text style={s.empMeta}>{e.done}/{e.total} tamam · %{rate}</Text>
              </View>
              <Text style={[s.empRate, { color: rate >= 80 ? '#22c55e' : rate >= 50 ? '#f59e0b' : '#ef4444' }]}>%{rate}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function KPI({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <View style={[s.kpi, { borderColor: color }]}>
      <Ionicons name={icon as never} size={18} color={color} />
      <Text style={[s.kpiValue, { color }]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  heroIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  heroS: { color: colors.text.muted, fontSize: typography.sm, marginTop: 2 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kpi: { flex: 1, minWidth: 100, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', gap: 2 },
  kpiValue: { fontSize: typography.lg, fontWeight: '800' },
  kpiLabel: { color: colors.text.muted, fontSize: typography.xs },
  sectionTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, marginTop: spacing.md },
  empty: { color: colors.text.muted, fontStyle: 'italic', padding: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { color: colors.text.primary, fontSize: typography.xs, width: 80 },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.bg.secondary, borderRadius: radius.full, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.primary },
  barFill: { height: '100%' },
  barValue: { color: colors.text.primary, fontWeight: '700', width: 32, textAlign: 'right' },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  empName: { color: colors.text.primary, fontWeight: '600', fontSize: typography.sm },
  empMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  empRate: { fontSize: typography.md, fontWeight: '800' },
});
