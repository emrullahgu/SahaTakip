// Faz 43 — QuoteOutcomesScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { QuoteOutcomeRecord, QuoteOutcome, QuoteLostReason } from '../types';
import { listOutcomes, outcomeStats, setOutcome, OUTCOME_LABEL, OUTCOME_COLOR, LOST_REASON_LABEL } from '../services/smartQuote';

const OUTCOMES: QuoteOutcome[] = ['won', 'lost', 'pending'];
const REASONS: QuoteLostReason[] = ['price', 'timing', 'competitor', 'scope', 'no_response', 'other'];

export default function QuoteOutcomesScreen() {
  const [items, setItems] = useState<QuoteOutcomeRecord[]>([]);
  const [stats, setStats] = useState<{ won: number; lost: number; pending: number; winRate: number; lostByReason: Record<QuoteLostReason, number> } | null>(null);
  const [editing, setEditing] = useState<QuoteOutcomeRecord | null>(null);
  const [outcome, setOcm] = useState<QuoteOutcome>('won');
  const [reason, setReason] = useState<QuoteLostReason>('price');
  const [notes, setNotes] = useState('');
  const [comp, setComp] = useState('');

  const load = useCallback(async () => { setItems(await listOutcomes()); setStats(await outcomeStats()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = (it: QuoteOutcomeRecord) => {
    setEditing(it);
    setOcm(it.outcome);
    setReason(it.reason || 'price');
    setNotes(it.notes || '');
    setComp(it.competitorName || '');
  };
  const save = async () => {
    if (!editing) return;
    await setOutcome(editing.id, outcome, outcome === 'lost' ? reason : undefined, notes || undefined, comp || undefined);
    setEditing(null);
    load();
  };
  const maxReason = stats ? Math.max(1, ...Object.values(stats.lostByReason)) : 1;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        ListHeaderComponent={
          stats ? (
            <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
              <View style={s.statRow}>
                <Stat label="Kazanıldı" v={stats.won} color="#22c55e" icon="trophy" />
                <Stat label="Kaybedildi" v={stats.lost} color="#ef4444" icon="close-circle" />
                <Stat label="Bekliyor" v={stats.pending} color="#f59e0b" icon="time" />
                <Stat label="Kazanma %" v={stats.winRate} color="#0ea5e9" icon="trending-up" suffix="%" />
              </View>
              <View style={s.card}>
                <Text style={s.cardH}>Kayıp Sebepleri</Text>
                {REASONS.map(r => {
                  const v = stats.lostByReason[r];
                  return (
                    <View key={r} style={{ marginVertical: 3 }}>
                      <View style={s.barRow}>
                        <Text style={s.barLbl}>{LOST_REASON_LABEL[r]}</Text>
                        <Text style={s.barV}>{v}</Text>
                      </View>
                      <View style={s.barBg}>
                        <View style={[s.barFg, { width: `${(v / maxReason) * 100}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null
        }
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.outCard, { borderLeftColor: OUTCOME_COLOR[item.outcome] }]} onPress={() => open(item)}>
            <View style={{ flex: 1 }}>
              <Text style={s.outN}>{item.customerName}</Text>
              <Text style={s.outQ}>{item.quoteId} · ₺{item.amount.toLocaleString('tr-TR')}</Text>
              {item.reason && <Text style={s.outR}>Sebep: {LOST_REASON_LABEL[item.reason]}{item.competitorName ? ` · ${item.competitorName}` : ''}</Text>}
              {item.notes && <Text style={s.outNo}>{item.notes}</Text>}
            </View>
            <View style={[s.badge, { backgroundColor: OUTCOME_COLOR[item.outcome] }]}>
              <Text style={s.badgeT}>{OUTCOME_LABEL[item.outcome]}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={s.mw}><View style={s.mbox}>
          <Text style={s.mt}>Durum Güncelle</Text>
          <Text style={s.lbl}>Sonuç</Text>
          <View style={s.row}>
            {OUTCOMES.map(o => (
              <TouchableOpacity key={o} style={[s.outBtn, outcome === o && { backgroundColor: OUTCOME_COLOR[o], borderColor: OUTCOME_COLOR[o] }]} onPress={() => setOcm(o)}>
                <Text style={[s.outBtnT, outcome === o && { color: '#fff' }]}>{OUTCOME_LABEL[o]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {outcome === 'lost' && (
            <>
              <Text style={s.lbl}>Sebep</Text>
              <View style={s.row2}>
                {REASONS.map(r => (
                  <TouchableOpacity key={r} style={[s.reaBtn, reason === r && { backgroundColor: '#ef4444', borderColor: '#ef4444' }]} onPress={() => setReason(r)}>
                    <Text style={[s.reaBtnT, reason === r && { color: '#fff' }]}>{LOST_REASON_LABEL[r]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={s.input} value={comp} onChangeText={setComp} placeholder="Rakip firma (opsiyonel)" placeholderTextColor={colors.text.faint} />
            </>
          )}
          <TextInput style={[s.input, { minHeight: 60 }]} value={notes} onChangeText={setNotes} placeholder="Not (opsiyonel)" placeholderTextColor={colors.text.faint} multiline />
          <View style={s.row}>
            <TouchableOpacity style={[s.mb, { backgroundColor: '#475569' }]} onPress={() => setEditing(null)}><Text style={s.mbT}>Vazgeç</Text></TouchableOpacity>
            <TouchableOpacity style={[s.mb, { backgroundColor: '#22c55e' }]} onPress={save}><Text style={s.mbT}>Kaydet</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ label, v, color, icon, suffix }: { label: string; v: number; color: string; icon: any; suffix?: string }) {
  return (
    <View style={[s.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={s.statV}>{v}{suffix || ''}</Text>
      <Text style={s.statL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  statRow: { flexDirection: 'row', gap: 6, padding: spacing.md, paddingBottom: 0 },
  statCard: { flex: 1, padding: 8, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, alignItems: 'flex-start', gap: 2 },
  statV: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: 10 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, marginHorizontal: spacing.md },
  cardH: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800', marginBottom: 6 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between' },
  barLbl: { color: colors.text.muted, fontSize: typography.xs },
  barV: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '800' },
  barBg: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, marginTop: 2 },
  barFg: { height: 6, backgroundColor: '#ef4444', borderRadius: 3 },
  outCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  outN: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  outQ: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  outR: { color: '#f59e0b', fontSize: typography.xs, marginTop: 2 },
  outNo: { color: colors.text.faint, fontSize: 10, marginTop: 2, fontStyle: 'italic' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  mw: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  mbox: { backgroundColor: colors.bg.secondary, padding: spacing.md, gap: spacing.sm },
  mt: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  lbl: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 6 },
  row2: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  outBtn: { flex: 1, padding: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center' },
  outBtnT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  reaBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  reaBtnT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  mb: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  mbT: { color: '#fff', fontWeight: '700' },
});
