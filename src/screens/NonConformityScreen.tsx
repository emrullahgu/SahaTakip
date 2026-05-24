// Faz 45 — NonConformityScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { NonConformityRecord, NonConformityKind, NonConformitySeverity, NonConformityStatus } from '../types';
import {
  listNonConformities, createNonConformity, updateNcStatus,
  NC_KIND_LABEL, NC_KIND_COLOR, NC_KIND_ICON, NC_SEV_LABEL, NC_SEV_COLOR, NC_STATUS_LABEL, NC_STATUS_COLOR,
} from '../services/quality';

const KINDS: NonConformityKind[] = ['safety', 'quality', 'process', 'documentation', 'environmental'];
const SEVS: NonConformitySeverity[] = ['low', 'medium', 'high', 'critical'];
const STATUSES: NonConformityStatus[] = ['open', 'in_progress', 'closed', 'overdue'];

export default function NonConformityScreen() {
  const [items, setItems] = useState<NonConformityRecord[]>([]);
  const [modal, setModal] = useState(false);
  const [statModal, setStatModal] = useState<NonConformityRecord | null>(null);
  const [filter, setFilter] = useState<NonConformityStatus | 'all'>('all');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [kind, setKind] = useState<NonConformityKind>('safety');
  const [severity, setSeverity] = useState<NonConformitySeverity>('medium');

  const load = useCallback(async () => { setItems(await listNonConformities()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSave = async () => {
    if (!title.trim() || !location.trim() || !reportedBy.trim()) { Alert.alert('Eksik', 'Başlık, lokasyon ve raporlayan gerekli.'); return; }
    await createNonConformity({ title, description, location, reportedBy, kind, severity, photoUris: [] });
    setTitle(''); setDescription(''); setLocation(''); setReportedBy(''); setKind('safety'); setSeverity('medium');
    setModal(false); load();
  };

  const filtered = filter === 'all' ? items : items.filter(n => n.status === filter);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
        {(['all', ...STATUSES] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.chip, filter === f && s.chipOn]}
            onPress={() => setFilter(f as any)}
          >
            <Text style={[s.chipT, filter === f && s.chipTOn]}>
              {f === 'all' ? 'Tümü' : NC_STATUS_LABEL[f as NonConformityStatus]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setStatModal(item)} style={[s.card, { borderLeftColor: NC_SEV_COLOR[item.severity] }]}>
            <View style={[s.iconBox, { backgroundColor: NC_KIND_COLOR[item.kind] }]}>
              <Ionicons name={NC_KIND_ICON[item.kind] as any} size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.code}>{item.code}</Text>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.meta}>{item.location} · {NC_KIND_LABEL[item.kind]}</Text>
              <View style={s.badges}>
                <View style={[s.b, { backgroundColor: NC_SEV_COLOR[item.severity] }]}><Text style={s.bT}>{NC_SEV_LABEL[item.severity]}</Text></View>
                <View style={[s.b, { backgroundColor: NC_STATUS_COLOR[item.status] }]}><Text style={s.bT}>{NC_STATUS_LABEL[item.status]}</Text></View>
                {item.assignedTo && <View style={[s.b, { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary }]}><Text style={[s.bT, { color: colors.text.muted }]}>{item.assignedTo}</Text></View>}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.empty}>Kayıt yok.</Text>}
      />
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mTitle}>Yeni Uygunsuzluk</Text>
            <ScrollView style={{ maxHeight: 460 }}>
              <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Başlık" placeholderTextColor={colors.text.faint} />
              <TextInput style={[s.input, { height: 80 }]} value={description} onChangeText={setDescription} placeholder="Açıklama" multiline placeholderTextColor={colors.text.faint} />
              <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="Lokasyon" placeholderTextColor={colors.text.faint} />
              <TextInput style={s.input} value={reportedBy} onChangeText={setReportedBy} placeholder="Raporlayan" placeholderTextColor={colors.text.faint} />
              <Text style={s.lbl}>Tür</Text>
              <View style={s.row}>
                {KINDS.map(k => (
                  <TouchableOpacity key={k} style={[s.pill, kind === k && { backgroundColor: NC_KIND_COLOR[k] }]} onPress={() => setKind(k)}>
                    <Text style={[s.pillT, kind === k && s.pillTOn]}>{NC_KIND_LABEL[k]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.lbl}>Önem</Text>
              <View style={s.row}>
                {SEVS.map(sv => (
                  <TouchableOpacity key={sv} style={[s.pill, severity === sv && { backgroundColor: NC_SEV_COLOR[sv] }]} onPress={() => setSeverity(sv)}>
                    <Text style={[s.pillT, severity === sv && s.pillTOn]}>{NC_SEV_LABEL[sv]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={s.actions}>
              <TouchableOpacity style={[s.act, { backgroundColor: colors.bg.primary }]} onPress={() => setModal(false)}>
                <Text style={s.actT}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.act, { backgroundColor: '#14b8a6' }]} onPress={onSave}>
                <Text style={s.actT}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!statModal} transparent animationType="fade" onRequestClose={() => setStatModal(null)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mTitle}>Durum Değiştir</Text>
            <Text style={s.mSub}>{statModal?.code} · {statModal?.title}</Text>
            {STATUSES.map(st => (
              <TouchableOpacity
                key={st}
                style={[s.statBtn, { backgroundColor: NC_STATUS_COLOR[st] }]}
                onPress={async () => { if (statModal) await updateNcStatus(statModal.id, st); setStatModal(null); load(); }}
              >
                <Text style={s.statT}>{NC_STATUS_LABEL[st]}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.act, { backgroundColor: colors.bg.primary, marginTop: spacing.sm }]} onPress={() => setStatModal(null)}>
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
  filters: { padding: spacing.sm, gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, marginRight: 6 },
  chipOn: { backgroundColor: '#14b8a6', borderColor: '#14b8a6' },
  chipT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  chipTOn: { color: '#fff' },
  card: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  code: { color: colors.text.faint, fontSize: 10, fontWeight: '800' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  b: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  bT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: '#14b8a6', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  mTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  mSub: { color: colors.text.muted, fontSize: typography.xs },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, marginBottom: 6 },
  lbl: { color: colors.text.muted, fontSize: typography.xs, marginTop: 6, marginBottom: 4, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  pillT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  pillTOn: { color: '#fff' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  act: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  actT: { color: colors.text.primary, fontWeight: '800' },
  statBtn: { padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center', marginTop: 4 },
  statT: { color: '#fff', fontWeight: '800' },
});
