// ErpSyncJobsScreen — POZ-DEV-456
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { ErpSyncJob, ErpEntityKind, ErpConnection } from '../types';
import { listSyncJobs, startSyncJob, listConnections, ENTITY_LABEL, ERP_VENDOR_LABEL, ERP_VENDOR_COLOR, DIRECTION_LABEL } from '../services/enterpriseIntegrations';

const ENTITIES: ErpEntityKind[] = ['customer', 'stock', 'invoice', 'order'];

export default function ErpSyncJobsScreen() {
  const [jobs, setJobs] = useState<ErpSyncJob[]>([]);
  const [conns, setConns] = useState<ErpConnection[]>([]);

  const load = useCallback(async () => {
    setJobs(await listSyncJobs());
    setConns(await listConnections());
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const start = async (entity: ErpEntityKind) => {
    if (!conns.length) { Alert.alert('ERP yok', 'Önce bağlantı ekle.'); return; }
    const c = conns.find(x => x.status === 'connected') || conns[0];
    await startSyncJob(c.id, entity, 'pull');
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.bar}>
        {ENTITIES.map(e => (
          <TouchableOpacity key={e} onPress={() => start(e)} style={s.chip}>
            <Ionicons name="sync-outline" size={14} color="#fff" />
            <Text style={s.chipT}>{ENTITY_LABEL[e]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={jobs}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz senkron yok. Üstten başlat.</Text>}
        renderItem={({ item }) => {
          const ok = item.itemsFail === 0;
          return (
            <View style={[s.card, { borderLeftColor: ok ? '#22c55e' : '#f59e0b' }]}>
              <View style={s.row}>
                <View style={[s.vbadge, { backgroundColor: ERP_VENDOR_COLOR[item.vendor] }]}>
                  <Text style={s.vt}>{ERP_VENDOR_LABEL[item.vendor]}</Text>
                </View>
                <Text style={s.t}>{ENTITY_LABEL[item.entity]} · {DIRECTION_LABEL[item.direction]}</Text>
                <Text style={[s.cnt, { color: ok ? '#22c55e' : '#f59e0b' }]}>{item.itemsOk}/{item.itemsTotal}</Text>
              </View>
              <Text style={s.sub}>{new Date(item.startedAt).toLocaleString('tr-TR')}{item.errorMessage ? ' · ' + item.errorMessage : ''}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  bar: { flexDirection: 'row', gap: 6, padding: spacing.md, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0ea5e9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  vbadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  vt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  t: { flex: 1, color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  cnt: { fontSize: typography.sm, fontWeight: '800' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
});
