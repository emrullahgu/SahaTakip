// Faz 48 — CpServiceRequestScreen (POZ-DEV-185)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listCpRequests, createCpRequest, CP_URG_LABEL, CP_URG_COLOR, CP_REQ_STATUS_LABEL, CP_REQ_STATUS_COLOR } from '../services/customerPortal';
import type { CpServiceRequest, CpRequestUrgency } from '../types';

export default function CpServiceRequestScreen() {
  const [list, setList] = useState<CpServiceRequest[]>([]);
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [urg, setUrg] = useState<CpRequestUrgency>('normal');

  const load = useCallback(async () => setList(await listCpRequests()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    if (!title.trim() || !desc.trim()) { Alert.alert('Eksik', 'Başlık ve açıklama gerekli.'); return; }
    await createCpRequest({ title: title.trim(), description: desc.trim(), urgency: urg });
    setTitle(''); setDesc(''); setUrg('normal'); setShow(false);
    Alert.alert('Gönderildi', 'Talebiniz iletildi.');
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        {list.map(r => (
          <View key={r.id} style={[s.card, { borderLeftColor: CP_URG_COLOR[r.urgency] }]}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{r.title}</Text>
                <Text style={s.desc} numberOfLines={2}>{r.description}</Text>
              </View>
              <View style={[s.urgPill, { backgroundColor: CP_URG_COLOR[r.urgency] + '33', borderColor: CP_URG_COLOR[r.urgency] }]}>
                <Text style={[s.urgT, { color: CP_URG_COLOR[r.urgency] }]}>{CP_URG_LABEL[r.urgency]}</Text>
              </View>
            </View>
            <View style={s.metaRow}>
              <View style={[s.statusPill, { backgroundColor: CP_REQ_STATUS_COLOR[r.status] + '33', borderColor: CP_REQ_STATUS_COLOR[r.status] }]}>
                <Text style={[s.statusT, { color: CP_REQ_STATUS_COLOR[r.status] }]}>{CP_REQ_STATUS_LABEL[r.status]}</Text>
              </View>
              <Text style={s.date}>{new Date(r.createdAt).toLocaleDateString('tr-TR')}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={() => setShow(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
        <View style={s.modalBg}>
          <View style={s.modal}>
            <Text style={s.modalT}>Yeni Servis Talebi</Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Başlık" placeholderTextColor={colors.text.faint} />
            <TextInput style={[s.input, s.area]} value={desc} onChangeText={setDesc} placeholder="Açıklama" placeholderTextColor={colors.text.faint} multiline />
            <Text style={s.lbl}>Aciliyet</Text>
            <View style={s.chips}>
              {(['low', 'normal', 'high', 'critical'] as const).map(k => (
                <TouchableOpacity key={k} style={[s.chip, urg === k && { backgroundColor: CP_URG_COLOR[k] }]} onPress={() => setUrg(k)}>
                  <Text style={[s.chipT, urg === k && { color: '#fff' }]}>{CP_URG_LABEL[k]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalRow}>
              <TouchableOpacity style={[s.btn, { backgroundColor: '#64748b', flex: 1 }]} onPress={() => setShow(false)}>
                <Text style={s.btnT}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444', flex: 1 }]} onPress={submit}>
                <Text style={s.btnT}>Gönder</Text>
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
  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: 100 },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  row: { flexDirection: 'row', gap: spacing.sm },
  title: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  desc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  urgPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  urgT: { fontSize: typography.xs, fontWeight: '800' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusT: { fontSize: typography.xs, fontWeight: '800' },
  date: { color: colors.text.muted, fontSize: typography.xs },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  modalBg: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, gap: spacing.sm },
  modalT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  area: { minHeight: 80, textAlignVertical: 'top' },
  lbl: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  modalRow: { flexDirection: 'row', gap: spacing.sm },
  btn: { flexDirection: 'row', justifyContent: 'center', padding: 10, borderRadius: radius.sm },
  btnT: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
});
