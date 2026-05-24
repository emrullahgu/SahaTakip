// Faz 51 — DepNetlifyScreen (POZ-DEV-214)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listDepNetlify } from '../services/deploy';
import type { DepNetlifyDeploy } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const STATUS_LABEL: Record<DepNetlifyDeploy['status'], string> = { ready: 'Yayında', building: 'Derleniyor', error: 'Hata', queued: 'Sırada' };
const STATUS_COLOR: Record<DepNetlifyDeploy['status'], string> = { ready: '#22c55e', building: '#0ea5e9', error: '#ef4444', queued: '#64748b' };
const STATUS_ICON: Record<DepNetlifyDeploy['status'], string> = { ready: 'checkmark-circle', building: 'sync', error: 'close-circle', queued: 'time' };

const fmtDate = (s: string) => new Date(s).toLocaleString('tr-TR');
const fmtDur = (sec: number) => sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}d ${sec % 60}s`;

export default function DepNetlifyScreen() {
  const [items, setItems] = useState<DepNetlifyDeploy[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listDepNetlify()))(); }, []));

  const buildSettings = [
    { k: 'Build Command', v: 'npx expo export --platform web' },
    { k: 'Publish Directory', v: 'dist' },
    { k: 'Node Version', v: '20.x' },
    { k: 'Branch', v: 'main' },
    { k: 'Custom Domain', v: 'saha.acmesolar.com (verified)' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={d => d.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <>
            <View style={s.heroCard}>
              <Ionicons name="cloud-upload" size={48} color="#06b6d4" />
              <Text style={s.heroT}>Netlify Deploy</Text>
              <Text style={s.heroD}>{items.length} deploy • {items.filter(d => d.status === 'ready').length} aktif</Text>
            </View>

            <Text style={s.section}>Build Ayarları</Text>
            <View style={s.cfgCard}>
              {buildSettings.map((b, idx) => (
                <View key={b.k} style={[s.cfgRow, idx === buildSettings.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={s.cfgK}>{b.k}</Text>
                  <Text style={s.cfgV}>{b.v}</Text>
                </View>
              ))}
            </View>

            <Text style={s.section}>Son Deploy'lar</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="cloud-upload-outline"
            title="Deploy kaydı yok"
            subtitle="Sistemde henüz bir web deploy kaydı bulunmuyor."
          />
        }
        renderItem={({ item: d }) => (
          <View key={d.id} style={[s.card, { borderLeftColor: STATUS_COLOR[d.status] }]}>
            <View style={s.headRow}>
              <Ionicons name={STATUS_ICON[d.status] as any} size={20} color={STATUS_COLOR[d.status]} />
              <View style={{ flex: 1 }}>
                <Text style={s.msg}>{d.message}</Text>
                <Text style={s.meta}>{d.branch} • {d.commit}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: STATUS_COLOR[d.status] + '33', borderColor: STATUS_COLOR[d.status] }]}>
                <Text style={[s.pillT, { color: STATUS_COLOR[d.status] }]}>{STATUS_LABEL[d.status]}</Text>
              </View>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaT}><Ionicons name="time" size={11} color={colors.text.muted} /> {fmtDate(d.createdAt)}</Text>
              <Text style={s.metaT}><Ionicons name="timer" size={11} color={colors.text.muted} /> {fmtDur(d.durationSec)}</Text>
              {d.publishUrl && (
                <TouchableOpacity onPress={() => Linking.openURL(d.publishUrl!)} style={s.linkBtn}>
                  <Ionicons name="open" size={11} color="#0ea5e9" />
                  <Text style={s.linkT}>Aç</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#06b6d4', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs },
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700', marginTop: spacing.sm, textTransform: 'uppercase' },
  cfgCard: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  cfgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.primary, gap: spacing.sm },
  cfgK: { color: colors.text.muted, fontSize: typography.sm },
  cfgV: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', flexShrink: 1, textAlign: 'right', fontFamily: 'monospace' as any },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  msg: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2, fontFamily: 'monospace' as any },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  metaT: { color: colors.text.muted, fontSize: typography.xs },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  linkT: { color: '#0ea5e9', fontSize: typography.xs, fontWeight: '700' },
});
