// OfficeMeetingScreen — toplantı notu detay/düzenleme (başlık, tarih, katılımcılar,
// not, aksiyon maddeleri). Aksiyon maddeleri tamamlandı olarak işaretlenebilir.
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography, brand } from '../theme';
import { RootStackParamList, OfficeMeeting, OfficeActionItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { getMeeting, saveMeeting, deleteMeeting, newActionItem } from '../services/officeWorkspace';
import { localDateISO } from '../utils/date';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'OfficeMeeting'>;

export default function OfficeMeetingScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const meetingId = route.params?.meetingId;
  const { user, profile } = useAuth();
  const { showToast } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('Toplantı');
  const [date, setDate] = useState(localDateISO());
  const [time, setTime] = useState('');
  const [attendees, setAttendees] = useState<string[]>([]);
  const [attInput, setAttInput] = useState('');
  const [notes, setNotes] = useState('');
  const [actions, setActions] = useState<OfficeActionItem[]>([]);
  const [actInput, setActInput] = useState('');

  const load = useCallback(async () => {
    if (meetingId) {
      const m = await getMeeting(meetingId);
      if (m) {
        setTitle(m.title); setDate(m.date); setTime(m.time ?? '');
        setAttendees(m.attendees); setNotes(m.notes); setActions(m.actionItems);
      }
    }
    setLoading(false);
  }, [meetingId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addAttendee = () => {
    const v = attInput.trim();
    if (!v) return;
    setAttendees(prev => Array.from(new Set([...prev, v])));
    setAttInput('');
  };
  const removeAttendee = (a: string) => setAttendees(prev => prev.filter(x => x !== a));

  const addAction = () => {
    const v = actInput.trim();
    if (!v) return;
    setActions(prev => [...prev, newActionItem(v)]);
    setActInput('');
  };
  const toggleAction = (id: string) => setActions(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a));
  const setActionOwner = (id: string, owner: string) => setActions(prev => prev.map(a => a.id === id ? { ...a, owner } : a));
  const removeAction = (id: string) => setActions(prev => prev.filter(a => a.id !== id));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveMeeting({
        id: meetingId,
        title: title.trim() || 'Toplantı',
        date, time: time.trim() || undefined,
        attendees, notes, actionItems: actions,
        createdBy: user?.id, createdByName: profile?.full_name ?? undefined,
      });
      showToast('Toplantı kaydedildi');
      nav.goBack();
    } catch (e: any) {
      Alert.alert('Kaydedilemedi', e?.message || 'Hata');
    } finally { setSaving(false); }
  };

  const onDelete = () => {
    if (!meetingId) { nav.goBack(); return; }
    Alert.alert('Toplantıyı sil', 'Bu toplantı notu silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { try { await deleteMeeting(meetingId); nav.goBack(); } catch (e: any) { Alert.alert('Silinemedi', e?.message || 'Hata'); } } },
    ]);
  };

  if (loading) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.center}><ActivityIndicator color={brand.green} /></View></SafeAreaView>;
  }

  const openCount = actions.filter(a => !a.done).length;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TextInput style={s.titleInput} value={title} onChangeText={setTitle} placeholder="Toplantı başlığı" placeholderTextColor={colors.text.faint} multiline />

          <View style={s.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Tarih (YYYY-AA-GG)</Text>
              <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="2026-07-01" placeholderTextColor={colors.text.faint} />
            </View>
            <View style={{ width: 110 }}>
              <Text style={s.label}>Saat</Text>
              <TextInput style={s.input} value={time} onChangeText={setTime} placeholder="14:30" placeholderTextColor={colors.text.faint} />
            </View>
          </View>

          <Text style={s.label}>Katılımcılar</Text>
          <View style={s.chipRow}>
            {attendees.map(a => (
              <TouchableOpacity key={a} style={s.chip} onPress={() => removeAttendee(a)}>
                <Text style={s.chipText}>{a}</Text>
                <Ionicons name="close" size={13} color={colors.text.muted} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.addRow}>
            <TextInput style={[s.input, { flex: 1 }]} value={attInput} onChangeText={setAttInput} placeholder="İsim ekle" placeholderTextColor={colors.text.faint} onSubmitEditing={addAttendee} returnKeyType="done" />
            <TouchableOpacity style={s.addMini} onPress={addAttendee}><Ionicons name="add" size={20} color="#fff" /></TouchableOpacity>
          </View>

          <Text style={s.label}>Notlar</Text>
          <TextInput style={[s.input, s.textarea]} value={notes} onChangeText={setNotes} placeholder="Gündem, kararlar, notlar…" placeholderTextColor={colors.text.faint} multiline />

          <View style={s.actHeader}>
            <Text style={s.label}>Aksiyon Maddeleri</Text>
            {openCount > 0 && <Text style={s.openTag}>{openCount} açık</Text>}
          </View>
          {actions.map(a => (
            <View key={a.id} style={s.actItem}>
              <TouchableOpacity onPress={() => toggleAction(a.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name={a.done ? 'checkbox' : 'square-outline'} size={20} color={a.done ? brand.green : colors.text.muted} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[s.actText, a.done && s.actDone]}>{a.text}</Text>
                <TextInput style={s.ownerInput} value={a.owner} onChangeText={t => setActionOwner(a.id, t)} placeholder="Sorumlu (opsiyonel)" placeholderTextColor={colors.text.faint} />
              </View>
              <TouchableOpacity onPress={() => removeAction(a.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="trash-outline" size={16} color={colors.rose.default} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={s.addRow}>
            <TextInput style={[s.input, { flex: 1 }]} value={actInput} onChangeText={setActInput} placeholder="Aksiyon ekle" placeholderTextColor={colors.text.faint} onSubmitEditing={addAction} returnKeyType="done" />
            <TouchableOpacity style={s.addMini} onPress={addAction}><Ionicons name="add" size={20} color="#fff" /></TouchableOpacity>
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={s.saveText}>Kaydet</Text></>}
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtn} onPress={onDelete} activeOpacity={0.85}>
            <Text style={s.deleteText}>{meetingId ? 'Sil' : 'Vazgeç'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: 120 },
  titleInput: { color: colors.text.primary, fontSize: 24, fontWeight: '800', padding: 0, marginBottom: spacing.md, lineHeight: 30 },
  dateRow: { flexDirection: 'row', gap: spacing.md },
  label: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: spacing.md, marginBottom: 6 },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text.primary, fontSize: typography.base },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  chipText: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  addMini: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: brand.green, alignItems: 'center', justifyContent: 'center' },
  actHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  openTag: { color: colors.rose.default, fontSize: typography.xs, fontWeight: '800', marginTop: spacing.md },
  actItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  actText: { color: colors.text.primary, fontSize: typography.base, fontWeight: '600', paddingTop: 1 },
  actDone: { textDecorationLine: 'line-through', color: colors.text.faint },
  ownerInput: { color: colors.text.muted, fontSize: typography.sm, padding: 0, marginTop: 2 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: brand.green, paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.xl },
  saveText: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  deleteBtn: { alignItems: 'center', paddingVertical: 12, marginTop: spacing.sm },
  deleteText: { color: colors.rose.default, fontWeight: '700', fontSize: typography.base },
});
