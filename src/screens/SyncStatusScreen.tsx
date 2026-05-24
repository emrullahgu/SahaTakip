// SyncStatusScreen — POZ-DEV-111 Senkronizasyon kuyruğu ve manuel drain
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography } from '../theme';
import { isOnlineMode, getSyncQueue, drainSyncQueue } from '../services/data';

interface SyncOp { id: string; table: string; action: string; payload: any; createdAt: number; }

function fmt(ms: number) { try { return new Date(ms).toLocaleString('tr-TR'); } catch { return String(ms); } }

function actionIcon(a: string): keyof typeof Ionicons.glyphMap {
  if (a === 'insert') return 'add-circle-outline';
  if (a === 'update') return 'create-outline';
  if (a === 'delete') return 'trash-outline';
  return 'ellipse-outline';
}
function actionColor(a: string): string {
  if (a === 'insert') return '#22c55e';
  if (a === 'update') return '#0ea5e9';
  if (a === 'delete') return '#ef4444';
  return '#64748b';
}

export default function SyncStatusScreen() {
  const [queue, setQueue] = useState<SyncOp[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: number; failed: number } | null>(null);
  const online = isOnlineMode();

  const refresh = useCallback(async () => {
    const q = (await getSyncQueue()) as SyncOp[];
    setQueue(q);
  }, []);

  useEffect(() => { refresh(); const id = setInterval(refresh, 3000); return () => clearInterval(id); }, [refresh]);

  const handleDrain = async () => {
    if (!online) { Alert.alert('Çevrimdışı', 'Drain için çevrimiçi olmalısınız.'); return; }
    setBusy(true);
    try {
      const res = await drainSyncQueue();
      setLastResult(res);
      await refresh();
      Alert.alert('Senkronizasyon tamamlandı', `Başarılı: ${res.ok}\nBaşarısız: ${res.failed}`);
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Bilinmeyen hata');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{queue.length}</Text>
          <Text style={styles.statLabel}>Bekleyen</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: online ? '#22c55e' : '#f59e0b' }]}>{online ? 'AÇIK' : 'KAPALI'}</Text>
          <Text style={styles.statLabel}>Bağlantı</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: '#22c55e' }]}>{lastResult?.ok ?? '-'}</Text>
          <Text style={styles.statLabel}>Son OK</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{lastResult?.failed ?? '-'}</Text>
          <Text style={styles.statLabel}>Son Hata</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, (!online || busy || queue.length === 0) && styles.btnDisabled]}
          onPress={handleDrain}
          disabled={!online || busy || queue.length === 0}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="sync" size={16} color="#fff" />}
          <Text style={styles.btnText}>{busy ? 'Eşitleniyor...' : 'Şimdi Eşitle'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnGhost} onPress={refresh}>
          <Ionicons name="refresh" size={16} color={colors.text.primary} />
          <Text style={[styles.btnText, { color: colors.text.primary }]}>Yenile</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#22c55e" />
            <Text style={styles.emptyText}>Senkronizasyon kuyruğu boş.</Text>
            <Text style={styles.emptyHint}>Tüm değişiklikler aktarıldı.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const c = actionColor(item.action);
          return (
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: c + '22', borderColor: c }]}>
                <Ionicons name={actionIcon(item.action)} size={18} color={c} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.table} · {item.action}</Text>
                <Text style={styles.rowSub}>{item.payload?.id ? `id: ${String(item.payload.id).slice(0, 12)}` : '-'}</Text>
                <Text style={styles.rowTime}>{fmt(item.createdAt)}</Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: 'row', gap: 8, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  stat: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center' },
  statValue: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  statLabel: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, padding: spacing.md },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: radius.sm, backgroundColor: '#0ea5e9' },
  btnGhost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: radius.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  empty: { alignItems: 'center', padding: spacing.xl, gap: 8 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  emptyHint: { color: colors.text.faint, fontSize: typography.xs },
  row: { flexDirection: 'row', gap: 10, padding: spacing.md, marginBottom: 8, borderRadius: radius.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  rowTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  rowSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  rowTime: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
});
