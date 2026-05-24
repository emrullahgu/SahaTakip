// OfflineQueueScreen — POZ-DEV-381
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { listOps, runSync, enqueueOp, clearSynced, OP_KIND_LABEL, OP_KIND_ICON, OP_STATUS_LABEL, OP_STATUS_COLOR } from '../services/offline';
import type { OfflineOperation, OfflineOpStatus, RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OfflineQueue'>;
type R = RouteProp<RootStackParamList, 'OfflineQueue'>;

const FILTERS: { key: OfflineOpStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'pending', label: 'Bekliyor' },
  { key: 'conflict', label: 'Çakışma' },
  { key: 'failed', label: 'Hatalı' },
  { key: 'synced', label: 'Senkron' },
];

export default function OfflineQueueScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const [ops, setOps] = useState<OfflineOperation[]>([]);
  const [filter, setFilter] = useState<OfflineOpStatus | 'all'>(route.params?.status || 'all');
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => { setOps(await listOps()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => filter === 'all' ? ops : ops.filter(o => o.status === filter), [ops, filter]);

  const seedDemo = async () => {
    await enqueueOp({ kind: 'work_order_complete', resource: 'work_order', resourceId: 'IE-201', payload: { status: 'done', completedAt: new Date().toISOString() }, description: 'IE-201 tamamlandı (offline)' });
    await enqueueOp({ kind: 'photo_attach', resource: 'work_order', resourceId: 'IE-201', payload: { uri: 'file://photo.jpg' }, description: 'Saha fotoğrafı' });
    await enqueueOp({ kind: 'stock_move', resource: 'material', resourceId: 'MLZ-1', payload: { delta: -2, forceConflict: true, remote: { delta: -1 } }, description: 'Stok düşüm (çakışma)' });
    await enqueueOp({ kind: 'form_submit', resource: 'task', payload: { forceFail: true }, description: 'Form (mock hata)' });
    load();
  };

  const doSync = async () => {
    setSyncing(true);
    const result = await runSync();
    setSyncing(false);
    Alert.alert('Senkron Tamamlandı', `${result.succeeded} başarılı · ${result.failed} hata · ${result.conflicts} çakışma`);
    load();
  };

  const doClear = () => {
    Alert.alert('Temizle', 'Senkron olmuş işlemler kuyruktan silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', onPress: async () => { const n = await clearSynced(); Alert.alert('Tamam', `${n} işlem temizlendi.`); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.toolbar}>
        <Text style={s.toolbarT}>{ops.length} işlem</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#8b5cf6' }]} onPress={seedDemo}>
            <Ionicons name="flask-outline" size={14} color="#fff" />
            <Text style={s.btnTxt}>Demo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#64748b' }]} onPress={doClear}>
            <Ionicons name="trash-outline" size={14} color="#fff" />
            <Text style={s.btnTxt}>Temizle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#22c55e' }]} onPress={doSync} disabled={syncing}>
            {syncing ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="sync-outline" size={14} color="#fff" />}
            <Text style={s.btnTxt}>Sync</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.bar} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[s.chip, filter === f.key && { backgroundColor: '#f59e0b' }]}>
            <Text style={[s.chipTxt, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 80 }}
        ListEmptyComponent={
          <EmptyState
            icon="cloud-offline-outline"
            title="İşlem yok"
            subtitle="Bu filtreye uygun offline işlem kaydı bulunamadı."
            actionLabel="+ Demo İşlemler"
            onAction={seedDemo}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.card, { borderLeftColor: OP_STATUS_COLOR[item.status as keyof typeof OP_STATUS_COLOR] }]} onPress={() => item.status === 'conflict' ? nav.navigate('ConflictResolver', { opId: item.id }) : nav.navigate('OfflineOpDetail', { opId: item.id })}>
            <Ionicons name={OP_KIND_ICON[item.kind as keyof typeof OP_KIND_ICON] as never} size={22} color={OP_STATUS_COLOR[item.status as keyof typeof OP_STATUS_COLOR]} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.t}>{item.description || OP_KIND_LABEL[item.kind as keyof typeof OP_KIND_LABEL]}</Text>
              <Text style={s.sub}>{OP_KIND_LABEL[item.kind as keyof typeof OP_KIND_LABEL]} · {item.resource}{item.resourceId ? ' · ' + item.resourceId : ''}</Text>
              <Text style={s.sub}>{new Date(item.createdAt).toLocaleString('tr-TR')} · {item.attempts} deneme</Text>
              {item.lastError ? <Text style={s.err}>{item.lastError}</Text> : null}
            </View>
            <View style={[s.statusPill, { backgroundColor: OP_STATUS_COLOR[item.status as keyof typeof OP_STATUS_COLOR] + '22' }]}>
              <Text style={[s.statusTxt, { color: OP_STATUS_COLOR[item.status as keyof typeof OP_STATUS_COLOR] }]}>{OP_STATUS_LABEL[item.status as keyof typeof OP_STATUS_LABEL]}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  toolbarT: { color: colors.text.muted, fontSize: typography.sm },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  btnTxt: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  bar: { maxHeight: 50 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipTxt: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  err: { color: '#ef4444', fontSize: typography.xs, marginTop: 2, fontWeight: '600' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  statusTxt: { fontSize: typography.xs, fontWeight: '700' },
});
