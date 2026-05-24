// Faz 50 — SaasBillingScreen (POZ-DEV-208)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listSaasInvoices, listSaasSubscriptions, markInvoicePaid, SAAS_STATUS_LABEL, SAAS_STATUS_COLOR, SAAS_PLAN_LABEL, SAAS_PLAN_COLOR } from '../services/saas';
import type { SaasInvoice, SaasSubscription } from '../types';
import EmptyState from '../components/EmptyState';

const fmtTL = (n: number) => `₺${n.toLocaleString('tr-TR')}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('tr-TR');

type Tab = 'subs' | 'invoices';

export default function SaasBillingScreen() {
  const [tab, setTab] = useState<Tab>('subs');
  const [subs, setSubs] = useState<SaasSubscription[]>([]);
  const [invs, setInvs] = useState<SaasInvoice[]>([]);
  const load = useCallback(async () => {
    setSubs(await listSaasSubscriptions());
    setInvs(await listSaasInvoices());
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = useMemo(() => ({
    mrr: subs.filter(x => x.status === 'active').reduce((a, x) => a + x.mrr, 0),
    overdue: invs.filter(i => i.status === 'overdue').reduce((a, i) => a + i.amount, 0),
    paid30: invs.filter(i => i.status === 'paid' && i.paidAt && (Date.now() - new Date(i.paidAt).getTime()) < 30 * 86400000).reduce((a, i) => a + i.amount, 0),
  }), [subs, invs]);

  const onPay = (id: string, num: string) => {
    Alert.alert('Ödendi olarak işaretle', `Fatura ${num} ödenmiş kabul edilsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Onayla', onPress: async () => { await markInvoicePaid(id); await load(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.statRow}>
          <View style={[s.statBox, { borderColor: '#22c55e' }]}>
            <Text style={[s.statV, { color: '#22c55e' }]}>{fmtTL(stats.mrr)}</Text>
            <Text style={s.statL}>MRR</Text>
          </View>
          <View style={[s.statBox, { borderColor: '#0ea5e9' }]}>
            <Text style={[s.statV, { color: '#0ea5e9' }]}>{fmtTL(stats.paid30)}</Text>
            <Text style={s.statL}>Son 30g</Text>
          </View>
          <View style={[s.statBox, { borderColor: '#ef4444' }]}>
            <Text style={[s.statV, { color: '#ef4444' }]}>{fmtTL(stats.overdue)}</Text>
            <Text style={s.statL}>Gecikmiş</Text>
          </View>
        </View>

        <View style={s.tabRow}>
          <TouchableOpacity onPress={() => setTab('subs')} style={[s.tab, tab === 'subs' && s.tabActive]}>
            <Text style={[s.tabT, tab === 'subs' && s.tabTActive]}>Abonelikler ({subs.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('invoices')} style={[s.tab, tab === 'invoices' && s.tabActive]}>
            <Text style={[s.tabT, tab === 'invoices' && s.tabTActive]}>Faturalar ({invs.length})</Text>
          </TouchableOpacity>
        </View>

        {tab === 'subs' && (subs.length === 0 ? (
          <EmptyState
            icon="card-outline"
            title="Abonelik yok"
            subtitle="Aktif veya pasif bir abonelik kaydı bulunmuyor."
          />
        ) : subs.map(sub => (
          <View key={sub.id} style={[s.card, { borderLeftColor: SAAS_STATUS_COLOR[sub.status] }]}>
            <View style={s.headRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{sub.tenantName}</Text>
                <Text style={s.meta}>Sonraki ödeme: {fmtDate(sub.nextBillingAt)}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: SAAS_PLAN_COLOR[sub.plan] + '33', borderColor: SAAS_PLAN_COLOR[sub.plan] }]}>
                <Text style={[s.pillT, { color: SAAS_PLAN_COLOR[sub.plan] }]}>{SAAS_PLAN_LABEL[sub.plan]}</Text>
              </View>
            </View>
            <View style={s.metaRow}>
              <View style={[s.pill, { backgroundColor: SAAS_STATUS_COLOR[sub.status] + '33', borderColor: SAAS_STATUS_COLOR[sub.status] }]}>
                <Text style={[s.pillT, { color: SAAS_STATUS_COLOR[sub.status] }]}>{SAAS_STATUS_LABEL[sub.status]}</Text>
              </View>
              <Text style={s.metaT}>{sub.cycle === 'monthly' ? 'Aylık' : 'Yıllık'}</Text>
              <Text style={s.metaT}>
                <Ionicons name={sub.paymentMethod === 'card' ? 'card' : sub.paymentMethod === 'transfer' ? 'swap-horizontal' : 'document-text'} size={11} color={colors.text.muted} />
                {' '}{sub.paymentMethod === 'card' ? `Kart ****${sub.cardLast4}` : sub.paymentMethod === 'transfer' ? 'Havale' : 'Fatura'}
              </Text>
              <Text style={[s.mrr, { color: '#22c55e' }]}>{fmtTL(sub.mrr)}/ay</Text>
            </View>
          </View>
        )))}

        {tab === 'invoices' && (invs.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="Fatura yok"
            subtitle="Henüz oluşturulmuş bir fatura kaydı bulunmuyor."
          />
        ) : invs.map(i => (
          <View key={i.id} style={[s.card, { borderLeftColor: SAAS_STATUS_COLOR[i.status] }]}>
            <View style={s.headRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{i.number}</Text>
                <Text style={s.meta}>{i.tenantName} • {i.period}</Text>
              </View>
              <Text style={s.amount}>{fmtTL(i.amount)}</Text>
            </View>
            <View style={s.metaRow}>
              <View style={[s.pill, { backgroundColor: SAAS_STATUS_COLOR[i.status] + '33', borderColor: SAAS_STATUS_COLOR[i.status] }]}>
                <Text style={[s.pillT, { color: SAAS_STATUS_COLOR[i.status] }]}>{SAAS_STATUS_LABEL[i.status]}</Text>
              </View>
              <Text style={s.metaT}>Düzenlendi: {fmtDate(i.issuedAt)}</Text>
              <Text style={s.metaT}>Vade: {fmtDate(i.dueAt)}</Text>
              {i.paidAt && <Text style={[s.metaT, { color: '#22c55e' }]}>Ödendi: {fmtDate(i.paidAt)}</Text>}
            </View>
            {(i.status === 'open' || i.status === 'overdue') && (
              <TouchableOpacity style={s.payBtn} onPress={() => onPay(i.id, i.number)} activeOpacity={0.85}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                <Text style={s.payBtnT}>Ödendi İşaretle</Text>
              </TouchableOpacity>
            )}
          </View>
        )))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  statV: { fontSize: typography.md, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tabRow: { flexDirection: 'row', backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: 4, gap: 4 },
  tab: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: '#3b82f6' },
  tabT: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  tabTActive: { color: '#fff' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  metaT: { color: colors.text.muted, fontSize: typography.xs },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  amount: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  mrr: { fontSize: typography.sm, fontWeight: '800', marginLeft: 'auto' },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', padding: 8, borderRadius: 8, marginTop: 4 },
  payBtnT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
});
