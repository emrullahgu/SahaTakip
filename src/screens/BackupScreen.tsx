// BackupScreen — POZ-DEV-106
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { createBackup, deleteBackup, listBackups, markRestored } from '../services/security';
import { BackupRecord, BackupStatus } from '../types';

const STATUS_COLOR: Record<BackupStatus, string> = {
  success: '#22c55e',
  pending: '#f59e0b',
  failed: '#dc2626',
  restored: '#8b5cf6',
};
const STATUS_LABEL: Record<BackupStatus, string> = {
  success: 'Başarılı',
  pending: 'Bekliyor',
  failed: 'Başarısız',
  restored: 'Geri Yüklendi',
};

function fmt(iso: string): string { try { return new Date(iso).toLocaleString('tr-TR'); } catch { return iso; } }
function formatBytes(n: number): string {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}

export default function BackupScreen() {
  const [list, setList] = useState<BackupRecord[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => { setList(await listBackups()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onBackup = async () => {
    setBusy(true);
    try {
      const r = await createBackup();
      await refresh();
      Alert.alert('Yedek Alındı', `${formatBytes(r.sizeBytes)} kaydedildi.`);
    } catch (e: unknown) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Yedekleme başarısız.');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = (id: string) => {
    Alert.alert('Geri Yükle', 'Bu yedekten geri yükleme yapılsın mı? (Demo)', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Geri Yükle', onPress: async () => {
        await markRestored(id, 'Demo geri yükleme');
        await refresh();
        Alert.alert('Tamam', 'Geri yükleme demo kaydedildi.');
      } },
    ]);
  };

  const onDelete = (id: string) => {
    Alert.alert('Sil', 'Yedek kaydı silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteBackup(id); await refresh(); } },
    ]);
  };

  const totalBytes = list.reduce((s, b) => s + b.sizeBytes, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="save-outline" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Veri Yedekleme</Text>
            <Text style={styles.heroSub}>{list.length} yedek · {formatBytes(totalBytes)} toplam</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color="#0ea5e9" />
          <Text style={styles.infoText}>
            Tüm AsyncStorage verilerinin anlık yedeğini alır. Gerçek dağıtımda günlük cron + Supabase bucket'a otomatik yükleme önerilir.
          </Text>
        </View>

        <TouchableOpacity style={[styles.primaryBtn, busy && { opacity: 0.6 }]} onPress={onBackup} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-upload-outline" size={16} color="#fff" />}
          <Text style={styles.primaryBtnText}>{busy ? 'Yedekleniyor…' : 'Şimdi Yedek Al'}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Yedek Geçmişi</Text>
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="archive-outline" size={36} color={colors.text.faint} />
            <Text style={styles.emptyText}>Henüz yedek yok.</Text>
          </View>
        ) : list.map(b => (
          <View key={b.id} style={styles.card}>
            <View style={styles.rowTop}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[b.status] }]} />
              <Text style={styles.label}>{fmt(b.createdAt)}</Text>
              <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[b.status] + '22', borderColor: STATUS_COLOR[b.status] }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[b.status] }]}>{STATUS_LABEL[b.status]}</Text>
              </View>
            </View>
            <Text style={styles.locText} numberOfLines={1}>{b.location}</Text>
            <Text style={styles.sizeText}>{formatBytes(b.sizeBytes)}{b.restoredAt ? ` · Geri yüklendi: ${fmt(b.restoredAt)}` : ''}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onRestore(b.id)}>
                <Ionicons name="cloud-download-outline" size={14} color="#0ea5e9" />
                <Text style={[styles.actionText, { color: '#0ea5e9' }]}>Geri Yükle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(b.id)}>
                <Ionicons name="trash-outline" size={14} color="#dc2626" />
                <Text style={[styles.actionText, { color: '#dc2626' }]}>Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.cronBox}>
          <Ionicons name="time-outline" size={14} color="#f59e0b" />
          <Text style={styles.cronText}>
            Otomatik cron: Supabase pg_cron ile günlük 03:00 yedek + 30 günlük saklama önerilir.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#0ea5e9', borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  infoBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', padding: spacing.sm, backgroundColor: 'rgba(14,165,233,0.08)', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(14,165,233,0.25)', marginBottom: spacing.md },
  infoText: { flex: 1, color: '#7dd3fc', fontSize: 11, lineHeight: 15 },
  primaryBtn: { flexDirection: 'row', backgroundColor: brand.green, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: spacing.md },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  sectionTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginTop: spacing.sm, marginBottom: spacing.sm },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginBottom: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  label: { flex: 1, color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700' },
  locText: { color: colors.text.muted, fontSize: typography.xs, marginTop: 6 },
  sizeText: { color: colors.text.faint, fontSize: 11, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { color: colors.text.muted },
  cronBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', padding: spacing.sm, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)', marginTop: spacing.lg },
  cronText: { flex: 1, color: '#fbbf24', fontSize: 11, lineHeight: 16 },
});
