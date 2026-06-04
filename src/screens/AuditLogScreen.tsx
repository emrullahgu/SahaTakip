// AuditLogScreen — POZ-DEV-110 Denetim kayıtları görüntüleyici
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography } from '../theme';
import { auditRepo, AuditLogRow } from '../services/data/auditRepo';
import { isOnlineMode, supabase } from '../services/data';
import { useAppContext } from '../context/AppContext';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

const ACTION_LABELS: Record<string, string> = {
  'work_order.create': 'Iş Emri Oluşturuldu',
  'work_order.update': 'Iş Emri Güncellendi',
  'work_order.delete': 'Iş Emri Silindi',
  'work_order.approve': 'Iş Emri Onaylandı',
  'work_order.status': 'Iş Emri Durumu Değişti',
  'work_order.assign': 'Iş Emri Atandı',
  'work_order.transfer': 'Iş Emri Devredildi',
  'work_order.media': 'Iş Emri Medyası Eklendi',
  'work_order.client_accept': 'Müşteri Onayı',
  'customer.create': 'Müşteri Eklendi',
  'customer.update': 'Müşteri Güncellendi',
  'customer.delete': 'Müşteri Silindi',
  'quote.create': 'Teklif Oluşturuldu',
  'quote.update': 'Teklif Güncellendi',
  'quote.delete': 'Teklif Silindi',
  'quote.status': 'Teklif Durumu Değişti',
  'quote.share_token': 'Teklif Paylaşım Linki',
  'employee.wage_update': 'Ücret Güncellendi',
  'vehicle.create': 'Araç Eklendi',
  'vehicle.update': 'Araç Güncellendi',
  'vehicle.delete': 'Araç Silindi',
  'expense.create': 'Masraf Eklendi',
  'expense.delete': 'Masraf Silindi',
  'shift.start': 'Mesai Başladı',
  'shift.end': 'Mesai Bitti',
};

function labelOf(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

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
  const [profilesById, setProfilesById] = useState<Record<string, string>>({});
  const online = isOnlineMode();
  const { employees } = useAppContext();

  const userNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of employees) m[e.id] = e.name;
    return m;
  }, [employees]);

  const userLabel = useCallback((uid: string | null) => {
    if (!uid) return '—';
    return userNameById[uid] ?? profilesById[uid] ?? `#${uid.slice(0, 8)}`;
  }, [userNameById, profilesById]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await auditRepo.list(200);
    setRows(list);
    // Toplu profil çözümle (auth uid → ad)
    try {
      const ids = Array.from(new Set(list.map((r) => r.user_id).filter((id): id is string => !!id && !profilesById[id])));
      if (ids.length && supabase) {
        const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        if (data) {
          setProfilesById((prev) => {
            const next = { ...prev };
            for (const p of data as any[]) {
              if (p?.id && p?.full_name) next[p.id] = p.full_name;
            }
            return next;
          });
        }
      }
    } catch {}
    setLoading(false);
  }, [profilesById]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.action.toLowerCase().includes(q) ||
      labelOf(r.action).toLowerCase().includes(q) ||
      (r.table_name ?? '').toLowerCase().includes(q) ||
      (r.ref_id ?? '').toLowerCase().includes(q) ||
      userLabel(r.user_id).toLowerCase().includes(q)
    );
  }, [rows, query, userLabel]);

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
          {...FLATLIST_DEFAULTS}
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#22c55e" />}
          ListEmptyComponent={!loading ? (
            <EmptyState
              icon="document-text-outline"
              title="Kayıt bulunamadı"
              subtitle="Arama kriterlerini değiştirerek tekrar deneyebilirsiniz."
            />
          ) : null}
          renderItem={({ item }) => {
            const c = actionColor(item.action);
            const metaPreview = item.meta && typeof item.meta === 'object'
              ? Object.entries(item.meta).slice(0, 3).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · ')
              : '';
            return (
              <View style={styles.row}>
                <View style={[styles.dot, { backgroundColor: c }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.rowHeader}>
                    <Text style={[styles.action, { color: c }]}>{labelOf(item.action)}</Text>
                    <Text style={styles.time}>{fmt(item.created_at)}</Text>
                  </View>
                  <Text style={styles.meta}>
                    {item.table_name ?? '-'}{item.ref_id ? ` · ${item.ref_id.slice(0, 8)}` : ''}
                  </Text>
                  <Text style={styles.user}>Kullanıcı: {userLabel(item.user_id)}</Text>
                  {metaPreview ? <Text style={styles.user} numberOfLines={2}>{metaPreview}</Text> : null}
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
