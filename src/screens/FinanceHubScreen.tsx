// FinanceHubScreen — POZ-DEV-184 Finans & Tahsilat merkez
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { useAppContext } from '../context/AppContext';
import { computeCustomerBalances, listPayments } from '../services/payments';
import { useHasRole } from '../components/RoleGuard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Tile {
  key: keyof RootStackParamList;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  poz?: string;
}

const TILES: Tile[] = [
  { key: 'Payments',          label: 'Tahsilatlar',    desc: 'Tüm ödeme kayıtları',  icon: 'wallet-outline',          color: '#10b981', poz: 'POZ-DEV-078' },
  { key: 'CustomerBalances',  label: 'Müşteri Bakiye', desc: 'Borç & alacak takibi', icon: 'people-outline',          color: '#0ea5e9', poz: 'POZ-DEV-081' },
  { key: 'CashRegister',      label: 'Kasa',           desc: 'Saha kasa hareketi',   icon: 'cash-outline',            color: '#22c55e', poz: 'POZ-DEV-082' },
  { key: 'IncomeReport',      label: 'Gelir Raporu',   desc: 'Dönemsel ciro analiz', icon: 'trending-up-outline',     color: '#f59e0b', poz: 'POZ-DEV-185' },
  { key: 'AgingReport',       label: 'Tahsilat Yaş',  desc: 'Vade & gecikme grubu', icon: 'hourglass-outline',       color: '#ef4444', poz: 'POZ-DEV-186' },
];

export default function FinanceHubScreen() {
  const canSee = useHasRole(['admin', 'manager']);
  if (!canSee) return null;
  return <FinanceHubScreenInner />;
}

function FinanceHubScreenInner() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - (cols - 1) * spacing.md) / cols;

  const { customers, workOrders, quotes } = useAppContext();
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const payments = await listPayments();
        setTotalReceived(payments.filter(p => p.status === 'received').reduce((s, p) => s + p.amount, 0));
        setTotalPending(payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0));
        const balances = await computeCustomerBalances(customers, workOrders, quotes);
        setTotalBalance(balances.reduce((s, b) => s + Math.max(b.balance, 0), 0));
        setOverdueCount(balances.filter(b => b.balance > 0).length);
      } catch {}
    })();
  }, [customers, workOrders, quotes]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="cash-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Finans & Tahsilat</Text>
            <Text style={styles.heroSub}>₺{totalReceived.toLocaleString('tr-TR')} tahsil edildi</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Pill label={`Bekleyen: ₺${totalPending.toLocaleString('tr-TR')}`} color="#f59e0b" icon="time-outline" />
          <Pill label={`Alacak: ₺${totalBalance.toLocaleString('tr-TR')}`} color={totalBalance > 0 ? '#ef4444' : '#22c55e'} icon="trending-down-outline" />
          <Pill label={`Borçlu: ${overdueCount}`} color="#ec4899" icon="people-outline" />
        </View>

        {overdueCount > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => nav.navigate('AgingReport')}
            activeOpacity={0.85}
          >
            <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
            <Text style={styles.alertText}>{overdueCount} müşteri tahsilatsız. Vade analizini açın.</Text>
            <Ionicons name="chevron-forward" size={16} color="#ef4444" />
          </TouchableOpacity>
        )}

        <View style={[styles.grid, { maxWidth: 1200, alignSelf: 'center', width: '100%' }]}>
          {TILES.map(t => (
            <TouchableOpacity
              key={String(t.key)}
              style={[styles.tile, { width: tileWidth }]}
              onPress={() => nav.navigate(t.key as never)}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIcon, { backgroundColor: t.color }]}>
                <Ionicons name={t.icon} size={22} color="#fff" />
              </View>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileDesc}>{t.desc}</Text>
              {t.poz && <Text style={styles.tilePoz}>{t.poz}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ label, color, icon }: { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.pill, { borderColor: color, backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#10b981', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, backgroundColor: '#ef444422', borderWidth: 1, borderColor: '#ef4444', borderRadius: radius.md },
  alertText: { color: '#ef4444', fontSize: typography.xs, fontWeight: '700', flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tilePoz: { color: colors.text.faint, fontSize: 10, marginTop: 6, fontWeight: '700' },
});
