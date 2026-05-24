// CalendarEventDetailScreen — POZ-DEV-312 Etkinlik detayı
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, CalendarEvent } from '../types';
import { getEvent, deleteEvent, EVENT_KIND_COLOR, EVENT_KIND_LABEL, EVENT_KIND_ICON } from '../services/calendar';
import { useAppContext } from '../context/AppContext';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CalendarEventDetail'>;
type R = RouteProp<RootStackParamList, 'CalendarEventDetail'>;

export default function CalendarEventDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const { eventId } = route.params;
  const { employees } = useAppContext();
  const [event, setEvent] = useState<CalendarEvent | null>(null);

  const refresh = useCallback(async () => {
    const e = await getEvent(eventId);
    setEvent(e || null);
  }, [eventId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (!event) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <Text style={s.empty}>Etkinlik bulunamadı</Text>
      </SafeAreaView>
    );
  }

  const onDelete = () => {
    Alert.alert('Sil', 'Etkinlik silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteEvent(eventId); nav.goBack(); } },
    ]);
  };

  const color = event.color || EVENT_KIND_COLOR[event.kind];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.hero, { backgroundColor: color }]}>
          <View style={s.heroIcon}><Ionicons name={EVENT_KIND_ICON[event.kind] as never} size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>{event.title}</Text>
            <Text style={s.heroS}>{EVENT_KIND_LABEL[event.kind]}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Row icon="calendar-outline" label="Başlangıç" value={new Date(event.startAt).toLocaleString('tr-TR')} />
          <Row icon="calendar-clear-outline" label="Bitiş" value={new Date(event.endAt).toLocaleString('tr-TR')} />
          <Row icon="time-outline" label="Tüm gün" value={event.allDay ? 'Evet' : 'Hayır'} />
          {event.location && <Row icon="location-outline" label="Konum" value={event.location} />}
          {event.reminderMinutesBefore != null && <Row icon="alarm-outline" label="Hatırlatma" value={`${event.reminderMinutesBefore} dk önce`} />}
        </View>

        {event.notes && (
          <View style={s.notesCard}>
            <Text style={s.notesTitle}>Notlar</Text>
            <Text style={s.notes}>{event.notes}</Text>
          </View>
        )}

        <Text style={s.sectionTitle}>Katılımcılar ({event.attendees.length})</Text>
        {event.attendees.length === 0 && <Text style={s.empty}>Katılımcı yok</Text>}
        {event.attendees.map(id => {
          const e = employees.find(x => x.id === id);
          return (
            <View key={id} style={s.attRow}>
              <Ionicons name="person-circle-outline" size={20} color="#0ea5e9" />
              <Text style={s.attName}>{e?.name || id}</Text>
            </View>
          );
        })}

        <View style={s.btnRow}>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#0ea5e9' }]} onPress={() => nav.navigate('CalendarEventForm', { eventId })}>
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={s.btnText}>Düzenle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444' }]} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={s.btnText}>Sil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon as never} size={16} color={colors.text.muted} />
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
  heroS: { color: '#fff', opacity: 0.9, fontSize: typography.sm, marginTop: 2 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { color: colors.text.muted, fontSize: typography.xs, width: 80 },
  rowValue: { color: colors.text.primary, fontSize: typography.sm, flex: 1 },
  notesCard: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  notesTitle: { color: colors.text.muted, fontSize: typography.xs, marginBottom: 4 },
  notes: { color: colors.text.primary, fontSize: typography.sm },
  sectionTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, marginTop: spacing.md },
  empty: { color: colors.text.muted, fontStyle: 'italic', padding: spacing.sm },
  attRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  attName: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.md, borderRadius: radius.md },
  btnText: { color: '#fff', fontWeight: '700' },
});
