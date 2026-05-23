// ====================================================================
// NfcCheckinScreen — POZ-DEV-021 (NFC ile lokasyon doğrulama)
// Not: react-native-nfc-manager Expo managed workflow'da çalışmaz,
// dev-client / EAS build gerekir. Burada graceful fallback + manual giriş.
// ====================================================================
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography, brand } from '../theme';
import { checkinsRepo } from '../services/data/checkinsRepo';
import { useAuth } from '../context/AuthContext';
import { requestAndGetPosition } from '../services/location';

// Native NFC modülü opsiyonel — yüklü değilse manuel girişe düşeriz.
let Nfc: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Nfc = require('react-native-nfc-manager');
} catch {
  /* not installed yet */
}

export default function NfcCheckinScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? 'demo-user';
  const [busy, setBusy] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const readTag = async () => {
    if (!Nfc?.default) {
      Alert.alert('NFC modülü eksik', 'NFC için EAS dev-build gerekli. Manuel kod girebilirsin.');
      return;
    }
    setBusy(true);
    try {
      await Nfc.default.start();
      await Nfc.default.requestTechnology(Nfc.NfcTech?.Ndef ?? 'Ndef');
      const tag = await Nfc.default.getTag();
      const code = (tag?.id ?? '').toUpperCase();
      await saveCheckin(code, 'nfc');
    } catch (e: any) {
      Alert.alert('NFC Hatası', e?.message ?? String(e));
    } finally {
      setBusy(false);
      try { await Nfc.default?.cancelTechnologyRequest?.(); } catch { /* */ }
    }
  };

  const saveCheckin = async (code: string, method: 'nfc' | 'manual') => {
    if (!code) return;
    const pos = await requestAndGetPosition();
    const r = await checkinsRepo.create({
      userId,
      siteCode: code,
      method,
      lat: pos?.latitude,
      lng: pos?.longitude,
    });
    if (r) Alert.alert('Check-in başarılı', `Saha: ${code}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.box}>
        <Ionicons name="radio-outline" size={64} color={brand.green} />
        <Text style={styles.title}>NFC Etiketini Telefona Yaklaştır</Text>
        <Text style={styles.subtitle}>
          Sahaya bağlı NFC etiketini telefonun arkasına dokundur.
        </Text>
        <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={readTag} disabled={busy}>
          <Ionicons name="scan" size={22} color="#fff" />
          <Text style={styles.btnTxt}>{busy ? 'Okunuyor...' : 'NFC Oku'}</Text>
        </TouchableOpacity>

        {!Nfc?.default && (
          <Text style={styles.warn}>
            NFC modülü kurulu değil — EAS dev-build gerektirir. Manuel kod ile devam edebilirsin.
          </Text>
        )}
      </View>

      <View style={styles.manualBox}>
        <Text style={styles.manualTitle}>Manuel Saha Kodu</Text>
        <TextInput
          style={styles.input}
          value={manualCode}
          onChangeText={setManualCode}
          placeholder="örn: SAHA-A12"
          placeholderTextColor={colors.text.faint}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => {
            if (!manualCode.trim()) return;
            saveCheckin(manualCode.trim(), 'manual');
            setManualCode('');
          }}
        >
          <Text style={styles.btnSecondaryTxt}>Manuel Check-in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary, padding: spacing.md, gap: spacing.lg },
  box: { backgroundColor: colors.bg.card, padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text.primary, fontWeight: '900', fontSize: typography.md, textAlign: 'center' },
  subtitle: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center' },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    backgroundColor: brand.green, borderRadius: radius.md, marginTop: spacing.sm,
  },
  btnTxt: { color: '#fff', fontWeight: '800' },
  warn: { color: colors.amber.default, fontSize: typography.xs, textAlign: 'center', marginTop: spacing.sm },
  manualBox: { backgroundColor: colors.bg.card, padding: spacing.md, borderRadius: radius.md, gap: spacing.sm },
  manualTitle: { color: colors.text.primary, fontWeight: '800' },
  input: {
    backgroundColor: colors.bg.secondary, color: colors.text.primary,
    paddingHorizontal: spacing.sm, paddingVertical: 12, borderRadius: radius.sm, fontSize: typography.md,
  },
  btnSecondary: { backgroundColor: colors.bg.secondary, padding: 12, borderRadius: radius.sm, alignItems: 'center' },
  btnSecondaryTxt: { color: colors.text.primary, fontWeight: '700' },
});
