// ReportsScreen — POZ-DEV-064, 065, 071
// Geçmiş raporları listeler + yeni rapor (günlük/haftalık/aylık) üretir
// + günlük 18:00 hatırlatıcı + haftalık e-posta tercihi.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  listReports,
  deleteReport,
  generateReport,
} from '../services/reports';
import {
  scheduleDailyReportReminder,
  cancelDailyReportReminder,
  getDailyReportReminderId,
  setWeeklyEmail,
  getWeeklyEmail,
} from '../services/reportSchedule';
import { generateAndShareActivityPdf } from '../services/activityPdf';
import { useAppContext } from '../context/AppContext';
import {
  Report,
  ReportPeriod,
  RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Reports'>;

const PERIODS: { kind: ReportPeriod; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { kind: 'daily', label: 'Günlük', icon: 'today-outline', color: '#0ea5e9' },
  { kind: 'weekly', label: 'Haftalık', icon: 'calendar-outline', color: '#8b5cf6' },
  { kind: 'monthly', label: 'Aylık', icon: 'calendar-clear-outline', color: '#10b981' },
];

export default function ReportsScreen() {
  const navigation = useNavigation<Nav>();
  const { workOrders, quotes, customers } = useAppContext();
  const [items, setItems] = useState<Report[]>([]);
  const [reminderOn, setReminderOn] = useState(false);
  const [email, setEmailState] = useState('');

  const load = useCallback(async () => {
    setItems(await listReports());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    (async () => {
      setReminderOn(!!(await getDailyReportReminderId()));
      setEmailState((await getWeeklyEmail()) ?? '');
    })();
  }, []);

  const onGenerate = async (period: ReportPeriod) => {
    const r = await generateReport(period, new Date(), workOrders, quotes, customers);
    await load();
    navigation.navigate('ReportDetail', { reportId: r.id });
  };

  const onDelete = (r: Report) => {
    Alert.alert('Sil', 'Bu rapor silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteReport(r.id);
          load();
        },
      },
    ]);
  };

  const toggleReminder = async (val: boolean) => {
    if (val) {
      const id = await scheduleDailyReportReminder(18, 0);
      if (id) setReminderOn(true);
      else Alert.alert('İzin', 'Bildirim izni reddedildi.');
    } else {
      await cancelDailyReportReminder();
      setReminderOn(false);
    }
  };

  const saveEmail = async () => {
    await setWeeklyEmail(email.trim() || null);
    Alert.alert('Tamam', 'Haftalık e-posta tercihi kaydedildi.');
  };

  const periodMeta = (p: ReportPeriod) =>
    PERIODS.find(x => x.kind === p) ?? PERIODS[0];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Yeni Rapor Oluştur</Text>
        <View style={styles.actionRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.kind}
              style={[styles.actionBtn, { borderColor: p.color }]}
              onPress={() => onGenerate(p.kind)}
              activeOpacity={0.85}
            >
              <Ionicons name={p.icon} size={18} color={p.color} />
              <Text style={[styles.actionText, { color: p.color }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.linkRow}>
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Ionicons name="speedometer-outline" size={16} color={brand.blueLight} />
            <Text style={styles.linkText}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => generateAndShareActivityPdf(new Date().toISOString().slice(0,10), workOrders, quotes)}
          >
            <Ionicons name="document-text-outline" size={16} color={brand.green} />
            <Text style={styles.linkText}>Aktivite PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.navigate('ExecutiveSummary')}
          >
            <Ionicons name="sparkles-outline" size={16} color="#a855f7" />
            <Text style={styles.linkText}>Yönetim Özeti</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Otomatik</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Günlük Hatırlatma (18:00)</Text>
            <Text style={styles.rowSub}>Her gün rapor üretimini hatırlatır.</Text>
          </View>
          <Switch
            value={reminderOn}
            onValueChange={toggleReminder}
            trackColor={{ false: colors.border.primary, true: brand.green }}
          />
        </View>

        <Text style={styles.label}>Haftalık E-posta</Text>
        <View style={styles.emailRow}>
          <TextInput
            value={email}
            onChangeText={setEmailState}
            style={styles.input}
            placeholder="ornek@firma.com"
            placeholderTextColor={colors.text.faint}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveEmail}>
            <Ionicons name="save-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Geçmiş Raporlar ({items.length})</Text>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>Henüz rapor yok.</Text>
          </View>
        ) : (
          items.map(r => {
            const m = periodMeta(r.period);
            return (
              <TouchableOpacity
                key={r.id}
                style={styles.card}
                onPress={() => navigation.navigate('ReportDetail', { reportId: r.id })}
                onLongPress={() => onDelete(r)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.icon,
                    { borderColor: m.color, backgroundColor: m.color + '22' },
                  ]}
                >
                  <Ionicons name={m.icon} size={16} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {m.label} · {r.startDate}
                    {r.startDate !== r.endDate ? ` → ${r.endDate}` : ''}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {r.kpi.workOrdersTotal} iş · ciro{' '}
                    {r.kpi.revenue.toLocaleString('tr-TR')} ₺
                    {r.kpi.slaBreaches > 0 ? ` · ${r.kpi.slaBreaches} SLA ihlali` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 100 },
  section: {
    color: colors.text.primary,
    fontWeight: '800',
    fontSize: typography.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.bg.secondary,
  },
  actionText: { fontWeight: '800', fontSize: typography.xs },
  linkRow: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  linkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  linkText: { color: colors.text.primary, fontWeight: '700', fontSize: typography.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  rowSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  label: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: 4,
  },
  emailRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.sm,
  },
  saveBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: brand.green,
  },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 6,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  cardMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});
