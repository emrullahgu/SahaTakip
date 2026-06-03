// TaskFormScreen — POZ-DEV-235 Görev formu
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, TaskPriority, TaskStatus } from '../types';
import { useAppContext } from '../context/AppContext';
import CustomerPicker from '../components/CustomerPicker';
import {
  getTask, saveTask,
  TASK_STATUS_LABEL, TASK_STATUS_COLOR, TASK_STATUS_ORDER,
  TASK_PRIORITY_LABEL, TASK_PRIORITY_COLOR,
} from '../services/tasks';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'TaskForm'>;
const PRIOS: TaskPriority[] = ['low', 'normal', 'high', 'urgent'];

export default function TaskFormScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const { employees, customers } = useAppContext();
  const editingId = route.params?.taskId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [assignedTo, setAssignedTo] = useState<string | undefined>();
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!editingId) return;
    (async () => {
      const t = await getTask(editingId);
      if (!t) return;
      setTitle(t.title); setDescription(t.description || '');
      setStatus(t.status); setPriority(t.priority);
      setAssignedTo(t.assignedTo); setCustomerId(t.customerId);
      setDueDate(t.dueDate || '');
    })();
  }, [editingId]);

  const onSave = async () => {
    if (!title.trim()) return Alert.alert('Eksik', 'Başlık girin');
    await saveTask({
      id: editingId,
      title: title.trim(),
      description: description.trim() || undefined,
      status, priority,
      assignedTo, customerId,
      dueDate: dueDate.trim() || undefined,
    });
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <Section title="Başlık">
          <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Görev başlığı" placeholderTextColor={colors.text.faint} />
        </Section>
        <Section title="Açıklama">
          <TextInput style={[s.input, { height: 100, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} multiline placeholder="Detay" placeholderTextColor={colors.text.faint} />
        </Section>
        <Section title="Durum">
          <View style={s.chips}>
            {TASK_STATUS_ORDER.map(st => (
              <TouchableOpacity key={st} style={[s.chip, status === st && { backgroundColor: TASK_STATUS_COLOR[st], borderColor: TASK_STATUS_COLOR[st] }]} onPress={() => setStatus(st)}>
                <Text style={[s.chipText, status === st && { color: '#fff' }]}>{TASK_STATUS_LABEL[st]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>
        <Section title="Öncelik">
          <View style={s.chips}>
            {PRIOS.map(p => (
              <TouchableOpacity key={p} style={[s.chip, priority === p && { backgroundColor: TASK_PRIORITY_COLOR[p], borderColor: TASK_PRIORITY_COLOR[p] }]} onPress={() => setPriority(p)}>
                <Text style={[s.chipText, priority === p && { color: '#fff' }]}>{TASK_PRIORITY_LABEL[p]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>
        <Section title="Atanan">
          <View style={s.chips}>
            <TouchableOpacity style={[s.chip, !assignedTo && s.chipActive]} onPress={() => setAssignedTo(undefined)}>
              <Text style={[s.chipText, !assignedTo && { color: '#fff' }]}>Yok</Text>
            </TouchableOpacity>
            {employees.map(e => (
              <TouchableOpacity key={e.id} style={[s.chip, assignedTo === e.name && s.chipActive]} onPress={() => setAssignedTo(e.name)}>
                <Text style={[s.chipText, assignedTo === e.name && { color: '#fff' }]}>{e.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>
        <Section title="Müşteri (ops.)">
          <CustomerPicker customers={customers} selectedId={customerId} onSelect={c => setCustomerId(c?.id)} />
        </Section>
        <Section title="Son Tarih (YYYY-MM-DD)">
          <TextInput style={s.input} value={dueDate} onChangeText={setDueDate} placeholder="2026-12-31" placeholderTextColor={colors.text.faint} />
        </Section>

        <TouchableOpacity style={s.saveBtn} onPress={onSave}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={s.saveText}>{editingId ? 'Güncelle' : 'Görev Oluştur'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{children}</View>);
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, color: colors.text.primary, fontSize: typography.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  chipText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', paddingVertical: 14, borderRadius: radius.md },
  saveText: { color: '#fff', fontWeight: '800' },
});
