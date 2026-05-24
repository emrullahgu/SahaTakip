// Faz 45 — AuditScoringScreen
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { AuditScheduleEntry, AuditScoreSection } from '../types';
import { listAudits, createReport } from '../services/quality';

const DEFAULT_SECTIONS: AuditScoreSection[] = [
  { name: 'Doküman Yönetimi', score: 0, maxScore: 20 },
  { name: 'Süreç Uygunluğu', score: 0, maxScore: 25 },
  { name: 'Müşteri İlişkileri', score: 0, maxScore: 25 },
  { name: 'İç Denetim', score: 0, maxScore: 20 },
  { name: 'Düzeltici Faaliyet', score: 0, maxScore: 10 },
];

export default function AuditScoringScreen() {
  const nav = useNavigation();
  const [audits, setAudits] = useState<AuditScheduleEntry[]>([]);
  const [selected, setSelected] = useState<AuditScheduleEntry | null>(null);
  const [sections, setSections] = useState<AuditScoreSection[]>(DEFAULT_SECTIONS);
  const [findings, setFindings] = useState('');

  const load = useCallback(async () => { setAudits(await listAudits()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = useMemo(() => sections.reduce((a, s) => a + s.score, 0), [sections]);
  const max = useMemo(() => sections.reduce((a, s) => a + s.maxScore, 0) || 1, [sections]);
  const pct = Math.round((total / max) * 100);
  const c = pct >= 85 ? '#22c55e' : pct >= 70 ? '#eab308' : pct >= 50 ? '#f59e0b' : '#ef4444';

  const setScore = (i: number, v: string) => {
    const num = Math.max(0, Math.min(sections[i].maxScore, Number(v) || 0));
    setSections(sections.map((s, idx) => idx === i ? { ...s, score: num } : s));
  };

  const onSave = async () => {
    if (!selected) { Alert.alert('Eksik', 'Denetim seçin.'); return; }
    const fLines = findings.split('\n').map(f => f.trim()).filter(Boolean);
    await createReport(selected.title, selected.auditor, sections, fLines);
    Alert.alert('Kayıt', 'Denetim raporu oluşturuldu.', [{ text: 'Raporları Gör', onPress: () => nav.navigate('AuditReport' as never) }, { text: 'Tamam' }]);
    setSelected(null); setSections(DEFAULT_SECTIONS); setFindings('');
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
        <Text style={s.lbl}>Denetim Seçin</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {audits.map(a => (
            <TouchableOpacity key={a.id} style={[s.audChip, selected?.id === a.id && { borderColor: '#eab308', backgroundColor: '#eab30820' }]} onPress={() => setSelected(a)}>
              <Text style={s.audT} numberOfLines={1}>{a.title}</Text>
              <Text style={s.audSub}>{a.auditor}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[s.totalCard, { borderColor: c }]}>
          <View style={[s.scoreBig, { backgroundColor: c }]}>
            <Text style={s.scoreBV}>{pct}</Text>
            <Text style={s.scoreBL}>%</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.totT}>Toplam Puan</Text>
            <Text style={s.totV}>{total} / {max}</Text>
            <Text style={[s.totL, { color: c }]}>{pct >= 85 ? 'Mükemmel' : pct >= 70 ? 'İyi' : pct >= 50 ? 'Geliştirilmeli' : 'Yetersiz'}</Text>
          </View>
        </View>

        <Text style={s.lbl}>Bölüm Puanları</Text>
        {sections.map((sec, i) => (
          <View key={sec.name} style={s.secCard}>
            <Text style={s.secN}>{sec.name}</Text>
            <View style={s.secRow}>
              <TextInput style={s.secInput} value={String(sec.score)} onChangeText={v => setScore(i, v)} keyboardType="numeric" placeholderTextColor={colors.text.faint} />
              <Text style={s.secMax}>/ {sec.maxScore}</Text>
              <View style={s.barBg}>
                <View style={[s.barFg, { width: `${(sec.score / sec.maxScore) * 100}%`, backgroundColor: c }]} />
              </View>
            </View>
          </View>
        ))}

        <Text style={s.lbl}>Bulgular (her satır bir bulgu)</Text>
        <TextInput style={[s.input, { height: 90 }]} value={findings} onChangeText={setFindings} multiline placeholder="Bulgu 1&#10;Bulgu 2..." placeholderTextColor={colors.text.faint} />

        <TouchableOpacity style={[s.btn, { backgroundColor: c }]} onPress={onSave}>
          <Ionicons name="save" size={18} color="#fff" />
          <Text style={s.btnT}>Rapor Oluştur</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  lbl: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  audChip: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border.primary, marginRight: 6, minWidth: 180 },
  audT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  audSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  totalCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 2 },
  scoreBig: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  scoreBV: { color: '#fff', fontSize: 36, fontWeight: '800' },
  scoreBL: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  totT: { color: colors.text.muted, fontSize: typography.xs },
  totV: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '800' },
  totL: { fontSize: typography.sm, fontWeight: '700', marginTop: 2 },
  secCard: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  secN: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', marginBottom: 6 },
  secRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  secInput: { width: 50, backgroundColor: colors.bg.primary, color: colors.text.primary, padding: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, textAlign: 'center' },
  secMax: { color: colors.text.muted, fontSize: typography.sm },
  barBg: { flex: 1, height: 8, backgroundColor: colors.bg.primary, borderRadius: 4, overflow: 'hidden' },
  barFg: { height: 8, borderRadius: 4 },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.md, borderRadius: radius.sm, marginTop: spacing.sm },
  btnT: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
});
