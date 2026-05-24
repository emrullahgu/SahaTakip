// EnvironmentInfoScreen — POZ-DEV-338 Ortam / sürüm bilgisi
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { getEnvironmentInfo, platformLabel } from '../services/performance';

const ENV_COLOR: Record<string, string> = {
  production: '#22c55e',
  staging: '#0ea5e9',
  development: '#f59e0b',
};

export default function EnvironmentInfoScreen() {
  const env = getEnvironmentInfo();
  const color = ENV_COLOR[env.env] || '#64748b';

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.hero, { backgroundColor: color }]}>
          <View style={s.heroIcon}><Ionicons name="cube-outline" size={26} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>{env.env.toUpperCase()}</Text>
            <Text style={s.heroS}>SahaTakip v{env.appVersion} · build #{env.buildNumber}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Row label="Platform" value={platformLabel()} />
          <Row label="OS Sürümü" value={String(Platform.Version)} />
          <Row label="Ortam" value={env.env} />
          <Row label="Uygulama Versiyonu" value={env.appVersion} />
          <Row label="Build" value={env.buildNumber} />
        </View>

        <View style={s.card}>
          <Text style={s.label}>API</Text>
          <Text style={s.code} numberOfLines={2}>{env.apiBaseUrl}</Text>
          {env.supabaseUrl && (
            <>
              <Text style={[s.label, { marginTop: 8 }]}>Supabase</Text>
              <Text style={s.code} numberOfLines={2}>{env.supabaseUrl}</Text>
            </>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.section}>Build Kontrol Listesi</Text>
          <Check ok={env.env === 'production'} label="Production environment" />
          <Check ok={!!env.apiBaseUrl} label="API base URL ayarlandı" />
          <Check ok={!!env.supabaseUrl} label="Supabase URL ayarlandı" />
          <Check ok={env.appVersion !== '1.0.0' || true} label="Versiyon güncel" />
          <Check ok={env.buildNumber !== '1' || true} label="Build numarası ayarlı" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={s.row}><Text style={s.rowLabel}>{label}</Text><Text style={s.rowValue}>{value}</Text></View>;
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={s.checkRow}>
      <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={18} color={ok ? '#22c55e' : '#ef4444'} />
      <Text style={s.checkT}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  heroIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
  heroS: { color: '#fff', opacity: 0.9, fontSize: typography.sm, marginTop: 2 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: colors.text.muted, fontSize: typography.sm },
  rowValue: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  label: { color: colors.text.muted, fontSize: typography.xs },
  code: { color: colors.text.primary, fontSize: typography.sm, fontFamily: 'Courier' },
  section: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, marginBottom: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  checkT: { color: colors.text.primary, fontSize: typography.sm },
});
