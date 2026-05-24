// Faz 49 — DataExportScreen (POZ-DEV-193)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listExportJobs, addExportJob, SEC_JOB_LABEL, SEC_JOB_COLOR } from '../services/secCenter';
import type { DataExportJob } from '../types';

const FORMATS: DataExportJob['format'][] = ['json', 'csv', 'pdf'];
const FORMAT_ICON: Record<DataExportJob['format'], string> = { json: 'code', csv: 'grid', pdf: 'document' };

export default function DataExportScreen() {
  const [list, setList] = useState<DataExportJob[]>([]);
  const [modal, setModal] = useState(false);
  const [user, setUser] = useState('');
  const [format, setFormat] = useState<DataExportJob['format']>('json');

  const load = useCallback(async () => setList(await listExportJobs()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    if (!user.trim()) { Alert.alert('Eksik', 'Kullanıcı adı zorunlu.'); return; }
    await addExportJob(user.trim(), format);
    setUser(''); setFormat('json'); setModal(false);
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Ionicons name="cloud-download" size={40} color="#22c55e" />
          <Text style={s.heroT}>Veri Dışa Aktarım</Text>
          <Text style={s.heroS}>KVKK m.11 kapsamında kullanıcı verisi indirme</Text>
        </View>

        {list.map(j => (
          <View key={j.id} style={[s.card, { borderLeftColor: SEC_JOB_COLOR[j.status] }]}>
            <View style={s.row}>
              <View style={[s.iconBox, { backgroundColor: SEC_JOB_COLOR[j.status] + '22', borderColor: SEC_JOB_COLOR[j.status] }]}>
                <Ionicons name={FORMAT_ICON[j.format] as any} size={20} color={SEC_JOB_COLOR[j.status]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.user}>{j.userName}</Text>
                <Text style={s.meta}>{j.format.toUpperCase()} · {new Date(j.requestedAt).toLocaleDateString('tr-TR')}</Text>
                {j.sizeMb && <Text style={s.meta}>{j.sizeMb.toFixed(1)} MB</Text>}
              </View>
              <View style={[s.pill, { backgroundColor: SEC_JOB_COLOR[j.status] + '33', borderColor: SEC_JOB_COLOR[j.status] }]}>
                <Text style={[s.pillT, { color: SEC_JOB_COLOR[j.status] }]}>{SEC_JOB_LABEL[j.status]}</Text>
              </View>
            </View>
            {j.status === 'completed' && (
              <TouchableOpacity style={s.dlBtn}>
                <Ionicons name="download" size={14} color="#22c55e" />
                <Text style={s.dlT}>İndir</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalC}>
            <Text style={s.modalT}>Yeni Dışa Aktarım</Text>
            <TextInput style={s.input} placeholder="Kullanıcı adı" placeholderTextColor={colors.text.faint} value={user} onChangeText={setUser} />
            <Text style={s.lbl}>Format</Text>
            <View style={s.chips}>
              {FORMATS.map(f => (
                <TouchableOpacity key={f} style={[s.chip, format === f && { backgroundColor: '#22c55e' }]} onPress={() => setFormat(f)}>
                  <Ionicons name={FORMAT_ICON[f] as any} size={14} color={format === f ? '#fff' : colors.text.primary} />
                  <Text style={[s.chipT, format === f && { color: '#fff' }]}>{f.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalRow}>
              <TouchableOpacity style={[s.btn, { backgroundColor: '#64748b', flex: 1 }]} onPress={() => setModal(false)}>
                <Text style={s.btnT}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { backgroundColor: '#22c55e', flex: 1 }]} onPress={submit}>
                <Text style={s.btnT}>Kuyruğa Al</Text>
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
  hero: { backgroundColor: '#22c55e22', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#22c55e', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroS: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  user: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  dlBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  dlT: { color: '#22c55e', fontSize: typography.xs, fontWeight: '700' },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  modalBg: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: spacing.md },
  modalC: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.lg, gap: spacing.sm },
  modalT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  lbl: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  modalRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  btn: { paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  btnT: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
});
