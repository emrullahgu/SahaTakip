// Faz 45 — AuditScheduleScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { AuditScheduleEntry, AuditStatus } from '../types';
import { listAudits, createAudit, updateAuditStatus, AUDIT_STATUS_LABEL, AUDIT_STATUS_COLOR } from '../services/quality';

const STATUSES: AuditStatus[] = ['planned', 'in_progress', 'completed', 'overdue'];

export default function AuditScheduleScreen() {
  const [items, setItems] = useState<AuditScheduleEntry[]>([]);
  const [modal, setModal] = useState(false);
  const [stat, setStat] = useState<AuditScheduleEntry | null>(null);

  const [title, setTitle] = useState('');
  const [auditor, setAuditor] = useState('');
  const [scope, setScope] = useState('');
  const [days, setDays] = useState('7');

  const load = useCallback(async () => { setItems(await listAudits()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSave = async () => {
    if (!title.trim() || !auditor.trim()) { Alert.alert('Eksik', 'Başlık ve denetçi gerekli.'); return; }
    await createAudit({
      title, auditor, scope,
      plannedAt: new Date(Date.now() + (Number(days) || 7) * 86400000).toISOString(),
    });
    setTitle(''); setAuditor(''); setScope(''); setDays('7');
    setModal(false); load();
  };

  const sorted = [...items].sort((a, b) => +new Date(a.plannedAt) - +new Date(b.plannedAt));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={sorted}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => {
          const c = AUDIT_STATUS_COLOR[item.status];
          const d = new Date(item.plannedAt);
          return (
            <TouchableOpacity onPress={() => setStat(item)} style={[s.card, { borderLeftColor: c }]}>
              <View style={[s.dateBox, { borderColor: c }]}>
                <Text style={[s.dD, { color: c }]}>{d.getDate()}</Text>
                <Text style={s.dM}>{d.toLocaleDateString('tr-TR', { month: 'short' })}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{item.title}</Text>
                <Text style={s.meta}>Denetçi: {item.auditor}</Text>
                <Text style={s.scope} numberOfLines={2}>{item.scope}</Text>
              </View>
              <View style={[s.statBadge, { backgroundColor: c }]}>
                <Text style={s.statT}>{AUDIT_STATUS_LABEL[item.status]}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={s.empty}>Denetim planı yok.</Text>}
      />
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mTitle}>Yeni Denetim Planı</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Denetim başlığı" placeholderTextColor={colors.text.faint} />
              <TextInput style={s.input} value={auditor} onChangeText={setAuditor} placeholder="Denetçi" placeholderTextColor={colors.text.faint} />
              <TextInput style={[s.input, { height: 70 }]} value={scope} onChangeText={setScope} placeholder="Kapsam" multiline placeholderTextColor={colors.text.faint} />
              <TextInput style={s.input} value={days} onChangeText={setDays} placeholder="Kaç gün sonra" keyboardType="numeric" placeholderTextColor={colors.text.faint} />
            </ScrollView>
            <View style={s.actions}>
              <TouchableOpacity style={[s.act, { backgroundColor: colors.bg.primary }]} onPress={() => setModal(false)}>
                <Text style={s.actT}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.act, { backgroundColor: '#8b5cf6' }]} onPress={onSave}>
                <Text style={s.actT}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!stat} transparent animationType="fade" onRequestClose={() => setStat(null)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mTitle}>Durum Güncelle</Text>
            <Text style={s.mSub}>{stat?.title}</Text>
            {STATUSES.map(st => (
              <TouchableOpacity
                key={st}
                style={[s.statBtn, { backgroundColor: AUDIT_STATUS_COLOR[st] }]}
                onPress={async () => { if (stat) await updateAuditStatus(stat.id, st); setStat(null); load(); }}
              >
                <Text style={s.statBT}>{AUDIT_STATUS_LABEL[st]}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.act, { backgroundColor: colors.bg.primary, marginTop: spacing.sm }]} onPress={() => setStat(null)}>
              <Text style={s.actT}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  dateBox: { width: 50, height: 50, borderRadius: radius.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dD: { fontSize: typography.lg, fontWeight: '800' },
  dM: { color: colors.text.muted, fontSize: 10, textTransform: 'uppercase' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  scope: { color: colors.text.faint, fontSize: typography.xs, marginTop: 2 },
  statBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  mTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  mSub: { color: colors.text.muted, fontSize: typography.xs },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, marginBottom: 6 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  act: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  actT: { color: '#fff', fontWeight: '800' },
  statBtn: { padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center', marginTop: 4 },
  statBT: { color: '#fff', fontWeight: '800' },
});
