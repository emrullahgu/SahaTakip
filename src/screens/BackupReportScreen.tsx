// Faz 49 — BackupReportScreen (POZ-DEV-198)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listBackups } from '../services/secCenter';
import type { BackupReport } from '../types';

const fmt = (mb: number) => mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
const fmtDur = (s: number) => {
  const m = Math.floor(s / 60); const r = s % 60;
  return m > 0 ? `${m}d ${r}s` : `${r}s`;
};

export default function BackupReportScreen() {
  const [list, setList] = useState<BackupReport[]>([]);
  useFocusEffect(useCallback(() => { (async () => setList(await listBackups()))(); }, []));

  const stats = useMemo(() => ({
    total: list.length,
    verified: list.filter(b => b.verified).length,
    totalMb: list.reduce((s, b) => s + b.sizeMb, 0),
    lastTaken: list[0]?.takenAt,
  }), [list]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Ionicons name="save" size={36} color="#14b8a6" />
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>Yedek Doğrulama</Text>
            <Text style={s.heroS}>
              {stats.verified}/{stats.total} doğrulanmış · {fmt(stats.totalMb)}
            </Text>
            {stats.lastTaken && (
              <Text style={s.heroD}>Son yedek: {new Date(stats.lastTaken).toLocaleString('tr-TR')}</Text>
            )}
          </View>
        </View>

        {list.map(b => (
          <View key={b.id} style={[s.card, { borderLeftColor: b.verified ? '#22c55e' : '#ef4444' }]}>
            <View style={s.row}>
              <View style={[s.iconBox, { backgroundColor: (b.verified ? '#22c55e' : '#ef4444') + '22', borderColor: b.verified ? '#22c55e' : '#ef4444' }]}>
                <Ionicons name={b.verified ? 'checkmark-circle' : 'close-circle'} size={20} color={b.verified ? '#22c55e' : '#ef4444'} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.titleRow}>
                  <Text style={s.title}>{new Date(b.takenAt).toLocaleDateString('tr-TR')}</Text>
                  <View style={[s.typePill, { backgroundColor: b.type === 'full' ? '#a855f733' : '#0ea5e933', borderColor: b.type === 'full' ? '#a855f7' : '#0ea5e9' }]}>
                    <Text style={[s.typeT, { color: b.type === 'full' ? '#a855f7' : '#0ea5e9' }]}>
                      {b.type === 'full' ? 'TAM' : 'ARTIMSAL'}
                    </Text>
                  </View>
                </View>
                <View style={s.metaRow}>
                  <Text style={s.meta}>{fmt(b.sizeMb)}</Text>
                  <Text style={s.meta}>· {fmtDur(b.durationSec)}</Text>
                  <Text style={s.meta}>· {b.retentionDays} gün</Text>
                </View>
                <Text style={[s.verT, { color: b.verified ? '#22c55e' : '#ef4444' }]}>
                  {b.verified ? '✓ Restore testi başarılı' : '✗ Doğrulama başarısız'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#14b8a622', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#14b8a6' },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroS: { color: colors.text.muted, fontSize: typography.sm, marginTop: 2 },
  heroD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  typePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  typeT: { fontSize: 9, fontWeight: '800' },
  metaRow: { flexDirection: 'row', gap: 4, marginTop: 2 },
  meta: { color: colors.text.muted, fontSize: typography.xs },
  verT: { fontSize: typography.xs, fontWeight: '700', marginTop: 4 },
});
