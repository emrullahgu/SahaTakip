// Faz 45 — CapaScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { CapaRecord, CapaKind, CapaStatus, NonConformityRecord } from '../types';
import {
  listCapa, createCapa, updateCapaStatus, listNonConformities,
  CAPA_KIND_LABEL, CAPA_KIND_COLOR, CAPA_STATUS_LABEL, CAPA_STATUS_COLOR,
} from '../services/quality';

const STATUSES: CapaStatus[] = ['planned', 'in_progress', 'done'];

export default function CapaScreen() {
  const [items, setItems] = useState<CapaRecord[]>([]);
  const [ncs, setNcs] = useState<NonConformityRecord[]>([]);
  const [modal, setModal] = useState(false);
  const [statModal, setStatModal] = useState<CapaRecord | null>(null);

  const [ncId, setNcId] = useState('');
  const [kind, setKind] = useState<CapaKind>('corrective');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [days, setDays] = useState('7');
  const [eff, setEff] = useState(3);

  const load = useCallback(async () => { setItems(await listCapa()); setNcs(await listNonConformities()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSave = async () => {
    if (!ncId || !description.trim() || !owner.trim()) { Alert.alert('Eksik', 'NC seçimi, açıklama ve sorumlu gerekli.'); return; }
    const nc = ncs.find(n => n.id === ncId);
    await createCapa({
      ncId, ncTitle: nc?.title, kind, description, owner,
      plannedAt: new Date(Date.now() + (Number(days) || 7) * 86400000).toISOString(),
    });
    setNcId(''); setDescription(''); setOwner(''); setDays('7'); setKind('corrective');
    setModal(false); load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setStatModal(item)} style={[s.card, { borderLeftColor: CAPA_KIND_COLOR[item.kind] }]}>
            <View style={[s.iconBox, { backgroundColor: CAPA_KIND_COLOR[item.kind] }]}>
              <Ionicons name={item.kind === 'corrective' ? 'build' : 'shield'} size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{item.description}</Text>
              <Text style={s.meta}>{item.ncTitle || item.ncId} · {item.owner}</Text>
              <Text style={s.meta}>Hedef: {new Date(item.plannedAt).toLocaleDateString('tr-TR')}{item.completedAt ? ` · Tamamlandı: ${new Date(item.completedAt).toLocaleDateString('tr-TR')}` : ''}</Text>
              <View style={s.badges}>
                <View style={[s.b, { backgroundColor: CAPA_KIND_COLOR[item.kind] }]}><Text style={s.bT}>{CAPA_KIND_LABEL[item.kind]}</Text></View>
                <View style={[s.b, { backgroundColor: CAPA_STATUS_COLOR[item.status] }]}><Text style={s.bT}>{CAPA_STATUS_LABEL[item.status]}</Text></View>
                {item.effectiveness && <View style={[s.b, { backgroundColor: '#eab308' }]}><Text style={s.bT}>★ {item.effectiveness}/5</Text></View>}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.empty}>Faaliyet yok.</Text>}
      />
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mTitle}>Yeni DÖF/Ö-Faaliyet</Text>
            <ScrollView style={{ maxHeight: 460 }}>
              <Text style={s.lbl}>Uygunsuzluk</Text>
              <ScrollView style={{ maxHeight: 140 }}>
                {ncs.map(n => (
                  <TouchableOpacity key={n.id} style={[s.ncRow, ncId === n.id && { borderColor: '#0ea5e9', backgroundColor: '#0ea5e920' }]} onPress={() => setNcId(n.id)}>
                    <Text style={s.ncCode}>{n.code}</Text>
                    <Text style={s.ncTitle} numberOfLines={1}>{n.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={s.lbl}>Tür</Text>
              <View style={s.row}>
                {(['corrective', 'preventive'] as CapaKind[]).map(k => (
                  <TouchableOpacity key={k} style={[s.pill, kind === k && { backgroundColor: CAPA_KIND_COLOR[k] }]} onPress={() => setKind(k)}>
                    <Text style={[s.pillT, kind === k && s.pillTOn]}>{CAPA_KIND_LABEL[k]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={[s.input, { height: 70 }]} value={description} onChangeText={setDescription} placeholder="Faaliyet açıklaması" multiline placeholderTextColor={colors.text.faint} />
              <TextInput style={s.input} value={owner} onChangeText={setOwner} placeholder="Sorumlu" placeholderTextColor={colors.text.faint} />
              <TextInput style={s.input} value={days} onChangeText={setDays} placeholder="Süre (gün)" keyboardType="numeric" placeholderTextColor={colors.text.faint} />
            </ScrollView>
            <View style={s.actions}>
              <TouchableOpacity style={[s.act, { backgroundColor: colors.bg.primary }]} onPress={() => setModal(false)}>
                <Text style={s.actT}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.act, { backgroundColor: '#0ea5e9' }]} onPress={onSave}>
                <Text style={s.actT}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!statModal} transparent animationType="fade" onRequestClose={() => setStatModal(null)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mTitle}>Durum Güncelle</Text>
            <Text style={s.mSub}>{statModal?.description}</Text>
            {STATUSES.map(st => (
              <TouchableOpacity
                key={st}
                style={[s.statBtn, { backgroundColor: CAPA_STATUS_COLOR[st] }]}
                onPress={async () => {
                  if (statModal) await updateCapaStatus(statModal.id, st, st === 'done' ? eff : undefined);
                  setStatModal(null); load();
                }}
              >
                <Text style={s.statT}>{CAPA_STATUS_LABEL[st]}</Text>
              </TouchableOpacity>
            ))}
            <Text style={s.lbl}>Etkinlik (tamamlandı için)</Text>
            <View style={s.row}>
              {[1, 2, 3, 4, 5].map(v => (
                <TouchableOpacity key={v} style={[s.pill, eff === v && { backgroundColor: '#eab308' }]} onPress={() => setEff(v)}>
                  <Text style={[s.pillT, eff === v && s.pillTOn]}>★ {v}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
  card: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  iconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  b: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  bT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', elevation: 5 },
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
  ncRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm, backgroundColor: colors.bg.primary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, marginBottom: 4 },
  ncCode: { color: colors.text.faint, fontSize: 10, fontWeight: '800', minWidth: 80 },
  ncTitle: { color: colors.text.primary, fontSize: typography.xs, flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  act: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  actT: { color: colors.text.primary, fontWeight: '800' },
  statBtn: { padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center', marginTop: 4 },
  statT: { color: '#fff', fontWeight: '800' },
});
