// CalendarEventFormScreen — POZ-DEV-311 Etkinlik oluştur/düzenle
import React, { useCallback, useEffect, useState } from 'react';
import { localDateISO } from '../utils/date';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, CalendarEvent, CalendarEventKind } from '../types';
import { getEvent, saveEvent, EVENT_KIND_LABEL, EVENT_KIND_COLOR } from '../services/calendar';
import { addNotification } from '../services/notifications';
import { useAppContext } from '../context/AppContext';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CalendarEventForm'>;
type R = RouteProp<RootStackParamList, 'CalendarEventForm'>;

const KINDS: CalendarEventKind[] = ['meeting', 'task', 'visit', 'reminder', 'holiday', 'other'];

export default function CalendarEventFormScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const { employees } = useAppContext();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<CalendarEventKind>('meeting');
  const [date, setDate] = useState(route.params?.date || localDateISO());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [attendees, setAttendees] = useState<string[]>([]);
  const [remind, setRemind] = useState('15');

  const load = useCallback(async () => {
    if (!route.params?.eventId) return;
    const ev = await getEvent(route.params.eventId);
    if (!ev) return;
    setTitle(ev.title);
    setKind(ev.kind);
    setDate(ev.startAt.slice(0, 10));
    setStartTime(ev.startAt.slice(11, 16));
    setEndTime(ev.endAt.slice(11, 16));
    setAllDay(ev.allDay);
    setLocation(ev.location || '');
    setNotes(ev.notes || '');
    setAttendees(ev.attendees);
    if (ev.reminderMinutesBefore != null) setRemind(String(ev.reminderMinutesBefore));
  }, [route.params?.eventId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleAttendee = (id: string) => {
    setAttendees(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id]);
  };

  const onSave = async () => {
    if (!title.trim()) return Alert.alert('Eksik', 'Başlık girin');
    const startAt = allDay ? `${date}T00:00:00` : `${date}T${startTime}:00`;
    const endAt = allDay ? `${date}T23:59:59` : `${date}T${endTime}:00`;
    const saved = await saveEvent({
      id: route.params?.eventId,
      title: title.trim(),
      kind,
      startAt,
      endAt,
      allDay,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      attendees,
      reminderMinutesBefore: remind ? Number(remind) : undefined,
      color: EVENT_KIND_COLOR[kind],
    });
    // Katılımcılara davet bildirimi
    if (!route.params?.eventId) {
      for (const a of attendees) {
        await addNotification({
          type: 'event_invite',
          title: 'Etkinlik daveti',
          message: `${saved.title} — ${date} ${allDay ? '(tüm gün)' : startTime}`,
          channels: ['push', 'email'],
          relatedId: saved.id,
          recipient: a,
        });
      }
    }
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.label}>Başlık</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Etkinlik başlığı" placeholderTextColor={colors.text.faint} />

        <Text style={s.label}>Tür</Text>
        <View style={s.chips}>
          {KINDS.map(k => (
            <TouchableOpacity key={k} style={[s.chip, kind === k && { backgroundColor: EVENT_KIND_COLOR[k], borderColor: EVENT_KIND_COLOR[k] }]} onPress={() => setKind(k)}>
              <Text style={[s.chipText, kind === k && { color: '#fff' }]}>{EVENT_KIND_LABEL[k]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Tarih (YYYY-MM-DD)</Text>
        <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="2025-01-01" placeholderTextColor={colors.text.faint} />

        <View style={s.toggleRow}>
          <Text style={s.label}>Tüm gün</Text>
          <Switch value={allDay} onValueChange={setAllDay} />
        </View>

        {!allDay && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Başlangıç (HH:MM)</Text>
              <TextInput style={s.input} value={startTime} onChangeText={setStartTime} placeholder="09:00" placeholderTextColor={colors.text.faint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Bitiş (HH:MM)</Text>
              <TextInput style={s.input} value={endTime} onChangeText={setEndTime} placeholder="10:00" placeholderTextColor={colors.text.faint} />
            </View>
          </View>
        )}

        <Text style={s.label}>Konum</Text>
        <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="Adres / oda" placeholderTextColor={colors.text.faint} />

        <Text style={s.label}>Notlar</Text>
        <TextInput style={[s.input, { minHeight: 70 }]} value={notes} onChangeText={setNotes} multiline placeholder="Detay" placeholderTextColor={colors.text.faint} />

        <Text style={s.label}>Katılımcılar</Text>
        <View style={s.chips}>
          {employees.map(e => (
            <TouchableOpacity key={e.id} style={[s.chip, attendees.includes(e.id) && { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' }]} onPress={() => toggleAttendee(e.id)}>
              <Text style={[s.chipText, attendees.includes(e.id) && { color: '#fff' }]}>{e.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Hatırlatma (dakika önce)</Text>
        <View style={s.chips}>
          {['0', '5', '15', '30', '60', '1440'].map(v => (
            <TouchableOpacity key={v} style={[s.chip, remind === v && { backgroundColor: '#22c55e', borderColor: '#22c55e' }]} onPress={() => setRemind(v)}>
              <Text style={[s.chipText, remind === v && { color: '#fff' }]}>{v === '0' ? 'Yok' : v === '1440' ? '1 gün' : `${v} dk`}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={onSave}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={s.saveText}>Kaydet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  label: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600', marginTop: spacing.sm },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary, fontSize: typography.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipText: { color: colors.text.primary, fontSize: typography.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  saveText: { color: '#fff', fontWeight: '700', fontSize: typography.md },
});
