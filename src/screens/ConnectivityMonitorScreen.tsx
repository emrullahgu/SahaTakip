// ConnectivityMonitorScreen — POZ-DEV-387
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listConnectivity, recordConnectivity } from '../services/offline';
import type { ConnectivitySample } from '../types';

export default function ConnectivityMonitorScreen() {
  const [samples, setSamples] = useState<ConnectivitySample[]>([]);

  const load = useCallback(async () => { setSamples(await listConnectivity()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = useMemo(() => {
    const total = samples.length;
    const online = samples.filter(s => s.online).length;
    const offline = total - online;
    const avgRtt = samples.filter(s => s.rttMs).reduce((a, b) => a + (b.rttMs || 0), 0) / Math.max(1, samples.filter(s => s.rttMs).length);
    return { total, online, offline, avgRtt: Math.round(avgRtt) };
  }, [samples]);

  const simulate = async () => {
    const types = ['wifi', '4g', '3g', '2g'];
    for (let i = 0; i < 5; i++) {
      const online = Math.random() > 0.2;
      await recordConnectivity({
        online,
        effectiveType: online ? types[Math.floor(Math.random() * types.length)] : 'offline',
        rttMs: online ? Math.round(Math.random() * 500) + 30 : undefined,
      });
    }
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.summary}>
        <Stat label="Toplam" value={String(stats.total)} color="#0ea5e9" />
        <Stat label="Online" value={String(stats.online)} color="#22c55e" />
        <Stat label="Offline" value={String(stats.offline)} color="#ef4444" />
        <Stat label="Ort. RTT" value={`${stats.avgRtt || 0}ms`} color="#f59e0b" />
      </View>
      <View style={s.toolbar}>
        <Text style={s.toolbarT}>Son ölçümler</Text>
        <TouchableOpacity style={s.btn} onPress={simulate}>
          <Ionicons name="flask-outline" size={14} color="#fff" />
          <Text style={s.btnTxt}>Simüle Et</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={samples}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz ölçüm yok.</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: item.online ? '#22c55e' : '#ef4444' }]}>
            <Ionicons name={item.online ? 'wifi-outline' : 'cloud-offline-outline'} size={20} color={item.online ? '#22c55e' : '#ef4444'} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.t}>{item.online ? 'Online' : 'Offline'} · {item.effectiveType || '—'}</Text>
              <Text style={s.sub}>{new Date(item.at).toLocaleString('tr-TR')}{item.rttMs ? ` · RTT ${item.rttMs}ms` : ''}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.stat, { borderColor: color }]}>
      <Text style={[s.statV, { color }]}>{value}</Text>
      <Text style={s.statL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  summary: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  stat: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center', borderWidth: 1 },
  statV: { fontSize: typography.lg, fontWeight: '800' },
  statL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  toolbarT: { color: colors.text.muted, fontSize: typography.sm },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8b5cf6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  btnTxt: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});
