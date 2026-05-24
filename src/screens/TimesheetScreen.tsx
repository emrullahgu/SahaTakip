// TimesheetScreen — POZ-DEV-252 Personel devam-puantaj
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, TimesheetStatus } from '../types';
import { useAppContext } from '../context/AppContext';
import { listTimesheet, saveTimesheetEntry, TIMESHEET_STATUS_LABEL, TIMESHEET_STATUS_COLOR, timesheetForMonth } from '../services/payroll';

type R = RouteProp<RootStackParamList, 'Timesheet'>;
const STATUSES: TimesheetStatus[] = ['present', 'absent', 'leave', 'sick', 'holiday'];

function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }

export default function TimesheetScreen() {
  const route = useRoute<R>();
  const { employees } = useAppContext();
  const [empId, setEmp] = useState<string | undefined>(route.params?.employeeId);
  const [month, setMonth] = useState<string>(route.params?.month || monthKey(new Date()));
  const [all, setAll] = useState<Awaited<ReturnType<typeof listTimesheet>>>([]);
  const [hoursInput, setHoursInput] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => { setAll(await listTimesheet()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const [y, m] = month.split('-').map(Number);
  const days = daysInMonth(y, m - 1);

  const monthEntries = useMemo(() => {
    if (!empId) return [];
    return timesheetForMonth(all, empId, `${month}-01`);
  }, [all, empId, month]);

  const entryFor = (day: number) => monthEntries.find(e => Number(e.date.slice(8, 10)) === day);

  const setStatus = async (day: number, status: TimesheetStatus) => {
    if (!empId) return;
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const cur = entryFor(day);
    await saveTimesheetEntry({
      id: cur?.id,
      employeeId: empId,
      date,
      status,
      hoursWorked: cur?.hoursWorked || (status === 'present' ? 8 : 0),
      overtime: cur?.overtime || 0,
    });
    refresh();
  };

  const setHours = async (day: number, hours: number, ot: boolean) => {
    if (!empId) return;
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const cur = entryFor(day);
    await saveTimesheetEntry({
      id: cur?.id,
      employeeId: empId,
      date,
      status: cur?.status || 'present',
      hoursWorked: ot ? (cur?.hoursWorked || 8) : hours,
      overtime: ot ? hours : (cur?.overtime || 0),
    });
    refresh();
  };

  const prevMonth = () => { const d = new Date(y, m - 2, 1); setMonth(monthKey(d)); };
  const nextMonth = () => { const d = new Date(y, m, 1); setMonth(monthKey(d)); };

  const totals = useMemo(() => {
    let present = 0, hours = 0, ot = 0;
    monthEntries.forEach(e => { if (e.status === 'present') present++; hours += e.hoursWorked || 0; ot += e.overtime || 0; });
    return { present, hours, ot };
  }, [monthEntries]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.monthBar}>
          <TouchableOpacity onPress={prevMonth}><Ionicons name="chevron-back" size={20} color={colors.text.primary} /></TouchableOpacity>
          <Text style={s.monthText}>{month}</Text>
          <TouchableOpacity onPress={nextMonth}><Ionicons name="chevron-forward" size={20} color={colors.text.primary} /></TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Personel</Text>
        <View style={s.chips}>
          {employees.map(e => (
            <TouchableOpacity key={e.id} style={[s.chip, empId === e.id && s.chipActive]} onPress={() => setEmp(e.id)}>
              <Text style={[s.chipText, empId === e.id && { color: '#fff' }]}>{e.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {empId && (
          <>
            <View style={s.kpiRow}>
              <View style={s.kpi}><Text style={s.kpiV}>{totals.present}</Text><Text style={s.kpiL}>Gün</Text></View>
              <View style={s.kpi}><Text style={s.kpiV}>{totals.hours}</Text><Text style={s.kpiL}>Saat</Text></View>
              <View style={s.kpi}><Text style={s.kpiV}>{totals.ot}</Text><Text style={s.kpiL}>Mesai</Text></View>
            </View>

            <Text style={s.sectionTitle}>Günler</Text>
            {Array.from({ length: days }, (_, i) => i + 1).map(day => {
              const e = entryFor(day);
              const date = `${month}-${String(day).padStart(2, '0')}`;
              const key = `h-${day}`;
              const otKey = `ot-${day}`;
              return (
                <View key={day} style={s.dayRow}>
                  <Text style={s.dayNum}>{day}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={s.statusRow}>
                      {STATUSES.map(st => (
                        <TouchableOpacity key={st} style={[s.statusChip, e?.status === st && { backgroundColor: TIMESHEET_STATUS_COLOR[st], borderColor: TIMESHEET_STATUS_COLOR[st] }]} onPress={() => setStatus(day, st)}>
                          <Text style={[s.statusChipText, e?.status === st && { color: '#fff' }]}>{TIMESHEET_STATUS_LABEL[st]}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {e?.status === 'present' && (
                      <View style={s.hoursRow}>
                        <Text style={s.hoursLabel}>Saat:</Text>
                        <TextInput
                          style={s.hoursInput}
                          value={hoursInput[key] ?? String(e.hoursWorked)}
                          onChangeText={v => setHoursInput(h => ({ ...h, [key]: v }))}
                          onEndEditing={() => setHours(day, Number(hoursInput[key] ?? e.hoursWorked) || 0, false)}
                          keyboardType="numeric"
                        />
                        <Text style={s.hoursLabel}>Mesai:</Text>
                        <TextInput
                          style={s.hoursInput}
                          value={hoursInput[otKey] ?? String(e.overtime)}
                          onChangeText={v => setHoursInput(h => ({ ...h, [otKey]: v }))}
                          onEndEditing={() => setHours(day, Number(hoursInput[otKey] ?? e.overtime) || 0, true)}
                          keyboardType="numeric"
                        />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, paddingBottom: 80, gap: spacing.sm },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  monthText: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  sectionTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  chipText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  kpiRow: { flexDirection: 'row', gap: 6 },
  kpi: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, alignItems: 'center' },
  kpiV: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  kpiL: { color: colors.text.muted, fontSize: typography.xs },
  dayRow: { flexDirection: 'row', gap: 8, padding: 8, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, alignItems: 'flex-start' },
  dayNum: { width: 24, color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, textAlign: 'center', paddingTop: 4 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.primary },
  statusChipText: { color: colors.text.primary, fontSize: 10, fontWeight: '600' },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  hoursLabel: { color: colors.text.muted, fontSize: 10 },
  hoursInput: { width: 50, paddingHorizontal: 6, paddingVertical: 4, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, color: colors.text.primary, fontSize: typography.xs, textAlign: 'center' },
});
