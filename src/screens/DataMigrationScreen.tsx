// DataMigrationScreen — POZ-DEV-112 Yerel veriyi Supabase'e taşı
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { isOnlineMode, customersRepo, quotesRepo, workOrdersRepo, employeesRepo } from '../services/data';

interface Step {
  key: 'customers' | 'quotes' | 'workOrders' | 'employees';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const STEPS: Step[] = [
  { key: 'customers',  label: 'Müşteriler',    icon: 'people-outline',     color: '#0ea5e9' },
  { key: 'quotes',     label: 'Teklifler',     icon: 'document-text-outline', color: '#22c55e' },
  { key: 'workOrders', label: 'İş Emirleri',   icon: 'briefcase-outline',  color: '#f59e0b' },
  { key: 'employees',  label: 'Personel',      icon: 'person-outline',     color: '#8b5cf6' },
];

type Status = 'idle' | 'running' | 'ok' | 'fail';

export default function DataMigrationScreen() {
  const app = useAppContext() as any;
  const { profile, isDemoMode } = useAuth();
  const online = isOnlineMode();
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const isAdmin = isDemoMode || profile?.role === 'admin';

  const setS = (k: string, s: Status) => setStatus(prev => ({ ...prev, [k]: s }));

  const runMigration = async () => {
    if (!online) { Alert.alert('Çevrimdışı', 'Önce Supabase yapılandırması gerekli.'); return; }
    if (!isAdmin) { Alert.alert('Yetki yok', 'Sadece admin kullanıcı veri taşıma yapabilir.'); return; }
    Alert.alert(
      'Veri Taşıma',
      'Yerel veriler Supabase\'e yazılacak. Devam edilsin mi?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Devam', style: 'destructive', onPress: async () => doRun() },
      ]
    );
  };

  const doRun = async () => {
    setBusy(true);
    try {
      // Customers
      setS('customers', 'running');
      const customers = app.customers ?? [];
      for (const c of customers) { try { await customersRepo.insert(c); } catch { /* skip dups */ } }
      setCounts(p => ({ ...p, customers: customers.length }));
      setS('customers', 'ok');

      // Quotes
      setS('quotes', 'running');
      const quotes = app.quotes ?? [];
      for (const q of quotes) { try { await quotesRepo.insert(q); } catch { /* skip */ } }
      setCounts(p => ({ ...p, quotes: quotes.length }));
      setS('quotes', 'ok');

      // Work Orders
      setS('workOrders', 'running');
      const wos = app.workOrders ?? [];
      for (const w of wos) { try { await workOrdersRepo.insert(w); } catch { /* skip */ } }
      setCounts(p => ({ ...p, workOrders: wos.length }));
      setS('workOrders', 'ok');

      // Employees
      setS('employees', 'running');
      const emps = app.employees ?? [];
      for (const e of emps) { try { await employeesRepo.insert(e); } catch { /* skip */ } }
      setCounts(p => ({ ...p, employees: emps.length }));
      setS('employees', 'ok');

      Alert.alert('Tamamlandı', 'Veri taşıma başarıyla tamamlandı.');
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Bilinmeyen hata');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.warnCard}>
          <Ionicons name="information-circle-outline" size={20} color="#f59e0b" />
          <Text style={styles.warnText}>
            Bu işlem yerel cihazdaki demo/cache verilerini Supabase\'e yazar. Yinelenen kayıtlar atlanır.
            Sadece <Text style={{ fontWeight: '800' }}>admin</Text> rolü çalıştırabilir.
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Pill label={online ? 'Çevrimiçi' : 'Çevrimdışı'} color={online ? '#22c55e' : '#f59e0b'} />
          <Pill label={isAdmin ? 'admin' : (profile?.role ?? 'guest')} color="#8b5cf6" />
        </View>

        {STEPS.map(step => {
          const s = status[step.key] ?? 'idle';
          const c = counts[step.key];
          return (
            <View key={step.key} style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: step.color }]}>
                <Ionicons name={step.icon} size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{step.label}</Text>
                <Text style={styles.rowSub}>
                  {s === 'idle' && 'Hazır'}
                  {s === 'running' && 'Yazılıyor...'}
                  {s === 'ok' && `Tamamlandı (${c ?? 0} kayıt)`}
                  {s === 'fail' && 'Hata oluştu'}
                </Text>
              </View>
              {s === 'running' && <ActivityIndicator color={step.color} />}
              {s === 'ok' && <Ionicons name="checkmark-circle" size={22} color="#22c55e" />}
              {s === 'fail' && <Ionicons name="close-circle" size={22} color="#ef4444" />}
            </View>
          );
        })}

        <TouchableOpacity
          onPress={runMigration}
          disabled={busy || !online || !isAdmin}
          style={[styles.runBtn, (busy || !online || !isAdmin) && styles.btnDisabled]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-upload" size={18} color="#fff" />}
          <Text style={styles.runBtnText}>{busy ? 'Aktarılıyor...' : 'Şimdi Taşı'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color, backgroundColor: color + '22' }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  warnCard: { flexDirection: 'row', gap: 8, padding: spacing.md, backgroundColor: '#f59e0b22', borderWidth: 1, borderColor: '#f59e0b', borderRadius: radius.md, marginBottom: spacing.md },
  warnText: { flex: 1, color: colors.text.primary, fontSize: typography.xs, lineHeight: 18 },
  statusRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.md, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, padding: spacing.md, marginBottom: 8, borderRadius: radius.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  rowSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  runBtn: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: radius.md, backgroundColor: '#8b5cf6' },
  runBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  btnDisabled: { opacity: 0.5 },
});
