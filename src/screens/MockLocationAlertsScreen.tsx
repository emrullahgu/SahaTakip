// MockLocationAlertsScreen — POZ-DEV-119 Sahte konum uyarıları
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography } from '../theme';
import { locationsRepo, isOnlineMode } from '../services/data';
import type { LocationRow } from '../services/data/locationsRepo';

function fmt(iso: string) { try { return new Date(iso).toLocaleString('tr-TR'); } catch { return iso; } }

export default function MockLocationAlertsScreen() {
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const online = isOnlineMode();

  const refresh = useCallback(async () => {
    setLoading(true);
    setRows(await locationsRepo.listMockRecent(200));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (!online) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.text.faint} />
          <Text style={styles.emptyText}>Sahte konum kayıtları için çevrimiçi olmalısınız.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.banner}>
        <Ionicons name="warning" size={20} color="#ef4444" />
        <Text style={styles.bannerText}>
          Bu liste cihaz tarafından <Text style={{ fontWeight: '800' }}>mock GPS</Text> olarak işaretlenmiş konum
          gönderimlerini içerir. İlgili kullanıcı denetlenmelidir.
        </Text>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryValue}>{rows.length}</Text>
        <Text style={styles.summaryLabel}>Son 200 kayıt içinde sahte konum</Text>
        <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.empty}><ActivityIndicator color="#ef4444" /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r, i) => r.id ?? `${r.userId}-${r.recordedAt}-${i}`}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#ef4444" />}
          ListEmptyComponent={!loading ? (
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#22c55e" />
              <Text style={styles.emptyText}>Sahte konum kaydı yok.</Text>
              <Text style={styles.emptyHint}>Tüm konum bildirimleri güvenilir.</Text>
            </View>
          ) : null}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.iconBox}>
                <Ionicons name="warning" size={18} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.userId.slice(0, 12)}</Text>
                <Text style={styles.rowSub}>
                  {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                  {item.accuracy != null ? ` · ±${item.accuracy.toFixed(0)}m` : ''}
                </Text>
                <Text style={styles.rowTime}>{fmt(item.recordedAt)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  banner: { flexDirection: 'row', gap: 8, padding: spacing.md, backgroundColor: '#ef444422', borderBottomWidth: 1, borderBottomColor: '#ef4444' },
  bannerText: { flex: 1, color: colors.text.primary, fontSize: typography.xs, lineHeight: 18 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  summaryValue: { color: '#ef4444', fontWeight: '800', fontSize: typography.xl },
  summaryLabel: { flex: 1, color: colors.text.muted, fontSize: typography.xs },
  refreshBtn: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', padding: spacing.xl, gap: 8 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  emptyHint: { color: colors.text.faint, fontSize: typography.xs },
  row: { flexDirection: 'row', gap: 10, padding: spacing.md, marginBottom: 8, borderRadius: radius.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: '#ef444433', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: '#ef444422', borderWidth: 1, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  rowSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  rowTime: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
});
