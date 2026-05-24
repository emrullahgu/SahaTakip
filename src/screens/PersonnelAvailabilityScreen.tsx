// Faz 44 — PersonnelAvailabilityScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { PersonnelAvailabilityRecord, PersonnelLiveStatus } from '../types';
import { listPersonnel, setPersonnelStatus, STATUS_COLOR, STATUS_LABEL } from '../services/liveOps';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

const STATUSES: PersonnelLiveStatus[] = ['available', 'on_job', 'break', 'offline'];

export default function PersonnelAvailabilityScreen() {
  const [items, setItems] = useState<PersonnelAvailabilityRecord[]>([]);
  const [editing, setEditing] = useState<PersonnelAvailabilityRecord | null>(null);
  const load = useCallback(async () => { setItems(await listPersonnel()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const counts: Record<PersonnelLiveStatus, number> = { available: 0, on_job: 0, break: 0, offline: 0 };
  items.forEach(i => counts[i.status]++);

  const setS = async (st: PersonnelLiveStatus) => {
    if (!editing) return;
    await setPersonnelStatus(editing.id, st);
    setEditing(null); load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.statRow}>
        {STATUSES.map(st => (
          <View key={st} style={[s.statCard, { borderLeftColor: STATUS_COLOR[st] }]}>
            <Text style={[s.sV, { color: STATUS_COLOR[st] }]}>{counts[st]}</Text>
            <Text style={s.sL}>{STATUS_LABEL[st]}</Text>
          </View>
        ))}
      </View>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Personel verisi yok"
            subtitle="Canlı takip sisteminde kayıtlı personel bulunamadı."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.card, { borderLeftColor: STATUS_COLOR[item.status] }]} onPress={() => setEditing(item)}>
            <View style={[s.avatar, { backgroundColor: STATUS_COLOR[item.status] }]}>
              <Ionicons name="person" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.n}>{item.name}</Text>
              <Text style={s.st}>{STATUS_LABEL[item.status]}{item.currentCustomer ? ` · ${item.currentCustomer}` : ''}</Text>
              <Text style={s.tm}>{new Date(item.since).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}'den beri</Text>
            </View>
            <View style={[s.dot, { backgroundColor: STATUS_COLOR[item.status] }]} />
          </TouchableOpacity>
        )}
      />
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={s.mw}><View style={s.mbox}>
          <Text style={s.mt}>{editing?.name}</Text>
          <Text style={s.lbl}>Durum güncelle:</Text>
          {STATUSES.map(st => (
            <TouchableOpacity key={st} style={[s.opt, { backgroundColor: STATUS_COLOR[st] }]} onPress={() => setS(st)}>
              <Text style={s.optT}>{STATUS_LABEL[st]}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[s.opt, { backgroundColor: '#475569' }]} onPress={() => setEditing(null)}>
            <Text style={s.optT}>Vazgeç</Text>
          </TouchableOpacity>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  statRow: { flexDirection: 'row', gap: 6, padding: spacing.md },
  statCard: { flex: 1, padding: 8, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, alignItems: 'flex-start' },
  sV: { fontSize: typography.lg, fontWeight: '800' },
  sL: { color: colors.text.muted, fontSize: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  st: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tm: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  mw: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.md },
  mbox: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  mt: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  lbl: { color: colors.text.muted, fontSize: typography.xs },
  opt: { padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  optT: { color: '#fff', fontWeight: '700' },
});
