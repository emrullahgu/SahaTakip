// TaskKanbanScreen — POZ-DEV-234 Görev kanban (status kolonları, tıklayarak ileri taşı)
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, Task, TaskStatus } from '../types';
import {
  listTasks, updateTaskStatus,
  TASK_STATUS_LABEL, TASK_STATUS_COLOR, TASK_STATUS_ORDER,
  TASK_PRIORITY_COLOR,
} from '../services/tasks';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const KANBAN_COLS: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

export default function TaskKanbanScreen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<Task[]>([]);
  const refresh = useCallback(async () => { setItems(await listTasks()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const moveNext = async (t: Task) => {
    const idx = TASK_STATUS_ORDER.indexOf(t.status);
    const next = TASK_STATUS_ORDER[(idx + 1) % TASK_STATUS_ORDER.length];
    await updateTaskStatus(t.id, next);
    refresh();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView horizontal contentContainerStyle={s.boardH} showsHorizontalScrollIndicator>
        {KANBAN_COLS.map(col => {
          const tasks = items.filter(t => t.status === col);
          return (
            <View key={col} style={s.col}>
              <View style={[s.colHeader, { backgroundColor: TASK_STATUS_COLOR[col] }]}>
                <Text style={s.colTitle}>{TASK_STATUS_LABEL[col]}</Text>
                <Text style={s.colCount}>{tasks.length}</Text>
              </View>
              <ScrollView contentContainerStyle={s.colContent}>
                {tasks.length === 0 && <Text style={s.empty}>—</Text>}
                {tasks.map(t => (
                  <View key={t.id} style={s.card}>
                    <TouchableOpacity onPress={() => nav.navigate('TaskForm', { taskId: t.id })}>
                      <View style={s.cardHead}>
                        <View style={[s.dot, { backgroundColor: TASK_PRIORITY_COLOR[t.priority] }]} />
                        <Text style={s.cardTitle} numberOfLines={2}>{t.title}</Text>
                      </View>
                      {t.dueDate && <Text style={s.cardMeta}>📅 {t.dueDate}</Text>}
                      {t.assignedTo && <Text style={s.cardMeta}>👤 {t.assignedTo}</Text>}
                    </TouchableOpacity>
                    {col !== 'done' && col !== 'cancelled' && (
                      <TouchableOpacity style={s.nextBtn} onPress={() => moveNext(t)}>
                        <Ionicons name="arrow-forward" size={14} color="#fff" />
                        <Text style={s.nextBtnText}>İlerlet</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  boardH: { padding: spacing.md, gap: spacing.sm },
  col: { width: 280, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, overflow: 'hidden' },
  colHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingVertical: 10 },
  colTitle: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  colCount: { color: '#fff', fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 8, borderRadius: radius.full, fontSize: typography.xs },
  colContent: { padding: spacing.sm, gap: 8, minHeight: 200 },
  empty: { color: colors.text.faint, fontSize: typography.xs, textAlign: 'center', padding: spacing.md },
  card: { padding: spacing.sm, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, gap: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.xs, flex: 1 },
  cardMeta: { color: colors.text.muted, fontSize: 10 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#0ea5e9', paddingVertical: 6, borderRadius: radius.sm },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.xs },
});
