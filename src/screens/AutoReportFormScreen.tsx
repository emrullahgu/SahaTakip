// AutoReportFormScreen — POZ-DEV-412
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Alert, KeyboardAvoidingView, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, AutoReportSchedule } from '../types';
import { listAutoReports, saveAutoReport, CADENCE_LABEL, REPORT_KIND_LABEL } from '../services/customerExperience';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'AutoReportForm'>;

const CADENCES: AutoReportSchedule['cadence'][] = ['weekly', 'monthly', 'quarterly'];
const KINDS: AutoReportSchedule['reportKind'][] = ['summary', 'work_orders', 'finance', 'sla'];

export default function AutoReportFormScreen() {
  const navigation = useNavigation<Nav>();
  const id = useRoute<R>().params?.scheduleId;
  const [name, setName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [cadence, setCadence] = useState<AutoReportSchedule['cadence']>('monthly');
  const [reportKind, setReportKind] = useState<AutoReportSchedule['reportKind']>('summary');
  const [days, setDays] = useState('30');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = (await listAutoReports()).find(x => x.id === id);
      if (r) {
        setName(r.name); setCustomerId(r.customerId || '');
        setCadence(r.cadence); setReportKind(r.reportKind);
        setEnabled(r.enabled);
        const d = Math.max(1, Math.round((new Date(r.nextRunAt).getTime() - Date.now()) / 86400000));
        setDays(String(d));
      }
    })();
  }, [id]);

  const save = async () => {
    if (!name.trim()) { Alert.alert('Eksik', 'İsim gerekli.'); return; }
    const d = parseInt(days, 10) || 30;
    await saveAutoReport({ id, name: name.trim(), customerId: customerId.trim() || undefined, cadence, reportKind, enabled, nextRunAt: new Date(Date.now() + d * 86400000).toISOString() });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
        <Text style={s.label}>İsim *</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Aylık Yönetim Özeti" placeholderTextColor={colors.text.faint} />
        <Text style={s.label}>Müşteri ID (boş = tüm müşteriler)</Text>
        <TextInput style={s.input} value={customerId} onChangeText={setCustomerId} placeholder="opsiyonel" placeholderTextColor={colors.text.faint} />
        <Text style={s.label}>Sıklık</Text>
        <View style={s.chips}>
          {CADENCES.map(c => (
            <TouchableOpacity key={c} onPress={() => setCadence(c)} style={[s.chip, cadence === c && s.chipOn]}>
              <Text style={[s.chipT, cadence === c && s.chipTOn]}>{CADENCE_LABEL[c]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.label}>Rapor Türü</Text>
        <View style={s.chips}>
          {KINDS.map(k => (
            <TouchableOpacity key={k} onPress={() => setReportKind(k)} style={[s.chip, reportKind === k && s.chipOn]}>
              <Text style={[s.chipT, reportKind === k && s.chipTOn]}>{REPORT_KIND_LABEL[k]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.label}>İlk çalışma (gün)</Text>
        <TextInput style={s.input} value={days} onChangeText={setDays} keyboardType="number-pad" />

        <View style={s.tog}>
          <Text style={s.togT}>Aktif</Text>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: '#334155', true: '#22c55e' }} thumbColor="#fff" />
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={save}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={s.saveT}>Kaydet</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  label: { color: colors.text.muted, fontSize: typography.sm, marginTop: spacing.sm, marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.base },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipOn: { backgroundColor: '#06b6d4', borderColor: '#06b6d4' },
  chipT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  chipTOn: { color: '#fff' },
  tog: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, marginTop: spacing.md, borderWidth: 1, borderColor: colors.border.primary },
  togT: { color: colors.text.primary, fontSize: typography.sm },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: '#22c55e', padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg },
  saveT: { color: '#fff', fontSize: typography.md, fontWeight: '700' },
});
