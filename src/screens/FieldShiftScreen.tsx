// Faz 42 — FieldShiftScreen: mesai başlat/bitir/mola
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { FieldShift } from '../types';
import { getShift, startShift, endShift, toggleBreak, SHIFT_COLOR, SHIFT_LABEL } from '../services/fieldOps';

export default function FieldShiftScreen() {
  const [shift, setShift] = useState<FieldShift | null>(null);
  const load = useCallback(async () => { setShift(await getShift()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!shift) return <SafeAreaView style={s.safe}><Text style={s.empty}>Yükleniyor...</Text></SafeAreaView>;

  const canStart = shift.status === 'idle' || shift.status === 'finished';
  const canBreak = shift.status === 'on_shift' || shift.status === 'on_break';
  const canEnd = shift.status === 'on_shift' || shift.status === 'on_break';

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View style={[s.statusBox, { borderColor: SHIFT_COLOR[shift.status] }]}>
          <Ionicons name="person-circle" size={48} color={SHIFT_COLOR[shift.status]} />
          <Text style={s.userName}>{shift.userName}</Text>
          <View style={[s.statusChip, { backgroundColor: SHIFT_COLOR[shift.status] }]}>
            <Text style={s.statusChipT}>{SHIFT_LABEL[shift.status]}</Text>
          </View>
          {shift.startedAt && <Text style={s.tm}>Başlangıç: {new Date(shift.startedAt).toLocaleTimeString('tr-TR')}</Text>}
          {shift.endedAt && <Text style={s.tm}>Bitiş: {new Date(shift.endedAt).toLocaleTimeString('tr-TR')}</Text>}
          {shift.totalMinutes > 0 && <Text style={s.tm}>Toplam: {Math.floor(shift.totalMinutes / 60)}s {shift.totalMinutes % 60}d</Text>}
        </View>
        <View style={s.actions}>
          <TouchableOpacity style={[s.btn, { backgroundColor: canStart ? '#22c55e' : '#475569' }]} disabled={!canStart} onPress={async () => { setShift(await startShift()); }}>
            <Ionicons name="play" size={26} color="#fff" />
            <Text style={s.btnT}>Mesai Başlat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: canBreak ? '#f59e0b' : '#475569' }]} disabled={!canBreak} onPress={async () => { setShift(await toggleBreak()); }}>
            <Ionicons name={shift.status === 'on_break' ? 'play-circle' : 'pause'} size={26} color="#fff" />
            <Text style={s.btnT}>{shift.status === 'on_break' ? 'Devam' : 'Mola'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: canEnd ? '#ef4444' : '#475569' }]} disabled={!canEnd} onPress={async () => {
            try { setShift(await endShift()); }
            catch (e: any) {
              setShift(await getShift());
              Alert.alert('Mesai bitirilemedi', e?.message ?? 'Sunucu ile senkron sağlanamadı. Lokal olarak kapandı; tekrar deneyin.');
            }
          }}>
            <Ionicons name="stop" size={26} color="#fff" />
            <Text style={s.btnT}>Mesai Bitir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  statusBox: { alignItems: 'center', padding: spacing.lg, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 2, gap: spacing.sm },
  userName: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  statusChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  statusChipT: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  tm: { color: colors.text.muted, fontSize: typography.xs },
  actions: { gap: spacing.sm },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md },
  btnT: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
});
