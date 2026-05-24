// SalesVisitsScreen — POZ-DEV-089 Satış ziyaret listesi
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { listVisits, deleteVisit, OUTCOME_LABEL, OUTCOME_COLOR } from '../services/salesVisits';
import { RootStackParamList, SalesVisit, SalesVisitOutcome } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SalesVisits'>;
type RP = RouteProp<RootStackParamList, 'SalesVisits'>;

const OUTCOMES: (SalesVisitOutcome | 'all')[] = ['all', 'opportunity', 'won', 'lost', 'follow_up', 'no_interest'];

function fmtDate(iso: string): string { try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return iso; } }
function fmtMoney(n?: number): string {
  if (n === undefined) return '';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0 }) + ' ₺';
}

export default function SalesVisitsScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RP>();
  const filterCustomerId = route.params?.customerId;
  const [items, setItems] = useState<SalesVisit[]>([]);
  const [outcomeFilter, setOutcomeFilter] = useState<SalesVisitOutcome | 'all'>('all');

  const refresh = useCallback(async () => { setItems(await listVisits()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = useMemo(() => items.filter(v => {
    if (filterCustomerId && v.customerId !== filterCustomerId) return false;
    if (outcomeFilter !== 'all' && v.outcome !== outcomeFilter) return false;
    return true;
  }), [items, filterCustomerId, outcomeFilter]);

  const stats = useMemo(() => ({
    opp: filtered.filter(v => v.outcome === 'opportunity').length,
    won: filtered.filter(v => v.outcome === 'won').length,
    followUp: filtered.filter(v => v.outcome === 'follow_up').length,
  }), [filtered]);

  const onDelete = (id: string) => {
    Alert.alert('Sil', 'Ziyaret kaydı silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteVisit(id); await refresh(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <View style={styles.summary}>
          <Pill label="Fırsat" value={stats.opp} color={OUTCOME_COLOR.opportunity} />
          <Pill label="Kazandı" value={stats.won} color={OUTCOME_COLOR.won} />
          <Pill label="Takip" value={stats.followUp} color={OUTCOME_COLOR.follow_up} />
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => nav.navigate('SalesVisitForm', filterCustomerId ? { customerId: filterCustomerId } : undefined)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newBtnText}>Yeni Ziyaret</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chipsRow}>
        {OUTCOMES.map(o => {
          const active = outcomeFilter === o;
          return (
            <TouchableOpacity key={o} style={[styles.chip, active && styles.chipActive]} onPress={() => setOutcomeFilter(o)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {o === 'all' ? 'Tümü' : OUTCOME_LABEL[o]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>Ziyaret yok.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => nav.navigate('SalesVisitForm', { visitId: item.id })}
            onLongPress={() => onDelete(item.id)}
          >
            <View style={[styles.iconBox, { backgroundColor: OUTCOME_COLOR[item.outcome] + '22' }]}>
              <Ionicons name="people-outline" size={20} color={OUTCOME_COLOR[item.outcome]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.customerName}</Text>
              <Text style={styles.sub}>
                {fmtDate(item.visitDate)}
                {item.salespersonName ? ` · ${item.salespersonName}` : ''}
              </Text>
              {item.purpose ? <Text style={styles.subFaint} numberOfLines={1}>{item.purpose}</Text> : null}
              {item.competitor?.name ? (
                <Text style={styles.competitor}>↪ Rakip: {item.competitor.name}</Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={[styles.outcome, { backgroundColor: OUTCOME_COLOR[item.outcome] + '22' }]}>
                <Text style={[styles.outcomeText, { color: OUTCOME_COLOR[item.outcome] }]}>
                  {OUTCOME_LABEL[item.outcome]}
                </Text>
              </View>
              {item.estimatedAmount ? (
                <Text style={styles.amount}>{fmtMoney(item.estimatedAmount)}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function Pill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      <Text style={[styles.pillValue, { color }]}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { padding: spacing.lg, paddingBottom: 6, gap: 8 },
  summary: { flexDirection: 'row', gap: 6 },
  pill: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md, borderWidth: 1 },
  pillValue: { fontSize: typography.lg, fontWeight: '800' },
  pillLabel: { color: colors.text.muted, fontSize: typography.xs },
  newBtn: { flexDirection: 'row', gap: 4, backgroundColor: brand.green, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: spacing.lg, marginBottom: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipActive: { backgroundColor: brand.blueLight, borderColor: brand.blueLight },
  chipText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginTop: spacing.sm },
  iconBox: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  subFaint: { color: colors.text.faint, fontSize: 11, marginTop: 1 },
  competitor: { color: '#f59e0b', fontSize: 11, marginTop: 2 },
  outcome: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  outcomeText: { fontSize: 10, fontWeight: '800' },
  amount: { color: brand.green, fontSize: typography.sm, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.muted },
});
