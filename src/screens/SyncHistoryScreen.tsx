// SyncHistoryScreen — POZ-DEV-384
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listSyncLog, clearSyncLog } from '../services/offline';
import type { SyncLogEntry } from '../types';

const STATUS_COLOR: Record<SyncLogEntry['status'], string> = { success: '#22c55e', partial: '#f59e0b', failed: '#ef4444' };
const STATUS_LABEL: Record<SyncLogEntry['status'], string> = { success: 'Başarılı', partial: 'Kısmi', failed: 'Başarısız' };

export default function SyncHistoryScreen() {
  const [items, setItems] = useState<SyncLogEntry[]>([]);

  const load = useCallback(async () => { setItems(await listSyncLog()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doClear = () => {
    Alert.alert('Temizle', 'Tüm senkron geçmişi silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await clearSyncLog(); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.toolbar}>
        <Text style={s.toolbarT}>{items.length} senkron kaydı</Text>
        <TouchableOpacity style={s.btn} onPress={doClear}>
          <Ionicons name="trash-outline" size={14} color="#fff" />
          <Text style={s.btnTxt}>Temizle</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz senkron yok.</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: STATUS_COLOR[item.status] }]}>
            <Ionicons name="sync-outline" size={22} color={STATUS_COLOR[item.status]} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.t}>{STATUS_LABEL[item.status]} · {item.ops} işlem</Text>
              <Text style={s.sub}>{new Date(item.startedAt).toLocaleString('tr-TR')} · {(item.durationMs / 1000).toFixed(2)}s</Text>
              <View style={s.statRow}>
                <Pill color="#22c55e" label={`✓ ${item.succeeded}`} />
                {item.failed > 0 ? <Pill color="#ef4444" label={`✗ ${item.failed}`} /> : null}
                {item.conflicts > 0 ? <Pill color="#a855f7" label={`⚡ ${item.conflicts}`} /> : null}
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Pill({ color, label }: { color: string; label: string }) {
  return (
    <View style={[s.pill, { backgroundColor: color + '22' }]}>
      <Text style={[s.pillT, { color }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  toolbarT: { color: colors.text.muted, fontSize: typography.sm },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  btnTxt: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  statRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  pillT: { fontSize: typography.xs, fontWeight: '700' },
});
