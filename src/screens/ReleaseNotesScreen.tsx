// ReleaseNotesScreen — POZ-DEV-336 Sürüm notları
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { ReleaseNote } from '../types';
import { listReleaseNotes } from '../services/performance';

const CHANNEL_COLOR: Record<ReleaseNote['channel'], string> = {
  stable: '#22c55e',
  beta: '#f59e0b',
  staging: '#0ea5e9',
};

export default function ReleaseNotesScreen() {
  const [items, setItems] = useState<ReleaseNote[]>([]);
  useFocusEffect(useCallback(() => {
    (async () => setItems(await listReleaseNotes()))();
  }, []));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        {items.length === 0 && <Text style={s.empty}>Sürüm notu yok</Text>}
        {items.map(r => (
          <View key={r.id} style={s.card}>
            <View style={s.row}>
              <Text style={s.version}>v{r.version}</Text>
              <View style={[s.channelPill, { backgroundColor: CHANNEL_COLOR[r.channel] + '22', borderColor: CHANNEL_COLOR[r.channel] }]}>
                <Text style={[s.channelT, { color: CHANNEL_COLOR[r.channel] }]}>{r.channel}</Text>
              </View>
            </View>
            <Text style={s.date}>{new Date(r.releasedAt).toLocaleDateString('tr-TR')}</Text>

            {r.highlights.length > 0 && (
              <>
                <Text style={s.section}>✨ Yeni</Text>
                {r.highlights.map((h, i) => (
                  <View key={i} style={s.bulletRow}>
                    <Ionicons name="add-circle-outline" size={14} color="#22c55e" />
                    <Text style={s.bullet}>{h}</Text>
                  </View>
                ))}
              </>
            )}
            {r.fixes.length > 0 && (
              <>
                <Text style={s.section}>🔧 Düzeltmeler</Text>
                {r.fixes.map((f, i) => (
                  <View key={i} style={s.bulletRow}>
                    <Ionicons name="build-outline" size={14} color="#0ea5e9" />
                    <Text style={s.bullet}>{f}</Text>
                  </View>
                ))}
              </>
            )}
            {r.knownIssues && r.knownIssues.length > 0 && (
              <>
                <Text style={s.section}>⚠️ Bilinen Sorunlar</Text>
                {r.knownIssues.map((k, i) => (
                  <View key={i} style={s.bulletRow}>
                    <Ionicons name="warning-outline" size={14} color="#f59e0b" />
                    <Text style={s.bullet}>{k}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  empty: { color: colors.text.muted, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.md },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  version: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  channelPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  channelT: { fontSize: typography.xs, fontWeight: '700' },
  date: { color: colors.text.muted, fontSize: typography.xs },
  section: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', marginTop: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingLeft: 4 },
  bullet: { color: colors.text.muted, fontSize: typography.sm, flex: 1 },
});
