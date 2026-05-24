// Faz 48 — CpNotificationsScreen (POZ-DEV-188)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listCpNotifications, markCpNotificationRead, CP_NOTIF_ICON, CP_NOTIF_COLOR } from '../services/customerPortal';
import type { CpNotification } from '../types';

const CAT_LABEL: Record<CpNotification['category'], string> = {
  quote: 'Teklif', workorder: 'İş Emri', invoice: 'Fatura', report: 'Rapor', system: 'Sistem',
};

const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'şimdi';
  if (d < 3600) return `${Math.floor(d / 60)} dk önce`;
  if (d < 86400) return `${Math.floor(d / 3600)} saat önce`;
  return `${Math.floor(d / 86400)} gün önce`;
};

export default function CpNotificationsScreen() {
  const [list, setList] = useState<CpNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => setList(await listCpNotifications()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = filter === 'unread' ? list.filter(n => !n.read) : list;
  const unread = list.filter(n => !n.read).length;

  const tap = async (n: CpNotification) => {
    if (!n.read) { await markCpNotificationRead(n.id); load(); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.summary}>
          <View style={s.sumBox}><Text style={s.sumV}>{list.length}</Text><Text style={s.sumL}>Toplam</Text></View>
          <View style={[s.sumBox, { backgroundColor: '#ef444433' }]}>
            <Text style={[s.sumV, { color: '#ef4444' }]}>{unread}</Text>
            <Text style={s.sumL}>Okunmamış</Text>
          </View>
        </View>

        <View style={s.chips}>
          {(['all', 'unread'] as const).map(k => (
            <TouchableOpacity key={k} style={[s.chip, filter === k && { backgroundColor: '#0ea5e9' }]} onPress={() => setFilter(k)}>
              <Text style={[s.chipT, filter === k && { color: '#fff' }]}>{k === 'all' ? 'Tümü' : 'Okunmamış'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.map(n => (
          <TouchableOpacity key={n.id} style={[s.card, !n.read && { borderLeftColor: CP_NOTIF_COLOR[n.category], borderLeftWidth: 4 }]} onPress={() => tap(n)}>
            <View style={[s.iconBox, { backgroundColor: CP_NOTIF_COLOR[n.category] + '22', borderColor: CP_NOTIF_COLOR[n.category] }]}>
              <Ionicons name={CP_NOTIF_ICON[n.category] as any} size={20} color={CP_NOTIF_COLOR[n.category]} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.row}>
                <Text style={[s.title, !n.read && { fontWeight: '800' }]}>{n.title}</Text>
                {!n.read && <View style={s.dot} />}
              </View>
              <Text style={s.body} numberOfLines={2}>{n.body}</Text>
              <View style={s.metaRow}>
                <Text style={[s.cat, { color: CP_NOTIF_COLOR[n.category] }]}>{CAT_LABEL[n.category]}</Text>
                <Text style={s.time}>{timeAgo(n.createdAt)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  summary: { flexDirection: 'row', gap: spacing.sm },
  sumBox: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border.primary },
  sumV: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  sumL: { color: colors.text.muted, fontSize: typography.xs },
  chips: { flexDirection: 'row', gap: spacing.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  card: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  iconBox: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  body: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  cat: { fontSize: typography.xs, fontWeight: '700' },
  time: { color: colors.text.faint, fontSize: typography.xs },
});
