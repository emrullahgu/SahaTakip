// AutoReportsScreen — POZ-DEV-411
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, AutoReportSchedule } from '../types';
import { listAutoReports, deleteAutoReport, toggleAutoReport, CADENCE_LABEL, REPORT_KIND_LABEL } from '../services/customerExperience';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AutoReportsScreen() {
  const navigation = useNavigation<Nav>();
  const [list, setList] = useState<AutoReportSchedule[]>([]);

  const load = useCallback(async () => { setList(await listAutoReports()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (id: string) => { await toggleAutoReport(id); load(); };
  const remove = (id: string) => Alert.alert('Sil?', 'Plan silinecek.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => { await deleteAutoReport(id); load(); } },
  ]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={list}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 120 }}
        ListEmptyComponent={<Text style={s.empty}>Plan yok. + ile ekle.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.card, !item.enabled && { opacity: 0.5 }]} onPress={() => navigation.navigate('AutoReportForm', { scheduleId: item.id })} onLongPress={() => remove(item.id)}>
            <View style={[s.icoBox, { backgroundColor: '#06b6d422' }]}>
              <Ionicons name="mail-outline" size={20} color="#06b6d4" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.t}>{item.name}</Text>
              <Text style={s.sub}>{CADENCE_LABEL[item.cadence]} · {REPORT_KIND_LABEL[item.reportKind]}</Text>
              <Text style={s.sub}>Sıradaki: {new Date(item.nextRunAt).toLocaleDateString('tr-TR')}{item.lastRunAt ? ` · Son: ${new Date(item.lastRunAt).toLocaleDateString('tr-TR')}` : ''}</Text>
            </View>
            <TouchableOpacity onPress={() => toggle(item.id)}>
              <Ionicons name={item.enabled ? 'toggle' : 'toggle-outline'} size={36} color={item.enabled ? '#22c55e' : colors.text.muted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('AutoReportForm')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.sm },
  icoBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 80 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
