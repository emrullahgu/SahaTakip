// ArchivePoliciesScreen — Faz 40
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Switch, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { ArchivePolicy } from '../types';
import { listArchivePolicies, toggleArchivePolicy, updateArchiveDays, runArchiveJob, ENTITY_LABEL } from '../services/platform';

export default function ArchivePoliciesScreen() {
  const [items, setItems] = useState<ArchivePolicy[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const load = useCallback(async () => { setItems(await listArchivePolicies()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = (entity: ArchivePolicy['entity']) => {
    Alert.alert('Arşivle', `${ENTITY_LABEL[entity]} arşivlensin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çalıştır', onPress: async () => { const j = await runArchiveJob(entity); Alert.alert('Tamamlandı', `${j.movedCount} kayıt taşındı.`); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 8, paddingBottom: 60 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.row}>
              <Ionicons name="archive-outline" size={20} color="#a855f7" />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{ENTITY_LABEL[item.entity]}</Text>
                <Text style={s.sub}>{item.archivedCount} arşivlenmiş{item.lastRunAt ? ' · son: ' + new Date(item.lastRunAt).toLocaleDateString('tr-TR') : ''}</Text>
              </View>
              <Switch value={item.active} onValueChange={async () => { await toggleArchivePolicy(item.id); load(); }} />
            </View>
            <View style={s.daysRow}>
              <Text style={s.lbl}>Süre (gün):</Text>
              {editingId === item.id ? (
                <View style={s.editRow}>
                  <TextInput style={s.input} value={draft} onChangeText={setDraft} keyboardType="numeric" autoFocus />
                  <TouchableOpacity onPress={async () => { const d = parseInt(draft, 10); if (d > 0) await updateArchiveDays(item.id, d); setEditingId(null); load(); }}>
                    <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.daysBtn} onPress={() => { setEditingId(item.id); setDraft(String(item.olderThanDays)); }}>
                  <Text style={s.daysT}>{item.olderThanDays}</Text>
                  <Ionicons name="pencil" size={12} color={colors.text.muted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.runBtn} onPress={() => run(item.entity)}>
                <Ionicons name="play" size={12} color="#fff" />
                <Text style={s.runT}>Çalıştır</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  daysRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm },
  lbl: { color: colors.text.muted, fontSize: typography.xs },
  daysBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: colors.border.primary },
  daysT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, width: 60, borderWidth: 1, borderColor: colors.border.primary },
  runBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', backgroundColor: '#a855f7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  runT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
});
