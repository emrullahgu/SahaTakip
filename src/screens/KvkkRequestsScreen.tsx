// Faz 49 — KvkkRequestsScreen (POZ-DEV-192)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import {
  listKvkkRequests, addKvkkRequest, updateKvkkStatus,
  KVKK_TYPE_LABEL, KVKK_STATUS_LABEL, KVKK_STATUS_COLOR,
} from '../services/secCenter';
import type { KvkkRequest, KvkkRequestType, KvkkRequestStatus } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const TYPES: KvkkRequestType[] = ['access', 'erasure', 'rectification', 'portability', 'objection'];
const NEXT_STATUS: Record<KvkkRequestStatus, KvkkRequestStatus | null> = {
  pending: 'in_progress',
  in_progress: 'fulfilled',
  fulfilled: null,
  rejected: null,
};

export default function KvkkRequestsScreen() {
  const [list, setList] = useState<KvkkRequest[]>([]);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<KvkkRequestType>('access');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => setList(await listKvkkRequests()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    if (!name.trim() || !email.trim()) { Alert.alert('Eksik', 'Ad ve e-posta zorunlu.'); return; }
    await addKvkkRequest({ requesterName: name.trim(), requesterEmail: email.trim(), type, notes: notes.trim() || undefined });
    setName(''); setEmail(''); setNotes(''); setType('access'); setModal(false);
    load();
  };

  const advance = async (r: KvkkRequest) => {
    const next = NEXT_STATUS[r.status];
    if (next) { await updateKvkkStatus(r.id, next); load(); }
  };
  const reject = async (r: KvkkRequest) => { await updateKvkkStatus(r.id, 'rejected'); load(); };

  const dueRisk = (d: string) => {
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    if (days < 0) return { c: '#ef4444', t: 'Süresi geçti' };
    if (days <= 7) return { c: '#f59e0b', t: `${days} gün kaldı` };
    return { c: '#22c55e', t: `${days} gün kaldı` };
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={list}
        keyExtractor={r => r.id}
        contentContainerStyle={s.scroll}
        ListEmptyComponent={
          <EmptyState
            icon="shield-checkmark-outline"
            title="KVKK talebi yok"
            subtitle="Vatandaşlardan gelen KVKK veri talepleri burada listelenir."
            actionLabel="+ Yeni Talep"
            onAction={() => setModal(true)}
          />
        }
        renderItem={({ item: r }) => {
          const risk = dueRisk(r.dueDate);
          return (
            <View key={r.id} style={[s.card, { borderLeftColor: KVKK_STATUS_COLOR[r.status as keyof typeof KVKK_STATUS_COLOR] }]}>
              <View style={s.row}>
                <Text style={s.name}>{r.requesterName}</Text>
                <View style={[s.pill, { backgroundColor: KVKK_STATUS_COLOR[r.status as keyof typeof KVKK_STATUS_COLOR] + '33', borderColor: KVKK_STATUS_COLOR[r.status as keyof typeof KVKK_STATUS_COLOR] }]}>
                  <Text style={[s.pillT, { color: KVKK_STATUS_COLOR[r.status as keyof typeof KVKK_STATUS_COLOR] }]}>{KVKK_STATUS_LABEL[r.status as keyof typeof KVKK_STATUS_LABEL]}</Text>
                </View>
              </View>
              <Text style={s.email}>{r.requesterEmail}</Text>
              <View style={s.metaRow}>
                <View style={s.typePill}><Text style={s.typeT}>{KVKK_TYPE_LABEL[r.type as keyof typeof KVKK_TYPE_LABEL]}</Text></View>
                <Text style={[s.due, { color: risk.c }]}>{risk.t}</Text>
              </View>
              {r.notes && <Text style={s.notes}>"{r.notes}"</Text>}
              {(r.status === 'pending' || r.status === 'in_progress') && (
                <View style={s.actions}>
                  <TouchableOpacity style={[s.btn, { backgroundColor: '#22c55e' }]} onPress={() => advance(r)}>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                    <Text style={s.btnT}>{r.status === 'pending' ? 'Başlat' : 'Tamamla'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444' }]} onPress={() => reject(r)}>
                    <Ionicons name="close" size={14} color="#fff" />
                    <Text style={s.btnT}>Reddet</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalC}>
            <Text style={s.modalT}>Yeni KVKK Talebi</Text>
            <TextInput style={s.input} placeholder="Ad Soyad" placeholderTextColor={colors.text.faint} value={name} onChangeText={setName} />
            <TextInput style={s.input} placeholder="E-posta" placeholderTextColor={colors.text.faint} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <View style={s.chips}>
              {TYPES.map(t => (
                <TouchableOpacity key={t} style={[s.chip, type === t && { backgroundColor: '#0ea5e9' }]} onPress={() => setType(t)}>
                  <Text style={[s.chipT, type === t && { color: '#fff' }]}>{KVKK_TYPE_LABEL[t as keyof typeof KVKK_TYPE_LABEL]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[s.input, { minHeight: 70 }]} placeholder="Notlar (opsiyonel)" placeholderTextColor={colors.text.faint} value={notes} onChangeText={setNotes} multiline />
            <View style={s.modalRow}>
              <TouchableOpacity style={[s.btn, { backgroundColor: '#64748b', flex: 1 }]} onPress={() => setModal(false)}>
                <Text style={s.btnT}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { backgroundColor: '#22c55e', flex: 1 }]} onPress={submit}>
                <Text style={s.btnT}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  email: { color: colors.text.muted, fontSize: typography.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#0ea5e933', borderWidth: 1, borderColor: '#0ea5e9' },
  typeT: { color: '#0ea5e9', fontSize: typography.xs, fontWeight: '700' },
  due: { fontSize: typography.xs, fontWeight: '700' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  notes: { color: colors.text.muted, fontSize: typography.sm, fontStyle: 'italic', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.sm },
  btnT: { color: '#fff', fontSize: typography.xs, fontWeight: '800' },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  modalBg: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: spacing.md },
  modalC: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.lg, gap: spacing.sm },
  modalT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  modalRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
