// CrashReportsScreen — POZ-DEV-331 Crash listesi
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, CrashReport } from '../types';
import { listCrashes, clearCrashes, CRASH_SEVERITY_COLOR, CRASH_SEVERITY_LABEL, recordCrash } from '../services/crashReporter';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CrashReports'>;

export default function CrashReportsScreen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<CrashReport[]>([]);

  const refresh = useCallback(async () => {
    setItems(await listCrashes());
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onTestCrash = async () => {
    await recordCrash({ severity: 'warning', message: 'Test uyarısı: manuel kayıt', handled: true, screen: 'CrashReports' });
    refresh();
  };

  const onClear = () => {
    Alert.alert('Temizle', 'Tüm crash kayıtları silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await clearCrashes(); refresh(); } },
    ]);
  };

  const counts = {
    fatal: items.filter(i => i.severity === 'fatal').length,
    error: items.filter(i => i.severity === 'error').length,
    warning: items.filter(i => i.severity === 'warning').length,
    info: items.filter(i => i.severity === 'info').length,
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.statRow}>
          {(['fatal', 'error', 'warning', 'info'] as const).map(k => (
            <View key={k} style={[s.statPill, { backgroundColor: CRASH_SEVERITY_COLOR[k] + '22', borderColor: CRASH_SEVERITY_COLOR[k] }]}>
              <Text style={[s.statN, { color: CRASH_SEVERITY_COLOR[k] }]}>{counts[k]}</Text>
              <Text style={s.statL}>{CRASH_SEVERITY_LABEL[k]}</Text>
            </View>
          ))}
        </View>
        <View style={s.btnRow}>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#f59e0b' }]} onPress={onTestCrash}>
            <Ionicons name="flask-outline" size={16} color="#fff" />
            <Text style={s.btnT}>Test Kaydı</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444' }]} onPress={onClear}>
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={s.btnT}>Tümünü Sil</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 && <Text style={s.empty}>Kayıtlı crash yok</Text>}
        {items.map(c => (
          <TouchableOpacity key={c.id} style={[s.card, { borderLeftColor: CRASH_SEVERITY_COLOR[c.severity] }]} onPress={() => nav.navigate('CrashReportDetail', { reportId: c.id })}>
            <View style={s.row}>
              <View style={[s.sevPill, { backgroundColor: CRASH_SEVERITY_COLOR[c.severity] + '22', borderColor: CRASH_SEVERITY_COLOR[c.severity] }]}>
                <Text style={[s.sevT, { color: CRASH_SEVERITY_COLOR[c.severity] }]}>{CRASH_SEVERITY_LABEL[c.severity]}</Text>
              </View>
              <Text style={s.time}>{new Date(c.occurredAt).toLocaleString('tr-TR')}</Text>
            </View>
            <Text style={s.msg} numberOfLines={2}>{c.message}</Text>
            <Text style={s.meta}>
              {c.screen ? `Ekran: ${c.screen} · ` : ''}{c.platform || ''}{c.handled ? ' · yakalandı' : ' · yakalanmadı'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  statRow: { flexDirection: 'row', gap: 6 },
  statPill: { flex: 1, alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  statN: { fontSize: typography.lg, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 6 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.sm, borderRadius: radius.md },
  btnT: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  empty: { color: colors.text.muted, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.md },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sevPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  sevT: { fontSize: typography.xs, fontWeight: '700' },
  time: { color: colors.text.muted, fontSize: typography.xs },
  msg: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  meta: { color: colors.text.faint, fontSize: typography.xs },
});
