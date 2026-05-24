// CrashReportDetailScreen — POZ-DEV-332 Crash detayı
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, CrashReport } from '../types';
import { getCrash, CRASH_SEVERITY_COLOR, CRASH_SEVERITY_LABEL } from '../services/crashReporter';

type R = RouteProp<RootStackParamList, 'CrashReportDetail'>;

export default function CrashReportDetailScreen() {
  const route = useRoute<R>();
  const { reportId } = route.params;
  const [c, setC] = useState<CrashReport | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => { setC((await getCrash(reportId)) || null); })();
  }, [reportId]));

  if (!c) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <Text style={s.empty}>Kayıt bulunamadı</Text>
      </SafeAreaView>
    );
  }

  const color = CRASH_SEVERITY_COLOR[c.severity];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.hero, { backgroundColor: color }]}>
          <View style={s.heroIcon}><Ionicons name="bug" size={26} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>{CRASH_SEVERITY_LABEL[c.severity]}</Text>
            <Text style={s.heroS}>{new Date(c.occurredAt).toLocaleString('tr-TR')}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Mesaj</Text>
          <Text style={s.value}>{c.message}</Text>
        </View>

        <View style={s.card}>
          <Row label="Platform" value={c.platform || '-'} />
          <Row label="Ekran" value={c.screen || '-'} />
          <Row label="Kullanıcı" value={c.userId || '-'} />
          <Row label="Versiyon" value={c.appVersion || '-'} />
          <Row label="Yakalandı" value={c.handled ? 'Evet' : 'Hayır'} />
        </View>

        {c.stack && (
          <View style={s.card}>
            <Text style={s.label}>Stack Trace</Text>
            <ScrollView horizontal>
              <Text style={s.stack}>{c.stack}</Text>
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  heroIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
  heroS: { color: '#fff', opacity: 0.9, fontSize: typography.sm, marginTop: 2 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  label: { color: colors.text.muted, fontSize: typography.xs },
  value: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: colors.text.muted, fontSize: typography.sm },
  rowValue: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  stack: { color: colors.text.faint, fontSize: typography.xs, fontFamily: 'Courier' },
  empty: { color: colors.text.muted, fontStyle: 'italic', padding: spacing.md, textAlign: 'center' },
});
