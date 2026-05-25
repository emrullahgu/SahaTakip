// Faz 45 — AuditReportScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { colors, spacing, radius, typography } from '../theme';
import type { AuditReport, RootStackParamList } from '../types';
import { listReports } from '../services/quality';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const pctColor = (p: number) => p >= 85 ? '#22c55e' : p >= 70 ? '#eab308' : p >= 50 ? '#f59e0b' : '#ef4444';

const buildHtml = (r: AuditReport) => `
<html><head><meta charset="utf-8"/><title>Denetim Raporu - ${r.auditTitle}</title><style>
body { font-family: -apple-system, sans-serif; padding: 24px; color: #0f172a; }
h1 { color: #14b8a6; margin: 0; }
.header { border-bottom: 3px solid #14b8a6; padding-bottom: 12px; margin-bottom: 16px; }
.kpi { display: inline-block; padding: 12px 20px; background: ${pctColor(r.percent)}; color: #fff; border-radius: 12px; font-size: 28px; font-weight: 800; }
.section { margin: 12px 0; padding: 10px 12px; background: #f1f5f9; border-left: 4px solid ${pctColor(r.percent)}; border-radius: 6px; }
.bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-top: 4px; }
.fill { height: 8px; background: ${pctColor(r.percent)}; }
li { margin: 4px 0; }
.meta { color: #64748b; font-size: 12px; }
</style></head><body>
<div class="header">
  <h1>Denetim Raporu</h1>
  <p class="meta">${r.auditTitle} · Denetçi: ${r.auditor} · ${new Date(r.performedAt).toLocaleDateString('tr-TR')}</p>
</div>
<div style="margin: 20px 0;">
  <span class="kpi">${r.percent}%</span>
  <span style="margin-left: 16px; font-size: 18px;"><strong>${r.totalScore}</strong> / ${r.maxScore} puan</span>
</div>
<h3>Bölüm Puanları</h3>
${r.sections.map(s => `
  <div class="section">
    <div style="display: flex; justify-content: space-between;">
      <strong>${s.name}</strong>
      <span>${s.score} / ${s.maxScore}</span>
    </div>
    <div class="bar"><div class="fill" style="width: ${(s.score / s.maxScore) * 100}%"></div></div>
  </div>
`).join('')}
<h3>Bulgular</h3>
<ul>${r.findings.map(f => `<li>${f}</li>`).join('')}</ul>
<p class="meta" style="margin-top: 30px;">SahaTakip Kalite & Denetim Modülü</p>
</body></html>`;

export default function AuditReportScreen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<AuditReport[]>([]);
  const [view, setView] = useState<AuditReport | null>(null);

  const load = useCallback(async () => { setItems(await listReports()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const exportPdf = async (r: AuditReport) => {
    try {
      const { uri } = await Print.printToFileAsync({ html: buildHtml(r) });
      await shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Denetim Raporu PDF' });
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'PDF oluşturulamadı.');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => {
          const c = pctColor(item.percent);
          return (
            <TouchableOpacity style={[s.card, { borderLeftColor: c }]} onPress={() => setView(item)}>
              <View style={[s.scoreBig, { backgroundColor: c }]}>
                <Text style={s.scoreV}>{item.percent}</Text>
                <Text style={s.scoreL}>%</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{item.auditTitle}</Text>
                <Text style={s.meta}>{item.auditor} · {new Date(item.performedAt).toLocaleDateString('tr-TR')}</Text>
                <Text style={s.meta}>{item.totalScore} / {item.maxScore} puan · {item.findings.length} bulgu</Text>
              </View>
              <TouchableOpacity style={[s.pdfBtn, { backgroundColor: c }]} onPress={() => exportPdf(item)}>
                <Ionicons name="document-text" size={20} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="Henüz rapor yok"
            subtitle="Denetim Puanlama ekranından rapor oluşturun."
            actionLabel="Denetimlere Git"
            onAction={() => nav.navigate('Inspections')}
          />
        }
      />

      <Modal visible={!!view} transparent animationType="slide" onRequestClose={() => setView(null)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mTitle}>{view?.auditTitle}</Text>
            <Text style={s.mSub}>{view?.auditor} · {view && new Date(view.performedAt).toLocaleDateString('tr-TR')}</Text>
            {view && (
              <View style={[s.bigScore, { backgroundColor: pctColor(view.percent) }]}>
                <Text style={s.bigV}>{view.percent}%</Text>
                <Text style={s.bigL}>{view.totalScore} / {view.maxScore}</Text>
              </View>
            )}
            <ScrollView style={{ maxHeight: 320 }}>
              {view?.sections.map((sec, i) => (
                <View key={i} style={s.secRow}>
                  <Text style={s.secN}>{sec.name}</Text>
                  <View style={s.secBar}>
                    <View style={[s.secFill, { width: `${(sec.score / sec.maxScore) * 100}%`, backgroundColor: pctColor(view!.percent) }]} />
                  </View>
                  <Text style={s.secV}>{sec.score}/{sec.maxScore}</Text>
                </View>
              ))}
              {view && view.findings.length > 0 && (
                <View style={{ marginTop: spacing.sm }}>
                  <Text style={s.findH}>Bulgular</Text>
                  {view.findings.map((f, i) => (
                    <View key={i} style={s.findRow}>
                      <Ionicons name="ellipse" size={6} color={colors.text.muted} />
                      <Text style={s.findT}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            <View style={s.actions}>
              <TouchableOpacity style={[s.act, { backgroundColor: colors.bg.primary }]} onPress={() => setView(null)}>
                <Text style={s.actT}>Kapat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.act, { backgroundColor: '#22c55e' }]} onPress={() => view && exportPdf(view)}>
                <Ionicons name="share" size={16} color="#fff" />
                <Text style={s.actT}>PDF Paylaş</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  scoreBig: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  scoreV: { color: '#fff', fontSize: typography.xl, fontWeight: '800' },
  scoreL: { color: '#fff', fontSize: 10 },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  pdfBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40, padding: spacing.md },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  mTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  mSub: { color: colors.text.muted, fontSize: typography.xs },
  bigScore: { padding: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  bigV: { color: '#fff', fontSize: 40, fontWeight: '800' },
  bigL: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  secRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 },
  secN: { color: colors.text.muted, fontSize: typography.xs, width: 120 },
  secBar: { flex: 1, height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, overflow: 'hidden' },
  secFill: { height: 6, borderRadius: 3 },
  secV: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', width: 50, textAlign: 'right' },
  findH: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', marginBottom: 4 },
  findRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 2 },
  findT: { color: colors.text.muted, fontSize: typography.xs, flex: 1, lineHeight: 16 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  act: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  actT: { color: '#fff', fontWeight: '800' },
});
