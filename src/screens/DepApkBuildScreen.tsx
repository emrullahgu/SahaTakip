// Faz 51 — DepApkBuildScreen (POZ-DEV-220)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listDepApkBuilds } from '../services/deploy';
import type { DepApkBuild } from '../types';

const STATUS_LABEL: Record<DepApkBuild['status'], string> = { completed: 'Tamamlandı', failed: 'Başarısız', in_progress: 'Derleniyor' };
const STATUS_COLOR: Record<DepApkBuild['status'], string> = { completed: '#22c55e', failed: '#ef4444', in_progress: '#0ea5e9' };
const STATUS_ICON: Record<DepApkBuild['status'], string> = { completed: 'checkmark-circle', failed: 'close-circle', in_progress: 'sync' };
const PROFILE_COLOR: Record<DepApkBuild['profile'], string> = { production: '#a855f7', preview: '#f59e0b' };

export default function DepApkBuildScreen() {
  const [items, setItems] = useState<DepApkBuild[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listDepApkBuilds()))(); }, []));

  const latestProd = useMemo(() => items.find(b => b.profile === 'production' && b.status === 'completed'), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="download" size={48} color="#8b5cf6" />
          <Text style={s.heroT}>APK Build & Test</Text>
          <Text style={s.heroD}>{items.length} build • EAS Build pipeline</Text>
        </View>

        {latestProd && (
          <View style={s.prodCard}>
            <Text style={s.prodLabel}>SON PRODUCTION</Text>
            <Text style={s.prodVer}>v{latestProd.version}</Text>
            <View style={s.prodMeta}>
              <Text style={s.prodMetaT}>versionCode {latestProd.versionCode}</Text>
              <Text style={s.prodMetaT}>{latestProd.sizeMb.toFixed(1)} MB</Text>
              <Text style={s.prodMetaT}>{latestProd.buildNumber}</Text>
            </View>
            {latestProd.downloadUrl && (
              <TouchableOpacity onPress={() => Linking.openURL(latestProd.downloadUrl!)} style={s.dlBtn}>
                <Ionicons name="cloud-download" size={16} color="#fff" />
                <Text style={s.dlT}>APK İndir</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {items.map(b => (
          <View key={b.id} style={[s.card, { borderLeftColor: STATUS_COLOR[b.status] }]}>
            <View style={s.headRow}>
              <Ionicons name={STATUS_ICON[b.status] as any} size={20} color={STATUS_COLOR[b.status]} />
              <View style={{ flex: 1 }}>
                <Text style={s.ver}>v{b.version} <Text style={s.code}>({b.versionCode})</Text></Text>
                <Text style={s.meta}>{b.buildNumber} • {new Date(b.builtAt).toLocaleDateString('tr-TR')}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: PROFILE_COLOR[b.profile] + '33', borderColor: PROFILE_COLOR[b.profile] }]}>
                <Text style={[s.pillT, { color: PROFILE_COLOR[b.profile] }]}>{b.profile.toUpperCase()}</Text>
              </View>
            </View>
            <View style={s.tagRow}>
              <View style={[s.tag, { borderColor: STATUS_COLOR[b.status] }]}>
                <Text style={[s.tagT, { color: STATUS_COLOR[b.status] }]}>{STATUS_LABEL[b.status]}</Text>
              </View>
              {b.sizeMb > 0 && <View style={s.tag}><Text style={s.tagT}>{b.sizeMb.toFixed(1)} MB</Text></View>}
              <View style={[s.tag, { borderColor: b.installTestPassed ? '#22c55e' : '#ef4444' }]}>
                <Ionicons name={b.installTestPassed ? 'checkmark' : 'close'} size={11} color={b.installTestPassed ? '#22c55e' : '#ef4444'} />
                <Text style={[s.tagT, { color: b.installTestPassed ? '#22c55e' : '#ef4444' }]}>Install</Text>
              </View>
              <View style={[s.tag, { borderColor: b.smokeTestPassed ? '#22c55e' : '#ef4444' }]}>
                <Ionicons name={b.smokeTestPassed ? 'checkmark' : 'close'} size={11} color={b.smokeTestPassed ? '#22c55e' : '#ef4444'} />
                <Text style={[s.tagT, { color: b.smokeTestPassed ? '#22c55e' : '#ef4444' }]}>Smoke</Text>
              </View>
            </View>
            {b.notes && <Text style={s.notes}>{b.notes}</Text>}
            {b.downloadUrl && b.status === 'completed' && (
              <TouchableOpacity onPress={() => Linking.openURL(b.downloadUrl!)} style={s.linkBtn}>
                <Ionicons name="open" size={12} color="#0ea5e9" />
                <Text style={s.linkT}>İndirme Bağlantısı</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#8b5cf6', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs },
  prodCard: { backgroundColor: '#8b5cf615', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#8b5cf6', alignItems: 'center', gap: 6 },
  prodLabel: { color: '#8b5cf6', fontSize: typography.xs, fontWeight: '800', letterSpacing: 1 },
  prodVer: { color: colors.text.primary, fontSize: typography.xxl, fontWeight: '800' },
  prodMeta: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  prodMetaT: { color: colors.text.muted, fontSize: typography.xs },
  dlBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#8b5cf6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginTop: spacing.xs },
  dlT: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ver: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  code: { color: colors.text.muted, fontWeight: '400' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillT: { fontSize: 10, fontWeight: '800' },
  tagRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: colors.border.primary },
  tagT: { color: colors.text.muted, fontSize: 10, fontWeight: '700' },
  notes: { color: colors.text.muted, fontSize: typography.xs, fontStyle: 'italic' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  linkT: { color: '#0ea5e9', fontSize: typography.xs, fontWeight: '700' },
});
