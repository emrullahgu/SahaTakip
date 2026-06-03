// TasksScreen — POZ-DEV-233 Görev listesi + filtre
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, FlatList} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, Task, TaskStatus } from '../types';
import {
  listTasks, deleteTask, updateTaskStatus,
  TASK_STATUS_LABEL, TASK_STATUS_COLOR, TASK_STATUS_ORDER,
  TASK_PRIORITY_LABEL, TASK_PRIORITY_COLOR,
} from '../services/tasks';
import EmptyState from '../components/EmptyState';
import PressableScale from '../components/PressableScale';
import RowMenu from '../components/RowMenu';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { a11yButton, a11yInput } from '../utils/a11y';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'Tasks'>;

export default function TasksScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const [items, setItems] = useState<Task[]>([]);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>(route.params?.status || 'all');
  const [search, setSearch] = useState('');
  const refresh = useCallback(async () => { setItems(await listTasks()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return items.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (s && !(t.title.toLowerCase().includes(s) || (t.description || '').toLowerCase().includes(s))) return false;
      return true;
    });
  }, [items, filterStatus, search]);

  const cycleStatus = async (t: Task) => {
    const idx = TASK_STATUS_ORDER.indexOf(t.status);
    const next = TASK_STATUS_ORDER[(idx + 1) % TASK_STATUS_ORDER.length];
    await updateTaskStatus(t.id, next);
    refresh();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.toolbar}>
        <TextInput style={s.search} value={search} onChangeText={setSearch} placeholder="Görev ara..." placeholderTextColor={colors.text.faint} returnKeyType="search" autoCorrect={false} {...a11yInput('Görev ara', search)} />
        <TouchableOpacity style={s.addBtn} onPress={() => nav.navigate('TaskForm')} {...a11yButton('Görev ekle')}>
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
        <Tab label="Tümü" active={filterStatus === 'all'} onPress={() => setFilterStatus('all')} count={items.length} />
        {TASK_STATUS_ORDER.map(st => (
          <Tab key={st} label={TASK_STATUS_LABEL[st as keyof typeof TASK_STATUS_LABEL]} color={TASK_STATUS_COLOR[st as keyof typeof TASK_STATUS_COLOR]} active={filterStatus === st} onPress={() => setFilterStatus(st)} count={items.filter(x => x.status === st).length} />
        ))}
      </ScrollView>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={t => t.id}
        contentContainerStyle={s.content}
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-done-outline"
            title="Görev bulunamadı"
            subtitle="Filtreleri değiştirerek tekrar deneyebilir veya yeni bir görev ekleyebilirsiniz."
            actionLabel="+ Yeni Görev"
            onAction={() => nav.navigate('TaskForm')}
          />
        }
        renderItem={({ item: t }) => (
          <View style={s.card}>
            <PressableScale fill style={{ flex: 1 }} onPress={() => nav.navigate('TaskDetail', { taskId: t.id })} onLongPress={() => nav.navigate('TaskForm', { taskId: t.id })}>
              <View style={s.cardHead}>
                <Text style={s.cardTitle}>{t.title}</Text>
                <View style={[s.badge, { backgroundColor: TASK_PRIORITY_COLOR[t.priority as keyof typeof TASK_PRIORITY_COLOR] + '33', borderColor: TASK_PRIORITY_COLOR[t.priority as keyof typeof TASK_PRIORITY_COLOR] }]}>
                  <Text style={[s.badgeText, { color: TASK_PRIORITY_COLOR[t.priority as keyof typeof TASK_PRIORITY_COLOR] }]}>{TASK_PRIORITY_LABEL[t.priority as keyof typeof TASK_PRIORITY_LABEL]}</Text>
                </View>
              </View>
              {t.description ? <Text style={s.cardDesc} numberOfLines={2}>{t.description}</Text> : null}
              <View style={s.cardMeta}>
                {t.dueDate && <Text style={[s.metaText, t.dueDate < new Date().toISOString().slice(0, 10) && t.status !== 'done' && { color: '#ef4444' }]}>📅 {t.dueDate}</Text>}
                {t.assignedTo && <Text style={s.metaText}>👤 {t.assignedTo}</Text>}
              </View>
            </PressableScale>
            <View style={s.actions}>
              <TouchableOpacity style={[s.statusBtn, { backgroundColor: TASK_STATUS_COLOR[t.status as keyof typeof TASK_STATUS_COLOR] + '33', borderColor: TASK_STATUS_COLOR[t.status as keyof typeof TASK_STATUS_COLOR] }]} onPress={() => cycleStatus(t)}>
                <Text style={[s.statusBtnText, { color: TASK_STATUS_COLOR[t.status as keyof typeof TASK_STATUS_COLOR] }]}>{TASK_STATUS_LABEL[t.status as keyof typeof TASK_STATUS_LABEL]}</Text>
              </TouchableOpacity>
              <RowMenu
                items={[
                  { label: 'Düzenle', icon: 'create-outline', onPress: () => nav.navigate('TaskForm', { taskId: t.id }) },
                  {
                    label: 'Sil',
                    icon: 'trash-outline',
                    destructive: true,
                    confirm: 'Görev silinsin mi?',
                    confirmTitle: 'Silinsin mi?',
                    onPress: async () => { await deleteTask(t.id); refresh(); },
                  },
                ]}
              />
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Tab({ label, active, onPress, color, count }: { label: string; active: boolean; onPress: () => void; color?: string; count: number }) {
  return (
    <TouchableOpacity style={[s.tab, active && { backgroundColor: color || '#0ea5e9', borderColor: color || '#0ea5e9' }]} onPress={onPress}>
      <Text style={[s.tabText, active && { color: '#fff' }]}>{label} ({count})</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { flexDirection: 'row', gap: 6, padding: spacing.md },
  search: { flex: 1, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, color: colors.text.primary },
  addBtn: { backgroundColor: '#22c55e', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  tabs: { paddingHorizontal: spacing.md, gap: 6, paddingBottom: 4 },
  tab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  tabText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  content: { padding: spacing.md, paddingBottom: 80, gap: spacing.sm },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: spacing.lg },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, gap: 8 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, flex: 1 },
  cardDesc: { color: colors.text.muted, fontSize: typography.xs },
  cardMeta: { flexDirection: 'row', gap: 12 },
  metaText: { color: colors.text.muted, fontSize: typography.xs },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1 },
  statusBtnText: { fontSize: 11, fontWeight: '700' },
});
