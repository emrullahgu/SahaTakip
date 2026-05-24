// Faz 54 — DocSectionView (rehber / runbook görünümü)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getDocGuide, getDocOps, DOC_AUDIENCE_LABEL } from '../services/docs';
import type { DocAudience, DocGuide, DocOpsRunbook } from '../types';

type Props =
  | { mode: 'guide'; audience: DocAudience; heroIcon: string; heroColor: string }
  | { mode: 'ops'; kind: 'supabase' | 'netlify' | 'apk'; heroIcon: string; heroColor: string };

type Loaded = { title: string; summary: string; updatedAt: string; sections: { heading: string; bullets: string[] }[]; tagText?: string };

export default function DocSectionView(props: Props) {
  const [data, setData] = useState<Loaded | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      if (props.mode === 'guide') {
        const g: DocGuide = await getDocGuide(props.audience);
        setData({ title: g.title, summary: g.summary, updatedAt: g.updatedAt, sections: g.sections, tagText: DOC_AUDIENCE_LABEL[g.audience] });
      } else {
        const op: DocOpsRunbook = await getDocOps(props.kind);
        setData({ title: op.title, summary: op.summary, updatedAt: op.updatedAt, sections: op.sections, tagText: 'Operasyon Runbook' });
      }
    })();
  }, [props]));

  if (!data) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.empty}><Ionicons name="hourglass" size={48} color={colors.text.muted} /><Text style={s.emptyT}>Yükleniyor…</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.heroCard, { borderColor: props.heroColor }]}>
          <Ionicons name={props.heroIcon as any} size={48} color={props.heroColor} />
          <Text style={s.heroT}>{data.title}</Text>
          <Text style={s.heroD}>{data.summary}</Text>
          <View style={s.metaRow}>
            {data.tagText && (
              <View style={[s.tag, { borderColor: props.heroColor, backgroundColor: props.heroColor + '22' }]}>
                <Text style={[s.tagT, { color: props.heroColor }]}>{data.tagText}</Text>
              </View>
            )}
            <Text style={s.updatedAt}>Güncelleme: {data.updatedAt}</Text>
          </View>
        </View>

        {data.sections.map((sec, idx) => (
          <View key={idx} style={s.sectionCard}>
            <View style={s.secHead}>
              <View style={[s.numBox, { backgroundColor: props.heroColor }]}><Text style={s.num}>{idx + 1}</Text></View>
              <Text style={s.secTitle}>{sec.heading}</Text>
            </View>
            {sec.bullets.map((b, i) => (
              <View key={i} style={s.bulletRow}>
                <Ionicons name="ellipse" size={6} color={props.heroColor} style={{ marginTop: 7 }} />
                <Text style={s.bullet}>{b}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', gap: 6 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800', textAlign: 'center' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  tagT: { fontSize: 10, fontWeight: '800' },
  updatedAt: { color: colors.text.muted, fontSize: 10 },
  sectionCard: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  numBox: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  num: { color: '#fff', fontSize: 12, fontWeight: '800' },
  secTitle: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800', flex: 1 },
  bulletRow: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
  bullet: { color: colors.text.primary, fontSize: typography.xs, lineHeight: 18, flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyT: { color: colors.text.muted },
});
