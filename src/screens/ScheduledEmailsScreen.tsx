// ScheduledEmailsScreen — günlük/haftalık/aylık/yıllık rapor mail planlayıcısı (admin/manager).
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
 FlatList,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  EmailSchedule,
  EmailScheduleInput,
  KIND_LABEL,
  REPORT_TYPE_LABEL,
  ScheduleKind,
  ReportType,
  createSchedule,
  deleteSchedule,
  listSchedules,
  runNow,
  toggleSchedule,
  updateSchedule,
} from '../services/emailSchedules';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

const KINDS: ScheduleKind[] = ['daily', 'weekly', 'monthly', 'yearly'];
const REPORT_TYPES: ReportType[] = ['summary', 'kpi', 'workorders', 'collections', 'custom'];
const DOW = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'];

interface EditState extends Partial<EmailSchedule> {
  recipientsText?: string;
}

export default function ScheduledEmailsScreen() {
  const { profile, isDemoMode } = useAuth();
  const role = profile?.role;
  const isAuthorized = isDemoMode || role === 'admin' || role === 'manager';

  const [items, setItems] = useState<EmailSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await listSchedules();
    setItems(list);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openCreate = () => {
    setEditing({
      name: '',
      kind: 'daily',
      report_type: 'summary',
      hour_utc: 6,
      recipients: [],
      recipientsText: '',
      active: true,
    });
  };

  const openEdit = (s: EmailSchedule) => {
    setEditing({ ...s, recipientsText: (s.recipients ?? []).join(', ') });
  };

  const save = async () => {
    if (!editing) return;
    const name = (editing.name ?? '').trim();
    if (!name) {
      Alert.alert('Eksik', 'Plan adı gerekli.');
      return;
    }
    const recipients = (editing.recipientsText ?? '')
      .split(/[,;\n]/)
      .map(x => x.trim())
      .filter(Boolean);

    const payload: EmailScheduleInput = {
      name,
      kind: (editing.kind as ScheduleKind) ?? 'daily',
      report_type: (editing.report_type as ReportType) ?? 'summary',
      recipients,
      hour_utc: editing.hour_utc ?? 6,
      day_of_week: editing.kind === 'weekly' ? (editing.day_of_week ?? 1) : null,
      day_of_month: editing.kind === 'monthly' || editing.kind === 'yearly' ? (editing.day_of_month ?? 1) : null,
      month_of_year: editing.kind === 'yearly' ? (editing.month_of_year ?? 1) : null,
      subject_template: editing.subject_template ?? null,
      body_template: editing.body_template ?? null,
      active: editing.active ?? true,
    };

    const res = editing.id
      ? await updateSchedule(editing.id, payload)
      : await createSchedule(payload);
    if (res.error) {
      Alert.alert('Hata', res.error);
      return;
    }
    setEditing(null);
    load();
  };

  const remove = (s: EmailSchedule) => {
    Alert.alert('Sil', `"${s.name}" planı silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          const r = await deleteSchedule(s.id);
          if (r.error) Alert.alert('Hata', r.error);
          else load();
        },
      },
    ]);
  };

  const toggle = async (s: EmailSchedule) => {
    const r = await toggleSchedule(s.id, !s.active);
    if (r.error) Alert.alert('Hata', r.error);
    else load();
  };

  const runOnce = async (s: EmailSchedule) => {
    Alert.alert('Hemen gönder', `"${s.name}" bir sonraki cron tick'inde (≤15 dk) gönderilecek. Devam?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Tamam', onPress: async () => {
          const r = await runNow(s.id);
          if (r.error) Alert.alert('Hata', r.error);
          else load();
        },
      },
    ]);
  };

  if (!isAuthorized) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.text.muted} />
          <Text style={styles.emptyText}>Bu sayfa admin/manager için.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Planlı Rapor Mailleri</Text>
          <Text style={styles.subtitle}>{items.length} plan</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.85}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Yeni Plan</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.emerald.default} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.emerald.default} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState
              icon="mail-outline"
              title="Henüz plan yok"
              subtitle="Otomatik rapor gönderimi için yeni bir plan oluşturun."
              actionLabel="+ Yeni Plan"
              onAction={openCreate}
            />
          )
        }
        renderItem={({ item: s }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.row}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{s.name}</Text>
                  <View style={[styles.pill, s.active ? styles.pillOn : styles.pillOff]}>
                    <Text style={[styles.pillText, s.active ? styles.pillTextOn : styles.pillTextOff]}>
                      {s.active ? 'Aktif' : 'Pasif'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.row, { marginTop: 4, flexWrap: 'wrap' }]}>
                  <Tag icon="calendar-outline" text={KIND_LABEL[s.kind as keyof typeof KIND_LABEL]} />
                  <Tag icon="document-text-outline" text={REPORT_TYPE_LABEL[s.report_type as keyof typeof REPORT_TYPE_LABEL]} />
                  <Tag icon="time-outline" text={`${String(s.hour_utc).padStart(2, '0')}:00 UTC`} />
                </View>
              </View>
              <Switch
                value={s.active}
                onValueChange={() => toggle(s)}
                trackColor={{ false: colors.border.secondary, true: colors.emerald.default }}
              />
            </View>

            <Text style={styles.meta}>
              Alıcı: {s.recipients?.length ?? 0} • Sonraki:{' '}
              {s.next_run_at ? new Date(s.next_run_at).toLocaleString('tr-TR') : '—'}
            </Text>
            {s.last_run_at ? (
              <Text style={[styles.meta, { color: s.last_status === 'success' ? colors.emerald.default : colors.rose.default }]}>
                Son: {new Date(s.last_run_at).toLocaleString('tr-TR')} • {s.last_status ?? '—'}
                {s.last_error ? ` • ${s.last_error}` : ''}
              </Text>
            ) : null}

            <View style={[styles.row, { marginTop: spacing.sm, gap: spacing.sm }]}>
              <TouchableOpacity style={styles.smallBtn} onPress={() => openEdit(s)}>
                <Ionicons name="create-outline" size={14} color={colors.text.primary} />
                <Text style={styles.smallBtnText}>Düzenle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={() => runNow(s.id)}>
                <Ionicons name="play-outline" size={14} color={colors.text.primary} />
                <Text style={styles.smallBtnText}>Hemen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, styles.smallBtnDanger]} onPress={() => remove(s)}>
                <Ionicons name="trash-outline" size={14} color="#fff" />
                <Text style={[styles.smallBtnText, { color: '#fff' }]}>Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <EditModal
        editing={editing}
        setEditing={setEditing}
        onSave={save}
      />
    </SafeAreaView>
  );
}

