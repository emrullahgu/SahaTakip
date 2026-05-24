// AuditLogScreen — POZ-DEV-110 Denetim kayıtları görüntüleyici
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography } from '../theme';
import { auditRepo, AuditLogRow } from '../services/data/auditRepo';
import { isOnlineMode } from '../services/data';

function fmt(iso: string) {
  try { const d = new Date(iso); return d.toLocaleString('tr-TR'); } catch { return iso; }
}

function actionColor(action: string): string {
  if (action.includes('delete')) return '#ef4444';
  if (action.includes('create') || action.includes('insert')) return '#22c55e';
  if (action.includes('update') || action.includes('edit'))  return '#0ea5e9';
  if (action.includes('login') || action.includes('auth'))   return '#8b5cf6';
  return '#64748b';
}

export default function AuditLogScreen() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const online = isOnlineMode();

  const refresh = useCallback(async () => {
    setLoading(true);
    setRows(await auditRepo.list(200));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.action.toLowerCase().includes(q) ||
      (r.table_name ?? '').toLowerCase().includes(q) ||
      (r.ref_id ?? '').toLowerCase().includes(q)
    );
  }, [rows, query]);

  if (!online) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.text.faint} />
          <Text style={styles.emptyText}>Çevrimdışı modda denetim kayıtları görüntülenemez.</Text>
          <Text style={styles.emptyHint}>Supabase yapılandırılmalı (EXPO_PUBLIC_SUPABASE_URL).</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={14} color={colors.text.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Eylem / tablo / id ara..."
            placeholderTextColor={colors.text.faint}
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.empty}><ActivityIndicator color="#22c55e" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#22c55e" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.text.faint} />
              <Text style={styles.emptyText}>Kayıt bulunamadı.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const c = actionColor(item.action);
            return (
              <View style={styles.row}>
                <View style={[styles.dot, { backgroundColor: c }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.rowHeader}>
                    <Text style={[styles.action, { color: c }]}>{item.action}</Text>
                    <Text style={styles.time}>{fmt(item.created_at)}</Text>
                  </View>
                  <Text style={styles.meta}>
                    {item.table_name ?? '-'}{item.ref_id ? ` · ${item.ref_id.slice(0, 8)}` : ''}
                  </Text>
                  {item.user_id && <Text style={styles.user}>kullanıcı: {item.user_id.slice(0, 8)}</Text>}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { flexDirection: 'row', gap: 8, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 36, borderRadius: radius.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: typography.sm },
  refreshBtn: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', padding: spacing.xl, gap: 8 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  emptyHint: { color: colors.text.faint, fontSize: typography.xs },
  row: { flexDirection: 'row', gap: 10, padding: spacing.md, marginBottom: 8, borderRadius: radius.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  action: { fontSize: typography.sm, fontWeight: '800' },
  time: { color: colors.text.faint, fontSize: 10 },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  user: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
});
