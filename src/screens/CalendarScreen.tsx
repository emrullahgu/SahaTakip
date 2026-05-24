// CalendarScreen — POZ-DEV-310 Aylık takvim + gün etkinlikleri
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, CalendarEvent } from '../types';
import { listEvents, eventsForMonth, eventsForDay, EVENT_KIND_COLOR, EVENT_KIND_LABEL, EVENT_KIND_ICON } from '../services/calendar';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Calendar'>;

function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function isoDay(y: number, m: number, d: number) { return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function firstWeekday(y: number, m: number) {
  const d = new Date(y, m - 1, 1).getDay();
  return d === 0 ? 7 : d; // 1..7 (Pzt..Paz)
}

const WEEK = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function CalendarScreen() {
  const nav = useNavigation<Nav>();
  const today = new Date();
  const [month, setMonth] = useState(monthKey(today));
  const [selectedDay, setSelectedDay] = useState(isoDay(today.getFullYear(), today.getMonth() + 1, today.getDate()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const refresh = useCallback(async () => { setEvents(await listEvents()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const [y, m] = month.split('-').map(Number);
  const days = daysInMonth(y, m);
  const startW = firstWeekday(y, m);

  const monthEvents = useMemo(() => eventsForMonth(events, month), [events, month]);
  const dayEvents = useMemo(() => eventsForDay(events, selectedDay), [events, selectedDay]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    monthEvents.forEach(e => {
      const k = e.startAt.slice(0, 10);
      const arr = map.get(k) || [];
      arr.push(e);
      map.set(k, arr);
    });
    return map;
  }, [monthEvents]);

  const prevMonth = () => { const d = new Date(y, m - 2, 1); setMonth(monthKey(d)); };
  const nextMonth = () => { const d = new Date(y, m, 1); setMonth(monthKey(d)); };

  const cells: (number | null)[] = [];
  for (let i = 1; i < startW; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.monthBar}>
          <TouchableOpacity onPress={prevMonth} style={s.iconBtn}><Ionicons name="chevron-back" size={20} color={colors.text.primary} /></TouchableOpacity>
          <Text style={s.monthText}>{month}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.iconBtn}><Ionicons name="chevron-forward" size={20} color={colors.text.primary} /></TouchableOpacity>
        </View>

        <View style={s.weekRow}>
          {WEEK.map(w => <Text key={w} style={s.weekText}>{w}</Text>)}
        </View>

        <View style={s.grid}>
          {cells.map((d, i) => {
            if (d === null) return <View key={i} style={s.cell} />;
            const dayIso = isoDay(y, m, d);
            const evs = eventsByDay.get(dayIso) || [];
            const isSelected = dayIso === selectedDay;
            const isToday = dayIso === isoDay(today.getFullYear(), today.getMonth() + 1, today.getDate());
            return (
              <TouchableOpacity
                key={i}
                style={[s.cell, isSelected && s.cellSelected, isToday && s.cellToday]}
                onPress={() => setSelectedDay(dayIso)}
              >
                <Text style={[s.cellNum, isSelected && { color: '#fff' }]}>{d}</Text>
                <View style={s.dotRow}>
                  {evs.slice(0, 3).map((e, i) => (
                    <View key={i} style={[s.dot, { backgroundColor: e.color || EVENT_KIND_COLOR[e.kind] }]} />
                  ))}
                  {evs.length > 3 && <Text style={s.dotMore}>+{evs.length - 3}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.dayHeader}>
          <Text style={s.dayTitle}>{selectedDay} ({dayEvents.length} etkinlik)</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => nav.navigate('CalendarEventForm', { date: selectedDay })}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.addBtnText}>Ekle</Text>
          </TouchableOpacity>
        </View>

        {dayEvents.length === 0 && <Text style={s.empty}>Bu güne etkinlik yok</Text>}
        {dayEvents.map(e => (
          <TouchableOpacity key={e.id} style={[s.evCard, { borderLeftColor: e.color || EVENT_KIND_COLOR[e.kind] }]} onPress={() => nav.navigate('CalendarEventDetail', { eventId: e.id })}>
            <View style={[s.evIcon, { backgroundColor: (e.color || EVENT_KIND_COLOR[e.kind]) + '22' }]}>
              <Ionicons name={EVENT_KIND_ICON[e.kind] as never} size={18} color={e.color || EVENT_KIND_COLOR[e.kind]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.evTitle}>{e.title}</Text>
              <Text style={s.evMeta}>{EVENT_KIND_LABEL[e.kind]} · {e.allDay ? 'Tüm gün' : new Date(e.startAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
              {e.location && <Text style={s.evMeta}>📍 {e.location}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  monthText: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  iconBtn: { padding: 4 },
  weekRow: { flexDirection: 'row' },
  weekText: { flex: 1, textAlign: 'center', color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 4, borderWidth: 0.5, borderColor: colors.border.primary, alignItems: 'center', justifyContent: 'space-between' },
  cellSelected: { backgroundColor: '#0ea5e9' },
  cellToday: { borderColor: '#22c55e', borderWidth: 2 },
  cellNum: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dotMore: { color: colors.text.muted, fontSize: 8 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  dayTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.xs },
  empty: { color: colors.text.muted, fontStyle: 'italic', textAlign: 'center', padding: spacing.md },
  evCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  evIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  evTitle: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  evMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});
