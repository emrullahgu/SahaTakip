// TwoFactorScreen — POZ-DEV-107 (TOTP)
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { buildTotpOtpAuthUri, confirmTwoFactor, disableTwoFactor, getTwoFactorSettings, startTwoFactorSetup } from '../services/security';
import { TwoFactorSettings } from '../types';

export default function TwoFactorScreen() {
  const [s, setS] = useState<TwoFactorSettings | null>(null);
  const [code, setCode] = useState('');
  const [setupMode, setSetupMode] = useState(false);

  const refresh = useCallback(async () => { setS(await getTwoFactorSettings()); }, []);
  useFocusEffect(useCallback(() => { refresh(); setCode(''); setSetupMode(false); }, [refresh]));

  const onStart = async () => {
    const next = await startTwoFactorSetup();
    setS(next); setSetupMode(true); setCode('');
  };

  const onConfirm = async () => {
    const r = await confirmTwoFactor(code);
    if (!r.ok) { Alert.alert('Hata', r.error || 'Doğrulama başarısız.'); return; }
    setS(r.settings); setSetupMode(false); setCode('');
    Alert.alert('Aktif', 'İki adımlı doğrulama etkinleştirildi.');
  };

  const onDisable = async () => {
    Alert.alert('Devre Dışı Bırak', '2FA tamamen kaldırılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: async () => {
        const next = await disableTwoFactor(); setS(next);
      } },
    ]);
  };

  const copySecret = () => {
    if (!s?.secret) return;
    if (Platform.OS === 'web') {
      try { navigator.clipboard?.writeText(s.secret); Alert.alert('Kopyalandı', 'Gizli anahtar panoya alındı.'); return; } catch {}
    }
    Alert.alert('Gizli Anahtar', s.secret);
  };

  if (!s) return <SafeAreaView style={styles.safe}><Text style={{ color: colors.text.muted, padding: spacing.lg }}>Yükleniyor…</Text></SafeAreaView>;

  const otpUri = s.secret ? buildTotpOtpAuthUri(s.secret) : '';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { backgroundColor: s.enabled ? '#16a34a' : '#64748b' }]}>
          <View style={styles.heroIcon}>
            <Ionicons name={s.enabled ? 'shield-checkmark' : 'shield-outline'} size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>İki Adımlı Doğrulama (TOTP)</Text>
            <Text style={styles.heroSub}>{s.enabled ? `Aktif · ${s.confirmedAt ? new Date(s.confirmedAt).toLocaleDateString('tr-TR') : ''}` : 'Devre dışı'}</Text>
          </View>
        </View>

        {!s.enabled && !setupMode && (
          <>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={14} color="#0ea5e9" />
              <Text style={styles.infoText}>
                Google Authenticator, Microsoft Authenticator veya Authy gibi bir uygulama ile çalışır. Aktifleştirdiğinizde her girişte 6 haneli kod istenecek.
              </Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={onStart}>
              <Ionicons name="lock-closed-outline" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>2FA Kurulumunu Başlat</Text>
            </TouchableOpacity>
          </>
        )}

        {!s.enabled && setupMode && s.secret && (
          <>
            <Text style={styles.sectionTitle}>1. Adım — Anahtarı Tarayın</Text>
            <View style={styles.qrCard}>
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={64} color={colors.text.muted} />
                <Text style={styles.qrHintText}>QR kod (gerçek uygulamada render edilir)</Text>
              </View>
              <Text style={styles.uriText} numberOfLines={2} selectable>{otpUri}</Text>
            </View>

            <Text style={styles.sectionTitle}>Manuel Anahtar</Text>
            <TouchableOpacity style={styles.secretRow} onPress={copySecret}>
              <Text style={styles.secretText} selectable>{s.secret}</Text>
              <Ionicons name="copy-outline" size={16} color={colors.text.muted} />
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>2. Adım — Uygulamadaki Kodu Girin</Text>
            <TextInput
              style={[styles.input, { textAlign: 'center', fontSize: 22, letterSpacing: 4 }]}
              value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              placeholderTextColor={colors.text.faint}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity style={[styles.primaryBtn, code.length !== 6 && { opacity: 0.5 }]} onPress={onConfirm} disabled={code.length !== 6}>
              <Ionicons name="checkmark-outline" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Doğrula & Etkinleştir</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Yedek Kodlar</Text>
            <View style={styles.warnBox}>
              <Ionicons name="warning-outline" size={14} color="#f59e0b" />
              <Text style={styles.warnText}>
                Telefonunuzu kaybederseniz aşağıdaki yedek kodlardan birini kullanın. Bunları güvenli bir yerde saklayın.
              </Text>
            </View>
            <View style={styles.codesGrid}>
              {s.backupCodes.map(c => (
                <View key={c} style={styles.codeBox}>
                  <Text style={styles.codeText} selectable>{c}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {s.enabled && (
          <>
            <View style={styles.statusCard}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>2FA Aktif</Text>
                <Text style={styles.statusSub}>Her girişte 6 haneli kod istenecek.</Text>
              </View>
            </View>
            <Text style={styles.sectionTitle}>Yedek Kodlar ({s.backupCodes.length})</Text>
            <View style={styles.codesGrid}>
              {s.backupCodes.map(c => (
                <View key={c} style={styles.codeBox}>
                  <Text style={styles.codeText} selectable>{c}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#dc2626', marginTop: spacing.lg }]} onPress={onDisable}>
              <Ionicons name="lock-open-outline" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>2FA'yı Devre Dışı Bırak</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  infoBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', padding: spacing.sm, backgroundColor: 'rgba(14,165,233,0.08)', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(14,165,233,0.25)', marginBottom: spacing.md },
  infoText: { flex: 1, color: '#7dd3fc', fontSize: 11, lineHeight: 15 },
  primaryBtn: { flexDirection: 'row', backgroundColor: brand.green, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.sm },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  sectionTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm, marginTop: spacing.lg, marginBottom: spacing.sm },
  qrCard: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, alignItems: 'center' },
  qrPlaceholder: { width: 160, height: 160, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', gap: 6 },
  qrHintText: { color: colors.text.faint, fontSize: 10, paddingHorizontal: 8, textAlign: 'center' },
  uriText: { marginTop: spacing.sm, color: colors.text.muted, fontSize: 10, textAlign: 'center' },
  secretRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  secretText: { flex: 1, color: colors.text.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, letterSpacing: 1 },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 12, color: colors.text.primary, fontWeight: '800' },
  warnBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', padding: spacing.sm, backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: radius.sm, borderWidth: 1, borderColor: '#f59e0b', marginBottom: spacing.sm },
  warnText: { flex: 1, color: '#fbbf24', fontSize: 11, lineHeight: 15 },
  codesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  codeBox: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm },
  codeText: { color: colors.text.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, fontWeight: '700' },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 1, borderColor: '#22c55e', borderRadius: radius.md },
  statusTitle: { color: '#22c55e', fontWeight: '800', fontSize: typography.sm },
  statusSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});
