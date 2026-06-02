// src/screens/AiInsightsScreen.tsx
// Haftalık AI Insights — KPI'lar + AI yorum + e-posta/Chat'e gönder.
// POZ-DEV-103

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, TextInput, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography, brand } from '../theme';
import { aiInsights, type InsightsResult } from '../services/aiRouter';
import { aiErrorAlert } from '../services/aiErrorHandler';

export default function AiInsightsScreen() {
  const [days, setDays] = useState('7');
  const [toEmail, setToEmail] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendChat, setSendChat] = useState(true);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightsResult | null>(null);

  const onGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await aiInsights({
        days: Number(days) || 7,
        to_email: toEmail.trim() || undefined,
        send_email: sendEmail,
        send_gchat: sendChat,
        dry_run: dryRun,
      });
      setResult(r);
      if (!dryRun) {
        const parts: string[] = [];
        if (sendEmail) parts.push(`E-posta: ${r.email_sent?.ok ? '✓' : '✗'}`);
        if (sendChat) parts.push(`Chat: ${r.gchat_sent?.ok ? '✓' : '✗'}`);
        Alert.alert('Gönderildi', parts.join('\n') || 'Sadece üretildi.');
      }
    } catch (e: any) {
      const a = aiErrorAlert(e);
      Alert.alert(a.title, a.message);
    } finally {
      setLoading(false);
    }
  };

  const k = result?.kpis;
  const trendColor = (k?.completion_trend_pct ?? 0) >= 0 ? brand.green : '#ef4444';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Haftalık AI Insights</Text>
          <Text style={styles.sub}>KPI'ları topla, AI yorumlasın, kanallara gönder.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Dönem (gün)</Text>
          <TextInput
            style={styles.input}
            value={days}
            onChangeText={setDays}
            keyboardType="number-pad"
            placeholder="7"
            placeholderTextColor={colors.text.faint}
          />

          <Text style={styles.label}>E-posta alıcı (boş = varsayılan)</Text>
          <TextInput
            style={styles.input}
            value={toEmail}
            onChangeText={setToEmail}
            placeholder="ornek@firma.com"
            placeholderTextColor={colors.text.faint}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>📧 E-posta gönder</Text>
            <Switch value={sendEmail} onValueChange={setSendEmail} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>💬 Google Chat gönder</Text>
            <Switch value={sendChat} onValueChange={setSendChat} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>👁 Önizleme (gönderme)</Text>
            <Switch value={dryRun} onValueChange={setDryRun} />
          </View>

          <TouchableOpacity
            style={[styles.runBtn, loading && { opacity: 0.6 }]}
            onPress={onGenerate}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="analytics" size={18} color="#fff" />}
            <Text style={styles.runBtnText}>{loading ? 'Üretiliyor…' : dryRun ? 'Önizle' : 'Üret & Gönder'}</Text>
          </TouchableOpacity>
        </View>

        {k && (
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{k.work_orders_new}</Text>
              <Text style={styles.kpiLabel}>Yeni İş Emri</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{k.work_orders_completed}</Text>
              <Text style={styles.kpiLabel}>Tamamlanan</Text>
              <Text style={[styles.kpiTrend, { color: trendColor }]}>
                {k.completion_trend_pct >= 0 ? '▲' : '▼'} {Math.abs(k.completion_trend_pct)}%
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{k.customers_new}</Text>
              <Text style={styles.kpiLabel}>Yeni Müşteri</Text>
            </View>
            <View style={[styles.kpiCard, k.urgent_open > 0 && { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.06)' }]}>
              <Text style={[styles.kpiValue, k.urgent_open > 0 && { color: '#ef4444' }]}>{k.urgent_open}</Text>
              <Text style={styles.kpiLabel}>Açık Acil</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{k.sales_visits_new}</Text>
              <Text style={styles.kpiLabel}>Satış Ziyareti</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{k.quotes_new}</Text>
              <Text style={styles.kpiLabel}>Yeni Teklif</Text>
            </View>
          </View>
        )}

        {result?.report && (
          <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Ionicons name="sparkles" size={16} color="#8b5cf6" />
              <Text style={styles.reportTitle}>{result.report.subject}</Text>
            </View>
            <Text style={styles.reportBody}>{result.report.markdown}</Text>

            <View style={styles.gchatPreview}>
              <Text style={styles.gchatLabel}>Google Chat Önizleme</Text>
              <Text style={styles.gchatText}>{result.report.gchat_text}</Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Model: {result.model}</Text>
              {result.email_sent && (
                <Text style={[styles.footerText, { color: result.email_sent.ok ? brand.green : '#ef4444' }]}>
                  E-posta: {result.email_sent.ok ? 'Gönderildi ✓' : 'Hata ✗'}
                </Text>
              )}
              {result.gchat_sent && (
                <Text style={[styles.footerText, { color: result.gchat_sent.ok ? brand.green : '#ef4444' }]}>
                  Chat: {result.gchat_sent.ok ? 'Gönderildi ✓' : 'Hata ✗'}
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  header: { marginBottom: spacing.md },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  formCard: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  label: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: spacing.xs },
  input: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8, color: colors.text.primary, fontSize: typography.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  switchLabel: { color: colors.text.primary, fontSize: typography.sm },
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: radius.md, backgroundColor: '#8b5cf6', marginTop: spacing.sm },
  runBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  kpiCard: { width: '31%', padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center' },
  kpiValue: { color: colors.text.primary, fontSize: 22, fontWeight: '800' },
  kpiLabel: { color: colors.text.muted, fontSize: 10, marginTop: 2, textAlign: 'center' },
  kpiTrend: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  reportCard: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)', backgroundColor: 'rgba(139,92,246,0.05)' },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  reportTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm, flex: 1 },
  reportBody: { color: colors.text.primary, fontSize: typography.sm, lineHeight: 20 },
  gchatPreview: { marginTop: spacing.md, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  gchatLabel: { color: brand.blue, fontSize: 10, fontWeight: '800', marginBottom: 4 },
  gchatText: { color: colors.text.muted, fontSize: typography.xs, lineHeight: 16 },
  footer: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.primary, gap: 4 },
  footerText: { color: colors.text.faint, fontSize: 11 },
});
