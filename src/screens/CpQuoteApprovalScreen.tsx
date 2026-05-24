// Faz 48 — CpQuoteApprovalScreen (POZ-DEV-183)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listCpQuotes, updateCpQuoteStatus } from '../services/customerPortal';
import type { CpQuoteCard } from '../types';

const STATUS_COLOR: Record<CpQuoteCard['status'], string> = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' };
const STATUS_LABEL: Record<CpQuoteCard['status'], string> = { pending: 'Bekliyor', approved: 'Onaylandı', rejected: 'Reddedildi' };

export default function CpQuoteApprovalScreen() {
  const [list, setList] = useState<CpQuoteCard[]>([]);
  const [filter, setFilter] = useState<CpQuoteCard['status'] | 'all'>('pending');
  const [target, setTarget] = useState<CpQuoteCard | null>(null);
  const [action, setAction] = useState<'approved' | 'rejected'>('approved');
  const [comment, setComment] = useState('');

  const load = useCallback(async () => setList(await listCpQuotes()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = list.filter(q => filter === 'all' || q.status === filter);
  const submit = async () => {
    if (!target) return;
    await updateCpQuoteStatus(target.id, action, comment.trim() || undefined);
    setTarget(null); setComment('');
    Alert.alert('Başarılı', action === 'approved' ? 'Teklif onaylandı.' : 'Teklif reddedildi.');
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.chips}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(k => (
            <TouchableOpacity key={k} style={[s.chip, filter === k && { backgroundColor: '#0ea5e9' }]} onPress={() => setFilter(k)}>
              <Text style={[s.chipT, filter === k && { color: '#fff' }]}>{k === 'all' ? 'Tümü' : STATUS_LABEL[k]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.map(q => (
          <View key={q.id} style={s.card}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.num}>{q.number}</Text>
                <Text style={s.title}>{q.title}</Text>
              </View>
              <View style={[s.statusPill, { backgroundColor: STATUS_COLOR[q.status] + '33', borderColor: STATUS_COLOR[q.status] }]}>
                <Text style={[s.statusT, { color: STATUS_COLOR[q.status] }]}>{STATUS_LABEL[q.status]}</Text>
              </View>
            </View>
            <View style={s.metaRow}>
              <Text style={s.meta}>Geçerlilik: {new Date(q.validUntil).toLocaleDateString('tr-TR')}</Text>
              <Text style={s.total}>₺{q.total.toLocaleString('tr-TR')}</Text>
            </View>
            {q.customerComment && (
              <View style={s.commentBox}>
                <Ionicons name="chatbubble" size={14} color={colors.text.muted} />
                <Text style={s.commentT}>{q.customerComment}</Text>
              </View>
            )}
            {q.status === 'pending' && (
              <View style={s.actions}>
                <TouchableOpacity style={[s.btn, { backgroundColor: '#22c55e' }]} onPress={() => { setTarget(q); setAction('approved'); }}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={s.btnT}>Onayla</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444' }]} onPress={() => { setTarget(q); setAction('rejected'); }}>
                  <Ionicons name="close" size={16} color="#fff" />
                  <Text style={s.btnT}>Reddet</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!target} transparent animationType="fade" onRequestClose={() => setTarget(null)}>
        <View style={s.modalBg}>
          <View style={s.modal}>
            <Text style={s.modalT}>{action === 'approved' ? 'Teklif Onayı' : 'Teklif Reddi'}</Text>
            <Text style={s.modalSub}>{target?.number} · ₺{target?.total.toLocaleString('tr-TR')}</Text>
            <TextInput
              style={s.area}
              placeholder="Yorum (opsiyonel)"
              placeholderTextColor={colors.text.faint}
              multiline value={comment} onChangeText={setComment}
            />
            <View style={s.modalRow}>
              <TouchableOpacity style={[s.btn, { backgroundColor: '#64748b', flex: 1 }]} onPress={() => setTarget(null)}>
                <Text style={s.btnT}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { backgroundColor: action === 'approved' ? '#22c55e' : '#ef4444', flex: 1 }]} onPress={submit}>
                <Text style={s.btnT}>{action === 'approved' ? 'Onayla' : 'Reddet'}</Text>
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
  chips: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  num: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  title: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusT: { fontSize: typography.xs, fontWeight: '800' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: colors.text.muted, fontSize: typography.xs },
  total: { color: '#22c55e', fontSize: typography.base, fontWeight: '800' },
  commentBox: { flexDirection: 'row', gap: 6, backgroundColor: colors.bg.primary, padding: 8, borderRadius: radius.sm },
  commentT: { color: colors.text.muted, fontSize: typography.xs, flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: radius.sm },
  btnT: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
  modalBg: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, gap: spacing.sm },
  modalT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  modalSub: { color: colors.text.muted, fontSize: typography.sm },
  area: { backgroundColor: colors.bg.primary, color: colors.text.primary, borderRadius: radius.sm, padding: spacing.sm, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border.primary },
  modalRow: { flexDirection: 'row', gap: spacing.sm },
});
