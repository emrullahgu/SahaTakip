// Faz 58 — AdvVoiceAIScreen (POZ-DEV-288)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listVoiceTranscripts, VOICE_CATEGORY_LABEL, VOICE_CATEGORY_COLOR } from '../services/advanced';
import type { AdvVoiceTranscript } from '../types';

export default function AdvVoiceAIScreen() {
  const [items, setItems] = useState<AdvVoiceTranscript[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listVoiceTranscripts()))(); }, []));

  const totalDur = items.reduce((a, x) => a + x.durationSec, 0);
  const avgConf = items.reduce((a, x) => a + x.confidence, 0) / Math.max(1, items.length);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.intro}>
          <Ionicons name="mic" size={48} color="#f59e0b" />
          <Text style={s.introT}>İleri Sesli AI</Text>
          <Text style={s.introD}>Ses notlarını otomatik metne çevir, kategorize et, görev oluştur</Text>
        </View>

        <View style={s.kpiRow}>
          <Kpi label="Kayıt" value={items.length.toString()} color="#f59e0b" />
          <Kpi label="Toplam Süre" value={`${Math.round(totalDur / 60)}dk`} color="#06b6d4" />
          <Kpi label="Doğruluk" value={`%${Math.round(avgConf * 100)}`} color="#22c55e" />
        </View>

        <TouchableOpacity style={s.btn} activeOpacity={0.85} onPress={() => Alert.alert('Kayıt', 'Sesli not kaydı başlıyor (demo).')}>
          <Ionicons name="mic" size={22} color="#fff" />
          <Text style={s.btnT}>Yeni Sesli Not Kaydet</Text>
        </TouchableOpacity>

        <Text style={s.sectionT}>Son Transkriptler</Text>
        {items.map(t => (
          <View key={t.id} style={[s.card, { borderLeftColor: VOICE_CATEGORY_COLOR[t.category] }]}>
            <View style={s.cardHead}>
              <View style={[s.catPill, { borderColor: VOICE_CATEGORY_COLOR[t.category] }]}>
                <Text style={[s.catT, { color: VOICE_CATEGORY_COLOR[t.category] }]}>{VOICE_CATEGORY_LABEL[t.category]}</Text>
              </View>
              <Text style={s.meta}>{t.user} · {t.at}</Text>
            </View>
            <Text style={s.text}>{t.text}</Text>
            <View style={s.cardFoot}>
              <Text style={s.footM}>{t.language}</Text>
              <Text style={s.footM}>{t.durationSec}sn</Text>
              <View style={s.confBar}>
                <View style={[s.confFill, { width: `${t.confidence * 100}%`, backgroundColor: t.confidence > 0.9 ? '#22c55e' : t.confidence > 0.8 ? '#f59e0b' : '#ef4444' }]} />
              </View>
              <Text style={s.confT}>%{Math.round(t.confidence * 100)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.kpi, { borderColor: color }]}>
      <Text style={[s.kpiV, { color }]}>{value}</Text>
      <Text style={s.kpiL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  intro: { alignItems: 'center', padding: spacing.md, gap: 4 },
  introT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  introD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  kpiV: { fontSize: typography.lg, fontWeight: '800' },
  kpiL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  btn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: spacing.md, borderRadius: radius.sm, backgroundColor: '#f59e0b' },
  btnT: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.sm },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  catT: { fontSize: typography.xs, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs },
  text: { color: colors.text.primary, fontSize: typography.sm, lineHeight: 20 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  footM: { color: colors.text.muted, fontSize: typography.xs },
  confBar: { flex: 1, height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, overflow: 'hidden' },
  confFill: { height: 6 },
  confT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
});
