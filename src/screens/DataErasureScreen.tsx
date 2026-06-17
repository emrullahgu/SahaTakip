// Faz 49 — DataErasureScreen (POZ-DEV-194)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listErasureJobs, addErasureJob, SEC_JOB_LABEL, SEC_JOB_COLOR } from '../services/secCenter';
import { supabase } from '../services/supabase';
import type { DataErasureJob } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const SCOPES: DataErasureJob['scope'][] = ['full', 'anonymize', 'partial'];
const SCOPE_LABEL: Record<DataErasureJob['scope'], string> = { full: 'Tam Silme', anonymize: 'Anonimleştirme', partial: 'Kısmi Silme' };
const SCOPE_ICON: Record<DataErasureJob['scope'], string> = { full: 'trash', anonymize: 'eye-off', partial: 'cut' };
const SCOPE_COLOR: Record<DataErasureJob['scope'], string> = { full: '#dc2626', anonymize: '#a855f7', partial: '#f59e0b' };

export default function DataErasureScreen() {
  const [list, setList] = useState<DataErasureJob[]>([]);
  const [modal, setModal] = useState(false);
  const [user, setUser] = useState('');
  const [scope, setScope] = useState<DataErasureJob['scope']>('anonymize');

  const load = useCallback(async () => setList(await listErasureJobs()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    if (!user.trim()) { Alert.alert('Eksik', 'Kullanıcı adı zorunlu.'); return; }
    Alert.alert('Onay', `Bu işlem GERİ ALINAMAZ. "${user}" için ${SCOPE_LABEL[scope]} başlatılsın mı?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Onayla',
        style: 'destructive',
        onPress: async () => {
          // 'Tam Silme' için kullanıcıyı tam ada göre çöz → gerçek sunucu silmesi.
          let userId: string | undefined;
          if (scope === 'full') {
            try {
              const { data } = await supabase.from('profiles').select('id, full_name').ilike('full_name', user.trim());
              if (data && data.length === 1) {
                userId = (data[0] as any).id;
              } else if (data && data.length > 1) {
                Alert.alert('Belirsiz kullanıcı', 'Bu ada birden fazla kayıt uyuyor; lütfen tam adı girin.');
                return;
              }
            } catch { /* çözülemezse aşağıda kuyruğa düşer */ }
          }
          const job = await addErasureJob(user.trim(), scope, userId);
          setUser(''); setScope('anonymize'); setModal(false);
          load();
          // DÜRÜST geri bildirim — sahte "başlatıldı" yok.
          if (job.status === 'completed') {
            Alert.alert('Silme tamamlandı', `${job.affectedRecords ?? 0} kayıt (konum/vardiya/check-in) kalıcı olarak silindi.`);
          } else if (job.status === 'failed') {
            Alert.alert('Silme başarısız', 'Sunucu işlemi reddetti (yetki/bağlantı). Kayıt başarısız olarak işaretlendi.');
          } else if (scope === 'full') {
            Alert.alert('Kuyruğa alındı', 'Kullanıcı tam adla eşleşmedi; gerçek silme yapılamadı, talep kuyruğa alındı.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={list}
        keyExtractor={j => j.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <View style={s.warn}>
            <Ionicons name="warning" size={24} color="#ef4444" />
            <Text style={s.warnT}>Bu işlemler kalıcıdır ve geri alınamaz.</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="trash-outline"
            title="Silme kaydı yok"
            subtitle="Geçmiş veri silme/anonimleştirme talepleri burada listelenir."
            actionLabel="+ Yeni İşlem"
            onAction={() => setModal(true)}
          />
        }
        renderItem={({ item: j }) => (
          <View key={j.id} style={[s.card, { borderLeftColor: SEC_JOB_COLOR[j.status as keyof typeof SEC_JOB_COLOR] }]}>
            <View style={s.row}>
              <View style={[s.iconBox, { backgroundColor: SCOPE_COLOR[j.scope as keyof typeof SCOPE_COLOR] + '22', borderColor: SCOPE_COLOR[j.scope as keyof typeof SCOPE_COLOR] }]}>
                <Ionicons name={SCOPE_ICON[j.scope as keyof typeof SCOPE_ICON] as any} size={20} color={SCOPE_COLOR[j.scope as keyof typeof SCOPE_COLOR]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.user}>{j.userName}</Text>
                <Text style={[s.scope, { color: SCOPE_COLOR[j.scope as keyof typeof SCOPE_COLOR] }]}>{SCOPE_LABEL[j.scope as keyof typeof SCOPE_LABEL]}</Text>
                <Text style={s.meta}>{new Date(j.requestedAt).toLocaleDateString('tr-TR')}</Text>
                {j.affectedRecords !== undefined && (
                  <Text style={s.meta}>{j.affectedRecords.toLocaleString('tr-TR')} kayıt etkilendi</Text>
                )}
              </View>
              <View style={[s.pill, { backgroundColor: SEC_JOB_COLOR[j.status as keyof typeof SEC_JOB_COLOR] + '33', borderColor: SEC_JOB_COLOR[j.status as keyof typeof SEC_JOB_COLOR] }]}>
                <Text style={[s.pillT, { color: SEC_JOB_COLOR[j.status as keyof typeof SEC_JOB_COLOR] }]}>{SEC_JOB_LABEL[j.status as keyof typeof SEC_JOB_LABEL]}</Text>
              </View>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}>
        <Ionicons name="trash" size={26} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalC}>
            <Text style={s.modalT}>Veri Silme/Anonimleştirme</Text>
            <TextInput style={s.input} placeholder="Kullanıcı adı" placeholderTextColor={colors.text.faint} value={user} onChangeText={setUser} />
            <Text style={s.lbl}>Kapsam</Text>
            <View style={s.chips}>
              {SCOPES.map(sc => (
                <TouchableOpacity key={sc} style={[s.chip, scope === sc && { backgroundColor: SCOPE_COLOR[sc], borderColor: SCOPE_COLOR[sc] }]} onPress={() => setScope(sc)}>
                  <Ionicons name={SCOPE_ICON[sc] as any} size={14} color={scope === sc ? '#fff' : colors.text.primary} />
                  <Text style={[s.chipT, scope === sc && { color: '#fff' }]}>{SCOPE_LABEL[sc]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalRow}>
              <TouchableOpacity style={[s.btn, { backgroundColor: '#64748b', flex: 1 }]} onPress={() => setModal(false)}>
                <Text style={s.btnT}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { backgroundColor: '#dc2626', flex: 1 }]} onPress={submit}>
                <Text style={s.btnT}>Başlat</Text>
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
  warn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#ef444422', padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: '#ef4444' },
  warnT: { color: '#ef4444', fontSize: typography.sm, fontWeight: '700', flex: 1 },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  user: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  scope: { fontSize: typography.xs, fontWeight: '700', marginTop: 2 },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  modalBg: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: spacing.md },
  modalC: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.lg, gap: spacing.sm },
  modalT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  lbl: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  modalRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  btn: { paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  btnT: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
});
