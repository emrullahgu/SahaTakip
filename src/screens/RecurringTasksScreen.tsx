// ====================================================================
// RecurringTasksScreen — POZ-DEV-029
// Periyodik bakım şablonları (lokal AsyncStorage).
// ====================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, brand } from '../theme';
import { RecurringTemplate, WorkOrderPriority } from '../types';
import {
  listTemplates,
  upsertTemplate,
  deleteTemplate,
} from '../services/recurringTasks';
import { useAppContext } from '../context/AppContext';
import { priorityColor } from '../services/workOrderFlow';

const PRIORITIES: WorkOrderPriority[] = ['Normal', 'Yüksek', 'Acil'];

export default function RecurringTasksScreen() {
  const { generateFromRecurring } = useAppContext();
  const [list, setList] = useState<RecurringTemplate[]>([]);
  const [editing, setEditing] = useState<RecurringTemplate | null>(null);

  const reload = async () => setList(await listTemplates());

  useEffect(() => {
    reload();
  }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.title || !editing.client || !editing.serviceName) {
      Alert.alert('Eksik bilgi', 'Başlık, müşteri ve servis adı zorunlu.');
      return;
    }
    await upsertTemplate(editing);
    setEditing(null);
    reload();
  };

  const remove = async (id: string) => {
    Alert.alert('Şablonu sil?', '', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteTemplate(id);
          reload();
        },
      },
    ]);
  };

  const runNow = async () => {
    const n = await generateFromRecurring();
    Alert.alert('Tamam', `${n} yeni görev oluşturuldu.`);
    reload();
  };

  const newTemplate = (): RecurringTemplate => ({
    id: `rt-${Date.now()}`,
    title: '',
    serviceName: '',
    client: '',
    priority: 'Normal',
    intervalDays: 30,
    nextRunDate: new Date().toISOString().slice(0, 10),
    active: true,
  });

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.smallBtn} onPress={runNow}>
            <Ionicons name="play-circle-outline" size={16} color="#fff" />
            <Text style={styles.smallBtnText}>Şimdi Çalıştır</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: brand.green }]}
            onPress={() => setEditing(newTemplate())}
          >
            <Ionicons name="add" size={16} color={colors.bg.primary} />
            <Text style={[styles.smallBtnText, { color: colors.bg.primary }]}>Yeni</Text>
          </TouchableOpacity>
        </View>

        {list.length === 0 && (
          <Text style={styles.empty}>Henüz şablon yok. "Yeni" ile ekleyin.</Text>
        )}

        {list.map(t => (
          <View key={t.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t.title}</Text>
              <Text style={styles.sub}>
                {t.client} · {t.serviceName}
              </Text>
              <Text style={styles.meta}>
                Her {t.intervalDays} gün · Sonraki: {t.nextRunDate}
              </Text>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: priorityColor(t.priority) },
                  ]}
                >
                  <Text style={styles.badgeText}>{t.priority}</Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: t.active ? brand.green : '#64748b' },
                  ]}
                >
                  <Text style={styles.badgeText}>{t.active ? 'Aktif' : 'Pasif'}</Text>
                </View>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <TouchableOpacity onPress={() => setEditing(t)}>
                <Ionicons name="create-outline" size={20} color={brand.green} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(t.id)}>
                <Ionicons name="trash-outline" size={20} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* EDIT FORM */}
      {editing && (
        <View style={styles.editor}>
          <Text style={styles.editorTitle}>Şablon</Text>
          <TextInput
            style={styles.input}
            placeholder="Başlık"
            placeholderTextColor={colors.text.muted}
            value={editing.title}
            onChangeText={t => setEditing({ ...editing, title: t })}
          />
          <TextInput
            style={styles.input}
            placeholder="Müşteri"
            placeholderTextColor={colors.text.muted}
            value={editing.client}
            onChangeText={t => setEditing({ ...editing, client: t })}
          />
          <TextInput
            style={styles.input}
            placeholder="Servis Adı"
            placeholderTextColor={colors.text.muted}
            value={editing.serviceName}
            onChangeText={t => setEditing({ ...editing, serviceName: t })}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Aralık (gün)"
              placeholderTextColor={colors.text.muted}
              keyboardType="number-pad"
              value={String(editing.intervalDays)}
              onChangeText={t => setEditing({ ...editing, intervalDays: Number(t) || 0 })}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Sonraki Tarih (YYYY-MM-DD)"
              placeholderTextColor={colors.text.muted}
              value={editing.nextRunDate}
              onChangeText={t => setEditing({ ...editing, nextRunDate: t })}
            />
          </View>
          <View style={styles.chipRow}>
            {PRIORITIES.map(p => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.chip,
                  { borderColor: priorityColor(p) },
                  editing.priority === p && { backgroundColor: priorityColor(p) },
                ]}
                onPress={() => setEditing({ ...editing, priority: p })}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: editing.priority === p ? '#fff' : priorityColor(p) },
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.chip,
                { borderColor: brand.green },
                editing.active && { backgroundColor: brand.green },
              ]}
              onPress={() => setEditing({ ...editing, active: !editing.active })}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: editing.active ? colors.bg.primary : brand.green },
                ]}
              >
                {editing.active ? 'Aktif' : 'Pasif'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.bigBtn, { backgroundColor: '#475569' }]}
              onPress={() => setEditing(null)}
            >
              <Text style={styles.bigBtnText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bigBtn, { backgroundColor: brand.green }]}
              onPress={save}
            >
              <Text style={[styles.bigBtnText, { color: colors.bg.primary }]}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  actionsRow: { flexDirection: 'row', gap: 8, padding: 12 },
  smallBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 30 },
  card: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 12,
    backgroundColor: colors.bg.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  title: { color: colors.text.primary, fontWeight: '700', fontSize: 14 },
  sub: { color: colors.text.muted, fontSize: 12 },
  meta: { color: colors.text.muted, fontSize: 11, marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  editor: {
    backgroundColor: colors.bg.secondary,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  editorTitle: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.bg.primary,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  bigBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  bigBtnText: { color: '#fff', fontWeight: '700' },
});