function Tag({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.tag}>
      <Ionicons name={icon} size={11} color={colors.text.secondary} />
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

function EditModal({
  editing,
  setEditing,
  onSave,
}: {
  editing: EditState | null;
  setEditing: (s: EditState | null) => void;
  onSave: () => void;
}) {
  if (!editing) return null;
  const setField = <K extends keyof EditState>(k: K, v: EditState[K]) => setEditing({ ...editing, [k]: v });

  return (
    <Modal visible animationType="slide" transparent onRequestClose={() => setEditing(null)}>
      <View style={styles.modalBg}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing.id ? 'Planı Düzenle' : 'Yeni Plan'}</Text>
            <TouchableOpacity onPress={() => setEditing(null)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <Field label="Plan Adı">
              <TextInput
                style={styles.input}
                value={editing.name ?? ''}
                onChangeText={t => setField('name', t)}
                placeholder="Örn: Günlük Yönetici Özeti"
                placeholderTextColor={colors.text.faint}
              />
            </Field>

            <Field label="Sıklık">
              <View style={styles.chipRow}>
                {KINDS.map(k => (
                  <TouchableOpacity
                    key={k}
                    style={[styles.chip, editing.kind === k && styles.chipActive]}
                    onPress={() => setField('kind', k)}
                  >
                    <Text style={[styles.chipText, editing.kind === k && styles.chipTextActive]}>{KIND_LABEL[k]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            <Field label="Rapor Tipi">
              <View style={styles.chipRow}>
                {REPORT_TYPES.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.chip, editing.report_type === r && styles.chipActive]}
                    onPress={() => setField('report_type', r)}
                  >
                    <Text style={[styles.chipText, editing.report_type === r && styles.chipTextActive]}>{REPORT_TYPE_LABEL[r]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            <Field label="Saat (UTC, 0-23)">
              <TextInput
                style={styles.input}
                value={String(editing.hour_utc ?? 6)}
                onChangeText={t => setField('hour_utc', Math.max(0, Math.min(23, Number(t) || 0)))}
                keyboardType="numeric"
              />
            </Field>

            {editing.kind === 'weekly' ? (
              <Field label="Haftanın Günü">
                <View style={styles.chipRow}>
                  {DOW.map((d, i) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.chip, editing.day_of_week === i && styles.chipActive]}
                      onPress={() => setField('day_of_week', i)}
                    >
                      <Text style={[styles.chipText, editing.day_of_week === i && styles.chipTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>
            ) : null}

            {editing.kind === 'monthly' || editing.kind === 'yearly' ? (
              <Field label="Ayın Günü (1-31)">
                <TextInput
                  style={styles.input}
                  value={String(editing.day_of_month ?? 1)}
                  onChangeText={t => setField('day_of_month', Math.max(1, Math.min(31, Number(t) || 1)))}
                  keyboardType="numeric"
                />
              </Field>
            ) : null}

            {editing.kind === 'yearly' ? (
              <Field label="Yılın Ayı (1-12)">
                <TextInput
                  style={styles.input}
                  value={String(editing.month_of_year ?? 1)}
                  onChangeText={t => setField('month_of_year', Math.max(1, Math.min(12, Number(t) || 1)))}
                  keyboardType="numeric"
                />
              </Field>
            ) : null}

            <Field label="Alıcılar (virgülle ayır)">
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                value={editing.recipientsText ?? ''}
                onChangeText={t => setField('recipientsText', t)}
                placeholder="admin@firma.com, manager@firma.com"
                placeholderTextColor={colors.text.faint}
                multiline
                autoCapitalize="none"
              />
            </Field>

            <Field label="Konu (opsiyonel — placeholder: {{label}}, {{date}})">
              <TextInput
                style={styles.input}
                value={editing.subject_template ?? ''}
                onChangeText={t => setField('subject_template', t)}
                placeholder="SahaTakip {{label}} Rapor — {{date}}"
                placeholderTextColor={colors.text.faint}
              />
            </Field>

            <Field label="Aktif">
              <Switch
                value={!!editing.active}
                onValueChange={v => setField('active', v)}
                trackColor={{ false: colors.border.secondary, true: colors.emerald.default }}
              />
            </Field>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setEditing(null)}>
              <Text style={styles.modalBtnGhostText}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtn} onPress={onSave}>
              <Text style={styles.modalBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  subtitle: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.emerald.default,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyText: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center' },
  card: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.primary,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700', flex: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  pillOn: { backgroundColor: colors.emerald.bg, borderColor: colors.emerald.border },
  pillOff: { backgroundColor: colors.bg.card, borderColor: colors.border.secondary },
  pillText: { fontSize: typography.xs, fontWeight: '700' },
  pillTextOn: { color: colors.emerald.default },
  pillTextOff: { color: colors.text.muted },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginRight: 6,
    marginTop: 4,
  },
  tagText: { color: colors.text.secondary, fontSize: typography.xs, fontWeight: '600' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.xs },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.card,
    borderColor: colors.border.secondary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  smallBtnDanger: { backgroundColor: colors.rose.default, borderColor: colors.rose.default },
  smallBtnText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bg.primary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  modalTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  modalBtn: { flex: 1, backgroundColor: colors.emerald.default, padding: 12, borderRadius: radius.md, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '800' },
  modalBtnGhost: { backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.secondary },
  modalBtnGhostText: { color: colors.text.primary, fontWeight: '700' },
  label: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginBottom: 4 },
  input: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.primary,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.primary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  chipActive: { backgroundColor: colors.emerald.bg, borderColor: colors.emerald.border },
  chipText: { color: colors.text.secondary, fontSize: typography.xs, fontWeight: '700' },
  chipTextActive: { color: colors.emerald.default },
});
